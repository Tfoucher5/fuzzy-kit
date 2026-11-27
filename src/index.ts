export {
  check,
  checkAll,
  closest,
  compare,
  createIndex,
  createMatcher,
  dedupe,
  find,
  findAll,
  fingerprint,
  group,
  highlight,
  isMatch,
  join,
  loadIndex,
  search,
  similarity,
} from './matcher.js';
export type { FoundItem, Index, SavedIndex, ItemsArgs, JoinArgs, Matcher, MatcherCheckOptions, MatcherListOptions } from './matcher.js';
export { normalize } from './normalize.js';
export { API_VERSION } from './core.js';
export { defineLanguage, definePreset } from './define.js';
export { diff } from './diff.js';
export { mapFields } from './fields.js';
export type { FieldMapping, FieldMatch, MapFieldsOptions } from './fields.js';
export { repair } from './repair.js';
export type { JsonSchema, Repair, RepairOptions, RepairResult } from './repair.js';
export type { Change, DiffOptions } from './diff.js';
export type { Found, Segment } from './text.js';
export { damerau, jaro, jaroWinkler, levenshtein } from './distance.js';
export type { DistanceOptions } from './distance.js';
export { cosine, dice, hamming, jaccard, lcs, overlap, ratcliffObershelp, tversky } from './metrics.js';
export type { TverskyOptions } from './metrics.js';
export type { ResolvedOptions } from './engine.js';
export type {
  Algorithm,
  BuiltinLanguage,
  CheckOptions,
  CheckResult,
  Comparison,
  GroupOptions,
  JoinOptions,
  JoinRow,
  KeysOption,
  ListOptions,
  Match,
  Language,
  LanguageDefinition,
  MatchOptions,
  NumberWords,
  PhoneticRule,
  PresetDefinition,
  PresetPack,
  MultiCheckResult,
  NormalizeOptions,
  Preset,
  StripRule,
  TextKey,
  Verdict,
  WeightedKey,
} from './types.js';
