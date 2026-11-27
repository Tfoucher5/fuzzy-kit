<script setup lang="ts">
import { withBase } from 'vitepress'
import { data } from '../../../extensions.data'

// The chips float on a slow loop; the link goes to the extensions page.
const chips = [
  ...data.extensions.map((e) => ({ id: e.id, kind: e.kind, wanted: false })),
  ...data.wanted.map((w) => ({ id: w.id, kind: w.kind, wanted: true })),
]
const open = data.wanted.filter((w) => !w.assignee).length
</script>

<template>
  <section class="ft-section ext">
    <div class="ft-container grid">
      <div v-reveal class="text">
        <span class="ft-eyebrow">Extensions</span>
        <h2 class="ft-h2">Your language. Your data. <span class="ft-hl">One pack</span>.</h2>
        <p class="ft-lead">
          Language packs and presets teach fuzzy-toolkit how your data is written. Browse the ones that exist,
          or start yours in one command{{ open ? `: ${open} are waiting for an author` : '' }}.
        </p>
        <div class="actions">
          <a :href="withBase('/extensions')" class="ft-btn ft-btn-primary">Explore extensions</a>
          <code class="cmd">npx fuzzy-toolkit new-pack language pt</code>
        </div>
      </div>
      <a v-reveal :href="withBase('/extensions')" class="cloud" aria-label="See all extensions">
        <span
          v-for="(c, i) in chips" :key="c.kind + c.id" class="chip" :class="{ wanted: c.wanted, preset: c.kind === 'preset' }"
          :style="{ animationDelay: `${(i % 7) * -0.9}s`, transitionDelay: `${i * 0.04}s` }"
        >{{ c.id }}<small>{{ c.wanted ? 'wanted' : c.kind }}</small></span>
      </a>
    </div>
  </section>
</template>

<style scoped>
.grid {
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

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}

.cmd {
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--ft-ink);
  color: var(--ft-ink-text);
  font-size: 14px;
}

.cloud {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  padding: 32px;
  border-radius: 28px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  transition: border-color 0.25s ease;
}

.cloud:hover {
  border-color: var(--vp-c-brand-1);
}

.chip {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-family: var(--ft-font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  animation: float 6s ease-in-out infinite;
}

.chip small {
  font-family: var(--vp-font-family-base);
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.chip.preset {
  color: var(--vp-c-brand-1);
}

.chip.wanted {
  border-style: dashed;
  color: var(--vp-c-text-2);
}

.chip.wanted small {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--ft-marker);
  color: var(--ft-marker-text);
}

.cloud:hover .chip {
  animation-play-state: paused;
}

@keyframes float {
  50% { transform: translateY(-6px); }
}

@media (prefers-reduced-motion: reduce) {
  .chip { animation: none; }
}
</style>
