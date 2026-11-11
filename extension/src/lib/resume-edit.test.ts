import { afterEach, describe, expect, test, vi } from 'vitest'
import { editedResume, remainingGaps, saveResumeEdit, shownSections, withSections } from './resume-edit'
import { getTailoredHistory } from './storage'
import type { TailoredResume } from '../types'

const resume: TailoredResume = {
  name: 'Pat Lee', phone: '', email: 'pat@example.com', website: '',
  summary: 'Backend engineer.',
  experience: [{ title: 'Engineer', company: 'Northwind', location: 'Remote', dates: '2022 - now', bullets: ['Built the billing service'] }],
  projects: [{ name: 'Ledger', bullets: ['Wrote a CLI'] }],
  education: [{ institution: 'State U', degree: 'BSc', location: '', dates: '2018', bullets: [] }],
  skills: 'TypeScript, Postgres',
  certifications: ['AWS SAA'],
  otherSections: [{ heading: 'Talks', lines: ['Spoke at a meetup'] }],
  atsScore: 72,
  atsGaps: ['Kafka', 'Go', 'Terraform'],
}

describe('gap chips after an edit', () => {
  test('a gap goes once its keyword appears anywhere in the edited text, in any case', () => {
    const edited = {
      ...resume,
      skills: 'TypeScript, Postgres, kafka',
      otherSections: [{ heading: 'Talks', lines: ['Terraform at scale'] }],
    }
    expect(remainingGaps(resume.atsGaps, edited)).toEqual(['Go'])
  })

  test('the location and every link count, as printed on the contact line', () => {
    const edited = { ...resume, location: 'Toronto, ON', links: ['pat.dev', 'github.com/patlee/terraform-demo'] }
    expect(remainingGaps(['Toronto', 'Terraform', 'Kafka'], edited)).toEqual(['Kafka'])
  })

  test('a keyword only inside another word does not clear it', () => {
    expect(remainingGaps(['Go'], { ...resume, summary: 'Ex-Google engineer.' })).toEqual(['Go'])
  })

  test('keywords with symbols match as written', () => {
    const edited = { ...resume, skills: 'C++, Node.js and CI/CD' }
    expect(remainingGaps(['C++', 'node.js', 'CI/CD', 'C#'], edited)).toEqual(['C#'])
  })

  test('no gaps stays no gaps', () => {
    expect(remainingGaps(undefined, resume)).toEqual([])
  })
})

function fakeLocal(data: Record<string, unknown> = {}) {
  vi.stubGlobal('chrome', { storage: { local: {
    get: async (k: string) => (k in data ? { [k]: data[k] } : {}),
    set: async (o: Record<string, unknown>) => { Object.assign(data, o) },
  } } })
  return data
}
const job = { title: 'Engineer', company: 'Northwind', url: 'https://jobs.example/1', description: 'x' }

afterEach(() => vi.unstubAllGlobals())

describe('saving an edit', () => {
  const now = new Date('2026-11-05T10:00:00Z')

  test('keeps the score, clears typed gaps and marks it edited', () => {
    const draft = { ...resume, skills: 'TypeScript, Go', atsScore: 99, atsGaps: [] }
    expect(editedResume(resume, draft, now)).toEqual({
      ...resume,
      skills: 'TypeScript, Go',
      atsGaps: ['Kafka', 'Terraform'],
      atsGapsBeforeEdits: ['Kafka', 'Go', 'Terraform'],
      editedAt: '2026-11-05T10:00:00.000Z',
    })
  })

  test('editing again measures gaps against the score, so a deleted keyword brings its gap back', () => {
    const first = editedResume(resume, { ...resume, skills: 'Go, Kafka' }, now)
    expect(first.atsGaps).toEqual(['Terraform'])
    const second = editedResume(first, { ...first, skills: 'Kafka' }, now)
    expect(second.atsGaps).toEqual(['Go', 'Terraform'])
  })

  test('overwrites that entry in local History and nothing else', async () => {
    fakeLocal({ tailoredHistory: [
      { id: 'a', job, resume, createdAt: '2026-10-01T00:00:00Z', account: 'u1' },
      { id: 'b', job, resume, createdAt: '2026-10-02T00:00:00Z' },
    ] })
    const saved = editedResume(resume, { ...resume, name: 'P. Lee' }, now)
    await saveResumeEdit('a', saved)
    const [a, b] = await getTailoredHistory()
    expect(a).toEqual({ id: 'a', job, resume: saved, createdAt: '2026-10-01T00:00:00Z', account: 'u1' })
    expect(b.resume).toBe(resume)
  })

  test('an entry not in this browser is left alone', async () => {
    const data = fakeLocal({ tailoredHistory: [] })
    await saveResumeEdit('gone', editedResume(resume, resume, now))
    expect(data.tailoredHistory).toEqual([])
  })
})

describe('moving and deleting sections', () => {
  test('the editor lists the sections the resume has, in print order', () => {
    expect(shownSections(resume)).toEqual([
      { key: 'summary' }, { key: 'skills' }, { key: 'experience' }, { key: 'projects' },
      { key: 'other', index: 0 }, { key: 'education' }, { key: 'certifications' },
    ])
  })

  test('a new order is saved, and extra sections move with their "other" place', () => {
    const two = { ...resume, otherSections: [{ heading: 'Talks', lines: ['x'] }, { heading: 'Awards', lines: ['y'] }] }
    const [summary, skills, experience, , talks, awards] = shownSections(two)
    const moved = withSections(two, [awards, skills, summary, experience, talks])
    expect(moved.sectionOrder).toEqual(['other', 'skills', 'summary', 'experience', 'other'])
    expect(moved.otherSections!.map((s) => s.heading)).toEqual(['Awards', 'Talks'])
    expect(shownSections(moved)).toEqual([{ key: 'other', index: 0 }, { key: 'skills' }, { key: 'summary' }, { key: 'experience' }, { key: 'other', index: 1 }])
  })

  test('a section left out of the list is deleted', () => {
    const kept = shownSections(resume).filter((s) => s.key === 'experience' || s.key === 'education')
    const r = withSections(resume, kept)
    expect(r.summary).toBeUndefined()
    expect(r.projects).toBeUndefined()
    expect(r.certifications).toBeUndefined()
    expect(r.skills).toBeUndefined()
    expect(r.otherSections).toEqual([])
    expect(r.experience).toEqual(resume.experience)
    expect(shownSections(r)).toEqual([{ key: 'experience' }, { key: 'education' }])
  })

  test('deleting experience or education empties it', () => {
    const r = withSections(resume, shownSections(resume).filter((s) => s.key !== 'experience' && s.key !== 'education'))
    expect(r.experience).toEqual([])
    expect(r.education).toEqual([])
  })
})
