<script setup lang="ts">
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import { benchmarks } from './data.js'

const active = ref(benchmarks[0].key)
const bench = computed(() => benchmarks.find((b) => b.key === active.value)!)
</script>

<template>
  <section class="ft-container bench-wrap">
    <div v-reveal class="bench ft-dark">
      <div class="side">
        <span class="ft-eyebrow">Benchmarks</span>
        <h2 class="ft-h2">Finds more. Waits less.</h2>
        <p class="ft-lead">{{ bench.sub }}</p>
        <div class="tabs" role="tablist" aria-label="Benchmark">
          <button
            v-for="b in benchmarks" :key="b.key" type="button" role="tab"
            :aria-selected="b.key === active" class="tab" @click="active = b.key"
          >{{ b.label }}</button>
        </div>
        <a :href="withBase('/guide/benchmarks')" class="ft-link more">Methodology and all results</a>
      </div>
      <div class="chart">
        <span class="metric">{{ bench.metric }}</span>
        <div :key="bench.key" class="rows">
          <div v-for="(r, i) in bench.rows" :key="r.name" class="row">
            <div class="row-head">
              <span class="name" :class="{ me: r.me }">{{ r.name }}</span>
              <span class="value">{{ r.value.toFixed(1) }}% <span class="time">· {{ r.time }}</span></span>
            </div>
            <div class="track"><div class="bar" :class="{ me: r.me }" :style="{ width: `${r.value}%`, animationDelay: `${i * 0.12}s` }" /></div>
          </div>
        </div>
        <p class="note">Node 22, median of 7 runs, public data. Run <code>npm run bench:versus</code> yourself.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bench-wrap {
  padding-bottom: 104px;
}

.bench {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 40px;
  align-items: center;
  padding: clamp(28px, 4vw, 56px);
  border-radius: 28px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.side .ft-h2 {
  font-size: clamp(32px, 4vw, 46px);
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tab {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid #3a4150;
  color: var(--ft-ink-text);
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.tab[aria-selected='true'] {
  background: #fff;
  border-color: #fff;
  color: var(--ft-marker-text);
}

.more {
  color: #c7d2fe;
}

.chart {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.metric {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ft-ink-muted);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.row-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 15px;
}

.name {
  font-weight: 600;
}

.name.me {
  color: var(--ft-marker);
}

.value {
  font-family: var(--vp-font-family-mono);
}

.time {
  color: var(--ft-ink-muted);
}

.track {
  height: 14px;
  border-radius: 999px;
  background: var(--ft-ink-3);
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 999px;
  background: #5b6475;
  transform-origin: left center;
}

.bar.me {
  background: var(--ft-marker);
}

.is-in .bar {
  animation: ft-grow 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.note {
  font-size: 13px;
  color: var(--ft-ink-muted);
}

.note code {
  background: none;
  color: var(--ft-ink-text);
  padding: 0;
}
</style>
