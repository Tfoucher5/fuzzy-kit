// A small "sounds like" key for English and French, so that a guess spelled
// by ear ("beyonsay", "nite", "fone", "kwin") meets the real spelling.
//
// It works on text that is already normalized (lower case, no accents), one
// word at a time. It is deliberately simple: a few rewrite rules that merge
// letters that sound the same, then double letters collapse.

// `X` marks the "sh" sound. Rules run in order.
const RULES: readonly (readonly [RegExp, string])[] = [
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

const cache = new Map<string, string>();

/** The "sounds like" key of one normalized word. Digits are kept as they are. */
export function soundOf(word: string): string {
  let out = cache.get(word);
  if (out !== undefined) return out;
  out = word.toLowerCase();
  if (!/^\d+$/.test(out)) {
    for (const [re, to] of RULES) out = out.replace(re, to);
    // Never reduce a word to nothing ("h", "eh").
    if (out === '') out = word.toLowerCase();
  }
  if (cache.size > 50_000) cache.clear();
  cache.set(word, out);
  return out;
}

/**
 * How much a match on sound alone is worth: identical sounds score 95, so a
 * real spelling match always ranks first.
 */
export const PHONETIC_WEIGHT = 0.95;
