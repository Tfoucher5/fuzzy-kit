// German. Import it and pass it in `languages`:
//   import de from 'fuzzy-toolkit/lang/de'
//   compare('einundzwanzig', '21', { languages: [de] })
import { language as defineLanguage } from '../core.js';

// Accents are folded before numbers are read: fünf → funf, dreißig → dreissig.
const UNITS = [
  'null', 'eins', 'zwei', 'drei', 'vier', 'funf', 'sechs', 'sieben', 'acht', 'neun', 'zehn',
  'elf', 'zwolf', 'dreizehn', 'vierzehn', 'funfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn',
];
const TENS = ['', '', 'zwanzig', 'dreissig', 'vierzig', 'funfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

const units = new Map<string, number>(UNITS.map((w, i) => [w, i]));
for (const [w, n] of [['ein', 1], ['eine', 1], ['zwo', 2], ['hundert', 100], ['einhundert', 100]] as const) units.set(w, n);
const tens = new Map<string, number>(TENS.map((w, i) => [w, i * 10] as const).filter(([w]) => w !== ''));
const COMPOUND_RE = /^([a-z]+)und([a-z]+)$/;

/** 1 to 9 as the first part of `einundzwanzig`. */
function unitOf(word: string | undefined): number | undefined {
  const n = word === undefined ? undefined : units.get(word);
  return n !== undefined && n >= 1 && n <= 9 ? n : undefined;
}

/** German puts units first: `einundzwanzig` or `ein und zwanzig` = 21. */
function read(words: readonly string[], i: number): [number, number] | undefined {
  const word = words[i]!;
  const compound = COMPOUND_RE.exec(word);
  if (compound) {
    const unit = unitOf(compound[1]);
    const ten = tens.get(compound[2]!);
    if (unit !== undefined && ten !== undefined) return [ten + unit, 1];
  }
  if (words[i + 1] === 'und') {
    const unit = unitOf(word);
    const ten = tens.get(words[i + 2] ?? '');
    if (unit !== undefined && ten !== undefined) return [ten + unit, 3];
  }
  const value = tens.get(word) ?? units.get(word);
  return value === undefined ? undefined : [value, 1];
}

// Ordinals take an ending: der erste, die zweite, am dritten...
const ORDINAL_STEMS = ['', 'erst', 'zweit', 'dritt', 'viert', 'funft', 'sechst', 'siebt', 'acht', 'neunt', 'zehnt', 'elft', 'zwolft'];
// Written as one word, units first: einundzwanzig, zweiunddreissig...
const compounds: Record<string, number> = {};
TENS.forEach((ten, t) => {
  if (ten) ['ein', ...UNITS.slice(2, 10)].forEach((unit, u) => (compounds[`${unit}und${ten}`] = t * 10 + u + 1));
});

const ordinalWords: Record<string, number> = {};
ORDINAL_STEMS.forEach((stem, n) => {
  if (stem) for (const end of ['e', 'er', 'en', 'es', 'em']) ordinalWords[stem + end] = n;
});

/** German: numbers 0 to 99 in words (`einundzwanzig`, `dreißig`), ordinals (`zweite` → `2`), articles, stop words, phonetic rules. */
const de = defineLanguage({
  code: 'de',
  name: 'German',
  version: '1.0.0',
  numbers: {
    units: UNITS,
    tens: TENS,
    words: { ein: 1, eine: 1, zwo: 2, hundert: 100, einhundert: 100, ...compounds },
    ordinalWords,
    read,
  },
  articles: ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines'],
  stopwords: ['der', 'die', 'das', 'den', 'dem', 'des', 'und', 'oder', 'von', 'vom', 'zu', 'zum', 'zur', 'im', 'in', 'am', 'an', 'auf', 'mit', 'fur'],
  // How German is spelled by ear: ue/ü, v/f, w/v, z/ts, ß/ss, silent h after a vowel.
  phonetic: [
    [/eu/g, 'oi'],
    [/ae/g, 'a'],
    [/oe/g, 'o'],
    [/ue/g, 'u'],
    [/sch/g, 'X'],
    [/ch/g, 'X'],
    [/ph/g, 'f'],
    [/v/g, 'f'],
    [/w/g, 'v'],
    [/tz/g, 'ts'],
    [/z/g, 'ts'],
    [/ck/g, 'k'],
    [/qu/g, 'kv'],
    [/th/g, 't'],
    [/dt$|d$/, 't'],
    [/ei|ai|ey|ay/g, 'Ai'],
    [/ie/g, 'i'],
    [/(?<=[aeiou])h/g, ''],
    [/y/g, 'i'],
    [/(.)\1+/g, '$1'],
  ],
});

export default de;
export { de };
