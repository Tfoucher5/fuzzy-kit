---
title: "Benchmarks: fuzzy-toolkit vs Fuse.js, fuzzysort, string-similarity, fastest-levenshtein"
description: "Speed and accuracy of fuzzy-toolkit against Fuse.js, fuzzysort, match-sorter, string-similarity and fastest-levenshtein, on real data: song titles, English words, world cities."
---

# Compared with other libraries

Measured with `npm run bench:versus` on public data (Spotify song titles, the 20,000 most common English words, 151,000 world cities), Node 22 on a standard GitHub runner (ubuntu-latest), median of 7 runs. Every library gets the same inputs. Run it yourself, or start the Benchmarks workflow of the repository: the numbers move a little from one machine to another, the ratios much less.

## string-similarity

`fuzzy-toolkit/string-similarity` returns exactly the same numbers as `string-similarity` (checked on 20,000 real pairs and thousands of random ones in the tests).

| Task | string-similarity | fuzzy-toolkit | |
| --- | --- | --- | --- |
| `compareTwoStrings`, 20,000 title pairs | 35.8 ms | 17.9 ms | **2× faster** |
| `findBestMatch`, 1,000 queries × 2,000 titles | 3.1 s | 0.84 s | **3.7× faster** |

## "Did you mean…?"

500 misspelled words against the 20,000 most common English words.

| | Right word | Time |
| --- | --- | --- |
| string-similarity `findBestMatch` | 39.0 % | 4.8 s |
| fuzzy-toolkit `createIndex(words).closest()` | **93.4 %** | **0.22 s** (22× faster) |

## Search as you type

300 typed queries (the start of a title, with a typo) over 23,450 song titles, top 10.

| | Wanted title found | Time per query |
| --- | --- | --- |
| Fuse.js | 65.3 % | 60.6 ms |
| fuzzysort | 21.7 % | 0.6 ms |
| fuzzy-toolkit `createIndex(titles, { preset: 'search' })` | **82.7 %** | **4.4 ms** |
| fuzzy-toolkit/fuse, the same code as Fuse.js | 80.3 % | 4.0 ms |

fuzzysort is the fastest but only matches letters in order, so a typo loses the result. fuzzy-toolkit finds more than Fuse.js, 13 times faster.

## Acronyms

150 city names of 3 words or more typed as their initials (`nyc`), among 151,186 cities, top 10.

| | Found | Time per query |
| --- | --- | --- |
| match-sorter | 59.3 % | 85.1 ms |
| fuzzy-toolkit `createIndex(cities, { preset: 'search' })` | **82.0 %** | **11.8 ms** |

## Levenshtein distance

| Pairs | fastest-levenshtein | fuzzy-toolkit `levenshtein` |
| --- | --- | --- |
| 20,000 titles + 20,000 words | 11.0 ms | **5.4 ms** (2×) |
| 2,000 sentences of 100-400 characters, with typos | 19.1 ms | **4.9 ms** (3.9×) |

`damerau` (swapped letters count once) costs about the same: 5.6 ms on the sentences.

## Dedupe

| | Time |
| --- | --- |
| `dedupe()`, 5,000 song titles, typos included | 0.85 s |
| `dedupe(..., { method: 'fingerprint' })`, 20,000 titles | 61 ms |

## Saved index

151,186 cities: `createIndex` takes 175 ms, `loadIndex` from JSON 86 ms. Fuse.js builds its (lighter) index in 23 ms, but searches it 7 to 14 times slower.

## Size

Minified and gzipped, with `npm run size`:

| Import | Size |
| --- | --- |
| `levenshtein`, `damerau` | 1.3 kB |
| `fuzzy-toolkit/string-similarity` | 0.8 kB |
| `similarity`, `isMatch` | 10.0 kB |
| `check`, `checkAll` | 10.6 kB |
| `mapFields` | 10.8 kB |
| `findAll` | 11.5 kB |
| `createIndex`, `search`, `highlight` | 13.2 kB |
| `fuzzy-toolkit/react`, `/vue`, `/svelte` | 13.5 kB |
| `repair` | 14.6 kB |
| `createMatcher` (every method) | 14.8 kB |
| `fuzzy-toolkit/fuse` | 15.5 kB |
| everything | 20.3 kB |
| one extra language (`lang/es`) | +0.6 kB |

The package is marked `"sideEffects": false`, so bundlers keep only what you import. A matcher from `createMatcher` is one object with every method, so it always carries all of them: import the functions you call when size matters.
