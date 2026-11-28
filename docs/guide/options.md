---
title: "Options: threshold, presets, partial, phonetic, acronyms, word order"
description: "Every fuzzy-toolkit option explained with examples: threshold, presets, partial and substring matching, phonetic, acronyms, word order, spaces, case, accents, numbers, ignored words."
---

# Options

Every function accepts the same flat options object. All fields are optional.

```ts
similarity(a, b, { preset: 'music', threshold: 85, ignoreWords: ['live'] })
```

## Presets

A preset is a ready-made set of options. Anything you pass yourself wins over it.

| Preset | For | What it sets |
| --- | --- | --- |
| `music` | song titles, artists | `strip: ['featuring', 'version', 'brackets', 'articles']`, `replace: { '&': 'and', '+': 'and', n: 'and' }` |
| `search` | search boxes | `partial: true`, `acronyms: true`, `threshold: 70`, `numbers: false` |
| `strict` | codes, references | `ignoreWordOrder: false`, `ignoreSpaces: false`, `threshold: 90` |

A built-in preset does not change within a major version: what it sets in 2.x stays the same until 3.0, and a test enforces it. New behavior arrives as an option you turn on yourself.

::: warning `search` and acronyms
2.2.0 broke that rule: it added `acronyms: true` to the `search` preset, so `nyc` started to find New York City, and short queries can return more results than in 2.0 and 2.1. To get the 2.0 behavior back, pass `{ preset: 'search', acronyms: false }`.
:::

## Matching

| Option | Default | Effect |
| --- | --- | --- |
| `threshold` | `80` | Minimum score to match. |
| `ignoreWordOrder` | `true` | `john smith` matches `smith john`. |
| `ignoreSpaces` | `true` | `stairwaytoheaven` matches `stairway to heaven`. |
| `partial` | `false` | The shorter text may match a part of the longer one, starting at a word. A full match always scores higher. |
| `acronyms` | `false` (`true` with the `search` preset) | A single word may be the initials of the other text: `nyc` = `New York City`, one typo allowed from 3 letters on. Scores 90, or 80 with a typo. In lists, only the query can be the acronym. |
| `substring` | `false` | Like `partial`, and a match may also start inside a word: `phone` finds `iPhone 15` and `Smartphone`, `ville` finds `Belleville`. Turns `partial` on. A match from the start of a word still ranks first (inside a word counts 95 %). For search-as-you-type over product names, file names, codes. |
| `phonetic` | `false` | Texts that sound the same match too, in English and French: `beyonsay` = `Beyoncé`, `nite` = `night`, `fone` = `phone`, `kwin` = `Queen`. A match on sound alone scores 95 at most, and words of fewer than 3 sounds are left alone. |
| `exactNumbers` | `false` | Texts match only when they hold the same numbers in the same order: `10 Downing Street` and `11 Downing Street`, `Apollo 11` and `Apollo 13`, `2024-01-05` and `2024-05-01` score 0. Numbers in words count as digits. For addresses, product models, invoices, dates. *Since 2.10.0.* |
| `algorithm` | `'smart'` | See [How it works](/guide/how-it-works#algorithms). |

## Normalization

Before comparing, both texts are cleaned up. [`normalize()`](/api/#normalize) shows the result.

| Option | Default | Effect |
| --- | --- | --- |
| `caseSensitive` | `false` | Keep `A` and `a` apart. |
| `accentSensitive` | `false` | Keep `é` and `e` apart. Otherwise ligatures are expanded too: `œ` → `oe`, `ß` → `ss`. |
| `punctuation` | `'space'` | `'space'`: `saint-malo` → `saint malo`. `'remove'`: → `saintmalo`. `'keep'`: untouched. Apostrophes are removed outright: `don't` → `dont`. |
| `strip` | `[]` | Noise to drop, see below. |
| `replace` | `{}` | Whole-word replacements: `{ st: 'saint', nyc: 'new york city' }`. `st` never touches `stairs`. |
| `ignoreWords` | `[]` | Whole words to drop: `['inc', 'ltd', 'sarl']`. |
| `numbers` | `true` | Numbers in words (English, French) and roman numerals become digits: `two` → `2`, `vingt et un` → `21`, `XIV` → `14`, `first` → `1st`. Single letters (`I`, `X`) stay. `false` with the `search` preset, so `sev` still finds `Seven`. |

### `strip` rules

| Rule | Example |
| --- | --- |
| `featuring` | `Get Lucky (feat. Pharrell)` → `get lucky` |
| `version` | `Hey Jude - Remastered 2015` → `hey jude`, `Song (Live)` → `song` |
| `brackets` | `Song [Bonus] (2012)` → `song` |
| `articles` | `The Beatles` → `beatles`, `L'Aventurier` → `aventurier` |

A rule never empties a text: `(Intro)` stays `intro`.

## Thresholds

| Threshold | Feels like |
| --- | --- |
| 95+ | Same text, maybe one typo in a long one |
| 85 | A typo or two, good for strict answers |
| 90 | Removing duplicates: names that share most of their words (`Iron Peak Pharmaceuticals`, `Prime Peak Pharmaceuticals`) still match at 80 |
| **80** | Default: forgiving, good to compare two values or match two lists |
| 70 | Loose, good for search |

A number is a character like any other: `10 Downing Street` and `11 Downing Street` score above 90. When a number tells records apart, turn on `exactNumbers`.

Short texts move fast: one typo in a 4-letter word already costs 25 points. Use `check()`'s `close` verdict to be kind without accepting wrong answers.
