// Runs the ESM build on other runtimes (Bun, Deno) in CI: no test runner, no
// Node APIs, only the package itself. `bun tests/runtimes/smoke.mjs`,
// `deno run --allow-read tests/runtimes/smoke.mjs`.
import { check, closest, createIndex, dedupe, find, highlight, levenshtein, similarity } from '../../dist/esm/index.js';
import stringSimilarity from '../../dist/esm/compat/string-similarity.js';
import es from '../../dist/esm/lang/es.js';

const runtime = globalThis.Deno ? `Deno ${Deno.version.deno}` : globalThis.Bun ? `Bun ${Bun.version}` : 'Node';
let failed = 0;
function expect(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
}

expect('similarity', similarity('Molière', 'moliere'), 100);
expect('check', check('bohemian rapsody', 'Bohemian Rhapsody').verdict, 'correct');
expect('closest', closest('pyhton', ['python', 'java'])?.item, 'python');
expect('dedupe', dedupe(['Beyoncé', 'beyonce', 'Adele']), ['Beyoncé', 'Adele']);
expect('find', find("c'est bohemian rapsody", 'Bohemian Rhapsody')[0]?.start, 6);
expect('highlight', highlight('Bohemian Rhapsody', 'bohem')[0], { text: 'Bohem', match: true });
expect('index', createIndex(['New York', 'Newark'], { preset: 'search' }).search('new yo')[0]?.item, 'New York');
expect('levenshtein', levenshtein('kitten', 'sitting'), 3);
expect('language pack', similarity('treinta y dos', '32', { languages: [es] }), 100);
expect('string-similarity', stringSimilarity.compareTwoStrings('healed', 'sealed'), 0.8);

console.log(`${runtime}: ${failed ? `${failed} failed` : 'all passed'}`);
if (failed) throw new Error(`${failed} check(s) failed on ${runtime}`);
