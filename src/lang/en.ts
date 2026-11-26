import { LATIN_SOUNDS } from '../phonetic.js';
import { defineLanguage } from '../plugins.js';

const SUFFIX = ['th', 'st', 'nd', 'rd'];

/** English: numbers in words (`twenty one`, `first`), articles, stop words, phonetic rules. */
const en = defineLanguage({
  code: 'en',
  name: 'English',
  numbers: {
    units: [
      'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
    ],
    tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
    ordinals: [
      '', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
      'eleventh', 'twelfth',
    ],
    formatOrdinal: (n) => {
      const last = n % 100 >= 11 && n % 100 <= 13 ? 0 : n % 10;
      return `${n}${SUFFIX[last] ?? 'th'}`;
    },
  },
  articles: ['the', 'a', 'an'],
  stopwords: ['the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'from'],
  // English and French share one rule set: guesses spelled by ear mix both.
  phonetic: LATIN_SOUNDS,
});

export default en;
export { en };
