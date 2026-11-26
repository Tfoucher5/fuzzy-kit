<h1 align="center">fuzzy-toolkit</h1>

<p align="center"><strong>Close enough is a match.</strong><br>
Fuzzy string matching for JavaScript and TypeScript: typos, accents, word order, numbers in words and noise are handled for you, in about 10 kB with zero dependencies.</p>

<p align="center">
<a href="https://www.npmjs.com/package/fuzzy-toolkit"><img alt="npm version" src="https://img.shields.io/npm/v/fuzzy-toolkit?logo=npm&color=4338ca"></a>
<a href="https://www.npmjs.com/package/fuzzy-toolkit"><img alt="npm downloads" src="https://img.shields.io/npm/dm/fuzzy-toolkit?color=4338ca"></a>
<a href="https://bundlejs.com/?q=fuzzy-toolkit"><img alt="min+gzip size" src="https://img.shields.io/bundlejs/size/fuzzy-toolkit"></a>
<a href="./package.json"><img alt="zero dependencies" src="https://img.shields.io/badge/dependencies-0-brightgreen"></a>
<a href="https://github.com/Tfoucher5/fuzzy-toolkit/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/Tfoucher5/fuzzy-toolkit?style=flat&logo=github"></a>
<br>
<a href="https://github.com/Tfoucher5/fuzzy-toolkit/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/Tfoucher5/fuzzy-toolkit/ci.yml?branch=master&label=CI"></a>
<a href="https://scorecard.dev/viewer/?uri=github.com/Tfoucher5/fuzzy-toolkit"><img alt="OpenSSF Scorecard" src="https://api.scorecard.dev/projects/github.com/Tfoucher5/fuzzy-toolkit/badge"></a>
<a href="https://www.bestpractices.dev/projects/17145"><img alt="OpenSSF Best Practices" src="https://www.bestpractices.dev/projects/17145/badge"></a>
<a href="./LICENSE"><img alt="license: MIT" src="https://img.shields.io/badge/license-MIT-green.svg"></a>
</p>

<p align="center">
<a href="https://tfoucher5.github.io/fuzzy-toolkit/"><strong>Documentation</strong></a> ·
<a href="https://tfoucher5.github.io/fuzzy-toolkit/guide/getting-started">Getting started</a> ·
<a href="https://tfoucher5.github.io/fuzzy-toolkit/playground">Playground</a> ·
<a href="https://tfoucher5.github.io/fuzzy-toolkit/api/">API</a> ·
<a href="https://tfoucher5.github.io/fuzzy-toolkit/guide/benchmarks">Benchmarks</a>
</p>

---

```sh
npm install fuzzy-toolkit
```

```ts
import { check, search, closest, find, dedupe } from 'fuzzy-toolkit'

check('bohemian rapsody', 'Bohemian Rhapsody')    // { verdict: 'correct', score: 94.12 }
search('new yo', cities, { preset: 'search' })     // New York, New York City
closest('pyhton', ['python', 'java', 'php'])?.item // 'python'
find("je crois que c'est bohemian rapsody", 'Bohemian Rhapsody') // where it is in the text
dedupe(['Beyoncé', 'beyonce', 'Adele'])            // ['Beyoncé', 'Adele']
```

Scores go from 0 to 100, and the default threshold is 80.

## Why fuzzy-toolkit

- **Right by default.** On 3,000 simulated blind-test guesses, 97.6% of right answers were accepted and 0% of wrong ones.
- **One function per job.** Grade answers (`check`), search as you type (`createIndex`), suggest corrections (`closest`), spot names in a message (`find`), clean data (`dedupe`, `join`), show what was misspelled (`diff`).
- **Finds more, waits less.** On song titles with typos it finds more than Fuse.js, 7 times faster ([benchmarks](https://tfoucher5.github.io/fuzzy-toolkit/guide/benchmarks)).
- **Speaks 6 languages.** Numbers in words, articles and sounds in English, French, Spanish, German, Italian and Dutch, plus your own packs.
- **Small and typed.** About 10 kB (min+gzip) for the usual imports, no dependencies, ESM and CommonJS, Node 18+ and every browser. Every option autocompletes.
- **More than a library.** A React hook, a command line tool for CSV files, and an MCP server for AI agents.

## Coming from `string-similarity`

[`string-similarity`](https://www.npmjs.com/package/string-similarity) is no longer maintained. Change the import, nothing else: same functions, same results, faster.

```js
const stringSimilarity = require('fuzzy-toolkit/string-similarity')
```

## Learn more

| | |
| --- | --- |
| [Getting started](https://tfoucher5.github.io/fuzzy-toolkit/guide/getting-started) | Install, first match, objects and options |
| [Recipes](https://tfoucher5.github.io/fuzzy-toolkit/recipes/quiz) | Quizzes, search boxes, "did you mean", data cleaning, command line, AI agents |
| [Languages and presets](https://tfoucher5.github.io/fuzzy-toolkit/guide/extensions) | Add a language or a preset for your kind of data |
| [API reference](https://tfoucher5.github.io/fuzzy-toolkit/api/) | Every function and option |
| [Upgrading from v1](https://tfoucher5.github.io/fuzzy-toolkit/guide/migration) | Formerly **guess-rater**: what changed |

## FAQ

**What can replace `string-similarity`?**
`fuzzy-toolkit/string-similarity`: same `compareTwoStrings` and `findBestMatch`, same results, 2 to 3 times faster.

**fuzzy-toolkit or Fuse.js?**
fuzzy-toolkit finds more results with typos and is faster with a reusable index, and it also grades answers, dedupes, joins lists and finds names in a text. Scores go from 0 to 100, higher is closer.

**Does it work with AI assistants?**
Yes. `npx fuzzy-toolkit mcp` gives agents the tools, and `npx fuzzy-toolkit ai-setup` teaches your project's assistants the API.

## Contributing

Bug reports with a wrong score, new languages, presets and feature ideas are very welcome: open an [issue](https://github.com/Tfoucher5/fuzzy-toolkit/issues) or a [discussion](https://github.com/Tfoucher5/fuzzy-toolkit/discussions). See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

Everyone who contributed is on the [Contributors page](https://tfoucher5.github.io/fuzzy-toolkit/contributors).

If fuzzy-toolkit saves you time, you can [support it on Ko-fi](https://ko-fi.com/theofoucher) or leave a star.

## License

MIT
