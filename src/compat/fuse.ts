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
 */
import { createIndex, loadIndex, type Index, type SavedIndex } from '../matcher.js';
import { warnOnce } from '../warn.js';
import type { ListOptions, Match } from '../types.js';

/** A key to search: a property name, a path (`'author.name'` or `['author', 'name']`), or one with a weight. */
export type FuseOptionKey<T> = string | string[] | { name: string | string[]; weight?: number; getFn?: (obj: T) => unknown };

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
  // Accepted for compatibility, no effect: fuzzy-toolkit does not score by position.
  location?: number;
  distance?: number;
  ignoreLocation?: boolean;
  ignoreFieldNorm?: boolean;
  fieldNormWeight?: number;
  findAllMatches?: boolean;
  // Not supported: a warning is printed once.
  getFn?: unknown;
  sortFn?: unknown;
  useExtendedSearch?: boolean;
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

const IGNORED = ['getFn', 'sortFn', 'useExtendedSearch', 'useTokenSearch', 'tokenize', 'tokenMatch'] as const;

/** Defaults, like `Fuse.config`. */
const config = Object.freeze({
  isCaseSensitive: false,
  ignoreDiacritics: false,
  includeScore: false,
  includeMatches: false,
  minMatchCharLength: 1,
  shouldSort: true,
  keys: [] as FuseOptionKey<unknown>[],
});

function toListOptions<T>(options: IFuseOptions<T>): ListOptions<T> {
  for (const name of IGNORED) {
    if (options[name] !== undefined && options[name] !== false) {
      warnOnce(`fuzzy-toolkit/fuse: the Fuse option "${name}" is not supported and is ignored.`);
    }
  }
  const keys = (options.keys ?? []).map((key) => {
    if (typeof key === 'string' || Array.isArray(key)) return { name: pathOf(key), weight: 1 };
    if (key.getFn) warnOnce('fuzzy-toolkit/fuse: "getFn" on a key is not supported: the key is read by its name.');
    return { name: pathOf(key.name), weight: key.weight ?? 1 };
  });
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
  if (keys.length > 0) list.keys = keys.map((k) => ({ name: k.name, weight: k.weight / heaviest })) as unknown as ListOptions<T>['keys'];
  return list;
}

function pathOf(name: string | string[]): string {
  return Array.isArray(name) ? name.join('.') : name;
}

/** Fuse.js's `Fuse` class, searching with fuzzy-toolkit. */
export class Fuse<T> {
  static version = '7.0.0-fuzzy-toolkit';
  static config = config;

  /** Pre-builds an index to pass to the constructor (built with Fuse's default options). */
  static createIndex<T>(keys: FuseOptionKey<T>[], docs: readonly T[]): FuseIndex<T> {
    return wrap(createIndex(docs, toListOptions({ keys }) as never), docs);
  }

  /** Revives what `JSON.stringify(fuse.getIndex())` saved. */
  static parseIndex<T>(data: SavedIndex): FuseIndex<T> {
    return { docs: [], toJSON: () => data, size: () => data.texts.length };
  }

  readonly options: IFuseOptions<T>;
  private list: ListOptions<T>;
  private index: Index<T>;

  constructor(docs: readonly T[], options: IFuseOptions<T> = {}, index?: FuseIndex<T>) {
    this.options = { ...config, ...options } as IFuseOptions<T>;
    this.list = toListOptions(options);
    this.index = this.build(docs, index);
  }

  private build(docs: readonly T[], saved?: FuseIndex<T>): Index<T> {
    if (!Array.isArray(docs)) throw new TypeError('fuzzy-toolkit/fuse: the list must be an array.');
    if (saved) {
      // Built with other options or other items: rebuild rather than fail.
      try {
        return loadIndex(docs, saved.toJSON(), this.list as never);
      } catch {
        /* rebuilt below */
      }
    }
    return createIndex(docs, this.list as never);
  }

  /** Items matching `query`, best first. Logical queries (`{ $and: ... }`) are not supported. */
  search(query: string, options: FuseSearchOptions = {}): FuseResult<T>[] {
    if (typeof query !== 'string') {
      throw new TypeError('fuzzy-toolkit/fuse: only string queries are supported, not extended or logical ones.');
    }
    const { includeScore, includeMatches, shouldSort, minMatchCharLength = 1 } = this.options;
    const limit = options.limit !== undefined && options.limit > 0 ? options.limit : undefined;
    const matches = this.index.search(query, { limit, includeMatches: !!includeMatches });
    if (shouldSort === false) matches.sort((a, b) => a.index - b.index);
    return matches.map((m) => this.result(m, !!includeScore, !!includeMatches, minMatchCharLength));
  }

  private result(m: Match<T>, score: boolean, withMatches: boolean, minLength: number): FuseResult<T> {
    const out: FuseResult<T> = { item: m.item, refIndex: m.index };
    if (score) out.score = Math.round((1 - m.score / 100) * 10000) / 10000;
    if (withMatches) {
      const indices = (m.ranges ?? [])
        .filter(([start, end]) => end - start >= minLength)
        .map(([start, end]): [number, number] => [start, end - 1]);
      const match: FuseResultMatch = { indices, value: m.text };
      if (m.key !== undefined) match.key = m.key;
      out.matches = indices.length > 0 ? [match] : [];
    }
    return out;
  }

  /** Replaces the list. */
  setCollection(docs: readonly T[], index?: FuseIndex<T>): void {
    this.index = this.build(docs, index);
  }

  add(doc: T): void {
    this.index.add(doc);
  }

  /** Removes the items for which `predicate` returns `true`; returns them. */
  remove(predicate: (doc: T, idx: number) => boolean = () => false): T[] {
    const removed = this.index.items.filter((doc, i) => predicate(doc, i));
    this.index.remove(predicate);
    return removed;
  }

  /** Removes the item at `idx`; returns it. */
  removeAt(idx: number): T | undefined {
    const doc = this.index.items[idx];
    this.index.remove((_, i) => i === idx);
    return doc;
  }

  getIndex(): FuseIndex<T> {
    return wrap(this.index, this.index.items);
  }
}

function wrap<T>(index: Index<T>, docs: readonly T[]): FuseIndex<T> {
  return { docs, toJSON: () => index.toJSON(), size: () => index.size };
}

export default Fuse;
