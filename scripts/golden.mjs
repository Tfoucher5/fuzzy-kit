// Computes the golden results (tests/golden/results.json) from the build.
// `npm run golden:update` rewrites them; tests/golden.test.mjs compares.
import { writeFileSync } from 'node:fs';
import { compare, normalize, search } from '../dist/esm/index.js';
import { LIST, OPTIONS, PAIRS, QUERIES } from '../tests/golden/cases.mjs';

export const RESULTS = new URL('../tests/golden/results.json', import.meta.url);

export function compute() {
  const out = {};
  for (const [name, options] of Object.entries(OPTIONS)) {
    out[name] = {
      pairs: PAIRS.map(([a, b]) => `${normalize(a, options)} | ${normalize(b, options)} | ${compare(a, b, options).score}`),
      search: QUERIES.map((q) => `${q}: ${search(q, LIST, { ...options, limit: 3 }).map((m) => `${m.item} ${m.score}`).join(', ')}`),
    };
  }
  return out;
}

if (process.argv.includes('--update')) {
  writeFileSync(RESULTS, `${JSON.stringify(compute(), null, 2)}\n`);
  console.log(`Wrote ${RESULTS.pathname}`);
}
