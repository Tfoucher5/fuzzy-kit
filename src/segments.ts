import type { Segment } from './text.js';

/**
 * `text` cut into parts to show, with the `[start, end]` ranges of a match
 * (`Match.ranges`) marked: render each part, wrapping those with `match`.
 *
 * @example
 * segments('Bohemian Rhapsody', [[0, 5]]) // [{ text: 'Bohem', match: true }, { text: 'ian Rhapsody', match: false }]
 */
export function segments(text: string, ranges: readonly (readonly [number, number])[] = []): Segment[] {
  const parts: Segment[] = [];
  let cursor = 0;
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const from = Math.max(start, cursor);
    const to = Math.min(end, text.length);
    if (to <= from) continue;
    if (from > cursor) parts.push({ text: text.slice(cursor, from), match: false });
    parts.push({ text: text.slice(from, to), match: true });
    cursor = to;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}
