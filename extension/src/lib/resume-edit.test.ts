import { afterEach, describe, expect, test, vi } from 'vitest'
import { editedResume, remainingGaps, saveResumeEdit } from './resume-edit'
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
