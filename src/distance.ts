/**
 * Raw edit-distance primitives.
 *
 * Strings of up to 32 UTF-16 units use bit-parallel algorithms (Myers 1999 for
 * Levenshtein, Hyyrö 2003 for Damerau/OSA): one pass, no allocation. Longer
 * strings fall back to a classic dynamic-programming loop on reusable buffers.
 */

/** Pattern-match bitmasks, indexed by UTF-16 code unit. Always reset after use. */
const peq = new Uint32Array(0x10000);

let rowA = new Int32Array(64);
let rowB = new Int32Array(64);
let rowC = new Int32Array(64);

function ensureRows(size: number): void {
  if (rowA.length >= size) return;
  const length = Math.max(size, rowA.length * 2);
  rowA = new Int32Array(length);
  rowB = new Int32Array(length);
  rowC = new Int32Array(length);
}

function fillPeq(pattern: string, start = 0, end = pattern.length): void {
  for (let i = start; i < end; i += 1) {
    peq[pattern.charCodeAt(i)]! |= 1 << (i - start);
  }
}

function clearPeq(pattern: string, start = 0, end = pattern.length): void {
  for (let i = start; i < end; i += 1) {
    peq[pattern.charCodeAt(i)] = 0;
  }
}

/** Distance between `pattern[ps, pe)` and `text[ts, te)`: offsets spare a slice. */
function myers32(pattern: string, ps: number, pe: number, text: string, ts: number, te: number): number {
  const m = pe - ps;
  const last = 1 << (m - 1);
  let pv = -1;
  let mv = 0;
  let score = m;

  fillPeq(pattern, ps, pe);
  for (let j = ts; j < te; j += 1) {
    const eq = peq[text.charCodeAt(j)]!;
    const xv = eq | mv;
    const xh = (((eq & pv) + pv) ^ pv) | eq;
    let ph = mv | ~(xh | pv);
    let mh = pv & xh;
    if (ph & last) score += 1;
    if (mh & last) score -= 1;
    ph = (ph << 1) | 1;
    mh <<= 1;
    pv = mh | ~(xv | ph);
    mv = ph & xv;
  }
  clearPeq(pattern, ps, pe);
  return score;
}

function osa32(pattern: string, ps: number, pe: number, text: string, ts: number, te: number): number {
  const m = pe - ps;
  const last = 1 << (m - 1);
  let vp = -1;
  let vn = 0;
  let d0 = 0;
  let pmOld = 0;
  let score = m;

  fillPeq(pattern, ps, pe);
  for (let j = ts; j < te; j += 1) {
    const pm = peq[text.charCodeAt(j)]!;
    const tr = (((~d0) & pm) << 1) & pmOld;
    d0 = ((((pm & vp) + vp) ^ vp) | pm | vn) | tr;
    let hp = vn | ~(d0 | vp);
    let hn = d0 & vp;
    if (hp & last) score += 1;
    if (hn & last) score -= 1;
    hp = (hp << 1) | 1;
    hn <<= 1;
    vp = hn | ~(d0 | hp);
    vn = hp & d0;
    pmOld = pm;
  }
  clearPeq(pattern, ps, pe);
  return score;
}

/**
 * Myers' bit-parallel Levenshtein for patterns longer than 32 characters,
 * processed in blocks of 32 rows (Hyyrö 2003). O(⌈m/32⌉·n).
 */
let carryP = new Int32Array(8);
let carryM = new Int32Array(8);

function myersBlocks(pattern: string, text: string): number {
  const m = pattern.length;
  const n = text.length;
  const hsize = Math.ceil(n / 32);
  if (carryP.length < hsize) {
    carryP = new Int32Array(hsize * 2);
    carryM = new Int32Array(hsize * 2);
  }
  carryP.fill(-1, 0, hsize);
  carryM.fill(0, 0, hsize);
  const blocks = Math.ceil(m / 32);
  let score = m;
  for (let block = 0; block < blocks; block += 1) {
    const start = block * 32;
    const end = Math.min(start + 32, m);
    const last = block === blocks - 1;
    const top = (end - start - 1) & 31;
    for (let k = start; k < end; k += 1) peq[pattern.charCodeAt(k)]! |= 1 << (k - start);
    let pv = -1;
    let mv = 0;
    for (let i = 0; i < n; i += 1) {
      const word = i >>> 5;
      const bit = 1 << (i & 31);
      const eq = peq[text.charCodeAt(i)]! | 0;
      const pb = carryP[word]! & bit ? 1 : 0;
      const mb = carryM[word]! & bit ? 1 : 0;
      const xv = eq | mv;
      const xh = ((((eq | mb) & pv) + pv) ^ pv) | eq | mb;
      let ph = mv | ~(xh | pv);
      let mh = pv & xh;
      if (last) {
        score += (ph >>> top) & 1;
        score -= (mh >>> top) & 1;
      }
      if ((ph >>> 31) ^ pb) carryP[word]! ^= bit;
      if ((mh >>> 31) ^ mb) carryM[word]! ^= bit;
      ph = (ph << 1) | pb;
      mh = (mh << 1) | mb;
      pv = mh | ~(xv | ph);
      mv = ph & xv;
    }
    for (let k = start; k < end; k += 1) peq[pattern.charCodeAt(k)] = 0;
  }
  return score;
}

let carryT = new Int32Array(8);

/**
 * Hyyrö's bit-parallel optimal string alignment distance in blocks of 32
 * rows, for patterns longer than 32 characters.
 */
function osaBlocks(pattern: string, text: string): number {
  const m = pattern.length;
  const n = text.length;
  const hsize = Math.ceil(n / 32);
  if (carryP.length < hsize) {
    carryP = new Int32Array(hsize * 2);
    carryM = new Int32Array(hsize * 2);
  }
  if (carryT.length < hsize) carryT = new Int32Array(hsize * 2);
  carryP.fill(-1, 0, hsize);
  carryM.fill(0, 0, hsize);
  carryT.fill(0, 0, hsize);
  const blocks = Math.ceil(m / 32);
  let score = m;
  for (let block = 0; block < blocks; block += 1) {
    const start = block * 32;
    const end = Math.min(start + 32, m);
    const last = block === blocks - 1;
    const top = (end - start - 1) & 31;
    for (let k = start; k < end; k += 1) peq[pattern.charCodeAt(k)]! |= 1 << (k - start);
    let vp = -1;
    let vn = 0;
    let d0 = 0;
    let pmOld = 0;
    for (let i = 0; i < n; i += 1) {
      const word = i >>> 5;
      const bit = 1 << (i & 31);
      const pm = peq[text.charCodeAt(i)]! | 0;
      const pb = carryP[word]! & bit ? 1 : 0;
      const mb = carryM[word]! & bit ? 1 : 0;
      const tb = carryT[word]! & bit ? 1 : 0;
      const swap = ~d0 & pm;
      if ((swap >>> 31) ^ tb) carryT[word]! ^= bit;
      const tr = ((swap << 1) | tb) & pmOld;
      const x = pm | mb;
      d0 = (((x & vp) + vp) ^ vp) | x | vn | tr;
      let hp = vn | ~(d0 | vp);
      let hn = d0 & vp;
      if (last) {
        score += (hp >>> top) & 1;
        score -= (hn >>> top) & 1;
      }
      if ((hp >>> 31) ^ pb) carryP[word]! ^= bit;
      if ((hn >>> 31) ^ mb) carryM[word]! ^= bit;
      hp = (hp << 1) | pb;
      hn = (hn << 1) | mb;
      vp = hn | ~(d0 | hp);
      vn = hp & d0;
      pmOld = pm;
    }
    for (let k = start; k < end; k += 1) peq[pattern.charCodeAt(k)] = 0;
  }
  return score;
}

function editDistance(a: string, b: string, transpositions: boolean): number {
  if (a === b) return 0;
  // Keep the shorter string as the pattern.
  if (a.length > b.length) {
    const t = a;
    a = b;
    b = t;
  }

  // Trim the common prefix and suffix: cheap and very common for near-matches.
  let start = 0;
  while (start < a.length && a.charCodeAt(start) === b.charCodeAt(start)) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && a.charCodeAt(endA - 1) === b.charCodeAt(endB - 1)) {
    endA -= 1;
    endB -= 1;
  }
  const m = endA - start;
  if (m === 0) return endB - start;
  // The loop runs once per text character: when both fit, the longer is the pattern.
  if (endB - start <= 32) return transpositions ? osa32(b, start, endB, a, start, endA) : myers32(b, start, endB, a, start, endA);
  if (m <= 32) return transpositions ? osa32(a, start, endA, b, start, endB) : myers32(a, start, endA, b, start, endB);
  if (start > 0 || endA < a.length) {
    a = a.slice(start, endA);
    b = b.slice(start, endB);
  }
  return transpositions ? osaBlocks(a, b) : myersBlocks(a, b);
}

const bag = new Int32Array(0x10000);

let lastMissingLetters = 0;

/**
 * Bag distance: how many characters one text has that the other lacks,
 * ignoring order. A lower bound of every edit distance here, whatever the word
 * order. The same count without spaces is then available from
 * {@link bagMissingLetters}.
 */
export function bagDistance(a: string, b: string): number {
  for (let i = 0; i < a.length; i += 1) bag[a.charCodeAt(i)]! += 1;
  for (let i = 0; i < b.length; i += 1) bag[b.charCodeAt(i)]! -= 1;
  let extraA = 0;
  let extraB = 0;
  let spacesA = 0;
  let spacesB = 0;
  // Each character's net count is read once, then reset to zero.
  for (let pass = 0; pass < 2; pass += 1) {
    const text = pass === 0 ? a : b;
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      const count = bag[code]!;
      if (count === 0) continue;
      if (count > 0) {
        extraA += count;
        if (code === 32) spacesA += count;
      } else {
        extraB -= count;
        if (code === 32) spacesB -= count;
      }
      bag[code] = 0;
    }
  }
  lastMissingLetters = Math.max(extraA - spacesA, extraB - spacesB);
  return Math.max(extraA, extraB);
}

/** {@link bagDistance} of the last call, spaces ignored. */
export function bagMissingLetters(): number {
  return lastMissingLetters;
}

/** Options of {@link levenshtein} and {@link damerau}. */
export interface DistanceOptions {
  /**
   * Largest distance you care about. Above it, the computation stops early
   * and returns `max + 1`. Ideal to filter many pairs.
   */
  max?: number;
}

function bounded(a: string, b: string, transpositions: boolean, options: DistanceOptions | undefined): number {
  if (typeof a !== 'string') a = String(a);
  if (typeof b !== 'string') b = String(b);
  const max = options?.max;
  if (max === undefined || max === Infinity) return editDistance(a, b, transpositions);
  const limit = Math.max(0, Math.floor(max));
  // Cheap lower bounds first: length difference, then characters one lacks.
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  if (limit < Math.min(a.length, b.length) && bagDistance(a, b) > limit) return limit + 1;
  return Math.min(editDistance(a, b, transpositions), limit + 1);
}

/**
 * Levenshtein distance: minimum number of single-character insertions,
 * deletions and substitutions turning `a` into `b`.
 *
 * Operates on raw strings: no normalization is applied.
 *
 * @example
 * levenshtein('kitten', 'sitting') // 3
 * levenshtein('kitten', 'sitting', { max: 2 }) // 3 (more than 2: gives up early, returns max + 1)
 */
export function levenshtein(a: string, b: string, options?: DistanceOptions): number {
  return bounded(a, b, false, options);
}

/**
 * Damerau-Levenshtein distance (optimal string alignment): like
 * {@link levenshtein}, but swapping two adjacent characters costs 1.
 * This is the distance that best models human typos.
 *
 * Operates on raw strings: no normalization is applied.
 *
 * @example
 * damerau('teh', 'the')     // 1
 * damerau(a, b, { max: 3 }) // stops at 4 when the texts are further apart
 * levenshtein('teh', 'the') // 2
 */
export function damerau(a: string, b: string, options?: DistanceOptions): number {
  return bounded(a, b, true, options);
}

/**
 * Smallest edit distance between `query` and any part of `text` that starts at
 * the beginning of a word. The end of the match is free, so prefixes match
 * perfectly: `partialDistance('stair', 'stairway to heaven') === 0`.
 *
 * Skipping characters at the start of a word costs 1 each, so mid-word
 * matches are possible but penalized.
 */
export function partialDistance(query: string, text: string): number {
  const m = query.length;
  const n = text.length;
  if (m === 0) return 0;
  if (n === 0) return m;

  // Columns = query positions, rows = text positions.
  ensureRows(m + 1);
  let prev2 = rowC;
  let prev = rowA;
  let curr = rowB;
  for (let i = 0; i <= m; i += 1) prev[i] = i;
  let best = prev[m]!;
  let sinceBoundary = 0;

  for (let j = 1; j <= n; j += 1) {
    const tj = text.charCodeAt(j - 1);
    sinceBoundary = tj === 32 ? 0 : sinceBoundary + 1;
    curr[0] = sinceBoundary;
    for (let i = 1; i <= m; i += 1) {
      const qi = query.charCodeAt(i - 1);
      let value = Math.min(prev[i]! + 1, curr[i - 1]! + 1, prev[i - 1]! + (qi === tj ? 0 : 1));
      if (i > 1 && j > 1 && qi === text.charCodeAt(j - 2) && query.charCodeAt(i - 2) === tj) {
        value = Math.min(value, prev2[i - 2]! + 1);
      }
      curr[i] = value;
    }
    if (curr[m]! < best) best = curr[m]!;
    const tmp = prev2;
    prev2 = prev;
    prev = curr;
    curr = tmp;
  }
  return best;
}

/**
 * Smallest Damerau (OSA) distance between `query` and any substring of `text`,
 * bit-parallel (Hyyrö) when `query` fits in 32 bits. A cheap lower bound of
 * {@link partialDistance} and {@link prefixDistance}.
 */
export function searchDistance(query: string, text: string): number {
  const m = query.length;
  if (m === 0) return 0;
  if (m > 32) {
    ensureRows(m + 1);
    let prev2 = rowC;
    let prev = rowA;
    let curr = rowB;
    for (let i = 0; i <= m; i += 1) prev[i] = i;
    let best = m;
    for (let j = 1; j <= text.length; j += 1) {
      const tj = text.charCodeAt(j - 1);
      curr[0] = 0;
      for (let i = 1; i <= m; i += 1) {
        const qi = query.charCodeAt(i - 1);
        let value = Math.min(prev[i]! + 1, curr[i - 1]! + 1, prev[i - 1]! + (qi === tj ? 0 : 1));
        if (i > 1 && j > 1 && qi === text.charCodeAt(j - 2) && query.charCodeAt(i - 2) === tj) {
          value = Math.min(value, prev2[i - 2]! + 1);
        }
        curr[i] = value;
      }
      if (curr[m]! < best) best = curr[m]!;
      const tmp = prev2;
      prev2 = prev;
      prev = curr;
      curr = tmp;
    }
    return best;
  }

  const last = 1 << (m - 1);
  let vp = -1;
  let vn = 0;
  let d0 = 0;
  let pmOld = 0;
  let score = m;
  let best = m;
  fillPeq(query);
  for (let j = 0; j < text.length; j += 1) {
    const pm = peq[text.charCodeAt(j)]!;
    const tr = (((~d0) & pm) << 1) & pmOld;
    d0 = ((((pm & vp) + vp) ^ vp) | pm | vn) | tr;
    let hp = vn | ~(d0 | vp);
    let hn = d0 & vp;
    if (hp & last) score += 1;
    if (hn & last) score -= 1;
    if (score < best) best = score;
    // Free start: the top row stays at zero, so nothing is shifted in.
    hp <<= 1;
    hn <<= 1;
    vp = hn | ~(d0 | hp);
    vn = hp & d0;
    pmOld = pm;
  }
  clearPeq(query);
  return best;
}

/** Damerau (OSA) distance between `query` and the best prefix of `word`. */
export function prefixDistance(query: string, word: string): number {
  const m = query.length;
  if (m === 0) return 0;
  ensureRows(m + 1);
  let prev2 = rowC;
  let prev = rowA;
  let curr = rowB;
  for (let i = 0; i <= m; i += 1) prev[i] = i;
  let best = m;
  for (let j = 1; j <= word.length; j += 1) {
    const wj = word.charCodeAt(j - 1);
    curr[0] = j;
    for (let i = 1; i <= m; i += 1) {
      const qi = query.charCodeAt(i - 1);
      let value = Math.min(prev[i]! + 1, curr[i - 1]! + 1, prev[i - 1]! + (qi === wj ? 0 : 1));
      if (i > 1 && j > 1 && qi === word.charCodeAt(j - 2) && query.charCodeAt(i - 2) === wj) {
        value = Math.min(value, prev2[i - 2]! + 1);
      }
      curr[i] = value;
    }
    if (curr[m]! < best) best = curr[m]!;
    const tmp = prev2;
    prev2 = prev;
    prev = curr;
    curr = tmp;
  }
  return best;
}

/**
 * Jaro similarity, from 0 to 1: shared characters in about the same place,
 * and how many of them are swapped. {@link jaroWinkler} adds a bonus for a
 * shared prefix.
 *
 * Operates on raw strings: no normalization is applied.
 *
 * @example
 * jaro('martha', 'marhta') // 0.944
 */
export function jaro(a: string, b: string): number {
  a = String(a);
  b = String(b);
  if (a === b) return 1;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 || lenB === 0) return 0;

  const window = Math.max(Math.floor(Math.max(lenA, lenB) / 2) - 1, 0);
  const matchedA = new Uint8Array(lenA);
  const matchedB = new Uint8Array(lenB);
  let matches = 0;

  for (let i = 0; i < lenA; i += 1) {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, lenB);
    const ca = a.charCodeAt(i);
    for (let j = start; j < end; j += 1) {
      if (matchedB[j] || b.charCodeAt(j) !== ca) continue;
      matchedA[i] = 1;
      matchedB[j] = 1;
      matches += 1;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < lenA; i += 1) {
    if (!matchedA[i]) continue;
    while (!matchedB[k]) k += 1;
    if (a.charCodeAt(i) !== b.charCodeAt(k)) transpositions += 1;
    k += 1;
  }

  return (matches / lenA + matches / lenB + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Jaro-Winkler similarity, from 0 to 1. Rewards a shared prefix,
 * which makes it a good fit for short strings such as names.
 *
 * Operates on raw strings: no normalization is applied.
 *
 * @example
 * jaroWinkler('martha', 'marhta') // 0.961
 */
export function jaroWinkler(a: string, b: string): number {
  a = String(a);
  b = String(b);
  const jaroScore = jaro(a, b);
  const lenA = a.length;
  const lenB = b.length;
  let prefix = 0;
  const maxPrefix = Math.min(4, lenA, lenB);
  while (prefix < maxPrefix && a.charCodeAt(prefix) === b.charCodeAt(prefix)) prefix += 1;

  return jaroScore + prefix * 0.1 * (1 - jaroScore);
}
