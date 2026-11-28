import {
  compileEngine,
  getEngine,
  maxPossibleScore,
  roundScore,
  scorePrepared,
  setSearchHint,
  clearSearchHint,
  beginSearch,
  searching,
  pairsOfItem,
  setCandidatePairs,
  type Engine,
  type Prepared,
  type ResolvedOptions,
} from './engine.js';
import { canBlock, createBlocker } from './blocking.js';
import { partialDistance } from './distance.js';
import { findAllIn, findIn, highlightIn, type Found, type Name, type Segment } from './text.js';
import { warnOnce, checkOptions } from './warn.js';
import type {
  CheckOptions,
  CheckResult,
  Comparison,
  GroupOptions,
  JoinOptions,
  JoinRow,
  KeysOption,
  Language,
  ListOptions,
  Match,
  MatchOptions,
  NormalizeOptions,
  MultiCheckResult,
} from './types.js';

/**
 * Makes `options` required, with `keys`, when items are not strings, so the
 * editor tells you right away which properties can be searched.
 */
export type ItemsArgs<T, O> = [T] extends [string]
  ? [options?: O]
  : [options: O & { keys: KeysOption<T> }];

/**
 * Makes `left` and `right` required in {@link join} for the lists whose items
 * are objects.
 */
export type JoinArgs<L, R, O> = [L] extends [string]
  ? [R] extends [string]
    ? [options?: O]
    : [options: O & { right: KeysOption<R> }]
  : [R] extends [string]
    ? [options: O & { left: KeysOption<L> }]
    : [options: O & { left: KeysOption<L>; right: KeysOption<R> }];

/** Per-call options of a matcher's list methods. */
export interface MatcherListOptions<T> {
  /** Maximum number of results. @default Infinity */
  limit?: number;
  /** Override the matcher's threshold for this call. */
  threshold?: number;
  /** Where to read the text of each item. Required when items are objects. */
  keys?: KeysOption<T>;
  /** Add `ranges` (the parts of `text` to highlight) to each result. @default false */
  includeMatches?: boolean;
}

/** Per-call options of {@link Matcher.check}. */
export interface MatcherCheckOptions {
  /** Override the matcher's threshold for this call. */
  threshold?: number;
  /** Minimum score for `close`. @default threshold - 15 */
  closeThreshold?: number;
}

/** A pre-processed list of items, ready to be searched many times. */
export interface Index<T> {
  /**
   * The normalized texts and options, as plain JSON, to load later with
   * {@link loadIndex} and skip normalizing again. `JSON.stringify(index)` calls it.
   */
  toJSON(): SavedIndex;
  /** Number of items in the index. */
  readonly size: number;
  /** The indexed items, in order. `Match.index` is a position in this list. */
  readonly items: readonly T[];
  /**
   * Items matching `query`, best first.
   * @example
   * const songs = createIndex(catalog, { keys: ['title', 'artist'], preset: 'search' })
   * songs.search('bohem', { limit: 5 })
   */
  search(query: string, options?: Omit<MatcherListOptions<T>, 'keys'>): Match<T>[];
  /** The best item for `query`, or `undefined` if none reaches the threshold. */
  closest(query: string, options?: Pick<MatcherListOptions<T>, 'threshold' | 'includeMatches'>): Match<T> | undefined;
  /**
   * Adds items at the end of the index. Only the new items are processed.
   * @example
   * index.add({ title: 'Flowers', artist: 'Miley Cyrus' })
   * index.add(...newSongs)
   */
  add(...items: T[]): void;
  /**
   * Removes the items for which `predicate` returns `true`, or the given item
   * (compared with `===`). Returns how many were removed.
   * @example
   * index.remove((song) => song.id === 42)
   */
  remove(itemOrPredicate: T | ((item: T, index: number) => boolean)): number;
  /**
   * Re-reads the text of the items for which `predicate` returns `true`, after
   * you changed them in place. Returns how many were refreshed.
   * @example
   * song.title = 'Bohemian Rhapsody (Live)'
   * index.refresh((s) => s === song)
   */
  refresh(predicate: (item: T, index: number) => boolean): number;
}

/**
 * A reusable, pre-compiled configuration. Create one per use case and reuse
 * it: options are parsed and regular expressions compiled only once.
 */
export interface Matcher {
  /** The options in use, with every default filled in. */
  readonly options: Readonly<ResolvedOptions>;
  /** Normalizes a text the way this matcher does before comparing. */
  normalize(text: string): string;
  /** Similarity score between `a` and `b`, from 0 to 100. */
  similarity(a: string, b: string): number;
  /** Whether `a` and `b` are similar enough. */
  isMatch(a: string, b: string, threshold?: number): boolean;
  /** Detailed comparison, to understand and tune a score. */
  compare(a: string, b: string): Comparison;
  /** Grades a guess against one or several accepted answers. */
  check(guess: string, answers: string | readonly string[], options?: MatcherCheckOptions): CheckResult;
  /** Grades a guess that may contain several parts, such as a title and an artist. */
  checkAll<K extends string>(
    guess: string,
    answers: Readonly<Record<K, string | readonly string[]>>,
    options?: MatcherCheckOptions,
  ): MultiCheckResult<K>;
  /** The best item for `query`, or `undefined` if none reaches the threshold. */
  closest<T>(query: string, items: readonly T[], ...args: ItemsArgs<T, MatcherListOptions<T>>): Match<T> | undefined;
  /** Items matching `query`, best first. */
  search<T>(query: string, items: readonly T[], ...args: ItemsArgs<T, MatcherListOptions<T>>): Match<T>[];
  /** Removes near-duplicates, keeping the first occurrence of each. */
  dedupe<T>(items: readonly T[], ...args: ItemsArgs<T, Pick<MatcherListOptions<T>, 'threshold' | 'keys'>>): T[];
  /** Groups near-duplicates together. Groups keep the original order. */
  group<T>(items: readonly T[], ...args: ItemsArgs<T, Pick<MatcherListOptions<T>, 'threshold' | 'keys'>>): T[][];
  /** Fuzzy occurrences of `query` inside a longer `text`, with their positions. */
  find(text: string, query: string, options?: { threshold?: number }): Found[];
  /** Splits `text` into pieces, marking the ones that match `query`. */
  highlight(text: string, query: string): Segment[];
  /** Pairs each item of `left` with its best match in `right`. */
  join<L, R>(
    left: readonly L[],
    right: readonly R[],
    ...args: JoinArgs<L, R, Pick<JoinOptions<L, R>, 'left' | 'right' | 'unique' | 'threshold'>>
  ): JoinRow<L, R>[];
  /** Pre-processes a list once, to search it many times. */
  index<T>(items: readonly T[], ...args: ItemsArgs<T, Pick<MatcherListOptions<T>, 'keys'>>): Index<T>;
}

interface Entry<T> {
  item: T;
  /** Position in the list; renumbered when an index removes items. */
  index: number;
  texts: readonly string[];
  weights: readonly number[];
  keys: readonly (string | undefined)[];
  prepared: readonly Prepared[];
  /** Whether the last prepared text joins all the others. */
  joined: boolean;
  /** Characters present in any of the texts (see {@link letterMask}). */
  mask: number;
  /** Length of the longest prepared text. */
  longest: number;
  /** Largest key weight. */
  heaviest: number;
  /** Letter pairs of the texts, computed the first time a search needs them; `false` when not kept. */
  pairs: Int32Array | null | false;
}

/**
 * The characters of a text as 32 bits: one per letter, the others share the
 * remaining bits. A query character whose bit is missing from a text costs
 * at least one edit, which rules most of a list out in one AND.
 */
const LETTER_BITS = new Int32Array(128);
for (let c = 0; c < 128; c += 1) LETTER_BITS[c] = c === 32 ? 0 : 1 << (c >= 97 && c <= 122 ? c - 97 : 26 + (c % 6));

function letterMask(text: string): number {
  let mask = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    mask |= c < 128 ? LETTER_BITS[c]! : 1 << (26 + (c % 6));
  }
  return mask;
}

function popcount(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24);
}

/** Whether the letter filter is exact for these options (every score is `1 - edits / length` or better bounded). */
function canFilterLetters(engine: Engine): boolean {
  const { algorithm, phonetic } = engine.options;
  if (algorithm === 'smart') return !phonetic;
  return algorithm === 'levenshtein' || algorithm === 'damerau' || algorithm === 'tokenSort';
}

interface ItemTexts {
  texts: string[];
  weights: number[];
  /** The property each text comes from, when known. */
  keys: (string | undefined)[];
}

function toText(value: unknown): string {
  return value == null ? '' : String(value);
}

function pushTexts(out: ItemTexts, value: unknown, weight: number, key?: string): void {
  if (Array.isArray(value)) for (const v of value) pushTexts(out, v, weight, key);
  else if (value != null && value !== '') {
    out.texts.push(toText(value));
    out.weights.push(weight);
    out.keys.push(key);
  }
}

/**
 * Reads a property, or a nested one with a dotted path (`artist.name`). Arrays
 * along the path are read item by item (`tags.label` on `{ tags: [{ label }] }`).
 */
function reader(name: string): (item: unknown) => unknown {
  const path = name.includes('.') ? name.split('.') : null;
  const walk = (value: unknown, i: number): unknown => {
    if (i === path!.length || value == null) return value;
    if (Array.isArray(value)) return value.flatMap((v) => walk(v, i) ?? []);
    return walk((value as Record<string, unknown>)[path![i]!], i + 1);
  };
  return (item) => {
    if (item == null) return undefined;
    const own = (item as Record<string, unknown>)[name];
    return own !== undefined || !path ? own : walk(item, 0);
  };
}

function textGetter<T>(keys: KeysOption<T> | undefined): (item: T) => ItemTexts {
  if (keys === undefined) {
    return (item) => {
      if (item !== null && typeof item === 'object') {
        throw new TypeError(
          '[fuzzy-toolkit] Items are objects: pass `keys` to say where their text is, e.g. { keys: ["title"] }.',
        );
      }
      return { texts: [toText(item)], weights: [1], keys: [undefined] };
    };
  }
  if (typeof keys === 'function') {
    return (item) => {
      const out: ItemTexts = { texts: [], weights: [], keys: [] };
      pushTexts(out, keys(item), 1);
      return out;
    };
  }
  const list = (typeof keys === 'string' ? [keys] : keys) as readonly (string | { name: string; weight?: number })[];
  const fields = list.map((key) =>
    typeof key === 'string' ? { name: key, weight: 1 } : { name: key.name, weight: key.weight ?? 1 },
  ).map((field) => ({ ...field, read: reader(field.name) }));
  return (item) => {
    const out: ItemTexts = { texts: [], weights: [], keys: [] };
    for (const field of fields) {
      pushTexts(out, field.read(item), field.weight, field.name);
    }
    return out;
  };
}

/**
 * Warns when no item has any of the keys, a typo that would silently find
 * nothing. Checks the first items only, so it costs nothing on big lists.
 */
function warnMissingKeys(items: readonly unknown[], keys: readonly (string | { name: string })[]): void {
  const sample = items.slice(0, 20).filter((item): item is object => item !== null && typeof item === 'object');
  if (sample.length === 0) return;
  for (const key of keys) {
    const name = typeof key === 'string' ? key : key?.name;
    if (typeof name !== 'string') continue;
    const root = name.split('.')[0]!;
    if (sample.some((item) => name in item || root in item)) continue;
    const available = Object.keys(sample[0]!).slice(0, 12);
    warnOnce(
      `No item has the key "${name}", so it never matches. ` +
        (available.length ? `Keys of the first item: ${available.join(', ')}.` : 'The first item has no keys.'),
    );
  }
}

/** An index saved with `index.toJSON()`. */
export interface SavedIndex {
  /** Format version. */
  version: 1;
  /** The options the index was built with, to refuse loading it with others. */
  options: string;
  /** Normalized texts of each item: text, then the text with numbers as written (or null). */
  texts: (string | null)[][];
}

function buildEntries<T>(
  items: readonly T[],
  keys: KeysOption<T> | undefined,
  engine: Engine,
  saved?: SavedIndex['texts'],
  /** Entries searched many times (an index, the right side of a join) keep their letter pairs. */
  reused = false,
): Entry<T>[] {
  if (!Array.isArray(items)) {
    throw new TypeError('[fuzzy-toolkit] Expected an array of items.');
  }
  const getTexts = textGetter(keys);
  if (items.length > 0 && (typeof keys === 'string' || Array.isArray(keys))) warnMissingKeys(items, (typeof keys === 'string' ? [keys] : keys) as readonly (string | { name: string })[]);
  // When matching parts, all texts of an item also count together, so
  // "zep stair" finds { title: 'Stairway to Heaven', artist: 'Led Zeppelin' }.
  const joinTexts = engine.options.partial;
  // Array.from, not map: a hole in the list is an undefined item, not a hole in the entries.
  return Array.from(items, (item, index) => {
    const { texts, weights, keys: names } = getTexts(item);
    if (joinTexts && texts.length > 1) {
      texts.push(texts.join(' '));
      weights.push(Math.max(...weights));
      names.push(undefined);
    }
    const joined = joinTexts && texts.length > 2;
    let prepared: Prepared[];
    if (saved) {
      const row = saved[index];
      if (!row || row.length !== texts.length * 2) {
        throw new Error('[fuzzy-toolkit] The saved index does not match these items: rebuild it with createIndex().');
      }
      prepared = texts.map((_, i) => engine.restore(row[i * 2]!, row[i * 2 + 1] ?? null));
    } else prepared = texts.map((t) => engine.read(t));
    let mask = 0;
    let longest = 0;
    for (const p of prepared) {
      mask |= letterMask(p.text);
      longest = Math.max(longest, p.text.length);
      if (p.alt) {
        mask |= letterMask(p.alt.text);
        longest = Math.max(longest, p.alt.text.length);
      }
    }
    const heaviest = weights.length > 0 ? Math.max(...weights) : 1;
    return { item, index, texts, weights, keys: names, joined, prepared, mask, longest, heaviest, pairs: reused ? null : false };
  });
}

function bestOf<T>(
  query: Prepared,
  entry: Entry<T>,
  engine: Engine,
  threshold: number,
  withKey = false,
): Match<T> | null {
  let best: Match<T> | null = null;
  // One scan of the joined text bounds the scans of every part of it.
  const container = entry.joined ? entry.prepared[entry.prepared.length - 1]! : null;
  if (container && query.text.length < container.text.length) setSearchHint(query, container);
  // Kept on the entry, so an index computes them once for every query.
  if (entry.pairs !== false && searching()) setCandidatePairs((entry.pairs ??= pairsOfItem(entry.prepared)) as Int32Array);
  try {
    for (let i = 0; i < entry.prepared.length; i += 1) {
      const candidate = entry.prepared[i]!;
      const weight = entry.weights[i]!;
      // Skip what cannot reach the threshold, without computing anything.
      if (maxPossibleScore(query, candidate, engine.options) * weight + 0.01 < threshold) continue;
      const floor = weight > 0 ? threshold / weight : Infinity;
      const raw = scorePrepared(query, candidate, engine, undefined, floor, true);
      const score = weight === 1 ? raw : roundScore(raw * weight);
      if (!best || score > best.score) {
        best = { item: entry.item, score, index: entry.index, text: entry.texts[i]! };
        if (withKey && entry.keys[i] !== undefined) best.key = entry.keys[i];
      }
    }
  } finally {
    if (container) clearSearchHint();
    setCandidatePairs(null);
  }
  return best && best.score >= threshold ? best : null;
}

function rank<T>(
  query: string,
  entries: readonly Entry<T>[],
  engine: Engine,
  threshold: number,
  limit: number,
  includeMatches = false,
): Match<T>[] {
  const results = rankEntries(query, entries, engine, threshold, limit, includeMatches);
  if (includeMatches) {
    for (const match of results) match.ranges = rangesOf(match.text, toText(query), engine);
  }
  return results;
}

const exactEngines = new WeakMap<Engine, Engine>();

/**
 * Parts of `text` to highlight for `query`: what was typed, to the character
 * ("New Yo|rk"), or the initials of an acronym match.
 */
function rangesOf(text: string, query: string, engine: Engine): [number, number][] {
  // Partial matching would light up whole words: highlight what was typed instead.
  let exact = exactEngines.get(engine);
  if (!exact) {
    const { preset: _preset, ...options } = engine.options;
    exact = engine.options.partial || engine.options.acronyms
      ? compileEngine({ ...options, partial: false, acronyms: false, substring: false })
      : engine;
    exactEngines.set(engine, exact);
  }
  const ranges: [number, number][] = [];
  let at = 0;
  for (const segment of highlightIn(text, query, exact, Math.max(80, engine.options.threshold), engine.options.substring)) {
    if (segment.match) ranges.push([at, at + segment.text.length]);
    at += segment.text.length;
  }
  if (ranges.length === 0 && engine.options.acronyms) {
    const words = [...text.matchAll(/[\p{L}\p{N}]+/gu)];
    const initials = words.map((w) => engine.normalize(w[0]).charAt(0)).join('');
    if (words.length >= 2 && initials.length > 0 && engine.normalize(query).replace(/ /g, '').length <= words.length + 1) {
      for (const w of words) ranges.push([w.index!, w.index! + 1]);
    }
  }
  return ranges;
}

function rankEntries<T>(
  query: string,
  entries: readonly Entry<T>[],
  engine: Engine,
  threshold: number,
  limit: number,
  withKey: boolean,
): Match<T>[] {
  const prepared = engine.read(toText(query));
  const max = Math.max(0, Math.floor(limit));
  if (max === 0) return [];
  // Only partial matching scans the query's words: pack them for the whole list.
  beginSearch(engine.options.partial ? prepared : null);
  try {
    return rankPrepared(prepared, entries, engine, threshold, limit, max, withKey);
  } finally {
    beginSearch(null);
  }
}

function rankPrepared<T>(
  prepared: Prepared,
  entries: readonly Entry<T>[],
  engine: Engine,
  threshold: number,
  limit: number,
  max: number,
  withKey: boolean,
): Match<T>[] {
  // Letters of the query that an entry lacks each cost an edit.
  const filter = canFilterLetters(engine) && prepared.text !== '';
  const queryMask = letterMask(prepared.text);
  const altMask = prepared.alt ? letterMask(prepared.alt.text) : queryMask;
  const queryLength = Math.max(prepared.text.length, prepared.alt?.text.length ?? 0);
  const acronymQuery = engine.options.acronyms && prepared.words.length === 1;
  const hopeless = (entry: Entry<T>, floor: number): boolean => {
    if (!filter) return false;
    const missing = Math.min(popcount(queryMask & ~entry.mask), popcount(altMask & ~entry.mask));
    if (missing === 0) return false;
    // An acronym with a typo may lack one letter.
    if (missing === 1 && acronymQuery) return false;
    const lowest = floor / Math.max(entry.heaviest, 1e-9) - 0.01;
    // Whatever the text's length, `missing` edits leave at most this score.
    return 100 * (1 - missing / (queryLength + missing)) < lowest;
  };

  if (!Number.isFinite(limit) || max >= entries.length) {
    const results: Match<T>[] = [];
    for (const entry of entries) {
      if (hopeless(entry, threshold)) continue;
      const match = bestOf(prepared, entry, engine, threshold, withKey);
      if (match) results.push(match);
    }
    return results.sort((x, y) => y.score - x.score || x.index - y.index).slice(0, max || undefined);
  }

  // Top-k: once `max` results are kept, a candidate must beat the worst of
  // them, which lets the cheap bounds skip most of the list.
  const top: Match<T>[] = [];
  let floor = threshold;
  for (const entry of entries) {
    if (hopeless(entry, floor)) continue;
    const match = bestOf(prepared, entry, engine, floor, withKey);
    if (!match) continue;
    if (top.length === max && match.score <= top[max - 1]!.score) continue;
    let i = top.length;
    while (i > 0 && top[i - 1]!.score < match.score) i -= 1;
    top.splice(i, 0, match);
    if (top.length > max) top.pop();
    if (top.length === max) floor = Math.max(threshold, top[max - 1]!.score + 0.001);
  }
  return top;
}

function grade(
  guess: string,
  answers: string | readonly string[],
  engine: Engine,
  threshold: number,
  closeThreshold: number,
): CheckResult {
  const list = typeof answers === 'string' ? [answers] : Array.from(answers ?? [], toText);
  const prepared = engine.read(toText(guess));
  let score = 0;
  let answer: string | undefined;

  // An empty guess is never right, even against an empty answer.
  if (prepared.text !== '') {
    for (const candidate of list) {
      const value = scorePrepared(prepared, engine.read(candidate), engine);
      if (answer === undefined || value > score) {
        score = value;
        answer = candidate;
      }
      if (score === 100) break;
    }
  }

  let verdict = verdictOf(score, threshold, closeThreshold);

  // A good chunk of the answer ("bohemian" for "Bohemian Rhapsody") is close too.
  if (verdict === 'wrong' && answer !== undefined) {
    const target = engine.read(answer);
    if (prepared.text.length >= 0.4 * target.text.length && prepared.text.length < target.text.length) {
      const part = (1 - partialDistance(prepared.text, target.text) / prepared.text.length) * 100;
      if (part >= threshold) verdict = 'close';
    }
  }
  return {
    verdict,
    correct: verdict === 'correct',
    close: verdict === 'close',
    score,
    answer: answer ?? list[0],
  };
}

function verdictOf(score: number, threshold: number, closeThreshold: number): CheckResult['verdict'] {
  return score >= threshold ? 'correct' : score >= closeThreshold && score > 0 ? 'close' : 'wrong';
}

const RANK: Readonly<Record<CheckResult['verdict'], number>> = { wrong: 0, close: 1, correct: 2 };

function gradeParts<K extends string>(
  guess: string,
  answers: Readonly<Record<K, string | readonly string[]>>,
  engine: Engine,
  threshold: number,
  closeThreshold: number,
): MultiCheckResult<K> {
  const text = toText(guess);
  const parts = {} as Record<K, CheckResult>;
  const found: K[] = [];
  const missing: K[] = [];
  for (const key of Object.keys(answers ?? {}) as K[]) {
    const accepted = answers[key];
    const list = typeof accepted === 'string' ? [accepted] : Array.from(accepted ?? [], toText);
    // The guess as a whole ("queen") or a part of it ("bohemian rapsody de queen").
    let result = grade(text, list, engine, threshold, closeThreshold);
    if (!result.correct) {
      for (const answer of list) {
        const best = findIn(text, answer, engine, closeThreshold).reduce(
          (top, f) => (f.score > top.score ? f : top),
          { score: 0 },
        );
        const verdict = verdictOf(best.score, threshold, closeThreshold);
        if (RANK[verdict] > RANK[result.verdict] || (verdict === result.verdict && best.score > result.score)) {
          result = { verdict, correct: verdict === 'correct', close: verdict === 'close', score: best.score, answer };
        }
      }
    }
    parts[key] = result;
    (result.correct ? found : missing).push(key);
  }
  return { correct: missing.length === 0 && found.length > 0, found, missing, parts };
}

function joinLists<L, R>(
  left: readonly L[],
  right: readonly R[],
  options: Pick<JoinOptions<L, R>, 'left' | 'right' | 'unique'>,
  engine: Engine,
  threshold: number,
): JoinRow<L, R>[] {
  if (!Array.isArray(left)) throw new TypeError('[fuzzy-toolkit] Expected an array of left items.');
  const getTexts = textGetter(options.left);
  const entries = buildEntries(right, options.right, engine, undefined, true);
  // Weights above 1 let lower scores through: filter with the lowest score that can still count.
  const maxWeight = Math.max(1, ...entries.flatMap((e) => e.weights));
  const blocker = canBlock(engine, threshold / maxWeight)
    ? createBlocker(entries.map((e) => e.prepared), threshold / maxWeight)
    : null;
  entries.forEach((entry, i) => blocker?.add(i, entry.prepared));
  const candidates = (item: L, limit: number): Match<R>[] => {
    const byIndex = new Map<number, Match<R>>();
    for (const text of getTexts(item).texts) {
      const pool = blocker ? blocker.candidates([engine.read(text)]).map((i) => entries[i]!) : entries;
      for (const match of rank(text, pool, engine, threshold, limit)) {
        const seen = byIndex.get(match.index);
        if (!seen || match.score > seen.score) byIndex.set(match.index, match);
      }
    }
    return [...byIndex.values()].sort((x, y) => y.score - x.score || x.index - y.index);
  };

  if (!options.unique) {
    return left.map((item, index) => ({ item, index, match: candidates(item, 1)[0] }));
  }

  // One right item per left item: the best pairs are made first.
  const rows: JoinRow<L, R>[] = left.map((item, index) => ({ item, index, match: undefined }));
  const pairs = left.flatMap((item, index) => candidates(item, 5).map((match) => ({ index, match })));
  pairs.sort((x, y) => y.match.score - x.match.score || x.index - y.index || x.match.index - y.match.index);
  const taken = new Set<number>();
  for (const { index, match } of pairs) {
    if (rows[index]!.match || taken.has(match.index)) continue;
    rows[index]!.match = match;
    taken.add(match.index);
  }
  return rows;
}

function textKey(entry: Entry<unknown>): string {
  let key = '';
  for (const p of entry.prepared) key += `${p.text}\u0001${p.alt?.text ?? ''}\u0002`;
  return key;
}

/** The non-empty texts of an entry, by key (the joined text left out). */
function byKey(entry: Entry<unknown>): Map<string, Prepared[]> {
  const out = new Map<string, Prepared[]>();
  const count = entry.joined ? entry.prepared.length - 1 : entry.prepared.length;
  for (let i = 0; i < count; i += 1) {
    const p = entry.prepared[i]!;
    if (p.text === '') continue;
    const name = entry.keys[i] ?? '';
    const list = out.get(name);
    if (list) list.push(p);
    else out.set(name, [p]);
  }
  return out;
}

/** `everyKey`: each key filled on both sides matches its own key, and at least one is. */
function everyKeyMatches(a: Map<string, Prepared[]>, b: Map<string, Prepared[]>, engine: Engine, threshold: number): boolean {
  let compared = false;
  for (const [name, left] of a) {
    const right = b.get(name);
    if (!right) continue;
    compared = true;
    if (!left.some((x) => right.some((y) => scorePrepared(x, y, engine, undefined, threshold) >= threshold))) return false;
  }
  return compared;
}

function cluster<T>(
  entries: readonly Entry<T>[],
  engine: Engine,
  threshold: number,
  method: 'fuzzy' | 'fingerprint' = 'fuzzy',
  everyKey = false,
): T[][] {
  if (everyKey && method === 'fuzzy') return clusterEveryKey(entries, engine, threshold);
  if (method === 'fingerprint') {
    const byKey = new Map<string, T[]>();
    for (const entry of entries) {
      const key = entry.prepared.map((p) => fingerprintOf(p.text)).join('\u0001');
      const members = byKey.get(key);
      if (members) members.push(entry.item);
      else byKey.set(key, [entry.item]);
    }
    return [...byKey.values()];
  }
  const groups: { leader: Entry<T>; members: T[] }[] = [];
  const blocker = canBlock(engine, threshold) ? createBlocker(entries.map((e) => e.prepared), threshold) : null;
  // Items that read the same land where the first of them did.
  const seen = new Map<string, (typeof groups)[number]>();
  // Edits a pair may need and still reach the threshold, per character of the longer text.
  const slack = 1 - (threshold - 0.01) / 100;
  const plain = (e: Entry<T>): boolean => e.prepared.length === 1 && e.prepared[0]!.alt === undefined;
  for (const entry of entries) {
    const key = textKey(entry);
    let home: (typeof groups)[number] | undefined = seen.get(key);
    if (home) {
      home.members.push(entry.item);
      continue;
    }
    const ids = blocker ? blocker.candidates(entry.prepared) : null;
    const count = ids ? ids.length : groups.length;
    const one = blocker !== null && plain(entry);
    outer: for (let g = 0; g < count; g += 1) {
      const group = groups[ids ? ids[g]! : g]!;
      // Each letter one text has and the other lacks costs an edit, whatever
      // the strategy (they all compare the same letters): one test rules out
      // most candidates before scoring. Exact for one text each, as blocking is.
      if (one && plain(group.leader)) {
        const lead = group.leader;
        const missing = Math.max(popcount(entry.mask & ~lead.mask), popcount(lead.mask & ~entry.mask));
        if (missing > slack * Math.max(entry.longest, lead.longest) + 1e-9) continue;
      }
      for (const a of entry.prepared) {
        for (const b of group.leader.prepared) {
          if (maxPossibleScore(a, b, engine.options) + 0.01 < threshold) continue;
          if (scorePrepared(a, b, engine, undefined, threshold) >= threshold) {
            home = group;
            break outer;
          }
        }
      }
    }
    if (home) home.members.push(entry.item);
    else {
      blocker?.add(groups.length, entry.prepared);
      groups.push((home = { leader: entry, members: [entry.item] }));
    }
    seen.set(key, home);
  }
  return groups.map((g) => g.members);
}

function clusterEveryKey<T>(entries: readonly Entry<T>[], engine: Engine, threshold: number): T[][] {
  const groups: { leader: Map<string, Prepared[]>; members: T[] }[] = [];
  // Any pair of texts reaching the threshold is needed for every key to: blocking stays exact.
  const blocker = canBlock(engine, threshold) ? createBlocker(entries.map((e) => e.prepared), threshold) : null;
  for (const entry of entries) {
    const texts = byKey(entry);
    let home: (typeof groups)[number] | undefined;
    if (texts.size > 0) {
      const ids = blocker ? blocker.candidates(entry.prepared) : null;
      const count = ids ? ids.length : groups.length;
      for (let g = 0; g < count && !home; g += 1) {
        const group = groups[ids ? ids[g]! : g]!;
        if (everyKeyMatches(texts, group.leader, engine, threshold)) home = group;
      }
    }
    if (home) home.members.push(entry.item);
    else {
      blocker?.add(groups.length, entry.prepared);
      groups.push({ leader: texts, members: [entry.item] });
    }
  }
  return groups.map((g) => g.members);
}

function compareWith(a: string, b: string, engine: Engine): Comparison {
  const left = engine.read(toText(a));
  const right = engine.read(toText(b));
  const scores: Comparison['scores'] = {};
  const score = scorePrepared(left, right, engine, scores);
  return {
    score,
    match: score >= engine.options.threshold,
    threshold: engine.options.threshold,
    algorithm: engine.options.algorithm,
    a: left.text,
    b: right.text,
    scores,
  };
}

function optionsKey(engine: Engine): string {
  // Packs are identified by code/name and version, patterns by their source.
  return JSON.stringify(engine.options, (_key, value: unknown) => {
    if (value instanceof RegExp) return String(value);
    if (value && typeof value === 'object' && (value as Language).kind === 'language') {
      const pack = value as Language;
      return `${pack.code}@${pack.version ?? ''}`;
    }
    return value;
  });
}

function makeIndex<T>(
  items: readonly T[],
  keys: KeysOption<T> | undefined,
  engine: Engine,
  saved?: SavedIndex,
): Index<T> {
  if (saved) {
    if (saved.version !== 1 || !Array.isArray(saved.texts)) {
      throw new Error('[fuzzy-toolkit] Unknown saved index format: rebuild it with createIndex().');
    }
    if (saved.options !== optionsKey(engine)) {
      throw new Error('[fuzzy-toolkit] The saved index was built with other options: pass the same options to loadIndex().');
    }
    if (saved.texts.length !== items.length) {
      throw new Error('[fuzzy-toolkit] The saved index does not match these items: rebuild it with createIndex().');
    }
  }
  let entries = buildEntries(items, keys, engine, saved?.texts, true);
  let snapshot: readonly T[] | null = null;
  const renumber = (): void => {
    entries.forEach((entry, i) => (entry.index = i));
    snapshot = null;
  };
  const index: Index<T> = {
    get size() {
      return entries.length;
    },
    get items() {
      return (snapshot ??= Object.freeze(entries.map((entry) => entry.item)));
    },
    toJSON: () => ({
      version: 1,
      options: optionsKey(engine),
      texts: entries.map((entry) => entry.prepared.flatMap((p) => [p.text, p.alt?.text ?? null])),
    }),
    search: (query, options = {}) =>
      rank(
        query,
        entries,
        engine,
        options.threshold ?? engine.options.threshold,
        options.limit ?? Infinity,
        options.includeMatches,
      ),
    closest: (query, options = {}) =>
      rank(query, entries, engine, options.threshold ?? engine.options.threshold, 1, options.includeMatches)[0],
    add: (...added) => {
      const start = entries.length;
      for (const entry of buildEntries(added, keys, engine, undefined, true)) {
        entry.index += start;
        entries.push(entry);
      }
      snapshot = null;
    },
    remove: (target) => {
      const matches =
        typeof target === 'function'
          ? (target as (item: T, index: number) => boolean)
          : (item: T) => item === target;
      const before = entries.length;
      entries = entries.filter((entry) => !matches(entry.item, entry.index));
      if (entries.length !== before) renumber();
      return before - entries.length;
    },
    refresh: (predicate) => {
      let count = 0;
      entries = entries.map((entry) => {
        if (!predicate(entry.item, entry.index)) return entry;
        count += 1;
        const [fresh] = buildEntries([entry.item], keys, engine, undefined, true);
        fresh!.index = entry.index;
        return fresh!;
      });
      if (count > 0) snapshot = null;
      return count;
    },
  };
  listings.set(index, () => entries);
  return index;
}

const listings = new WeakMap<object, () => readonly Entry<unknown>[]>();

/**
 * Every item of an index as a match of score 100, with the text of its first
 * key: what the UI helpers show before anything is typed.
 */
export function everything<T>(index: Index<T>, limit = Infinity): Match<T>[] {
  const entries = listings.get(index)!() as readonly Entry<T>[];
  return entries.slice(0, Math.max(0, limit)).map((entry) => ({
    item: entry.item,
    score: 100,
    index: entry.index,
    text: entry.texts[0] ?? '',
    key: entry.keys[0],
    ranges: [],
  }));
}

function matcherFrom(engine: Engine): Matcher {
  const { threshold } = engine.options;
  return Object.freeze<Matcher>({
    options: engine.options,
    normalize: (text) => engine.normalize(toText(text)),
    similarity: (a, b) =>
      scorePrepared(engine.read(toText(a)), engine.read(toText(b)), engine),
    isMatch: (a, b, t = threshold) =>
      scorePrepared(engine.read(toText(a)), engine.read(toText(b)), engine) >= t,
    compare: (a, b) => compareWith(a, b, engine),
    check: (guess, answers, options = {}) => {
      const t = options.threshold ?? threshold;
      return grade(guess, answers, engine, t, options.closeThreshold ?? t - 15);
    },
    checkAll: (guess, answers, options = {}) => {
      const t = options.threshold ?? threshold;
      return gradeParts(guess, answers, engine, t, options.closeThreshold ?? t - 15);
    },
    join: <L, R>(left: readonly L[], right: readonly R[], options: JoinOptions<L, R> = {}) =>
      joinLists(left, right, options, engine, options.threshold ?? threshold),
    closest: <T>(query: string, items: readonly T[], options?: MatcherListOptions<T>) =>
      rank(
        query,
        buildEntries(items, options?.keys, engine),
        engine,
        options?.threshold ?? threshold,
        1,
        options?.includeMatches,
      )[0],
    search: <T>(query: string, items: readonly T[], options?: MatcherListOptions<T>) =>
      rank(
        query,
        buildEntries(items, options?.keys, engine),
        engine,
        options?.threshold ?? threshold,
        options?.limit ?? Infinity,
        options?.includeMatches,
      ),
    dedupe: <T>(items: readonly T[], options?: MatcherListOptions<T>) =>
      cluster(buildEntries(items, options?.keys, engine), engine, options?.threshold ?? threshold).map(
        (group) => group[0]!,
      ),
    group: <T>(items: readonly T[], options?: MatcherListOptions<T>) =>
      cluster(buildEntries(items, options?.keys, engine), engine, options?.threshold ?? threshold),
    find: (text, query, options = {}) => findIn(toText(text), toText(query), engine, options.threshold ?? threshold),
    highlight: (text, query) => highlightIn(toText(text), toText(query), engine, threshold),
    index: <T>(items: readonly T[], options?: MatcherListOptions<T>) => makeIndex(items, options?.keys, engine),
  } as Matcher);
}

/* ------------------------------------------------------------------------ */
/* Public functions                                                          */
/* ------------------------------------------------------------------------ */

/**
 * Creates a reusable matcher. Options are compiled once, which makes repeated
 * calls faster and keeps a use case's settings in one place.
 *
 * @example
 * const quiz = createMatcher({ preset: 'music', threshold: 85 })
 * quiz.check('bohemian rapsody', 'Bohemian Rhapsody - Remastered 2011').verdict // 'correct'
 *
 * const finder = createMatcher({ preset: 'search' })
 * finder.search('zep', bands, { limit: 5 })
 */
export function createMatcher(options: MatchOptions = {}): Matcher {
  if (options !== null && typeof options === 'object') checkOptions(options);
  return matcherFrom(compileEngine(options));
}

/**
 * Pre-processes a list once so it can be searched many times, fast.
 *
 * @example
 * const index = createIndex(songs, { keys: ['title', 'artist'], preset: 'search' })
 * index.search('queen')       // every Queen song, best first
 * index.closest('bohemian')   // { item: { title: 'Bohemian Rhapsody', ... }, score: 94.71, ... }
 */
export function createIndex<T>(items: readonly T[], ...args: ItemsArgs<T, ListOptions<T>>): Index<T> {
  const options = args[0] as ListOptions<T> | undefined;
  return makeIndex(items, options?.keys, getEngine(options));
}

/**
 * Rebuilds an index saved with `index.toJSON()`, without normalizing the
 * items again: build it once (at build time, on a server), ship it as JSON,
 * load it fast. Pass the same items, in the same order, and the same options.
 *
 * @example
 * // build step
 * writeFileSync('songs.index.json', JSON.stringify(createIndex(songs, { keys: 'title', preset: 'search' })))
 * // app
 * const index = loadIndex(songs, savedJson, { keys: 'title', preset: 'search' })
 */
export function loadIndex<T>(items: readonly T[], saved: SavedIndex, ...args: ItemsArgs<T, ListOptions<T>>): Index<T> {
  const options = args[0] as ListOptions<T> | undefined;
  return makeIndex(items, options?.keys, getEngine(options), saved);
}

/**
 * Similarity score between two texts, from 0 (nothing in common) to 100
 * (identical once normalized).
 *
 * @example
 * similarity('Molière', 'moliere')                 // 100
 * similarity('stairway to heven', 'Stairway to Heaven') // 94.44
 * similarity('Smith John', 'John Smith')           // 100
 */
export function similarity(a: string, b: string, options?: MatchOptions): number {
  const engine = getEngine(options);
  return scorePrepared(engine.read(toText(a)), engine.read(toText(b)), engine);
}

/**
 * Whether two texts are similar enough. Pass a number as a shortcut for the
 * threshold.
 *
 * @example
 * isMatch('Saint-Étienne', 'saint etienne') // true
 * isMatch('color', 'colour', 90)            // false (score 83.33)
 * isMatch('color', 'colour', { threshold: 80 }) // true
 */
export function isMatch(a: string, b: string, thresholdOrOptions?: number | MatchOptions): boolean {
  if (typeof thresholdOrOptions === 'number') checkOptions({ threshold: thresholdOrOptions });
  const options = typeof thresholdOrOptions === 'number' ? undefined : thresholdOrOptions;
  const engine = getEngine(options);
  const threshold = typeof thresholdOrOptions === 'number' ? thresholdOrOptions : engine.options.threshold;
  return similarity(a, b, options) >= threshold;
}

/**
 * Detailed comparison: normalized texts, score of each strategy, threshold.
 * Use it to understand a score and tune your options.
 *
 * @example
 * compare('The Beatles', 'beatles', { preset: 'music' })
 * // { score: 100, match: true, a: 'beatles', b: 'beatles', ... }
 */
export function compare(a: string, b: string, options?: MatchOptions): Comparison {
  return compareWith(a, b, getEngine(options));
}

/**
 * Grades a guess against one or several accepted answers: `correct`, `close`
 * ("almost!") or `wrong`. Built for quizzes, blind tests and form answers.
 *
 * @example
 * check('bohemian rapsody', 'Bohemian Rhapsody')
 * // { verdict: 'correct', correct: true, close: false, score: 94.12, answer: 'Bohemian Rhapsody' }
 *
 * check('the beetles', ['The Beatles', 'Beatles'], { preset: 'music' }).verdict // 'correct'
 * check('bohemian', 'Bohemian Rhapsody').verdict // 'wrong'
 */
export function check(guess: string, answers: string | readonly string[], options?: CheckOptions): CheckResult {
  const engine = getEngine(options);
  const threshold = engine.options.threshold;
  return grade(guess, answers, engine, threshold, options?.closeThreshold ?? threshold - 15);
}

/**
 * Grades a guess that may name several things at once, such as a song title
 * and its artist. Each part is found anywhere in the guess, typos included.
 *
 * @example
 * const result = checkAll('bohemian rapsody de queen', { title: 'Bohemian Rhapsody', artist: 'Queen' })
 * result.found   // ['title', 'artist']
 * result.correct // true
 *
 * checkAll('queen', { title: 'Bohemian Rhapsody', artist: 'Queen' }).missing // ['title']
 */
export function checkAll<K extends string>(
  guess: string,
  answers: Readonly<Record<K, string | readonly string[]>>,
  options?: CheckOptions,
): MultiCheckResult<K> {
  const engine = getEngine(options);
  const threshold = engine.options.threshold;
  return gradeParts(guess, answers, engine, threshold, options?.closeThreshold ?? threshold - 15);
}

/**
 * Pairs each item of `left` with its best match in `right`: reconcile two
 * exports, map free-text input to a reference list, merge two catalogs.
 *
 * @example
 * join(['Apple Inc.', 'Microsoft Corp'], ['MICROSOFT CORPORATION', 'Apple'], { ignoreWords: ['inc', 'corp', 'corporation'] })
 * // [{ item: 'Apple Inc.', index: 0, match: { item: 'Apple', ... } }, { item: 'Microsoft Corp', ..., match: { item: 'MICROSOFT CORPORATION', ... } }]
 *
 * join(orders, customers, { left: 'customerName', right: 'name', unique: true })
 */
export function join<L, R>(
  left: readonly L[],
  right: readonly R[],
  ...args: JoinArgs<L, R, JoinOptions<L, R>>
): JoinRow<L, R>[] {
  const options = (args[0] ?? {}) as JoinOptions<L, R>;
  const engine = getEngine(options);
  return joinLists(left, right, options, engine, engine.options.threshold);
}

/**
 * The item closest to `query`, or `undefined` if none reaches the threshold.
 * Perfect for "did you mean...?".
 *
 * @example
 * closest('pari', ['Paris', 'Lyon', 'Marseille'])?.item // 'Paris'
 * closest('bohemian', songs, { keys: 'title', partial: true })
 */
export function closest<T>(
  query: string,
  items: readonly T[],
  ...args: ItemsArgs<T, ListOptions<T>>
): Match<T> | undefined {
  const options = args[0] as ListOptions<T> | undefined;
  const engine = getEngine(options);
  return rank(
    query,
    buildEntries(items, options?.keys, engine),
    engine,
    engine.options.threshold,
    1,
    options?.includeMatches,
  )[0];
}

/**
 * Items matching `query`, best first. Works with strings or objects.
 *
 * @example
 * search('iphone', ['iPhone 15', 'Galaxy S24', 'iphone 14'], { preset: 'search' })
 * // [{ item: 'iPhone 15', score: 96.67, index: 0, text: 'iPhone 15' }, ...]
 *
 * search('queen', songs, { keys: ['title', 'artist'], preset: 'search', limit: 10 })
 */
export function search<T>(query: string, items: readonly T[], ...args: ItemsArgs<T, ListOptions<T>>): Match<T>[] {
  const options = args[0] as ListOptions<T> | undefined;
  const engine = getEngine(options);
  return rank(
    query,
    buildEntries(items, options?.keys, engine),
    engine,
    engine.options.threshold,
    options?.limit ?? Infinity,
    options?.includeMatches,
  );
}

/**
 * Removes near-duplicates, keeping the first occurrence of each.
 *
 * @example
 * dedupe(['Hey Jude', 'hey jude - Remastered 2015', 'Let It Be'], { preset: 'music' })
 * // ['Hey Jude', 'Let It Be']
 */
export function dedupe<T>(items: readonly T[], ...args: ItemsArgs<T, GroupOptions<T>>): T[] {
  return group(items, ...args).map((g) => g[0]!);
}

/**
 * Groups near-duplicates together, in their original order.
 *
 * @example
 * group(['Jean Dupont', 'Dupont Jean', 'Marie Curie'])
 * // [['Jean Dupont', 'Dupont Jean'], ['Marie Curie']]
 */
export function group<T>(items: readonly T[], ...args: ItemsArgs<T, GroupOptions<T>>): T[][] {
  const options = args[0] as GroupOptions<T> | undefined;
  const engine = getEngine(options);
  return cluster(buildEntries(items, options?.keys, engine), engine, engine.options.threshold, options?.method, options?.everyKey === true);
}

/**
 * Replaces each value by the most common spelling among its near-duplicates,
 * the first one seen on a tie: a column of a spreadsheet cleaned in one call
 * ("cluster and merge"). Returns a new array of the same length.
 *
 * @example
 * standardize(['Paris', 'paris', 'Pariss', 'Lyon', 'Paris', 'lyon '])
 * // ['Paris', 'Paris', 'Paris', 'Lyon', 'Paris', 'Lyon']
 */
export function standardize(values: readonly string[], options?: GroupOptions<string>): string[] {
  const texts = Array.from(values ?? [], toText);
  const spelling = new Map<string, string>();
  for (const members of group(texts, options)) {
    const count = new Map<string, number>();
    for (const m of members) count.set(m, (count.get(m) ?? 0) + 1);
    let best = members[0]!;
    for (const m of members) if (count.get(m)! > count.get(best)!) best = m;
    for (const m of members) spelling.set(m, best);
  }
  return texts.map((t) => spelling.get(t) ?? t);
}

/**
 * A key that is the same for texts with the same words once normalized, in
 * any order, repeats ignored: `"Doe, John"` and `"john DOE"` both give
 * `"doe john"`. Group by it to dedupe huge lists instantly (no typos though),
 * or use `group(items, { method: 'fingerprint' })`.
 *
 * @example
 * fingerprint('The Beatles - Hey Jude (Remastered)', { preset: 'music' }) // 'beatles hey jude'
 */
export function fingerprint(text: string, options?: NormalizeOptions & Pick<MatchOptions, 'preset'>): string {
  const engine = getEngine(options);
  return fingerprintOf(engine.normalize(toText(text)));
}

function fingerprintOf(normalized: string): string {
  if (normalized === '') return '';
  return [...new Set(normalized.split(' '))].sort().join(' ');
}

/**
 * Fuzzy occurrences of `query` inside a longer text, with their positions in
 * the original text. Detects a title in a chat message, a name in a paragraph,
 * a product in a review...
 *
 * @example
 * find("je pense que c'est bohemian rapsody de queen", 'Bohemian Rhapsody')
 * // [{ text: 'bohemian rapsody', start: 19, end: 35, score: 94.12 }]
 */
export function find(text: string, query: string, options?: MatchOptions): Found[] {
  const engine = getEngine(options);
  return findIn(toText(text), toText(query), engine, engine.options.threshold);
}

/** An item of the list mentioned in the text, by {@link findAll}. */
export interface FoundItem<T> extends Found {
  /** The item mentioned. */
  item: T;
  /** Its position in the list. */
  index: number;
  /** The key whose text matched, for object items. */
  key?: string;
}

/**
 * Which items of a list are mentioned in a text, typos included, with where:
 * the products in a message, the cities in an address, the songs in a
 * transcript. Each part of the text goes to its best item; results come in
 * reading order. For objects, pass `keys`, aliases included
 * (`keys: ['name', 'aliases']`).
 *
 * @example
 * findAll('2 iphone 15 et un macbok air svp', ['iPhone 15', 'MacBook Air', 'iPad'])
 * // [{ item: 'iPhone 15', index: 0, text: 'iphone 15', start: 2, end: 11, score: 100 },
 * //  { item: 'MacBook Air', index: 1, text: 'macbok air', start: 18, end: 28, score: 90.91 }]
 */
export function findAll<T>(text: string, items: readonly T[], ...args: ItemsArgs<T, MatchOptions & { keys?: KeysOption<T> }>): FoundItem<T>[] {
  const options = args[0] as (MatchOptions & { keys?: KeysOption<T> }) | undefined;
  const engine = getEngine(options);
  const names: Name<{ entry: Entry<T>; at: number }>[] = [];
  for (const entry of buildEntries(items, options?.keys, engine)) {
    // The joined text of several keys is not a name of its own.
    const count = entry.joined ? entry.prepared.length - 1 : entry.prepared.length;
    for (let at = 0; at < count; at += 1) names.push({ prepared: entry.prepared[at]!, weight: entry.weights[at]!, ref: { entry, at } });
  }
  return findAllIn(toText(text), names, engine, engine.options.threshold).map(({ ref: { entry, at }, ...found }) => {
    const out: FoundItem<T> = { item: entry.item, index: entry.index, ...found };
    if (entry.keys[at] !== undefined) out.key = entry.keys[at];
    return out;
  });
}

/**
 * Splits `text` into pieces, marking those that match `query`: whole matches
 * and word prefixes, typos included. Join the pieces to get the text back.
 *
 * @example
 * highlight('Bohemian Rhapsody', 'bohem')
 * // [{ text: 'Bohem', match: true }, { text: 'ian Rhapsody', match: false }]
 *
 * // React
 * highlight(song.title, query).map((s, i) => (s.match ? <mark key={i}>{s.text}</mark> : s.text))
 */
export function highlight(text: string, query: string, options?: MatchOptions): Segment[] {
  const engine = getEngine(options);
  return highlightIn(toText(text), toText(query), engine, engine.options.threshold);
}
