import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Highlight, useFuzzySearch } from '../dist/esm/react.js';

const songs = [
  { title: 'Bohemian Rhapsody', artist: 'Queen' },
  { title: 'Stairway to Heaven', artist: 'Led Zeppelin' },
];

function List({ query, options }) {
  const results = useFuzzySearch(songs, query, { keys: ['title', 'artist'], ...options });
  return h('ul', null, results.map((r) => h('li', { key: r.index }, h(Highlight, { text: r.text, ranges: r.ranges }))));
}

test('react: useFuzzySearch + Highlight', () => {
  assert.equal(
    renderToStaticMarkup(h(List, { query: 'bohem' })),
    '<ul><li><mark>Bohem</mark>ian Rhapsody</li></ul>',
  );
  assert.equal(renderToStaticMarkup(h(List, { query: '' })), '<ul><li>Bohemian Rhapsody</li><li>Stairway to Heaven</li></ul>');
  assert.equal(renderToStaticMarkup(h(List, { query: ' ', options: { whenEmpty: 'none' } })), '<ul></ul>');
  assert.equal(renderToStaticMarkup(h(List, { query: undefined })), '<ul><li>Bohemian Rhapsody</li><li>Stairway to Heaven</li></ul>');
  assert.equal(renderToStaticMarkup(h(Highlight, { text: 'New York City', ranges: [[4, 6], [0, 3]] })), '<mark>New</mark> <mark>Yo</mark>rk City');
});
