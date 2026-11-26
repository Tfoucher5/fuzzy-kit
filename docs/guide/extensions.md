# Languages and presets

fuzzy-toolkit reads text in **languages** (numbers in words, articles, stop
words, phonetic rules) and starts from **presets** (ready-made options for one
kind of data). English, French and the `music`, `search` and `strict` presets
are built in. Anyone can write more, publish them on npm and share them.

## Using a language

```js
import { normalize, compare } from 'fuzzy-toolkit'
import es from 'fuzzy-toolkit-lang-es' // a community pack

normalize('treinta y dos', { languages: [es] })            // '32'
normalize('two dos', { languages: ['en', es] })             // '2 2'
compare('bamos', 'Vamos', { languages: [es], phonetic: true })
```

- Without `languages`, English and French are active, as in every earlier version.
- Built-in languages can be named by their code: `'en'`, `'fr'`.
- When two languages read the same word, the one that reads the most words
  wins, then the first in the list.
- `strip: ['articles']` removes the articles of the active languages. Without
  `languages`, it also removes the Spanish, Italian and German ones, as before.
- `stopwords: true` ignores the stop words of the active languages.

## Using a preset

```js
import { definePreset, compare, dedupe } from 'fuzzy-toolkit'

const companies = definePreset({
  name: 'company-names',
  description: 'Company names: ignores legal forms and "&".',
  options: {
    ignoreWords: ['inc', 'ltd', 'llc', 'sa', 'sarl', 'gmbh'],
    replace: { '&': 'and' },
  },
})

compare('ACME Inc.', 'acme', { preset: companies })     // 100
dedupe(customers, { keys: 'name', preset: companies })
```

Your own options always win over the preset's. `replace` tables are merged and
`stripPatterns` add up.

A preset can start from another one with `extends`, built-in or not:

```js
const kpop = definePreset({
  name: 'kpop',
  extends: 'music',
  options: { replace: { bts: 'bangtan boys' } },
})
```

It can also choose its languages: `options: { languages: ['en', es] }`.

From the command line, pass a package name or a file:

```sh
npx fuzzy-toolkit dedupe companies.csv -p ./company-names.js --lang fr
```

## Writing a language pack

```js
import { defineLanguage } from 'fuzzy-toolkit'

export default defineLanguage({
  code: 'es',               // ISO 639-1, lower case: 'es', 'pt-br'
  name: 'Spanish',
  version: '1.0.0',
  numbers: {
    units: ['cero', 'uno', 'dos', 'tres', /* ... up to 19 */],
    tens: ['', '', 'veinte', 'treinta', 'cuarenta', /* ... */],
    words: { una: 1, veintiuno: 21, veintidos: 22 }, // compounds written as one word
    ordinals: ['', 'primero', 'segundo', 'tercero'],
    ordinalWords: { primera: 1, segunda: 2 },
    joiner: 'y',            // treinta y dos = 32
  },
  articles: ['el', 'la', 'los', 'las'],
  elisions: [],             // French has ['l'] for l'amour
  stopwords: ['de', 'del', 'y', 'o'],
  phonetic: [
    [/v/g, 'b'],            // vamos = bamos
    [/ll/g, 'y'],
    [/h/g, ''],
  ],
  replace: {},              // abbreviations always applied, rarely needed
})
```

Everything works on **normalized** text: lower case, accents removed,
punctuation turned into spaces. Write `dieciseis`, not `dieciséis`.

| Field | What it does |
| --- | --- |
| `numbers.units` | Words for 0 to 19, the index is the value. |
| `numbers.tens` | Words for tens, the index × 10 is the value. |
| `numbers.words` / `ordinalWords` | More words with their value. |
| `numbers.joiner` | Word between tens and units (`y`, `und`...). |
| `numbers.ordinalSuffixes` | Suffixes that make digits an ordinal (`2eme` → `2e`). |
| `numbers.formatOrdinal` | How an ordinal is written once read: `n => n + 'º'`. |
| `numbers.read` | Your own reader for grammars the tables can't express, such as French `quatre vingt dix`. Gets the words and a position, returns `[value, wordsUsed]`. |
| `articles` / `elisions` | Removed at the start of a text by `strip: ['articles']`. |
| `stopwords` | Ignored with `stopwords: true`. |
| `phonetic` | `[RegExp, replacement]` rules, applied in order to each word with `phonetic: true`. |

`defineLanguage()` checks the pack and explains what is wrong. The built-in
packs are good examples: `fuzzy-toolkit/lang/en` and `fuzzy-toolkit/lang/fr`
([source](https://github.com/Tfoucher5/fuzzy-toolkit/tree/master/src/lang)).

## Publishing

Name the package `fuzzy-toolkit-lang-<code>` or `fuzzy-toolkit-preset-<name>`,
add the keyword `fuzzy-toolkit-plugin` to `package.json`, and declare
fuzzy-toolkit as a peer dependency:

```json
{
  "name": "fuzzy-toolkit-preset-company-names",
  "keywords": ["fuzzy-toolkit-plugin", "fuzzy-toolkit-preset"],
  "peerDependencies": { "fuzzy-toolkit": "^2.2.0" }
}
```

Packs are plain frozen objects: nothing is registered globally, two libraries
can use different packs side by side, and bundlers drop what you don't import.
Each pack records the version of the extension API it was written for
(`apiVersion: 1`); a pack for another version is refused with a clear error.

Saved indexes (`index.toJSON()`) record the code and version of each language
and the source of each pattern, so `loadIndex()` refuses an index built with
other packs.
