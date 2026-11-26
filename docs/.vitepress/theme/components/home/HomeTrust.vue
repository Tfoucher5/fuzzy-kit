<script setup lang="ts">
import { trust } from './data.js'
</script>

<template>
  <section class="trust" aria-label="Safe to depend on">
    <ul class="ft-container grid">
      <li v-for="(t, i) in trust" :key="t.title" v-reveal class="item" :style="{ transitionDelay: `${i * 0.08}s` }">
        <span class="icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 4.4 3.4 8.3 8 9 4.6-.7 8-4.6 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
        </span>
        <h3>{{ t.title }}</h3>
        <p>{{ t.text }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.trust {
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
  gap: 28px;
  margin: 0 auto;
  padding-top: 72px;
  padding-bottom: 72px;
  list-style: none;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
}

.icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
}

h3 {
  font-size: 17px;
  font-weight: 600;
}

p {
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
</style>
