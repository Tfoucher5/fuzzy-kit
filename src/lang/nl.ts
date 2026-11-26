// Dutch. Import it and pass it in `languages`:
//   import nl from 'fuzzy-toolkit/lang/nl'
//   compare('eenentwintig', '21', { languages: [nl] })
import { language as defineLanguage } from '../core.js';

// Accents are folded before numbers are read: één → een, tweeëntwintig → tweeentwintig.
const UNITS = [
  'nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien',
  'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien',
];
const TENS = ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig'];

const units = new Map<string, number>(UNITS.map((w, i) => [w, i]));
for (const [w, n] of [['honderd', 100], ['eenhonderd', 100]] as const) units.set(w, n);
const tens = new Map<string, number>(TENS.map((w, i) => [w, i * 10] as const).filter(([w]) => w !== ''));
const COMPOUND_RE = /^([a-z]+)en(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)$/;

/** 1 to 9 as the first part of `eenentwintig` / `tweeentwintig`. */
function unitOf(word: string | undefined): number | undefined {
  const n = word === undefined ? undefined : units.get(word);
  return n !== undefined && n >= 1 && n <= 9 ? n : undefined;
}

/** Dutch puts units before tens: `eenentwintig`, `tweeentwintig`, or `een en twintig` = 21. */
function read(words: readonly string[], i: number): [number, number] | undefined {
  const word = words[i]!;
  const compound = COMPOUND_RE.exec(word);
  if (compound) {
    const unit = unitOf(compound[1]);
    const ten = tens.get(compound[2]!);
    if (unit !== undefined && ten !== undefined) return [ten + unit, 1];
  }
  if (words[i + 1] === 'en') {
    const unit = unitOf(word);
    const ten = tens.get(words[i + 2] ?? '');
    if (unit !== undefined && ten !== undefined) return [ten + unit, 3];
  }
  const value = tens.get(word) ?? units.get(word);
  return value === undefined ? undefined : [value, 1];
}

// Written as one word, units first: eenentwintig, tweeendertig, negenennegentig...
const compounds: Record<string, number> = {};
TENS.forEach((ten, t) => {
  if (ten) UNITS.slice(1, 10).forEach((unit, u) => (compounds[`${unit}en${ten}`] = t * 10 + u + 1));
});

const ordinalWords: Record<string, number> = {
  eerste: 1, tweede: 2, derde: 3, vierde: 4, vijfde: 5,
  zesde: 6, zevende: 7, achtste: 8, negende: 9, tiende: 10,
  elfde: 11, twaalfde: 12, dertiende: 13, veertiende: 14, vijftiende: 15,
  zestiende: 16, zeventiende: 17, achttiende: 18, negentiende: 19, twintigste: 20,
};

/** Dutch: numbers 0 to 99 in words (`eenentwintig`, `drieendertig`), ordinals (`tweede` → `2`), articles, stop words, phonetic rules. */
const nl = defineLanguage({
  code: 'nl',
  name: 'Dutch',
  version: '1.0.0',
  numbers: {
    units: UNITS,
    tens: TENS,
    words: { honderd: 100, eenhonderd: 100, ...compounds },
    ordinalWords,
    ordinalSuffixes: ['e', 'de', 'ste'],
    read,
  },
  articles: ['de', 'het', 'een'],
  stopwords: ['de', 'het', 'een', 'en', 'of', 'van', 'voor', 'naar', 'in', 'op', 'aan', 'bij', 'met', 'tot', 'uit', 'door', 'over', 'onder', 'te'],
  // How Dutch is spelled by ear: ij/ei, au/ou, v/f, z/s, ch/g, c/k/s, final devoicing d→t / b→p.
  phonetic: [
    [/sch/g, 'sg'],
    [/ch/g, 'g'],
    [/ij|ei/g, 'Ei'],
    [/au|ou/g, 'Au'],
    [/ph/g, 'f'],
    [/v/g, 'f'],
    [/z/g, 's'],
    [/c(?=[eiy])/g, 's'],
    [/c/g, 'k'],
    [/qu/g, 'kv'],
    [/x/g, 'ks'],
    [/dt$|d$/, 't'],
    [/b$/, 'p'],
    [/y/g, 'i'],
    [/(.)\1+/g, '$1'],
  ],
});

export default nl;
export { nl };
