import { afterEach, describe, expect, test, vi } from 'vitest'
import { askAi, fromAi, type AiReport } from './ai'

const POSTING = 'Data Analyst\nRequirements\n- Strong SQL skills\n- Tableau or Looker\nNice to have\n- dbt'
const REPORT: AiReport = {
  score: 60,
  gaps: ['Tableau or Looker', 'dbt', 'Requires 3yr, candidate ~1yr'],
  keywordMatch: { tier1Covered: ['SQL', 'Python'], tier1Missing: ['Tableau or Looker'], tier2Covered: [], tier2Missing: ['dbt'], gatingGaps: ['Requires 3yr, candidate ~1yr'] },
  quotes: [
    { name: 'SQL', posting_text: 'SQL', resume_text: 'Wrote SQL reports' },
    { name: 'Tableau or Looker', posting_text: 'Tableau or Looker', resume_text: '' },
    { name: 'dbt', posting_text: '', resume_text: '' },
  ],
  title: 'Data Analyst',
}

test('tiers become levels, and a keyword is found unless the score counts it as a gap', () => {
  const { keywords } = fromAi(POSTING, REPORT)
  expect(keywords.map((k) => [k.name, k.level, k.found])).toEqual([
    ['SQL', 'required', true],
    ['Python', 'required', true],
    ['Tableau or Looker', 'required', false],
    ['dbt', 'preferred', false],
  ])
})

test('a keyword keeps its quotes as spellings and the posting line that asked for it', () => {
  const sql = fromAi(POSTING, REPORT).keywords[0]
  expect(sql.spellings).toEqual(['SQL', 'Wrote SQL reports'])
  expect(sql.line).toBe('- Strong SQL skills')
  expect(fromAi(POSTING, REPORT).keywords[3].line).toBeUndefined()
})

test('only gaps that are not keywords are listed as unmet requirements', () => {
  expect(fromAi(POSTING, REPORT).gates).toEqual(['Requires 3yr, candidate ~1yr'])
})

describe('askAi', () => {
  afterEach(() => vi.unstubAllGlobals())
  const reply = (status: number) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(REPORT), { status })))

  test.each([[429, 'busy'], [413, 'long'], [403, 'failed'], [502, 'failed'], [503, 'failed']])('maps a %s to the %s fallback', async (status, error) => {
    reply(status)
    expect(await askAi('p', 'r', null, new AbortController().signal)).toEqual({ error })
  })

  test('returns the report on a 200, and a network error as failed', async () => {
    reply(200)
    expect(await askAi('p', 'r', 't', new AbortController().signal)).toEqual(REPORT)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    expect(await askAi('p', 'r', 't', new AbortController().signal)).toEqual({ error: 'failed' })
  })

  test('rethrows when the check was aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('aborted', 'AbortError') }))
    await expect(askAi('p', 'r', 't', controller.signal)).rejects.toThrow('aborted')
  })
})
