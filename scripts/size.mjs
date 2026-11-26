// Minified + gzipped size of what an app actually ships, per import.
// Run with `npm run size`.
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';

const cases = {
  'everything': `export * from './dist/esm/index.js'`,
  'similarity / isMatch': `export { similarity, isMatch } from './dist/esm/index.js'`,
  'check / checkAll (quiz)': `export { check, checkAll } from './dist/esm/index.js'`,
  'createIndex / search / highlight': `export { createIndex, search, highlight } from './dist/esm/index.js'`,
  'levenshtein / damerau': `export { levenshtein, damerau } from './dist/esm/index.js'`,
  'fuzzy-toolkit/string-similarity': `export * from './dist/esm/compat/string-similarity.js'`,
  'fuzzy-toolkit/react': `export * from './dist/esm/react.js'`,
};
console.log('import'.padEnd(36), 'min+gzip');
for (const [name, contents] of Object.entries(cases)) {
  const out = await build({
    stdin: { contents, resolveDir: process.cwd(), loader: 'js' },
    bundle: true, minify: true, write: false, format: 'esm', external: ['react'], logLevel: 'silent',
  });
  const size = gzipSync(out.outputFiles[0].contents, { level: 9 }).length;
  console.log(name.padEnd(36), `${(size / 1024).toFixed(1)} kB`);
}
