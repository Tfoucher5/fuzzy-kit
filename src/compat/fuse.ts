/**
 * The Fuse.js API on top of fuzzy-toolkit: change the import, keep the code.
 *
 * ```js
 * import Fuse from 'fuzzy-toolkit/fuse' // was: import Fuse from 'fuse.js'
 * const fuse = new Fuse(books, { keys: ['title', 'author.name'], includeScore: true })
 * fuse.search('jon', { limit: 5 }) // [{ item, refIndex, score }]
 * ```
 *
 * Results are fuzzy-toolkit's, not Fuse's: more typos found, faster, ranked
 * differently. `score` keeps Fuse's direction (0 is a perfect match, 1 none).
 * Extended search (`useExtendedSearch`), logical queries, `getFn` and
 * `sortFn` work as in Fuse.
 */
import { createIndex, loadIndex, type Index, type SavedIndex } from '../matcher.js';
import { warnOnce } from '../warn.js';
import type { ListOptions, Match } from '../types.js';

/** A key to search: a property name, a path (`'author.name'` or `['author', 'name']`), or one with a weight. */
export type FuseOptionKey<T> = string | string[] | { name: string | string[]; weight?: number; getFn?: (obj: T) => unknown };

/** What `sortFn` compares, like Fuse. */
export interface FuseSortFunctionArg<T> {
  idx: number;
  item: T;
  /** 0 is a perfect match, 1 none. */
  score: number;
  matches?: ReadonlyArray<FuseResultMatch>;
}

/** The options of Fuse.js. Those without an equivalent are ignored, with a warning. */
export interface IFuseOptions<T> {
  /** Where to read the text of object items. */
  keys?: FuseOptionKey<T>[];
  /**
   * 0 accepts only exact matches, 1 anything. Maps to fuzzy-toolkit's
   * threshold as `100 * (1 - threshold)`. When omitted, fuzzy-toolkit's search
   * default applies (70, like `threshold: 0.3`): Fuse's 0.6 lets a lot of noise in.
   */
  threshold?: number;
  /** Add `score` to each result (0 is a perfect match). @default false */
  includeScore?: boolean;
  /** Add `matches`, the parts of the text that matched. @default false */
  includeMatches?: boolean;
  /** Only report matched parts at least this long. @default 1 */
  minMatchCharLength?: number;
  /** Best results first; `false` keeps the order of the list. @default true */
  shouldSort?: boolean;
  /** @default false */
  isCaseSensitive?: boolean;
  /** Ignore accents (`é` = `e`). Fuse's default is `false`, kept here. @default false */
  ignoreDiacritics?: boolean;
  /**
   * Search syntax: `=exact`, `'include`, `^prefix`, `suffix$`, `!exclude`,
   * `!^not-prefix`, `!not-suffix$`, spaces for AND, `|` for OR; other words
   * are fuzzy. @default false
   */
  useExtendedSearch?: boolean;
  /** Reads the value at a key's path: `(obj, path) => string | string[]`. */
  getFn?: (obj: T, path: string[]) => unknown;
  /** Orders the results, like `Array.prototype.sort`. */
  sortFn?: (a: FuseSortFunctionArg<T>, b: FuseSortFunctionArg<T>) => number;
  // Accepted for compatibility, no effect: fuzzy-toolkit does not score by position.
  location?: number;
  distance?: number;
  ignoreLocation?: boolean;
  ignoreFieldNorm?: boolean;
  fieldNormWeight?: number;
  findAllMatches?: boolean;
  // Not supported: a warning is printed once.
  useTokenSearch?: boolean;
  tokenize?: unknown;
  tokenMatch?: unknown;
}

export interface FuseSearchOptions {
  /** Maximum number of results. */
  limit?: number;
}

export interface FuseResultMatch {
  /** Matched parts of `value`, as `[start, end]` with `end` included, like Fuse. */
  indices: ReadonlyArray<[number, number]>;
  key?: string;
  refIndex?: number;
  value?: string;
}

export interface FuseResult<T> {
  item: T;
  /** Position of the item in the list. */
  refIndex: number;
  /** With `includeScore`: 0 is a perfect match, 1 none. */
  score?: number;
  /** With `includeMatches`. */
  matches?: ReadonlyArray<FuseResultMatch>;
}

/** What `getIndex()` returns: serialize it with `JSON.stringify`, revive it with `Fuse.parseIndex`. */
export interface FuseIndex<T> {
  readonly docs: readonly T[];
  toJSON(): SavedIndex;
  size(): number;
}

/** A logical query: `{ $and: [...] }`, `{ $or: [...] }`, `{ key: 'pattern' }` or `{ $path, $val }`. */
export type Expression =
  | { $and: Expression[] }
  | { $or: Expression[] }
  | { $path: string | string[]; $val: string }
  | { [key: string]: string };

const IGNORED = ['useTokenSearch', 'tokenize', 'tokenMatch'] as const;

/** Defaults, like `Fuse.config`. */
const config = Object.freeze({
  isCaseSensitive: false,
  ignoreDiacritics: false,
  includeScore: false,
  includeMatches: false,
  minMatchCharLength: 1,
  shouldSort: true,
  useExtendedSearch: false,
  keys: [] as FuseOptionKey<unknown>[],
});

interface Key<T> {
  /** The path joined with dots: Fuse's key id, reported in `matches`. */
  id: string;
  path: string[];
  weight: number;
  getFn?: (obj: T) => unknown;
}

function keysOf<T>(options: IFuseOptions<T>): Key<T>[] {
  return (options.keys ?? []).map((key) => {
    if (typeof key === 'string' || Array.isArray(key)) return { id: pathOf(key), path: pathArray(key), weight: 1 };
    return { id: pathOf(key.name), path: pathArray(key.name), weight: key.weight ?? 1, getFn: key.getFn };
  });
}

/**
 * fuzzy-toolkit's options. With a `getFn`, items are indexed through their
 * values (`k0`, `k1`... in the order of the keys) instead of their paths.
 */
function toListOptions<T>(options: IFuseOptions<T>, keys: Key<T>[], derived: boolean): ListOptions<T> {
  for (const name of IGNORED) {
    if (options[name] !== undefined && options[name] !== false) {
      warnOnce(`fuzzy-toolkit/fuse: the Fuse option "${name}" is not supported and is ignored.`);
    }
  }
  // Fuse weights are relative: the heaviest key scores in full, the others less.
  const heaviest = Math.max(1e-9, ...keys.map((k) => k.weight));
  const list: ListOptions<T> = {
    preset: 'search',
    substring: true,
    caseSensitive: options.isCaseSensitive ?? false,
    accentSensitive: !(options.ignoreDiacritics ?? false),
  };
  if (options.threshold !== undefined) list.threshold = Math.round(100 * (1 - options.threshold) * 100) / 100;
  // Paths are checked by Fuse's own types, not ours.
  if (keys.length > 0) {
    list.keys = keys.map((k, i) => ({ name: derived ? `k${i}` : k.id, weight: k.weight / heaviest })) as unknown as ListOptions<T>['keys'];
  }
  return list;
}

function pathOf(name: string | string[]): string {
  return Array.isArray(name) ? name.join('.') : name;
}

function pathArray(name: string | string[]): string[] {
  return Array.isArray(name) ? name : name.split('.');
}

/** Fuse's default `getFn`: the strings at a path, through arrays. */
function fuseGet(obj: unknown, path: readonly string[]): string[] {
  const out: string[] = [];
  const walk = (value: unknown, i: number): void => {
    if (value == null) return;
    if (Array.isArray(value)) for (const v of value) walk(v, i);
    else if (i === path.length) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') out.push(String(value));
    } else walk((value as Record<string, unknown>)[path[i]!], i + 1);
  };
  walk(obj, 0);
  return out;
}

function strings(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(strings);
  return [String(value)];
}

type Kind = 'fuzzy' | 'exact' | 'include' | 'prefix' | 'suffix';

interface Token {
  kind: Kind;
  inverse: boolean;
  text: string;
}

/** Splits on spaces outside double quotes, like Fuse. */
const SPACES = / +(?=(?:[^"]*"[^"]*")*[^"]*$)/;

/** `=exact`, `'include`, `^prefix`, `suffix$`, `!not`, `!^not-prefix`, `!not-suffix$`, or fuzzy. */
function tokenOf(raw: string): Token {
  let text = raw;
  const inverse = text.length > 1 && text.startsWith('!');
  if (inverse) text = text.slice(1);
  let kind: Kind = inverse ? 'include' : 'fuzzy';
  if (!inverse && text.length > 1 && text.startsWith('=')) (kind = 'exact'), (text = text.slice(1));
  else if (!inverse && text.length > 1 && text.startsWith("'")) (kind = 'include'), (text = text.slice(1));
  else if (text.length > 1 && text.startsWith('^')) (kind = 'prefix'), (text = text.slice(1));
  else if (text.length > 1 && text.endsWith('$')) (kind = 'suffix'), (text = text.slice(0, -1));
  if (text.length > 1 && text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
  return { kind, inverse, text };
}

/** OR groups of AND tokens. */
function parse(query: string): Token[][] {
  return query
    .split('|')
    .map((group) => group.trim().split(SPACES).filter(Boolean).map(tokenOf))
    .filter((group) => group.length > 0);
}

/** Where a token's text sits in a value, or -1. */
function position(kind: Kind, value: string, text: string): number {
  switch (kind) {
    case 'exact':
      return value === text ? 0 : -1;
    case 'prefix':
      return value.startsWith(text) ? 0 : -1;
    case 'suffix':
      return value.endsWith(text) ? value.length - text.length : -1;
    default:
      return value.indexOf(text);
  }
}

interface Hit {
  /** 0 to 100. */
  score: number;
  matches: FuseResultMatch[];
}

/** Items in every map, their scores averaged. */
function every(maps: Map<number, Hit>[]): Map<number, Hit> {
  const out = new Map<number, Hit>();
  if (maps.length === 0) return out;
  for (const [i, first] of maps[0]!) {
    let score = first.score;
    const matches = [...first.matches];
    let all = true;
    for (let k = 1; k < maps.length && all; k += 1) {
      const hit = maps[k]!.get(i);
      if (!hit) all = false;
      else (score += hit.score), matches.push(...hit.matches);
    }
    if (all) out.set(i, { score: score / maps.length, matches });
  }
  return out;
}

/** Items in any map, with their best score. */
function some(maps: Map<number, Hit>[]): Map<number, Hit> {
  const out = new Map<number, Hit>();
  for (const map of maps) {
    for (const [i, hit] of map) {
      const known = out.get(i);
      if (!known || hit.score > known.score) out.set(i, hit);
    }
  }
  return out;
}

/** Fuse.js's `Fuse` class, searching with fuzzy-toolkit. */
export class Fuse<T> {
  static version = '7.0.0-fuzzy-toolkit';
  static config = config;

  /** Pre-builds an index to pass to the constructor (built with Fuse's default options). */
  static createIndex<T>(keys: FuseOptionKey<T>[], docs: readonly T[]): FuseIndex<T> {
    return new Fuse(docs, { keys }).getIndex();
  }

  /** Revives what `JSON.stringify(fuse.getIndex())` saved. */
  static parseIndex<T>(data: SavedIndex): FuseIndex<T> {
    return { docs: [], toJSON: () => data, size: () => data.texts.length };
  }

  readonly options: IFuseOptions<T>;
  private keys: Key<T>[];
  private derived: boolean;
  private list: ListOptions<T>;
  private docs: T[] = [];
  private index!: Index<unknown>;
  private byKey = new Map<number, Index<unknown>>();

  constructor(docs: readonly T[], options: IFuseOptions<T> = {}, index?: FuseIndex<T>) {
    this.options = { ...config, ...options } as IFuseOptions<T>;
    this.keys = keysOf(options);
    this.derived = this.keys.length > 0 && (typeof options.getFn === 'function' || this.keys.some((k) => k.getFn));
    this.list = toListOptions(options, this.keys, this.derived);
    this.setCollection(docs, index);
  }

  /** The strings of one key of an item, as Fuse reads them. */
  private valuesOf(doc: T, key: Key<T>): string[] {
    if (key.getFn) return strings(key.getFn(doc));
    if (this.options.getFn) return strings(this.options.getFn(doc, key.path));
    return fuseGet(doc, key.path);
  }

  /** What is indexed for an item: itself, or its values with a `getFn`. */
  private indexed(doc: T): unknown {
    if (!this.derived) return doc;
    const record: Record<string, string[]> = {};
    this.keys.forEach((key, i) => (record[`k${i}`] = this.valuesOf(doc, key)));
    return record;
  }

  /** Items matching `query`, best first. A query object is a logical query (`{ $and: [...] }`). */
  search(query: string | Expression, options: FuseSearchOptions = {}): FuseResult<T>[] {
    const { includeScore, includeMatches, shouldSort, useExtendedSearch, sortFn } = this.options;
    const limit = options.limit !== undefined && options.limit > 0 ? options.limit : undefined;
    const withMatches = !!includeMatches;
    let hits: [number, Hit][];
    if (typeof query === 'string' && !useExtendedSearch) {
      // Plain search: fuzzy-toolkit's ranking, limited while searching.
      const matches = this.index.search(query, { limit: sortFn ? undefined : limit, includeMatches: withMatches });
      hits = matches.map((m) => [m.index, { score: m.score, matches: this.matchesOf(m) }]);
    } else {
      if (typeof query !== 'string' && (query === null || typeof query !== 'object')) {
        throw new TypeError('fuzzy-toolkit/fuse: the query must be a string or a logical query object.');
      }
      const found = typeof query === 'string' ? this.extended(query) : this.logical(query);
      hits = [...found].sort((x, y) => y[1].score - x[1].score || x[0] - y[0]);
    }
    if (shouldSort === false) hits.sort((x, y) => x[0] - y[0]);
    else if (sortFn) {
      const arg = ([idx, hit]: [number, Hit]): FuseSortFunctionArg<T> => ({ idx, item: this.docs[idx]!, score: fuseScore(hit.score), matches: hit.matches });
      hits.sort((x, y) => sortFn(arg(x), arg(y)));
    }
    if (limit !== undefined) hits = hits.slice(0, limit);
    return hits.map(([refIndex, hit]) => {
      const out: FuseResult<T> = { item: this.docs[refIndex]!, refIndex };
      if (includeScore) out.score = fuseScore(hit.score);
      if (withMatches) out.matches = hit.matches;
      return out;
    });
  }

  private matchesOf(m: Match<unknown>): FuseResultMatch[] {
    if (!this.options.includeMatches) return [];
    const minLength = this.options.minMatchCharLength ?? 1;
    const indices = (m.ranges ?? [])
      .filter(([start, end]) => end - start >= minLength)
      .map(([start, end]): [number, number] => [start, end - 1]);
    if (indices.length === 0) return [];
    const match: FuseResultMatch = { indices, value: m.text };
    const key = this.derived && m.key !== undefined ? this.keys[Number(m.key.slice(1))]?.id : m.key;
    if (key !== undefined) match.key = key;
    return [match];
  }

  /** Extended search over every key, or over one (`keyAt`). */
  private extended(query: string, keyAt?: number): Map<number, Hit> {
    return some(parse(query).map((group) => every(group.map((token) => this.token(token, keyAt)))));
  }

  private token(token: Token, keyAt?: number): Map<number, Hit> {
    if (token.kind === 'fuzzy') return this.fuzzy(token.text, keyAt);
    const fold = (text: string): string => {
      let out = this.options.isCaseSensitive ? text : text.toLowerCase();
      if (this.options.ignoreDiacritics) out = out.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return out;
    };
    const wanted = fold(token.text);
    const keys = keyAt === undefined ? this.keys : [this.keys[keyAt]!];
    const out = new Map<number, Hit>();
    this.docs.forEach((doc, i) => {
      const values: [string | undefined, string][] =
        keys.length === 0 ? [[undefined, String(doc)]] : keys.flatMap((k) => this.valuesOf(doc, k).map((v): [string, string] => [k.id, v]));
      const found: FuseResultMatch[] = [];
      for (const [key, value] of values) {
        const folded = fold(value);
        const at = position(token.kind, folded, wanted);
        if (at < 0) continue;
        // Positions hold when folding kept the length.
        const match: FuseResultMatch = folded.length === value.length && wanted.length > 0 ? { indices: [[at, at + wanted.length - 1]], value } : { indices: [], value };
        if (key !== undefined) match.key = key;
        found.push(match);
      }
      if (token.inverse ? found.length === 0 : found.length > 0) {
        out.set(i, { score: 100, matches: token.inverse || !this.options.includeMatches ? [] : found });
      }
    });
    return out;
  }

  private fuzzy(text: string, keyAt?: number): Map<number, Hit> {
    let index = this.index;
    if (keyAt !== undefined) {
      index = this.byKey.get(keyAt)!;
      if (!index) {
        const name = this.derived ? `k${keyAt}` : this.keys[keyAt]!.id;
        index = createIndex(this.docs.map((doc) => this.indexed(doc)), { ...this.list, keys: [name] } as never);
        this.byKey.set(keyAt, index);
      }
    }
    const out = new Map<number, Hit>();
    for (const m of index.search(text, { includeMatches: !!this.options.includeMatches })) {
      out.set(m.index, { score: m.score, matches: this.matchesOf(m) });
    }
    return out;
  }

  private logical(expression: Expression): Map<number, Hit> {
    if (expression === null || typeof expression !== 'object') {
      throw new TypeError('fuzzy-toolkit/fuse: a logical query is made of objects, such as { $and: [{ title: "old" }] }.');
    }
    const record = expression as Record<string, unknown>;
    if (Array.isArray(record.$and)) return every(record.$and.map((e: Expression) => this.logical(e)));
    if (Array.isArray(record.$or)) return some(record.$or.map((e: Expression) => this.logical(e)));
    if (record.$path !== undefined) return this.leaf(pathOf(record.$path as string | string[]), record.$val);
    return every(Object.entries(record).map(([id, pattern]) => this.leaf(id, pattern)));
  }

  private leaf(id: string, pattern: unknown): Map<number, Hit> {
    const at = this.keys.findIndex((k) => k.id === id);
    if (at < 0) throw new TypeError(`fuzzy-toolkit/fuse: "${id}" is not one of the keys: ${this.keys.map((k) => k.id).join(', ')}.`);
    if (typeof pattern !== 'string') throw new TypeError(`fuzzy-toolkit/fuse: the pattern for "${id}" must be a string.`);
    return this.options.useExtendedSearch ? this.extended(pattern, at) : this.fuzzy(pattern, at);
  }

  /** Replaces the list. */
  setCollection(docs: readonly T[], saved?: FuseIndex<T>): void {
    if (!Array.isArray(docs)) throw new TypeError('fuzzy-toolkit/fuse: the list must be an array.');
    this.docs = [...docs];
    this.byKey.clear();
    const items = this.docs.map((doc) => this.indexed(doc));
    if (saved) {
      // Built with other options or other items: rebuild rather than fail.
      try {
        this.index = loadIndex(items, saved.toJSON(), this.list as never);
        return;
      } catch {
        /* rebuilt below */
      }
    }
    this.index = createIndex(items, this.list as never);
  }

  add(doc: T): void {
    this.docs.push(doc);
    this.index.add(this.indexed(doc));
    this.byKey.clear();
  }

  /** Removes the items for which `predicate` returns `true`; returns them. */
  remove(predicate: (doc: T, idx: number) => boolean = () => false): T[] {
    const gone = new Set<number>();
    this.docs.forEach((doc, i) => predicate(doc, i) && gone.add(i));
    return this.drop(gone);
  }

  /** Removes the item at `idx`; returns it. */
  removeAt(idx: number): T | undefined {
    return this.drop(new Set(idx >= 0 && idx < this.docs.length ? [idx] : []))[0];
  }

  private drop(gone: Set<number>): T[] {
    if (gone.size === 0) return [];
    const removed = this.docs.filter((_, i) => gone.has(i));
    this.index.remove((_: unknown, i: number) => gone.has(i));
    this.docs = this.docs.filter((_, i) => !gone.has(i));
    this.byKey.clear();
    return removed;
  }

  getIndex(): FuseIndex<T> {
    const { index } = this;
    return { docs: this.docs, toJSON: () => index.toJSON(), size: () => index.size };
  }
}

function fuseScore(score: number): number {
  return Math.round((1 - score / 100) * 10000) / 10000;
}

export default Fuse;
