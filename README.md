# fuzzy-toolkit

> Formerly **guess-rater**. Same code, same API: replace `guess-rater` with `fuzzy-toolkit` in your imports and `package.json`.

[![npm version](https://img.shields.io/npm/v/fuzzy-toolkit?logo=npm)](https://www.npmjs.com/package/fuzzy-toolkit)
[![CI](https://img.shields.io/github/actions/workflow/status/Tfoucher5/fuzzy-toolkit/ci.yml?branch=master&label=CI)](https://github.com/Tfoucher5/fuzzy-toolkit/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

**Drop-in replacement for `string-similarity`**: `require('fuzzy-toolkit/string-similarity')` gives the same `compareTwoStrings` and `findBestMatch`, same results, faster ([details](#coming-from-string-similarity)).

**Fuzzy string matching that just works.** Check quiz answers, build a search-as-you-type box, suggest "did you mean…?", spot a name inside a message, clean up duplicates, match two lists, show what was misspelled. Typos, accents, word order, missing spaces, numbers written in words and (optionally) words spelled by ear are handled for you. Also a command line tool to dedupe and join CSV files.

- **Zero config**: one sensible default, plus presets for music, search and strict matching.
- **Accurate**: on 3,000 simulated blind-test guesses over 26k Spotify tracks, 97.6 % of right answers accepted and 0 % of wrong ones (v1: 70 %).
- **Fast**: bit-parallel edit distances and reusable indexes. Searching 26k songs takes about 40 ms per keystroke, 5 times faster than Fuse.js.
- **Fully typed**: every option autocompletes, and object keys are checked against your data.
- **Tiny**: about 6 kB minified and gzipped, no dependencies, ESM and CommonJS.

```sh
npm install fuzzy-toolkit
```

## In 30 seconds

```ts
import { similarity, check, checkAll, search, closest, find, highlight, dedupe, join } from 'fuzzy-toolkit'

similarity('Molière', 'moliere')                // 100
similarity('stairway to heven', 'Stairway to Heaven') // 94.44
similarity('Smith John', 'John Smith')          // 100 (word order ignored)
similarity('2 Become 1', 'Two Become One')      // 100 (numbers in words, digits or roman)

check('bohemian rapsody', 'Bohemian Rhapsody').verdict // 'correct'
check('bohemian', 'Bohemian Rhapsody').verdict         // 'close'
check('we will rock you', 'Bohemian Rhapsody').verdict // 'wrong'

checkAll('bohemian rapsody de queen', { title: 'Bohemian Rhapsody', artist: 'Queen' }).found
// ['title', 'artist']

closest('javascrpt', ['java', 'javascript', 'typescript'])?.item // 'javascript'

search('queen', songs, { keys: ['title', 'artist'], preset: 'search' })
// [{ item: { title: 'Bohemian Rhapsody', artist: 'Queen' }, score: 100, index: 0, text: 'Queen' }, ...]

find("je crois que c'est bohemian rapsody", 'Bohemian Rhapsody')
// [{ text: 'bohemian rapsody', start: 19, end: 35, score: 94.12 }]

highlight('Bohemian Rhapsody', 'bohem')
// [{ text: 'Bohem', match: true }, { text: 'ian Rhapsody', match: false }]

dedupe(['Hey Jude', 'hey jude - Remastered 2015', 'Let It Be'], { preset: 'music' })
// ['Hey Jude', 'Let It Be']

join(['Apple Inc.', 'Microsoft Corp'], ['MICROSOFT CORPORATION', 'Apple'], { ignoreWords: ['inc', 'corp', 'corporation'] })
// each left item with its best match on the right

similarity('beyonsay', 'Beyoncé', { phonetic: true }) // 95 (sounds the same)

diff('bohemian rapsody', 'Bohemian Rhapsody')
// [{ text: 'Bohemian R', type: 'same' }, { text: 'h', type: 'added' }, { text: 'apsody', type: 'same' }]
```

```sh
npx fuzzy-toolkit dedupe customers.csv -k name -i sarl > clean.csv
```

Scores go from **0** (nothing in common) to **100** (identical once normalized). The default threshold is **80**.

## Use cases

### Quizzes and blind tests

`check()` grades a guess as `correct`, `close` ("almost!") or `wrong`, against one or several accepted answers.

```ts
import { createMatcher } from 'fuzzy-toolkit'

const quiz = createMatcher({ preset: 'music' })

quiz.check('get lucky', 'Get Lucky (feat. Pharrell Williams) - Radio Edit')
// { verdict: 'correct', correct: true, close: false, score: 100, answer: 'Get Lucky (feat. ...' }

quiz.check('beatles', ['The Beatles', 'Fab Four']).correct // true
quiz.check('guns and roses', "Guns N' Roses").correct      // true
quiz.check('jackson', 'Michael Jackson').verdict           // 'close'
```

Title and artist in one guess? `checkAll()` finds each part anywhere in it, so you can give a point per part:

```ts
const { found, parts } = quiz.checkAll('bohemian rapsody de queen', { title: 'Bohemian Rhapsody', artist: 'Queen' })
// found: ['title', 'artist'], parts.title: { verdict: 'correct', score: 94.12, ... }
```

Players who spell by ear (`beyonsay`, `ed shiran`, `kwin`)? Add `phonetic: true`: texts that sound the same (English and French) score 95, so they are accepted but never rank above the right spelling. On the Spotify benchmark it accepts no extra wrong songs.

```ts
const quiz = createMatcher({ preset: 'music', phonetic: true })
quiz.check('beyonsay', 'Beyoncé').correct // true
```

Show the player what they got wrong with `diff()`:

```tsx
diff('bohemian rapsody', 'Bohemian Rhapsody').map((piece, i) =>
  piece.type === 'same' ? piece.text : piece.type === 'added' ? <ins key={i}>{piece.text}</ins> : <del key={i}>{piece.text}</del>)
// Bohemian R<ins>h</ins>apsody
```

The `music` preset ignores `(feat. X)`, `- Remastered 2011`, `(Live)`, bracketed info and leading articles (`The`, `Les`, `L'`…), and reads `&` and `n` as `and`. An empty guess is always `wrong`. Numbers in words, digits and roman numerals are the same answer: `rocky 2` is right for `Rocky II`.

### Search as you type

```ts
import { createIndex } from 'fuzzy-toolkit'

const index = createIndex(songs, { keys: ['title', 'artist'], preset: 'search' })

index.search('bohem', { limit: 5 })  // prefixes match
index.search('zep stair')            // words in any order, each one a prefix
index.closest('queen')?.item         // best hit
```

Nested properties are dotted paths, arrays included: `keys: ['title', 'artist.name', 'tags.label']`. Add `includeMatches: true` to get, on each result, the property that matched (`key`) and the parts of `text` to highlight (`ranges`, as `[start, end]` positions).

`createIndex()` normalizes your list once, so every keystroke only scores the query. When the list changes, update the index instead of rebuilding it: `index.add(song)`, `index.remove((s) => s.id === 42)`, `index.refresh((s) => s === edited)`. With the `search` preset, a full match always ranks above a partial one, and a match at the start of a title above one in the middle.

Show what matched with `highlight()`, and make a field count less with a weight:

```tsx
const index = createIndex(songs, { keys: ['title', { name: 'artist', weight: 0.8 }], preset: 'search' })

highlight(song.title, query).map((piece, i) => (piece.match ? <mark key={i}>{piece.text}</mark> : piece.text))
```

### "Did you mean…?"

```ts
const city = closest(userInput, ['Paris', 'Lyon', 'Marseille'])
if (city) console.log(`Did you mean ${city.item}?`)
```

`closest()` returns `undefined` when nothing reaches the threshold.

### Spot names in a text

```ts
find("je crois que c'est bohemian rapsody de queen", 'Bohemian Rhapsody')[0]?.text // 'bohemian rapsody'

const mentioned = brands.filter((brand) => find(review, brand).length > 0)
```

Chat-style guesses, moderation with typos, mentions of products or cities in reviews: `find()` returns each fuzzy occurrence with its position in the original text.

### Cleaning data

```ts
group(['Jean Dupont', 'Dupont Jean', 'Marie Curie'])
// [['Jean Dupont', 'Dupont Jean'], ['Marie Curie']]

dedupe(customers, { keys: 'name', ignoreWords: ['sarl', 'sas', 'inc'] })

// Reconcile two exports: each order gets its customer, each customer used once.
join(orders, customers, { left: 'customerName', right: 'name', unique: true })
// [{ item: order, index: 0, match: { item: customer, score, ... } }, ...]
```

### From the command line

No code needed to clean or match spreadsheets. CSV (comma, semicolon or tab), JSON and plain text files work, and `-` reads standard input.

```sh
npx fuzzy-toolkit dedupe customers.csv -k name -i sarl -i sas > clean.csv     # drop near-duplicates
npx fuzzy-toolkit group customers.csv -k name                                   # number each group of duplicates
npx fuzzy-toolkit join orders.csv customers.csv --left-key client --right-key name --unique
npx fuzzy-toolkit search "bohemian rapsody" songs.csv -k title -k artist
npx fuzzy-toolkit compare "The Beatles" "beatles" -p music
```

Options: `-t` threshold, `-p` preset, `--phonetic`, `-i` word to ignore, `-l` limit, `--json`. See `npx fuzzy-toolkit --help`.

## API

| Function | Returns |
| --- | --- |
| `similarity(a, b, options?)` | score from 0 to 100 |
| `isMatch(a, b, threshold \| options?)` | `boolean` |
| `check(guess, answers, options?)` | `{ verdict, correct, close, score, answer }` |
| `checkAll(guess, { title, artist, … }, options?)` | `{ correct, found, missing, parts }`, one verdict per part |
| `closest(query, items, options?)` | best `Match` or `undefined` |
| `search(query, items, options?)` | `Match[]`, best first |
| `find(text, query, options?)` | `{ text, start, end, score }[]` occurrences in a longer text |
| `highlight(text, query, options?)` | `{ text, match }[]` pieces to render |
| `dedupe(items, options?)` / `group(items, options?)` | `T[]` / `T[][]` |
| `join(left, right, options?)` | `{ item, index, match }[]`, the best right item for each left one |
| `compare(a, b, options?)` | normalized texts and the score of each strategy |
| `diff(from, to, options?)` | `{ text, type: 'same' \| 'added' \| 'removed' }[]`, what turns `from` into `to` |
| `normalize(text, options?)` | the cleaned-up text |
| `createMatcher(options)` | all of the above with options compiled once |
| `createIndex(items, options)` | `{ search, closest, add, remove, refresh }` over a pre-processed list |
| `levenshtein(a, b)`, `damerau(a, b)`, `hamming(a, b)`, `lcs(a, b)` | raw distances, no normalization |
| `jaroWinkler(a, b)`, `dice(a, b)`, `jaccard(a, b, n?)`, `cosine(a, b, n?)` | raw similarities from 0 to 1, no normalization |

A `Match<T>` is `{ item, score, index, text }`, plus `key` and `ranges` with `includeMatches: true`. Items can be strings or objects; with objects, `keys` is required and only accepts properties that hold text (TypeScript checks it). Keys can be weighted: `['title', { name: 'artist', weight: 0.8 }]`.

## Options

All options are optional and can be passed to any function, `createMatcher()` or `createIndex()`.

| Option | Default | What it does |
| --- | --- | --- |
| `preset` | | `'music'`, `'search'` or `'strict'`. Your own options win over the preset. |
| `threshold` | `80` | Minimum score to match. |
| `closeThreshold` | `threshold - 15` | `check()` only: minimum score for `close`. |
| `ignoreWordOrder` | `true` | `john smith` matches `smith john`. |
| `ignoreSpaces` | `true` | `stairwaytoheaven` matches `stairway to heaven`. |
| `partial` | `false` | The shorter text may match a part of the longer one. `true` with `search`. |
| `strip` | `[]` | Noise to drop: `'brackets'`, `'featuring'`, `'version'`, `'articles'`. |
| `replace` | `{}` | Whole-word replacements: `{ st: 'saint', nyc: 'new york city' }`. |
| `ignoreWords` | `[]` | Whole words to ignore: `['inc', 'ltd']`. |
| `phonetic` | `false` | Texts that sound the same match too (English and French): `beyonsay` = `Beyoncé`, `nite` = `night`. Scores at most 95. |
| `numbers` | `true` | `two`, `deux`, `II` and `2` are equal; `twenty one` and `vingt et un` are `21`. Off with `search`. |
| `caseSensitive` | `false` | `A` ≠ `a`. |
| `accentSensitive` | `false` | `é` ≠ `e`. Ligatures (`œ`, `æ`, `ß`) are expanded otherwise. |
| `punctuation` | `'space'` | `'space'`, `'remove'` or `'keep'`. Apostrophes are always removed. |
| `algorithm` | `'smart'` | `'levenshtein'`, `'damerau'`, `'jaroWinkler'`, `'tokenSort'` or `'tokenSet'` if you need one in particular. |
| `limit` | `Infinity` | List functions: maximum number of results. |
| `keys` | | List functions: `'title'`, `['title', { name: 'artist', weight: 0.8 }]` or `(item) => text`. |

### How `smart` scores

1. Both texts are normalized: lower case, no accents, no punctuation, single spaces.
2. They are compared with the Damerau-Levenshtein distance, where a swapped pair of letters (`teh` / `the`) counts as one typo.
3. The same comparison runs with words sorted and with spaces removed; the best score wins.
4. With `partial`, the shorter text can also match the start of words in the longer one, weighted by how much of it is covered.

Use `compare()` to see each step:

```ts
compare('Smith Jon', 'John Smith')
// { score: 90, match: true, a: 'smith jon', b: 'john smith', scores: { characters: 10, wordOrder: 90 }, ... }
```

## Measured on real data

`npm run bench:real` downloads public datasets and measures accuracy and speed (Node 22, shared cloud VM):

| Test | Result |
| --- | --- |
| Blind test, 26,230 Spotify tracks: right guesses accepted (typos, no accents, no "feat.") | **97.6 %** (v1: 70.1 %, string-similarity: 57.0 %) |
| Same guesses checked against a wrong song: accepted | **0 %** |
| Same test with `phonetic: true` | 97.7 % accepted, **0 %** wrong songs accepted |
| `check()` | ~25 µs per guess |
| Search 26,230 songs by title and artist (partial query, wanted song in top 10) | 82.3 % in ~40 ms per keystroke (Fuse.js: 85.7 % in ~240 ms) |
| 150,653 city names, one typo and no accents: right city in top 5 | **100 %** in ~70 ms |
| 20,000 English words, one typo: right word in top 3 | **98.9 %** in ~6 ms |

## Coming from `string-similarity`

[`string-similarity`](https://www.npmjs.com/package/string-similarity) is no longer maintained. Change the import, nothing else: same functions, same results.

```js
// before
const stringSimilarity = require('string-similarity')
// after
const stringSimilarity = require('fuzzy-toolkit/string-similarity')

stringSimilarity.compareTwoStrings('healed', 'sealed')                    // 0.8
stringSimilarity.findBestMatch('healed', ['edward', 'sealed']).bestMatch  // { target: 'sealed', rating: 0.8 }
```

When you have time, `similarity()` and `closest()` do better on real input: typos, accents, word order and missing spaces are handled, and scores go from 0 to 100.

## Compared with other libraries

Same inputs for everyone, public data, `npm run bench:versus` ([details](https://tfoucher5.github.io/fuzzy-toolkit/guide/benchmarks)):

| Task | Others | fuzzy-toolkit |
| --- | --- | --- |
| `compareTwoStrings`, 20k pairs (same results) | string-similarity: 47 ms | **22 ms** |
| `findBestMatch`, 1k queries × 2k titles (same results) | string-similarity: 4.0 s | **1.1 s** |
| "Did you mean", 500 typos vs 20k words | string-similarity: 35.6 % right, 6.7 s | **94.8 % right, 0.96 s** |
| Search 23k song titles, typo in the query, top 10 | Fuse.js: 75.3 % found, 72 ms/query | **89.0 % found, 13 ms/query** |
| Levenshtein, 40k pairs | fastest-levenshtein: 17.1 ms | **12.6 ms** |

## Upgrading from v1

| v1 | v2 |
| --- | --- |
| `rate(a, b)` / `getSimilarityScore(a, b)` | `similarity(a, b)` |
| `rate(a, b, { explain: true })` | `compare(a, b)` |
| `isMatch(a, b, 85)` | unchanged |
| `findBestMatch(q, list)` | `closest(q, list)` (returns `undefined` below the threshold) |
| `rankCandidates(q, list)` | `search(q, list, { threshold: 0 })` |
| `filterMatches(q, list)` / `extract(q, list, { limit })` | `search(q, list, { limit })`, read `.item` |
| `algorithm: 'hybrid'` | the default `smart` algorithm |
| `spaceInsensitive: true` | on by default (`ignoreSpaces`) |
| `normalize: { removeAccents: false }` | `accentSensitive: true` (options are flat now) |
| `normalize: { removeWords }` / `{ replacements }` | `ignoreWords` / `replace` (whole words only) |
| `normalize: { sortTokens: true }` | on by default (`ignoreWordOrder`) |
| `getLevenshteinDistance(a, b)` | `levenshtein(a, b)` |

Default scores changed: `smart` tolerates swapped letters, word order and missing spaces, so similar texts generally score higher than with v1's `levenshtein`. Re-check your thresholds.

## Documentation

**[tfoucher5.github.io/fuzzy-toolkit](https://tfoucher5.github.io/fuzzy-toolkit/)**

## License

MIT
