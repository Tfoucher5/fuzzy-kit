<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { stats } from './data.js'

// Numbers count up the first time they scroll into view (static in the HTML).
const shown = ref(stats.map((s) => s.n))
const root = ref<HTMLElement>()
let observer: IntersectionObserver | undefined
let frame = 0

function countUp() {
  const start = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / 1400)
    const eased = 1 - (1 - t) ** 3
    shown.value = stats.map((s) => Math.round(s.n * eased))
    if (t < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
  shown.value = stats.map(() => 0)
  observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return
    observer?.disconnect()
    countUp()
  }, { threshold: 0.4 })
  if (root.value) observer.observe(root.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(frame)
})
</script>

<template>
  <section class="ft-container stats-wrap" aria-label="In numbers">
    <dl ref="root" class="stats">
      <div v-for="(s, i) in stats" :key="s.label" class="stat">
        <dt>{{ s.label }}</dt>
        <dd>{{ shown[i] }}{{ s.unit }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.stats-wrap {
  padding-top: 64px;
  padding-bottom: 64px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 1px;
  margin: 0;
  background: var(--vp-c-divider);
  border: 1px solid var(--vp-c-divider);
  border-radius: 22px;
  overflow: hidden;
}

.stat {
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-end;
  gap: 8px;
  padding: 32px 28px;
  background: var(--vp-c-bg);
}

dd {
  margin: 0;
  font-family: var(--ft-font-display);
  font-size: 60px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

dt {
  font-size: 15px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
</style>
