import { describe, expect, test } from 'vitest'
import { capWarning, groupLocalHistory } from './history'

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

describe('capWarning', () => {
  const PRO = 'Pro saves all of them to your account, including the ones already here, and you can search them on your dashboard.'

  test('nothing until a list is within reach of its cap', () => {
    expect(capWarning(44, 16)).toBeNull()
    expect(capWarning(0, 0)).toBeNull()
  })

  test('letters near the cap', () => {
    expect(capWarning(46, 0)).toBe(`You've saved 46 of 50 letters in this browser. After 50, the oldest are removed to make room. ${PRO}`)
    expect(capWarning(45, 0)).not.toBeNull()
  })

  test('letters at the cap', () => {
    expect(capWarning(50, 3)).toBe(`This browser keeps your last 50 letters, so the oldest are now being removed. ${PRO}`)
  })

  test('tailored resumes near the cap', () => {
    expect(capWarning(10, 17)).toBe(`You've saved 17 of 20 tailored resumes in this browser. After 20, the oldest are removed to make room. ${PRO}`)
  })

  test('both near their caps', () => {
    expect(capWarning(46, 18)).toBe(`You've saved 46 of 50 letters and 18 of 20 tailored resumes in this browser. Past those limits, the oldest are removed to make room. ${PRO}`)
  })

  test('one at its cap, the other near', () => {
    expect(capWarning(50, 18)).toBe(`This browser keeps your last 50 letters, so the oldest are now being removed. You've also saved 18 of 20 tailored resumes in this browser. After 20, the oldest are removed to make room. ${PRO}`)
  })

  test('both at their caps', () => {
    expect(capWarning(50, 20)).toBe(`This browser keeps your last 50 letters and 20 tailored resumes, so the oldest are now being removed. ${PRO}`)
  })
})
