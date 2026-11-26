<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { check, diff, highlight } from '../../../../../src/index'
import { announcement, examples, works } from './data.js'

// Title: shown right in the static HTML, then typed with a typo that fixes itself.
const title = ref<'ssr' | 'typo' | 'fixed'>('ssr')

// Live demo: the real library scores what is typed.
const current = ref(0)
const answer = ref('')
const expected = ref<string>(examples[0].expected)
const typing = ref(true)
const auto = ref(true)
const copied = ref(false)

const options = computed(() => {
  const preset = (examples[current.value] as { preset?: string }).preset
  return auto.value && preset ? { preset: preset as 'music' } : {}
})
const result = computed(() => check(answer.value, expected.value, options.value))
const why = computed(() => (auto.value ? examples[current.value].why : ''))
const call = computed(() => (options.value.preset ? `check(answer, expected, { preset: '${options.value.preset}' })` : 'check(answer, expected)'))

/** Letters of the expected text: matched (marker) or missing from the answer (underlined). */
const segments = computed(() => {
  const changes = diff(answer.value, expected.value)
  if (result.value.verdict !== 'wrong' && changes.every((c) => c.type !== 'removed')) {
    return changes.map((c) => ({ text: c.text, kind: c.type === 'same' ? 'hit' : 'miss' }))
  }
  return highlight(expected.value, answer.value, options.value).map((s) => ({ text: s.text, kind: s.match ? 'hit' : 'plain' }))
})

const ring = computed(() => 2 * Math.PI * 70 * (1 - result.value.score / 100))

let timer: ReturnType<typeof setTimeout> | undefined
let reduced = false

function play(i: number) {
  clearTimeout(timer)
  auto.value = true
  current.value = i
  const e = examples[i]
  expected.value = e.expected
  if (reduced) {
    answer.value = e.answer
    typing.value = false
    return
  }
  answer.value = ''
  typing.value = true
  const step = () => {
    if (answer.value.length < e.answer.length) {
      answer.value = e.answer.slice(0, answer.value.length + 1)
      timer = setTimeout(step, 55 + Math.random() * 45)
    } else {
      typing.value = false
      timer = setTimeout(() => play((i + 1) % examples.length), 3200)
    }
  }
  timer = setTimeout(step, 400)
}

/** The visitor takes over: stop the autoplay, keep scoring live. */
function takeOver() {
  if (!auto.value) return
  clearTimeout(timer)
  auto.value = false
  typing.value = false
}

async function copy() {
  try {
    await navigator.clipboard.writeText('npm i fuzzy-toolkit')
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    // Clipboard refused (permissions): nothing to show.
  }
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduced) {
    title.value = 'typo'
    setTimeout(() => (title.value = 'fixed'), 1300)
  }
  play(0)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <section class="hero">
    <div class="ft-dots hero-dots" aria-hidden="true" />
    <div class="glow glow-a" aria-hidden="true" />
    <div class="glow glow-b" aria-hidden="true" />

    <div class="ft-container hero-inner">
      <a :href="withBase(announcement.link)" class="pill-news ft-fade-up">
        <span class="pill-news-label">{{ announcement.label }}</span>
        {{ announcement.text }}
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
      </a>

      <h1 class="title ft-fade-up" style="animation-delay: 0.1s" aria-label="Close enough is a match.">
        <span aria-hidden="true">Close en<span v-if="title === 'typo'" class="typo">uo</span><span v-else :class="{ fixed: title === 'fixed' }">ou</span>gh</span>
        {{ ' ' }}<span class="ft-hl title-hl" aria-hidden="true">is a match.</span>
      </h1>

      <p class="sub ft-fade-up" style="animation-delay: 0.2s">
        Fuzzy string matching for JavaScript and TypeScript. Typos, accents, word order, numbers in words and noise like
        "(feat. X)" are handled for you, in about 10 kB with zero dependencies.
      </p>

      <div class="actions ft-fade-up" style="animation-delay: 0.3s">
        <a :href="withBase('/guide/getting-started')" class="ft-btn ft-btn-primary">
          Get started
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
        </a>
        <div class="install">
          <code><span class="prompt">$</span> npm i fuzzy-toolkit</code>
          <button type="button" class="copy" :aria-label="copied ? 'Copied' : 'Copy install command'" @click="copy">
            <span v-if="copied" class="ft-pop copied">Copied</span>
            <svg v-else aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
          </button>
        </div>
      </div>

      <ul class="works ft-fade-up" style="animation-delay: 0.45s" aria-label="Works with">
        <li v-for="w in works" :key="w"><span class="dot" aria-hidden="true" />{{ w }}</li>
      </ul>
    </div>

    <div class="ft-container demo-wrap ft-fade-up" style="animation-delay: 0.6s">
      <div class="demo">
        <div class="demo-bar">
          <span class="lights" aria-hidden="true"><span /><span /><span /></span>
          <code>{{ call }}</code>
          <span class="live"><span class="live-dot" aria-hidden="true" />live</span>
        </div>
        <div class="demo-body">
          <div class="demo-inputs">
            <label class="field">
              <span>What they typed</span>
              <input v-model="answer" spellcheck="false" autocomplete="off" @focus="takeOver" @input="takeOver" />
            </label>
            <label class="field">
              <span>What you expected</span>
              <input v-model="expected" spellcheck="false" autocomplete="off" @focus="takeOver" @input="takeOver" />
            </label>
            <p class="matched" aria-live="polite">
              <template v-if="!typing && answer">
                <template v-for="(s, i) in segments" :key="`${current}-${answer}-${i}`">
                  <span v-if="s.kind === 'hit'" class="ft-hl">{{ s.text }}</span>
                  <span v-else-if="s.kind === 'miss'" class="miss ft-pop">{{ s.text }}</span>
                  <span v-else>{{ s.text }}</span>
                </template>
              </template>
              <span v-else class="matched-wait">Matching letters show here.</span>
            </p>
            <div class="chips" role="group" aria-label="Examples">
              <button v-for="(e, i) in examples" :key="e.label" type="button" class="chip" :aria-pressed="auto && current === i" @click="play(i)">{{ e.label }}</button>
            </div>
          </div>
          <div class="demo-score">
            <div class="ring">
              <svg viewBox="0 0 160 160" aria-hidden="true">
                <circle cx="80" cy="80" r="70" class="ring-track" />
                <circle cx="80" cy="80" r="70" class="ring-fill" :class="result.verdict" :style="{ strokeDashoffset: ring }" />
              </svg>
              <div class="ring-label">
                <strong>{{ Math.round(result.score) }}</strong>
                <span>score / 100</span>
              </div>
            </div>
            <div class="verdict-wrap" aria-live="polite">
              <span v-if="typing" class="dots" role="status" aria-label="Typing"><span /><span /><span /></span>
              <span v-if="!typing && answer" :key="result.verdict + current" class="verdict ft-pop" :class="result.verdict">{{ result.verdict }}</span>
              <span v-if="!typing && why" class="why">{{ why }}</span>
              <span v-if="!auto" class="why">Your own text, scored by the real library.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding-bottom: 72px;
}

.hero-dots {
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%);
  mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%);
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  animation: float 9s ease-in-out infinite alternate;
}

.glow-a {
  top: -140px;
  left: calc(50% - 420px);
  width: 520px;
  height: 360px;
  background: var(--vp-c-brand-soft);
}

.glow-b {
  top: -60px;
  left: calc(50% + 120px);
  width: 380px;
  height: 280px;
  background: rgba(253, 230, 138, 0.45);
  animation-delay: -4s;
}

.dark .glow-b {
  background: rgba(253, 230, 138, 0.08);
}

@keyframes float {
  to { transform: translate(40px, 30px) scale(1.08); }
}

.hero-inner {
  position: relative;
  padding-top: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 24px;
}

.pill-news {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px 6px 6px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  text-decoration: none;
  transition: border-color 0.2s ease;
}

.pill-news:hover {
  border-color: var(--vp-c-brand-1);
}

.pill-news-label {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
  font-weight: 600;
  font-size: 12px;
}

.title {
  font-family: var(--ft-font-display);
  font-weight: 700;
  font-size: clamp(46px, 7.2vw, 92px);
  line-height: 1.02;
  letter-spacing: -0.04em;
  max-width: 12em;
}

.title-hl {
  padding: 0 10px;
  animation-delay: 1.5s;
  animation-duration: 0.9s;
}

.typo {
  display: inline-block;
  color: #c2410c;
  text-decoration: underline wavy #f97316 3px;
  text-underline-offset: 10px;
  animation: shake 0.5s ease 0.3s 2;
}

.dark .typo {
  color: #fb923c;
}

.fixed {
  display: inline-block;
  animation: flip 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) both;
}

@keyframes shake {
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

@keyframes flip {
  from { opacity: 0; transform: translateY(-0.4em) rotateX(70deg); }
}

.sub {
  font-size: clamp(17px, 1.6vw, 21px);
  line-height: 1.6;
  color: var(--vp-c-text-2);
  max-width: 40em;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.install {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding: 0 7px 0 18px;
  border-radius: 14px;
  background: var(--ft-ink);
  color: var(--ft-ink-text);
}

.install code {
  font-family: var(--vp-font-family-mono);
  font-size: 15px;
  background: none;
  color: inherit;
  padding: 0;
}

.prompt {
  color: var(--ft-ink-muted);
}

.copy {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border-radius: 9px;
  background: var(--ft-ink-3);
  color: var(--ft-ink-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.copied {
  color: #a7f3d0;
}

.works {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 10px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.works li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin: 0;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-weight: 500;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.works li:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
}

/* Demo window */
.demo-wrap {
  position: relative;
  max-width: 980px;
  margin-top: 48px;
}

.demo {
  border-radius: 22px;
  padding: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 40px 80px -40px rgba(14, 17, 22, 0.35), 0 0 0 6px var(--vp-c-brand-soft);
}

.demo-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 16px 16px 0 0;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.demo-bar code {
  font-size: 13px;
  color: var(--vp-c-text-2);
  background: none;
}

.lights {
  display: flex;
  gap: 6px;
}

.lights span {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--vp-c-divider);
}

.live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--gr-ok);
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  animation: ft-blink 2s steps(1) infinite;
}

.demo-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  border-radius: 0 0 16px 16px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.demo-inputs {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
  border-right: 1px solid var(--vp-c-divider);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field > span:first-child {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
}

.field input {
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 19px;
  font-weight: 500;
}

.field input:focus {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -1px;
}

.dots span {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin: 0 3px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  animation: dot 1.2s infinite;
}

.dots span:nth-child(2) { animation-delay: 0.15s; }
.dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes dot {
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
}

.matched {
  min-height: 34px;
  font-size: 19px;
  font-weight: 500;
}

.matched-wait {
  font-size: 14px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.miss {
  display: inline-block;
  color: var(--vp-c-brand-1);
  font-weight: 700;
  text-decoration: underline 3px;
  text-underline-offset: 5px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 600;
  transition: border-color 0.2s ease;
}

.chip:hover {
  border-color: var(--vp-c-brand-1);
}

.chip[aria-pressed='true'] {
  background: var(--vp-c-text-1);
  border-color: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}

.demo-score {
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: var(--vp-c-bg);
}

.ring {
  position: relative;
  width: 168px;
  height: 168px;
}

.ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring circle {
  fill: none;
  stroke-width: 14;
}

.ring-track {
  stroke: var(--vp-c-divider);
}

.ring-fill {
  stroke: var(--vp-c-brand-1);
  stroke-linecap: round;
  stroke-dasharray: 439.82;
  transition: stroke-dashoffset 0.5s cubic-bezier(0.2, 0.7, 0.2, 1), stroke 0.3s ease;
}

.ring-fill.close {
  stroke: var(--gr-close);
}

.ring-fill.wrong {
  stroke: var(--gr-wrong);
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-label strong {
  font-family: var(--ft-font-display);
  font-size: 52px;
  line-height: 1;
  letter-spacing: -0.03em;
}

.ring-label span {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.verdict-wrap {
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.verdict {
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.verdict.correct { background: var(--gr-ok); }
.verdict.close { background: var(--gr-close); }
.verdict.wrong { background: var(--gr-wrong); }

.dark .verdict {
  color: var(--ft-marker-text);
}

.why {
  font-size: 15px;
  color: var(--vp-c-text-2);
}
</style>
