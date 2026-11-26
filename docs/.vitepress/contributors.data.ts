// Data for the Contributors page, fetched from GitHub when the docs are built
// (the site rebuilds weekly). If GitHub can't be reached, the page is built
// with the maintainer only instead of failing.
import { defineLoader } from 'vitepress'

const REPO = 'Tfoucher5/fuzzy-toolkit'
const MAINTAINER = 'Tfoucher5'
/** Tools, not people: bots and the account AI coding sessions commit with. */
const NOT_PEOPLE = new Set(['claude', 'dependabot[bot]', 'github-actions[bot]'])

export interface PullRequest {
  number: number
  title: string
  url: string
}

export interface Person {
  login: string
  name: string
  avatar: string
  url: string
  commits: number
  pulls: PullRequest[]
}

export interface Issue {
  number: number
  title: string
  url: string
}

export interface Data {
  maintainer: Person
  contributors: Person[]
  goodFirstIssues: Issue[]
  githubReachable: boolean
}

declare const data: Data
export { data }

async function github<T>(path: string): Promise<T | null> {
  const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': 'fuzzy-toolkit-docs' }
  // In CI the token only raises the rate limit; the data is public.
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  try {
    const response = await fetch(`https://api.github.com/${path}`, { headers, signal: AbortSignal.timeout(10_000) })
    return response.ok ? ((await response.json()) as T) : null
  } catch {
    return null
  }
}

interface ApiContributor { login: string; type: string; avatar_url: string; html_url: string; contributions: number }
interface ApiUser { name: string | null }
interface ApiIssue { number: number; title: string; html_url: string; pull_request?: unknown }

async function person(c: ApiContributor): Promise<Person> {
  const [user, search] = await Promise.all([
    github<ApiUser>(`users/${c.login}`),
    github<{ items: ApiIssue[] }>(`search/issues?q=${encodeURIComponent(`repo:${REPO} is:pr is:merged author:${c.login}`)}&per_page=20`),
  ])
  return {
    login: c.login,
    name: user?.name || c.login,
    avatar: `${c.avatar_url}${c.avatar_url.includes('?') ? '&' : '?'}s=160`,
    url: c.html_url,
    commits: c.contributions,
    pulls: c.login === MAINTAINER ? [] : (search?.items ?? []).map((i) => ({ number: i.number, title: i.title, url: i.html_url })),
  }
}

const FALLBACK: Person = {
  login: MAINTAINER,
  name: 'Théo Foucher',
  avatar: `https://github.com/${MAINTAINER}.png?size=160`,
  url: `https://github.com/${MAINTAINER}`,
  commits: 0,
  pulls: [],
}

export default defineLoader({
  async load(): Promise<Data> {
    const [list, issues] = await Promise.all([
      github<ApiContributor[]>(`repos/${REPO}/contributors?per_page=100`),
      github<ApiIssue[]>(`repos/${REPO}/issues?state=open&labels=${encodeURIComponent('good first issue')}&per_page=12`),
    ])
    const people = await Promise.all((list ?? []).filter((c) => c.type === 'User' && !NOT_PEOPLE.has(c.login)).map(person))
    return {
      maintainer: people.find((p) => p.login === MAINTAINER) ?? FALLBACK,
      contributors: people.filter((p) => p.login !== MAINTAINER),
      goodFirstIssues: (issues ?? []).filter((i) => !i.pull_request).map((i) => ({ number: i.number, title: i.title, url: i.html_url })),
      githubReachable: list !== null,
    }
  },
})
