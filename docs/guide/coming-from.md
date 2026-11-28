---
title: "Coming from Fuse.js, fuzzysort, match-sorter, string-similarity or leven"
description: "The fuzzy-toolkit equivalent of every call of Fuse.js, fuzzysort, match-sorter, string-similarity, fastest-levenshtein and leven, side by side, with what changes."
---

# Coming from another library

Each section maps the calls of a popular library to fuzzy-toolkit. Two of them have a drop-in import that keeps your code as it is. For the others, the table gives the matching call.

Two things change everywhere:

- **Scores go from 0 to 100**, higher is better. A match is `score >= threshold`, and the default threshold is 80.
- **Texts are normalized first.** Case, accents, punctuation, word order, missing spaces and numbers written in words (`two` = `2`) don't count against a match.

## Fuse.js

Change the import and keep your code: [`fuzzy-toolkit/fuse`](/api/#fuse-js-compatibility) has the Fuse.js API, including extended search, logical queries, `getFn` and `sortFn`.

```ts
import Fuse from 'fuzzy-toolkit/fuse' // was: import Fuse from 'fuse.js'
```

To use the native API instead:

| Fuse.js | fuzzy-toolkit |
| --- | --- |
| `new Fuse(list, { keys })` | `createIndex(list, { keys, preset: 'search' })` |
| `fuse.search(query, { limit })` | `index.search(query, { limit })` |
| `includeScore: true` (0 is perfect) | always there: `score`, 100 is perfect |
| `includeMatches: true` | `includeMatches: true`, `ranges` with end excluded |
| `threshold: 0.4` (lower is stricter) | `threshold: 60` (higher is stricter) |
| `isCaseSensitive`, `ignoreDiacritics` | `caseSensitive`, `accentSensitive` (inverted) |
| `keys: [{ name, weight }]` | the same |
| `fuse.add(doc)`, `fuse.remove(fn)` | `index.add(item)`, `index.remove(fn)` |
| `Fuse.createIndex` / `Fuse.parseIndex` | `JSON.stringify(index)` / `loadIndex(items, saved, options)` |

On song titles typed with a typo, fuzzy-toolkit finds 83 % of them where Fuse.js finds 65 %, 13 times faster ([benchmarks](/guide/benchmarks)).

## fuzzysort

| fuzzysort | fuzzy-toolkit |
| --- | --- |
| `fuzzysort.go(query, targets)` | `search(query, targets, { preset: 'search' })` |
| `fuzzysort.go(query, objects, { keys: ['name'] })` | `search(query, objects, { keys: ['name'], preset: 'search' })` |
| `{ limit, threshold }` | `{ limit, threshold }` (threshold 0 to 100) |
| `fuzzysort.prepare(target)` | `createIndex(targets, options)`, once for the whole list |
| `result.target`, `result.obj`, `result.score` | `match.text`, `match.item`, `match.score` |
| `result.highlight('<b>', '</b>')` | `highlight(match.text, query)`: the parts, the matching ones flagged |

fuzzysort matches the letters you typed in order, very fast. A typo in the middle of a word breaks that, and fuzzysort finds 22 % of the same typed titles. If your users never make typos, fuzzysort is faster; if they do, fuzzy-toolkit finds them.

## match-sorter

| match-sorter | fuzzy-toolkit |
| --- | --- |
| `matchSorter(items, value)` | `search(value, items, { preset: 'search' })` |
| `matchSorter(items, value, { keys: ['name'] })` | `search(value, items, { keys: ['name'], preset: 'search' })` |
| `rankings.ACRONYM` | `acronyms: true` (in the `search` preset) |
| `rankings.CONTAINS` | `substring: true` |
| `keys: [{ key, threshold }]` | `keys` and one `threshold` for the search; `{ name, weight }` ranks a key lower |

Note the order of the arguments: the query comes first in fuzzy-toolkit. On city names typed as their initials (`nyc`), fuzzy-toolkit finds 82 % of them where match-sorter finds 59 %, 7 times faster.

## string-similarity

Change the import and keep your code: [`fuzzy-toolkit/string-similarity`](/api/#string-similarity-compatibility) returns exactly the same numbers, faster.

```ts
import { compareTwoStrings, findBestMatch } from 'fuzzy-toolkit/string-similarity'
```

To use the native API instead:

| string-similarity | fuzzy-toolkit |
| --- | --- |
| `compareTwoStrings(a, b)` (0 to 1) | `similarity(a, b)` (0 to 100), or `dice(a, b)` for the same metric |
| `findBestMatch(main, targets).bestMatch.target` | `closest(main, targets)?.item` |
| `findBestMatch(main, targets).ratings` | `search(main, targets, { threshold: 0 })` |

## fastest-levenshtein and leven

| fastest-levenshtein / leven | fuzzy-toolkit |
| --- | --- |
| `distance(a, b)` / `leven(a, b)` | `levenshtein(a, b)` |
| `leven(a, b, { maxDistance })` | `levenshtein(a, b, { max })`: above `max`, it returns `max + 1` |
| `closest(str, list)` | `closest(str, list)?.item` (normalized), or the list sorted by `levenshtein` (raw) |

`levenshtein` is a plain edit distance, no normalization, 2 to 4 times faster than fastest-levenshtein. `damerau(a, b)` counts swapped letters as one edit.

## Not a library yet?

If you hand-rolled a comparison (`a.toLowerCase().includes(b)`, a Levenshtein copied from Stack Overflow), start with [Getting started](/guide/getting-started): `isMatch(a, b)` and `search(query, items)` cover most of it.
