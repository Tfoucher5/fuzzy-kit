// docs/extensions.json: the community extensions reviewed by maintainers,
// shown on the Extensions page. Checked here so a pull request that adds one
// gets a clear message.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { extensions } = JSON.parse(readFileSync(new URL('../docs/extensions.json', import.meta.url), 'utf8'));
const NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?fuzzy-toolkit-(lang|preset)-([a-z0-9][a-z0-9-]*)$/;

test('the registry is a list', () => assert.ok(Array.isArray(extensions)));

for (const e of extensions) {
  test(`registry: ${e.package}`, () => {
    const name = NAME.exec(e.package ?? '');
    assert.ok(name, `"package" must be named fuzzy-toolkit-lang-<code> or fuzzy-toolkit-preset-<name>, got ${JSON.stringify(e.package)}`);
    const kind = name[2] === 'lang' ? 'language' : 'preset';
    assert.equal(e.kind, kind, `"kind" must be "${kind}" for ${e.package}`);
    assert.equal(e.id, name[3], `"id" must be "${name[3]}", as in the package name`);
    assert.ok(typeof e.description === 'string' && e.description.length >= 20 && e.description.length <= 200, '"description": one sentence, 20 to 200 characters');
    if (e.repository !== undefined) assert.match(e.repository, /^https:\/\//, '"repository" must be an https URL');
    const extra = Object.keys(e).filter((k) => !['package', 'kind', 'id', 'description', 'repository'].includes(k));
    assert.deepEqual(extra, [], `unknown fields: ${extra.join(', ')}`);
  });
}

test('registry: no package listed twice', () => {
  const names = extensions.map((e) => e.package);
  assert.equal(new Set(names).size, names.length);
});
