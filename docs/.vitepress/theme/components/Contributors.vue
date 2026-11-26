<script setup lang="ts">
import { computed, ref } from 'vue'
import { data } from '../../contributors.data'

const { maintainer, contributors, goodFirstIssues, githubReachable } = data
const pullCount = contributors.reduce((n, p) => n + p.pulls.length, 0)
const peopleCount = contributors.length + 1

// A soft light follows the pointer over the cards, like on the home page.
const grid = ref<HTMLElement>()
function move(event: PointerEvent) {
  const el = grid.value
  if (!el) return
  const box = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${event.clientX - box.left}px`)
  el.style.setProperty('--my', `${event.clientY - box.top}px`)
}

const summary = computed(() =>
  pullCount
    ? `${peopleCount} people, ${pullCount} merged pull request${pullCount > 1 ? 's' : ''} from the community.`
    : `${peopleCount} ${peopleCount > 1 ? 'people' : 'person'} so far. Yours could be next.`,
)
</script>

<template>
  <div class="ft-home contributors">
    <section class="hero">
      <div class="ft-dots dots" aria-hidden="true" />
      <div class="ft-container hero-inner">
        <span class="ft-eyebrow ft-fade-up">Contributors</span>
        <h1 class="title ft-fade-up" style="animation-delay: 0.1s">
          The people behind <span class="ft-hl" style="animation-delay: 0.8s">every match</span>.
        </h1>
        <p class="ft-lead ft-fade-up" style="animation-delay: 0.2s">{{ summary }}</p>
      </div>
    </section>

    <section class="ft-container">
      <a v-reveal :href="maintainer.url" class="maintainer">
        <span class="ring" aria-hidden="true"><img :src="maintainer.avatar" alt="" width="112" height="112" loading="lazy" /></span>
        <span class="who">
          <span class="role">Creator and maintainer</span>
          <strong class="name">{{ maintainer.name }}</strong>
          <span class="login">@{{ maintainer.login }}</span>
        </span>
        <span v-if="maintainer.commits" class="stat"><strong>{{ maintainer.commits }}</strong> commits</span>
      </a>
    </section>

    <section class="ft-container block">
      <h2 v-reveal class="ft-h2 small">Community</h2>
      <div ref="grid" class="grid" @pointermove="move">
        <div class="spot" aria-hidden="true" />

        <article v-for="(p, i) in contributors" :key="p.login" v-reveal class="card" :style="{ transitionDelay: `${i * 0.06}s` }">
          <a :href="p.url" class="person">
            <img :src="p.avatar" alt="" width="64" height="64" loading="lazy" class="avatar" />
            <span>
              <strong class="name">{{ p.name }}</strong>
              <span class="login">@{{ p.login }}</span>
            </span>
          </a>
          <ul v-if="p.pulls.length" class="pulls">
            <li v-for="pr in p.pulls" :key="pr.number">
              <a :href="pr.url"><span class="num">#{{ pr.number }}</span> {{ pr.title }}</a>
            </li>
          </ul>
        </article>

        <a v-reveal href="#help-wanted" class="card you">
          <span class="you-avatar" aria-hidden="true">?</span>
          <strong class="name">Your name here</strong>
          <span class="you-text">Fix a wrong score, add a language, write a recipe. Every merged pull request lands on this page.</span>
          <span class="you-cta">Find something to work on →</span>
        </a>
      </div>
      <p v-if="!githubReachable" class="offline">GitHub could not be reached when this page was built. See the <a href="https://github.com/Tfoucher5/fuzzy-toolkit/graphs/contributors">contributors on GitHub</a>.</p>
    </section>

    <section id="help-wanted" class="ft-container block">
      <div v-reveal class="ft-head">
        <span class="ft-eyebrow">Good first issues</span>
        <h2 class="ft-h2 small">Start here</h2>
        <p class="ft-lead">Each one says where to start and how to test it. Comment on it to take it, and ask anything.</p>
      </div>
      <ul v-if="goodFirstIssues.length" class="issues">
        <li v-for="(issue, i) in goodFirstIssues" :key="issue.number" v-reveal :style="{ transitionDelay: `${i * 0.05}s` }">
          <a :href="issue.url" class="issue">
            <span class="num">#{{ issue.number }}</span>
            <span class="issue-title">{{ issue.title }}</span>
            <span class="arrow" aria-hidden="true">→</span>
          </a>
        </li>
      </ul>
      <p v-else class="ft-lead">No open one right now: see <a href="https://github.com/Tfoucher5/fuzzy-toolkit/issues">all issues</a> or <a href="https://github.com/Tfoucher5/fuzzy-toolkit/discussions">propose an idea</a>.</p>
      <div v-reveal class="links">
        <a href="https://github.com/Tfoucher5/fuzzy-toolkit/blob/master/CONTRIBUTING.md" class="ft-btn ft-btn-primary">Read the contributing guide</a>
        <a href="https://github.com/Tfoucher5/fuzzy-toolkit/discussions" class="ft-btn ft-btn-ghost">Propose an idea</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
}

.dots {
  -webkit-mask-image: radial-gradient(ellipse 70% 80% at 50% 0%, #000 30%, transparent 100%);
  mask-image: radial-gradient(ellipse 70% 80% at 50% 0%, #000 30%, transparent 100%);
}

.hero-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding-top: 88px;
  padding-bottom: 56px;
  text-align: center;
}

.title {
  font-family: var(--ft-font-display);
  font-size: clamp(40px, 6vw, 72px);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.04em;
  max-width: 13em;
}

.title .ft-hl {
  padding: 0 8px;
}

.block {
  padding-top: 72px;
}

.block:last-child {
  padding-bottom: 104px;
}

.ft-h2.small {
  font-size: clamp(28px, 3.4vw, 40px);
  margin-bottom: 24px;
}

/* Maintainer */
.maintainer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  padding: 28px;
  border-radius: 24px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 0.25s ease, transform 0.25s ease;
}

.maintainer.is-in:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-3px);
}

.ring {
  position: relative;
  display: grid;
  place-items: center;
  width: 124px;
  height: 124px;
  border-radius: 50%;
}

.ring::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(var(--vp-c-brand-1), var(--ft-marker), var(--vp-c-brand-1));
  animation: spin 6s linear infinite;
}

.ring img {
  position: relative;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  border: 4px solid var(--vp-c-bg-soft);
}

@keyframes spin {
  to { transform: rotate(1turn); }
}

.who {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 220px;
}

.role {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-brand-1);
}

.maintainer .name {
  font-family: var(--ft-font-display);
  font-size: 32px;
  letter-spacing: -0.02em;
}

.login {
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.stat {
  font-size: 15px;
  color: var(--vp-c-text-2);
}

.stat strong {
  font-family: var(--ft-font-display);
  font-size: 32px;
  color: var(--vp-c-text-1);
}

/* Community grid */
.grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 18px;
}

.spot {
  position: absolute;
  inset: -40px;
  z-index: 2;
  pointer-events: none;
  border-radius: 40px;
  background: radial-gradient(420px circle at calc(var(--mx, -999px) + 40px) calc(var(--my, -999px) + 40px), var(--vp-c-brand-soft), transparent 65%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.grid:hover .spot {
  opacity: 1;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  border-radius: 20px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: opacity 0.7s cubic-bezier(0.2, 0.7, 0.2, 1), transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.card.is-in:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 18px 40px -20px rgba(14, 17, 22, 0.25);
}

.person {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  box-shadow: 0 0 0 3px var(--vp-c-bg), 0 0 0 5px var(--vp-c-divider);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

.card:hover .avatar {
  box-shadow: 0 0 0 3px var(--vp-c-bg), 0 0 0 5px var(--ft-marker);
  transform: rotate(-4deg) scale(1.05);
}

.person .name {
  display: block;
  font-size: 18px;
}

.pulls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pulls li {
  margin: 0;
}

.pulls a {
  display: block;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 14px;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.pulls a:hover {
  background: var(--vp-c-brand-soft);
}

.num {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-brand-1);
}

.you {
  align-items: flex-start;
  border-style: dashed;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.you-avatar {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px dashed var(--vp-c-divider);
  font-family: var(--ft-font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-2);
  animation: pulse 2.4s ease-in-out infinite;
}

@keyframes pulse {
  50% { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); transform: scale(1.06); }
}

.you .name {
  font-size: 18px;
}

.you-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.you-cta {
  margin-top: auto;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.offline {
  margin-top: 16px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

/* Good first issues */
.issues {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 10px;
  margin: 0 0 32px;
  padding: 0;
  list-style: none;
}

.issues li {
  margin: 0;
}

.issue {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 0.2s ease;
}

.issue:hover {
  border-color: var(--vp-c-brand-1);
}

.issue-title {
  flex: 1;
  background-image: linear-gradient(var(--ft-marker), var(--ft-marker));
  background-repeat: no-repeat;
  background-size: 0% 100%;
  transition: background-size 0.4s cubic-bezier(0.2, 0.7, 0.2, 1), color 0.2s ease;
}

.issue:hover .issue-title {
  background-size: 100% 100%;
  color: var(--ft-marker-text);
}

.arrow {
  color: var(--vp-c-text-3);
  transition: transform 0.2s ease;
}

.issue:hover .arrow {
  transform: translateX(4px);
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
