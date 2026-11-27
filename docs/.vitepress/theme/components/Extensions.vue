<script setup lang="ts">
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import { search } from '../../../../src/index'
import { data, type Extension, type Kind, type Wanted } from '../../extensions.data'

const query = ref('')
const kind = ref<Kind | 'all'>('all')

const shown = computed<Extension[]>(() => {
  const list = data.extensions.filter((e) => kind.value === 'all' || e.kind === kind.value)
  const q = query.value.trim()
  if (!q) return list
  // The search box runs on fuzzy-toolkit itself.
  return search(q, list, { keys: ['id', 'package', 'description'], preset: 'search' }).map((m) => m.item)
})

const builtIn = computed(() => shown.value.filter((e) => e.source === 'built-in'))
const community = computed(() => shown.value.filter((e) => e.source !== 'built-in'))
const wanted = computed<Wanted[]>(() => data.wanted.filter((w) => kind.value === 'all' || w.kind === kind.value))

const counts = [
  { n: data.extensions.filter((e) => e.source === 'built-in').length, label: 'built in' },
  { n: data.extensions.filter((e) => e.source !== 'built-in').length, label: 'from the community' },
  { n: data.wanted.filter((w) => !w.assignee).length, label: 'waiting for you' },
].filter((c) => c.n)

const command = (w: Wanted) => `npx fuzzy-toolkit new-pack ${w.kind} ${w.id}`

function usage(e: Extension): string {
  if (e.source === 'built-in') {
    if (e.kind === 'preset') return `compare(a, b, { preset: '${e.id}' })`
    if (e.package === 'fuzzy-toolkit') return `compare(a, b, { languages: ['${e.id}'] })`
    return `import ${e.id} from '${e.package}'\ncompare(a, b, { languages: [${e.id}] })`
  }
  const name = e.id.replace(/[^a-z0-9]+(.)/gi, (_, c: string) => c.toUpperCase()).replace(/^[^a-z_$]/i, '_$&')
  const option = e.kind === 'language' ? `languages: ['en', ${name}]` : `preset: ${name}`
  return `npm install ${e.package}\n\nimport ${name} from '${e.package}'\ncompare(a, b, { ${option} })`
}

const LABELS = { 'built-in': 'Built in', reviewed: 'Reviewed', npm: 'On npm' } as const

const copied = ref('')
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = text
    setTimeout(() => copied.value === text && (copied.value = ''), 1600)
  } catch {
    // No clipboard (insecure context): the text stays selectable.
  }
}

// A soft light follows the pointer over the cards, like on the contributors page.
function move(event: PointerEvent) {
  const el = event.currentTarget as HTMLElement
  const box = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${event.clientX - box.left}px`)
  el.style.setProperty('--my', `${event.clientY - box.top}px`)
}

const terminal = [
  { kind: 'cmd', text: '$ npx fuzzy-toolkit new-pack language pt' },
  { kind: 'out', text: 'Created ./fuzzy-toolkit-lang-pt' },
  { kind: 'in', text: '  package.json  index.js  index.test.js  README.md' },
  { kind: 'cmd', text: '$ cd fuzzy-toolkit-lang-pt && npm install' },
  { kind: 'cmd', text: '$ npm test' },
  { kind: 'out', text: '✔ pt: vinte e um = 21, o/a/os/as stripped' },
  { kind: 'cmd', text: '$ npm publish' },
  { kind: 'out', text: '+ fuzzy-toolkit-lang-pt@0.1.0  → listed here' },
]

const registryEntry = `{
  "package": "fuzzy-toolkit-lang-pt",
  "kind": "language",
  "id": "pt",
  "description": "Portuguese: vinte e um, ordinals, articles, stop words.",
  "repository": "https://github.com/you/fuzzy-toolkit-lang-pt"
}`
</script>

<template>
  <div class="ft-home ext">
    <section class="hero">
      <div class="ft-dots dots" aria-hidden="true" />
      <div class="ft-container hero-inner">
        <span class="ft-eyebrow ft-fade-up">Extensions</span>
        <h1 class="title ft-fade-up" style="animation-delay: 0.1s">
          Teach it <span class="ft-hl" style="animation-delay: 0.8s">your data</span>.
        </h1>
        <p class="ft-lead ft-fade-up" style="animation-delay: 0.2s">
          Language packs teach fuzzy-toolkit how a language writes numbers, its articles, stop words and how it sounds.
          Presets are ready-made settings for one kind of data: song titles, addresses, company names.
        </p>
        <dl class="counts ft-fade-up" style="animation-delay: 0.3s">
          <div v-for="c in counts" :key="c.label"><dd>{{ c.n }}</dd><dt>{{ c.label }}</dt></div>
        </dl>
        <div class="bar ft-fade-up" style="animation-delay: 0.4s">
          <input v-model="query" type="search" placeholder="Search: spanish, address, music..." aria-label="Search extensions" />
          <div class="kinds" role="group" aria-label="Kind">
            <button v-for="k in (['all', 'language', 'preset'] as const)" :key="k" :class="{ active: kind === k }" :aria-pressed="kind === k" @click="kind = k">
              {{ k === 'all' ? 'All' : k === 'language' ? 'Languages' : 'Presets' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section id="built-in" class="ft-container block">
      <h2 v-reveal class="ft-h2 small">Shipped with fuzzy-toolkit</h2>
      <p v-if="!builtIn.length" class="empty">Nothing matches.</p>
      <div class="grid" @pointermove="move">
        <div class="spot" aria-hidden="true" />
        <article v-for="(e, i) in builtIn" :key="e.kind + e.id" v-reveal class="card" :style="{ transitionDelay: `${(i % 6) * 0.05}s` }">
          <header>
            <span class="id">{{ e.id }}</span>
            <span class="kind">{{ e.kind }}</span>
            <span class="badge brand">{{ LABELS[e.source] }}</span>
          </header>
          <p>{{ e.description }}</p>
          <pre class="code"><code>{{ usage(e) }}</code></pre>
        </article>
      </div>
    </section>

    <section id="community" class="ft-container block">
      <h2 v-reveal class="ft-h2 small">From the community</h2>
      <p v-if="!data.npmReachable" class="empty">npm could not be reached when this page was built: only reviewed extensions are listed.</p>
      <div v-if="!community.length" v-reveal class="first">
        <span class="first-icon" aria-hidden="true">+</span>
        <span>
          <strong>{{ query || kind !== 'all' ? 'Nothing matches.' : 'Nobody has published one yet.' }}</strong>
          The first community pack gets its author on the <a :href="withBase('/contributors')">contributors page</a>. Pick one from the list below.
        </span>
      </div>
      <div v-else class="grid" @pointermove="move">
        <div class="spot" aria-hidden="true" />
        <article v-for="(e, i) in community" :key="e.package" v-reveal class="card" :style="{ transitionDelay: `${(i % 6) * 0.05}s` }">
          <header>
            <span class="id">{{ e.id }}</span>
            <span class="kind">{{ e.kind }}</span>
            <span class="badge" :class="{ brand: e.source === 'reviewed' }">{{ LABELS[e.source] }}</span>
          </header>
          <p>{{ e.description }}</p>
          <pre class="code"><code>{{ usage(e) }}</code></pre>
          <footer>
            <a :href="`https://www.npmjs.com/package/${e.package}`" target="_blank" rel="noopener">{{ e.package }}<template v-if="e.version">@{{ e.version }}</template></a>
            <a v-if="e.repository" :href="e.repository" target="_blank" rel="noopener">Source</a>
          </footer>
        </article>
      </div>
    </section>

    <section v-if="wanted.length" id="wanted" class="ft-container block">
      <div v-reveal class="ft-head">
        <span class="ft-eyebrow">Wanted</span>
        <h2 class="ft-h2 small">People asked for these</h2>
        <p class="ft-lead">Pick one: the command writes the package with its tests, and the issue says what the pack must handle.</p>
      </div>
      <div class="grid wanted" @pointermove="move">
        <div class="spot" aria-hidden="true" />
        <article v-for="(w, i) in wanted" :key="w.url" v-reveal class="card" :class="{ taken: w.assignee }" :style="{ transitionDelay: `${(i % 6) * 0.05}s` }">
          <header>
            <span class="id">{{ w.id }}</span>
            <span class="kind">{{ w.kind }}</span>
            <span class="badge" :class="w.assignee ? 'muted' : 'open'">{{ w.assignee ? 'Taken' : 'Open' }}</span>
          </header>
          <p>{{ w.title }}</p>
          <button class="command" :aria-label="`Copy ${command(w)}`" @click="copy(command(w))">
            <code><span class="prompt">$</span> {{ command(w) }}</code>
            <span class="copy">{{ copied === command(w) ? 'Copied' : 'Copy' }}</span>
          </button>
          <footer>
            <a :href="w.url" target="_blank" rel="noopener">{{ w.assignee ? 'Being written by @' + w.assignee : 'Take it on the issue →' }}</a>
          </footer>
        </article>
      </div>
    </section>

    <section id="add-yours" class="ft-dark make">
      <div class="ft-container make-grid">
        <div v-reveal class="text">
          <span class="ft-eyebrow">Add yours</span>
          <h2 class="ft-h2">From idea to npm in <span class="ft-hl">one command</span>.</h2>
          <ol class="steps">
            <li><strong>Start the package.</strong> <code>new-pack</code> writes <code>package.json</code>, the pack and a test that uses <a :href="withBase('/guide/extensions#testing-your-pack')">fuzzy-toolkit/testing</a>.</li>
            <li><strong>Publish it</strong> as <code>fuzzy-toolkit-lang-&lt;code&gt;</code> or <code>fuzzy-toolkit-preset-&lt;name&gt;</code> with the keyword <code>fuzzy-toolkit-plugin</code>. It shows up on this page at the next rebuild, at least once a week.</li>
            <li><strong>Get the Reviewed badge</strong> (optional): a pull request that adds it to <a href="https://github.com/Tfoucher5/fuzzy-toolkit/blob/master/docs/extensions.json">docs/extensions.json</a>.</li>
          </ol>
          <a :href="withBase('/guide/extensions')" class="ft-link link">Writing a pack, step by step</a>
        </div>
        <div v-reveal class="window">
          <div class="wbar" aria-hidden="true"><span /><span /><span /><code>~/packs</code></div>
          <div class="screen" role="img" aria-label="Creating, testing and publishing a Portuguese language pack">
            <div v-for="(line, i) in terminal" :key="i" class="line" :class="line.kind" :style="{ animationDelay: `${i * 0.4}s` }" aria-hidden="true">{{ line.text }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="ft-container block review">
      <div v-reveal class="ft-head">
        <span class="ft-eyebrow">Reviewed badge</span>
        <h2 class="ft-h2 small">One entry in a JSON file</h2>
        <p class="ft-lead">
          A maintainer checks that the package does what it says and that its tests use <code>fuzzy-toolkit/testing</code>.
          A pack good enough for everyone can also go into the core: open a
          <a href="https://github.com/Tfoucher5/fuzzy-toolkit/issues/new/choose">Language request or Preset proposal</a>.
        </p>
      </div>
      <pre v-reveal class="code big"><code>{{ registryEntry }}</code></pre>
      <p class="note">Updated {{ data.builtAt }}.</p>
    </section>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
}

.dots {
  -webkit-mask-image: radial-gradient(ellipse 70% 80% at 50% 0%, #000 30%, transparent 100%);
  mask-image: radial-gradient(ellipse 70% 80% at 50% 0%, #000 30%, transparent 100%);
}

.hero-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding-top: 88px;
  padding-bottom: 32px;
  text-align: center;
}

.hero-inner .ft-lead {
  max-width: 720px;
}

.title {
  font-family: var(--ft-font-display);
  font-size: clamp(40px, 6vw, 72px);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.04em;
}

.title .ft-hl {
  padding: 0 8px;
}

.counts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 36px;
  margin: 4px 0 0;
}

.counts div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.counts dd {
  margin: 0;
  font-family: var(--ft-font-display);
  font-size: 34px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.counts dt {
  font-size: 15px;
  color: var(--vp-c-text-2);
}

.bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
  max-width: 720px;
  margin-top: 8px;
}

.bar input {
  flex: 1 1 260px;
  min-height: 52px;
  padding: 0 18px;
  font-size: 17px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  box-shadow: 0 12px 30px -18px rgba(14, 17, 22, 0.3);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.bar input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 4px var(--vp-c-brand-soft);
}

.kinds {
  display: flex;
  padding: 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}

.kinds button {
  padding: 0 16px;
  min-height: 42px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.kinds button.active {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  box-shadow: 0 2px 8px -4px rgba(14, 17, 22, 0.3);
}

.block {
  padding-top: 64px;
}

.ft-h2.small {
  font-size: clamp(28px, 3.4vw, 40px);
  margin-bottom: 24px;
}

.ft-head .ft-h2.small {
  margin-bottom: 0;
}

/* Cards */
.grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 18px;
}

.spot {
  position: absolute;
  inset: -40px;
  z-index: 2;
  pointer-events: none;
  border-radius: 40px;
  background: radial-gradient(420px circle at calc(var(--mx, -999px) + 40px) calc(var(--my, -999px) + 40px), var(--vp-c-brand-soft), transparent 65%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.grid:hover .spot {
  opacity: 1;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 22px;
  border-radius: 20px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: opacity 0.7s cubic-bezier(0.2, 0.7, 0.2, 1), transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.card.is-in:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 18px 40px -20px rgba(14, 17, 22, 0.25);
}

.card header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.id {
  font-family: var(--ft-font-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}

.kind {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.badge {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
}

.badge.brand {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.badge.open {
  background: var(--ft-marker);
  color: var(--ft-marker-text);
}

.card p {
  flex: 1;
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.card footer {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 14px;
  font-weight: 600;
}

.card.taken {
  opacity: 0.75;
}

/* Code stays dark in both themes, with light text on it. */
.code {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--ft-ink);
  color: var(--ft-ink-text);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}

/* Thin scrollbars that match the dark code blocks. */
.code,
.command code,
.screen {
  scrollbar-width: thin;
  scrollbar-color: var(--ft-ink-line) transparent;
}

.code::-webkit-scrollbar,
.command code::-webkit-scrollbar,
.screen::-webkit-scrollbar {
  height: 6px;
}

.code::-webkit-scrollbar-track,
.command code::-webkit-scrollbar-track,
.screen::-webkit-scrollbar-track {
  background: transparent;
}

.code::-webkit-scrollbar-thumb,
.command code::-webkit-scrollbar-thumb,
.screen::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--ft-ink-line);
}

.code:hover::-webkit-scrollbar-thumb,
.screen:hover::-webkit-scrollbar-thumb {
  background: var(--ft-ink-muted);
}

.code code {
  padding: 0;
  background: none;
  color: inherit;
  font-size: inherit;
}

.code.big {
  padding: 22px 24px;
  font-size: 14px;
  border: 1px solid var(--ft-ink-line);
}

.command {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--ft-ink);
  color: var(--ft-ink-text);
  text-align: left;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.command:hover,
.command:focus-visible {
  box-shadow: 0 0 0 2px var(--ft-marker);
}

.command code {
  flex: 1;
  min-width: 0;
  line-height: 1.6;
  overflow-wrap: anywhere;
  padding: 0;
  background: none;
  color: inherit;
  font-size: 13px;
}

.prompt {
  color: var(--ft-marker);
}

.copy {
  flex: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--ft-ink-muted);
}

.command:hover .copy {
  color: var(--ft-marker);
}

.empty,
.note {
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.note {
  margin-top: 16px;
}

.first {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px;
  border-radius: 20px;
  border: 1px dashed var(--vp-c-divider);
  font-size: 16px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.first strong {
  display: block;
  color: var(--vp-c-text-1);
}

.first-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px dashed var(--vp-c-divider);
  font-family: var(--ft-font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-2);
  animation: pulse 2.4s ease-in-out infinite;
}

@keyframes pulse {
  50% { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); transform: scale(1.06); }
}

/* Add yours */
.make {
  margin-top: 96px;
  padding: 96px 0;
}

.make-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: 48px;
  align-items: center;
}

.text {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.text .ft-h2 {
  font-size: clamp(32px, 4vw, 46px);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding-left: 20px;
  font-size: 16px;
  line-height: 1.6;
  color: #b8bfcc;
}

.steps strong {
  color: #fff;
}

.steps code,
.review .ft-lead code {
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.88em;
}

.steps code {
  background: var(--ft-ink-3);
  color: var(--ft-ink-text);
}

.make a {
  color: #c7d2fe;
}

.window {
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid var(--ft-ink-line);
  background: var(--ft-ink-2);
  box-shadow: 0 40px 80px -40px rgba(0, 0, 0, 0.6);
}

.wbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ft-ink-line);
}

.wbar span {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #3a4150;
}

.wbar code {
  margin-left: 10px;
  font-size: 12px;
  color: var(--ft-ink-muted);
  background: none;
}

.screen {
  min-height: 300px;
  padding: 20px;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  line-height: 1.85;
}

.line { white-space: pre; }
.line.cmd { color: var(--ft-ink-text); }
.line.in { color: var(--ft-ink-muted); }
.line.out { color: #a7f3d0; }

.is-in .line {
  animation: type-line 12s ease infinite both;
}

@keyframes type-line {
  0% { opacity: 0; transform: translateY(4px); }
  3%, 88% { opacity: 1; transform: none; }
  96%, 100% { opacity: 0; }
}

.review {
  padding-bottom: 104px;
}

.review .ft-lead code {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
}

@media (prefers-reduced-motion: reduce) {
  .is-in .line,
  .first-icon {
    animation: none;
  }
}
</style>
