# API reference

All functions are named exports of `fuzzy-toolkit`. Options are described in [Options](/guide/options).

## similarity

```ts
similarity(a: string, b: string, options?: MatchOptions): number
```

Score from 0 to 100.

## isMatch

```ts
isMatch(a: string, b: string, thresholdOrOptions?: number | MatchOptions): boolean
```

`true` when `similarity(a, b) >= threshold`. A number is a shortcut for `{ threshold }`.

## compare

```ts
compare(a: string, b: string, options?: MatchOptions): Comparison
```

```ts
interface Comparison {
  score: number
  match: boolean
  threshold: number
  algorithm: Algorithm
  a: string // normalized
  b: string // normalized
  scores: { characters?: number; wordOrder?: number; spaces?: number; partial?: number; ... }
}
```

## check

```ts
check(guess: string, answers: string | readonly string[], options?: CheckOptions): CheckResult
```

```ts
interface CheckResult {
  verdict: 'correct' | 'close' | 'wrong'
  correct: boolean
  close: boolean
  score: number
  answer: string | undefined // the closest accepted answer
}
```

`CheckOptions` adds `closeThreshold` (default `threshold - 15`). See [Quizzes](/recipes/quiz).

## checkAll

```ts
checkAll<K extends string>(guess: string, answers: Record<K, string | readonly string[]>, options?: CheckOptions): MultiCheckResult<K>
```

Finds each part of the answer anywhere in the guess, typos included.

```ts
checkAll('bohemian rapsody de queen', { title: 'Bohemian Rhapsody', artist: 'Queen' })
// { correct: true, found: ['title', 'artist'], missing: [], parts: { title: CheckResult, artist: CheckResult } }
```

`correct` is true when every part is found. See [Quizzes](/recipes/quiz#title-and-artist-in-one-guess).

## join

```ts
join<L, R>(left: readonly L[], right: readonly R[], options?: JoinOptions<L, R>): JoinRow<L, R>[]
```

One row per left item, in order: `{ item, index, match }`, where `match` is the best right item as a `Match<R>`, or `undefined`. Options: `left` and `right` say where the text is (required for objects), `unique: true` uses each right item at most once. See [Cleaning data](/recipes/data-cleaning#match-two-lists).

## closest

```ts
closest<T>(query: string, items: readonly T[], options?: ListOptions<T>): Match<T> | undefined
```

## search

```ts
search<T>(query: string, items: readonly T[], options?: ListOptions<T>): Match<T>[]
```

Items reaching the threshold, best first; ties keep the original order.

```ts
interface Match<T> {
  item: T       // the original item
  score: number
  index: number // position in the original list
  text: string  // the text that produced the score
}
```

`ListOptions<T>` adds:

- `limit`: maximum number of results (default `Infinity`).
- `keys`: where the text of an object is. A property name, an array of names, or `(item) => string | string[]`. Required when items are not strings; only properties holding text are accepted. A name can carry a weight: `['title', { name: 'artist', weight: 0.8 }]` makes artist matches score 80 % of their value. Nested properties are dotted paths (`'artist.name'`); arrays along the path are read item by item (`'tags.label'` on `{ tags: [{ label: 'rock' }] }`).
- `includeMatches`: adds `key` (the property that matched, when `keys` names properties) and `ranges` (the parts of `text` matching the query, as `[start, end]`) to each result.

```ts
search('zeppelin', songs, { keys: ['title', 'artist.name'], partial: true, includeMatches: true })[0]
// { item, score: 80.36, index: 1, text: 'Led Zeppelin', key: 'artist.name', ranges: [[4, 12]] }
```

## find

```ts
find(text: string, query: string, options?: MatchOptions): Found[]
```

Fuzzy occurrences of `query` inside a longer text, in reading order, with positions in the original text.

```ts
interface Found {
  text: string  // as written in the original text
  start: number
  end: number   // text === original.slice(start, end)
  score: number
}

find("je crois que c'est bohemian rapsody", 'Bohemian Rhapsody')
// [{ text: 'bohemian rapsody', start: 19, end: 35, score: 94.12 }]
```

## highlight

```ts
highlight(text: string, query: string, options?: MatchOptions): Segment[]
```

Splits `text` into `{ text, match }` pieces. Whole matches and word prefixes are marked, typos included. Joining the pieces gives the original text back.

```ts
highlight('Stairway to Heaven - Led Zeppelin', 'zep stair')
// [{ text: 'Stair', match: true }, { text: 'way to Heaven - Led ', match: false },
//  { text: 'Zep', match: true }, { text: 'pelin', match: false }]
```

## dedupe / group

```ts
dedupe<T>(items: readonly T[], options?: GroupOptions<T>): T[]
group<T>(items: readonly T[], options?: GroupOptions<T>): T[][]
```

## mapFields

::: tip New in 2.8.0
Not on npm yet: it comes with the next release.
:::

```ts
mapFields(from: readonly string[], to: readonly string[], options?: MapFieldsOptions): FieldMapping
// MapFieldsOptions: { threshold?: number (default 70); synonyms?: Record<string, string[]> }
// FieldMapping: { mapping: Record<string, string>; matches: { from, to, score }[]; unmatched: string[]; missing: string[] }
```

Pairs field names with the fields of a schema, each at most once, best scores first: CSV headers with your columns, a form with your model, the keys an AI or an API returned with the ones you expect. It reads camelCase, snake_case, kebab-case and `#` (number), and knows common synonyms in English, French and Spanish: zip and postal code, dob and date of birth, qty and quantity, tel and phone, prénom and first name...

```ts
mapFields(['First Name', 'E-mail', 'Zip', 'Phone #', 'DOB'], ['firstName', 'email', 'postalCode', 'phoneNumber', 'dateOfBirth']).mapping
// { 'First Name': 'firstName', 'E-mail': 'email', Zip: 'postalCode', 'Phone #': 'phoneNumber', DOB: 'dateOfBirth' }

// Rename the keys of a row (or of an AI's JSON output) to your schema
const { mapping, unmatched, missing } = mapFields(Object.keys(row), ['sku', 'name', 'price'], { synonyms: { sku: ['ref', 'item code'] } })
const clean = Object.fromEntries(Object.entries(row).flatMap(([k, v]) => (k in mapping ? [[mapping[k], v]] : [])))
```

## repair

::: tip New in 2.8.0
Not on npm yet: it comes with the next release.
:::

```ts
repair<T>(value: unknown, schema: JsonSchema, options?: RepairOptions): RepairResult<T>
// RepairOptions: { threshold?: number (enum values, default 70); keyThreshold?: number (property names, default 70); synonyms? }
// RepairResult: { value: T; changes: { path, kind: 'key' | 'value' | 'type' | 'removed', from, to }[]; unresolved: { path, reason }[] }
```

Repairs a value against the JSON Schema it should follow, typically what a model returned: property names matched to the schema's (with [`mapFields`](#mapfields)), enum values corrected, numbers and booleans written as text converted, a single item wrapped in an array, and properties removed where `additionalProperties` is `false`. It reads `type`, `properties`, `required`, `additionalProperties`, `items` and `enum`, at any depth. The input is never changed: you get a repaired copy, what was changed, and what could not be repaired, to ask the model again only when needed.

```ts
const schema = {
  type: 'object',
  properties: { email: { type: 'string' }, priority: { enum: ['low', 'medium', 'high'] }, age: { type: 'integer' } },
  required: ['email', 'title'],
}
const { value, changes, unresolved } = repair({ 'Email Address': 'ada@x.io', Priority: 'hight', age: '36' }, schema)
// value      { email: 'ada@x.io', priority: 'high', age: 36 }
// changes    [{ path: 'Email Address', kind: 'key', from: 'Email Address', to: 'email' }, ...]
// unresolved [{ path: 'title', reason: 'required, missing' }]
```

## diff

```ts
diff(from: string, to: string, options?: { caseSensitive?: boolean; accentSensitive?: boolean }): Change[]
// Change: { text: string; type: 'same' | 'added' | 'removed' }
```

Character by character, what turns `from` into `to`. Case and accents are ignored by default, and `same` pieces are written as in `to`. Ideal to show a player what they misspelled.

```ts
diff('bohemian rapsody', 'Bohemian Rhapsody')
// [{ text: 'Bohemian R', type: 'same' }, { text: 'h', type: 'added' }, { text: 'apsody', type: 'same' }]

diff('beyonsay', 'Beyoncé')
// [{ text: 'Beyon', type: 'same' }, { text: 'say', type: 'removed' }, { text: 'cé', type: 'added' }]
```

## normalize

```ts
normalize(text: string, options?: NormalizeOptions): string
```

```ts
normalize('  Saint-Étienne !! ')                              // 'saint etienne'
normalize('Hey Jude - Remastered 2015', { strip: ['version'] }) // 'hey jude'
```

## createMatcher

```ts
createMatcher(options?: MatchOptions): Matcher
```

A matcher has `similarity`, `isMatch`, `compare`, `check`, `closest`, `search`, `find`, `highlight`, `dedupe`, `group`, `normalize` and `index`, all using its options. List methods accept `keys`, `limit` and `threshold` per call; `check` accepts `threshold` and `closeThreshold`. `matcher.options` holds the resolved options (read-only).

## createIndex

```ts
createIndex<T>(items: readonly T[], options?: ListOptions<T>): Index<T>
```

```ts
interface Index<T> {
  readonly size: number
  readonly items: readonly T[]
  search(query: string, options?: { limit?: number; threshold?: number }): Match<T>[]
  closest(query: string, options?: { threshold?: number }): Match<T> | undefined
  add(...items: T[]): void
  remove(itemOrPredicate: T | ((item: T, index: number) => boolean)): number
  refresh(predicate: (item: T, index: number) => boolean): number
}
```

The index keeps its own list: your array is never modified. When your data changes, update the index instead of rebuilding it; only the changed items are processed.

```ts
const index = createIndex(songs, { keys: ['title', 'artist'], preset: 'search' })

index.add({ id: 99, title: 'Flowers', artist: 'Miley Cyrus' }) // one or several items
index.remove((song) => song.id === 42)                         // returns how many were removed
song.title = 'Bohemian Rhapsody (Live)'
index.refresh((s) => s === song)                               // re-read items changed in place
```

`Match.index` is the position in `index.items`, which follows these changes.

## loadIndex

```ts
loadIndex<T>(items: readonly T[], saved: SavedIndex, options?: ListOptions<T>): Index<T>
```

`JSON.stringify(index)` (or `index.toJSON()`) saves the normalized texts and the options. `loadIndex()` rebuilds the index from it without normalizing again, about 2.5 times faster. Pass the same items in the same order and the same options; otherwise it throws.

```ts
// build step
writeFileSync('cities.index.json', JSON.stringify(createIndex(cities, { preset: 'search' })))
// app
const index = loadIndex(cities, await (await fetch('/cities.index.json')).json(), { preset: 'search' })
```

## fingerprint

```ts
fingerprint(text: string, options?: NormalizeOptions & { preset?: Preset }): string
```

The words of the normalized text, once each, sorted: `fingerprint('Doe, John') === fingerprint('john DOE')`. `group(items, { method: 'fingerprint' })` and `dedupe(items, { method: 'fingerprint' })` group by it: no typo tolerance, but instant on any size of list.

## React

```tsx
import { useFuzzySearch, Highlight } from 'fuzzy-toolkit/react'

function Search({ songs }) {
  const [query, setQuery] = useState('')
  const results = useFuzzySearch(songs, query, { keys: ['title', 'artist'], limit: 20 })
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>{results.map((r) => <li key={r.index}><Highlight text={r.text} ranges={r.ranges} /></li>)}</ul>
    </>
  )
}
```

`useFuzzySearch(items, query, options)` uses the `search` preset by default, indexes the list once (again only when `items` or the options change) and returns results with `ranges`. An empty query returns every item (`whenEmpty: 'none'` returns nothing). `<Highlight text ranges as?>` wraps matching parts in `<mark>` (or `as`).

## Raw algorithms

No normalization, plain strings in:

```ts
levenshtein('kitten', 'sitting') // 3
levenshtein('kitten', 'sitting', { max: 2 }) // 3: above max, stops early and returns max + 1
damerau('teh', 'the')            // 1
jaro('martha', 'marhta')         // 0.944
jaroWinkler('martha', 'marhta')  // 0.961…
hamming('karolin', 'kathrin')    // 3
lcs('ABCBDAB', 'BDCABA')         // 4, longest common subsequence
```

Similarities from 0 to 1, on chunks of `n` letters (pairs by default):

```ts
dice('healed', 'sealed')         // 0.8, spaces ignored (same as string-similarity)
jaccard('night', 'nacht')        // 0.143, shared chunks / all distinct chunks
cosine('aaaa', 'aaa')            // 1, chunk counts compared as vectors
overlap('york', 'new york')      // 1, shared chunks / chunks of the smaller text
tversky('york', 'new york', { alpha: 1, beta: 0 }) // 1, how much of the first is in the second
ratcliffObershelp('WIKIMEDIA', 'WIKIMANIA') // 0.778, Python's difflib ratio
jaccard('night', 'nacht', 3)     // on chunks of 3 letters
```

## string-similarity compatibility

`fuzzy-toolkit/string-similarity` is a drop-in replacement for the unmaintained `string-similarity` package: same functions, same results, same errors.

```ts
import stringSimilarity from 'fuzzy-toolkit/string-similarity'
// or: import { compareTwoStrings, findBestMatch } from 'fuzzy-toolkit/string-similarity'

compareTwoStrings('healed', 'sealed') // 0.8
findBestMatch('healed', ['edward', 'sealed', 'theatre'])
// { ratings: [...], bestMatch: { target: 'sealed', rating: 0.8 }, bestMatchIndex: 1 }
```

## Fuse.js compatibility

::: tip New in 2.8.0
Extended search, logical queries, `getFn` and `sortFn` are not on npm yet: they come with the next release. In 2.7.0 they are ignored with a warning.
:::

`fuzzy-toolkit/fuse` has the Fuse.js API: change the import, keep the code. The results come from fuzzy-toolkit: on song titles typed with a typo, the same code finds 80 % of them instead of 65 %, 7 times faster ([benchmarks](/guide/benchmarks)).

```ts
import Fuse from 'fuzzy-toolkit/fuse' // was: import Fuse from 'fuse.js'
// CommonJS: const Fuse = require('fuzzy-toolkit/fuse')

const fuse = new Fuse(books, { keys: ['title', 'author.name'], includeScore: true, includeMatches: true })
fuse.search('jon', { limit: 5 })
// [{ item, refIndex, score, matches: [{ indices: [[0, 2]], key: 'title', value: '...' }] }]

// Extended search and logical queries, as in Fuse.js
const extended = new Fuse(books, { keys: ['title', 'author.name'], useExtendedSearch: true })
extended.search("^old 'war | =HTML5")
extended.search({ $and: [{ title: 'old' }, { 'author.name': '!scalzi' }] })
```

What carries over: `keys` (names, paths as `'a.b'` or `['a', 'b']`, weights), `threshold`, `includeScore` (0 is a perfect match, like Fuse), `includeMatches` (ends included, like Fuse), `minMatchCharLength`, `shouldSort`, `isCaseSensitive`, `ignoreDiacritics`, `getFn` (global or on a key), `sortFn`, `useExtendedSearch`, logical queries, `search(query, { limit })`, `add`, `remove`, `removeAt`, `setCollection`, `getIndex`, `Fuse.createIndex` and `Fuse.parseIndex`.

What differs:

- **Scores and ranking** are fuzzy-toolkit's: typos anywhere, word order, acronyms. Scores are not the ones Fuse would give.
- **`threshold`** maps to `100 × (1 − threshold)`. When you leave it out, the default is 70 (like `threshold: 0.3`), stricter than Fuse's 0.6, which lets in a lot of noise.
- **Extended search and logical queries** find the same items as Fuse.js (`=exact`, `'include`, `^prefix`, `suffix$`, `!exclude`, spaces for AND, `|` for OR, `{ $and }`, `{ $or }`, `{ $path, $val }`), with two differences: a query's words may match different keys of an item (Fuse wants them in one), and `!word` excludes an item when any of its keys has the word. Fuzzy words keep fuzzy-toolkit's typo tolerance.
- **No token search** (`useTokenSearch`, `tokenize`, `tokenMatch`): these print a warning. `location`, `distance` and `ignoreLocation` are accepted but have no effect, because fuzzy-toolkit does not score by position.
- **Saved indexes** from Fuse.js cannot be loaded: save one again with `JSON.stringify(fuse.getIndex())`.

For new code, prefer [`createIndex`](#createindex): it has more options (presets, languages, `closest`, `highlight`).
