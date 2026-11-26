import type { Engine, Prepared } from './engine.js';

// Candidate filtering for dedupe, group and join, so they do not compare every
// pair of items.
//
// It is exact: it never drops a pair that could reach the threshold. Every
// strategy it is used with scores `1 - distance / length`, and an edit
// distance is at least the number of characters one text has that the other
// lacks. So two texts that match must share most of their characters, and
// then they share at least one of their rarest few (prefix filtering).

/** Whether candidate filtering is exact for these options. */
export function canBlock(engine: Engine, threshold: number): boolean {
  const { algorithm, partial, phonetic } = engine.options;
  if (!(threshold > 0.01)) return false;
  if (algorithm === 'smart') return !partial && !phonetic && !engine.options.acronyms;
  return algorithm === 'levenshtein' || algorithm === 'damerau' || algorithm === 'tokenSort';
}

/** The characters of a text, each tagged with its occurrence: `e`, `e` → `e1`, `e2`. */
function tokensOf(p: Prepared): string[] {
  const seen = new Map<string, number>();
  const out: string[] = [];
  for (const ch of p.compact) {
    const n = (seen.get(ch) ?? 0) + 1;
    seen.set(ch, n);
    out.push(ch + n);
  }
  return out;
}

function variants(p: Prepared): Prepared[] {
  return p.alt ? [p, p.alt] : [p];
}

export interface Blocker {
  /** Makes `id` findable through these texts. */
  add(id: number, texts: readonly Prepared[]): void;
  /** Ids that may reach the threshold with one of `texts`, in increasing order. */
  candidates(texts: readonly Prepared[]): number[];
}

/**
 * @param corpus texts used to rank characters by rarity (the more, the better
 *   the filtering; any texts give exact results).
 */
export function createBlocker(corpus: Iterable<readonly Prepared[]>, threshold: number): Blocker {
  const frequency = new Map<string, number>();
  for (const texts of corpus) {
    for (const t of texts) for (const v of variants(t)) for (const token of tokensOf(v)) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }
  const rarer = (a: string, b: string): number =>
    (frequency.get(a) ?? 0) - (frequency.get(b) ?? 0) || (a < b ? -1 : a > b ? 1 : 0);

  // Scores are rounded to 2 decimals: allow for it.
  const r = 1 - (threshold - 0.005) / 100;
  const prefixOf = (p: Prepared): string[] => {
    // Two texts can only match if their lengths differ by at most `r` of the
    // longer one, so the number of differing characters is at most:
    const k = Math.floor((r * p.text.length) / (1 - r) + 1e-9);
    return tokensOf(p).sort(rarer).slice(0, k + 1);
  };

  const postings = new Map<string, number[]>();
  const empty: number[] = [];
  // Ids seen during the current `candidates` call.
  let stamp = new Int32Array(64);
  let round = 0;
  return {
    add(id, texts) {
      if (id >= stamp.length) {
        const grown = new Int32Array(Math.max(id + 1, stamp.length * 2));
        grown.set(stamp);
        stamp = grown;
      }
      for (const t of texts) {
        for (const v of variants(t)) {
          if (v.compact === '') {
            if (empty[empty.length - 1] !== id) empty.push(id);
            continue;
          }
          for (const token of prefixOf(v)) {
            let list = postings.get(token);
            if (!list) postings.set(token, (list = []));
            if (list[list.length - 1] !== id) list.push(id);
          }
        }
      }
    },
    candidates(texts) {
      const found: number[] = [];
      const mark = (id: number): void => {
        if (stamp[id] === round) return;
        stamp[id] = round;
        found.push(id);
      };
      round += 1;
      for (const t of texts) {
        for (const v of variants(t)) {
          if (v.compact === '') {
            for (const id of empty) mark(id);
            continue;
          }
          for (const token of prefixOf(v)) {
            const list = postings.get(token);
            if (list) for (const id of list) mark(id);
          }
        }
      }
      return found.sort((a, b) => a - b);
    },
  };
}
