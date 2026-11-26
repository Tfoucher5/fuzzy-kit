// Type-level tests, checked by `npm run typecheck`. Never executed.
import {
  check,
  closest,
  createIndex,
  createMatcher,
  dedupe,
  search,
  similarity,
  diff,
  type Change,
  type CheckResult,
  type Match,
} from '../src/index.js';
import stringSimilarity, { findBestMatch } from '../src/compat/string-similarity.js';
const rating: number = stringSimilarity.compareTwoStrings('a', 'b') + findBestMatch('a', ['b']).bestMatch.rating;
export { rating };

interface Song {
  id: number;
  title: string;
  artist: string;
  aliases?: string[];
  year: number;
}
declare const songs: Song[];

// Strings need no options.
const s1: Match<string>[] = search('abc', ['abc']);
const s2: Match<string> | undefined = closest('abc', ['abc'], { limit: 1 });

// Objects require `keys`, and only text properties are accepted.
const s3: Match<Song>[] = search('queen', songs, { keys: ['title', 'artist', 'aliases'] });
search('queen', songs, { keys: 'title' });
search('queen', songs, { keys: (song) => [song.title, song.artist] });
// @ts-expect-error keys is required for objects
search('queen', songs);
// @ts-expect-error `year` is a number, not text
search('queen', songs, { keys: ['year'] });
// @ts-expect-error unknown property
search('queen', songs, { keys: ['album'] });

// Literal unions autocomplete and are checked.
similarity('a', 'b', { preset: 'music', algorithm: 'damerau', strip: ['featuring', 'version'] });
// @ts-expect-error unknown preset
similarity('a', 'b', { preset: 'musique' });
// @ts-expect-error unknown strip rule
similarity('a', 'b', { strip: ['feat'] });

const verdict: 'correct' | 'close' | 'wrong' = check('a', ['a', 'b']).verdict;
const result: CheckResult = createMatcher({ preset: 'music' }).check('a', 'b', { closeThreshold: 50 });

const matcher = createMatcher({ preset: 'search' });
const m1: Match<Song> | undefined = matcher.closest('x', songs, { keys: 'title' });
// @ts-expect-error keys is required for objects
matcher.search('x', songs);
const deduped: Song[] = dedupe(songs, { keys: 'title' });

const index = createIndex(songs, { keys: ['title', 'artist'], preset: 'search' });
const first: Song | undefined = index.closest('bohemian')?.item;

export { s1, s2, s3, verdict, result, m1, deduped, first };

// Weighted keys
search('queen', songs, { keys: ['title', { name: 'artist', weight: 0.8 }] });
// @ts-expect-error weighted key must name a text property
search('queen', songs, { keys: [{ name: 'year', weight: 1 }] });

// checkAll keeps the part names.
import { checkAll, join, type MultiCheckResult, type JoinRow } from '../src/index.js';
const parts: MultiCheckResult<'title' | 'artist'> = checkAll('x', { title: 'a', artist: ['b', 'c'] });
const missingTitle: boolean = parts.parts.title.correct;
// @ts-expect-error unknown part
parts.parts.album;

// join: keys required for object lists, checked against each side.
const j1: JoinRow<string, string>[] = join(['a'], ['b']);
const j2: JoinRow<Song, string>[] = join(songs, ['b'], { left: 'title' });
join(songs, songs, { left: 'title', right: 'artist', unique: true });
// @ts-expect-error left keys are required for objects
join(songs, ['b']);
// @ts-expect-error right keys are required for objects
join(['a'], songs, {});
// @ts-expect-error not a text property
join(songs, ['b'], { left: 'year' });
void [missingTitle, j1, j2];

// Indexes can change after creation, keeping the item type.
const songIndex = createIndex(songs, { keys: ['title', 'artist'] });
songIndex.add({ id: 9, title: 'Flowers', artist: 'Miley Cyrus', year: 2023 });
// @ts-expect-error the new item must be a Song
songIndex.add({ title: 'Flowers' });
const removed: number = songIndex.remove((song) => song.year < 1970);
songIndex.refresh((song) => song.id === 9);

// diff returns typed pieces; phonetic is an option.
const pieces: Change[] = diff('bohemian rapsody', 'Bohemian Rhapsody', { caseSensitive: false });
const kind: 'same' | 'added' | 'removed' = pieces[0]!.type;
similarity('fone', 'phone', { phonetic: true });

// Nested keys are dotted paths, checked against the data.
interface Track {
  title: string;
  artist: { name: string; country?: string; formed: number };
  tags: { label: string }[];
}
declare const tracks: Track[];
const nested: Match<Track>[] = search('queen', tracks, { keys: ['title', 'artist.name', 'tags.label'], includeMatches: true });
const ranges: [number, number][] | undefined = nested[0]?.ranges;
// @ts-expect-error `artist.formed` is a number
search('queen', tracks, { keys: ['artist.formed'] });
// @ts-expect-error unknown nested property
search('queen', tracks, { keys: ['artist.label'] });

export { nested, ranges };

// Saved indexes and React helpers.
import { loadIndex, type SavedIndex } from '../src/index.js';
import { useFuzzySearch, Highlight } from '../src/react.js';
const saved: SavedIndex = createIndex(songs, { keys: 'title' }).toJSON();
const reloaded: Song | undefined = loadIndex(songs, saved, { keys: 'title' }).closest('x')?.item;
// @ts-expect-error keys is required for objects
loadIndex(songs, saved);
declare const query: string;
const hits: Match<Song>[] = useFuzzySearch(songs, query, { keys: ['title'], limit: 5 });
const el = Highlight({ text: 'abc', ranges: [[0, 1]] });
export { reloaded, hits, el };
