# Contributing to fuzzy-toolkit

Thanks for helping! Contributions of every size are welcome: a typo in the
docs, a failing case, a new language, a preset for your kind of data, a
faster algorithm. You can write issues and pull requests in English or French.

## Ways to help

- **Report a wrong result.** Two texts that should match and don't (or the
  reverse) are the most useful bug reports. Use the "Wrong result" template.
- **Add a language.** Numbers in words, articles, stop words and phonetic
  rules for your language. See [Languages and presets](https://tfoucher5.github.io/fuzzy-toolkit/guide/extensions),
  and test it with `assertLanguage()` from `fuzzy-toolkit/testing`.
  Open a "Language request" issue first if you want help or want to avoid
  duplicate work.
- **Share a preset.** Publish it on npm as `fuzzy-toolkit-preset-<name>` with
  the keyword `fuzzy-toolkit-plugin`. Presets of general interest can also
  be proposed for the core with the "Preset proposal" template.
- **Propose a feature.** Missing an option, a function, a metric, an
  integration? Open a "Feature request" issue, or start a
  [discussion](https://github.com/Tfoucher5/fuzzy-toolkit/discussions) if the
  idea is still rough. Say what you're trying to do; a solution is optional.
  For a big change, wait for a go before writing the code.
- **Improve the docs**, in `docs/`.
- Issues labelled `good first issue` are a good place to start, and
  `help wanted` ones are open to anyone.

## Setup

Node 18 or later.

```sh
git clone https://github.com/<you>/fuzzy-toolkit && cd fuzzy-toolkit
npm install
npm test
```

## Project layout

| Path | What's there |
| --- | --- |
| `src/distance.ts`, `src/metrics.ts` | Raw algorithms (Levenshtein, Damerau, Jaro, Dice...). |
| `src/normalize.ts`, `src/numbers.ts`, `src/phonetic.ts` | Text cleanup, numbers in words, sounds-alike keys. |
| `src/lang/` | Language packs (`en`, `fr`, `es`, `de`, `it`). |
| `src/testing.ts` | `fuzzy-toolkit/testing`, the kit to test a pack or a preset. |
| `src/presets.ts`, `src/core.ts`, `src/define.ts` | Presets and the extension API. |
| `src/engine.ts` | Scoring (`smart` and the other algorithms). |
| `src/matcher.ts` | The public API: `compare`, `check`, `search`, `createIndex`... |
| `tests/` | `node:test` tests, run on the build (`dist/`). `tests/types.ts` checks types. |
| `tests/golden/` | Golden results: scores that must not change by accident. |
| `bench/` | Speed and accuracy benchmarks. |
| `docs/` | The documentation site (VitePress). |

## Before opening a pull request

```sh
npm run typecheck   # types, including tests/types.ts
npm test            # build + all tests, golden results included
npm run size:check  # bundle size budgets
npm run coverage    # Node 22.8+: at least 95% of lines, 90% of branches
```

CI runs these on Node 18 to 24, plus `npm run bench:check` (accuracy on real
data) and the docs build. You don't need to run the benchmark locally unless
you change scoring.

### When a result changes

Scores are the product: users set thresholds on them. So any change in a
score must be a decision, never an accident.

- `npm test` fails if a score in `tests/golden/` changed. If the change is
  intended, run `npm run golden:update`, and explain in the pull request
  which results move and why. Reviewers will read the diff of
  `tests/golden/results.json`.
- `npm run bench:check` fails if accuracy on real data got worse than
  `bench/baseline.json`. After an intended improvement, run
  `npm run bench:baseline` and commit the new baseline.
- `npm run size:check` fails if an import grows past its budget in
  `scripts/size-budget.json`. Raise the budget in the same PR if the feature
  is worth it, and say so.

### Pull request checklist

1. One topic per pull request; small is good.
2. Tests for what you add or fix (`tests/*.test.mjs`).
3. An entry under **Unreleased** in `docs/guide/changelog.md`, written for
   users of the package.
4. Docs updated if you changed the API (`README.md`, `docs/`, `llms.txt`).
5. No runtime dependencies: fuzzy-toolkit has none and stays that way.

## Style

- TypeScript, strict. Public functions get a JSDoc comment with an `@example`.
- Plain, short names and comments. Explain *why*, not *what*.
- Performance matters: compile once (regular expressions, tables) and reuse.
  Run `npm run bench` before and after a change to hot code.
- Error messages start with `[fuzzy-toolkit]` and say how to fix the problem.

## Versioning

fuzzy-toolkit follows [semantic versioning](https://semver.org):

- **Major**: an API is removed or renamed, or an option's default changes.
- **Minor**: new features, and any change in scores (with a "Changed
  results" note in the changelog, since thresholds may need a look).
- **Patch**: bug fixes that don't move scores, docs, performance with
  identical results.

Language packs and presets carry an `apiVersion`. It only changes with a
major version of the extension API, and old packs get a clear error.

## Releases

See [RELEASING.md](RELEASING.md). Only maintainers publish.

## Code of conduct

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
Security issues: see [SECURITY.md](SECURITY.md), don't open a public issue.
