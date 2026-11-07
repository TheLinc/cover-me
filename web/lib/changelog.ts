// The public changelog, read from GitHub Releases (#146). A release shows only
// the `## Public` section of its notes, bullets grouped under `### New` and
// `### Fixed`. The rest of the notes is for checking the build. Releases are
// published by maintainers only, so unlike the roadmap there's no author check.
import { fetchGithub, plain, publicSection } from './roadmap'

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

// The newest version users can install. Highest by semver, not by date: 1.4.0
// was published minutes after 1.5.0.
export function latestVersion(releases: GithubRelease[]): string | null {
  const parts = (v: string) => v.split('.').map(Number)
  const newer = (a: string, b: string) => {
    const [x, y] = [parts(a), parts(b)]
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] ?? 0) > (y[i] ?? 0)
    return false
  }
  return releases.filter((r) => !r.draft && !r.prerelease).map((r) => r.tag_name.replace(/^v/, '')).reduce<string | null>((best, v) => (!best || newer(v, best) ? v : best), null)
}

export async function getLatestVersion(): Promise<string | null> {
  const releases = await fetchGithub<GithubRelease[]>(RELEASES_URL)
  return releases && latestVersion(releases)
}

export async function getChangelog(): Promise<ChangelogVersion[] | null> {
  const releases = await fetchGithub<GithubRelease[]>(RELEASES_URL)
  return releases && toChangelog(releases)
}
