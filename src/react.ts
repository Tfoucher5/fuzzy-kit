/**
 * React helpers: `import { useFuzzySearch, Highlight } from 'fuzzy-toolkit/react'`.
 * React 16.8+ is needed; it is not bundled.
 * @module
 */
import { createElement, Fragment, useMemo, type ReactElement, type ReactNode } from 'react';
import { createIndex } from './matcher.js';
import type { ListOptions, Match } from './types.js';

/** Options of {@link useFuzzySearch}. */
export type FuzzySearchOptions<T> = ListOptions<T> & {
  /**
   * What an empty query returns: every item (`all`, in order, score 100) or
   * nothing (`none`).
   * @default 'all'
   */
  whenEmpty?: 'all' | 'none';
};

function optionsKey(options: object | undefined): string {
  return JSON.stringify(options ?? {}, (_, value: unknown) =>
    typeof value === 'function' ? `fn:${String(value)}` : value,
  );
}

/**
 * Searches a list as the user types. The list is indexed once (again only
 * when `items` or the options change), and each result has `ranges` to pass
 * to {@link Highlight}. Defaults to the `search` preset.
 *
 * @example
 * const results = useFuzzySearch(songs, query, { keys: ['title', 'artist'], limit: 20 })
 * results.map((r) => <li key={r.index}><Highlight text={r.text} ranges={r.ranges} /></li>)
 */
export function useFuzzySearch<T>(
  items: readonly T[],
  query: string,
  ...args: T extends string ? [options?: FuzzySearchOptions<T>] : [options: FuzzySearchOptions<T> & { keys: unknown }]
): Match<T>[] {
  const options = (args[0] ?? {}) as FuzzySearchOptions<T>;
  const key = optionsKey(options);
  const { whenEmpty = 'all', limit, ...rest } = options;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const index = useMemo(() => createIndex(items, { preset: 'search', ...rest } as never), [items, key]);
  return useMemo(() => {
    if (query.trim() === '') {
      if (whenEmpty === 'none') return [];
      const all = index.items.map((item, i) => ({ item, score: 100, index: i, text: '', ranges: [] }) as Match<T>);
      return limit === undefined ? all : all.slice(0, Math.max(0, limit));
    }
    return index.search(query, { limit, includeMatches: true });
  }, [index, query, whenEmpty, limit]);
}

/** Props of {@link Highlight}. */
export interface HighlightProps {
  /** The text to show. */
  text: string;
  /** `[start, end]` parts to highlight, as in `Match.ranges`. */
  ranges?: readonly (readonly [number, number])[];
  /**
   * Element or component wrapping each highlighted part.
   * @default 'mark'
   */
  as?: string | ((props: { children: ReactNode }) => ReactElement | null);
}

/**
 * Renders `text` with its matching parts wrapped in `<mark>`.
 *
 * @example
 * <Highlight text={result.text} ranges={result.ranges} />
 */
export function Highlight({ text, ranges = [], as = 'mark' }: HighlightProps): ReactElement {
  const parts: ReactNode[] = [];
  let cursor = 0;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  for (const [start, end] of sorted) {
    const from = Math.max(start, cursor);
    if (end <= from) continue;
    if (from > cursor) parts.push(text.slice(cursor, from));
    parts.push(createElement(as as string, { key: from }, text.slice(from, end)));
    cursor = end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return createElement(Fragment, null, ...parts);
}
