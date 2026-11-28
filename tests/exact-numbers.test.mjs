import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { check, createIndex, dedupe, join, loadIndex, similarity, standardize } from '../dist/esm/index.js';

const exact = { exactNumbers: true };

test('exactNumbers: texts whose numbers differ never match', () => {
  assert.deepEqual(dedupe(['10 Downing Street', '11 Downing Street', '10 downing street!'], exact), ['10 Downing Street', '11 Downing Street']);
  assert.equal(similarity('2024-01-05', '2024-05-01', exact), 0);
  assert.equal(similarity('Apollo two', 'Apollo 2', exact), 100);
  assert.equal(check('Apollo 11', 'Apollo 13', exact).verdict, 'wrong');
  assert.deepEqual(standardize(['Lyon 2e', 'Lyon 2e', 'Lyon 3e'], exact), ['Lyon 2e', 'Lyon 2e', 'Lyon 3e']);
  const rows = join(['iphone 15'], ['iPhone 14', 'iPhone 15'], exact);
  assert.equal(rows[0].match.item, 'iPhone 15');
});

test('exactNumbers: off by default, and saved indexes keep their key', () => {
  assert.equal(similarity('2024-01-05', '2024-05-01'), 100);
  const saved = JSON.parse(JSON.stringify(createIndex(['a 1'], { preset: 'search' })));
  assert.equal(saved.options.includes('exactNumbers'), false);
  assert.equal(loadIndex(['a 1'], saved, { preset: 'search', exactNumbers: false }).search('a 1').length, 1);
});

test('exactNumbers: --exact-numbers on the command line', () => {
  const out = execFileSync(process.execPath, ['bin/fuzzy-toolkit.mjs', 'dedupe', '-', '--exact-numbers'], {
    input: '10 Downing Street\n11 Downing Street\n',
    encoding: 'utf8',
  });
  assert.deepEqual(out.trim().split(/\r?\n/), ['10 Downing Street', '11 Downing Street']);
});
