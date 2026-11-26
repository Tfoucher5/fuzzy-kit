// A small "sounds like" key for English and French, so that a guess spelled
// by ear ("beyonsay", "nite", "fone", "kwin") meets the real spelling.
//
// It works on text that is already normalized (lower case, no accents), one
// word at a time. It is deliberately simple: a few rewrite rules that merge
// letters that sound the same, then double letters collapse.

import type { Language, PhoneticRule } from './types.js';

// `X` marks the "sh" sound. Rules run in order.
/** The rules shared by the built-in English and French packs. */
export const LATIN_SOUNDS: readonly PhoneticRule[] = [
  [/^kn/, 'n'],
  [/^wr/, 'r'],
  [/^ps/, 's'],
  [/^wh/, 'w'],
  [/x/g, 'ks'],
  [/sch|sh|ch/g, 'X'],
  [/ph/g, 'f'],
  [/th/g, 't'],
  [/(?<=.)gh/g, ''],
  [/ck|qu|q/g, 'k'],
  [/c(?=[eiy])/g, 's'],
  [/c/g, 'k'],
  [/kw/g, 'k'],
  [/dg(?=[eiy])/g, 'j'],
  [/g(?=[eiy])/g, 'j'],
  [/z/g, 's'],
  [/w/g, 'u'],
  [/y/g, 'i'],
  [/eau|au|ow/g, 'o'],
  [/ou|oo/g, 'u'],
  [/ai|ei|eh/g, 'e'],
  [/ee|ea|ie/g, 'i'],
  [/oi/g, 'ua'],
  [/eu/g, 'e'],
  [/(?<=.)h/g, ''],
  [/mb$/, 'm'],
  [/(.)\1+/g, '$1'],
  // A silent final "e": "nite" = "night", "anjele" = "angel".
  [/(?<=[^aeiou])e$/, ''],
];

/** Turns one normalized word into its "sounds like" key. */
export type SoundOf = (word: string) => string;

const DIGITS_RE = /^\d+$/;

/** Builds the phonetic key function for a list of rules, with its own cache. */
export function compileSounds(rules: readonly PhoneticRule[]): SoundOf {
  const cache = new Map<string, string>();
  return (word) => {
    let out = cache.get(word);
    if (out !== undefined) return out;
    out = word.toLowerCase();
    if (!DIGITS_RE.test(out)) {
      for (const [re, to] of rules) {
        re.lastIndex = 0;
        out = out.replace(re, to);
      }
      // Never reduce a word to nothing ("h", "eh").
      if (out === '') out = word.toLowerCase();
    }
    if (cache.size > 50_000) cache.clear();
    cache.set(word, out);
    return out;
  };
}

const compiled = new WeakMap<readonly PhoneticRule[], SoundOf>();

/**
 * The phonetic key of a set of languages: their rule lists run one after the
 * other, each list once (English and French share theirs).
 */
export function soundsFor(languages: readonly Language[]): SoundOf {
  const lists = [...new Set(languages.map((l) => l.phonetic).filter((r): r is readonly PhoneticRule[] => !!r))];
  if (lists.length === 1) {
    const only = lists[0]!;
    let fn = compiled.get(only);
    if (!fn) compiled.set(only, (fn = compileSounds(only)));
    return fn;
  }
  return compileSounds(lists.flat());
}

/** The "sounds like" key of one normalized word, English and French rules. Digits are kept as they are. */
export const soundOf: SoundOf = compileSounds(LATIN_SOUNDS);
compiled.set(LATIN_SOUNDS, soundOf);

/**
 * How much a match on sound alone is worth: identical sounds score 95, so a
 * real spelling match always ranks first.
 */
export const PHONETIC_WEIGHT = 0.95;
