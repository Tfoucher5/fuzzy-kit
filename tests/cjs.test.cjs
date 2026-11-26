const test = require('node:test');
const assert = require('node:assert/strict');
const { similarity, check } = require('../dist/cjs/index.js');

test('CommonJS build works', () => {
  assert.equal(similarity('Molière', 'moliere'), 100);
  assert.equal(check('beatles', 'The Beatles', { preset: 'music' }).correct, true);
});

test('CommonJS: string-similarity drop-in', () => {
  const stringSimilarity = require('../dist/cjs/compat/string-similarity.js');
  assert.equal(stringSimilarity.compareTwoStrings('healed', 'sealed'), 0.8);
  assert.equal(stringSimilarity.findBestMatch('healed', ['edward', 'sealed']).bestMatchIndex, 1);
});
