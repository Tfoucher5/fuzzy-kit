// Minified + gzipped size of what an app actually ships, per import.
// Run with `npm run size`. `npm run size:check` fails when an import goes
// over its budget in scripts/size-budget.json: raising a budget is fine when
// the feature is worth it, but it has to be a decision made in the PR.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const check = process.argv.includes('--check');
const budget = JSON.parse(readFileSync(new URL('./size-budget.json', import.meta.url), 'utf8'));
const over = [];

const cases = {
  'everything': `export * from './dist/esm/index.js'`,
  'similarity / isMatch': `export { similarity, isMatch } from './dist/esm/index.js'`,
  'check / checkAll (quiz)': `export { check, checkAll } from './dist/esm/index.js'`,
  'createMatcher (every method)': `export { createMatcher } from './dist/esm/index.js'`,
  'createIndex / search / highlight': `export { createIndex, search, highlight } from './dist/esm/index.js'`,
  'levenshtein / damerau': `export { levenshtein, damerau } from './dist/esm/index.js'`,
  'fuzzy-toolkit/string-similarity': `export * from './dist/esm/compat/string-similarity.js'`,
  'fuzzy-toolkit/react': `export * from './dist/esm/react.js'`,
  'one extra language (lang/es)': `export { default } from './dist/esm/lang/es.js'`,
};
console.log('import'.padEnd(36), 'min+gzip', check ? '  budget' : '');
for (const [name, contents] of Object.entries(cases)) {
  const out = await build({
    stdin: { contents, resolveDir: process.cwd(), loader: 'js' },
    bundle: true, minify: true, write: false, format: 'esm', external: ['react'], logLevel: 'silent',
  });
  const size = gzipSync(out.outputFiles[0].contents, { level: 9 }).length;
  const kb = size / 1024;
  const max = budget[name];
  if (check && (max === undefined || kb > max)) over.push(`${name}: ${kb.toFixed(2)} kB, budget ${max ?? 'missing'} kB`);
  console.log(name.padEnd(36), `${kb.toFixed(1)} kB`.padStart(8), check ? `${String(max ?? '?').padStart(5)} kB` : '');
}
if (over.length > 0) {
  console.error(`\nOver budget (scripts/size-budget.json):\n  ${over.join('\n  ')}`);
  process.exit(1);
}
