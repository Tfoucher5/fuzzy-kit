import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, symlinkSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createPack } from '../bin/new-pack.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

/** Runs the generated package's own test against this checkout of fuzzy-toolkit. */
function runGeneratedTest(folder) {
  mkdirSync(join(folder, 'node_modules'));
  symlinkSync(root, join(folder, 'node_modules', 'fuzzy-toolkit'), 'junction');
  return execFileSync(process.execPath, ['--test', 'index.test.js'], { cwd: folder, encoding: 'utf8' });
}

test('new-pack: a language pack that installs, loads and passes its test', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fuzzy-pack-'));
  const folder = createPack('language', 'pt', { cwd });
  assert.match(folder, /fuzzy-toolkit-lang-pt$/);
  const pkg = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'fuzzy-toolkit-lang-pt');
  assert.ok(pkg.keywords.includes('fuzzy-toolkit-plugin'));
  assert.ok(pkg.keywords.includes('fuzzy-toolkit-language'));
  assert.match(pkg.peerDependencies['fuzzy-toolkit'], /^\^\d+\.\d+\.\d+$/);
  assert.match(readFileSync(join(folder, 'README.md'), 'utf8'), /import pt from 'fuzzy-toolkit-lang-pt'/);
  runGeneratedTest(folder);
  // Filled in like a contributor would, the pack works with fuzzy-toolkit.
  const index = join(folder, 'index.js');
  writeFileSync(index, readFileSync(index, 'utf8').replace('units: [],', "units: ['zero', 'um', 'dois'],"));
  const { default: pack } = await import(pathToFileURL(index).href);
  const { normalize } = await import('../dist/esm/index.js');
  assert.equal(pack.code, 'pt');
  assert.equal(normalize('dois', { languages: [pack] }), '2');
});

test('new-pack: a preset, then refusals', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fuzzy-pack-'));
  const folder = createPack('preset', 'company-names', { cwd });
  assert.equal(JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8')).name, 'fuzzy-toolkit-preset-company-names');
  assert.match(readFileSync(join(folder, 'README.md'), 'utf8'), /preset: companyNames/);
  runGeneratedTest(folder);
  assert.throws(() => createPack('preset', 'company-names', { cwd }), /already exists/);
  assert.throws(() => createPack('language', 'Portuguese', { cwd }), /not a language code/);
  assert.throws(() => createPack('preset', 'Company Names', { cwd }), /not a preset name/);
  assert.throws(() => createPack('plugin', 'x', { cwd }), /Usage/);
  assert.match(createPack('lang', 'pt-br', { cwd, dir: 'custom' }), /custom$/);
});
