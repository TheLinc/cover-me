import { describe, expect, test } from 'vitest'
import { assembleTailored, buildPrompt, mergeTailorDelta, parseDelta } from './resume-tailor'
import type { ParsedResume, TailoredResume } from '../../types'

const delta = (summary: string) => JSON.stringify({ summary, experience: [{ bullets: ['Led {setup} of 3 sites'] }], keywordMatch: { tier1Missing: [] } }, null, 2)

describe('parseDelta', () => {
  test('reads fenced JSON and JSON wrapped in prose', () => {
    expect(parseDelta('```json\n' + delta('a') + '\n```').summary).toBe('a')
    expect(parseDelta('Here is the resume:\n' + delta('a') + '\nHope that helps.').summary).toBe('a')
  })

  // Seen in the 2026-10-09 full eval: the model emits the JSON, then corrects itself.
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
  // Seen in the 2026-10-09 full eval: two bullets fused into one, 4 -> 3.
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

  test('projects keep their bullet count in every mode', () => {
    const delta = { experience: [], projects: [{ bullets: ['Built and shared a grading script with 4 teachers'] }] }
    expect(mergeTailorDelta(base, delta).projects![0].bullets).toEqual(base.projects[0].bullets)
  })

  test('compact mode accepts no extra project bullets', () => {
    const delta = { experience: [], projects: [{ bullets: [...base.projects[0].bullets, 'An extra bullet'] }] }
    expect(mergeTailorDelta(base, delta, { exactBulletCounts: false }).projects![0].bullets).toEqual(base.projects[0].bullets)
  })

  test('trim mode cuts each entry to its budget, keeping the first-ranked bullets and any measured result', () => {
    const delta = { experience: [{ bullets: ['a', 'b', 'c', 'd'] }], projects: [{ bullets: ['p1', 'p2', 'p3'] }] }
    const merged = mergeTailorDelta(base, delta, { maxBullets: { experience: [2], projects: [1] } })
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
  }
  const raw = JSON.stringify({ summary: 'Reworded.', experience: [{ bullets: ['Built the billing service'] }] })

  test('keeps the order, extra sections included, and what was deleted', async () => {
    const resume = await assembleTailored(parsed, raw, { jobDescription: 'Engineer', previous })
    expect(resume.sectionOrder).toEqual(previous.sectionOrder)
    expect(resume.otherSections).toEqual(previous.otherSections)
    expect(resume.deletedSections).toEqual(previous.deletedSections)
    expect(resume.certifications).toBeUndefined()
  })

  test("the prompt never sees a deleted section's text", () => {
    const job = { title: 'Engineer', company: 'Acme', description: 'Engineer' } as Parameters<typeof buildPrompt>[0]
    const prompt = buildPrompt(job, parsed, false, undefined, false, true, previous)
    expect(prompt).toContain('REVISION MODE')
    expect(prompt).not.toContain('Deleted cert text')
    expect(prompt).not.toContain('deletedSections')
  })
})
