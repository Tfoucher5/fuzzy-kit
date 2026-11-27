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

/** A pack people asked for, from an open issue: someone can pick it up. */
export interface Wanted {
  kind: Kind
  id: string
  title: string
  url: string
  /** GitHub login of whoever is on it. */
  assignee?: string
}

export interface Data {
  extensions: Extension[]
  wanted: Wanted[]
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
  { package: 'fuzzy-toolkit/lang/nl', kind: 'language', id: 'nl', description: 'Dutch: eenentwintig, een en twintig, ordinals, articles, stop words, sounds-alike rules (ij/ei, v/f, z/s).', source: 'built-in' },
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

const ISSUES = 'https://api.github.com/repos/Tfoucher5/fuzzy-toolkit/issues?state=open&labels=help%20wanted&per_page=100'

/** "Language: Portuguese (pt)" or "Preset: company names", the titles of the request templates. */
export function wantedFrom(title: string): { kind: Kind; id: string } | null {
  const lang = /^Language: [^()]*\(([a-z]{2,3}(?:-[a-z0-9]+)*)\)\s*$/i.exec(title)
  if (lang) return { kind: 'language', id: lang[1].toLowerCase() }
  const preset = /^Preset: (.+)$/i.exec(title)
  if (preset) return { kind: 'preset', id: preset[1].trim().toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
  return null
}

interface ApiIssue { title: string; html_url: string; pull_request?: unknown; assignee?: { login: string } | null }

async function fromIssues(): Promise<Wanted[]> {
  const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': 'fuzzy-toolkit-docs' }
  // In CI the token only raises the rate limit; the data is public.
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  try {
    const response = await fetch(ISSUES, { headers, signal: AbortSignal.timeout(10_000) })
    if (!response.ok) return []
    const wanted: Wanted[] = []
    for (const issue of (await response.json()) as ApiIssue[]) {
      const pack = issue.pull_request ? null : wantedFrom(issue.title)
      if (pack) wanted.push({ ...pack, title: issue.title.replace(/^(Language|Preset): /i, ''), url: issue.html_url, assignee: issue.assignee?.login })
    }
    return wanted.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title))
  } catch {
    return []
  }
}

export default defineLoader({
  async load(): Promise<Data> {
    const registry = JSON.parse(readFileSync(new URL('../extensions.json', import.meta.url), 'utf8'))
    const reviewed: Extension[] = registry.extensions.map((e: Omit<Extension, 'source'>) => ({ ...e, source: 'reviewed' }))
    const [npm, wanted] = await Promise.all([fromNpm(), fromIssues()])
    const byPackage = new Map<string, Extension>()
    for (const e of npm ?? []) byPackage.set(e.package, e)
    // The registry is reviewed: its description wins, the npm version is kept.
    for (const e of reviewed) byPackage.set(e.package, { ...e, version: byPackage.get(e.package)?.version ?? e.version })
    const community = [...byPackage.values()].sort((a, b) => a.id.localeCompare(b.id))
    return { extensions: [...BUILT_IN, ...community], wanted, npmReachable: npm !== null, builtAt: new Date().toISOString().slice(0, 10) }
  },
})
