import { API_VERSION, dropUndefined, fail, mergeOptions } from './plugins.js';
import type { MatchOptions, Preset, PresetDefinition, PresetPack } from './types.js';

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function pack(name: string, options: MatchOptions, description?: string, version?: string): PresetPack {
  return Object.freeze(
    dropUndefined<PresetPack>({
      kind: 'preset',
      apiVersion: API_VERSION,
      name,
      description,
      version,
      options: Object.freeze(options),
    }),
  );
}

/** Song titles and artists: what a blind test needs. */
const music = pack(
  'music',
  {
    strip: ['featuring', 'version', 'brackets', 'articles'],
    replace: { '&': 'and', '+': 'and', n: 'and' },
  },
  'Song titles and artists: drops (feat. X), - Remastered 2011, brackets and leading articles; & and n read as and.',
);

/** Search-as-you-type. Digits would break prefixes while typing: "sev" must still find "Seven". */
const search = pack(
  'search',
  { partial: true, acronyms: true, threshold: 70, numbers: false },
  'Search-as-you-type: prefixes, parts of the text and initials match, threshold 70.',
);

/** Word order and spaces matter. */
const strict = pack(
  'strict',
  { ignoreWordOrder: false, ignoreSpaces: false, threshold: 90 },
  'Word order and spaces matter, threshold 90.',
);

/** The presets usable by their name. */
export const BUILTIN_PRESETS: Readonly<Record<Preset, PresetPack>> = Object.freeze({ music, search, strict });

/** The preset behind a built-in name or a pack, checked. */
export function presetOf(preset: Preset | PresetPack, what = 'preset'): PresetPack {
  if (typeof preset === 'string') {
    if (!Object.prototype.hasOwnProperty.call(BUILTIN_PRESETS, preset)) {
      fail(
        `Unknown ${what} "${preset}"`,
        `use one of ${Object.keys(BUILTIN_PRESETS).join(', ')}, or a preset made with definePreset().`,
      );
    }
    return BUILTIN_PRESETS[preset];
  }
  if (typeof preset !== 'object' || preset === null || preset.kind !== 'preset') {
    fail(`Invalid ${what}`, 'pass a built-in name or a preset made with definePreset().');
  }
  if (preset.apiVersion !== API_VERSION) {
    fail(`Preset "${preset.name}"`, `was written for extension API ${preset.apiVersion}, this version supports ${API_VERSION}.`);
  }
  return preset;
}

/**
 * Declares a preset: a named set of options for one kind of data (addresses,
 * company names, medicine...). It can extend a built-in or another preset.
 * Checks it and freezes it.
 *
 * @example
 * export default definePreset({
 *   name: 'company-names',
 *   description: 'Company names: ignores legal forms and "&".',
 *   options: {
 *     ignoreWords: ['inc', 'ltd', 'llc', 'sa', 'sarl', 'gmbh'],
 *     replace: { '&': 'and' },
 *   },
 * })
 *
 * compare('ACME Inc.', 'Acme', { preset: companyNames }) // 100
 */
export function definePreset(definition: PresetDefinition): PresetPack {
  if (typeof definition !== 'object' || definition === null) fail('definePreset()', 'expects an object.');
  const { name, description, version, options } = definition;
  if (typeof name !== 'string' || !NAME_RE.test(name)) {
    fail('definePreset()', `"name" must be lower-case words joined by dashes such as "company-names", got ${JSON.stringify(name)}.`);
  }
  const what = `Preset "${name}"`;
  if (typeof options !== 'object' || options === null) fail(what, '"options" must be an object.');
  if ('preset' in options) fail(what, 'use "extends" instead of "options.preset".');
  if (
    options.stripPatterns !== undefined &&
    (!Array.isArray(options.stripPatterns) || options.stripPatterns.some((re) => !(re instanceof RegExp)))
  ) {
    fail(what, '"options.stripPatterns" must be an array of regular expressions.');
  }
  const base = definition.extends === undefined ? {} : presetOf(definition.extends, 'preset to extend').options;
  return pack(name, mergeOptions(base, options), description, version);
}
