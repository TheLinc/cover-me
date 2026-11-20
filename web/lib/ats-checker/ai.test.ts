import { expect, test } from 'vitest'
import { fromAi, type AiReport } from './ai'

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
