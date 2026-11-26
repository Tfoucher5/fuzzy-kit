// The language packs shipped as fuzzy-toolkit/lang/<code>.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compare, normalize } from '../dist/esm/index.js';
import de from '../dist/esm/lang/de.js';
import es from '../dist/esm/lang/es.js';
import it from '../dist/esm/lang/it.js';
import { assertLanguage } from '../dist/esm/testing.js';

/** [input, normalized] with the pack, pairs that must sound alike and pairs that must not. */
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
    distinct: [['pato', 'gato'], ['casa', 'cosa']],
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
    distinct: [['Haus', 'Maus'], ['Bach', 'Buch']],
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
    distinct: [['pane', 'cane'], ['sole', 'sale']],
  },
};

for (const [code, { pack, ...cases }] of Object.entries(PACKS)) {
  test(`${code}: pack metadata`, () => {
    assert.equal(pack.code, code);
    assert.equal(pack.kind, 'language');
    assert.ok(Object.isFrozen(pack));
  });
  // The same kit contributors use for their own packs.
  test(`${code}: numbers, articles, stop words and sounds`, () => assertLanguage(pack, cases));
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
