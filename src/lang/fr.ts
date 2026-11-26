import { LATIN_SOUNDS } from '../phonetic.js';
// Built-in packs skip the checks of defineLanguage(); write yours with it.
import { language as defineLanguage } from '../core.js';

const UNITS = [
  'zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

const units = new Map<string, number>(UNITS.map((w, i) => [w, i]));
units.set('une', 1);
const tens = new Map<string, number>(TENS.map((w, i) => [w, i * 10] as const).filter(([w]) => w !== ''));

/** French 0 to 19, possibly as two words (`dix sept`). */
function small(words: readonly string[], i: number): [number, number] | undefined {
  const value = units.get(words[i]!);
  if (value === undefined) return undefined;
  if (value === 10) {
    const unit = units.get(words[i + 1] ?? '');
    if (unit !== undefined && unit >= 7 && unit <= 9) return [10 + unit, 2];
  }
  return [value, 1];
}

/** A French number from 0 to 99 starting at `i`: [value, words used]. */
function read(words: readonly string[], i: number): [number, number] | undefined {
  let base: number | undefined;
  let j = i + 1;
  if (words[i] === 'quatre' && (words[i + 1] === 'vingt' || words[i + 1] === 'vingts')) {
    base = 80;
    j = i + 2;
  } else {
    base = tens.get(words[i]!);
  }
  if (base === undefined) return small(words, i);
  // 60 and 80 take 10 to 19 after them (soixante-dix, quatre-vingt-onze).
  const max = base === 60 || base === 80 ? 19 : 9;
  if (words[j] === 'et' && base !== 80) {
    const after = words[j + 1];
    if (after === 'un' || after === 'une') return [base + 1, j + 2 - i];
    if (after === 'onze' && base === 60) return [71, j + 2 - i];
    return [base, j - i];
  }
  const rest = small(words, j);
  if (rest && rest[0] >= 1 && rest[0] <= max) return [base + rest[0], j + rest[1] - i];
  return [base, j - i];
}

/** French: numbers in words (`quatre vingt dix`, `premier`, `2eme`), articles, stop words, phonetic rules. */
const fr = defineLanguage({
  code: 'fr',
  name: 'French',
  numbers: {
    units: UNITS,
    tens: TENS,
    words: { une: 1 },
    ordinals: [
      '', 'premier', 'deuxieme', 'troisieme', 'quatrieme', 'cinquieme', 'sixieme', 'septieme', 'huitieme',
      'neuvieme', 'dixieme', 'onzieme', 'douzieme',
    ],
    ordinalWords: { premiere: 1, seconde: 2 },
    ordinalSuffixes: ['e', 'eme', 'er', 'ere', 're'],
    formatOrdinal: (n) => (n === 1 ? '1er' : `${n}e`),
    read,
  },
  articles: ['le', 'la', 'les', 'un', 'une', 'des', 'l'],
  elisions: ['l'],
  stopwords: ['le', 'la', 'les', 'l', 'des', 'de', 'du', 'd', 'et', 'ou', 'a', 'au', 'aux', 'en', 'pour', 'par', 'sur', 'avec'],
  phonetic: LATIN_SOUNDS,
});

export default fr;
export { fr };
