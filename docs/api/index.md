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
- `keys`: where the text of an object is. A property name, an array of names, or `(item) => string | string[]`. Required when items are not strings; only properties holding text are accepted. A name can carry a weight: `['title', { name: 'artist', weight: 0.8 }]` makes artist matches score 80 % of their value.

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

## Raw algorithms

No normalization, plain strings in:

```ts
levenshtein('kitten', 'sitting') // 3
damerau('teh', 'the')            // 1
jaroWinkler('martha', 'marhta')  // 0.961…
```
