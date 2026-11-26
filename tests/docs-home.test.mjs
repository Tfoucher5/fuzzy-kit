// The home page shows code with its result: check each result against the library.
import test from 'node:test';
import assert from 'node:assert/strict';
import { check, closest, dedupe, find, normalize, search } from '../dist/esm/index.js';
import de from '../dist/esm/lang/de.js';
import es from '../dist/esm/lang/es.js';
import it from '../dist/esm/lang/it.js';
import nl from '../dist/esm/lang/nl.js';
import { examples, jobs, words } from '../docs/.vitepress/theme/components/home/data.js';

const result = (key) => jobs.find((j) => j.key === key).result;

test('home: job results are what the library returns', () => {
  const c = check('bohemian rapsody', 'Bohemian Rhapsody');
  assert.equal(result('check'), `{ verdict: '${c.verdict}', score: ${c.score} }`);

  const s = search('new yo', ['New York', 'New York City', 'Newark'], { preset: 'search' });
  assert.equal(result('search'), s.map((r) => `${r.item} (${r.score})`).join(', '));

  const best = closest('pyhton', ['python', 'java', 'php']);
  assert.equal(result('closest'), `{ item: '${best.item}', score: ${best.score} }`);

  const [f] = find("je crois que c'est bohemian rapsody", 'Bohemian Rhapsody');
  assert.equal(result('find'), `'${f.text}', from ${f.start} to ${f.end}`);

  assert.equal(result('dedupe'), `[${dedupe(['Beyoncé', 'beyonce', 'Adele']).map((x) => `'${x}'`).join(', ')}]`);
});

test('home: every demo example is a correct answer', () => {
  for (const e of examples) {
    const options = e.preset ? { preset: e.preset } : {};
    assert.equal(check(e.answer, e.expected, options).verdict, 'correct', e.label);
  }
});

test('home: numbers in words read as shown', () => {
  const packs = { de, es, it, nl };
  for (const w of words) {
    if (w.code === 'en' && w.n === 'Beatles') {
      assert.equal(check(w.text, w.n, { preset: 'music' }).verdict, 'correct');
      continue;
    }
    const options = packs[w.code] ? { languages: [packs[w.code]] } : {};
    assert.equal(normalize(w.text, options), w.n, w.text);
  }
});
