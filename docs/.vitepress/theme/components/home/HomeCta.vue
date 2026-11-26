<script setup lang="ts">
import { withBase } from 'vitepress'
</script>

<template>
  <section class="cta">
    <div class="ft-dots dots" aria-hidden="true" />
    <div v-reveal class="ft-container inner">
      <h2 class="ft-h2 title">Your first match, <span class="ft-hl">one line</span> away.</h2>
      <p class="ft-lead">Install it, import one function, done. The guide takes five minutes.</p>
      <div class="actions">
        <a :href="withBase('/guide/getting-started')" class="ft-btn ft-btn-primary">Read the guide</a>
        <a href="https://github.com/Tfoucher5/fuzzy-toolkit" class="ft-btn ft-btn-ghost">Star on GitHub</a>
      </div>
      <p class="support">
        Built and maintained in the open.
        <a href="https://ko-fi.com/theofoucher">Support the project on Ko-fi</a>
      </p>
    </div>
  </section>
</template>

<style scoped>
.cta {
  position: relative;
  overflow: hidden;
  text-align: center;
}

.dots {
  -webkit-mask-image: radial-gradient(ellipse 60% 70% at 50% 100%, #000 30%, transparent 100%);
  mask-image: radial-gradient(ellipse 60% 70% at 50% 100%, #000 30%, transparent 100%);
}

.inner {
  position: relative;
  max-width: 760px;
  padding-top: 112px;
  padding-bottom: 112px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.title {
  font-size: clamp(36px, 5vw, 60px);
  letter-spacing: -0.04em;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.support {
  font-size: 14px;
  color: var(--vp-c-text-2);
}
</style>
