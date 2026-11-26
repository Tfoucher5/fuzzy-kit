// fuzzy-toolkit/testing: the kit for people who write language packs and presets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { defineLanguage, definePreset } from '../dist/esm/index.js';
import en from '../dist/esm/lang/en.js';
import { assertLanguage, assertPreset, checkLanguage, checkPreset } from '../dist/esm/testing.js';

const toki = defineLanguage({
  code: 'tok',
  name: 'Toki Pona',
  numbers: { units: ['ala', 'wan', 'tu'] },
  articles: ['jan'],
  stopwords: ['e', 'li'],
  phonetic: [[/k/g, 'g']],
});

test('a good pack has no problems', () => {
  const cases = {
    numbers: [['wan tu', '1 2']],
    articles: [['jan Sonja', 'sonja']],
    stopwords: [['moku li pona', 'moku pona']],
    sounds: [['kala', 'gala']],
    distinct: [['kala', 'pona']],
  };
  assert.deepEqual(checkLanguage(toki, cases), []);
  assertLanguage(toki, cases);
});

test('every failing case is reported, with what came out', () => {
  const problems = checkLanguage(toki, {
    numbers: [['tu', '3']],
    sounds: [['kala', 'pona']],
    distinct: [['kala', 'gala']],
  });
  assert.deepEqual(
    problems.map((p) => p.check),
    ['numbers', 'sounds', 'distinct'],
  );
  assert.match(problems[0].message, /"tu" gives "2", expected "3"/);
  assert.match(problems[1].message, /should match \(score \d+\)/);
  assert.match(problems[2].message, /should not match/);
});

test('assertLanguage throws one error listing all problems', () => {
  assert.throws(
    () => assertLanguage(toki, { numbers: [['tu', '3'], ['wan', '4']] }),
    (error) => /Language "tok": 2 problems/.test(error.message) && /"wan" gives "1"/.test(error.message),
  );
});

test('a definition is checked like defineLanguage() would', () => {
  assert.deepEqual(checkLanguage({ code: 'xx', name: 'X', articles: ['a'] }, { articles: [['a b', 'b']] }), []);
  const [problem] = checkLanguage({ code: 'Spanish' });
  assert.equal(problem.check, 'pack');
  assert.match(problem.message, /"code" must be a lower-case language code/);
  assert.match(checkLanguage({ code: 'xx' })[0].message, /add a "name"/);
});

test('malformed cases are reported, not thrown', () => {
  const problems = checkLanguage(toki, { numbers: [['wan']], sounds: 'kala' });
  assert.equal(problems.length, 2);
});

test('the built-in packs pass', () => {
  assertLanguage(en, { numbers: [['twenty one', '21'], ['the third man', 'the 3rd man']] });
});

const companies = definePreset({
  name: 'company-names',
  description: 'Company names without legal forms.',
  options: { ignoreWords: ['inc', 'ltd'], replace: { '&': 'and' } },
});

test('presets: matches, differences and normalized text', () => {
  const cases = {
    matches: [['ACME Inc.', 'Acme'], ['Smith & Sons', 'Smith and Sons']],
    differs: [['Acme', 'Apex Ltd']],
    normalized: [['ACME Inc.', 'acme']],
  };
  assert.deepEqual(checkPreset(companies, cases), []);
  assertPreset(companies, cases);
  assert.throws(() => assertPreset(companies, { differs: [['ACME Inc.', 'Acme']] }), /Preset "company-names": 1 problem\n {2}differs/);
});

test('presets: a definition is accepted, a missing description is reported', () => {
  assert.match(checkPreset({ name: 'x', options: {} })[0].message, /add a "description"/);
  assert.equal(checkPreset({ name: 'Bad Name', options: {} })[0].check, 'pack');
});
