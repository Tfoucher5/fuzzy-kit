// The language coverage table in the docs is generated: it must match what the packs read today.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { markdown } from '../scripts/language-coverage.mjs';

test('docs: language coverage table is up to date (npm run languages:coverage)', () => {
  const committed = readFileSync(new URL('../docs/.vitepress/language-coverage.md', import.meta.url), 'utf8');
  assert.equal(committed.replace(/\r\n/g, '\n'), markdown());
});
