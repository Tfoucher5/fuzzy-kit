import test from 'node:test';
import assert from 'node:assert/strict';
import { createSSRApp, h, nextTick, ref } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Highlight, useFuzzySearch, segments } from '../dist/esm/vue.js';
import { fuzzySearch, segments as svelteSegments } from '../dist/esm/svelte.js';

const songs = [
  { title: 'Bohemian Rhapsody', artist: 'Queen' },
  { title: 'Hotel California', artist: 'Eagles' },
  { title: 'Stairway to Heaven', artist: 'Led Zeppelin' },
];

test('vue: useFuzzySearch follows refs, getters and plain values', async () => {
  const query = ref('');
  const items = ref(songs);
  const limit = ref(2);
  const results = useFuzzySearch(items, query, () => ({ keys: ['title', 'artist'], limit: limit.value }));
  assert.deepEqual(results.value.map((r) => r.index), [0, 1]);
  query.value = 'bohem';
  assert.equal(results.value[0].item.title, 'Bohemian Rhapsody');
  assert.deepEqual(results.value[0].ranges, [[0, 5]]);
  query.value = 'zepelin';
  assert.equal(results.value[0].item.artist, 'Led Zeppelin');
  items.value = [{ title: 'Zep', artist: 'Zeppelin tribute' }];
  await nextTick();
  assert.equal(results.value[0].item.title, 'Zep');
  const none = useFuzzySearch(['a', 'b'], '  ', { whenEmpty: 'none' });
  assert.deepEqual(none.value, []);
  assert.equal(useFuzzySearch(['Paris', 'Lyon'], 'pari').value[0].item, 'Paris');
});

test('vue: Highlight renders marks', async () => {
  const app = createSSRApp({ render: () => h(Highlight, { text: 'Bohemian Rhapsody', ranges: [[0, 5], [9, 11]] }) });
  assert.equal(await renderToString(app), '<!--[--><mark>Bohem</mark>ian <mark>Rh</mark>apsody<!--]-->');
  const strong = createSSRApp({ render: () => h(Highlight, { text: 'abc', ranges: [[1, 2]], as: 'strong' }) });
  assert.equal(await renderToString(strong), '<!--[-->a<strong>b</strong>c<!--]-->');
});

test('segments: ranges cut the text, overlaps and out of range included', () => {
  assert.deepEqual(segments('Bohemian Rhapsody', [[0, 5]]), [{ text: 'Bohem', match: true }, { text: 'ian Rhapsody', match: false }]);
  assert.deepEqual(svelteSegments('abcdef', [[4, 9], [1, 3], [2, 4]]), [
    { text: 'a', match: false }, { text: 'bc', match: true }, { text: 'd', match: true }, { text: 'ef', match: true },
  ]);
  assert.deepEqual(segments('abc'), [{ text: 'abc', match: false }]);
  assert.deepEqual(segments(''), []);
});

/** A minimal Svelte-compatible writable store. */
function writable(value) {
  const runs = new Set();
  return {
    subscribe(run) {
      runs.add(run);
      run(value);
      return () => runs.delete(run);
    },
    set(next) {
      value = next;
      for (const run of runs) run(value);
    },
  };
}

test('svelte: fuzzySearch is a store that follows its inputs', () => {
  const query = writable('');
  const items = writable(songs);
  const results = fuzzySearch(items, query, { keys: ['title', 'artist'], limit: 2 });
  const seen = [];
  const stop = results.subscribe((value) => seen.push(value));
  assert.equal(seen.length, 1, 'one first value');
  assert.deepEqual(seen[0].map((r) => r.index), [0, 1]);
  query.set('hotel');
  assert.equal(seen.at(-1)[0].item.title, 'Hotel California');
  assert.deepEqual(seen.at(-1)[0].ranges, [[0, 5]]);
  items.set([{ title: 'Hotel Costes', artist: 'Various' }]);
  assert.equal(seen.at(-1)[0].item.title, 'Hotel Costes');
  // A second subscriber gets the current value at once.
  let second;
  const stop2 = results.subscribe((value) => (second = value));
  assert.equal(second, seen.at(-1));
  stop2();
  stop();
  query.set('anything');
  assert.equal(seen.length, 3, 'no update after the last unsubscribe');
  // Plain values, an empty query, and RxJS-style subscriptions.
  let plain;
  fuzzySearch(['Paris', 'Lyon'], 'lyn', {}).subscribe((v) => (plain = v))();
  assert.equal(plain[0].item, 'Lyon');
  let empty;
  fuzzySearch(['a'], '', { whenEmpty: 'none' }).subscribe((v) => (empty = v))();
  assert.deepEqual(empty, []);
  const rx = { subscribe: (run) => (run(['Nice']), { unsubscribe: () => {} }) };
  let fromRx;
  fuzzySearch(rx, 'nice').subscribe((v) => (fromRx = v))();
  assert.equal(fromRx[0].item, 'Nice');
});
