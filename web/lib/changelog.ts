// The public changelog, read from GitHub Releases (#146). A release shows only
// the `## Public` section of its notes, bullets grouped under `### New` and
// `### Fixed`. The rest of the notes is for checking the build. Releases are
// published by maintainers only, so unlike the roadmap there's no author check.
import { plain, publicSection } from './roadmap'

const RELEASES_URL = 'https://api.github.com/repos/TheLinc/cover-me/releases?per_page=100'

export interface ChangelogVersion {
  version: string
  /** Like "November 5, 2026". */
  date: string
  new: string[]
  fixed: string[]
}

// The fields of GitHub's release JSON this reads.
export interface GithubRelease {
  tag_name: string
  draft: boolean
  prerelease: boolean
  // The date of the release's commit, i.e. the build. published_at is when
  // the notes went public, which for 1.3.0 to 1.3.2 was weeks after the store.
  created_at: string
  body?: string | null
}

function groups(body: string | null | undefined): Pick<ChangelogVersion, 'new' | 'fixed'> {
  const out: Pick<ChangelogVersion, 'new' | 'fixed'> = { new: [], fixed: [] }
  let group: string[] | null = null
  for (const line of publicSection(body) ?? []) {
    const heading = /^###\s+(.*)$/.exec(line.trim())
    if (heading) {
      const name = heading[1].trim().toLowerCase()
      group = name === 'new' ? out.new : name === 'fixed' ? out.fixed : null
      continue
    }
    if (!line.trim()) continue
    // The build notes follow the section with no heading of their own
    // ("Built from `abc`."), so the first line of plain text ends it.
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    if (!bullet) break
    if (group && plain(bullet[1])) group.push(plain(bullet[1]))
  }
  return out
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export function toChangelog(releases: GithubRelease[]): ChangelogVersion[] {
  return releases
    .filter((r) => !r.draft && !r.prerelease)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => ({ version: r.tag_name.replace(/^v/, ''), date: day(r.created_at), ...groups(r.body) }))
}

// Same caching and build-time fallback as getRoadmap() in lib/roadmap.ts.
export async function getChangelog(): Promise<ChangelogVersion[] | null> {
  try {
    const res = await fetch(RELEASES_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`GitHub releases ${res.status}`)
    return toChangelog(await res.json())
  } catch (e) {
    if (process.env.NEXT_PHASE === 'phase-production-build') return null
    throw e
  }
}
