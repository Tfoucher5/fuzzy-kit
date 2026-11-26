import { API_VERSION, fail, preset as pack } from './core.js';
import type { Preset, PresetPack } from './types.js';

/** Song titles and artists: what a blind test needs. */
const music = pack('music', {
  strip: ['featuring', 'version', 'brackets', 'articles'],
  replace: { '&': 'and', '+': 'and', n: 'and' },
});

/** Search-as-you-type. Digits would break prefixes while typing: "sev" must still find "Seven". */
const search = pack('search', { partial: true, acronyms: true, threshold: 70, numbers: false });

/** Word order and spaces matter. */
const strict = pack('strict', { ignoreWordOrder: false, ignoreSpaces: false, threshold: 90 });

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

