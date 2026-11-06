import { describe, expect, it } from 'vitest'
import { toChangelog, type GithubRelease } from './changelog'

const release = (over: Partial<GithubRelease>): GithubRelease => ({
  tag_name: 'v1.4.0',
  draft: false,
  prerelease: false,
  created_at: '2026-11-05T20:35:00Z',
  body: 'Built from `abc`.',
  ...over,
})

const NOTES = [
  '## Public',
  '',
  '### New',
  '- Download a tailored resume as a **Word** file.',
  '* A [guide](https://x) when you install.',
  '',
  '### Fixed',
  '- Indeed company names read correctly.',
  '',
  '## Build',
  '- Built from `abc` (#120).',
].join('\r\n')

describe('toChangelog', () => {
  it('reads New and Fixed bullets from the Public section as plain text', () => {
    expect(toChangelog([release({ body: NOTES })])).toEqual([{
      version: '1.4.0',
      date: 'November 5, 2026',
      new: ['Download a tailored resume as a Word file.', 'A guide when you install.'],
      fixed: ['Indeed company names read correctly.'],
    }])
  })

  it('ends the section at the build notes that follow it without a heading', () => {
    const body = [
      '## Public',
      '### New',
      '- See what Cover Me plans to change.',
      '### Fixed',
      '- Indeed company names read correctly.',
      '',
      'Built from `eacd1b1`.',
      '',
      '- A planning line shows what the model is thinking (#91).',
      '',
      '---',
      '**Install from the store.**',
    ].join('\n')
    expect(toChangelog([release({ body })])[0]).toMatchObject({
      new: ['See what Cover Me plans to change.'],
      fixed: ['Indeed company names read correctly.'],
    })
  })

  it('allows blank lines between a heading and its bullets, and between groups', () => {
    const [v] = toChangelog([release({ body: '## Public\n\n### New\n\n- One.\n- Two.\n\n### Fixed\n\n- Three.\n\nBuilt from `abc`.\n- Dev.' })])
    expect(v).toMatchObject({ new: ['One.', 'Two.'], fixed: ['Three.'] })
  })

  it('leaves out an empty group', () => {
    const [v] = toChangelog([release({ body: '## Public\n### Fixed\n- One fix.' })])
    expect(v).toMatchObject({ new: [], fixed: ['One fix.'] })
  })

  it('gives a release without a Public section, or an empty one, no groups', () => {
    const [none, empty] = toChangelog([release({ body: 'Built from `abc`.\n- Dev bullet.' }), release({ body: '## Public\n\n## Build' })])
    expect(none).toMatchObject({ new: [], fixed: [] })
    expect(empty).toMatchObject({ new: [], fixed: [] })
  })

  it('skips drafts and prereleases, newest first', () => {
    const list = toChangelog([
      release({ tag_name: 'v1.3.0', created_at: '2026-10-15T00:00:00Z' }),
      release({ tag_name: 'v1.5.0', draft: true, created_at: '2026-11-20T00:00:00Z' }),
      release({ tag_name: 'v1.5.0-rc.1', prerelease: true, created_at: '2026-11-19T00:00:00Z' }),
      release({ tag_name: 'v1.4.0', created_at: '2026-11-05T00:00:00Z' }),
    ])
    expect(list.map((v) => v.version)).toEqual(['1.4.0', '1.3.0'])
  })
})
