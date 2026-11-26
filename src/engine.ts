import {
  bagDistance,
  bagMissingLetters,
  damerau,
  jaroWinkler,
  levenshtein,
  partialDistance,
  prefixDistance,
  searchDistance,
} from './distance.js';
import { compileNormalizer, type Normalizer } from './normalize.js';
import { DEFAULT_LANGUAGES, resolveLanguages } from './lang/index.js';
import { PHONETIC_WEIGHT, soundsFor, type SoundOf } from './phonetic.js';
import { mergeOptions } from './core.js';
import { presetOf } from './presets.js';
import { checkOptions } from './warn.js';
import type { Algorithm, Comparison, Language, MatchOptions } from './types.js';

const ALGORITHMS: readonly Algorithm[] = [
  'smart',
  'levenshtein',
  'damerau',
  'jaroWinkler',
  'tokenSort',
  'tokenSet',
];

/** Options with every default filled in. */
export interface ResolvedOptions extends Required<Omit<MatchOptions, 'preset' | 'languages'>> {
  /** Name of the preset used, built-in or not. */
  preset: string | undefined;
  /** Language packs in use; `undefined` means the default (English and French). */
  languages: readonly Language[] | undefined;
}

/** Options compiled once, reused for every comparison. */
export interface Engine {
  readonly options: ResolvedOptions;
  readonly normalize: Normalizer;
  /** Normalizes and prepares a raw text for comparisons. */
  readonly read: (text: string) => Prepared;
  /** Rebuilds what {@link read} returned from its normalized texts. */
  readonly restore: (text: string, alt: string | null) => Prepared;
}

/** A normalized text and the variants `smart` needs, computed once. */
export interface Prepared {
  readonly text: string;
  readonly sorted: string;
  readonly compact: string;
  readonly words: readonly string[];
  /**
   * The same text with numbers left as written, when reading them as digits
   * changed it. A typo in a number word ("twp") still scores against "two".
   */
  readonly alt?: Prepared;
  /** With `phonetic`: how the text sounds, words in their order. */
  readonly sound?: string;
  /** With `phonetic`: how the text sounds, words sorted. */
  readonly soundSorted?: string;
}

export function resolveOptions(options: MatchOptions = {}): ResolvedOptions {
  const pack = options.preset === undefined ? undefined : presetOf(options.preset);
  const { preset: _preset, ...own } = options;
  const merged: MatchOptions = mergeOptions(pack ? pack.options : {}, own);

  const algorithm = merged.algorithm ?? 'smart';
  if (!ALGORITHMS.includes(algorithm)) {
    throw new TypeError(
      `[fuzzy-toolkit] Unknown algorithm "${String(algorithm)}". Use one of: ${ALGORITHMS.join(', ')}.`,
    );
  }
  const threshold = merged.threshold ?? 80;
  if (typeof threshold !== 'number' || Number.isNaN(threshold)) {
    throw new TypeError('[fuzzy-toolkit] "threshold" must be a number between 0 and 100.');
  }

  return Object.freeze({
    preset: pack?.name,
    languages: resolveLanguages(merged.languages) ?? undefined,
    threshold,
    algorithm,
    ignoreWordOrder: merged.ignoreWordOrder ?? true,
    ignoreSpaces: merged.ignoreSpaces ?? true,
    partial: merged.partial ?? false,
    caseSensitive: merged.caseSensitive ?? false,
    accentSensitive: merged.accentSensitive ?? false,
    punctuation: merged.punctuation ?? 'space',
    numbers: merged.numbers ?? true,
    phonetic: merged.phonetic ?? false,
    acronyms: merged.acronyms ?? false,
    strip: Object.freeze([...(merged.strip ?? [])]),
    ignoreWords: Object.freeze([...(merged.ignoreWords ?? [])]),
    replace: Object.freeze({ ...merged.replace }),
    stopwords: merged.stopwords ?? false,
    stripPatterns: Object.freeze([...(merged.stripPatterns ?? [])]),
  });
}

const DIGIT_RE = /\d/;
const engineCache = new WeakMap<object, Engine>();
let defaultEngine: Engine | undefined;

export function compileEngine(options: MatchOptions = {}): Engine {
  const resolved = resolveOptions(options);
  const normalize = compileNormalizer(resolved);
  const asWritten = resolved.numbers ? compileNormalizer({ ...resolved, numbers: false }) : null;
  const sounds: Sounds | null = resolved.phonetic
    ? { join: resolved.ignoreSpaces ? '' : ' ', of: soundsFor(resolved.languages ?? DEFAULT_LANGUAGES) }
    : null;
  const read = (raw: string): Prepared => {
    const text = normalize(raw);
    const prepared = prepare(text, sounds);
    // Numbers only ever turn into digits: without one, nothing was rewritten.
    if (!asWritten || !DIGIT_RE.test(text)) return prepared;
    const written = asWritten(raw);
    return written === text ? prepared : { ...prepared, alt: prepare(written, sounds) };
  };
  const restore = (text: string, alt: string | null): Prepared => {
    const prepared = prepare(text, sounds);
    return alt === null ? prepared : { ...prepared, alt: prepare(alt, sounds) };
  };
  return { options: resolved, normalize, read, restore };
}

/**
 * Compiles options into an engine. Passing the same options object again
 * reuses the compiled engine, so `const opts = {...}` costs nothing per call.
 */
export function getEngine(options?: MatchOptions): Engine {
  if (!options) return (defaultEngine ??= compileEngine());
  let engine = engineCache.get(options);
  if (!engine) {
    if (typeof options !== 'object') {
      throw new TypeError(
        `[fuzzy-toolkit] Options must be an object, got ${typeof options} ${JSON.stringify(options)}. ` +
          'For example { threshold: 80 }, or { keys: ["name"] } to match a property of objects.',
      );
    }
    checkOptions(options);
    engine = compileEngine(options);
    engineCache.set(options, engine);
  }
  return engine;
}

/**
 * Splits a normalized text into the variants `smart` uses. With a `sounds`
 * separator (phonetic matching on), also computes how the text sounds.
 */
export interface Sounds {
  /** Separator between the sounds of words. */
  readonly join: string;
  /** Phonetic key of one word. */
  readonly of: SoundOf;
}

export function prepare(text: string, sounds: Sounds | null = null): Prepared {
  const words = text === '' ? [] : text.split(' ');
  const multi = words.length > 1;
  const prepared: Prepared = {
    text,
    words,
    sorted: multi ? [...words].sort().join(' ') : text,
    compact: multi ? words.join('') : text,
  };
  if (sounds === null || text === '') return prepared;
  const keys = words.map(sounds.of);
  return {
    ...prepared,
    sound: keys.join(sounds.join),
    soundSorted: multi ? [...keys].sort().join(sounds.join) : keys[0]!,
  };
}

function ratio(distance: number, a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 100 : (1 - distance / max) * 100;
}

function round(score: number): number {
  return Math.round(score * 100) / 100;
}

function tokenSet(a: Prepared, b: Prepared): number {
  const left = new Set(a.words);
  const right = new Set(b.words);
  const common = [...left].filter((w) => right.has(w)).sort();
  const onlyLeft = [...left].filter((w) => !right.has(w)).sort();
  const onlyRight = [...right].filter((w) => !left.has(w)).sort();
  const base = common.join(' ');
  const withLeft = [base, onlyLeft.join(' ')].filter(Boolean).join(' ');
  const withRight = [base, onlyRight.join(' ')].filter(Boolean).join(' ');
  const pairs: [string, string][] = [
    [withLeft, withRight],
    ...(base ? ([[base, withLeft], [base, withRight]] as [string, string][]) : []),
  ];
  return Math.max(...pairs.map(([x, y]) => ratio(damerau(x, y), x, y)));
}

/**
 * Score of the shorter text matching part of the longer one, or -1 when it
 * provably cannot exceed `floor` (checked first with cheap bit-parallel bounds).
 */
function partialScore(short: Prepared, long: Prepared, floor: number): number {
  const s = short.text;
  const l = long.text;
  // A part never scores as high as the whole: weigh by how much is covered,
  // with a bonus when it is the start of the text (what autocomplete expects).
  const coverage = 100 * (0.85 + (0.15 * s.length) / l.length);
  const startCoverage = 100 * (0.9 + (0.1 * s.length) / l.length);
  const multiWord = short.words.length > 1;

  const wholeBound = 1 - searchDistance(s, l) / s.length;
  let wordsBound = -1;
  if (multiWord) {
    let distance = 0;
    let letters = 0;
    for (const word of short.words) {
      distance += searchDistance(word, l);
      letters += word.length;
    }
    wordsBound = 1 - distance / letters;
  }
  if (Math.max(wholeBound * startCoverage, wordsBound * coverage) <= floor) return -1;

  let best = wholeBound > 0 ? 1 - partialDistance(s, l) / s.length : 0;
  const fromStart = wholeBound > 0 ? (1 - prefixDistance(s, l) / s.length) * startCoverage : 0;

  // Several words: each one may match the start of any word, in any order.
  if (multiWord && best < 1 && wordsBound > best) {
    let distance = 0;
    let letters = 0;
    for (const word of short.words) {
      let wordBest = word.length;
      for (const target of long.words) {
        if (wordBest === 0) break;
        wordBest = Math.min(wordBest, prefixDistance(word, target));
      }
      distance += wordBest;
      letters += word.length;
    }
    best = Math.max(best, 1 - distance / letters);
  }

  return Math.max(0, best * coverage, fromStart);
}

type Scores = Comparison['scores'];

/** Scores two prepared texts. Fills `scores` with each strategy's result. */
export function scorePrepared(
  a: Prepared,
  b: Prepared,
  engine: Engine,
  scores?: Scores,
  floor = 0,
  queryFirst = false,
): number {
  const score = scoreOne(a, b, engine, scores, floor, queryFirst);
  if ((!a.alt && !b.alt) || score === 100) return score;
  // Also compare the numbers as written; the search hint is about `a` and `b` only.
  const saved = { ...hint };
  clearSearchHint();
  try {
    return Math.max(score, scoreOne(a.alt ?? a, b.alt ?? b, engine, scores, floor, queryFirst));
  } finally {
    Object.assign(hint, saved);
  }
}

function scoreOne(
  a: Prepared,
  b: Prepared,
  engine: Engine,
  scores?: Scores,
  floor = 0,
  queryFirst = false,
): number {
  const { algorithm } = engine.options;
  if (a.text === b.text) {
    if (scores) scores[algorithm === 'smart' ? 'characters' : algorithm] = 100;
    return 100;
  }
  if (a.text === '' || b.text === '') {
    if (scores) scores[algorithm === 'smart' ? 'characters' : algorithm] = 0;
    return 0;
  }

  // In lists, most candidates are far off: a character count rules them out.
  if (floor > 0 && !scores && (algorithm === 'levenshtein' || algorithm === 'damerau' || algorithm === 'tokenSort')) {
    const max = Math.max(a.text.length, b.text.length);
    const missing = Math.max(bagDistance(a.text, b.text), Math.abs(a.text.length - b.text.length));
    if ((1 - missing / max) * 100 < floor - 0.01) return 0;
  }

  switch (algorithm) {
    case 'levenshtein':
      return record(scores, algorithm, ratio(levenshtein(a.text, b.text), a.text, b.text));
    case 'damerau':
      return record(scores, algorithm, ratio(damerau(a.text, b.text), a.text, b.text));
    case 'jaroWinkler':
      return record(scores, algorithm, jaroWinkler(a.text, b.text) * 100);
    case 'tokenSort':
      return record(scores, algorithm, ratio(damerau(a.sorted, b.sorted), a.sorted, b.sorted));
    case 'tokenSet':
      return record(scores, algorithm, tokenSet(a, b));
    default:
      return smart(a, b, engine.options, scores, floor, queryFirst);
  }
}

function record(scores: Scores | undefined, key: keyof Scores, value: number): number {
  const rounded = round(value);
  if (scores) scores[key] = rounded;
  return rounded;
}

function smart(
  a: Prepared,
  b: Prepared,
  options: ResolvedOptions,
  scores: Scores | undefined,
  floor: number,
  queryFirst: boolean,
): number {
  // In a search, only the query may be the partial side: "i don" finds
  // "I Don't Care", but "I Do" is not a match for "i don".
  const partial = options.partial && (queryFirst ? a.text.length < b.text.length : a.text.length !== b.text.length);
  const sound = options.phonetic ? soundScore(a, b, options, floor) : 0;
  // In a search, only the query may be the acronym.
  const acronym = options.acronyms && (!queryFirst || a.words.length === 1) ? acronymScore(a, b) : 0;
  if (acronym > 0) record(scores, 'acronym', acronym);
  // In lists, most candidates are far off: rule them out with cheap bounds.
  if (floor > 0 && !scores && !canReach(a, b, options, partial, floor - 0.01)) return Math.max(sound, acronym);

  let best = record(scores, 'characters', ratio(damerau(a.text, b.text), a.text, b.text));
  const multiWord = a.words.length > 1 || b.words.length > 1;
  // A strategy is only worth running if its length bound can beat both.
  const worth = (x: number, y: number): boolean =>
    best < 100 && lengthBound(x, y) > Math.max(best, floor - 0.01);

  const reordered = a.sorted !== a.text || b.sorted !== b.text;
  if (options.ignoreWordOrder && reordered && worth(a.sorted.length, b.sorted.length)) {
    const value = record(scores, 'wordOrder', ratio(damerau(a.sorted, b.sorted), a.sorted, b.sorted));
    if (value > best) best = value;
  }
  if (options.ignoreSpaces && multiWord && worth(a.compact.length, b.compact.length)) {
    const value = record(scores, 'spaces', ratio(damerau(a.compact, b.compact), a.compact, b.compact));
    if (value > best) best = value;
  }
  if (best < 100 && partial) {
    const [short, long] = a.text.length < b.text.length ? [a, b] : [b, a];
    const value = partialScore(short, long, Math.max(best, floor - 0.01));
    if (value >= 0) {
      record(scores, 'partial', value);
      if (round(value) > best) best = round(value);
    }
  }
  if (options.phonetic) {
    record(scores, 'phonetic', sound);
    if (sound > best) best = sound;
  }
  return acronym > best ? acronym : best;
}

/** Score of an acronym match. */
export const ACRONYM_SCORE = 90;

/** Whether one side is a single word that could be the initials of the other. */
function acronymPair(a: Prepared, b: Prepared): [Prepared, Prepared] | null {
  if (a.words.length === 1 && b.words.length >= 2) return [a, b];
  if (b.words.length === 1 && a.words.length >= 2) return [b, a];
  return null;
}

/**
 * `nyc` against `new york city`: 90 for the exact initials, 80 with one typo
 * (3 letters or more), 0 otherwise.
 */
function acronymScore(a: Prepared, b: Prepared): number {
  const pair = acronymPair(a, b);
  if (!pair) return 0;
  const [short, long] = pair;
  const n = short.text.length;
  const words = long.words.length;
  if (n < 2 || Math.abs(n - words) > 1) return 0;
  let initials = '';
  for (const word of long.words) initials += word[0];
  if (initials === short.text) return ACRONYM_SCORE;
  if (n >= 3 && damerau(short.text, initials) === 1) return ACRONYM_SCORE - 10;
  return 0;
}

/**
 * Score of two texts compared by how they sound, worth at most 95. 0 when the
 * texts have no sound key or provably cannot reach `floor`.
 */
function soundScore(a: Prepared, b: Prepared, options: ResolvedOptions, floor: number): number {
  const x = a.sound;
  const y = b.sound;
  // Too short to tell anything by ear: "air" and "her" must not match.
  if (x === undefined || y === undefined || x.length < 3 || y.length < 3) return 0;
  if (x === y) return round(100 * PHONETIC_WEIGHT);
  if (lengthBound(x.length, y.length) * PHONETIC_WEIGHT < floor - 0.01) return 0;
  let value = ratio(damerau(x, y), x, y);
  if (options.ignoreWordOrder && value < 100 && (a.soundSorted !== x || b.soundSorted !== y)) {
    const xs = a.soundSorted!;
    const ys = b.soundSorted!;
    value = Math.max(value, ratio(damerau(xs, ys), xs, ys));
  }
  return round(value * PHONETIC_WEIGHT);
}

/**
 * Lower bounds of `searchDistance` computed once on a text that contains all
 * the candidate texts (an item's joined keys). -1 when unknown.
 */
const hint = { whole: -1, words: -1 };

/** Sets {@link hint} for the next comparisons; call `clearSearchHint()` after. */
export function setSearchHint(query: Prepared, container: Prepared): void {
  hint.whole = searchDistance(query.text, container.text);
  hint.words = -1;
  if (query.words.length > 1) {
    let distance = 0;
    for (const word of query.words) distance += searchDistance(word, container.text);
    hint.words = distance;
  }
}

export function clearSearchHint(): void {
  hint.whole = -1;
  hint.words = -1;
}

/**
 * Whether the `smart` score could reach `floor`, judging from lengths,
 * character counts and one bit-parallel scan, cheapest checks first.
 */
function canReach(a: Prepared, b: Prepared, options: ResolvedOptions, partial: boolean, floor: number): boolean {
  const swap = a.text.length > b.text.length;
  const short = swap ? b : a;
  const long = swap ? a : b;
  const s = short.text.length;
  const l = long.text.length;

  const byLength = lengthBound(s, l);
  const byCompact = options.ignoreSpaces ? lengthBound(a.compact.length, b.compact.length) : 0;
  if (Math.max(byLength, byCompact) >= floor) {
    const missing = bagDistance(a.text, b.text);
    if ((1 - Math.max(missing, l - s) / l) * 100 >= floor) return true;
    if (options.ignoreSpaces) {
      const cmax = Math.max(a.compact.length, b.compact.length, 1);
      const cdiff = Math.abs(a.compact.length - b.compact.length);
      if ((1 - Math.max(bagMissingLetters(), cdiff) / cmax) * 100 >= floor) return true;
    }
  }
  if (!partial) return false;

  const coverage = 100 * (0.85 + (0.15 * s) / l);
  const startCoverage = 100 * (0.9 + (0.1 * s) / l);
  if (startCoverage < floor) return false;
  const known = short === a ? hint : null;
  if (
    (!known || known.whole < 0 || (1 - known.whole / s) * startCoverage >= floor) &&
    (1 - searchDistance(short.text, long.text) / s) * startCoverage >= floor
  ) {
    return true;
  }
  if (short.words.length > 1) {
    const letters = s - short.words.length + 1;
    if (known && known.words >= 0 && (1 - known.words / letters) * coverage < floor) return false;
    let distance = 0;
    for (const word of short.words) distance += searchDistance(word, long.text);
    if ((1 - distance / (s - short.words.length + 1)) * coverage >= floor) return true;
  }
  return false;
}

function lengthBound(x: number, y: number): number {
  const max = Math.max(x, y);
  return max === 0 ? 100 : (1 - Math.abs(x - y) / max) * 100;
}

/**
 * Cheap upper bound of the score, from lengths alone. Lets list functions skip
 * candidates that cannot reach the threshold without computing a distance.
 */
export function maxPossibleScore(a: Prepared, b: Prepared, options: ResolvedOptions): number {
  const bound = maxOne(a, b, options);
  return a.alt || b.alt ? Math.max(bound, maxOne(a.alt ?? a, b.alt ?? b, options)) : bound;
}

function maxOne(a: Prepared, b: Prepared, options: ResolvedOptions): number {
  const { algorithm } = options;
  if (algorithm === 'jaroWinkler' || algorithm === 'tokenSet') return 100;
  if (algorithm === 'smart' && options.partial) return 100;
  let best = lengthBound(a.text.length, b.text.length);
  if (algorithm === 'smart' && options.ignoreSpaces) {
    best = Math.max(best, lengthBound(a.compact.length, b.compact.length));
  }
  if (algorithm === 'smart' && options.acronyms && acronymPair(a, b)) best = Math.max(best, ACRONYM_SCORE);
  if (algorithm === 'smart' && options.phonetic && a.sound !== undefined && b.sound !== undefined) {
    best = Math.max(best, lengthBound(a.sound.length, b.sound.length) * PHONETIC_WEIGHT);
  }
  return best;
}

export { round as roundScore };
