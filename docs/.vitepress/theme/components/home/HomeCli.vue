<script setup lang="ts">
import { withBase } from 'vitepress'
import { terminal } from './data.js'
</script>

<template>
  <section class="ft-dark cli">
    <div class="ft-container grid">
      <div v-reveal class="text">
        <span class="ft-eyebrow">Command line</span>
        <h2 class="ft-h2">Clean a CSV without writing code.</h2>
        <p class="ft-lead">dedupe, group, join, search and compare, straight from your terminal. CSV, JSON or plain text in, the same format out.</p>
        <a :href="withBase('/recipes/cli')" class="ft-link link">Command line recipe</a>
      </div>
      <div v-reveal class="window">
        <div class="bar" aria-hidden="true"><span /><span /><span /><code>~/shop</code></div>
        <div class="screen" role="img" aria-label="Deduplicating customers.csv: 5 rows in, 3 rows out">
          <div
            v-for="(line, i) in terminal" :key="i" class="line" :class="line.kind"
            :style="{ animationDelay: `${i * 0.35}s` }" aria-hidden="true"
          >{{ line.text }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cli {
  padding: 96px 0;
}

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

.text .ft-h2 {
  font-size: clamp(32px, 4vw, 46px);
}

.link {
  color: #c7d2fe;
}

.window {
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid var(--ft-ink-line);
  background: var(--ft-ink-2);
  box-shadow: 0 40px 80px -40px rgba(0, 0, 0, 0.6);
}

.bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ft-ink-line);
}

.bar span {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #3a4150;
}

.bar code {
  margin-left: 10px;
  font-size: 12px;
  color: var(--ft-ink-muted);
  background: none;
}

.screen {
  min-height: 330px;
  padding: 20px;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  line-height: 1.85;
}

.line {
  white-space: pre;
}

.cmd { color: var(--ft-ink-text); }
.in { color: var(--ft-ink-muted); }
.out { color: #a7f3d0; }

.is-in .line {
  animation: type-line 11s ease infinite both;
}

@keyframes type-line {
  0% { opacity: 0; transform: translateY(4px); }
  3%, 88% { opacity: 1; transform: none; }
  96%, 100% { opacity: 0; }
}
</style>
