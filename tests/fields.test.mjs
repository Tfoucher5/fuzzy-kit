import test from 'node:test';
import assert from 'node:assert/strict';
import { mapFields } from '../dist/esm/index.js';

test('mapFields: headers to a schema, across naming styles and synonyms', () => {
  const { mapping, unmatched, missing } = mapFields(
    ['First Name', 'E-mail', 'Zip', 'Phone #', 'DOB', 'last_name', 'Company'],
    ['firstName', 'lastName', 'email', 'postalCode', 'phoneNumber', 'dateOfBirth', 'companyName'],
  );
  assert.deepEqual(mapping, {
    'First Name': 'firstName',
    'E-mail': 'email',
    Zip: 'postalCode',
    'Phone #': 'phoneNumber',
    DOB: 'dateOfBirth',
    last_name: 'lastName',
    Company: 'companyName',
  });
  assert.deepEqual(unmatched, []);
  assert.deepEqual(missing, []);
});

test('mapFields: French headers, typos, one to one', () => {
  const { mapping } = mapFields(['Nom', 'Prénom', 'Courriel', 'Téléphone', 'Code postal', 'Ville'], ['lastName', 'firstName', 'email', 'phone', 'postalCode', 'city']);
  assert.deepEqual(Object.values(mapping), ['lastName', 'firstName', 'email', 'phone', 'postalCode', 'city']);
  assert.deepEqual(mapFields(['colour', 'size'], ['color', 'weight']).mapping, { colour: 'color' });
  // Each field is used once: the exact name wins, the other is left over.
  const twice = mapFields(['name', 'Name '], ['name']);
  assert.deepEqual(twice.mapping, { name: 'name' });
  assert.deepEqual(twice.unmatched, ['Name ']);
});

test('mapFields: options, odd names and empty lists', () => {
  assert.deepEqual(mapFields(['ref'], ['sku']).mapping, {});
  assert.deepEqual(mapFields(['ref'], ['sku'], { synonyms: { sku: ['ref'] } }).mapping, { ref: 'sku' });
  assert.deepEqual(mapFields(['colour'], ['color'], { threshold: 90 }).mapping, {});
  const odd = mapFields(['__proto__', 'constructor'], ['__proto__', 'constructor']);
  assert.equal(Object.getPrototypeOf(odd.mapping), Object.prototype);
  assert.deepEqual(Object.keys(odd.mapping), ['__proto__', 'constructor']);
  assert.deepEqual(mapFields([], ['a']), { mapping: {}, matches: [], unmatched: [], missing: ['a'] });
  assert.deepEqual(mapFields(['a'], []).unmatched, ['a']);
  assert.deepEqual(mapFields(['userID', 'HTTPStatus', 'line2'], ['user_id', 'http_status', 'line_2']).mapping, {
    userID: 'user_id',
    HTTPStatus: 'http_status',
    line2: 'line_2',
  });
});
