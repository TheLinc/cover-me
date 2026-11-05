import { describe, expect, it } from 'vitest'
import { publicBlock, toRoadmap, type GithubIssue } from './roadmap'

const PUBLIC = (title: string) => `Agent notes.\n\n## Public\n\n**${title}**\nA [short](https://x) blurb.\n\n## Related\n\n- #1`

const issue = (over: Partial<GithubIssue>): GithubIssue => ({
  number: 1,
  state: 'open',
  created_at: '2026-11-01T00:00:00Z',
  author_association: 'OWNER',
  labels: [{ name: 'roadmap' }],
  body: PUBLIC('Thing'),
  ...over,
})

describe('publicBlock', () => {
  it('reads the title and blurb, stops at the next heading, strips markdown', () => {
    expect(publicBlock(PUBLIC('Edit your resume'))).toEqual({ title: 'Edit your resume', blurb: 'A short blurb.' })
  })

  it('returns null without a Public section or with an empty one', () => {
    expect(publicBlock('No block here')).toBeNull()
    expect(publicBlock('## Public\n\n## Related\nx')).toBeNull()
    expect(publicBlock(null)).toBeNull()
  })
})

describe('toRoadmap', () => {
  it('buckets by state and the release label, newest first, skipping PRs, not-planned, unpublished and outsider issues', () => {
    const r = toRoadmap([
      issue({ number: 1, created_at: '2026-10-01T00:00:00Z' }),
      issue({ number: 2, created_at: '2026-11-01T00:00:00Z' }),
      issue({ number: 3, state: 'closed', state_reason: 'completed', closed_at: '2026-10-15T00:00:00Z' }),
      issue({ number: 4, state: 'closed', state_reason: 'completed', closed_at: '2026-10-20T00:00:00Z', labels: ['roadmap', 'needs-extension-release'] }),
      issue({ number: 5, state: 'closed', state_reason: 'not_planned', closed_at: '2026-10-20T00:00:00Z' }),
      issue({ number: 6, body: 'no public block' }),
      issue({ number: 7, pull_request: {} }),
      issue({ number: 8, author_association: 'NONE' }),
    ])
    expect(r.upcoming.map((i) => i.number)).toEqual([2, 1])
    expect(r.rollingOut.map((i) => i.number)).toEqual([4])
    expect(r.shipped).toEqual([{ number: 3, title: 'Thing', blurb: 'A short blurb.', shipped: 'October 2026' }])
  })

  it('keeps only the 6 most recently shipped', () => {
    const closed = Array.from({ length: 8 }, (_, n) =>
      issue({ number: n + 1, state: 'closed', state_reason: 'completed', closed_at: `2026-10-0${n + 1}T00:00:00Z` }))
    expect(toRoadmap(closed).shipped.map((i) => i.number)).toEqual([8, 7, 6, 5, 4, 3])
  })
})
