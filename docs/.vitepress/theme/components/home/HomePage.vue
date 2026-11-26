<script setup lang="ts">
import HomeHero from './HomeHero.vue'
import HomeMarquee from './HomeMarquee.vue'
import HomeProblem from './HomeProblem.vue'
import HomeFeatures from './HomeFeatures.vue'
import HomeStats from './HomeStats.vue'
import HomeBenchmarks from './HomeBenchmarks.vue'
import HomeCode from './HomeCode.vue'
import HomeCli from './HomeCli.vue'
import HomeTrust from './HomeTrust.vue'
import HomeCta from './HomeCta.vue'
</script>

<template>
  <div class="ft-home">
    <div class="progress" aria-hidden="true" />
    <HomeHero />
    <HomeMarquee />
    <HomeProblem />
    <HomeFeatures />
    <HomeStats />
    <HomeBenchmarks />
    <HomeCode />
    <HomeCli />
    <HomeTrust />
    <HomeCta />
  </div>
</template>

<style scoped>
/* Reading progress, where the browser can tie an animation to scrolling. */
.progress {
  display: none;
}

@supports (animation-timeline: scroll()) {
  .progress {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    height: 3px;
    background: var(--vp-c-brand-1);
    transform-origin: 0 50%;
    animation: progress linear both;
    animation-timeline: scroll(root);
  }
}

@keyframes progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
</style>
