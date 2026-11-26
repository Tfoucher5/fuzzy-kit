<template>
  <section class="ft-section problem">
    <div class="ft-container">
      <div v-reveal class="ft-head">
        <span class="ft-eyebrow">The problem</span>
        <h2 class="ft-h2"><code class="eq">===</code> says no. Your users meant <span class="ft-hl">yes</span>.</h2>
      </div>
      <div class="grid">
        <div v-reveal class="card strict">
          <span class="label">Strict equality</span>
          <pre class="snippet plain"><s>'Bohemian Rhapsody' === 'bohemian rapsody'</s></pre>
          <p class="outcome"><span class="badge no">false</span> A right answer, marked wrong.</p>
        </div>
        <div v-reveal class="card fuzzy">
          <span class="label brand">fuzzy-toolkit</span>
          <pre class="snippet ft-code"><span class="fn">check</span>(<span class="str">'bohemian rapsody'</span>, <span class="str">'Bohemian Rhapsody'</span>)</pre>
          <p class="outcome"><span class="badge yes">correct · 94.12</span> One letter off, still the right song.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.problem {
  padding-bottom: 24px;
}

.eq {
  font-size: 0.9em;
  background: none;
  padding: 0;
  color: inherit;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: 18px;
}

.card {
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.strict {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.fuzzy {
  border: 1px solid var(--vp-c-brand-soft);
  background: var(--vp-c-brand-soft);
  transition-delay: 0.1s;
}

.label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
}

.label.brand {
  color: var(--vp-c-brand-1);
}

.snippet {
  margin: 0;
  padding: 18px;
  border-radius: 14px;
  font-family: var(--vp-font-family-mono);
  font-size: 15px;
  line-height: 1.7;
  overflow-x: auto;
}

.plain {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
}

.fn { color: #c7d2fe; }
.str { color: #a7f3d0; }

.outcome {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  color: var(--vp-c-text-2);
}

.badge {
  padding: 5px 12px;
  border-radius: 999px;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  font-weight: 600;
}

.no {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
}

.yes {
  background: var(--gr-ok);
  color: #fff;
}

.dark .yes {
  color: var(--ft-marker-text);
}
</style>
