// The public roadmap, read from GitHub issues labeled `roadmap` (#117).
// An issue shows only if its body has a `## Public` section: first line is the
// public title, second the blurb. Issue titles are written for agents, so they
// never show. Only issues opened by a maintainer show: an issue's author can
// edit its body after it is labeled, so an outsider's issue could otherwise
// put their text on the site.

const ISSUES_URL = 'https://api.github.com/repos/TheLinc/cover-me/issues?labels=roadmap&state=all&per_page=100'
const RELEASE_LABEL = 'needs-extension-release'
const NEW_LIMIT = 6
const MAINTAINERS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR'])

export interface RoadmapItem {
  number: number
  title: string
  blurb: string
  /** Closing month for shipped items, like "October 2026". */
  shipped?: string
}

export interface Roadmap {
  rollingOut: RoadmapItem[]
  upcoming: RoadmapItem[]
  shipped: RoadmapItem[]
}

// The fields of GitHub's issue JSON this reads.
export interface GithubIssue {
  number: number
  state: string
  state_reason?: string | null
  created_at: string
  closed_at?: string | null
  body?: string | null
  author_association?: string
  labels: ({ name?: string } | string)[]
  pull_request?: unknown
}

const plain = (s: string) =>
  s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`>#]/g, '').trim()

export function publicBlock(body: string | null | undefined): { title: string; blurb: string } | null {
  const lines = (body ?? '').split(/\r?\n/)
  const start = lines.findIndex((l) => /^##\s+public\s*$/i.test(l.trim()))
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => /^##\s/.test(l))
  const [title, blurb = ''] = (end === -1 ? rest : rest.slice(0, end)).map(plain).filter(Boolean)
  return title ? { title, blurb } : null
}

const month = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const newestFirst = (key: 'created_at' | 'closed_at') => (a: GithubIssue, b: GithubIssue) =>
  (b[key] ?? '').localeCompare(a[key] ?? '')

export function toRoadmap(issues: GithubIssue[]): Roadmap {
  const roadmap: Roadmap = { rollingOut: [], upcoming: [], shipped: [] }
  const shown = issues.filter((i) => !i.pull_request && MAINTAINERS.has(i.author_association ?? '') && publicBlock(i.body))
  const item = (i: GithubIssue, shipped?: boolean): RoadmapItem => ({
    number: i.number,
    ...publicBlock(i.body)!,
    ...(shipped && i.closed_at ? { shipped: month(i.closed_at) } : {}),
  })
  const hasLabel = (i: GithubIssue, name: string) =>
    i.labels.some((l) => (typeof l === 'string' ? l : l.name) === name)

  for (const i of [...shown].sort(newestFirst('created_at'))) {
    if (i.state === 'open') roadmap.upcoming.push(item(i))
  }
  for (const i of [...shown].sort(newestFirst('closed_at'))) {
    if (i.state !== 'closed' || i.state_reason === 'not_planned') continue
    if (hasLabel(i, RELEASE_LABEL)) roadmap.rollingOut.push(item(i))
    else if (roadmap.shipped.length < NEW_LIMIT) roadmap.shipped.push(item(i, true))
  }
  return roadmap
}

// Cached for an hour. A failed fetch throws, so ISR keeps serving the last
// good page. During `next build` there is no last good page, so it returns
// null instead and a GitHub outage can't fail a deploy.
export async function getRoadmap(): Promise<Roadmap | null> {
  try {
    const res = await fetch(ISSUES_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`GitHub issues ${res.status}`)
    return toRoadmap(await res.json())
  } catch (e) {
    if (process.env.NEXT_PHASE === 'phase-production-build') return null
    throw e
  }
}
