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
  mapFields,
  repair,
  type FieldMapping,
  defineLanguage,
  definePreset,
  type Change,
  type Language,
  type PresetPack,
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

// Extensions
const es: Language = defineLanguage({ code: 'es', numbers: { units: ['cero', 'uno'], joiner: 'y' }, phonetic: [[/v/g, 'b']] });
const addresses: PresetPack = definePreset({ name: 'addresses', extends: 'strict', options: { replace: { bd: 'boulevard' }, languages: ['fr'] } });
definePreset({ name: 'x', extends: addresses, options: { stripPatterns: [/cedex/g] } });
similarity('a', 'b', { preset: addresses, languages: ['en', es], stopwords: true });
// @ts-expect-error built-in languages are typed
similarity('a', 'b', { languages: ['es'] });
// @ts-expect-error options cannot set a preset, use extends
definePreset({ name: 'x', options: { preset: 'music' } });
// @ts-expect-error phonetic rules are [RegExp, string]
defineLanguage({ code: 'es', phonetic: [['v', 'b']] });

// fuzzy-toolkit/fuse: the Fuse.js API, typed like it.
import Fuse, { type FuseResult } from '../src/compat/fuse.js';
const fuse = new Fuse([{ title: 'Dune', author: { name: 'Herbert' } }], {
  keys: ['title', ['author', 'name'], { name: 'author.name', weight: 2 }],
  includeScore: true,
  threshold: 0.4,
});
const found: FuseResult<{ title: string; author: { name: string } }>[] = fuse.search('dune', { limit: 3 });
const title: string | undefined = found[0]?.item.title;
void title;
// @ts-expect-error limit is a number
fuse.search('dune', { limit: '3' });

// Extended search, logical queries, getFn and sortFn.
const fullFuse = new Fuse([{ title: 'Dune', author: { name: 'Herbert' } }], {
  keys: ['title', { name: 'author', getFn: (book) => book.author.name }],
  useExtendedSearch: true,
  sortFn: (a, b) => a.score - b.score || a.idx - b.idx,
});
fullFuse.search("^du 'ne | =Dune");
fullFuse.search({ $and: [{ title: 'dune' }, { $path: ['author'], $val: 'herbert' }] });

// mapFields returns a mapping from one list's names to the other's.
const fields: FieldMapping = mapFields(['Zip'], ['postalCode'], { threshold: 70, synonyms: { sku: ['ref'] } });
const column: string | undefined = fields.mapping['Zip'];
const fieldScore: number = fields.matches[0]!.score;

// repair: a typed copy, the changes and what is left to fix.
const repaired = repair<{ email: string }>({ Email: 'a@b.c' }, { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] }, { threshold: 80 });
const repairedEmail: string = repaired.value.email;
const repairKind: 'key' | 'value' | 'type' | 'removed' | undefined = repaired.changes[0]?.kind;
const toAsk: string[] = repaired.unresolved.map((u) => u.path);

// findAll: items mentioned in a text.
import { findAll, type FoundItem } from '../src/index.js';
const mentioned: FoundItem<{ name: string }>[] = findAll('a trip to pariss', [{ name: 'Paris' }], { keys: ['name'] });
const mentionedName: string | undefined = mentioned[0]?.item.name;
const mentionedStrings = findAll('pariss', ['Paris']);
// @ts-expect-error objects need keys
findAll('pariss', [{ name: 'Paris' }]);

// Vue and Svelte helpers.
import { useFuzzySearch as useVueSearch, Highlight as VueHighlight } from '../src/vue.js';
import { fuzzySearch, segments } from '../src/svelte.js';
import { ref as vueRef } from 'vue';
const vueQuery = vueRef('');
const vueResults = useVueSearch([{ title: 'Dune' }], vueQuery, { keys: ['title'], limit: 5 });
const vueFirst: string | undefined = vueResults.value[0]?.item.title;
void VueHighlight;
const svelteResults = fuzzySearch(['Dune', 'Emma'], { subscribe: (run: (v: string) => void) => (run('dun'), () => {}) }, { limit: 3 });
const stopSvelte: () => void = svelteResults.subscribe((matches) => matches.map((m) => segments(m.text, m.ranges)));

// segments is also exported from the main entry point.
import { segments as cut } from '../src/index.js';
const cutParts: { text: string; match: boolean }[] = cut('Bohemian', [[0, 5]]);

// standardize: strings in, strings out.
import { standardize } from '../src/index.js';
const standard: string[] = standardize(['Paris', 'paris'], { threshold: 85 });

// Web Worker index.
import { createWorkerIndex } from '../src/worker.js';
import { serve } from '../src/worker-serve.js';
declare const someWorker: { postMessage(m: unknown): void; addEventListener(t: 'message', l: (e: { data: unknown }) => void): void };
const remoteIndex = createWorkerIndex(someWorker, [{ name: 'Paris' }], { keys: ['name'], preset: 'search' });
const remoteName: Promise<string | undefined> = remoteIndex.search('pari', { limit: 5 }).then((r) => r[0]?.item.name);
serve(someWorker);

// Dotted paths deeper than the checked depth are accepted: they work at runtime.
declare const deep: { a: { b: { c: { d: { e: string; n: number } } } } }[];
search('x', deep, { keys: ['a.b.c.d.e', 'a.b.c.d.e.f.g'] });
// @ts-expect-error the checked levels still reject unknown properties
search('x', deep, { keys: ['a.b.x.d.e'] });
