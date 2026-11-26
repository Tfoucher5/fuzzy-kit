/** One piece of a {@link diff}. */
export interface Change {
  /** The characters of this piece. */
  text: string;
  /**
   * - `same`: in both texts (written as in the second text)
   * - `added`: missing from the first text, present in the second
   * - `removed`: in the first text, not in the second
   */
  type: 'same' | 'added' | 'removed';
}

/** Options of {@link diff}. */
export interface DiffOptions {
  /**
   * Treat `A` and `a` as different characters.
   * @default false
   */
  caseSensitive?: boolean;
  /**
   * Treat `é` and `e` as different characters.
   * @default false
   */
  accentSensitive?: boolean;
}

const MARKS_RE = /\p{M}+/gu;
const MAX_CELLS = 4_000_000;

/**
 * Character by character, what turns `from` into `to`: perfect to show a
 * player what was misspelled, or to preview a correction. Case and accents are
 * ignored by default, and `same` pieces are written as in `to`.
 *
 * @example
 * diff('bohemian rapsody', 'Bohemian Rhapsody')
 * // [{ text: 'Bohemian R', type: 'same' }, { text: 'h', type: 'added' }, { text: 'apsody', type: 'same' }]
 *
 * // React: show the answer with the letters the player missed
 * diff(guess, answer).map((c, i) =>
 *   c.type === 'same' ? c.text : c.type === 'added' ? <ins key={i}>{c.text}</ins> : <del key={i}>{c.text}</del>)
 */
export function diff(from: string, to: string, options: DiffOptions = {}): Change[] {
  const a = Array.from(from == null ? '' : String(from));
  const b = Array.from(to == null ? '' : String(to));
  const key = (c: string): string => {
    let out = options.caseSensitive ? c : c.toLowerCase();
    if (!options.accentSensitive) out = out.normalize('NFD').replace(MARKS_RE, '');
    return out;
  };
  const ka = a.map(key);
  const kb = b.map(key);

  // Common start and end need no alignment.
  let start = 0;
  while (start < a.length && start < b.length && ka[start] === kb[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && ka[endA - 1] === kb[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }

  const changes: Change[] = [];
  const push = (text: string, type: Change['type']): void => {
    if (text === '') return;
    const last = changes[changes.length - 1];
    if (last && last.type === type) last.text += text;
    else changes.push({ text, type });
  };

  push(b.slice(0, start).join(''), 'same');
  const n = endA - start;
  const m = endB - start;
  if (n === 0 || m === 0 || (n + 1) * (m + 1) > MAX_CELLS) {
    push(a.slice(start, endA).join(''), 'removed');
    push(b.slice(start, endB).join(''), 'added');
  } else {
    // Edit distance table, then walk back from the end.
    const width = m + 1;
    const d = new Uint32Array((n + 1) * width);
    for (let j = 0; j <= m; j += 1) d[j] = j;
    for (let i = 1; i <= n; i += 1) {
      d[i * width] = i;
      const ci = ka[start + i - 1];
      for (let j = 1; j <= m; j += 1) {
        const cost = ci === kb[start + j - 1] ? 0 : 1;
        d[i * width + j] = Math.min(
          d[(i - 1) * width + j]! + 1,
          d[i * width + j - 1]! + 1,
          d[(i - 1) * width + j - 1]! + cost,
        );
      }
    }
    const ops: Change[] = [];
    let i = n;
    let j = m;
    while (i > 0 || j > 0) {
      const here = d[i * width + j]!;
      if (i > 0 && j > 0 && ka[start + i - 1] === kb[start + j - 1] && here === d[(i - 1) * width + j - 1]) {
        ops.push({ text: b[start + j - 1]!, type: 'same' });
        i -= 1;
        j -= 1;
      } else if (i > 0 && j > 0 && here === d[(i - 1) * width + j - 1]! + 1) {
        // A wrong letter: the typed one goes, the right one comes.
        ops.push({ text: b[start + j - 1]!, type: 'added' });
        ops.push({ text: a[start + i - 1]!, type: 'removed' });
        i -= 1;
        j -= 1;
      } else if (i > 0 && here === d[(i - 1) * width + j]! + 1) {
        ops.push({ text: a[start + i - 1]!, type: 'removed' });
        i -= 1;
      } else {
        ops.push({ text: b[start + j - 1]!, type: 'added' });
        j -= 1;
      }
    }
    // In each run of changes, what was typed comes first, then the fix.
    let removed = '';
    let added = '';
    for (let k = ops.length - 1; k >= 0; k -= 1) {
      const op = ops[k]!;
      if (op.type === 'removed') removed += op.text;
      else if (op.type === 'added') added += op.text;
      else {
        push(removed, 'removed');
        push(added, 'added');
        removed = added = '';
        push(op.text, 'same');
      }
    }
    push(removed, 'removed');
    push(added, 'added');
  }
  push(b.slice(endB).join(''), 'same');
  return changes;
}
