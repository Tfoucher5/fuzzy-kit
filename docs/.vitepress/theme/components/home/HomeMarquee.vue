<script setup lang="ts">
import { words } from './data.js'

// Two copies side by side so the loop is seamless.
const loop = [...words, ...words]
</script>

<template>
  <section class="marquee" aria-label="Numbers in words, in six languages">
    <ul class="track">
      <li v-for="(w, i) in loop" :key="i" :aria-hidden="i >= words.length">
        <code class="code">{{ w.code }}</code>
        <span>{{ w.text }}</span>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
        <mark>{{ w.n }}</mark>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.marquee {
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  padding: 18px 0;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
}

.track {
  display: flex;
  gap: 14px;
  width: max-content;
  margin: 0;
  padding: 0;
  list-style: none;
  animation: scroll 40s linear infinite;
}

.marquee:hover .track {
  animation-play-state: paused;
}

li {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 8px 14px;
  border-radius: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  white-space: nowrap;
  font-size: 15px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

li svg {
  color: var(--vp-c-text-3);
}

.code {
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: none;
  padding: 0;
}

mark {
  font-family: var(--vp-font-family-mono);
  padding: 0 5px;
  border-radius: 4px;
}

@keyframes scroll {
  to { transform: translateX(calc(-50% - 7px)); }
}
</style>
