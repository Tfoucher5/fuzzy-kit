<script setup lang="ts">
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import { jobs } from './data.js'

const active = ref(jobs[0].key)
const job = computed(() => jobs.find((j) => j.key === active.value)!)
</script>

<template>
  <section class="ft-section code-section">
    <div class="ft-container">
      <div v-reveal class="ft-head">
        <h2 class="ft-h2">One line per job</h2>
        <p class="ft-lead">No configuration to learn before the first result.</p>
      </div>
      <div v-reveal class="layout">
        <div class="tabs" role="tablist" aria-label="Use case">
          <button
            v-for="j in jobs" :key="j.key" type="button" role="tab"
            :aria-selected="j.key === active" class="tab" @click="active = j.key"
          >
            {{ j.title }}<code>{{ j.fn }}()</code>
          </button>
        </div>
        <div class="panel ft-code" role="tabpanel">
          <div class="panel-bar">
            <span>example.ts</span>
            <a :href="withBase('/playground')">Open the playground</a>
          </div>
          <pre :key="job.key" class="panel-code ft-pop"><span class="kw">import</span> { {{ job.fn }} } <span class="kw">from</span> <span class="str">'fuzzy-toolkit'</span>

{{ job.code }}</pre>
          <p :key="`r-${job.key}`" class="panel-result"><span class="arrow">→</span><span class="ft-pop">{{ job.result }}</span></p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.code-section {
  padding-top: 0;
  padding-bottom: 80px;
}

.layout {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 24px;
}

.tabs {
  flex: 1 1 260px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tab {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 10px 16px;
  border-radius: 14px;
  border: 1px solid transparent;
  text-align: left;
  font-size: 16px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.tab:hover {
  background: var(--vp-c-bg-soft);
}

.tab code {
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: none;
  padding: 0;
}

.tab[aria-selected='true'] {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-soft);
  font-weight: 600;
}

.tab[aria-selected='true'] code {
  color: var(--vp-c-brand-1);
}

.panel {
  flex: 999 1 480px;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--ft-ink-line);
  border-radius: 20px;
}

.panel-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background: var(--ft-ink-2);
  border-bottom: 1px solid var(--ft-ink-line);
  font-size: 13px;
  color: #b8bfcc;
}

.panel-bar a {
  color: var(--ft-marker);
  font-weight: 600;
}

.panel-code {
  margin: 0;
  padding: 24px;
  font-size: 15px;
  line-height: 1.8;
  overflow-x: auto;
  color: var(--ft-ink-text);
}

.kw { color: #c4b5fd; }
.str { color: #a7f3d0; }

.panel-result {
  display: flex;
  gap: 12px;
  padding: 16px 24px 22px;
  border-top: 1px solid var(--ft-ink-line);
  font-size: 15px;
  color: var(--ft-marker);
}

.arrow {
  color: var(--ft-ink-muted);
}
</style>
