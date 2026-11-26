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
