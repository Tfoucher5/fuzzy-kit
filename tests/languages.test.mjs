// The language packs shipped as fuzzy-toolkit/lang/<code>.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compare, normalize } from '../dist/esm/index.js';
import de from '../dist/esm/lang/de.js';
import es from '../dist/esm/lang/es.js';
import it from '../dist/esm/lang/it.js';

/** [input, normalized] with the pack, and pairs that must sound alike. */
const PACKS = {
  es: {
    pack: es,
    numbers: [
      ['treinta y dos', '32'], ['veintiuno', '21'], ['veintitres', '23'], ['diecisiete', '17'], ['cero', '0'],
      ['noventa y nueve', '99'], ['cien', '100'], ['la segunda vez', 'la 2º vez'], ['1ª', '1º'], ['primer amor', '1º amor'],
      ['Rocky IV', 'rocky 4'],
    ],
    articles: [['Los Lobos', 'lobos'], ['La Oreja de Van Gogh', 'oreja de van gogh'], ['Un Verano Sin Ti', 'verano sin ti']],
    stopwords: [['Casa de Papel', 'casa papel']],
    sounds: [['bamos', 'vamos'], ['jente', 'gente'], ['kaballo', 'caballo'], ['yuvia', 'lluvia'], ['ola', 'hola'], ['sapato', 'zapato']],
  },
  de: {
    pack: de,
    numbers: [
      ['einundzwanzig', '21'], ['ein und zwanzig', '21'], ['zweiunddreißig', '32'], ['neunundneunzig', '99'],
      ['dreißig', '30'], ['fünf', '5'], ['Zwölf Affen', '12 affen'], ['der zweite Weg', 'der 2 weg'], ['hundert', '100'],
    ],
    articles: [['Die Ärzte', 'arzte'], ['Der Untergang', 'untergang'], ['Das Boot', 'boot']],
    stopwords: [['Herr der Ringe', 'herr ringe']],
    sounds: [['Mueller', 'Müller'], ['Schmitt', 'Schmidt'], ['Fogel', 'Vogel'], ['Mayer', 'Meier'], ['Maier', 'Meyer']],
  },
  it: {
    pack: it,
    numbers: [
      ['ventitré', '23'], ['ventuno', '21'], ['ventotto', '28'], ['quarantotto', '48'], ['trentuno', '31'],
      ['novantanove', '99'], ['diciassette', '17'], ['cento', '100'], ['la seconda volta', 'la 2º volta'],
    ],
    articles: [["L'amica geniale", 'amica geniale'], ['Il Volo', 'volo'], ['Gli Uccelli', 'uccelli']],
    stopwords: [['La Vita è Bella', 'vita bella'], ['Nel blu dipinto di blu', 'blu dipinto blu']],
    sounds: [['kiesa', 'chiesa'], ['pitsa', 'pizza'], ['familia', 'famiglia'], ['latsio', 'Lazio']],
  },
};

for (const [code, { pack, numbers, articles, stopwords, sounds }] of Object.entries(PACKS)) {
  test(`${code}: pack metadata`, () => {
    assert.equal(pack.code, code);
    assert.equal(pack.kind, 'language');
    assert.ok(Object.isFrozen(pack));
  });
  test(`${code}: numbers in words`, () => {
    for (const [input, expected] of numbers) assert.equal(normalize(input, { languages: [pack] }), expected, input);
  });
  test(`${code}: leading articles`, () => {
    for (const [input, expected] of articles) {
      assert.equal(normalize(input, { languages: [pack], strip: ['articles'] }), expected, input);
    }
  });
  test(`${code}: stop words`, () => {
    for (const [input, expected] of stopwords) {
      assert.equal(normalize(input, { languages: [pack], stopwords: true }), expected, input);
    }
  });
  test(`${code}: spelled by ear`, () => {
    for (const [a, b] of sounds) assert.equal(compare(a, b, { languages: [pack], phonetic: true }).match, true, `${a} / ${b}`);
  });
}

test('packs combine: Spanish and English numbers together', () => {
  assert.equal(normalize('two dos', { languages: ['en', es] }), '2 2');
});

test('a pack by its code points to the import', () => {
  assert.throws(() => normalize('dos', { languages: ['es'] }), /import es from 'fuzzy-toolkit\/lang\/es'/);
});

test('default languages are unchanged: Spanish words stay words', () => {
  assert.equal(normalize('treinta y dos'), 'treinta y dos');
  assert.equal(normalize('einundzwanzig'), 'einundzwanzig');
});

test('cli: --lang es, de and it load the packs', async () => {
  const { execFileSync } = await import('node:child_process');
  const cli = new URL('../bin/fuzzy-toolkit.mjs', import.meta.url).pathname;
  const score = (args) => JSON.parse(execFileSync(process.execPath, [cli, 'compare', ...args, '--json'], { encoding: 'utf8' })).score;
  assert.equal(score(['treinta y dos', '32', '--lang', 'es']), 100);
  assert.equal(score(['einundzwanzig', '21', '--lang', 'de']), 100);
  assert.equal(score(['ventitre', '23', '--lang', 'it,en']), 100);
});
