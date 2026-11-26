# Languages and presets

fuzzy-toolkit reads text in **languages** (numbers in words, articles, stop
words, phonetic rules) and starts from **presets** (ready-made options for one
kind of data). English, French and the `music`, `search` and `strict` presets
are built in. Anyone can write more, publish them on npm and share them.

## Using a language

```js
import { normalize, compare } from 'fuzzy-toolkit'
import es from 'fuzzy-toolkit/lang/es'

normalize('treinta y dos', { languages: [es] })            // '32'
normalize('two dos', { languages: ['en', es] })             // '2 2'
compare('bamos', 'Vamos', { languages: [es], phonetic: true })
```

| Language | Import | Numbers | Phonetic |
| --- | --- | --- | --- |
| English | `'en'` (built in) | `twenty one`, `first` | shared with French |
| French | `'fr'` (built in) | `quatre vingt dix`, `premier`, `2eme` | shared with English |
| Spanish | `fuzzy-toolkit/lang/es` | `treinta y dos`, `veintiuno`, `segunda` → `2º` | b/v, c/s/z, silent h, ll/y |
| German | `fuzzy-toolkit/lang/de` | `einundzwanzig`, `dreißig`, `zweite` | ue/ü, v/f, w/v, z/ts, ei/ai/ey |
| Italian | `fuzzy-toolkit/lang/it` | `ventitré`, `quarantotto`, `seconda` → `2º` | c/ch/k, gli/li, gn, z/ts |
| Dutch | `fuzzy-toolkit/lang/nl` | `eenentwintig`, `een en twintig`, `tweede` | ij/ei, au/ou, v/f, z/s, ch/g, final d/t |

Numbers are read from 0 to 99, plus 100. Community packs for other languages
are published on npm as `fuzzy-toolkit-lang-<code>`.

- Without `languages`, English and French are active, as in every earlier version.
- English and French can be named by their code: `'en'`, `'fr'`. The other
  packs are imported, so a bundle only carries the languages it uses.
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
packs are good examples: `fuzzy-toolkit/lang/en`, `/fr`, `/es`, `/de`, `/it` and `/nl`
([source](https://github.com/Tfoucher5/fuzzy-toolkit/tree/master/src/lang)).

## Testing your pack

`fuzzy-toolkit/testing` checks a pack against the cases you expect, with any
test runner (node:test, Vitest, Jest...). `assertLanguage()` throws one error
that lists every case that fails and what came out instead:

```js
import test from 'node:test'
import { assertLanguage } from 'fuzzy-toolkit/testing'
import pt from './index.js'

test('Portuguese', () => {
  assertLanguage(pt, {
    numbers: [['vinte e um', '21'], ['cem', '100']],   // read as digits
    articles: [['Os Mutantes', 'mutantes']],             // with strip: ['articles']
    stopwords: [['Cidade de Deus', 'cidade deus']],      // with stopwords: true
    sounds: [['kasa', 'casa']],                          // must match with phonetic: true
    distinct: [['pato', 'gato']],                        // must not match, even by sound
  })
})
```

```text
Error: [fuzzy-toolkit] Language "pt": 2 problems
  numbers: "cem" gives "cem", expected "100".
  sounds: "kasa" and "casa" should match (score 75).
```

It also checks the pack itself (a valid `code`, a `name`) and that normalized
text stays the same when normalized again. Presets work the same way:

```js
import { assertPreset } from 'fuzzy-toolkit/testing'

assertPreset(companyNames, {
  matches: [['ACME Inc.', 'Acme']],
  differs: [['Acme', 'Apex']],
  normalized: [['ACME Inc.', 'acme']],
})
```

`checkLanguage()` and `checkPreset()` return the problems as an array instead
of throwing. A good set of cases is what reviewers look at first: a dozen
numbers, a few articles and stop words, and pairs that must and must not
sound alike.

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
