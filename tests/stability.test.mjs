// Built-in presets are part of the public behavior: changing what one sets
// changes scores for everyone who uses it. They only change in a major version.
// If this test fails, either revert the preset or ship the change as an option
// that users turn on themselves; the preset itself waits for the next major.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BUILTIN_PRESETS } from '../dist/esm/presets.js';

const FROZEN_IN_2X = {
  music: { strip: ['featuring', 'version', 'brackets', 'articles'], replace: { '&': 'and', '+': 'and', n: 'and' } },
  // acronyms: true came in 2.2.0, by mistake in a minor. It stays until 3.0 so 2.2+ users are not broken twice.
  search: { partial: true, acronyms: true, threshold: 70, numbers: false },
  strict: { ignoreWordOrder: false, ignoreSpaces: false, threshold: 90 },
};

test('built-in presets do not change within a major version', () => {
  assert.deepEqual(Object.keys(BUILTIN_PRESETS).sort(), Object.keys(FROZEN_IN_2X).sort());
  for (const [name, options] of Object.entries(FROZEN_IN_2X)) {
    assert.deepEqual({ ...BUILTIN_PRESETS[name].options }, options, `preset "${name}" changed`);
  }
});
