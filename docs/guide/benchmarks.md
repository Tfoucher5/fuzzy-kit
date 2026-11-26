# Compared with other libraries

Measured with `npm run bench:versus` on public data (Spotify song titles, the 20,000 most common English words, 151,000 world cities), Node 22, median of 7 runs. Every library gets the same inputs. Run it yourself: the numbers move a little from one machine to another.

## string-similarity

`fuzzy-toolkit/string-similarity` returns exactly the same numbers as `string-similarity` (checked on 20,000 real pairs and thousands of random ones in the tests).

| Task | string-similarity | fuzzy-toolkit | |
| --- | --- | --- | --- |
| `compareTwoStrings`, 20,000 title pairs | 45 ms | 22 ms | **2× faster** |
| `findBestMatch`, 1,000 queries × 2,000 titles | 4.0 s | 1.2 s | **3.2× faster** |

## "Did you mean…?"

500 misspelled words against the 20,000 most common English words.

| | Right word | Time |
| --- | --- | --- |
| string-similarity `findBestMatch` | 39.0 % | 6.9 s |
| fuzzy-toolkit `createIndex(words).closest()` | **93.4 %** | **0.21 s** (33× faster) |

## Search as you type

300 typed queries (the start of a title, with a typo) over 23,450 song titles, top 10.

| | Wanted title found | Time per query |
| --- | --- | --- |
| Fuse.js | 65.3 % | 81.6 ms |
| fuzzysort | 21.7 % | 0.8 ms |
| fuzzy-toolkit `createIndex(titles, { preset: 'search' })` | **82.7 %** | 11.0 ms |

fuzzysort is the fastest but only matches letters in order, so a typo loses the result. fuzzy-toolkit finds more than Fuse.js, 7 times faster.

## Acronyms

150 city names of 3 words or more typed as their initials (`nyc`), among 151,186 cities, top 10.

| | Found | Time per query |
| --- | --- | --- |
| match-sorter | 59.3 % | 104 ms |
| fuzzy-toolkit `createIndex(cities, { preset: 'search' })` | **82.0 %** | **19 ms** |

## Levenshtein distance

| Pairs | fastest-levenshtein | fuzzy-toolkit `levenshtein` |
| --- | --- | --- |
| 20,000 titles + 20,000 words | 24.7 ms | **15.0 ms** (1.6×) |
| 2,000 sentences of 100-400 characters, with typos | 25.1 ms | **11.9 ms** (2.1×) |

`damerau` (swapped letters count once) costs about the same: 12.4 ms on the sentences.

## Dedupe

| | Time |
| --- | --- |
| `dedupe()`, 5,000 song titles, typos included | 1.1-1.4 s (4.5 s in v2.1) |
| `dedupe(..., { method: 'fingerprint' })`, 20,000 titles | 113 ms |

## Saved index

151,186 cities: `createIndex` takes 318 ms, `loadIndex` from JSON 155 ms. Fuse.js builds its (lighter) index in 31 ms, but searches it 5 to 10 times slower.

## Size

Minified and gzipped, with `npm run size`:

| Import | Size |
| --- | --- |
| `levenshtein`, `damerau` | 1.3 kB |
| `fuzzy-toolkit/string-similarity` | 0.8 kB |
| `similarity`, `isMatch` | 7.1 kB |
| `check`, `checkAll` | 7.8 kB |
| `createIndex`, `search`, `highlight` | 9.7 kB |
| everything | 13.4 kB |
