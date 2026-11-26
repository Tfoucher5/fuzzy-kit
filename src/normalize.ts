import { DEFAULT_ARTICLES, DEFAULT_LANGUAGES, resolveLanguages } from './lang/index.js';
import { compileNumbers } from './numbers.js';
import type { NormalizeOptions, StripRule } from './types.js';

export type Normalizer = (text: string) => string;

const LIGATURES: Readonly<Record<string, string>> = {
  œ: 'oe', Œ: 'OE', æ: 'ae', Æ: 'AE', ß: 'ss', ẞ: 'SS', ø: 'o', Ø: 'O',
  đ: 'd', Đ: 'D', ł: 'l', Ł: 'L', ħ: 'h', Ħ: 'H', ı: 'i', þ: 'th', Þ: 'TH',
};
const LIGATURE_RE = /[œŒæÆßẞøØđĐłŁħĦıþÞ]/g;
const MARKS_RE = /\p{M}+/gu;
const APOSTROPHES_RE = /['’‘`´ʼ]/g;
const PUNCTUATION_RE = /[^\p{L}\p{N}\s]+/gu;
const SPACES_RE = /\s+/g;
const NON_ASCII_RE = /[^\x00-\x7f]/;

const VERSION_WORDS =
  'remaster(?:ed)?|live|version|edit|mix|remix|mono|stereo|acoustic|acoustique|demo|instrumental|deluxe|bonus|single|radio|extended|unplugged|explicit|clean|original|reprise|edition|session|take|bande originale|from';

const STRIP_PATTERNS: Readonly<Record<StripRule, readonly RegExp[]>> = {
  featuring: [
    /[([{]?\s*\b(?:feat|ft|featuring)\b\.?\s.*$/iu,
    /[([{]\s*(?:with|avec|con)\s[^)\]}]*[)\]}]/giu,
  ],
  version: [
    new RegExp(`[([{][^)\\]}]*\\b(?:${VERSION_WORDS})\\b[^)\\]}]*[)\\]}]`, 'giu'),
    new RegExp(`\\s[-–—/|]\\s.*\\b(?:${VERSION_WORDS})\\b.*$`, 'iu'),
  ],
  brackets: [/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g],
  // Built from the active languages, see articlePatterns().
  articles: [],
};

function articlePatterns(articles: readonly string[], elisions: readonly string[]): RegExp[] {
  const out: RegExp[] = [];
  if (articles.length > 0) out.push(new RegExp(`^\\s*(?:${articles.map(escapeRegExp).join('|')})\\s+`, 'iu'));
  if (elisions.length > 0) out.push(new RegExp(`^\\s*(?:${elisions.map(escapeRegExp).join('|')})['’]\\s*`, 'iu'));
  return out;
}
const STRIP_ORDER: readonly StripRule[] = ['featuring', 'version', 'brackets', 'articles'];

function foldAccents(text: string): string {
  if (!NON_ASCII_RE.test(text)) return text;
  return text.normalize('NFD').replace(MARKS_RE, '').replace(LIGATURE_RE, (c) => LIGATURES[c]!);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a reusable normalization function. All regular expressions are
 * compiled once, here.
 */
export function compileNormalizer(options: NormalizeOptions = {}): Normalizer {
  const {
    caseSensitive = false,
    accentSensitive = false,
    punctuation = 'space',
    strip = [],
    ignoreWords = [],
    replace = {},
    numbers = true,
    stopwords = false,
    stripPatterns = [],
  } = options;
  const explicit = resolveLanguages(options.languages);
  const languages = explicit ?? DEFAULT_LANGUAGES;

  const prepare = (text: string): string => {
    let out = caseSensitive ? text : text.toLowerCase();
    return accentSensitive ? out : foldAccents(out);
  };

  const stripRules = STRIP_ORDER.filter((rule) => strip.includes(rule)).flatMap((rule) =>
    rule === 'articles'
      ? articlePatterns(
          explicit ? [...new Set(explicit.flatMap((l) => l.articles ?? []))] : DEFAULT_ARTICLES,
          [...new Set(languages.flatMap((l) => l.elisions ?? []))],
        )
      : STRIP_PATTERNS[rule],
  );
  for (const re of stripPatterns) {
    if (!(re instanceof RegExp)) throw new TypeError('[fuzzy-toolkit] "stripPatterns" must be an array of regular expressions.');
    stripRules.push(re);
  }

  const replacements = new Map<string, string>();
  const table: Record<string, string> = {};
  for (const language of languages) Object.assign(table, language.replace);
  Object.assign(table, replace);
  for (const [from, to] of Object.entries(table)) {
    const key = prepare(from).trim();
    if (key) replacements.set(key, ` ${prepare(String(to))} `);
  }
  const replaceRe =
    replacements.size > 0
      ? new RegExp(
          `(?<![\\p{L}\\p{N}])(?:${[...replacements.keys()]
            .sort((a, b) => b.length - a.length)
            .map(escapeRegExp)
            .join('|')})(?![\\p{L}\\p{N}])`,
          caseSensitive ? 'gu' : 'giu',
        )
      : null;

  // Ignored words go through the same pipeline, so `L'` or `Café` still match.
  let ignored: Set<string> | null = null;
  const toDigits = numbers ? compileNumbers(languages) : null;
  const normalizer: Normalizer = (input) => {
    if (input == null) return '';
    let text = prepare(String(input));

    for (const re of stripRules) {
      re.lastIndex = 0;
      const stripped = text.replace(re, ' ');
      // Never strip a text down to nothing: "(Intro)" stays "intro".
      if (/[\p{L}\p{N}]/u.test(stripped)) text = stripped;
    }

    if (replaceRe) {
      text = text.replace(replaceRe, (m) => replacements.get(caseSensitive ? m : m.toLowerCase()) ?? m);
    }

    if (punctuation !== 'keep') {
      text = text
        .replace(APOSTROPHES_RE, '')
        .replace(PUNCTUATION_RE, punctuation === 'remove' ? '' : ' ');
    }

    text = text.replace(SPACES_RE, ' ').trim();
    if (toDigits) text = toDigits(text);

    if (ignored && ignored.size > 0) {
      text = text
        .split(' ')
        .filter((word) => !ignored!.has(word))
        .join(' ');
    }
    return text;
  };

  const dropped = stopwords ? [...ignoreWords, ...languages.flatMap((l) => l.stopwords ?? [])] : ignoreWords;
  if (dropped.length > 0) {
    const base = compileNormalizer({ caseSensitive, accentSensitive, punctuation, numbers, languages });
    ignored = new Set(dropped.flatMap((word) => base(word).split(' ')).filter(Boolean));
  }

  return normalizer;
}

const defaultNormalizer = compileNormalizer();

/**
 * Cleans up a text the way fuzzy-toolkit does before comparing: lower case,
 * no accents, no punctuation, single spaces, numbers as digits.
 *
 * @example
 * normalize('  Saint-Étienne !! ')                       // 'saint etienne'
 * normalize('Hey Jude - Remastered 2015', { strip: ['version'] }) // 'hey jude'
 * normalize('Two Become One')                            // '2 become 1'
 */
export function normalize(text: string, options?: NormalizeOptions): string {
  return options ? compileNormalizer(options)(text) : defaultNormalizer(text);
}
