import { describe, expect, test } from 'vitest'
import { groupLocalHistory } from './history'

const job = (url: string, company = 'Northwind', title = 'Engineer') => ({ title, company, url, description: '' })
const resume = { name: 'Pat', phone: '', email: '', website: '', experience: [], education: [] }

describe('groupLocalHistory', () => {
  test('a letter and a resume for the same posting share one group', () => {
    const groups = groupLocalHistory(
      [{ id: 'l1', job: job('https://jobs.example/1'), letter: 'Dear…', createdAt: '2026-10-01T00:00:00Z' }],
      [{ id: 't1', job: job('https://jobs.example/1'), resume, createdAt: '2026-10-02T00:00:00Z' }],
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].coverLetters.map((c) => c.id)).toEqual(['l1'])
    expect(groups[0].tailoredResumes.map((t) => t.id)).toEqual(['t1'])
    expect(groups[0].latestAt).toBe('2026-10-02T00:00:00Z')
    expect(groups[0].localCoverLetterIds).toEqual(['l1'])
    expect(groups[0].localTailoredIds).toEqual(['t1'])
  })

  test('with no URL, company and title decide the group', () => {
    const groups = groupLocalHistory(
      [{ id: 'l1', job: job(''), letter: 'x', createdAt: '2026-10-01T00:00:00Z' }],
      [{ id: 't1', job: job(''), resume, createdAt: '2026-10-01T00:00:00Z' }, { id: 't2', job: job('', 'Other'), resume, createdAt: '2026-10-01T00:00:00Z' }],
    )
    expect(groups).toHaveLength(2)
  })

  test('re-tailors stay under one job, newest first, and groups sort by latest activity', () => {
    const groups = groupLocalHistory([], [
      { id: 'old', job: job('https://a'), resume, createdAt: '2026-10-01T00:00:00Z' },
      { id: 'new', job: job('https://a'), resume, createdAt: '2026-10-03T00:00:00Z' },
      { id: 'b', job: job('https://b'), resume, createdAt: '2026-10-02T00:00:00Z' },
    ])
    expect(groups.map((g) => g.url)).toEqual(['https://a', 'https://b'])
    expect(groups[0].tailoredResumes.map((t) => t.id)).toEqual(['new', 'old'])
  })
})
