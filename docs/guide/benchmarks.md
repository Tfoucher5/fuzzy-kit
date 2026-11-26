# Compared with other libraries

Measured with `npm run bench:versus` on public data (Spotify song titles, the 20,000 most common English words), Node 22, median of 7 runs. Every library gets the same inputs.

## string-similarity

`fuzzy-toolkit/string-similarity` returns exactly the same numbers as `string-similarity` (checked on 20,000 real pairs and thousands of random ones in the tests).

| Task | string-similarity | fuzzy-toolkit | |
| --- | --- | --- | --- |
| `compareTwoStrings`, 20,000 title pairs | 47 ms | 22 ms | **2.2× faster** |
| `findBestMatch`, 1,000 queries × 2,000 titles | 4.0 s | 1.1 s | **3.5× faster** |

## "Did you mean…?"

500 misspelled words against the 20,000 most common English words.

| | Right word | Time |
| --- | --- | --- |
| string-similarity `findBestMatch` | 35.6 % | 6.7 s |
| fuzzy-toolkit `createIndex(words).closest()` | **94.8 %** | **0.96 s** |

## Search as you type

300 typed queries (the start of a title, with a typo) over 23,450 song titles, top 10.

| | Wanted title found | Time per query |
| --- | --- | --- |
| Fuse.js | 75.3 % | 71.6 ms |
| fuzzysort | 23.7 % | 0.7 ms |
| fuzzy-toolkit `createIndex(titles, { preset: 'search' })` | **89.0 %** | 13.0 ms |

fuzzysort is the fastest but only matches letters in order, so a typo loses the result. fuzzy-toolkit finds more than Fuse.js, 5 times faster.

## Levenshtein distance

20,000 title pairs and 20,000 word pairs.

| fastest-levenshtein | fuzzy-toolkit `levenshtein` |
| --- | --- |
| 17.1 ms | **12.6 ms** (1.4× faster) |

## Dedupe

5,000 song titles: 1.1 s with `dedupe()` (4.5 s in v2.1).
