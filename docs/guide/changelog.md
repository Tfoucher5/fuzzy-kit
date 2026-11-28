---
title: "Changelog"
description: "Every fuzzy-toolkit release: what was added, fixed and made faster, and any behavior change with the option that restores the old one."
---

# Changelog

All notable changes to fuzzy-toolkit are documented in this file.

The project follows **semantic versioning**:
- MAJOR — breaking changes
- MINOR — new features, backward‑compatible
- PATCH — bug fixes, documentation, DX improvements

---

## Unreleased

Scores and defaults are unchanged. Two results change because they were wrong; see **Behavior change**.

### Added

- `exactNumbers: true`: texts match only when they hold the same numbers in the same order, so `10 Downing Street` and `11 Downing Street`, `Apollo 11` and `Apollo 13` or two dates stay apart. For cleaning addresses, product models, invoices. Also `--exact-numbers` on the command line and an `exactNumbers` argument of the MCP tools. See [Options](/guide/options#matching).
- `fuzzy-toolkit --version`.
- `createWorkerIndex` takes a Node `worker_threads` Worker as it is.

### Behavior change

- `repair`: a value of the wrong type that cannot be converted (`"abc"` for an integer, `null`, a text where an object is expected) is now listed in `unresolved` (`expected integer, got "abc"`), as the docs said. It was left out, so `if (unresolved.length) askAgain()` accepted invalid data. `required` is now checked on objects whose schema has no `properties`. To ignore type errors as before: `unresolved.filter((u) => !u.reason.startsWith('expected '))`.
- `fuzzy-toolkit/react`, `/vue` and `/svelte`: with an empty query, each result now has the `text` (and `key`) of its item instead of `''`, so `<Highlight text={r.text}>` shows the list. Scores and order are unchanged.

### Fixed

- Command line: a CSV file with two columns of the same name stops with an error instead of writing one column's values in both. An empty file says so. Rows with more cells than the header are reported on stderr. `| head` no longer prints a stack trace. An unknown preset or language lists the valid names. `new-pack` without a name exits with an error. A `search` without results and without `-p` suggests `-p search` on stderr.
- A list with holes (`['a', , 'b']`) no longer crashes `search`, `closest`, `createIndex` or `dedupe`: a hole is an `undefined` item.
- `useFuzzySearch` (React) accepts an `undefined` query, like the Vue and Svelte helpers.

### Performance

- Options written in each call (`similarity(a, b, { ignoreWords })`) no longer compile again every time: equal options share one compiled engine. About 6 times faster in a loop (200,000 calls with `ignoreWords`: 6.1 to 1 s). Results are identical.

---

## v2.9.0

Scores, verdicts and defaults are unchanged. Four bugs are fixed, one of them in `repair` with untrusted input: update if you use it.

### Added

- `standardize(values)` replaces each value by the most common spelling among its near-duplicates ("paris", "Pariss" → "Paris"), to clean a column in one call. Also `npx fuzzy-toolkit standardize file.csv -k column` and an MCP tool. See [standardize](/api/#standardize).
- `fuzzy-toolkit/worker`: `createWorkerIndex(worker, items, options)` searches in a Web Worker, for lists of hundreds of thousands of items; the worker file is one line, `import 'fuzzy-toolkit/worker/serve'`. See [Web Worker](/api/#web-worker).
- `segments(text, ranges)` is exported from `fuzzy-toolkit` too (it was only in `/vue` and `/svelte`): it cuts a text into the parts to render from the `ranges` of a result, in any framework.
- The [Playground](/playground) has `findAll` and `repair` tabs.

### Fixed

- `repair`: a value of "constructor" or "__proto__" where the schema expects a boolean, was turned into a function or into `Object.prototype`. It is now left as it is. Untrusted model output could reach a shared object this way: update if you pass it to `repair`.
- `repair`: a number too large for JSON ("1e400") is no longer converted to `Infinity`.
- `fuzzy-toolkit/fuse`: with `shouldSort: false`, `limit` now keeps the first matches in the list, and `limit: 0` returns none, as in Fuse.js.
- `fuzzy-toolkit/svelte`: subscribing the same callback twice no longer leaves a subscription to the inputs open after both unsubscribe.

### Performance

- `dedupe` and `group` are about 1.7 times faster on large lists (20,000 song titles: 9.2 to 5.4 s): before scoring a candidate, the letters one text has and the other lacks give a lower bound of the edits needed. Results are identical.

---

## v2.8.1

Nothing changes in the library.

### Fixed

- The MCP server is now listed in the [MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.Tfoucher5/fuzzy-toolkit`: the registry matches the GitHub account name with its capital letter, so 2.8.0 could not be listed.

---

## v2.8.0

Scores, verdicts and defaults are unchanged. The one behavior change is in `fuzzy-toolkit/fuse`, for code that sets options 2.7.0 ignored.

### Behavior change

- `fuzzy-toolkit/fuse`: `useExtendedSearch: true` and `sortFn` used to be ignored with a warning; they now apply, as in Fuse.js, and a logical query no longer throws. To keep the old results, leave out `useExtendedSearch` and `sortFn`. Plain searches are unchanged.

### Added

- `findAll(text, items)` finds which items of a list are mentioned in a text, typos included, with their positions: a longer name wins over its parts, and objects can bring aliases through `keys`. Also an MCP tool, `findAll`. See [findAll](/api/#findall).
- `repair(value, schema)` repairs a value, typically a model's JSON output, against its JSON Schema: property names matched, enum values corrected, numbers and booleans written as text converted, extra properties dropped where the schema says so. It returns the repaired copy, the list of changes and what could not be repaired. Also an MCP tool, `repair`. See [repair](/api/#repair).
- `mapFields(from, to)` pairs field names with a schema, one to one: CSV headers with your columns, the keys an AI or an API returned with the ones you expect. Reads camelCase, snake_case and kebab-case, knows common synonyms in English, French and Spanish (zip and postal code, dob and date of birth, qty and quantity), and takes your own in `synonyms`. Also an MCP tool, `mapFields`. See [mapFields](/api/#mapfields).
- `npx fuzzy-toolkit map-fields export.csv --to firstName,email,postalCode` renames a file's columns to your names. See [Command line](/recipes/cli#rename-columns-to-your-names).
- `fuzzy-toolkit/vue` and `fuzzy-toolkit/svelte`: `useFuzzySearch` on refs with a `<Highlight>` component for Vue 3.3+, and a `fuzzySearch` store for Svelte 3, 4 and 5, with `segments()` to render the matches. See [Vue](/api/#vue) and [Svelte](/api/#svelte).
- `fuzzy-toolkit/fuse` now supports the rest of the Fuse.js API: extended search (`useExtendedSearch`: `=exact`, `'include`, `^prefix`, `suffix$`, `!exclude`, `|` for OR), logical queries (`{ $and }`, `{ $or }`, `{ $path, $val }`), `getFn` (global or on a key) and `sortFn`. They find the same items as Fuse.js on its own examples. See [Fuse.js compatibility](/api/#fuse-js-compatibility).

### Performance

- Search as you type is about 35% faster than in 2.7.0 (measured side by side on one machine), now 4.4 ms per query over 23,450 song titles on a GitHub runner, 13 times faster than Fuse.js: before scanning a title, the letter pairs of the query it lacks give a lower bound of the edits needed, and titles that cannot reach the threshold are skipped. An index keeps each title's pairs for the next queries. Results are identical.

### Project

- The MCP server is listed in the official [MCP Registry](https://registry.modelcontextprotocol.io) at each release (`io.github.Tfoucher5/fuzzy-toolkit`), so MCP clients can find it.
- Benchmarks run on a GitHub runner (the Benchmarks workflow), so anyone can reproduce the published numbers.
- The documentation pages each describe themselves to search engines, with a sitemap.

---

## v2.7.0

Nothing in 2.7.0 changes a score, a verdict or a default: everything new is a new import or a new command.

### Added
- `fuzzy-toolkit/fuse`: the Fuse.js API (`new Fuse(list, options).search(query)`) on top of fuzzy-toolkit. Change the import, keep the code. On song titles typed with a typo, the same code finds 80 % of them instead of 65 %, 7 times faster. See [what differs](/api/#fuse-js-compatibility).
- `npx fuzzy-toolkit new-pack language <code>` and `new-pack preset <name>` write a ready-to-publish package for a language pack or a preset, with a test that uses `fuzzy-toolkit/testing`.
- The [Extensions](/extensions) page has a **Wanted** list: the language packs and presets people asked for in issues, each with the command to start it.

### Fixed
- `npx fuzzy-toolkit ai-setup` on Windows: a Cursor rule written by 2.5.0 and checked out with CRLF line ends was taken for a hand-edited file and left as is. It is now updated like on other systems.

### Performance
- Searches of several words (`partial`, `preset: 'search'`) scan each item once instead of once per word: about 1.2x faster on a two-word query. Scores are unchanged.
- `levenshtein` and `damerau` no longer copy the texts they compare: faster on short and long texts.

### Project
- CI also runs the package on Bun and Deno.

---

## v2.6.0

**For apps using `preset: 'search'` since 2.0 or 2.1:** 2.2.0 added `acronyms: true` to this preset, so short queries can return more results. Pass `{ preset: 'search', acronyms: false }` to get the old results back. Nothing in 2.6.0 changes a score.

### Added
- `substring` option: like `partial`, and a match may also start inside a word, so `phone` finds `iPhone 15` and `ville` finds `Belleville`. No more `includes()` next to a search. Opt-in: scores without it are unchanged. Also in the MCP server.
- [Extensions](/extensions) page on the docs site: the packs shipped with fuzzy-toolkit and community ones, found on npm by the keyword `fuzzy-toolkit-plugin` or reviewed in `docs/extensions.json`, with a fuzzy search box. The site rebuilds weekly so new packages appear.

### Changed
- `npx fuzzy-toolkit ai-setup` only writes when the project's `package.json` lists fuzzy-toolkit (`--force` to write anyway), writes a shorter block that tells assistants to go through the project's existing calls, links the online `llms.txt` instead of a `node_modules` path that may not exist, and never replaces a block someone edited by hand (`--force` does).
- The MCP `check` tool says in its description that it gives the engine's verdict, not the verdict of a given app, which adds its own rules.

### Project
- A test freezes what each built-in preset sets: a preset only changes in a major version. New behavior comes as an option to turn on.

### Docs
- `search` preset: 2.2.0 added `acronyms: true` in a minor version, which can return more results than 2.1. Documented, with `acronyms: false` to get the old behavior back.
- Size: `createMatcher` carries every method (about 14 kB); import the functions you call for a smaller bundle.
- New design for the documentation site. The home page has a live demo scored by the real library, benchmarks and examples for each function.
- New [Playground](/playground) page.
- Getting started shows pnpm, yarn, bun and CDN installs; the search recipe covers React.
- A shorter README that points to the documentation.

---

## v2.5.0

### Added
- Dutch language pack: `fuzzy-toolkit/lang/nl`. Numbers in words with units first (`eenentwintig`, `een en twintig`), ordinals, articles, stop words and phonetic rules (ij/ei, au/ou, v/f, z/s, ch/g). Also in the CLI (`--lang nl`) and the MCP server. Thanks to [@techkayacodes](https://github.com/techkayacodes), the first outside contribution!

### Project
- Property-based tests (fast-check): random Unicode input against the laws of distances, scores and `normalize`.
- Each GitHub release carries the npm tarball with its SLSA provenance. See "Verifying a release" in SECURITY.md.
- Ko-fi link for those who want to support the project (`npm fund`).

---

## v2.4.0

### Added
- Spanish, German and Italian language packs: `fuzzy-toolkit/lang/es`, `/de` and `/it`. Numbers in words (`treinta y dos`, `einundzwanzig`, `ventitré`), ordinals, articles, stop words and phonetic rules. Import one and pass it in `languages`; bundles only carry the packs they import. See [Languages and presets](/guide/extensions).
- `fuzzy-toolkit/testing`, a kit for people who write language packs and presets: `assertLanguage(pack, { numbers, articles, stopwords, sounds, distinct })` and `assertPreset(preset, { matches, differs, normalized })` check the cases you expect and list every one that fails, with any test runner. See [Testing your pack](/guide/extensions#testing-your-pack).

### Project
- RELEASING.md: the npm trusted publisher needs **Allow npm publish** ticked.
- Releases are automatic: merging a version bump creates the tag, the GitHub release and the npm publish.
- CI checks test coverage (95% of lines, 90% of branches) and runs the OpenSSF Scorecard.
- The tests pass on Windows.

---

## v2.3.0

### Added
- **MCP server for AI agents**: `npx fuzzy-toolkit mcp` gives Claude, Cursor, VS Code and other agents the tools `compare`, `closest`, `search`, `dedupe`, `join`, `check` and `find`. Local, no dependency, no file access. See [AI agents and assistants](/recipes/ai-agents).
- `npx fuzzy-toolkit ai-setup`: adds a short usage block to your project's `AGENTS.md`, `CLAUDE.md`, Cursor rules or Copilot instructions, and updates it in place next time.
- `llms-full.txt` in the package: the whole documentation in one file for coding assistants. Context7 configuration.
- Warnings for common mistakes, printed once each: an unknown option (with "did you mean"), a `0.8` threshold when scores go to 100, a `keys` name no item has. Results are unchanged.
- Clearer error when options are not an object.

### Project
- Contributing guide, code of conduct, security policy and issue forms for bug reports, wrong results, language requests and preset proposals.
- CI on every pull request: tests on Node 18 to 24, golden results so scores never change by accident, accuracy on real data, bundle size budgets, zero runtime dependencies and `npm audit`.
- Releases are published from GitHub with npm provenance.

### Size
- About 0.9 kB (min+gzip) more per import for the warnings.

---

## v2.2.0

### Added
- `fuzzy-toolkit/string-similarity`: drop-in replacement for the unmaintained `string-similarity` package. `compareTwoStrings()` and `findBestMatch()` give the same results; only the import changes.
- Classic metrics: `dice()`, `jaccard()`, `cosine()` (on chunks of `n` letters), `hamming()` and `lcs()` (longest common subsequence).
- Nested keys: `keys: ['artist.name', 'tags.label']`, arrays included, checked by TypeScript.
- `includeMatches` option of `search()`, `closest()` and indexes: each result gets `key` (the property that matched) and `ranges` (the parts of `text` to highlight, to the character: `New Yo|rk`).
- `acronyms` option, on with the `search` preset: `nyc` finds New York City, one typo allowed from 3 letters on.

  **Behavior change** (noted after the fact): with `preset: 'search'`, a single-word query now also matches as initials, so it can return more results than in 2.1. Pass `acronyms: false` to keep the 2.1 behavior. Presets are now frozen within a major version.
- `index.toJSON()` and `loadIndex()`: save an index as JSON and load it 2.5 times faster than rebuilding it.
- `fingerprint()` and `group`/`dedupe` `method: 'fingerprint'`: instant grouping of texts with the same words in any order.
- `levenshtein(a, b, { max })` and `damerau(a, b, { max })`: stop early above a distance.
- More metrics: `jaro()`, `overlap()`, `tversky()`, `ratcliffObershelp()` (Python's difflib ratio).
- `fuzzy-toolkit/react`: `useFuzzySearch()` and `<Highlight>`. React is an optional peer dependency.
- Minified browser builds for CDNs: `<script src="https://cdn.jsdelivr.net/npm/fuzzy-toolkit">` gives `fuzzyToolkit`. `npm run size` reports what each import weighs.
- `npm run bench:versus`: speed and accuracy against string-similarity, Fuse.js, fuzzysort and fastest-levenshtein on public data. See [Compared with other libraries](/guide/benchmarks).
- `llms.txt` in the package and the repository, so AI coding assistants know the API.
- Extension API: `defineLanguage()` and `definePreset()`. Anyone can write a language pack (numbers in words, articles, stop words, phonetic rules) or a preset for one kind of data, and publish it on npm. See [Languages and presets](/guide/extensions).
- `languages` option: `['en', 'fr']` by default, built-in codes or packs.
- `stopwords` option: ignore the stop words of the active languages.
- `stripPatterns` option: your own regular expressions of noise to remove.
- `preset` accepts a preset made with `definePreset()`, which can `extends` a built-in one.
- `fuzzy-toolkit/lang/en` and `fuzzy-toolkit/lang/fr`: the built-in packs, to extend or read as examples.
- CLI: `--preset` takes a package or a file, `--lang` picks languages.

### Changed
- English, French and the `music`, `search` and `strict` presets now run on the extension API. Results are identical: checked on 320,000 comparisons of real data against the previous code. The bundle grows by about 1.4 kB (min+gzip) for `similarity`.
- `ResolvedOptions.preset` is now the preset's name as a `string`, built-in or not.

### Faster
- `levenshtein()` and `damerau()` on texts over 32 characters: blocked bit-parallel algorithms, 15 to 25 times faster, on par with fastest-levenshtein.
- Searching skips items that lack too many of the query's letters, with the same results: up to 2.3 times faster.
- `compareTwoStrings`/`dice()` 2.2 times faster than `string-similarity`, `findBestMatch` 3.5 times.
- `dedupe()`, `group()` and `join()` skip pairs that cannot match, with the same results: 3 to 5 times faster on real lists (5,000 song titles: 4.5 s → 1 s). The command line tool benefits too.

---

## v2.1.0

**The package is renamed `fuzzy-toolkit`** (formerly `guess-rater`) so it is easier to find. Nothing else changes: replace `guess-rater` with `fuzzy-toolkit` in your imports.

### Added
- `phonetic` option: texts that sound the same match too (English and French), for answers spelled by ear. `beyonsay` = `Beyoncé`, `kwin` = `Queen`. Off by default; scores at most 95.
- `diff()`: character-by-character changes between a guess and the answer, to show what was misspelled.
- `index.add()`, `index.remove()` and `index.refresh()`: update an index when the data changes, without rebuilding it.
- Command line tool: `npx fuzzy-toolkit dedupe | group | join | search | compare` on CSV, JSON or text files.

---

## v2.0.0

A rewrite focused on doing the right thing by default. See [Upgrading from v1](/guide/migration).

### Added
- `check()`: grades a guess as `correct`, `close` or `wrong` against one or several answers.
- `checkAll()`: grades a guess that names several things, such as a title and an artist.
- `join()`: pairs each item of a list with its best match in another.
- `numbers` option, on by default: `two`, `deux`, `II` and `2` compare equal.
- `search()`, `closest()`, `dedupe()` and `group()`, working with strings or objects (`keys`).
- `createIndex()`: pre-processes a list once for fast repeated searches.
- `find()`: fuzzy occurrences of a query inside a longer text, with positions.
- `highlight()`: splits a text into matching and non-matching pieces for display.
- Weighted keys: `keys: ['title', { name: 'artist', weight: 0.8 }]`.
- `compare()`: normalized texts and the score of each strategy.
- Presets: `music`, `search`, `strict`.
- `strip` rules: `featuring`, `version`, `brackets`, `articles`.
- `partial` matching for search-as-you-type.
- Raw `damerau()` distance (swapped letters count once).
- CommonJS build alongside ESM. Sources in TypeScript.

### Changed
- New default algorithm `smart`: Damerau-Levenshtein, word order and missing spaces ignored.
- Options are flat (no more `normalize: { ... }` block).
- Functions always return the same type (no more `explain` or `return: 'entries'` switches).
- Ligatures (`œ`, `æ`, `ß`) are expanded; apostrophes are removed (`don't` → `dont`).
- Much faster: bit-parallel distances, compiled options, length-based pruning.

### Removed
- `rate`, `getSimilarityScore`, `rankCandidates`, `findBestMatch`, `filterMatches`, `extract`, `normalizeString`, `getLevenshteinDistance`, `getLevenshteinScore`, `getJaroScore`, `getJaroWinklerScore`, `getTokenSortScore`, `getTokenSetScore`.
- `hybrid` algorithm (replaced by `smart`).

### Fixed
- `replace` replaced text inside words; it now works on whole words.
- Texts made only of punctuation scored 100 against each other in answers.

---

## v1.5.0

### Added
- `filterMatches()` and `extract()` are now accessible on `createMatcher()` instances
  - `matcher.filterMatches(input, candidates, options?)`
  - `matcher.extract(input, candidates, options?)`

### Fixed
- **`spaceInsensitive` explain in hybrid mode** — when using `hybrid` with both `tokenSort` and `tokenSet` sub-algorithms and `explain: true`, the `spaceInsensitive` payload was writing the `tokenSet` entry under the wrong key (`tokenSort`), causing `tokenSet` to be missing and `tokenSort` to be overwritten. Both keys are now correctly populated.

### Improved
- **Documentation overhaul** — complete rewrite of all guide and API pages:
  - No repeated option descriptions — API pages link to canonical guide sections
  - New List helpers guide with comparison table for `rankCandidates`, `findBestMatch`, `filterMatches`, `extract`
  - Hybrid algorithm documentation merged into the Algorithms guide
  - All recipe pages rewritten with real examples and cross-links
  - Explain mode, normalization, algorithms and threshold guides significantly improved
- Test structure: `spaceInsensitive` tests were incorrectly nested inside a parent test — moved to top level for proper isolation

### Notes
- No breaking changes
- Backward compatible

---

## v1.4.0

### Added
- New list helper: `extract()`
  - returns top N matches from a candidate list
  - default return is `string[]` (values only)
  - optional `return: 'entries'` for detailed results (`{ value, score, index }`)
  - optional `explain: true` when using `return: 'entries'`
  - supports `limit` (default 5) and `threshold` (default 80)

### Notes
- No breaking changes
- Backward compatible
- Feature release focused on list extraction (top matches)

---

## v1.3.0

### Added
- New list helper: `filterMatches()`
  - filters candidates above a threshold
  - default return is `string[]` (values only)
  - optional `return: 'entries'` for detailed results (`{ value, score, index }`)
  - optional `explain: true` when using `return: 'entries'`

### Improved
- Expanded list-matching toolbox without changing existing behaviors
- Consistent “simple-by-default, detailed-on-demand” API style

### Notes
- No breaking changes
- Backward compatible
- Feature release focused on filtering / list workflows

---

## v1.2.1

### Added
- Major TypeScript / IDE DX improvements in `index.d.ts`:
  - richer inline documentation (hover docs) for core options and behaviors
  - clearer option typing for algorithm-specific configuration (`jaroWinkler`, `tokenSort`, `tokenSet`, `hybrid`)
- Overloads for better return type inference:
  - `rate(..., { explain: true })` is inferred as a detailed object
  - `rate(..., { explain: false })` / default is inferred as a number
  - similar inference improvements for `rankCandidates()` and `findBestMatch()` depending on `explain`

### Improved
- Autocomplete quality and discoverability of options in VS Code / WebStorm / TS-powered IDEs
- Reduced common mistakes by making return types and option meanings explicit in tooltips

### Notes
- No runtime changes
- Backward compatible
- DX-only release (types & developer experience)

---

## v1.2.0

### Added
- New optional scoring feature: `spaceInsensitive?: boolean`
  - when enabled, performs an additional comparison pass with all whitespace removed
  - keeps the best score between standard vs compact (no-whitespace) comparison
  - applies only to character-based algorithms (`levenshtein`, `jaroWinkler`)
  - does not affect token-based algorithms (`tokenSort`, `tokenSet`)
- Explain support for `spaceInsensitive`:
  - when `explain: true`, details include which pass was selected and related scores
- Test coverage for the new feature:
  - boosts char-based algorithms when spaces are missing/extra
  - confirms token-based algorithms remain unchanged
  - validates hybrid remains coherent and can improve on compact inputs

### Improved
- Better matching for compact inputs and "no-spaces" user queries (e.g. `iphone14pro` vs `iphone 14 pro`)
- Maintains token semantics by design (non-destructive, opt-in only)

### Notes
- No breaking changes
- Backward compatible
- Feature release focused on matching robustness

---

## v1.1.2

### Added
- Missing TypeScript exports in `index.d.ts`:
  - `getSimilarityScore`
  - `normalizeString`
  - `getLevenshteinDistance`
  - `getLevenshteinScore`
  - `getJaroScore`
  - `getJaroWinklerScore`
  - `getTokenSortScore`
  - `getTokenSetScore`
- Added `tokenSort` to `HybridWeights`
- New `RankedCandidateExplain` type for `explain: true` in `rankCandidates` and `findBestMatch`
- 26 new test cases covering:
  - low-level algorithms
  - hybrid mode
  - `createMatcher`
  - `isMatch` with object options
  - error cases (invalid type, unknown algorithm)

### Fixed
- Fixed a critical bug where `getTokenSetScore('', 'hello')` returned `100` instead of `0` when only one side was empty
- Fixed a bug where using `'hybrid'` as a sub-algorithm in hybrid weights (for example `hybrid: { hybrid: 1 }`) produced a cryptic internal error; the error message is now explicit

### Improved
- Optimized Levenshtein performance by replacing the O(n) array copy at each iteration with an O(1) reference swap, reducing the main loop workload significantly
- Increased total test coverage to 39 cases

### Notes
- No breaking changes
- Backward compatible
- Bug fix, type completeness, performance, and test coverage focused release

---

## v1.1.1

### Added
- TypeScript declaration files (`.d.ts`)
- Full IDE autocomplete support
- Inline documentation for options and algorithms

### Improved
- Developer experience in VS Code and similar editors
- Safer configuration via typed options

### Notes
- No runtime changes
- Backward compatible
- Documentation and DX focused release

---

## v1.1.0

### Added
- Modular matching engine
- Multiple algorithms:
  - Levenshtein
  - Jaro‑Winkler
  - TokenSort
  - TokenSet
  - Hybrid
- Normalization pipeline
- Hybrid weighted scoring
- Ranking helpers:
  - `rankCandidates`
  - `findBestMatch`
- `createMatcher` for reusable configurations
- Explain mode for debugging

### Improved
- Matching accuracy on noisy inputs
- Flexibility across domains

### Notes
- Backward compatible with previous API
- Major internal refactor

---

## v1.0.1

### Initial release
- Basic string similarity scoring
- Levenshtein algorithm
- Simple normalization
- Minimal API surface

---

## Contributing

fuzzy-toolkit is an **open‑source project** and contributions are welcome.

Anyone can:
- use the library freely
- fork the repository
- experiment with new ideas
- propose improvements

### Contribution workflow

1. Fork the repository on GitHub
2. Create a branch in your fork
3. Make your changes
4. Open a Pull Request (PR)
5. The PR is reviewed thoroughly
6. The PR is either merged, requested for changes, or rejected

All Pull Requests are reviewed **in depth** to ensure:
- code quality
- correctness
- consistency with the project philosophy
- backward compatibility
- proper documentation when required

Not all contributions will be merged, and that is OK.
Every proposal is reviewed with care and respect.

---

## Future plans

Planned improvements may include:
- additional algorithms
- domain presets (names, products, addresses)
- performance optimizations
- more recipes and examples
- extended documentation
- community‑driven enhancements
