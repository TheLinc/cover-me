import { describe, expect, it } from 'vitest'
import { scoreFromMatch } from './ats-score'

describe('scoreFromMatch', () => {
  it('weights tier 1 at 70 and tier 2 at 30 over the covered fraction', () => {
    // 2 of 3 tier-1, 1 of 1 tier-2: 70 * 2/3 + 30 = 76.67 → 77
    const r = scoreFromMatch({ tier1Covered: ['TypeScript', 'Postgres'], tier1Missing: ['Kafka'], tier2Covered: ['React'], tier2Missing: [] })
    expect(r.score).toBe(77)
    expect(r.gaps).toEqual(['Kafka'])
  })

  it('subtracts 10 per unmet hard requirement, capped at 25', () => {
    const one = scoreFromMatch({ tier1Covered: ['A'], gatingGaps: ['Active RN license required'] })
    expect(one.score).toBe(90)
    const many = scoreFromMatch({ tier1Covered: ['A'], gatingGaps: ['RN license', 'BLS card', 'Bachelor degree'] })
    expect(many.score).toBe(75)
  })

  it('does not subtract twice for a requirement already missing as a keyword', () => {
    const withGate = scoreFromMatch({ tier1Covered: ['Docker'], tier1Missing: ['Kubernetes'], gatingGaps: ['Kubernetes (required)'] })
    const without = scoreFromMatch({ tier1Covered: ['Docker'], tier1Missing: ['Kubernetes'] })
    expect(withGate.score).toBe(without.score)
    expect(withGate.gaps).toContain('Kubernetes (required)')
  })

  it('drops a years requirement the candidate meets', () => {
    const r = scoreFromMatch({ tier1Covered: ['A'], gatingGaps: ['Requires 5yr, candidate ~7yr'] })
    expect(r.score).toBe(100)
    expect(r.gaps).toEqual([])
  })

  it('keeps a years requirement the candidate falls short of', () => {
    const r = scoreFromMatch({ tier1Covered: ['A'], gatingGaps: ['Requires 5+ years, candidate ~3 years'] })
    expect(r.score).toBe(90)
    expect(r.gaps).toEqual(['Requires 5+ years, candidate ~3 years'])
  })

  it('counts an either/or requirement as covered when the resume has the other option', () => {
    const r = scoreFromMatch(
      { tier1Covered: [], tier1Missing: ['Tableau'] },
      { jobDescription: 'Build dashboards in Tableau or Power BI for regional managers.', candidate: 'Built Power BI dashboards for 12 stores.' },
    )
    expect(r.score).toBe(100)
    expect(r.gaps).toEqual([])
  })

  it('ignores punctuation after the other option', () => {
    const r = scoreFromMatch(
      { tier1Covered: [], tier1Missing: ['Kafka'] },
      { jobDescription: 'Queue work runs on Kafka or Postgres.', candidate: 'TypeScript, Postgres, React' },
    )
    expect(r.gaps).toEqual([])
  })

  it('treats a slash between two options as either/or', () => {
    const r = scoreFromMatch(
      { tier1Covered: ['Discovery'], tier1Missing: ['Lexis'] },
      { jobDescription: 'Legal research in Westlaw/Lexis', candidate: 'Ran case-law research in Westlaw' },
    )
    expect(r.gaps).toEqual([])
    expect(r.score).toBe(100)
  })

  it('leaves an either/or requirement missing when the resume has neither option', () => {
    const r = scoreFromMatch(
      { tier1Covered: ['SQL'], tier1Missing: ['Tableau'] },
      { jobDescription: 'Build dashboards in Tableau or Power BI.', candidate: 'Wrote SQL reports in Excel.' },
    )
    expect(r.gaps).toEqual(['Tableau'])
    expect(r.score).toBe(65)
  })

  it('needs no job context for the plain score', () => {
    expect(scoreFromMatch({}).score).toBe(100)
    expect(scoreFromMatch({ tier1Missing: ['X'], tier2Missing: ['Y'] }).score).toBe(0)
  })
})
