/**
 * Svelte helpers: `import { fuzzySearch, segments } from 'fuzzy-toolkit/svelte'`.
 * Works with Svelte 3, 4 and 5 through the store contract; nothing from
 * Svelte is imported.
 * @module
 */
import { createIndex } from './matcher.js';
import { segments } from './segments.js';
import type { Index } from './matcher.js';
import type { ListOptions, Match } from './types.js';

export { segments };

/** A Svelte store: anything with `subscribe`, such as `writable()`. */
export interface Readable<T> {
  subscribe(run: (value: T) => void): () => void;
}

/** Options of {@link fuzzySearch}. */
export type FuzzySearchOptions<T> = ListOptions<T> & {
  /**
   * What an empty query returns: every item (`all`, in order, score 100) or
   * nothing (`none`).
   * @default 'all'
   */
  whenEmpty?: 'all' | 'none';
};

function subscribe<V>(source: V | Readable<V>, run: (value: V) => void): () => void {
  if (source !== null && typeof source === 'object' && typeof (source as Readable<V>).subscribe === 'function') {
    const stop = (source as Readable<V>).subscribe(run) as unknown;
    // Some stores return { unsubscribe } (RxJS).
    return typeof stop === 'function' ? (stop as () => void) : () => (stop as { unsubscribe(): void }).unsubscribe();
  }
  run(source as V);
  return () => {};
}

/**
 * A store of the results for `query` in `items`, best first, each with
 * `ranges` to highlight. `items` and `query` can be stores or plain values;
 * the list is indexed again only when the items change. Defaults to the
 * `search` preset.
 *
 * @example
 * const query = writable('')
 * const results = fuzzySearch(songs, query, { keys: ['title', 'artist'], limit: 20 })
 * // {#each $results as r (r.index)}<li>{#each segments(r.text, r.ranges) as p}{#if p.match}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}</li>{/each}
 */
export function fuzzySearch<T>(
  items: readonly T[] | Readable<readonly T[]>,
  query: string | Readable<string>,
  options: FuzzySearchOptions<T> = {},
): Readable<Match<T>[]> {
  const { whenEmpty = 'all', limit, ...rest } = options;
  const listeners = new Set<(value: Match<T>[]) => void>();
  let stops: (() => void)[] = [];
  let index: Index<T> | null = null;
  let text = '';
  let current: Match<T>[] = [];

  const update = (): void => {
    if (!index) return;
    if (text.trim() === '') {
      const all = whenEmpty === 'none' ? [] : index.items.map((item, i) => ({ item, score: 100, index: i, text: '', ranges: [] }) as Match<T>);
      current = limit === undefined ? all : all.slice(0, Math.max(0, limit));
    } else {
      current = index.search(text, { limit, includeMatches: true });
    }
    for (const run of listeners) run(current);
  };

  return {
    subscribe(callback) {
      // Each subscription is its own entry, even with the same callback twice.
      const run = (value: Match<T>[]): void => callback(value);
      listeners.add(run);
      if (listeners.size === 1) {
        // The first subscriber starts listening to the inputs, like derived(): the
        // query first, so the items emit the first results once.
        stops = [
          subscribe(query, (value) => {
            text = value ?? '';
            update();
          }),
          subscribe(items, (list) => {
            index = createIndex(list, { preset: 'search', ...rest } as never);
            update();
          }),
        ];
      } else run(current);
      return () => {
        listeners.delete(run);
        if (listeners.size === 0) {
          for (const stop of stops) stop();
          stops = [];
          index = null;
        }
      };
    },
  };
}
