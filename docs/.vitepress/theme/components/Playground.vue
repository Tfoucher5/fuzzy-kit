<script setup lang="ts">
import { computed, ref } from 'vue'
import { compare, check, createIndex, find, findAll, highlight, repair, segments, type Preset } from '../../../../src/index'

type Tab = 'check' | 'search' | 'find' | 'findAll' | 'repair'
const TABS: Record<Tab, string> = {
  check: 'check() a guess',
  search: 'search() as you type',
  find: 'find() in a message',
  findAll: 'findAll() of a list',
  repair: 'repair() AI output',
}
const tab = ref<Tab>('check')

// --- check ---------------------------------------------------------------
const answer = ref('Bohemian Rhapsody - Remastered 2011')
const guess = ref('bohemian rapsody')
const preset = ref<Preset | ''>('music')
const checkOptions = computed(() => (preset.value ? { preset: preset.value } : {}))
const result = computed(() => check(guess.value, answer.value, checkOptions.value))
const details = computed(() => compare(guess.value, answer.value, checkOptions.value))

// --- search --------------------------------------------------------------
const songs = [
  ['Bohemian Rhapsody', 'Queen'], ["Don't Stop Me Now", 'Queen'], ['Stairway to Heaven', 'Led Zeppelin'],
  ['Hey Jude', 'The Beatles'], ['Let It Be', 'The Beatles'], ['Billie Jean', 'Michael Jackson'],
  ['Beat It', 'Michael Jackson'], ['Smells Like Teen Spirit', 'Nirvana'], ['Alors on danse', 'Stromae'],
  ['Papaoutai', 'Stromae'], ["L'Aventurier", 'Indochine'], ['Get Lucky', 'Daft Punk'],
  ['Around the World', 'Daft Punk'], ['Shape of You', 'Ed Sheeran'], ['Bad Guy', 'Billie Eilish'],
  ['Rolling in the Deep', 'Adele'], ['Hotel California', 'Eagles'], ["Sweet Child O' Mine", "Guns N' Roses"],
  ['Wonderwall', 'Oasis'], ['Thriller', 'Michael Jackson'], ['Imagine', 'John Lennon'],
  ['La Vie en rose', 'Édith Piaf'], ['Je te promets', 'Johnny Hallyday'], ['Highway to Hell', 'AC/DC'],
  ['Back in Black', 'AC/DC'], ['Crazy in Love', 'Beyoncé'], ['Single Ladies', 'Beyoncé'],
  ['Uptown Funk', 'Mark Ronson'], ['Blinding Lights', 'The Weeknd'], ['Dancing Queen', 'ABBA'],
].map(([title, artist]) => ({ title, artist }))
const index = createIndex(songs, { keys: ['title', 'artist'], preset: 'search' })
const query = ref('zep stair')
const searched = computed(() => {
  const start = performance.now()
  const results = index.search(query.value, { limit: 6 })
  return { results, ms: performance.now() - start }
})

// --- find ----------------------------------------------------------------
const message = ref("je crois que c'est bohemian rapsody de queen, non ?")
const target = ref('Bohemian Rhapsody')
const found = computed(() => find(message.value, target.value))
const pieces = computed(() => highlight(message.value, target.value))

// --- findAll -------------------------------------------------------------
const order = ref('Hi, I would like 2 iphone 15, one macbok air and the airpod pro please')
const catalog = ref(['iPhone 15', 'iPhone 15 Pro', 'MacBook Air', 'MacBook Pro', 'AirPods Pro', 'iPad'].join('\n'))
const mentioned = computed(() => {
  const items = catalog.value.split('\n').map((line) => line.trim()).filter(Boolean)
  const results = findAll(order.value, items)
  return { results, parts: segments(order.value, results.map((r) => [r.start, r.end] as [number, number])) }
})

// --- repair --------------------------------------------------------------
const output = ref(JSON.stringify({ "Full Name": "Ada Lovelace", "Email Address": "ada@example.com", priority: "hight", age: "36", tags: "featur" }, null, 2))
const schema = ref(JSON.stringify({
  type: 'object',
  properties: {
    fullName: { type: 'string' },
    email: { type: 'string' },
    priority: { enum: ['low', 'medium', 'high'] },
    age: { type: 'integer' },
    tags: { type: 'array', items: { enum: ['bug', 'feature', 'docs'] } },
  },
  required: ['fullName', 'email', 'title'],
}, null, 2))
const repaired = computed(() => {
  try {
    return { ok: true as const, ...repair(JSON.parse(output.value), JSON.parse(schema.value)) }
  } catch (error) {
    return { ok: false as const, error: (error as Error).message }
  }
})

const verdictLabel = { correct: 'Correct', close: 'Almost!', wrong: 'Wrong' } as const
</script>

<template>
  <div class="pg">
    <div class="pg-tabs" role="tablist">
      <button v-for="(label, t) in TABS" :key="t" role="tab"
        :aria-selected="tab === t" :class="{ active: tab === t }" @click="tab = t">
        {{ label }}
      </button>
    </div>

    <div v-if="tab === 'check'" class="pg-body">
      <label>Expected answer <input v-model="answer" /></label>
      <label>Player's guess <input v-model="guess" autofocus /></label>
      <label>Preset
        <select v-model="preset">
          <option value="">none</option>
          <option value="music">music</option>
          <option value="strict">strict</option>
        </select>
      </label>
      <div class="pg-result">
        <span class="pg-badge" :class="result.verdict">{{ verdictLabel[result.verdict] }}</span>
        <div class="pg-bar"><div :class="result.verdict" :style="{ width: result.score + '%' }" /></div>
        <strong>{{ result.score }}</strong>
      </div>
      <p class="pg-note">Compared as <code>{{ details.a || '∅' }}</code> and <code>{{ details.b || '∅' }}</code></p>
      <pre class="pg-code">check({{ JSON.stringify(guess) }}, {{ JSON.stringify(answer) }}{{ preset ? `, { preset: '${preset}' }` : '' }})</pre>
    </div>

    <div v-else-if="tab === 'search'" class="pg-body">
      <label>Search {{ songs.length }} songs <input v-model="query" placeholder="Try: bohem, zep stair, beyonce…" /></label>
      <ul class="pg-list">
        <li v-for="m in searched.results" :key="m.index">
          <span>
            <template v-for="(s, i) in highlight(`${m.item.title} · ${m.item.artist}`, query, { preset: 'search' })" :key="i">
              <mark v-if="s.match">{{ s.text }}</mark><template v-else>{{ s.text }}</template>
            </template>
          </span>
          <span class="pg-score">{{ m.score }}</span>
        </li>
        <li v-if="!searched.results.length" class="pg-empty">No match</li>
      </ul>
      <p class="pg-note">{{ searched.ms.toFixed(2) }} ms, in your browser</p>
    </div>

    <div v-else-if="tab === 'findAll'" class="pg-body">
      <label>Message <textarea v-model="order" rows="2" /></label>
      <label>Known names, one per line <textarea v-model="catalog" rows="5" /></label>
      <p class="pg-text">
        <template v-for="(s, i) in mentioned.parts" :key="i">
          <mark v-if="s.match">{{ s.text }}</mark><template v-else>{{ s.text }}</template>
        </template>
      </p>
      <ul class="pg-list">
        <li v-for="r in mentioned.results" :key="r.start"><span>"{{ r.text }}" is <strong>{{ r.item }}</strong></span><span class="pg-score">{{ r.score }}</span></li>
        <li v-if="!mentioned.results.length" class="pg-empty">Nothing from the list</li>
      </ul>
    </div>

    <div v-else-if="tab === 'repair'" class="pg-body">
      <div class="pg-cols">
        <label>What the model returned <textarea v-model="output" rows="9" spellcheck="false" class="pg-mono" /></label>
        <label>JSON Schema <textarea v-model="schema" rows="9" spellcheck="false" class="pg-mono" /></label>
      </div>
      <template v-if="repaired.ok">
        <pre class="pg-code">{{ JSON.stringify(repaired.value, null, 2) }}</pre>
        <ul class="pg-list">
          <li v-for="(c, i) in repaired.changes" :key="i"><span><code>{{ c.path || '(value)' }}</code> {{ c.kind }}: {{ JSON.stringify(c.from) }} → {{ c.kind === 'removed' ? 'removed' : JSON.stringify(c.to) }}</span></li>
          <li v-for="(u, i) in repaired.unresolved" :key="'u' + i" class="pg-empty"><span><code>{{ u.path }}</code> {{ u.reason }}</span></li>
        </ul>
      </template>
      <p v-else class="pg-note">Not valid JSON yet: {{ repaired.error }}</p>
    </div>

    <div v-else class="pg-body">
      <label>Chat message <textarea v-model="message" rows="2" /></label>
      <label>Look for <input v-model="target" /></label>
      <p class="pg-text">
        <template v-for="(s, i) in pieces" :key="i">
          <mark v-if="s.match">{{ s.text }}</mark><template v-else>{{ s.text }}</template>
        </template>
      </p>
      <p class="pg-note" v-if="found.length">Found {{ found.map((f) => `"${f.text}" (${f.score})`).join(', ') }}</p>
      <p class="pg-note" v-else>Not found</p>
    </div>
  </div>
</template>

<style scoped>
.pg { border: 1px solid var(--vp-c-divider); border-radius: 14px; overflow: hidden; background: var(--vp-c-bg-soft); }
.pg-tabs { display: flex; flex-wrap: wrap; border-bottom: 1px solid var(--vp-c-divider); }
.pg-tabs button { padding: 12px 16px; font-weight: 600; font-size: 14px; color: var(--vp-c-text-2); border-bottom: 2px solid transparent; }
.pg-tabs button.active { color: var(--vp-c-brand-1); border-bottom-color: var(--vp-c-brand-1); }
.pg-body { padding: 20px; display: grid; gap: 12px; }
label { display: grid; gap: 4px; font-size: 13px; color: var(--vp-c-text-2); }
input, select, textarea { font-size: 16px; padding: 8px 12px; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg); color: var(--vp-c-text-1); }
input:focus, select:focus, textarea:focus { outline: 2px solid var(--vp-c-brand-1); outline-offset: -1px; }
.pg-result { display: flex; align-items: center; gap: 12px; }
.pg-badge { padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 14px; color: #fff; min-width: 84px; text-align: center; }
.correct { background: var(--gr-ok); }
.close { background: var(--gr-close); }
.wrong { background: var(--gr-wrong); }
.pg-bar { flex: 1; height: 10px; border-radius: 99px; background: var(--vp-c-divider); overflow: hidden; }
.pg-bar > div { height: 100%; transition: width 0.2s; }
.pg-note { font-size: 13px; color: var(--vp-c-text-2); margin: 0; }
.pg-code { margin: 0; padding: 10px 12px; border-radius: 8px; background: var(--vp-code-block-bg); color: var(--vp-code-block-color); font-size: 13px; overflow-x: auto; }
.pg-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 12px; }
.pg-mono { font-family: var(--vp-font-family-mono); font-size: 13px; }
.pg-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
.pg-list li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 12px; border-radius: 8px; background: var(--vp-c-bg); margin: 0; }
.pg-score { font-variant-numeric: tabular-nums; color: var(--vp-c-text-2); }
.pg-empty { color: var(--vp-c-text-2); }
.pg-text { margin: 0; padding: 12px; border-radius: 8px; background: var(--vp-c-bg); }
mark { background: var(--ft-marker); color: var(--ft-marker-text); border-radius: 3px; padding: 0 1px; font-weight: 600; }
</style>
