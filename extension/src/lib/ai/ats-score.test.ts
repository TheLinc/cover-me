import { describe, expect, it } from 'vitest'
import { scoreBefore, scoreFromMatch, scoreText } from './ats-score'

describe('scoreFromMatch', () => {
  it('weights tier 1 at 70 and tier 2 at 30 over the covered fraction', () => {
    const r = scoreFromMatch({ tier1Covered: ['TypeScript', 'Postgres'], tier1Missing: ['Kafka'], tier2Covered: ['React'], tier2Missing: [] })
    expect(r.score).toBe(77)
    expect(r.gaps).toEqual(['Kafka'])
  })

  it('lists the unmet hard requirements apart from the gaps, leaving out a years one the candidate meets', () => {
    const r = scoreFromMatch({ tier1Covered: ['A'], tier1Missing: ['Kubernetes'], gatingGaps: ['Kubernetes (required)', 'Requires 2yr, candidate ~3yr', 'RN license'] })
    expect(r.requirements).toEqual(['Kubernetes (required)', 'RN license'])
    expect(r.gaps).toEqual(['Kubernetes', 'Kubernetes (required)', 'RN license'])
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

  it('reads half years in a years requirement', () => {
    expect(scoreFromMatch({ tier1Covered: ['A'], gatingGaps: ['Requires 4yr UX or product design, candidate ~2.5yr'] }).score).toBe(90)
    expect(scoreFromMatch({ tier1Covered: ['A'], gatingGaps: ['Requires 2yr, candidate ~2.5yr'] }).score).toBe(100)
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

describe('scoreText', () => {
  const report = {
    tier1Covered: ['TypeScript', 'Postgres'],
    tier1Missing: ['Kafka'],
    tier2Covered: ['React'],
    tier2Missing: ['GraphQL'],
  }

  it('scores a resume naming every keyword like an all-covered report', () => {
    const text = 'Built React apps in TypeScript on Postgres, with Kafka queues and a GraphQL API.'
    expect(scoreText(report, text).score).toBe(100)
  })

  it('scores a resume naming no keyword at the floor', () => {
    expect(scoreText(report, 'Ran a bakery for six years.').score).toBe(0)
  })

  it('ignores case and finds a keyword inside a longer word only by its stem', () => {
    const r = scoreText({ tier1Covered: ['TypeScript', 'Java'], tier2Covered: ['React'] }, 'typescript, JavaScript and REACT')
    expect(r.score).toBe(65)
    expect(r.gaps).toEqual(['Java'])
  })

  it('matches a phrase by its words in any form and order', () => {
    const r = scoreText({ tier1Covered: ['Stakeholder management', 'Briefing senior leadership'] }, 'Managed stakeholders across 4 teams. Briefed the senior leadership team weekly.')
    expect(r.score).toBe(100)
  })

  it('needs every word of a phrase', () => {
    expect(scoreText({ tier1Covered: ['Budget management'] }, 'Managed a team of six.').gaps).toEqual(['Budget management'])
  })

  it('accepts either option a keyword gives in parentheses or after a slash', () => {
    const r = scoreText({ tier1Covered: ['SolidWorks (Creo or SolidWorks)', 'Agile/Scrum', 'EHR charting (Epic)'] }, 'Modeled parts in Creo. Ran Scrum ceremonies. Charted in Epic.')
    expect(r.score).toBe(100)
  })

  it('ignores filler words and year counts in a keyword', () => {
    expect(scoreText({ tier1Covered: ['3+ years of design experience'] }, 'Led design of pump housings.').score).toBe(100)
  })

  it('keeps the gating gaps from the report', () => {
    const r = scoreText({ ...report, gatingGaps: ['Active RN license required'] }, 'TypeScript Postgres Kafka React GraphQL')
    expect(r.score).toBe(90)
  })

  it('counts an either/or keyword as covered when the text has the other option', () => {
    const r = scoreText({ tier1Missing: ['Tableau'] }, 'Built Power BI dashboards.', 'Dashboards in Tableau or Power BI.')
    expect(r.score).toBe(100)
  })
})

describe('scoreBefore', () => {
  const report = { tier1Covered: ['TypeScript', 'Postgres'], tier1Missing: ['Kafka'], tier2Covered: ['React'] }

  it('takes the wording gain from tailoring off the tailored score', () => {
    expect(scoreBefore(report, 80, 'TypeScript and React', 'TypeScript, Postgres and React')).toBe(56)
  })

  it('is the tailored score when tailoring added no keyword', () => {
    expect(scoreBefore(report, 80, 'TypeScript, Postgres, React', 'TypeScript, Postgres, React')).toBe(80)
    expect(scoreBefore(report, 80, 'TypeScript, Postgres, React', 'TypeScript and React')).toBe(80)
  })

  it('never goes below 0', () => {
    expect(scoreBefore(report, 20, 'Ran a bakery.', 'TypeScript, Postgres and React')).toBe(0)
  })
})
