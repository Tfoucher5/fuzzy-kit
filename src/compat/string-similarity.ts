/**
 * Drop-in replacement for the `string-similarity` package, which is no longer
 * maintained. Same functions, same results:
 *
 * ```js
 * // before
 * import stringSimilarity from 'string-similarity'
 * // after
 * import stringSimilarity from 'fuzzy-toolkit/string-similarity'
 * ```
 *
 * For better matching (typos, accents, word order), switch to `similarity`,
 * `closest` and `search` from `fuzzy-toolkit` when you can.
 * @module
 */
import { dice, diceAll } from '../metrics.js';

/** One rating of {@link findBestMatch}. */
export interface Rating {
  target: string;
  /** From 0 to 1. */
  rating: number;
}

/** Result of {@link findBestMatch}. */
export interface BestMatch {
  /** One rating per target, in the order of the targets. */
  ratings: Rating[];
  /** The best rating (the first one on a tie). */
  bestMatch: Rating;
  /** Position of the best match in the targets. */
  bestMatchIndex: number;
}

/**
 * Similarity between two strings, from 0 to 1 (Sørensen-Dice on pairs of
 * letters, spaces ignored, case sensitive).
 *
 * @example
 * compareTwoStrings('healed', 'sealed') // 0.8
 */
export function compareTwoStrings(first: string, second: string): number {
  return dice(first, second);
}

/**
 * Rates every target against `mainString` and points out the best one.
 *
 * @example
 * findBestMatch('healed', ['edward', 'sealed', 'theatre']).bestMatch
 * // { target: 'sealed', rating: 0.8 }
 */
export function findBestMatch(mainString: string, targetStrings: readonly string[]): BestMatch {
  if (
    typeof mainString !== 'string' ||
    !Array.isArray(targetStrings) ||
    targetStrings.length === 0 ||
    targetStrings.some((t) => typeof t !== 'string')
  ) {
    throw new Error('Bad arguments: First argument should be a string, second should be an array of strings');
  }
  const scores = diceAll(mainString, targetStrings);
  const ratings = targetStrings.map((target, i) => ({ target, rating: scores[i]! }));
  let bestMatchIndex = 0;
  for (let i = 1; i < ratings.length; i += 1) {
    if (ratings[i]!.rating > ratings[bestMatchIndex]!.rating) bestMatchIndex = i;
  }
  return { ratings, bestMatch: ratings[bestMatchIndex]!, bestMatchIndex };
}

const stringSimilarity = { compareTwoStrings, findBestMatch };
export default stringSimilarity;
