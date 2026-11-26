// Italian. Import it and pass it in `languages`:
//   import it from 'fuzzy-toolkit/lang/it'
//   compare('ventitre', '23', { languages: [it] })
import { language as defineLanguage } from '../core.js';

const UNITS = [
  'zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci',
  'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove',
];
const TENS = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];

// 21 to 99 are written as one word, and tens lose their last vowel before
// uno and otto: ventuno, ventidue, ventotto, trentatre...
const words: Record<string, number> = { un: 1, una: 1, cento: 100 };
TENS.forEach((ten, t) => {
  if (!ten) return;
  UNITS.slice(1, 10).forEach((unit, u) => {
    const glued = unit === 'uno' || unit === 'otto' ? ten.slice(0, -1) + unit : ten + unit;
    words[glued] = t * 10 + u + 1;
  });
});

const ORDINAL_STEMS = [
  '', 'prim', 'second', 'terz', 'quart', 'quint', 'sest', 'settim', 'ottav', 'non', 'decim', 'undicesim', 'dodicesim',
];
const ordinalWords: Record<string, number> = {};
ORDINAL_STEMS.forEach((stem, n) => {
  if (stem) for (const end of ['o', 'a', 'i', 'e']) ordinalWords[stem + end] = n;
});

/** Italian: numbers 0 to 99 in words (`ventitré`, `quarantotto`), ordinals (`seconda` → `2º`), articles, stop words, phonetic rules. */
const it = defineLanguage({
  code: 'it',
  name: 'Italian',
  version: '1.0.0',
  numbers: {
    units: UNITS,
    tens: TENS,
    words,
    ordinalWords,
    ordinalSuffixes: ['º', 'ª'],
    formatOrdinal: (n) => `${n}º`,
  },
  articles: ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'l'],
  elisions: ['l', 'un'],
  stopwords: ['il', 'lo', 'la', 'i', 'gli', 'le', 'l', 'di', 'del', 'della', 'dei', 'degli', 'delle', 'e', 'ed', 'o', 'a', 'al', 'alla', 'in', 'nel', 'con', 'per', 'su', 'da'],
  // How Italian is spelled by ear: c/ch/k, gli, gn, silent h, z/ts.
  phonetic: [
    [/gli/g, 'L'],
    [/li(?=[aeou])/g, 'L'],
    [/gn/g, 'N'],
    [/sc(?=[ei])/g, 'S'],
    [/c(?=[ei])/g, 'C'],
    [/g(?=[ei])/g, 'J'],
    [/([SCJ])i(?=[aou])/g, '$1'],
    [/ch/g, 'k'],
    [/gh/g, 'g'],
    [/qu/g, 'k'],
    [/c|q|k/g, 'k'],
    [/h/g, ''],
    [/z+/g, 'ts'],
    [/j/g, 'i'],
    [/y/g, 'i'],
    [/(.)\1+/g, '$1'],
  ],
});

export default it;
export { it };
