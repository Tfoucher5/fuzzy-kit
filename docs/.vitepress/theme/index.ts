import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Playground from './components/Playground.vue'
import Extensions from './components/Extensions.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Playground', Playground)
    app.component('Extensions', Extensions)
  }
} satisfies Theme
