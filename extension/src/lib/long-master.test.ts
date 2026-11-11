import { describe, expect, test } from 'vitest'
import { pdfPageText } from './resume-parser'
import { groundSkills, groundTailored, skillGroups } from './ai/resume-grounding'
import { budgetText, bulletBudget, isResultBullet, keepResults, mergeTailorDelta } from './ai/resume-tailor'
import { tailoredResumePdf, pdfSafe } from './pdf/resume'
import type { TailoredResume } from '../types'

const at = (str: string, x: number, y: number, width: number, hasEOL = false) => ({ str, transform: [10, 0, 0, 10, x, y], width, hasEOL })

describe('PDF text extraction', () => {
  test('glyph runs of one word are joined without a space, words with one', () => {
    const text = pdfPageText([at('N', 50, 700, 7), at('orthern', 57.5, 700, 35), at('Arizona', 95, 700, 30), at('Aug 2024', 50, 686, 30)])
    expect(text).toBe('Northern Arizona\nAug 2024')
  })

  test('a run marked end-of-line ends the line', () => {
    expect(pdfPageText([at('EDUCATION', 50, 700, 50, true), at('', 0, 0, 0, true), at('Northern', 50, 686, 40)])).toBe('EDUCATION\nNorthern')
  })
})

const GROUPED = 'Languages: Python, TypeScript, SQL\nApplied AI and Agents: LangGraph, LangChain, agent orchestration\nDeployment and Operations: AWS ECS, Docker'

describe('grouped skills', () => {
  test('two or more labelled lines are groups; a plain list is not', () => {
    expect(skillGroups(GROUPED).map((g) => g.label)).toEqual(['Languages', 'Applied AI and Agents', 'Deployment and Operations'])
    expect(skillGroups('Python, SQL, Docker')).toEqual([])
  })

  test('kept skills go back under their own labels, in ranked order', async () => {
    const { skills } = await groundSkills(
      [{ skill: 'LangGraph', category: 'Applied AI and Agents' }, { skill: 'Python' }, { skill: 'Docker' }, { skill: 'agent orchestration' }],
      GROUPED, undefined, GROUPED,
    )
    expect(skills).toBe('Applied AI and Agents: LangGraph, agent orchestration\nLanguages: Python\nDeployment and Operations: Docker')
  })

  test('the grounding guard keeps the labels', () => {
    const tailored = { experience: [], skills: 'Languages: Python, Rust\nOps: Docker' }
    const { resume } = groundTailored(tailored, { experience: [] }, 'Python Docker', 'We use Rust and Python')
    expect(resume.skills).toBe('Languages: Python\nOps: Docker')
  })
})

describe('bullet budget', () => {
  const role = (n: number) => ({ title: 'T', company: 'C', bullets: Array.from({ length: n }, (_, i) => `b${i}`) })
  test('a 3 × 15 master is long; the latest role keeps 6, older ones 4', () => {
    const b = bulletBudget({ experience: [role(15), role(15), role(15)], projects: [role(4)] })
    expect(b).toEqual({ long: true, experience: [6, 4, 4], projects: [3] })
    expect(budgetText({ experience: [role(15), role(3)] })).toBe('- experience[0] (T, C): 15 bullets in, keep 5–6\n- experience[1] (T, C): 3 bullets in, keep 2–3')
  })

  test('a short resume is not long', () => {
    expect(bulletBudget({ experience: [role(5), role(4)] }).long).toBe(false)
  })
})

describe('resume PDF', () => {
  test('text outside the PDF fonts is replaced, not printed as garbage', () => {
    expect(pdfSafe('non‑breaking​ 40→ 25')).toBe('non-breaking 40-> 25')
  })

  test('a resume a little over one page is tightened onto one', () => {
    const r: TailoredResume = {
      name: 'Pat Lee', phone: '555', email: 'p@x.dev', website: '', headline: 'Engineer',
      experience: [{ title: 'Engineer', company: 'Acme', location: 'Remote', dates: '2024 - Present', bullets: Array.from({ length: 27 }, () => 'Built a service that does a reasonably long thing for a long sentence that wraps once on the page width.') }],
      education: [{ institution: 'U', degree: 'BS', location: '', dates: '2020', bullets: ['GPA: 4.0'] }],
    }
    expect(tailoredResumePdf(r).getNumberOfPages()).toBe(1)
  })
})

describe('measured results survive the trim', () => {
  const pilot = 'Delivered a grant-reporting assistant for a four-user pilot, reducing median section-preparation time including review from 40 to 25 minutes across 12 paired tasks.'
  const scope = 'Built a 60-case evaluation set with staff-reviewed expected outcomes.'
  const other = (n: number) => Array.from({ length: n }, (_, i) => `Other bullet ${String.fromCharCode(97 + i)}`)

  test('what counts as a result: before/after figures and percentages, not scope', () => {
    expect(isResultBullet(pilot)).toBe(true)
    expect(isResultBullet('Improved held-out macro-F1 from 0.76 to 0.84')).toBe(true)
    expect(isResultBullet('development 3/14 to 14/14')).toBe(true)
    expect(isResultBullet('92% correct at 62% coverage')).toBe(true)
    expect(isResultBullet(scope)).toBe(false)
  })

  test('a result the model dropped comes back first, the lowest-ranked bullet goes', () => {
    const kept = [scope, ...other(5)]
    const out = keepResults([pilot, scope, ...other(5)], kept, 6)
    expect(out).toEqual([pilot, scope, ...other(4)])
  })

  test("the model's rewrite of a result cut past the maximum is used, not the original", () => {
    const rewrite = 'Cut median section-preparation time from 40 to 25 minutes across 12 paired tasks in a four-user pilot.'
    const out = keepResults([pilot, ...other(6)], [...other(6), rewrite], 6)
    expect(out[0]).toBe(rewrite)
    expect(out).toHaveLength(6)
  })

  test('a result already kept leaves the ranking alone', () => {
    const kept = [scope, 'Reduced section time from 40 to 25 minutes across 12 paired tasks.', ...other(4)]
    expect(keepResults([pilot, scope, ...other(4)], kept, 6)).toEqual(kept)
  })
})

describe('tailored headline', () => {
  const base = { headline: 'Applied AI Engineer', experience: [{ title: 'AI Engineering Fellow', bullets: ['Built agents'] }] }

  test('the merge takes a short headline, and keeps the resume\'s for a missing or long one', () => {
    expect(mergeTailorDelta(base, { experience: [], headline: 'AI Agent Engineer' }).headline).toBe('AI Agent Engineer')
    expect(mergeTailorDelta(base, { experience: [] }).headline).toBe('Applied AI Engineer')
    expect(mergeTailorDelta(base, { experience: [], headline: 'An engineer who does a great many different things for you' }).headline).toBe('Applied AI Engineer')
  })

  test('a resume without a headline gets none', () => {
    expect('headline' in mergeTailorDelta({ experience: [] }, { experience: [], headline: 'AI Agent Engineer' })).toBe(false)
  })

  test('a level the candidate never held goes back to their headline', () => {
    const { resume, removed } = groundTailored({ ...base, headline: 'Senior AI Agent Engineer' }, base, 'Applied AI Engineer AI Engineering Fellow Built agents', 'Senior AI Agent Engineer')
    expect(resume.headline).toBe('Applied AI Engineer')
    expect(removed).toContain('senior (headline level)')
  })

  test('a technology only the job names goes back too; a supported title stays', () => {
    const candidate = 'Applied AI Engineer AI Engineering Fellow Built agent orchestration'
    expect(groundTailored({ ...base, headline: 'Kubernetes Engineer' }, base, candidate, 'You will run services on Kubernetes daily.').resume.headline).toBe('Applied AI Engineer')
    expect(groundTailored({ ...base, headline: 'AI Agent Engineer' }, base, candidate, 'AI Agent Engineer').resume.headline).toBe('AI Agent Engineer')
  })
})
