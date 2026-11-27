<script setup lang="ts">
import { computed, ref } from 'vue'
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
</script>

<template>
  <div class="ext">
    <div class="ext-bar">
      <input v-model="query" type="search" placeholder="Search: spanish, address, music..." aria-label="Search extensions" />
      <div class="ext-kinds" role="group" aria-label="Kind">
        <button v-for="k in (['all', 'language', 'preset'] as const)" :key="k" :class="{ active: kind === k }" @click="kind = k">
          {{ k === 'all' ? 'All' : k === 'language' ? 'Languages' : 'Presets' }}
        </button>
      </div>
    </div>

    <h2 id="built-in">Shipped with fuzzy-toolkit</h2>
    <p v-if="!builtIn.length" class="ext-empty">Nothing matches.</p>
    <div class="ext-grid">
      <article v-for="e in builtIn" :key="e.kind + e.id" class="ext-card">
        <header>
          <code class="ext-id">{{ e.id }}</code>
          <span class="ext-kind">{{ e.kind }}</span>
          <span class="ext-source built-in">{{ LABELS[e.source] }}</span>
        </header>
        <p>{{ e.description }}</p>
        <pre class="ext-code"><code>{{ usage(e) }}</code></pre>
      </article>
    </div>

    <h2 id="community">From the community</h2>
    <p v-if="!data.npmReachable" class="ext-empty">npm could not be reached when this page was built: only reviewed extensions are listed.</p>
    <p v-if="!community.length" class="ext-empty">
      {{ query || kind !== 'all' ? 'Nothing matches.' : 'None yet. Yours could be the first: see below.' }}
    </p>
    <div class="ext-grid">
      <article v-for="e in community" :key="e.package" class="ext-card">
        <header>
          <code class="ext-id">{{ e.id }}</code>
          <span class="ext-kind">{{ e.kind }}</span>
          <span class="ext-source" :class="e.source">{{ LABELS[e.source] }}</span>
        </header>
        <p>{{ e.description }}</p>
        <pre class="ext-code"><code>{{ usage(e) }}</code></pre>
        <footer>
          <a :href="`https://www.npmjs.com/package/${e.package}`" target="_blank" rel="noopener">{{ e.package }}<template v-if="e.version">@{{ e.version }}</template></a>
          <a v-if="e.repository" :href="e.repository" target="_blank" rel="noopener">Source</a>
        </footer>
      </article>
    </div>
    <template v-if="wanted.length">
      <h2 id="wanted">Wanted</h2>
      <p class="ext-lead">People asked for these. Pick one: the command writes a package with its tests, and the issue says what the pack must do.</p>
      <div class="ext-grid">
        <article v-for="w in wanted" :key="w.url" class="ext-card">
          <header>
            <code class="ext-id">{{ w.id }}</code>
            <span class="ext-kind">{{ w.kind }}</span>
            <span class="ext-source" :class="w.assignee ? 'taken' : 'reviewed'">{{ w.assignee ? 'Taken' : 'Open' }}</span>
          </header>
          <p>{{ w.title }}</p>
          <pre class="ext-code"><code>{{ command(w) }}</code></pre>
          <footer>
            <a :href="w.url" target="_blank" rel="noopener">{{ w.assignee ? 'Being written by @' + w.assignee : 'Take it on the issue' }}</a>
          </footer>
        </article>
      </div>
    </template>
    <p class="ext-note">Updated {{ data.builtAt }}.</p>
  </div>
</template>

<style scoped>
.ext-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 16px 0 8px; }
.ext-bar input { flex: 1 1 240px; font-size: 16px; padding: 8px 12px; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg); color: var(--vp-c-text-1); }
.ext-bar input:focus { outline: 2px solid var(--vp-c-brand-1); outline-offset: -1px; }
.ext-kinds { display: flex; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
.ext-kinds button { padding: 8px 14px; font-size: 14px; font-weight: 600; color: var(--vp-c-text-2); }
.ext-kinds button.active { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }
.ext-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.ext-card { display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); min-width: 0; }
.ext-card header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.ext-card p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--vp-c-text-2); flex: 1; }
.ext-id { font-size: 15px; font-weight: 700; }
.ext-kind { font-size: 12px; color: var(--vp-c-text-2); }
.ext-source { margin-left: auto; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--vp-c-default-soft); color: var(--vp-c-text-2); }
.ext-source.built-in, .ext-source.reviewed { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }
.ext-code { margin: 0; padding: 8px 10px; border-radius: 8px; background: var(--vp-code-block-bg); font-size: 12px; line-height: 1.5; overflow-x: auto; white-space: pre; }
.ext-card footer { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; }
.ext-empty, .ext-note, .ext-lead { color: var(--vp-c-text-2); font-size: 14px; }
.ext-source.taken { background: var(--vp-c-default-soft); color: var(--vp-c-text-3); }
</style>
