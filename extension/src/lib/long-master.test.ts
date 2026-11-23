import { describe, expect, test } from 'vitest'
import { pdfPageText } from './resume-parser'
import { groundSkills, groundTailored, recaseSkills, skillGroups } from './ai/resume-grounding'
import { assembleTailored, budgetText, bulletBudget, isResultBullet, keepResults, mergeTailorDelta } from './ai/resume-tailor'
import type { TailoredResume } from '../types'
import { pdfSafe } from './pdf/resume'

const at = (str: string, x: number, y: number, width: number, hasEOL = false) => ({ str, transform: [10, 0, 0, 10, x, y], width, hasEOL })

describe('PDF text extraction', () => {
  test('glyph runs of one word are joined without a space, words with one', () => {
    const text = pdfPageText([at('N', 50, 700, 7), at('orthern', 57.5, 700, 35), at('Arizona', 95, 700, 30), at('Aug 2024', 50, 686, 30)])
    expect(text).toBe('Northern Arizona\nAug 2024')
  })

  test('a run marked end-of-line ends the line', () => {
    expect(pdfPageText([at('EDUCATION', 50, 700, 50, true), at('', 0, 0, 0, true), at('Northern', 50, 686, 40)])).toBe('EDUCATION\nNorthern')
  })

  test('a run drawn left of the one before it is a new word', () => {
    expect(pdfPageText([at('Jan 2020 - Present', 480, 700, 80), at('Software Engineer', 50, 700, 90)])).toBe('Jan 2020 - Present Software Engineer')
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

  test('a model that returns the whole master list is cut to 32 skills in 6 groups, top-ranked first', async () => {
    const master = Array.from({ length: 8 }, (_, g) => `Group ${g}: ${Array.from({ length: 9 }, (_, i) => `skill${g}x${i}`).join(', ')}`).join('\n')
    const ranked = Array.from({ length: 72 }, (_, n) => ({ skill: `skill${n % 8}x${Math.floor(n / 8)}` }))
    const { skills } = await groundSkills(ranked, master, undefined, master)
    const lines = skills!.split('\n')
    expect(lines).toHaveLength(6)
    expect(lines.flatMap((l) => l.split(': ')[1].split(', '))).toHaveLength(32)
    expect(lines[0]).toMatch(/^Group 0: skill0x0, skill0x1/)
  })

  test('the grounding guard keeps the labels', () => {
    const tailored = { experience: [], skills: 'Languages: Python, Rust\nOps: Docker' }
    const { resume } = groundTailored(tailored, { experience: [] }, 'Python Docker', 'We use Rust and Python')
    expect(resume.skills).toBe('Languages: Python\nOps: Docker')
  })

  test('a line with no label stays in a grouped list', () => {
    const own = 'Clinical: Telemetry, IV therapy\nSystems: Epic\nBilingual in Spanish and English'
    const { resume } = groundTailored({ experience: [], skills: own }, { experience: [] }, own, 'Telemetry RN')
    expect(resume.skills).toBe(own)
    expect(recaseSkills(own, own, own)).toBe(own)
  })
})

describe('bullet budget', () => {
  const role = (n: number) => ({ title: 'T', company: 'C', bullets: Array.from({ length: n }, (_, i) => `b${i}`) })
  test('a 3 × 15 master is long: the latest role keeps 6, older ones 4, projects 3', () => {
    const b = bulletBudget({ experience: [role(15), role(15), role(15)], projects: [role(4)] })
    expect(b).toEqual({ long: true, experience: [6, 4, 4], projects: [3] })
    expect(budgetText({ experience: [role(15), role(3)] })).toBe('- experience[0] (T, C): 15 bullets in, keep 5–6\n- experience[1] (T, C): 3 bullets in, keep 2–3')
  })

  test('any other resume keeps what the trim prompt always allowed, and every project bullet', () => {
    // Trim may cut a 10/6/5/4/3 resume to 7/5/5/4/3 at most, never lower in code (#190).
    const b = bulletBudget({ experience: [role(10), role(6), role(5), role(4), role(3)], projects: [role(4)] })
    expect(b).toEqual({ long: false, experience: [7, 5, 5, 4, 3], projects: [4] })
  })

  test('Regenerate in trim mode is held to the same cap as the first run', () => {
    const parsed = { experience: [{ bullets: Array.from({ length: 15 }, (_, i) => `orig ${i}`) }, { bullets: ['x', 'y'] }] }
    const previous = { ...parsed, experience: [{ bullets: Array.from({ length: 6 }, (_, i) => `seen ${i}`) }, { bullets: ['x', 'y'] }] }
    const delta = { experience: [{ bullets: Array.from({ length: 9 }, (_, i) => `new ${i}`) }, { bullets: ['x', 'y'] }] }
    const merged = mergeTailorDelta(previous, delta, { maxBullets: bulletBudget(parsed) })
    expect(merged.experience[0].bullets).toHaveLength(6)
  })

  test('Regenerate in trim mode keeps the bullets the user added', async () => {
    const parsed = { name: 'Ana Ruiz', email: '', phone: '', website: '', experience: [{ title: 'Line Cook', company: 'Fonda', location: 'Austin, TX', dates: '2021 - Present', bullets: ['Ran the grill station', 'Prepped sauces', 'Closed the line', 'Trained new cooks'] }], education: [] }
    const mine = [...parsed.experience[0].bullets, 'Built the weekly prep sheet']
    const previous = { ...parsed, summary: '', editedAt: '2026-11-20T10:00:00.000Z', experience: [{ ...parsed.experience[0], bullets: mine }] }
    const raw = JSON.stringify({ summary: '', experience: [{ bullets: mine }] })
    const out = await assembleTailored(parsed, raw, { jobDescription: 'Line cook, grill', previous: previous as unknown as TailoredResume, maxBullets: bulletBudget(parsed) })
    expect(out.experience[0].bullets).toContain('Built the weekly prep sheet')
  })

  test('a short resume\'s trim drops what the model dropped, measured or not', () => {
    const parsed = { experience: [{ bullets: ['Lifted 50 to 75 lb loads daily', 'Grew Instagram following 40%', 'Welded pipe to code', 'Read weld symbols'] }] }
    const merged = mergeTailorDelta(parsed, { experience: [{ bullets: ['Welded pipe to code', 'Read weld symbols'] }] }, { maxBullets: bulletBudget(parsed) })
    expect(merged.experience[0].bullets).toEqual(['Welded pipe to code', 'Read weld symbols'])
  })
})

describe('a headline the user cleared', () => {
  test('stays cleared on Regenerate, whatever the model returns', () => {
    const base = { headline: '', experience: [{ title: 'CNA', bullets: ['Assisted registered nurses with patient vitals'] }] }
    expect(mergeTailorDelta(base, { headline: 'Registered Nurse', experience: [] }).headline).toBe('')
  })
})

describe('resume PDF text', () => {
  test('text outside the PDF fonts is replaced, not printed as garbage', () => {
    expect(pdfSafe('non\u2011breaking\u200B 40\u2192 25')).toBe('non-breaking 40-> 25')
  })

  test('WinAnsi letters print; others lose their accent, never the letter', () => {
    expect(pdfSafe('\u0160\u00E1rka Nov\u00E1kov\u00E1')).toBe('\u0160\u00E1rka Nov\u00E1kov\u00E1')
    expect(pdfSafe('\u017Di\u017Ekov \u0152uvre \u0178')).toBe('\u017Di\u017Ekov \u0152uvre \u0178')
    expect(pdfSafe('Gda\u0144sk')).toBe('Gdansk')
    expect(pdfSafe('\u0141\u00F3d\u017A')).toBe('L\u00F3dz')
    expect(pdfSafe('Dvo\u0159\u00E1k')).toBe('Dvor\u00E1k')
  })

  test('a unit keeps its meaning, and a missing letter shows', () => {
    expect(pdfSafe('Administered 50 \u03BCg fentanyl')).toBe('Administered 50 \u00B5g fentanyl')
    expect(pdfSafe('10 k\u03A9 resistors')).toBe('10 k ohm resistors')
    expect(pdfSafe('\u0418\u0432\u0430\u043D \u2713')).toBe('???? ?')
    expect(pdfSafe('A \u2260 B, \u224850 patients')).toBe('A != B, ~50 patients')
    expect(pdfSafe('1 \u00D7 10\u2076 cells, CO\u2082 welding, Mg\u00B2\u207A')).toBe('1 \u00D7 10^6 cells, CO2 welding, Mg\u00B2^+')
    expect(pdfSafe('Managed \u20B92 crore, 5\u203210\u2033 \uD83D\uDE00')).toBe('Managed Rs 2 crore, 5\'10" ')
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

  test('a plain range is not a result', () => {
    expect(isResultBullet('Managed 5 to 7 engineers across two teams')).toBe(false)
    expect(isResultBullet('Taught evening classes from 2019 to 2021')).toBe(false)
    expect(isResultBullet('Cut build time 40 to 25 minutes')).toBe(true)
    // Volumes and loads in trades and healthcare are ranges, not changes (#190).
    expect(isResultBullet('Took 20 to 30 patient calls per shift')).toBe(false)
    expect(isResultBullet('Lifted 50 to 75 lb loads daily')).toBe(false)
    expect(isResultBullet('Moved 200 to 300 pallets a shift')).toBe(false)
    expect(isResultBullet('Worked 12-hour night shifts from 7pm to 7am')).toBe(false)
    expect(isResultBullet('Taught grades from 9 to 12')).toBe(false)
    expect(isResultBullet('Covered shifts from 3 to 11')).toBe(false)
    expect(isResultBullet('Worked 7.5 to 12 hour shifts')).toBe(false)
    expect(isResultBullet('Wait times fell from 40 to 25 minutes')).toBe(true)
  })

  test('a change verb counts only beside the figures', () => {
    expect(isResultBullet('Ran 3 to 5 workshops, improving onboarding')).toBe(false)
    expect(isResultBullet('Ran 3 to 5 workshops a month and improved onboarding')).toBe(false)
    expect(isResultBullet('Reduced weekly scrap 120 to 45 pounds')).toBe(true)
    expect(isResultBullet('Raised patient satisfaction scores on the unit 78 to 91')).toBe(true)
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

  test('a result rewritten with only its percentage counts as kept', () => {
    const wait = 'Reduced ER wait from 40 to 25 minutes (38%) by moving triage forward.'
    const kept = ['Cut ER wait times 38% by moving triage forward.', ...other(5)]
    expect(keepResults([wait, ...other(5)], kept, 6)).toEqual(kept)
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
    expect(groundTailored({ ...base, headline: 'AI Engineer, Agents' }, base, candidate, 'AI Agent Engineer').resume.headline).toBe('AI Engineer, Agents')
  })
})

describe('headline words the resume never shows', () => {
  test("the posting's title goes back when the candidate never held it", () => {
    const sre = { headline: 'Backend Engineer', experience: [{ title: 'Backend Engineer', bullets: ['Built Go services on Kubernetes', 'Ran on-call for payments APIs'] }] }
    const candidate = 'Backend Engineer Built Go services on Kubernetes Ran on-call for payments APIs'
    const { resume, removed } = groundTailored({ ...sre, headline: 'Site Reliability Engineer' }, sre, candidate, 'Site Reliability Engineer')
    expect(resume.headline).toBe('Backend Engineer')
    expect(removed).toEqual(expect.arrayContaining(['site (headline word)', 'reliability (headline word)']))
  })

  test('"Registered Nurse" on a CNA resume goes back, whatever case the posting uses', () => {
    const cna = { headline: 'Certified Nursing Assistant', experience: [{ title: 'CNA', bullets: ['Assisted 12 residents a shift with daily living', 'Recorded vitals in PointClickCare'] }] }
    const candidate = 'Certified Nursing Assistant CNA Assisted 12 residents a shift with daily living Recorded vitals in PointClickCare'
    const posting = 'We are hiring a registered nurse for our med-surg unit.'
    expect(groundTailored({ ...cna, headline: 'Registered Nurse' }, cna, candidate, posting).resume.headline).toBe('Certified Nursing Assistant')
  })

  test('a CNA who assisted registered nurses is still not a "Registered Nurse"', () => {
    const cna = { headline: 'Certified Nursing Assistant', experience: [{ title: 'CNA', bullets: ['Assisted registered nurses with patient vitals'] }] }
    const candidate = 'Certified Nursing Assistant CNA Assisted registered nurses with patient vitals'
    const { resume, removed } = groundTailored({ ...cna, headline: 'Registered Nurse' }, cna, candidate, 'Registered Nurse, med-surg')
    expect(resume.headline).toBe('Certified Nursing Assistant')
    expect(removed).toContain('registered (headline level)')
  })

  test('a trade rank or licence the titles never show goes back', () => {
    const apprentice = { headline: 'Electrical Apprentice', experience: [{ title: 'Electrical Apprentice', bullets: ['Wired 40 homes under a master electrician', 'Ran conduit as a journeyman\'s helper'] }] }
    const candidate = 'Electrical Apprentice Wired 40 homes under a master electrician Ran conduit as a journeyman\'s helper'
    expect(groundTailored({ ...apprentice, headline: 'Journeyman Electrician' }, apprentice, candidate, 'Journeyman Electrician').resume.headline).toBe('Electrical Apprentice')
    expect(groundTailored({ ...apprentice, headline: 'Master Electrician' }, apprentice, candidate, 'Master Electrician').resume.headline).toBe('Electrical Apprentice')
    const rn = { headline: 'Registered Nurse', experience: [{ title: 'Registered Nurse', bullets: ['Covered the charge nurse role on 6 night shifts'] }] }
    const rnText = 'Registered Nurse Covered the charge nurse role on 6 night shifts'
    expect(groundTailored({ ...rn, headline: 'Charge Nurse' }, rn, rnText, 'Charge Nurse').resume.headline).toBe('Registered Nurse')
    const welder = { headline: 'Welder', experience: [{ title: 'Welder', bullets: ['Welded pipe to code'] }] }
    expect(groundTailored({ ...welder, headline: 'Certified Welder' }, welder, 'Welder Welded pipe to code', 'Certified Welder').resume.headline).toBe('Welder')
  })

  test('a title made of words from two different titles goes back', () => {
    const cases: Array<[string, string, string, string]> = [
      ['Certified Nursing Assistant', 'Medical Assistant', 'Certified Medical Assistant', 'Certified Nursing Assistant'],
      ['Journeyman Electrician', 'Plumber\'s Helper', 'Journeyman Plumber', 'Journeyman Electrician'],
      ['Assistant Manager', 'Sales Associate', 'Sales Manager', 'Assistant Manager'],
      ['Line Cook', 'Head Dishwasher', 'Head Cook', 'Line Cook'],
    ]
    for (const [first, second, claimed, kept] of cases) {
      const own = { headline: first, experience: [{ title: first, bullets: ['Worked the shift'] }, { title: second, bullets: ['Worked the shift'] }] }
      expect(groundTailored({ ...own, headline: claimed }, own, `${first} ${second} Worked the shift`, claimed).resume.headline, claimed).toBe(kept)
    }
  })

  test('a title with its junior qualifier dropped goes back', () => {
    for (const [held, claimed] of [['Apprentice Electrician', 'Electrician'], ['Student Nurse', 'Nurse'], ['Welder Helper', 'Welder'], ['Trainee Accountant', 'Accountant'], ['Assistant Manager', 'Manager'], ['Associate Director of Nursing', 'Director of Nursing']]) {
      const own = { headline: held, experience: [{ title: held, bullets: ['Worked the shift'] }] }
      expect(groundTailored({ ...own, headline: claimed }, own, `${held} Worked the shift`, claimed).resume.headline, claimed).toBe(held)
    }
    const own = { headline: 'Apprentice Electrician', experience: [{ title: 'Apprentice Electrician', bullets: ['Wired residential homes'] }] }
    expect(groundTailored({ ...own, headline: 'Apprentice Electrician, Residential' }, own, 'Apprentice Electrician Wired residential homes', 'Electrician').resume.headline).toBe('Apprentice Electrician, Residential')
  })

  test('a title from their own titles keeps a specialty their bullets show', () => {
    const own = { headline: 'Applied AI Engineer', experience: [{ title: 'AI Engineering Fellow', bullets: ['Built agent orchestration with LangGraph'] }] }
    const candidate = 'Applied AI Engineer AI Engineering Fellow Built agent orchestration with LangGraph'
    expect(groundTailored({ ...own, headline: 'AI Engineer, Agent Orchestration' }, own, candidate, 'AI Agent Engineer').resume.headline).toBe('AI Engineer, Agent Orchestration')
    // Bullet words in the title itself don't count (#190).
    expect(groundTailored({ ...own, headline: 'AI Agent Engineer' }, own, candidate, 'AI Agent Engineer').resume.headline).toBe('Applied AI Engineer')
    const rn = { headline: 'Registered Nurse', experience: [{ title: 'Staff Nurse', bullets: ['Cared for 5 med-surg patients a shift'] }] }
    expect(groundTailored({ ...rn, headline: 'Registered Nurse, Med-Surg' }, rn, 'Registered Nurse Staff Nurse Cared for 5 med-surg patients a shift', 'Registered Nurse').resume.headline).toBe('Registered Nurse, Med-Surg')
  })

  test('a level word in the specialty is not a level claim', () => {
    const rn = { headline: 'Registered Nurse', experience: [{ title: 'Registered Nurse', bullets: ['Started IV therapy for 8 patients a shift'] }] }
    expect(groundTailored({ ...rn, headline: 'Registered Nurse, IV Therapy' }, rn, 'Registered Nurse Started IV therapy for 8 patients a shift', 'Registered Nurse').resume.headline).toBe('Registered Nurse, IV Therapy')
    const analyst = { headline: 'Data Analyst', experience: [{ title: 'Data Analyst', bullets: ['Cleaned master data for 3 plants'] }] }
    expect(groundTailored({ ...analyst, headline: 'Data Analyst, Master Data' }, analyst, 'Data Analyst Cleaned master data for 3 plants', 'Data Analyst').resume.headline).toBe('Data Analyst, Master Data')
  })
})

describe('recasing grouped skills', () => {
  test('labels and group lines survive the casing pass', () => {
    const own = 'Languages: Python, SQL\nApplied AI and Agents: agent orchestration, LangGraph'
    const out = recaseSkills('Applied AI and Agents: LangGraph, Agent Orchestration\nLanguages: Python', own, own)
    expect(out).toBe('Applied AI and Agents: LangGraph, Agent orchestration\nLanguages: Python')
  })
})
