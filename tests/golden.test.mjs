// Every score of tests/golden/cases.mjs must stay the same. A change in
// results is a decision: run `npm run golden:update` and explain it in the PR.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compute, RESULTS } from '../scripts/golden.mjs';

test('golden results: scores did not change', () => {
  const expected = JSON.parse(readFileSync(RESULTS, 'utf8'));
  const actual = compute();
  for (const name of Object.keys(expected)) {
    for (const kind of ['pairs', 'search']) {
      const changed = expected[name][kind]
        .map((line, i) => [line, actual[name]?.[kind]?.[i]])
        .filter(([before, now]) => before !== now)
        .map(([before, now]) => `  - ${before}\n  + ${now}`);
      assert.equal(changed.length, 0, `${name} ${kind} changed (npm run golden:update if intended):\n${changed.join('\n')}`);
    }
  }
  assert.deepEqual(Object.keys(actual), Object.keys(expected), 'option sets changed: npm run golden:update');
});
