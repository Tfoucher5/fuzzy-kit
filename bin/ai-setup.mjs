// `npx fuzzy-toolkit ai-setup`: tells the AI assistants working in a project
// (Claude Code, Codex, Cursor, Copilot...) that it uses fuzzy-toolkit and which
// mistakes to avoid. Writes a short block into the instruction files they read.
// - It only writes when package.json lists fuzzy-toolkit (or with --force).
// - Running it again updates the block in place, unless someone edited the
//   block by hand: the start marker holds a hash of what was written, and a
//   block that no longer matches it is left alone (--force replaces it).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

const START = '<!-- fuzzy-toolkit:start';
const END = '<!-- fuzzy-toolkit:end -->';
const REFERENCE = 'https://tfoucher5.github.io/fuzzy-toolkit/llms.txt';

export const SNIPPET = `## fuzzy-toolkit

This project depends on \`fuzzy-toolkit\` for fuzzy string matching. Before importing it in a new place, look for where the project already calls it and go through that code.

- Scores go from 0 to 100, not 0 to 1: \`similarity(a, b) >= 80\`, never \`> 0.8\`. \`threshold\` is 0-100 too.
- \`closest()\` returns \`{ item, score, index, text }\` or \`undefined\`: use \`?.item\`.
- Options are an object in the last argument. Objects need \`keys\`.
- Reference: ${REFERENCE} (also in node_modules/fuzzy-toolkit/llms.txt when installed).`;

const TARGETS = {
  agents: { path: 'AGENTS.md', title: '# AGENTS.md' },
  claude: { path: 'CLAUDE.md', title: '# CLAUDE.md' },
  copilot: { path: '.github/copilot-instructions.md', title: '# Copilot instructions' },
  cursor: { path: '.cursor/rules/fuzzy-toolkit.mdc', whole: true },
};

const HELP = `fuzzy-toolkit ai-setup: tell AI assistants how to use fuzzy-toolkit in this project

Usage
  npx fuzzy-toolkit ai-setup [options]

Without options, updates the instruction files the project already has
(AGENTS.md, CLAUDE.md, .github/copilot-instructions.md, .cursor/), or creates
AGENTS.md when there is none. Running it again updates the block in place,
but never replaces a block someone edited by hand.

It only writes when package.json lists fuzzy-toolkit: install it first
(npm install fuzzy-toolkit), or pass --force.

Options
  --agents      AGENTS.md (Codex, Jules, Cursor, Copilot, Zed...)
  --claude      CLAUDE.md (Claude Code)
  --cursor      .cursor/rules/fuzzy-toolkit.mdc (Cursor)
  --copilot     .github/copilot-instructions.md (GitHub Copilot)
  --all         All of the above
  --dir <path>  Project folder (default: the current folder)
  --print       Print the block instead of writing files
  --force       Write even if package.json does not list fuzzy-toolkit, and
                replace a block edited by hand
  -h, --help    Show this help
`;

const CURSOR_HEADER = `---
description: How to do fuzzy string matching (similarity, did you mean, fuzzy search, dedupe, matching lists) with fuzzy-toolkit
alwaysApply: false
---
`;

/** What versions up to 2.5.0 wrote, without a hash: still safe to replace. */
const LEGACY = new Set([
  `## Fuzzy string matching: fuzzy-toolkit

This project uses \`fuzzy-toolkit\` for approximate string matching (typos, accents, case, word order, missing spaces, numbers written in words). Use it instead of adding string-similarity, fuse.js, leven, fastest-levenshtein or a hand-written Levenshtein.

\`\`\`ts
import { similarity, isMatch, closest, search, createIndex, dedupe, join, check, find, highlight } from 'fuzzy-toolkit'

similarity('stairway to heven', 'Stairway to Heaven') // 94.44 (0 to 100)
isMatch('Molière', 'moliere')                          // true (threshold 80)
closest('pari', ['Paris', 'Lyon'])?.item               // 'Paris' ("did you mean")
search('queen', songs, { keys: ['title', 'artist'], limit: 10 })
const index = createIndex(songs, { keys: ['title'], preset: 'search' }) // then index.search(q) on each keystroke
dedupe(names)                                          // drops near-duplicates
join(orders, customers, { left: 'customer', right: 'name', unique: true })
check('bohemian rapsody', 'Bohemian Rhapsody').verdict // 'correct' | 'close' | 'wrong'
\`\`\`

- Scores go from 0 to 100, not 0 to 1: \`similarity(a, b) >= 80\`, never \`> 0.8\`. \`threshold\` is 0-100 too.
- \`closest()\` returns \`{ item, score, index, text }\` or \`undefined\`: use \`?.item\`.
- Objects need \`keys\` (property names, dotted paths like \`'artist.name'\`, or weighted keys).
- Options are always an object in the last argument. Presets: \`music\`, \`search\`, \`strict\`.
- Full reference: \`node_modules/fuzzy-toolkit/llms.txt\` (short) and \`llms-full.txt\` (everything).`,
]);

const hash = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);

/** The block with its markers. The start marker records a hash of the content. */
export function block(snippet = SNIPPET) {
  return `${START} ${hash(snippet)} -->\n${snippet}\n${END}`;
}

/** Where the block is in a file and whether it is as written, or edited by hand. */
function findBlock(text) {
  const start = text.indexOf(START);
  const end = text.indexOf(END, start);
  if (start === -1 || end === -1) return undefined;
  const open = text.indexOf('-->', start);
  if (open === -1 || open > end) return undefined;
  const recorded = text.slice(start + START.length, open).trim();
  const content = text.slice(open + 3, end).replace(/^\r?\n/, '').replace(/\r?\n$/, '');
  const pristine = recorded ? recorded === hash(content) : LEGACY.has(content.replace(/\r\n/g, '\n'));
  return { start, end: end + END.length, pristine };
}

/**
 * Inserts or replaces the block, leaving the rest of the file alone. Returns
 * undefined when the block was edited by hand (unless `force`).
 */
export function upsertBlock(existing, snippet = SNIPPET, force = false) {
  const found = findBlock(existing);
  if (found) {
    if (!found.pristine && !force) return undefined;
    return existing.slice(0, found.start) + block(snippet) + existing.slice(found.end);
  }
  const base = existing.replace(/\s*$/, '');
  return base === '' ? `${block(snippet)}\n` : `${base}\n\n${block(snippet)}\n`;
}

/** Writes the block into each target; returns what it did, one line per file. */
export function setup(dir, names, { force = false } = {}) {
  const done = [];
  for (const name of names) {
    const target = TARGETS[name];
    const path = join(dir, target.path);
    const label = target.path;
    const existed = existsSync(path);
    const before = existed ? readFileSync(path, 'utf8') : '';
    let after;
    if (!existed) after = upsertBlock(target.whole ? CURSOR_HEADER : `${target.title}\n`);
    // Versions up to 2.5.0 wrote the Cursor rule as a whole file, without markers.
    else if (target.whole && !findBlock(before)) after = before === legacyCursorRule() || force ? upsertBlock(CURSOR_HEADER) : undefined;
    else after = upsertBlock(before, SNIPPET, force);
    if (after === undefined) {
      done.push(`kept     ${label} (the fuzzy-toolkit block was edited by hand; --force replaces it)`);
      continue;
    }
    if (after === before) {
      done.push(`unchanged ${label}`);
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, after);
    done.push(`${existed ? 'updated' : 'created'}  ${label}`);
  }
  return done;
}

function legacyCursorRule() {
  return `${CURSOR_HEADER}\n${[...LEGACY][0]}\n`;
}

/** True when the project's package.json lists fuzzy-toolkit. */
export function isDependency(dir) {
  const path = join(dir, 'package.json');
  if (!existsSync(path)) return false;
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return false;
  }
  return ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].some(
    (field) => pkg?.[field] && Object.prototype.hasOwnProperty.call(pkg[field], 'fuzzy-toolkit'),
  );
}

/** The targets a project already uses, or AGENTS.md when it has none. */
export function detect(dir) {
  const found = Object.keys(TARGETS).filter((name) =>
    name === 'cursor' ? existsSync(join(dir, '.cursor')) : existsSync(join(dir, TARGETS[name].path)),
  );
  return found.length ? found : ['agents'];
}

export function main(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        agents: { type: 'boolean' },
        claude: { type: 'boolean' },
        cursor: { type: 'boolean' },
        copilot: { type: 'boolean' },
        all: { type: 'boolean' },
        dir: { type: 'string' },
        print: { type: 'boolean' },
        force: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    }));
  } catch (error) {
    process.stderr.write(`fuzzy-toolkit: ${error.message}\nRun "fuzzy-toolkit ai-setup --help" for usage.\n`);
    process.exit(1);
  }
  if (values.help) return void process.stdout.write(HELP);
  if (values.print) return void process.stdout.write(`${SNIPPET}\n`);
  const dir = values.dir ?? process.cwd();
  if (!existsSync(dir)) {
    process.stderr.write(`fuzzy-toolkit: no folder "${dir}"\n`);
    process.exit(1);
  }
  if (!values.force && !isDependency(dir)) {
    process.stderr.write(
      `fuzzy-toolkit: ${join(dir, 'package.json')} does not list fuzzy-toolkit, so nothing was written.\n` +
        'Install it first (npm install fuzzy-toolkit), or pass --force to write the notes anyway.\n',
    );
    process.exit(1);
  }
  const chosen = values.all ? Object.keys(TARGETS) : Object.keys(TARGETS).filter((name) => values[name]);
  const lines = setup(dir, chosen.length ? chosen : detect(dir), { force: values.force });
  process.stdout.write(`${lines.join('\n')}\n`);
}
