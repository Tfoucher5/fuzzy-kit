// Writes llms-full.txt: llms.txt followed by the whole documentation, in one
// file that AI assistants can read at once. Also copies both files into
// docs/public so the documentation site serves them at its root.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const pages = [
  'guide/getting-started',
  'guide/options',
  'guide/extensions',
  'guide/how-it-works',
  'recipes/quiz',
  'recipes/search',
  'recipes/did-you-mean',
  'recipes/find-in-text',
  'recipes/data-cleaning',
  'recipes/cli',
  'recipes/ai-agents',
  'api/index',
  'guide/migration',
];

const site = 'https://tfoucher5.github.io/fuzzy-toolkit/';
const strip = (markdown) =>
  markdown
    .replace(/^---\n[\s\S]*?\n---\n/, '') // front matter
    .replace(/^:::\s*(\w+)?\s*(.*)$/gm, (_, kind, title) => (kind ? `**${title || kind}**` : '')) // containers
    .replace(/\]\(\/([^)]*)\)/g, `](${site}$1)`) // site links become absolute
    .trim();

const parts = [readFileSync('llms.txt', 'utf8').trim(), '# Full documentation'];
for (const page of pages) {
  const path = `${site}${page.replace(/index$/, '')}`;
  parts.push(`<!-- ${path} -->\n\n${strip(readFileSync(`docs/${page}.md`, 'utf8'))}`);
}
writeFileSync('llms-full.txt', `${parts.join('\n\n')}\n`);
mkdirSync('docs/public', { recursive: true });
copyFileSync('llms.txt', 'docs/public/llms.txt');
copyFileSync('llms-full.txt', 'docs/public/llms-full.txt');
