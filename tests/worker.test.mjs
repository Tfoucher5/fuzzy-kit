import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createWorkerIndex } from '../dist/esm/worker.js';
import { createIndex } from '../dist/esm/index.js';

/** A worker thread seen through the Web Worker interface. */
function thread() {
  const w = new Worker(new URL('./fixtures/serve-worker.mjs', import.meta.url));
  return {
    postMessage: (m) => w.postMessage(m),
    addEventListener: (_type, listener) => w.on('message', (data) => listener({ data })),
    terminate: () => w.terminate(),
  };
}

const songs = [
  { title: 'Bohemian Rhapsody', artist: { name: 'Queen' } },
  { title: 'Hotel California', artist: { name: 'Eagles' } },
  { title: 'Stairway to Heaven', artist: { name: 'Led Zeppelin' } },
];
const options = { keys: ['title', 'artist.name'], preset: 'search' };

test('worker: the same results as an index on this thread, with the original items', async () => {
  const index = createWorkerIndex(thread(), songs, options);
  try {
    const local = createIndex(songs, options);
    for (const query of ['bohem', 'zepelin', 'hotel calif', 'queen', 'nothing at all', '']) {
      const remote = await index.search(query, { limit: 2, includeMatches: true });
      assert.deepEqual(remote, local.search(query, { limit: 2, includeMatches: true }), query);
      for (const m of remote) assert.equal(m.item, songs[m.index], 'the very same object');
    }
    // Several queries in flight resolve to their own results.
    const [a, b] = await Promise.all([index.search('hotel'), index.search('stairway')]);
    assert.equal(a[0].item.title, 'Hotel California');
    assert.equal(b[0].item.title, 'Stairway to Heaven');
    // The same options apply to the new list.
    const more = [{ title: 'Paris', artist: { name: 'Zaz' } }];
    index.setItems(more);
    assert.equal((await index.search('pari'))[0].item, more[0]);
  } finally {
    index.terminate();
  }
});

test('worker: terminate rejects what is pending; function keys are refused', async () => {
  const index = createWorkerIndex(thread(), ['a'], {});
  const pending = index.search('a');
  index.terminate();
  await assert.rejects(pending, /terminated/);
  const idle = { postMessage() {}, addEventListener() {} };
  assert.throws(() => createWorkerIndex(idle, [], { keys: (x) => x }), /function/);
});

test('worker: errors in the worker come back as rejections', async () => {
  const index = createWorkerIndex(thread(), [{ a: 1 }], {});
  try {
    await assert.rejects(index.search('x'), /keys/);
  } finally {
    index.terminate();
  }
});

test('worker: takes a Node worker_threads Worker as it is', async () => {
  const index = createWorkerIndex(new Worker(new URL('./fixtures/serve-worker.mjs', import.meta.url)), songs, options);
  try {
    assert.equal((await index.search('bohem', { limit: 1 }))[0].item, songs[0]);
  } finally {
    index.terminate();
  }
  assert.throws(() => createWorkerIndex({ postMessage() {} }, songs, options), /needs a Worker/);
});
