import { describe, expect, test } from 'vitest'
import { assembleTailored, buildPrompt, mergeTailorDelta, parseDelta } from './resume-tailor'
import type { ParsedResume, TailoredResume } from '../../types'

const delta = (summary: string) => JSON.stringify({ summary, experience: [{ bullets: ['Led {setup} of 3 sites'] }], keywordMatch: { tier1Missing: [] } }, null, 2)

describe('parseDelta', () => {
  test('reads fenced JSON and JSON wrapped in prose', () => {
    expect(parseDelta('```json\n' + delta('a') + '\n```').summary).toBe('a')
    expect(parseDelta('Here is the resume:\n' + delta('a') + '\nHope that helps.').summary).toBe('a')
  })

  // Seen in the 2026-10-09 full eval: the model emits the JSON, then corrects itself (#9).
  test('takes the corrected object when the model revises its own output', () => {
    const raw = delta('first') + '\n\nWait — correction needed on evidence strings: the evidence for {Accessibility} must be verbatim.\n\n' + delta('corrected')
    expect(parseDelta(raw).summary).toBe('corrected')
  })

  test('ignores braces inside strings', () => {
    expect(parseDelta(delta('uses } and { in text')).experience[0].bullets[0]).toBe('Led {setup} of 3 sites')
  })

  test('falls back to the last complete object when a later one is cut off', () => {
    expect(parseDelta(delta('complete') + '\n\nWait, fixing:\n{"summary": "cut off", "experience": [').summary).toBe('complete')
  })

  test('keeps its two error messages', () => {
    expect(() => parseDelta('not json at all')).toThrow('AI returned invalid JSON')
    expect(() => parseDelta('{"summary": "no experience"}')).toThrow('AI returned incomplete response')
  })
})

describe('mergeTailorDelta bullet counts', () => {
  const base = {
    experience: [{ bullets: ['Teach Algebra I to 140 students', 'Raised scores from 38% to 52%', 'Write IEP accommodations', 'Use Desmos daily'] }],
    projects: [{ bullets: ['Built a grading script', 'Shared it with 4 teachers'] }],
  }
  // Seen in the 2026-10-09 full eval: two bullets fused into one, 4 -> 3 (#9).
  const merged3 = { experience: [{ bullets: ['Raised scores from 38% to 52% teaching Algebra I to 140 students', 'Write IEP accommodations', 'Use Desmos daily'] }] }

  test('default mode keeps the original bullets when a role comes back with a different count', () => {
    expect(mergeTailorDelta(base, merged3, { exactBulletCounts: true }).experience[0].bullets).toEqual(base.experience[0].bullets)
  })

  test('default mode takes a rewrite with the same count', () => {
    const same = { experience: [{ bullets: ['a', 'b', 'c', 'd'] }] }
    expect(mergeTailorDelta(base, same, { exactBulletCounts: true }).experience[0].bullets).toEqual(['a', 'b', 'c', 'd'])
  })

  test('trim and compact modes may drop bullets', () => {
    expect(mergeTailorDelta(base, merged3).experience[0].bullets).toHaveLength(3)
  })

  // #251: projects follow the same mode rule as roles.
  const projectCut = { experience: [], projects: [{ bullets: ['Built a grading script used by 4 teachers'] }] }

  test('default mode keeps the original project bullets when a project comes back with a different count', () => {
    expect(mergeTailorDelta(base, projectCut, { exactBulletCounts: true }).projects![0].bullets).toEqual(base.projects[0].bullets)
  })

  test('default mode takes a project rewrite with the same count', () => {
    const same = { experience: [], projects: [{ bullets: ['Built a Python grading script', 'Shared it with 4 math teachers'] }] }
    expect(mergeTailorDelta(base, same, { exactBulletCounts: true }).projects![0].bullets).toEqual(['Built a Python grading script', 'Shared it with 4 math teachers'])
  })

  test('trim and compact modes may drop project bullets', () => {
    expect(mergeTailorDelta(base, projectCut).projects![0].bullets).toEqual(['Built a grading script used by 4 teachers'])
  })

  test('a project that comes back empty keeps its original bullets in every mode', () => {
    const empty = { experience: [], projects: [{ bullets: [] }] }
    expect(mergeTailorDelta(base, empty).projects![0].bullets).toEqual(base.projects[0].bullets)
    expect(mergeTailorDelta(base, empty, { exactBulletCounts: true }).projects![0].bullets).toEqual(base.projects[0].bullets)
  })

  test('trim of a long master cuts each entry to its budget, keeping the first-ranked bullets and any measured result', () => {
    const delta = { experience: [{ bullets: ['a', 'b', 'c', 'd'] }], projects: [{ bullets: ['p1', 'p2', 'p3'] }] }
    const merged = mergeTailorDelta(base, delta, { maxBullets: { long: true, experience: [2], projects: [1] } })
    expect(merged.experience[0].bullets).toEqual(['Raised scores from 38% to 52%', 'a'])
    expect(merged.projects![0].bullets).toEqual(['p1'])
  })
})

describe('mergeTailorDelta other sections', () => {
  test("keeps the resume's otherSections even when the delta carries its own", () => {
    const otherSections = [{ heading: 'PUBLICATIONS', lines: ['Adeyemi S. "CRISPR screening." J Cell Biol. 2023.'] }]
    const base = { experience: [{ bullets: ['Ran qPCR assays'] }], otherSections }
    const delta = { experience: [{ bullets: ['Ran qPCR assays for 3 programs'] }], otherSections: [{ heading: 'AWARDS', lines: ['Nobel Prize'] }] }
    expect(mergeTailorDelta(base, delta as Parameters<typeof mergeTailorDelta>[1]).otherSections).toBe(otherSections)
  })
})

// #197: Regenerate changes wording, not layout or what the user deleted.
describe('Regenerate after section edits', () => {
  const parsed = {
    name: 'Pat Lee', email: 'pat@example.com', phone: '', website: '',
    experience: [{ title: 'Engineer', company: 'Northwind', location: '', dates: '2022', bullets: ['Built the billing service'] }],
    education: [{ institution: 'State U', degree: 'BSc', location: '', dates: '2018', bullets: [] }],
    skills: 'TypeScript',
    certifications: ['AWS SAA'],
    otherSections: [{ heading: 'Talks', lines: ['Spoke at a meetup'] }, { heading: 'Awards', lines: ['Hackathon winner'] }],
    sectionOrder: ['summary', 'experience', 'education', 'certifications', 'skills', 'other', 'other'],
  } as ParsedResume
  const previous: TailoredResume = {
    ...parsed,
    summary: 'Backend engineer.',
    certifications: undefined,
    otherSections: [{ heading: 'Awards', lines: ['Hackathon winner'] }, { heading: 'Talks', lines: ['Spoke at a meetup'] }],
    sectionOrder: ['other', 'skills', 'summary', 'experience', 'education', 'other'],
    deletedSections: [{ key: 'certifications', index: 4, certifications: ['Deleted cert text'] }],
    editedAt: '2026-11-12T00:00:00Z',
    atsScore: 74,
    atsScoreBefore: 61,
  }
  const raw = JSON.stringify({ summary: 'Reworded.', experience: [{ bullets: ['Built the billing service'] }] })

  test('keeps the order, extra sections included, and what was deleted', async () => {
    const resume = await assembleTailored(parsed, raw, { jobDescription: 'Engineer', previous })
    expect(resume.sectionOrder).toEqual(previous.sectionOrder)
    expect(resume.otherSections).toEqual(previous.otherSections)
    expect(resume.deletedSections).toEqual(previous.deletedSections)
    expect(resume.certifications).toBeUndefined()
  })

  test("the prompt never sees a deleted section's text or the old scores", () => {
    const job = { title: 'Engineer', company: 'Acme', description: 'Engineer' } as Parameters<typeof buildPrompt>[0]
    const prompt = buildPrompt(job, parsed, false, undefined, false, true, previous)
    expect(prompt).toContain('REVISION MODE')
    expect(prompt).not.toContain('Deleted cert text')
    expect(prompt).not.toContain('deletedSections')
    expect(prompt).not.toContain('atsScore')
  })
})

describe('score before tailoring (#228)', () => {
  const parsed = {
    name: 'Pat Lee', email: 'pat@example.com', phone: '', website: '',
    experience: [{ title: 'Engineer', company: 'Northwind', location: '', dates: '2022', bullets: ['Built the billing service in TypeScript'] }],
    education: [],
  } as unknown as ParsedResume
  const keywordMatch = { tier1Covered: ['TypeScript', 'Postgres'], tier1Missing: ['Kubernetes'] }

  test('is the tailored score when the wording added no keyword, gap list aside', async () => {
    const raw = JSON.stringify({ experience: [{ bullets: ['Built the billing service in TypeScript'] }], keywordMatch })
    const resume = await assembleTailored(parsed, raw, { jobDescription: 'Engineer' })
    expect(resume.atsGaps).toContain('Kubernetes')
    expect(resume.atsScoreBefore).toBe(resume.atsScore)
  })

  test('drops by what the wording added', async () => {
    const km = { tier1Covered: ['TypeScript', 'Payment systems'], tier1Missing: ['Kubernetes'] }
    const raw = JSON.stringify({ experience: [{ bullets: ['Built the billing and payment systems in TypeScript'] }], keywordMatch: km })
    const resume = await assembleTailored(parsed, raw, { jobDescription: 'Engineer' })
    // Model: 70 * 2/3 + 30 = 77. Word match: original 70 * 1/3 + 30 = 53, tailored 77, so before is 77 - 24 (#228).
    expect(resume.atsScore).toBe(77)
    expect(resume.atsScoreBefore).toBe(53)
  })
})

describe("the posting's title in the summary (#218)", () => {
  const parsed = {
    name: 'Pat Lee', email: 'pat@example.com', phone: '', website: '',
    experience: [{ title: 'Web Developer', company: 'Northwind', location: '', dates: '2022', bullets: ['Built React screens'] }],
    education: [], skills: 'React',
  } as unknown as ParsedResume
  const raw = JSON.stringify({ summary: 'Full Stack Developer building React screens.', experience: [{ bullets: ['Built React screens'] }] })
  const grounding = { jobDescription: 'We are hiring a Full Stack Developer.', jobTitle: 'Full Stack Developer' }

  test('keeps it when the line check passed the summary', async () => {
    const resume = await assembleTailored(parsed, raw, { ...grounding, ask: async () => '{"flags": [], "summary": null}' })
    expect(resume.summary).toBe('Full Stack Developer building React screens.')
  })

  test('keeps it when the summary was flagged for something else and its rewrite passes a second check', async () => {
    let checks = 0
    const ask = async (prompt: string) => prompt.startsWith('RESUME ACCURACY CHECK')
      ? (++checks === 1 ? '{"flags": [], "summary": "names TypeScript"}' : '{"flags": [], "summary": null}')
      : '{"rewrites": [{"id": "summary", "text": "Full Stack Developer who builds React screens."}]}'
    const resume = await assembleTailored(parsed, raw, { ...grounding, ask })
    expect(resume.summary).toBe('Full Stack Developer who builds React screens.')
    expect(checks).toBe(2)
  })

  test('the code guard still removes it when the line check flagged the summary', async () => {
    const ask = async (prompt: string) => prompt.startsWith('RESUME ACCURACY CHECK')
      ? '{"flags": [], "summary": "claims backend work"}'
      : '{"rewrites": [{"id": "summary", "text": "Full Stack Developer who builds React screens."}]}'
    const resume = await assembleTailored(parsed, raw, { ...grounding, ask })
    expect(resume.summary).toBe('')
  })

  test('the code guard still removes it when the line check could not run', async () => {
    const resume = await assembleTailored(parsed, raw, { ...grounding, ask: async () => { throw new Error('down') } })
    expect(resume.summary).toBe('')
  })
})

const engineer = (skills: string) => ({
  name: 'Sam Ortiz', email: 'sam@example.com', phone: '', website: '',
  experience: [{ title: 'Backend Engineer', company: 'Northwind', location: '', dates: '2022', bullets: ['Built the billing service in Go'] }],
  education: [], skills,
}) as unknown as ParsedResume

// Default mode cut a long skills list to about half with no cutting option on (#400).
describe('the skills list with no cutting option on (#400)', () => {
  const parsed = engineer('Go, PostgreSQL, Kafka, React, Jenkins, Jira')
  const raw = JSON.stringify({ experience: [{ bullets: ['Built the billing service in Go'] }], skills: [{ skill: 'Kafka' }, { skill: 'PostgreSQL (SQL)', evidence: 'PostgreSQL' }, { skill: 'Go' }] })
  const approve = async () => '{"verdicts": [{"i": 0, "ok": true}]}'

  test('puts back every skill the model left out, after its list, without a second PostgreSQL', async () => {
    const resume = await assembleTailored(parsed, raw, { jobDescription: 'Go, Kafka and PostgreSQL', ask: approve, exactBulletCounts: true })
    expect(resume.skills).toBe('Kafka, PostgreSQL (SQL), Go, React, Jenkins, Jira')
  })

  test('a resume skill the model wrote in parentheses is kept, not added twice', async () => {
    const raw = JSON.stringify({ experience: [{ bullets: ['Built the billing service in Go'] }], skills: [{ skill: 'Message queues (Kafka)', evidence: 'Kafka' }] })
    const resume = await assembleTailored(engineer('Go, Kafka'), raw, { jobDescription: 'Message queues', ask: approve, exactBulletCounts: true })
    expect(resume.skills).toBe('Message queues (Kafka), Go')
  })

  test('a resume skill whose parentheses the model shortened comes back whole', async () => {
    const raw = JSON.stringify({ experience: [{ bullets: ['Built the billing service in Go'] }], skills: [{ skill: 'Excel (pivot tables)' }] })
    const resume = await assembleTailored(engineer('Excel (pivot tables, VLOOKUP)'), raw, { jobDescription: 'Excel', exactBulletCounts: true })
    expect(resume.skills).toBe('Excel (pivot tables), Excel (pivot tables, VLOOKUP)')
  })

  test('keeps the model\'s shorter list in trim mode', async () => {
    const resume = await assembleTailored(parsed, raw, { jobDescription: 'Go, Kafka and PostgreSQL', ask: approve, exactBulletCounts: false })
    expect(resume.skills).toBe('Kafka, PostgreSQL (SQL), Go')
  })
})

describe('a grouped skills list with no cutting option on (#400)', () => {
  const langs = ['Go', 'Python', 'Java', 'Kotlin', 'PHP', 'Ruby', 'Rust', 'Scala', 'Perl', 'Elixir']
  const tools = ['Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Jira', 'Grafana', 'Kafka', 'Redis', 'Ansible', 'Vault']
  const parsed = engineer(`Languages: ${langs.join(', ')}\nTools: ${tools.join(', ')}`)
  const raw = JSON.stringify({ experience: [{ bullets: ['Built the billing service in Go'] }], skills: [...tools.slice(0, 9), ...langs].map((skill) => ({ skill })) })

  test('keeps all 20, and the one the model left out goes back under its own label', async () => {
    const resume = await assembleTailored(parsed, raw, { jobDescription: 'Backend engineer', exactBulletCounts: true })
    expect(resume.skills).toBe(`Tools: ${tools.join(', ')}\nLanguages: ${langs.join(', ')}`)
  })

  test('keeps a seventh group', async () => {
    const own = ['Go', 'Python', 'Docker', 'Jira', 'Kafka', 'Redis', 'Vault'].map((s, i) => `Group ${i + 1}: ${s}`).join('\n')
    const raw = JSON.stringify({ experience: [{ bullets: ['Built the billing service in Go'] }], skills: [{ skill: 'Vault', category: 'Group 7' }] })
    const resume = await assembleTailored(engineer(own), raw, { jobDescription: 'Backend engineer', exactBulletCounts: true })
    expect(resume.skills).toBe(`Group 7: Vault\n${own.split('\n').slice(0, 6).join('\n')}`)
  })

  test('is cut to 18 in trim mode', async () => {
    const resume = await assembleTailored(parsed, raw, { jobDescription: 'Backend engineer', exactBulletCounts: false })
    expect(resume.skills).toBe(`Tools: ${tools.slice(0, 9).join(', ')}\nLanguages: ${langs.slice(0, 9).join(', ')}`)
  })
})

describe('the skills step of the prompt (#400)', () => {
  const job = { title: 'Engineer', company: 'Acme', description: 'Engineer' } as Parameters<typeof buildPrompt>[0]
  const parsed = engineer('Languages: Go, Python\nTools: Docker, Jira')

  test('asks for no cuts and no cap with no cutting option on', () => {
    const prompt = buildPrompt(job, parsed, false)
    expect(prompt).toContain('KEEP every skill the resume lists')
    expect(prompt).not.toMatch(/REMOVE skills|Hard cap|18-item/)
  })

  test.each([['trim', false, true], ['compact', true, false]] as const)('cuts to the cap in %s mode', (_mode, compact, trim) => {
    const prompt = buildPrompt(job, parsed, compact, undefined, trim)
    expect(prompt).toContain('REMOVE skills not relevant to this role type')
    expect(prompt).toContain('the 18-item hard cap above')
    expect(prompt).not.toContain('KEEP every skill the resume lists')
  })
})
