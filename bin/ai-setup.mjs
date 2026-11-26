// `npx fuzzy-toolkit ai-setup`: tells the AI assistants working in a project
// (Claude Code, Codex, Cursor, Copilot...) that it uses fuzzy-toolkit, how to
// call it and which mistakes to avoid. Writes a short block into the
// instruction files they read; running it again updates the block in place.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { parseArgs } from 'node:util';

const START = '<!-- fuzzy-toolkit:start -->';
const END = '<!-- fuzzy-toolkit:end -->';

export const SNIPPET = `## Fuzzy string matching: fuzzy-toolkit

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
- Full reference: \`node_modules/fuzzy-toolkit/llms.txt\` (short) and \`llms-full.txt\` (everything).`;

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
AGENTS.md when there is none. Running it again updates the block in place.

Options
  --agents      AGENTS.md (Codex, Jules, Cursor, Copilot, Zed...)
  --claude      CLAUDE.md (Claude Code)
  --cursor      .cursor/rules/fuzzy-toolkit.mdc (Cursor)
  --copilot     .github/copilot-instructions.md (GitHub Copilot)
  --all         All of the above
  --dir <path>  Project folder (default: the current folder)
  --print       Print the block instead of writing files
  -h, --help    Show this help
`;

function cursorRule() {
  return `---
description: How to do fuzzy string matching (similarity, did you mean, fuzzy search, dedupe, matching lists) with fuzzy-toolkit
alwaysApply: false
---

${SNIPPET}
`;
}

/** Inserts or replaces the block between the markers, leaving the rest of the file alone. */
export function upsertBlock(existing, snippet = SNIPPET) {
  const block = `${START}\n${snippet}\n${END}`;
  const start = existing.indexOf(START);
  const end = existing.indexOf(END);
  if (start !== -1 && end > start) return existing.slice(0, start) + block + existing.slice(end + END.length);
  const base = existing.replace(/\s*$/, '');
  return base === '' ? `${block}\n` : `${base}\n\n${block}\n`;
}

/** Writes the block into each target; returns what it did, one line per file. */
export function setup(dir, names) {
  const done = [];
  for (const name of names) {
    const target = TARGETS[name];
    const path = join(dir, target.path);
    const existed = existsSync(path);
    const before = existed ? readFileSync(path, 'utf8') : '';
    const after = target.whole ? cursorRule() : upsertBlock(existed ? before : `${target.title}\n`);
    const label = relative(dir, path) || target.path;
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
  const chosen = values.all ? Object.keys(TARGETS) : Object.keys(TARGETS).filter((name) => values[name]);
  const lines = setup(dir, chosen.length ? chosen : detect(dir));
  process.stdout.write(`${lines.join('\n')}\nAI assistants in this project now know how to use fuzzy-toolkit.\n`);
}
