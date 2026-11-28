// `npx fuzzy-toolkit new-pack language pt` or `new-pack preset company-names`:
// writes a ready-to-publish package for a language pack or a preset, with its
// tests, so contributing one takes minutes. It never overwrites a folder.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CODE_RE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIRECTORY = 'https://tfoucher5.github.io/fuzzy-toolkit/extensions';
const GUIDE = 'https://tfoucher5.github.io/fuzzy-toolkit/guide/extensions';

const HELP = `Usage
  fuzzy-toolkit new-pack language <code>   A language pack, e.g. pt, pl, pt-br
  fuzzy-toolkit new-pack preset <name>     A preset, e.g. company-names

Writes the package in ./fuzzy-toolkit-lang-<code> or ./fuzzy-toolkit-preset-<name>
(--dir <path> to choose), with a test that checks it. Then: npm install, fill in
the TODOs, npm test, npm publish.`;

const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

function packageJson(name, description, keyword) {
  const range = `^${version}`;
  return `${JSON.stringify(
    {
      name,
      version: '0.1.0',
      description,
      type: 'module',
      exports: './index.js',
      files: ['index.js'],
      keywords: ['fuzzy-toolkit-plugin', keyword, 'fuzzy-toolkit'],
      license: 'MIT',
      peerDependencies: { 'fuzzy-toolkit': range },
      devDependencies: { 'fuzzy-toolkit': range },
      scripts: { test: 'node --test' },
    },
    null,
    2,
  )}\n`;
}

function language(code) {
  return {
    'index.js': `import { defineLanguage } from 'fuzzy-toolkit'

// Every field is optional: fill in what the language needs, delete the rest.
// Words are written lower-case and without accents (fuzzy-toolkit folds them first).
export default defineLanguage({
  code: '${code}',
  name: 'TODO: the language in English',
  version: '0.1.0',
  numbers: {
    // 0 to 19 in words, in order: ['zero', 'one', 'two', ...]
    units: [],
    // Tens from 0, in order: ['', '', 'twenty', 'thirty', ...]
    tens: [],
    // Other words worth a number: { hundred: 100 }
    words: {},
    // The word between tens and units, if any: 'and' in "twenty and one"
    // joiner: 'and',
  },
  // Removed from the start with strip: ['articles']
  articles: [],
  // Removed with stopwords: true
  stopwords: [],
  // Spellings that sound the same, for phonetic: true: [[/ph/g, 'f']]
  phonetic: [],
})
`,
    'index.test.js': `import test from 'node:test'
import { assertLanguage } from 'fuzzy-toolkit/testing'
import pack from './index.js'

// Each case is [input, expected]. Reviewers read these first: a dozen
// numbers, a few articles and stop words, and pairs that must and must not
// sound alike.
test('${code}', () => {
  assertLanguage(pack, {
    numbers: [
      // ['twenty one', '21'],
    ],
    articles: [
      // ['The Beatles', 'beatles'],
    ],
    stopwords: [
      // ['City of God', 'city god'],
    ],
    sounds: [
      // ['fone', 'phone'],
    ],
    distinct: [
      // ['cat', 'hat'],
    ],
  })
})
`,
    usage: `import ${identifier(code)} from 'fuzzy-toolkit-lang-${code}'\n\ncompare(a, b, { languages: ['en', ${identifier(code)}] })`,
  };
}

function preset(name) {
  return {
    'index.js': `import { definePreset } from 'fuzzy-toolkit'

export default definePreset({
  name: '${name}',
  description: 'TODO: what kind of data this preset is for, in one sentence.',
  version: '0.1.0',
  // Start from a built-in if it helps: 'music', 'search' or 'strict'.
  // extends: 'search',
  options: {
    // Words that never matter here: ['inc', 'ltd']
    ignoreWords: [],
    // Spellings to read the same: { '&': 'and' }
    replace: {},
  },
})
`,
    'index.test.js': `import test from 'node:test'
import { assertPreset } from 'fuzzy-toolkit/testing'
import pack from './index.js'

test('${name}', () => {
  assertPreset(pack, {
    // Pairs that must match with the preset
    matches: [
      // ['ACME Inc.', 'Acme'],
    ],
    // Pairs that must not match
    differs: [
      // ['Acme', 'Apex'],
    ],
    // [text, how the preset normalizes it]
    normalized: [
      // ['ACME Inc.', 'acme'],
    ],
  })
})
`,
    usage: `import ${identifier(name)} from 'fuzzy-toolkit-preset-${name}'\n\ncompare(a, b, { preset: ${identifier(name)} })`,
  };
}

function identifier(id) {
  return id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^[^a-z_$]/i, '_$&');
}

function readme(name, kind, usage) {
  return `# ${name}

A ${kind} for [fuzzy-toolkit](https://github.com/Tfoucher5/fuzzy-toolkit).

\`\`\`sh
npm install ${name}
\`\`\`

\`\`\`js
import { compare } from 'fuzzy-toolkit'
${usage}
\`\`\`

## Develop

\`\`\`sh
npm install
npm test
\`\`\`

The test uses [fuzzy-toolkit/testing](${GUIDE}#testing-your-pack): add the
cases the ${kind} must handle, then fill in \`index.js\` until they pass.

## Publish

\`\`\`sh
npm publish
\`\`\`

The keyword \`fuzzy-toolkit-plugin\` lists it in the [extensions directory](${DIRECTORY})
on the next rebuild. For the **Reviewed** badge, open a pull request that adds it
to \`docs/extensions.json\` in the fuzzy-toolkit repository.
`;
}

/** Writes the package; returns the folder, or throws a message for the user. */
export function createPack(kind, id, { dir, cwd = process.cwd() } = {}) {
  let name;
  let files;
  let description;
  if (kind === 'language' || kind === 'lang') {
    if (!CODE_RE.test(id ?? '')) throw new Error(`"${id}" is not a language code: use lower case, such as pt, pl or pt-br.`);
    name = `fuzzy-toolkit-lang-${id}`;
    description = `TODO language pack for fuzzy-toolkit: numbers in words, articles, stop words, sounds-alike rules.`;
    files = language(id);
    kind = 'language pack';
  } else if (kind === 'preset') {
    if (!NAME_RE.test(id ?? '')) throw new Error(`"${id}" is not a preset name: use lower-case words joined by dashes, such as company-names.`);
    name = `fuzzy-toolkit-preset-${id}`;
    description = 'TODO: fuzzy-toolkit preset for ...';
    files = preset(id);
  } else {
    throw new Error(HELP);
  }
  const keyword = kind === 'preset' ? 'fuzzy-toolkit-preset' : 'fuzzy-toolkit-language';
  const folder = resolve(cwd, dir ?? name);
  if (existsSync(folder)) throw new Error(`${folder} already exists: choose another place with --dir.`);
  mkdirSync(folder, { recursive: true });
  const { usage, ...code } = files;
  const all = {
    'package.json': packageJson(name, description, keyword),
    ...code,
    'README.md': readme(name, kind, usage),
    '.gitignore': 'node_modules\n',
  };
  for (const [file, content] of Object.entries(all)) writeFileSync(join(folder, file), content);
  return folder;
}

export function main(args) {
  const [kind, id, ...rest] = args;
  const at = rest.indexOf('--dir');
  if (kind === '--help' || kind === '-h') {
    console.log(HELP);
    return;
  }
  if (!id) {
    console.error(HELP);
    process.exitCode = 1;
    return;
  }
  try {
    const folder = createPack(kind, id, { dir: at === -1 ? undefined : rest[at + 1] });
    console.log(`Created ${folder}

Next:
  cd ${folder}
  npm install
  npm test        # add the cases the pack must handle, then make them pass
  npm publish

Guide: ${GUIDE}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
