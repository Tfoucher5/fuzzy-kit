// What AI agents and assistants rely on: the MCP server, and warnings that
// catch the mistakes generated code makes most.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { closest, createMatcher, isMatch, search, similarity } from '../dist/esm/index.js';
import { handle } from '../bin/mcp.mjs';

/* MCP server ---------------------------------------------------------------- */

const call = (name, args) => {
  const answer = handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
  const { content, isError } = answer.result;
  return isError ? { error: content[0].text } : JSON.parse(content[0].text);
};

test('mcp: initialize and list tools', () => {
  const init = handle({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-03-26' } });
  assert.equal(init.result.protocolVersion, '2025-03-26');
  assert.equal(init.result.serverInfo.name, 'fuzzy-toolkit');
  assert.deepEqual(init.result.capabilities, { tools: { listChanged: false } });
  assert.equal(handle({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '1999-01-01' } }).result.protocolVersion, '2025-06-18');
  assert.equal(handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), undefined);
  assert.deepEqual(handle({ jsonrpc: '2.0', id: 9, method: 'ping' }).result, {});

  const { tools } = handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' }).result;
  assert.deepEqual(tools.map((t) => t.name), ['compare', 'closest', 'search', 'dedupe', 'join', 'check', 'find']);
  for (const t of tools) {
    assert.ok(t.description.length > 40, t.name);
    assert.equal(t.inputSchema.type, 'object');
    assert.equal(t.annotations.readOnlyHint, true);
  }
});

test('mcp: tools return the library results', () => {
  assert.equal(call('compare', { a: 'The Beatles', b: 'beatles', preset: 'music' }).score, 100);
  assert.equal(call('closest', { query: 'javascrpt', candidates: ['java', 'javascript', 'typescript'] }).best.item, 'javascript');
  assert.equal(call('closest', { query: 'zzz', candidates: ['java'] }).best, null);
  assert.deepEqual(
    call('search', { query: 'queen', items: [{ t: 'Bohemian Rhapsody', a: 'Queen' }, { t: 'Imagine', a: 'John Lennon' }], keys: ['t', 'a'] }).map((m) => m.item.t),
    ['Bohemian Rhapsody'],
  );
  const deduped = call('dedupe', { items: ['Jean Dupont', 'Dupont Jean', 'Marie Curie'] });
  assert.deepEqual(deduped, { unique: ['Jean Dupont', 'Marie Curie'], removed: 1, duplicateGroups: [['Jean Dupont', 'Dupont Jean']] });
  assert.deepEqual(call('join', { left: ['Apple Inc.', 'Nobody'], right: ['APPLE', 'Microsoft'], ignoreWords: ['inc'] }), [
    { item: 'Apple Inc.', match: 'APPLE', score: 100 },
    { item: 'Nobody', match: null, score: null },
  ]);
  assert.equal(call('check', { guess: 'bohemian rapsody', answers: 'Bohemian Rhapsody' }).verdict, 'correct');
  assert.deepEqual(call('check', { guess: 'queen', answers: { title: 'Bohemian Rhapsody', artist: 'Queen' } }).missing, ['title']);
  assert.equal(call('find', { text: "c'est bohemian rapsody de queen", query: 'Bohemian Rhapsody' })[0].text, 'bohemian rapsody');
});

test('mcp: mistakes come back as tool errors the agent can fix', () => {
  assert.match(call('search', { query: 'x', items: [{ name: 'x' }] }).error, /pass "keys"/);
  assert.match(call('compare', { a: 'x' }).error, /Missing argument "b"/);
  assert.match(call('compare', { a: 'x', b: 'y', treshold: 80 }).error, /Unknown argument "treshold"/);
  assert.match(call('compare', { a: 'x', b: 'y', threshold: 800 }).error, /0-100/);
  assert.match(call('compare', { a: 'x', b: 'y', preset: 'songs' }).error, /Invalid argument "preset"/);
  const unknown = handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'nope' } });
  assert.equal(unknown.error.code, -32602);
  assert.equal(handle({ jsonrpc: '2.0', id: 4, method: 'resources/list' }).error.code, -32601);
});

test('mcp: npx fuzzy-toolkit mcp speaks JSON-RPC over stdio', () => {
  const bin = fileURLToPath(new URL('../bin/fuzzy-toolkit.mjs', import.meta.url));
  const input = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'compare', arguments: { a: 'Molière', b: 'moliere' } } },
  ].map((m) => JSON.stringify(m)).join('\n') + '\n';
  const lines = execFileSync(process.execPath, [bin, 'mcp'], { input, encoding: 'utf8' }).trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(lines.map((l) => l.id), [1, 2]);
  assert.equal(JSON.parse(lines[1].result.content[0].text).score, 100);
});

/* Warnings ------------------------------------------------------------------- */

function warnings(fn) {
  const seen = [];
  const original = console.warn;
  console.warn = (message) => seen.push(message);
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return seen;
}

test('warnings: options from other libraries or with typos', () => {
  const [typo] = warnings(() => similarity('a', 'b', { treshold: 80 }));
  assert.match(typo, /Unknown option "treshold".*Did you mean "threshold"/);
  const [alias] = warnings(() => similarity('a', 'b', { ignoreCase: true }));
  assert.match(alias, /Unknown option "ignoreCase".*caseSensitive/);
  assert.deepEqual(warnings(() => similarity('a', 'b', { threshold: 70, preset: 'music', phonetic: true })), []);
  assert.deepEqual(warnings(() => createMatcher({ keys: 'x', limit: 3, includeMatches: true })), []);
});

test('warnings: a 0-1 threshold, as in string-similarity or Fuse.js', () => {
  assert.match(warnings(() => isMatch('a', 'a', 0.85))[0], /use 85 instead/);
  assert.match(warnings(() => search('a', ['a'], { threshold: 0.6 }))[0], /use 60 instead/);
  assert.deepEqual(warnings(() => isMatch('a', 'a', 0)), []);
});

test('warnings: a key no item has', () => {
  const items = [{ name: 'Paris' }, { name: 'Lyon' }];
  const [missing] = warnings(() => assert.equal(closest('pari', items, { keys: 'nmae' }), undefined));
  assert.match(missing, /No item has the key "nmae".*Keys of the first item: name/);
  assert.deepEqual(warnings(() => search('pari', items, { keys: ['name'] })), []);
  assert.deepEqual(warnings(() => search('x', [{ a: { b: 'x' } }], { keys: ['a.b'] })), []);
  assert.deepEqual(warnings(() => search('x', [{ city: null }], { keys: ['city'] })), []);
});

test('errors: options that are not an object', () => {
  assert.throws(() => closest('a', ['a'], 'name'), /Options must be an object.*keys/);
});

/* ai-setup -------------------------------------------------------------------- */

test('ai-setup: writes the block once, keeps the rest of the file', async () => {
  const { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join: joinPath } = await import('node:path');
  const { setup, detect, upsertBlock } = await import('../bin/ai-setup.mjs');

  const dir = mkdtempSync(joinPath(tmpdir(), 'fuzzy-ai-'));
  assert.deepEqual(detect(dir), ['agents']);
  assert.deepEqual(setup(dir, ['agents']), ['created  AGENTS.md']);
  assert.match(readFileSync(joinPath(dir, 'AGENTS.md'), 'utf8'), /fuzzy-toolkit:start[\s\S]*closest\('pari'[\s\S]*fuzzy-toolkit:end/);

  writeFileSync(joinPath(dir, 'CLAUDE.md'), '# Rules\n\nUse tabs.\n');
  mkdirSync(joinPath(dir, '.cursor'));
  assert.deepEqual(detect(dir), ['agents', 'claude', 'cursor']);
  assert.deepEqual(setup(dir, detect(dir)), ['unchanged AGENTS.md', 'updated  CLAUDE.md', 'created  .cursor/rules/fuzzy-toolkit.mdc']);
  const claude = readFileSync(joinPath(dir, 'CLAUDE.md'), 'utf8');
  assert.ok(claude.startsWith('# Rules\n\nUse tabs.\n\n<!-- fuzzy-toolkit:start -->'));
  assert.match(readFileSync(joinPath(dir, '.cursor/rules/fuzzy-toolkit.mdc'), 'utf8'), /^---\ndescription: .*\nalwaysApply: false\n---/);
  assert.ok(existsSync(joinPath(dir, 'AGENTS.md')));

  // An old block is replaced, text around it is kept.
  const updated = upsertBlock('a\n<!-- fuzzy-toolkit:start -->\nold\n<!-- fuzzy-toolkit:end -->\nb\n', 'new');
  assert.equal(updated, 'a\n<!-- fuzzy-toolkit:start -->\nnew\n<!-- fuzzy-toolkit:end -->\nb\n');
});
