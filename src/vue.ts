/**
 * Vue helpers: `import { useFuzzySearch, Highlight } from 'fuzzy-toolkit/vue'`.
 * Vue 3.3+ is needed; it is not bundled.
 * @module
 */
import { computed, defineComponent, h, toValue, type ComputedRef, type MaybeRefOrGetter, type PropType } from 'vue';
import { createIndex } from './matcher.js';
import { segments } from './segments.js';
import type { ListOptions, Match } from './types.js';

export { segments };

/** Options of {@link useFuzzySearch}. */
export type FuzzySearchOptions<T> = ListOptions<T> & {
  /**
   * What an empty query returns: every item (`all`, in order, score 100) or
   * nothing (`none`).
   * @default 'all'
   */
  whenEmpty?: 'all' | 'none';
};

/**
 * Searches a list as the user types. Pass refs, getters or plain values: the
 * list is indexed again only when the items or the options change, and each
 * result has `ranges` for {@link Highlight}. Defaults to the `search` preset.
 *
 * @example
 * const query = ref('')
 * const results = useFuzzySearch(songs, query, { keys: ['title', 'artist'], limit: 20 })
 * // <li v-for="r in results" :key="r.index"><Highlight :text="r.text" :ranges="r.ranges" /></li>
 */
export function useFuzzySearch<T>(
  items: MaybeRefOrGetter<readonly T[]>,
  query: MaybeRefOrGetter<string>,
  options?: MaybeRefOrGetter<FuzzySearchOptions<T> | undefined>,
): ComputedRef<Match<T>[]> {
  const settings = computed(() => toValue(options) ?? {});
  const index = computed(() => {
    const { whenEmpty: _whenEmpty, limit: _limit, ...rest } = settings.value;
    return createIndex(toValue(items), { preset: 'search', ...rest } as never);
  });
  return computed(() => {
    const { whenEmpty = 'all', limit } = settings.value;
    const text = toValue(query) ?? '';
    if (text.trim() === '') {
      if (whenEmpty === 'none') return [];
      const all = index.value.items.map((item, i) => ({ item, score: 100, index: i, text: '', ranges: [] }) as Match<T>);
      return limit === undefined ? all : all.slice(0, Math.max(0, limit));
    }
    return index.value.search(text, { limit, includeMatches: true }) as Match<T>[];
  });
}

/**
 * Renders `text` with its matching parts wrapped in `<mark>` (or the tag in `as`).
 *
 * @example
 * <Highlight :text="result.text" :ranges="result.ranges" />
 */
export const Highlight = defineComponent({
  name: 'FuzzyHighlight',
  props: {
    text: { type: String, required: true },
    ranges: { type: Array as PropType<readonly (readonly [number, number])[]>, default: () => [] },
    as: { type: String, default: 'mark' },
  },
  setup(props) {
    return () => segments(props.text, props.ranges).map((part) => (part.match ? h(props.as, part.text) : part.text));
  },
});
