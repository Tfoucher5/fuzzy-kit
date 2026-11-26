// Spanish. Import it and pass it in `languages`:
//   import es from 'fuzzy-toolkit/lang/es'
//   compare('treinta y dos', '32', { languages: [es] })
import { language as defineLanguage } from '../core.js';

const UNITS = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve',
];

// 21 to 29 are written as one word: veintiuno, veintidos...
const words: Record<string, number> = { un: 1, una: 1, veintiun: 21, veintiuna: 21, cien: 100 };
['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'].forEach((unit, i) => {
  words[`veinti${unit}`] = 21 + i;
});

const ORDINAL_STEMS = ['', 'primer', 'segund', 'tercer', 'cuart', 'quint', 'sext', 'septim', 'octav', 'noven', 'decim'];
const ordinalWords: Record<string, number> = { primer: 1, tercer: 3 };
ORDINAL_STEMS.forEach((stem, n) => {
  if (stem) for (const end of ['o', 'a', 'os', 'as']) ordinalWords[stem + end] = n;
});

/** Spanish: numbers 0 to 99 in words (`treinta y dos`, `veintiuno`), ordinals (`segunda` → `2º`), articles, stop words, phonetic rules. */
const es = defineLanguage({
  code: 'es',
  name: 'Spanish',
  version: '1.0.0',
  numbers: {
    units: UNITS,
    tens: ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'],
    words,
    ordinalWords,
    joiner: 'y',
    ordinalSuffixes: ['º', 'ª'],
    formatOrdinal: (n) => `${n}º`,
  },
  articles: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'],
  stopwords: ['el', 'la', 'los', 'las', 'de', 'del', 'y', 'e', 'o', 'u', 'a', 'al', 'en', 'con', 'por', 'para'],
  // How Spanish is spelled by ear: b/v, c/s/z, silent h, ll/y, j/g.
  phonetic: [
    [/ch/g, 'X'],
    [/c(?=[ei])/g, 's'],
    [/z/g, 's'],
    [/qu/g, 'k'],
    [/c/g, 'k'],
    [/g(?=[ei])/g, 'j'],
    [/gu(?=[ei])/g, 'g'],
    [/v/g, 'b'],
    [/ll/g, 'y'],
    [/h/g, ''],
    [/x/g, 'ks'],
    [/w/g, 'u'],
    [/y$/, 'i'],
    [/(.)\1+/g, '$1'],
  ],
});

export default es;
export { es };
