import test from 'node:test';
import assert from 'node:assert/strict';
import { repair } from '../dist/esm/index.js';

const schema = {
  type: 'object',
  properties: {
    email: { type: 'string' },
    priority: { enum: ['low', 'medium', 'high'] },
    age: { type: 'integer' },
    tags: { type: 'array', items: { enum: ['bug', 'feature', 'docs'] } },
    done: { type: 'boolean' },
    address: { type: 'object', properties: { postalCode: { type: 'string' }, city: { type: 'string' } }, additionalProperties: false },
  },
  required: ['email', 'title'],
};

test('repair: keys, enum values, types, arrays, nested objects', () => {
  const input = { 'Email Address': 'ada@x.io', Priority: 'hight', age: '36', tags: 'featur', done: 'yes', address: { Zip: 75001, Ville: 'Paris', extra: 1 }, note: 'x' };
  const copy = structuredClone(input);
  const { value, changes, unresolved } = repair(input, schema);
  assert.deepEqual(value, { email: 'ada@x.io', priority: 'high', age: 36, tags: ['feature'], done: true, address: { postalCode: '75001', city: 'Paris' }, note: 'x' });
  assert.deepEqual(input, copy, 'the input is left alone');
  assert.deepEqual(changes.map((c) => `${c.kind} ${c.path}`), [
    'key Email Address', 'key Priority', 'value priority', 'type age', 'type tags', 'value tags[0]', 'type done',
    'key address.Zip', 'type address.postalCode', 'key address.Ville', 'removed address.extra',
  ]);
  assert.deepEqual(unresolved, [{ path: 'title', reason: 'required, missing' }]);
});

test('repair: leaves what is right, reports what it cannot fix', () => {
  const good = { email: 'a@b.c', priority: 'low', age: 3, tags: ['bug'], done: false, title: 'T' };
  assert.deepEqual(repair(good, schema), { value: good, changes: [], unresolved: [] });
  const { value, unresolved } = repair({ email: 'a', title: 't', priority: 'urgent', age: '3.5' }, schema);
  assert.equal(value.priority, 'urgent');
  assert.equal(value.age, '3.5');
  assert.deepEqual(unresolved.map((u) => u.path), ['priority']);
  // Odd inputs and schemas.
  assert.deepEqual(repair('42', { type: 'number' }).value, 42);
  assert.deepEqual(repair(['1', 'x'], { type: 'array', items: { type: 'number' } }).value, [1, 'x']);
  assert.deepEqual(repair(null, schema).value, null);
  assert.deepEqual(repair({ a: 1 }, {}).value, { a: 1 });
  assert.deepEqual(repair(true, { type: 'string' }).value, 'true');
  assert.deepEqual(repair('NO', { type: ['null', 'boolean'] }).value, false);
  const proto = repair(JSON.parse('{"__proto__": {"x": 1}}'), { properties: { a: {} } }).value;
  assert.equal(Object.getPrototypeOf(proto), Object.prototype);
  assert.deepEqual(Object.keys(proto), ['__proto__']);
});

test('repair: options', () => {
  assert.equal(repair('hihg', { enum: ['high'] }, { threshold: 95 }).value, 'hihg');
  assert.deepEqual(repair({ ref: 'A1' }, { properties: { sku: {} } }, { synonyms: { sku: ['ref'] } }).value, { sku: 'A1' });
  assert.deepEqual(repair({ colour: 'red' }, { properties: { color: {} } }, { keyThreshold: 95 }).value, { colour: 'red' });
});

test('repair: words that are object properties are not booleans; huge numbers stay text', () => {
  const schema = { type: 'object', properties: { ok: { type: 'boolean' }, n: { type: 'number' } } };
  for (const word of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    const { value, changes } = repair({ ok: word }, schema);
    assert.equal(value.ok, word, word);
    assert.deepEqual(changes, []);
  }
  assert.equal(repair({ n: '1e400' }, schema).value.n, '1e400');
  assert.equal(repair({ n: '-1e400' }, schema).value.n, '-1e400');
  assert.equal(repair({ n: '1e3' }, schema).value.n, 1000);
});
