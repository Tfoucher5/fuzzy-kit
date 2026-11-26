/**
 * Classic string similarity metrics. They work on raw strings (no
 * normalization) and return a value between 0 and 1, like {@link jaroWinkler}.
 * Use {@link normalize} first if case or accents should not matter.
 */

function grams(text: string, n: number): Map<string, number> {
  const out = new Map<string, number>();
  if (text.length < n) {
    if (text !== '') out.set(text, 1);
    return out;
  }
  for (let i = 0; i + n <= text.length; i += 1) {
    const gram = text.slice(i, i + n);
    out.set(gram, (out.get(gram) ?? 0) + 1);
  }
  return out;
}

function checkSize(n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('[fuzzy-toolkit] `n` must be a positive integer.');
  return n;
}

// Pairs of letters of one text, in a reusable open-addressing hash table, so
// that Dice scores allocate nothing. `stamp` marks the slots in use, `taken`
// how many times each pair was matched by the current other text.
let slotKeys = new Float64Array(256);
let slotCounts = new Int32Array(256);
let slotStamps = new Int32Array(256);
let slotTaken = new Int32Array(256);
let takenStamps = new Int32Array(256);
let stamp = 0;
let takenStamp = 0;
let mask = 255;

const SPACE_RE = /\s/;
const SPACES_RE = /\s+/g;

function withoutSpaces(text: string): string {
  text = String(text);
  return SPACE_RE.test(text) ? text.replace(SPACES_RE, '') : text;
}

function slotOf(key: number): number {
  let h = (Math.imul(key | 0, 0x9e3779b1) ^ Math.floor(key / 4294967296)) & mask;
  while (slotStamps[h] === stamp && slotKeys[h] !== key) h = (h + 1) & mask;
  return h;
}

/** Loads the pairs of letters of `text` (at least 2 characters) into the table. */
function loadPairs(text: string): void {
  let size = 256;
  while (size < text.length * 2) size *= 2;
  if (slotKeys.length < size) {
    slotKeys = new Float64Array(size);
    slotCounts = new Int32Array(size);
    slotStamps = new Int32Array(size);
    slotTaken = new Int32Array(size);
    takenStamps = new Int32Array(size);
    stamp = 0;
    takenStamp = 0;
  }
  mask = size - 1;
  stamp += 1;
  let previous = text.charCodeAt(0);
  for (let i = 1; i < text.length; i += 1) {
    const current = text.charCodeAt(i);
    const key = previous * 65536 + current;
    previous = current;
    const h = slotOf(key);
    if (slotStamps[h] === stamp) slotCounts[h]! += 1;
    else {
      slotStamps[h] = stamp;
      slotKeys[h] = key;
      slotCounts[h] = 1;
    }
  }
}

/** How many pairs of letters of `text` match the loaded ones, each used once. */
function sharedPairs(text: string): number {
  takenStamp += 1;
  let shared = 0;
  let previous = text.charCodeAt(0);
  for (let i = 1; i < text.length; i += 1) {
    const current = text.charCodeAt(i);
    const key = previous * 65536 + current;
    previous = current;
    const h = slotOf(key);
    if (slotStamps[h] !== stamp) continue;
    const taken = takenStamps[h] === takenStamp ? slotTaken[h]! : 0;
    if (taken < slotCounts[h]!) {
      takenStamps[h] = takenStamp;
      slotTaken[h] = taken + 1;
      shared += 1;
    }
  }
  return shared;
}

/**
 * Sørensen-Dice coefficient on pairs of letters, spaces ignored. Same results
 * as `compareTwoStrings` of the `string-similarity` package, about 3 times
 * faster.
 *
 * @example
 * dice('healed', 'sealed') // 0.8
 */
export function dice(a: string, b: string): number {
  a = withoutSpaces(a);
  b = withoutSpaces(b);
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  loadPairs(a);
  return (2 * sharedPairs(b)) / (a.length + b.length - 2);
}

/**
 * {@link dice} of `text` against each of `others`, reading `text` once.
 * @internal
 */
export function diceAll(text: string, others: readonly string[]): number[] {
  const a = withoutSpaces(text);
  const out = new Array<number>(others.length);
  if (a.length >= 2) loadPairs(a);
  for (let i = 0; i < others.length; i += 1) {
    const b = withoutSpaces(others[i]!);
    if (a === b) out[i] = 1;
    else if (a.length < 2 || b.length < 2) out[i] = 0;
    else out[i] = (2 * sharedPairs(b)) / (a.length + b.length - 2);
  }
  return out;
}

/**
 * Jaccard index on the sets of `n`-letter chunks (default: pairs): shared
 * chunks divided by all distinct chunks.
 *
 * @example
 * jaccard('night', 'nacht') // 0.143 (1 shared pair, "ht", out of 7)
 */
export function jaccard(a: string, b: string, n = 2): number {
  a = String(a);
  b = String(b);
  if (a === b) return 1;
  const x = grams(a, checkSize(n));
  const y = grams(b, n);
  let shared = 0;
  for (const gram of x.keys()) if (y.has(gram)) shared += 1;
  const total = x.size + y.size - shared;
  return total === 0 ? 1 : shared / total;
}

/**
 * Cosine similarity of the counts of `n`-letter chunks (default: pairs).
 * Repeated chunks count, and text length matters less than with Jaccard.
 *
 * @example
 * cosine('aaaa', 'aaa') // 1
 */
export function cosine(a: string, b: string, n = 2): number {
  a = String(a);
  b = String(b);
  if (a === b) return 1;
  const x = grams(a, checkSize(n));
  const y = grams(b, n);
  if (x.size === 0 || y.size === 0) return 0;
  let dot = 0;
  let nx = 0;
  let ny = 0;
  for (const [gram, count] of x) {
    nx += count * count;
    dot += count * (y.get(gram) ?? 0);
  }
  for (const count of y.values()) ny += count * count;
  return dot / Math.sqrt(nx * ny);
}

/**
 * Hamming distance: number of positions where two texts of the same length
 * differ. Throws if the lengths differ.
 *
 * @example
 * hamming('karolin', 'kathrin') // 3
 */
export function hamming(a: string, b: string): number {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) {
    throw new RangeError('[fuzzy-toolkit] hamming() needs two texts of the same length.');
  }
  let distance = 0;
  for (let i = 0; i < a.length; i += 1) if (a.charCodeAt(i) !== b.charCodeAt(i)) distance += 1;
  return distance;
}

/**
 * Length of the longest common subsequence: the most characters both texts
 * have in the same order, not necessarily next to each other.
 *
 * @example
 * lcs('ABCBDAB', 'BDCABA') // 4 ("BCBA")
 */
export function lcs(a: string, b: string): number {
  a = String(a);
  b = String(b);
  if (a.length < b.length) [a, b] = [b, a];
  const row = new Uint32Array(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = 0;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j]!;
      row[j] = ca === b.charCodeAt(j - 1) ? diagonal + 1 : Math.max(above, row[j - 1]!);
      diagonal = above;
    }
  }
  return row[b.length]!;
}

/**
 * Overlap coefficient on the sets of `n`-letter chunks: shared chunks divided
 * by the chunks of the smaller text. 1 when one text's chunks are all in the
 * other ("york" in "new york").
 *
 * @example
 * overlap('york', 'new york') // 1
 */
export function overlap(a: string, b: string, n = 2): number {
  return tversky(a, b, { n, overlap: true });
}

/** Options of {@link tversky}. */
export interface TverskyOptions {
  /** Weight of the chunks only `a` has. @default 1 */
  alpha?: number;
  /** Weight of the chunks only `b` has. @default 1 */
  beta?: number;
  /** Chunk size. @default 2 */
  n?: number;
}

/**
 * Tversky index on the sets of `n`-letter chunks: like {@link jaccard}, but
 * what only `a` has and what only `b` has can weigh differently. With
 * `alpha: 1, beta: 0`, it measures how much of `a` is found in `b`.
 * `alpha = beta = 1` is Jaccard, `alpha = beta = 0.5` is Dice on sets.
 *
 * @example
 * tversky('york', 'new york', { alpha: 1, beta: 0 }) // 1: all of "york" is in "new york"
 */
export function tversky(a: string, b: string, options: TverskyOptions & { overlap?: boolean } = {}): number {
  a = String(a);
  b = String(b);
  if (a === b) return 1;
  const n = checkSize(options.n ?? 2);
  const x = grams(a, n);
  const y = grams(b, n);
  let shared = 0;
  for (const gram of x.keys()) if (y.has(gram)) shared += 1;
  if (options.overlap) {
    const smaller = Math.min(x.size, y.size);
    return smaller === 0 ? 0 : shared / smaller;
  }
  const alpha = options.alpha ?? 1;
  const beta = options.beta ?? 1;
  const total = shared + alpha * (x.size - shared) + beta * (y.size - shared);
  return total === 0 ? 1 : shared / total;
}

/**
 * Ratcliff-Obershelp similarity (the "gestalt" ratio of Python's
 * `difflib.SequenceMatcher`, without its junk heuristic): twice the
 * characters found in common blocks, divided by both lengths.
 *
 * @example
 * ratcliffObershelp('WIKIMEDIA', 'WIKIMANIA') // 0.778
 */
export function ratcliffObershelp(a: string, b: string): number {
  a = String(a);
  b = String(b);
  if (a === b) return 1;
  const total = a.length + b.length;
  return total === 0 ? 1 : (2 * matchingCharacters(a, 0, a.length, b, 0, b.length)) / total;
}

function matchingCharacters(a: string, a0: number, a1: number, b: string, b0: number, b1: number): number {
  let count = 0;
  // Iterative on the right part, recursive on the left one.
  for (;;) {
    if (a0 >= a1 || b0 >= b1) return count;
    // Longest common block, leftmost in `a` then in `b`.
    let bestLength = 0;
    let bestA = 0;
    let bestB = 0;
    let row = new Uint32Array(b1 - b0 + 1);
    let next = new Uint32Array(b1 - b0 + 1);
    for (let i = a0; i < a1; i += 1) {
      const ca = a.charCodeAt(i);
      for (let j = b0; j < b1; j += 1) {
        const k = j - b0 + 1;
        if (b.charCodeAt(j) === ca) {
          const length = row[k - 1]! + 1;
          next[k] = length;
          if (length > bestLength) {
            bestLength = length;
            bestA = i - length + 1;
            bestB = j - length + 1;
          }
        } else next[k] = 0;
      }
      const t = row;
      row = next;
      next = t;
    }
    if (bestLength === 0) return count;
    count += bestLength + matchingCharacters(a, a0, bestA, b, b0, bestB);
    a0 = bestA + bestLength;
    b0 = bestB + bestLength;
  }
}
