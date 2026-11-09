import { describe, expect, test } from 'vitest'
import { mergeTailorDelta, parseDelta } from './resume-tailor'

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

  // #171: Regenerate starts from the version the user saw, which may have a
  // bullet they added or deleted in the editor.
  describe('regenerating', () => {
    const added = { experience: [{ bullets: [...base.experience[0].bullets, 'Run the robotics club'] }], projects: [{ bullets: ['Built a grading script'] }] }

    test("counts against the previous version's bullets", () => {
      const five = { experience: [{ bullets: ['a', 'b', 'c', 'd', 'e'] }], projects: [{ bullets: ['p'] }] }
      const out = mergeTailorDelta(base, five, { exactBulletCounts: true, previous: added })
      expect(out.experience[0].bullets).toEqual(['a', 'b', 'c', 'd', 'e'])
      expect(out.projects![0].bullets).toEqual(['p'])
    })

    test("a count that doesn't fit keeps the previous version's bullets, not the upload's", () => {
      const out = mergeTailorDelta(base, { experience: [{ bullets: ['a', 'b', 'c', 'd'] }] }, { exactBulletCounts: true, previous: added })
      expect(out.experience[0].bullets).toEqual(added.experience[0].bullets)
      expect(out.projects![0].bullets).toEqual(added.projects[0].bullets)
    })

    test('a previous version without usable bullets for a role falls back to the upload', () => {
      const out = mergeTailorDelta(base, merged3, { exactBulletCounts: true, previous: { experience: [{ bullets: 'oops' }] } })
      expect(out.experience[0].bullets).toEqual(base.experience[0].bullets)
    })
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
