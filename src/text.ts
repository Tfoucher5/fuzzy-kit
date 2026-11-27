import { prefixDistance } from './distance.js';
import { scorePrepared, type Engine, type Prepared } from './engine.js';

/** A fuzzy occurrence of a query inside a longer text. */
export interface Found {
  /** The matching part, as written in the original text. */
  text: string;
  /** Position of the first character in the original text. */
  start: number;
  /** Position just after the last character (`text.slice(start, end)`). */
  end: number;
  /** Similarity score between the query and this part, from 0 to 100. */
  score: number;
}

/** A piece of text, highlighted or not. Concatenated, pieces give the original text. */
export interface Segment {
  text: string;
  /** Whether this piece matches the query. */
  match: boolean;
}

interface Token {
  start: number;
  end: number;
  normalized: string;
}

const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

function tokenize(text: string, engine: Engine): Token[] {
  const tokens: Token[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    const normalized = engine.normalize(m[0]);
    if (normalized !== '') tokens.push({ start: m.index!, end: m.index! + m[0].length, normalized });
  }
  return tokens;
}

/** Typos tolerated in a word of `length` letters when highlighting. */
function allowance(length: number): number {
  return length <= 3 ? 0 : Math.floor(length / 4);
}

export function findIn(text: string, query: string, engine: Engine, threshold: number): Found[] {
  const q = engine.read(query);
  if (q.text === '' || text === '') return [];
  const tokens = tokenize(text, engine);
  const k = q.words.length;

  const candidates: Found[] = [];
  for (const size of new Set([Math.max(1, k - 1), k, k + 1])) {
    for (let i = 0; i + size <= tokens.length; i += 1) {
      const start = tokens[i]!.start;
      const end = tokens[i + size - 1]!.end;
      // Normalize the window as a whole: "twenty one" reads as "21", "the beatles" loses its article.
      const candidate = engine.read(text.slice(start, end));
      const score = scorePrepared(q, candidate, engine, undefined, threshold);
      if (score < threshold) continue;
      candidates.push({ text: text.slice(start, end), start, end, score });
    }
  }

  // Best first, then keep only parts that do not overlap a better one.
  candidates.sort((a, b) => b.score - a.score || a.end - a.start - (b.end - b.start) || a.start - b.start);
  const kept: Found[] = [];
  for (const c of candidates) {
    if (kept.every((k2) => c.end <= k2.start || c.start >= k2.end)) kept.push(c);
  }
  return kept.sort((a, b) => a.start - b.start);
}

/** A name to look for in {@link findAllIn}: an item's text, read once. */
export interface Name<R> {
  prepared: Prepared;
  /** Multiplies the score, like a key's weight. */
  weight: number;
  ref: R;
}

/**
 * Occurrences of any of `names` in `text`, best first where they overlap,
 * then in reading order. Each window of words is read once for every name.
 */
export function findAllIn<R>(text: string, names: readonly Name<R>[], engine: Engine, threshold: number): (Found & { ref: R })[] {
  if (text === '' || names.length === 0) return [];
  const tokens = tokenize(text, engine);
  const windows = new Map<number, Prepared>();
  const windowAt = (i: number, size: number): Prepared => {
    const key = i * 64 + size;
    let w = windows.get(key);
    if (!w) windows.set(key, (w = engine.read(text.slice(tokens[i]!.start, tokens[i + size - 1]!.end))));
    return w;
  };
  const candidates: (Found & { ref: R })[] = [];
  for (const { prepared, weight, ref } of names) {
    const k = prepared.words.length;
    if (k === 0 || weight <= 0) continue;
    const own: (Found & { ref: R })[] = [];
    const floor = threshold / weight;
    for (const size of new Set([Math.max(1, k - 1), k, k + 1])) {
      if (size > 63) continue;
      for (let i = 0; i + size <= tokens.length; i += 1) {
        const raw = scorePrepared(prepared, windowAt(i, size), engine, undefined, floor);
        const score = weight === 1 ? raw : Math.round(raw * weight * 100) / 100;
        if (score < threshold) continue;
        const start = tokens[i]!.start;
        const end = tokens[i + size - 1]!.end;
        own.push({ text: text.slice(start, end), start, end, score, ref });
      }
    }
    // One window per place for each name: its best, the shortest on a tie
    // ("dancing queen", not "or dancing queen").
    own.sort((a, b) => b.score - a.score || a.end - a.start - (b.end - b.start) || a.start - b.start);
    const kept: Found[] = [];
    for (const c of own) {
      if (kept.every((o) => c.end <= o.start || c.start >= o.end)) kept.push(c), candidates.push(c);
    }
  }
  return bestCover(candidates);
}

/**
 * The parts that do not overlap and cover the most text, weighted by score
 * (weighted interval scheduling): "hotel californa" goes to Hotel California
 * rather than to Hotel and California. In reading order.
 */
export function bestCover<F extends Found>(candidates: F[]): F[] {
  // By end, then the better one first so ties keep it.
  const sorted = [...candidates].sort((a, b) => a.end - b.end || b.score - a.score || a.start - b.start);
  const n = sorted.length;
  const best = new Float64Array(n + 1);
  const previous = new Int32Array(n);
  for (let i = 0; i < n; i += 1) {
    // Last part ending before this one starts (binary search on ends).
    let lo = 0;
    let hi = i;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid]!.end <= sorted[i]!.start) lo = mid + 1;
      else hi = mid;
    }
    previous[i] = lo;
    const take = best[lo]! + sorted[i]!.score * (sorted[i]!.end - sorted[i]!.start);
    best[i + 1] = Math.max(best[i]!, take);
  }
  const kept: F[] = [];
  for (let i = n; i > 0; ) {
    const c = sorted[i - 1]!;
    if (best[previous[i - 1]!]! + c.score * (c.end - c.start) >= best[i]! && best[i]! !== best[i - 1]!) {
      kept.push(c);
      i = previous[i - 1]!;
    } else i -= 1;
  }
  return kept.reverse();
}

export function highlightIn(
  text: string,
  query: string,
  engine: Engine,
  threshold: number,
  inside = engine.options.substring,
): Segment[] {
  const ranges: [number, number][] = findIn(text, query, engine, threshold).map((f) => [f.start, f.end]);

  // Word by word too, so "bohem" lights up the start of "Bohemian".
  const words = engine.read(query).words;
  if (words.length > 0) {
    for (const token of tokenize(text, engine)) {
      for (const word of words) {
        const typos = allowance(word.length);
        if (prefixDistance(word, token.normalized) > typos) {
          // `substring`: the word typed as is, inside this word ("phone" in "iPhone").
          const at = inside ? token.normalized.indexOf(word, 1) : -1;
          if (at === -1 || token.normalized.length !== token.end - token.start) continue;
          ranges.push([token.start + at, token.start + at + word.length]);
          break;
        }
        const whole = word.length >= token.normalized.length - typos;
        const length = whole ? token.end - token.start : Math.min(word.length, token.end - token.start);
        ranges.push([token.start, token.start + length]);
        break;
      }
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (end <= cursor) continue;
    const from = Math.max(start, cursor);
    if (from > cursor) segments.push({ text: text.slice(cursor, from), match: false });
    const last = segments[segments.length - 1];
    if (last?.match && from === cursor) last.text += text.slice(from, end);
    else segments.push({ text: text.slice(from, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}
