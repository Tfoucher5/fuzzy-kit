<script setup lang="ts">
import { ref } from 'vue'

// A soft light follows the pointer over the cards.
const grid = ref<HTMLElement>()
function move(event: PointerEvent) {
  const el = grid.value
  if (!el) return
  const box = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${event.clientX - box.left}px`)
  el.style.setProperty('--my', `${event.clientY - box.top}px`)
}
</script>

<template>
  <section class="ft-section features">
    <div class="ft-container">
      <div v-reveal class="ft-head">
        <span class="ft-eyebrow">Why fuzzy-toolkit</span>
        <h2 class="ft-h2">Everything people get <span class="ft-hl">almost</span> right.</h2>
        <p class="ft-lead">One smart score that forgives the way humans really type, and a function for each job.</p>
      </div>

      <div ref="grid" class="grid" @pointermove="move">
        <div class="spot" aria-hidden="true" />

        <article v-reveal class="tile">
          <h3>Right by default</h3>
          <p>On 3,000 simulated blind-test guesses, 97.6% of right answers were accepted and 0% of wrong ones.</p>
          <div class="big"><strong>97.6%</strong><span>accepted</span></div>
          <div class="meter"><div class="meter-fill" /></div>
        </article>

        <article v-reveal class="tile">
          <h3>Search as you type</h3>
          <p>Prefixes, typos and acronyms, with the letters to highlight.</p>
          <div class="search">
            <div class="search-input">new yo<span class="ft-caret" aria-hidden="true" /></div>
            <div class="search-row"><span><span class="ft-hl">New</span> <span class="ft-hl late">Yo</span>rk</span><span class="score">97.5</span></div>
            <div class="search-row"><span><span class="ft-hl">New</span> <span class="ft-hl late">Yo</span>rk City</span><span class="score">94.62</span></div>
          </div>
        </article>

        <article v-reveal class="tile dark-tile">
          <h3>Your editor knows it</h3>
          <p>Written in TypeScript. Every option autocompletes.</p>
          <div class="editor">
            <div class="editor-line"><span class="fn">compare</span>(a, b, { pre<span class="ft-caret marker-caret" aria-hidden="true" /></div>
            <ul class="suggest">
              <li class="on">preset</li>
              <li>phonetic</li>
              <li>partial</li>
            </ul>
          </div>
        </article>

        <article v-reveal class="tile">
          <h3>Tiny, no baggage</h3>
          <p>ESM and CommonJS, Node 18+ and every browser. Language packs only weigh in when you import them.</p>
          <div class="pair">
            <div><strong>~10 kB</strong><span>min + gzip</span></div>
            <div><strong>0</strong><span>dependencies</span></div>
          </div>
        </article>

        <article v-reveal class="tile">
          <h3>Made for real data</h3>
          <p>The music preset drops featurings, "Remastered" and leading articles.</p>
          <div class="noise">
            <div><span class="ft-hl">Imagine</span> <s>(Remastered 2010)</s></div>
            <div><s>the</s> <span class="ft-hl late">beatles</span></div>
          </div>
        </article>

        <article v-reveal class="tile soft-tile">
          <h3>Ready for AI agents</h3>
          <p>An MCP server for Claude, Cursor and VS Code, and <code>ai-setup</code> to teach your assistant the API.</p>
          <div class="term ft-code">
            <div><span class="muted">$</span> npx fuzzy-toolkit mcp</div>
            <div><span class="ok">✓</span> compare, closest, search,</div>
            <div class="indent">dedupe, join, check, find</div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features {
  padding-top: 80px;
  padding-bottom: 40px;
}

.grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: 18px;
}

.spot {
  position: absolute;
  inset: -40px;
  z-index: 2;
  pointer-events: none;
  border-radius: 40px;
  background: radial-gradient(460px circle at calc(var(--mx, -999px) + 40px) calc(var(--my, -999px) + 40px), var(--vp-c-brand-soft), transparent 65%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.grid:hover .spot {
  opacity: 1;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 26px;
  border-radius: 22px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: opacity 0.7s cubic-bezier(0.2, 0.7, 0.2, 1), transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.tile.is-in:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px -20px rgba(14, 17, 22, 0.25);
  border-color: var(--vp-c-brand-1);
}

.tile:nth-child(3), .tile:nth-child(6) { transition-delay: 0.08s; }
.tile:nth-child(4), .tile:nth-child(7) { transition-delay: 0.16s; }

h3 {
  font-family: var(--ft-font-display);
  font-size: 22px;
  font-weight: 600;
}

.tile p {
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.tile > :last-child {
  margin-top: auto;
}

.big {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-top: auto;
}

.big strong,
.pair strong {
  font-family: var(--ft-font-display);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
}

.big strong { font-size: 64px; }

.big span {
  font-size: 14px;
  color: var(--vp-c-text-2);
  padding-bottom: 8px;
}

.meter {
  height: 10px;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  width: 97.6%;
  border-radius: 999px;
  background: var(--vp-c-brand-1);
  transform-origin: left;
  transform: scaleX(0);
}

.is-in .meter-fill {
  animation: ft-grow 1.2s cubic-bezier(0.2, 0.7, 0.2, 1) 0.3s both;
  transform: none;
}

.search {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.search-input {
  min-height: 40px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-size: 15px;
}

.search-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 15px;
}

.search-row:first-of-type {
  background: var(--vp-c-bg);
}

.score {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.is-in .late {
  animation-delay: 0.7s;
}

.dark-tile {
  background: var(--ft-ink);
  border-color: var(--ft-ink-line);
  color: var(--ft-ink-text);
}

.dark-tile h3 { color: #fff; }
.dark-tile p { color: #b8bfcc; }

.editor {
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
}

.editor-line {
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--ft-ink-2);
  border: 1px solid var(--ft-ink-line);
}

.fn { color: #c7d2fe; }

.marker-caret {
  background: var(--ft-marker);
}

.suggest {
  list-style: none;
  margin: 6px 0 0 110px;
  padding: 6px;
  max-width: 190px;
  border-radius: 10px;
  background: var(--ft-ink-3);
  border: 1px solid #3a4150;
  font-size: 13px;
  opacity: 0;
}

.is-in .suggest {
  animation: ft-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.3) 0.6s both;
  opacity: 1;
}

.suggest li {
  margin: 0;
  padding: 6px 8px;
  border-radius: 6px;
  color: #b8bfcc;
}

.suggest li.on {
  background: #4338ca;
  color: #fff;
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pair div {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}

.pair strong { font-size: 36px; }

.pair span {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.noise {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 15px;
}

.noise div {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}

.noise s {
  color: var(--vp-c-text-3);
}

.soft-tile {
  background: var(--vp-c-brand-soft);
  border-color: transparent;
}

.soft-tile p {
  color: var(--vp-c-text-1);
}

.term {
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.8;
}

.muted { color: var(--ft-ink-muted); }
.ok { color: #a7f3d0; }
.indent { padding-left: 2ch; }
</style>
