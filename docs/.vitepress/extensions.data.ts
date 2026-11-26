// Data for the Extensions page, built with the docs: the packs shipped with
// fuzzy-toolkit, the community ones reviewed in docs/extensions.json,
// and every npm package with the keyword `fuzzy-toolkit-plugin`. If npm can't
// be reached, the page is built without the npm list instead of failing.
import { readFileSync } from 'node:fs'
import { defineLoader } from 'vitepress'

export type Kind = 'language' | 'preset'

export interface Extension {
  /** npm package, or the import path for a built-in pack. */
  package: string
  kind: Kind
  /** Language code or preset name. */
  id: string
  description: string
  version?: string
  repository?: string
  /** built-in: ships with fuzzy-toolkit. reviewed: in the registry. npm: found by keyword. */
  source: 'built-in' | 'reviewed' | 'npm'
}

export interface Data {
  extensions: Extension[]
  npmReachable: boolean
  builtAt: string
}

declare const data: Data
export { data }

const BUILT_IN: Extension[] = [
  { package: 'fuzzy-toolkit', kind: 'language', id: 'en', description: 'English: numbers in words, ordinals, articles, stop words, sounds-alike rules. On by default.', source: 'built-in' },
  { package: 'fuzzy-toolkit', kind: 'language', id: 'fr', description: 'French: quatre-vingt-dix, ordinals, articles and elisions (l\'), stop words, sounds-alike rules. On by default.', source: 'built-in' },
  { package: 'fuzzy-toolkit/lang/es', kind: 'language', id: 'es', description: 'Spanish: treinta y dos, veintiuno, ordinals, articles, stop words, sounds-alike rules (b/v, ll/y, silent h).', source: 'built-in' },
  { package: 'fuzzy-toolkit/lang/de', kind: 'language', id: 'de', description: 'German: einundzwanzig, ordinals, articles, stop words, sounds-alike rules (Müller = Mueller, Meier = Mayer).', source: 'built-in' },
  { package: 'fuzzy-toolkit/lang/it', kind: 'language', id: 'it', description: 'Italian: ventitré, ventuno, ordinals, articles and elisions, stop words, sounds-alike rules.', source: 'built-in' },
  { package: 'fuzzy-toolkit', kind: 'preset', id: 'music', description: 'Song titles and artists: drops featurings, "Remastered", brackets and leading articles; & = and.', source: 'built-in' },
  { package: 'fuzzy-toolkit', kind: 'preset', id: 'search', description: 'Search as you type: prefixes, acronyms, lower threshold.', source: 'built-in' },
  { package: 'fuzzy-toolkit', kind: 'preset', id: 'strict', description: 'Word order and spaces matter, threshold 90.', source: 'built-in' },
]

const NPM_SEARCH = 'https://registry.npmjs.org/-/v1/search?text=keywords:fuzzy-toolkit-plugin&size=250'

/** Kind and id from the naming convention, or from the keywords. */
export function classify(name: string, keywords: readonly string[] = []): { kind: Kind; id: string } | null {
  const bare = name.replace(/^@[^/]+\//, '')
  const lang = /^fuzzy-toolkit-lang-(.+)$/.exec(bare)
  if (lang) return { kind: 'language', id: lang[1] }
  const preset = /^fuzzy-toolkit-preset-(.+)$/.exec(bare)
  if (preset) return { kind: 'preset', id: preset[1] }
  if (keywords.includes('fuzzy-toolkit-language')) return { kind: 'language', id: bare }
  if (keywords.includes('fuzzy-toolkit-preset')) return { kind: 'preset', id: bare }
  return null
}

interface NpmObject {
  package: { name: string; version: string; description?: string; keywords?: string[]; links?: { repository?: string } }
}

async function fromNpm(): Promise<Extension[] | null> {
  try {
    const response = await fetch(NPM_SEARCH, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) return null
    const { objects } = (await response.json()) as { objects: NpmObject[] }
    const found: Extension[] = []
    for (const { package: pkg } of objects) {
      if (pkg.name === 'fuzzy-toolkit') continue
      const kind = classify(pkg.name, pkg.keywords)
      if (!kind) continue
      found.push({
        package: pkg.name,
        ...kind,
        description: pkg.description ?? '',
        version: pkg.version,
        repository: pkg.links?.repository,
        source: 'npm',
      })
    }
    return found
  } catch {
    return null
  }
}

export default defineLoader({
  async load(): Promise<Data> {
    const registry = JSON.parse(readFileSync(new URL('../extensions.json', import.meta.url), 'utf8'))
    const reviewed: Extension[] = registry.extensions.map((e: Omit<Extension, 'source'>) => ({ ...e, source: 'reviewed' }))
    const npm = await fromNpm()
    const byPackage = new Map<string, Extension>()
    for (const e of npm ?? []) byPackage.set(e.package, e)
    // The registry is reviewed: its description wins, the npm version is kept.
    for (const e of reviewed) byPackage.set(e.package, { ...e, version: byPackage.get(e.package)?.version ?? e.version })
    const community = [...byPackage.values()].sort((a, b) => a.id.localeCompare(b.id))
    return { extensions: [...BUILT_IN, ...community], npmReachable: npm !== null, builtAt: new Date().toISOString().slice(0, 10) }
  },
})
