import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitepress'

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
const repo = 'https://github.com/Tfoucher5/fuzzy-toolkit'
const site = 'https://tfoucher5.github.io/fuzzy-toolkit/'

// What search engines read about the package (schema.org).
const structured = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  name: 'fuzzy-toolkit',
  description: 'Fuzzy string matching and fuzzy search for JavaScript and TypeScript, with zero dependencies.',
  url: site,
  codeRepository: repo,
  programmingLanguage: ['TypeScript', 'JavaScript'],
  runtimePlatform: ['Node.js', 'Bun', 'Deno', 'Browser'],
  license: 'https://opensource.org/licenses/MIT',
  version,
  author: { '@type': 'Person', name: 'Théo Foucher', url: 'https://github.com/Tfoucher5' },
}

export default defineConfig({
  title: 'fuzzy-toolkit',
  description: 'Fuzzy string matching for JavaScript and TypeScript: typos, accents, word order and numbers in words, in about 10 kB with zero dependencies.',

  base: '/fuzzy-toolkit/',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: site },

  head: [
    ['meta', { name: 'theme-color', content: '#4338ca' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'fuzzy-toolkit' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['script', { type: 'application/ld+json' }, JSON.stringify(structured)],
  ],

  // Each page gets its own canonical address and share card.
  transformHead({ pageData, title, description }) {
    const path = pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    const url = site + path
    return [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
    ]
  },

  markdown: {
    // Code blocks stay dark in both themes (see custom.css).
    theme: { light: 'github-dark', dark: 'github-dark' },
  },

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'Recipes', link: '/recipes/quiz', activeMatch: '/recipes/' },
      { text: 'Extensions', link: '/extensions' },
      { text: 'API', link: '/api/' },
      { text: 'Playground', link: '/playground' },
      {
        text: 'Community',
        activeMatch: '/contributors',
        items: [
          {
            text: 'Community',
            items: [
              { text: 'Contributors', link: '/contributors' },
              { text: 'Contributing guide', link: `${repo}/blob/master/CONTRIBUTING.md` },
              { text: 'Discussions', link: `${repo}/discussions` },
              { text: 'Support on Ko-fi', link: 'https://ko-fi.com/theofoucher' }
            ]
          },
          {
            text: 'Project',
            items: [
              { text: 'Changelog', link: '/guide/changelog' },
              { text: 'Releases', link: `${repo}/releases` },
              { text: 'npm package', link: 'https://www.npmjs.com/package/fuzzy-toolkit' },
              { text: 'License (MIT)', link: `${repo}/blob/master/LICENSE` },
              { text: 'Security policy', link: `${repo}/blob/master/SECURITY.md` }
            ]
          }
        ]
      },
      // The current version, linking to what changed in it.
      { text: `v${version}`, link: '/guide/changelog' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Options', link: '/guide/options' },
          { text: 'Languages and presets', link: '/guide/extensions' },
          { text: 'Extensions directory', link: '/extensions' },
          { text: 'How it works', link: '/guide/how-it-works' },
          { text: 'Compared with other libraries', link: '/guide/benchmarks' },
          { text: 'Coming from another library', link: '/guide/coming-from' },
          { text: 'Upgrading from v1', link: '/guide/migration' },
          { text: 'Changelog', link: '/guide/changelog' }
        ]
      },
      {
        text: 'Recipes',
        items: [
          { text: 'Quizzes and blind tests', link: '/recipes/quiz' },
          { text: 'Search as you type', link: '/recipes/search' },
          { text: '"Did you mean…?"', link: '/recipes/did-you-mean' },
          { text: 'Spot names in a text', link: '/recipes/find-in-text' },
          { text: 'Cleaning data', link: '/recipes/data-cleaning' },
          { text: 'Command line', link: '/recipes/cli' },
          { text: 'AI agents and assistants', link: '/recipes/ai-agents' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'API', link: '/api/' },
          { text: 'Playground', link: '/playground' }
        ]
      },
      {
        text: 'Community',
        items: [
          { text: 'Contributors', link: '/contributors' },
          { text: 'Contributing guide', link: `${repo}/blob/master/CONTRIBUTING.md` },
          { text: 'Discussions', link: `${repo}/discussions` }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: repo, ariaLabel: 'GitHub repository' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/fuzzy-toolkit', ariaLabel: 'npm package' }
    ],

    editLink: {
      pattern: `${repo}/edit/master/docs/:path`,
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: `Released under the <a href="${repo}/blob/master/LICENSE">MIT License</a> · <a href="${repo}">GitHub</a> · <a href="https://www.npmjs.com/package/fuzzy-toolkit">npm</a> · <a href="${repo}/releases">Releases</a> · <a href="${repo}/blob/master/SECURITY.md">Security</a> · <a href="https://ko-fi.com/theofoucher">Ko-fi</a>`,
      copyright: 'Made by Théo Foucher'
    },

    search: {
      provider: 'local'
    }
  }
})
