// The extension API: language packs and presets anyone can publish.
//
// A pack is a plain, frozen object. Nothing is registered globally: you pass
// the object in the options, so two libraries using different packs never
// step on each other and bundlers drop what you don't import.

import type {
  Language,
  LanguageDefinition,
  MatchOptions,
  NumberWords,
  PhoneticRule,
} from './types.js';

/** Version of the extension API. A pack written for another version is refused. */
export const API_VERSION = 1;

const CODE_RE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;

export function fail(what: string, message: string): never {
  throw new TypeError(`[fuzzy-toolkit] ${what}: ${message}`);
}

function words(what: string, field: string, value: unknown, allowEmpty = false): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((w) => typeof w !== 'string' || (!allowEmpty && w === ''))) {
    fail(what, `"${field}" must be an array of${allowEmpty ? '' : ' non-empty'} strings.`);
  }
  return Object.freeze(value.map((w: string) => w.toLowerCase()));
}

function table(what: string, field: string, value: unknown): Readonly<Record<string, number>> | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null) fail(what, `"${field}" must be an object of numbers.`);
  const out: Record<string, number> = {};
  for (const [word, n] of Object.entries(value)) {
    if (!Number.isInteger(n) || n < 0) fail(what, `"${field}.${word}" must be a positive whole number.`);
    out[word.toLowerCase()] = n;
  }
  return Object.freeze(out);
}

function strings(what: string, field: string, value: unknown): Readonly<Record<string, string>> | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Object.values(value).some((v) => typeof v !== 'string')) {
    fail(what, `"${field}" must be an object of strings.`);
  }
  return Object.freeze({ ...(value as Record<string, string>) });
}

function numberWords(what: string, value: NumberWords | undefined): NumberWords | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null) fail(what, '"numbers" must be an object.');
  for (const fn of ['read', 'formatOrdinal'] as const) {
    if (value[fn] !== undefined && typeof value[fn] !== 'function') fail(what, `"numbers.${fn}" must be a function.`);
  }
  if (value.joiner !== undefined && (typeof value.joiner !== 'string' || value.joiner.includes(' '))) {
    fail(what, '"numbers.joiner" must be a single word.');
  }
  const out: NumberWords = {
    units: words(what, 'numbers.units', value.units, true),
    tens: words(what, 'numbers.tens', value.tens, true),
    ordinals: words(what, 'numbers.ordinals', value.ordinals, true),
    words: table(what, 'numbers.words', value.words),
    ordinalWords: table(what, 'numbers.ordinalWords', value.ordinalWords),
    joiner: value.joiner?.toLowerCase(),
    ordinalSuffixes: words(what, 'numbers.ordinalSuffixes', value.ordinalSuffixes),
    formatOrdinal: value.formatOrdinal,
    read: value.read,
  };
  return Object.freeze(dropUndefined(out));
}

// Packs sharing one rule list (English and French) keep sharing it, so the
// rules run once.
const ruleLists = new WeakMap<object, readonly PhoneticRule[]>();

function phonetic(what: string, value: unknown): readonly PhoneticRule[] | undefined {
  if (value === undefined) return undefined;
  const known = typeof value === 'object' && value !== null ? ruleLists.get(value) : undefined;
  if (known) return known;
  if (
    !Array.isArray(value) ||
    value.some((r) => !Array.isArray(r) || r.length !== 2 || !(r[0] instanceof RegExp) || typeof r[1] !== 'string')
  ) {
    fail(what, '"phonetic" must be an array of [RegExp, string] rules.');
  }
  const rules = Object.freeze(value.map((r: PhoneticRule) => Object.freeze([r[0], r[1]] as const)));
  ruleLists.set(value, rules);
  ruleLists.set(rules, rules);
  return rules;
}

export function dropUndefined<T extends object>(value: T): T {
  for (const key of Object.keys(value) as (keyof T)[]) if (value[key] === undefined) delete value[key];
  return value;
}

/**
 * Declares a language pack: how a language writes numbers, its articles,
 * stop words and phonetic rules. Checks the pack and freezes it.
 *
 * @example
 * export default defineLanguage({
 *   code: 'es',
 *   name: 'Spanish',
 *   numbers: { units: ['cero', 'uno', 'dos', 'tres'], tens: ['', '', 'veinte', 'treinta'], joiner: 'y' },
 *   articles: ['el', 'la', 'los', 'las'],
 *   stopwords: ['de', 'y'],
 *   phonetic: [[/ll/g, 'y'], [/v/g, 'b']],
 * })
 */
export function defineLanguage(definition: LanguageDefinition): Language {
  if (typeof definition !== 'object' || definition === null) fail('defineLanguage()', 'expects an object.');
  const code = definition.code;
  if (typeof code !== 'string' || !CODE_RE.test(code)) {
    fail('defineLanguage()', `"code" must be a lower-case language code such as "es" or "pt-br", got ${JSON.stringify(code)}.`);
  }
  const what = `Language "${code}"`;
  const pack: Language = {
    kind: 'language',
    apiVersion: API_VERSION,
    code,
    name: definition.name,
    version: definition.version,
    numbers: numberWords(what, definition.numbers),
    articles: words(what, 'articles', definition.articles),
    elisions: words(what, 'elisions', definition.elisions),
    stopwords: words(what, 'stopwords', definition.stopwords),
    phonetic: phonetic(what, definition.phonetic),
    replace: strings(what, 'replace', definition.replace),
  };
  return Object.freeze(dropUndefined(pack));
}

/**
 * Merges two sets of options: `over` wins, `replace` tables are combined and
 * `stripPatterns` add up.
 */
export function mergeOptions(base: MatchOptions, over: MatchOptions): MatchOptions {
  const merged: MatchOptions = { ...base };
  for (const key of Object.keys(over) as (keyof MatchOptions)[]) {
    if (over[key] !== undefined) (merged as Record<string, unknown>)[key] = over[key];
  }
  if (base.replace || over.replace) merged.replace = { ...base.replace, ...over.replace };
  if (base.stripPatterns || over.stripPatterns) {
    merged.stripPatterns = [...(base.stripPatterns ?? []), ...(over.stripPatterns ?? [])];
  }
  return merged;
}

/** Checks a language given in the options. */
export function checkLanguage(language: unknown): Language {
  if (typeof language !== 'object' || language === null || (language as Language).kind !== 'language') {
    fail('Invalid language', `pass a built-in code or a pack made with defineLanguage(), got ${JSON.stringify(language)}.`);
  }
  const pack = language as Language;
  if (pack.apiVersion !== API_VERSION) {
    fail(`Language "${pack.code}"`, `was written for extension API ${pack.apiVersion}, this version supports ${API_VERSION}.`);
  }
  return pack;
}
