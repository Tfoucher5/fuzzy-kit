import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import Playground from './components/Playground.vue'
import Extensions from './components/Extensions.vue'
import HomePage from './components/home/HomePage.vue'
import Contributors from './components/Contributors.vue'
import { reveal } from './reveal'
import './custom.css'
import './components/home/home.css'
import './motion.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Playground', Playground)
    app.component('Extensions', Extensions)
    app.component('HomePage', HomePage)
    app.component('Contributors', Contributors)
    app.directive('reveal', reveal)
    // Hidden-until-visible styles only apply once JavaScript runs.
    if (typeof document !== 'undefined') document.documentElement.classList.add('ft-js')
  }
} satisfies Theme
