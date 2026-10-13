import { describe, expect, test } from 'vitest'
import { accountUpdates, capWarning, groupLocalHistory, uploadMessage, uploadSummary, withLocalOnly } from './history'

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

describe('accountUpdates', () => {
  const submitted = { letters: ['l1', 'l2', 'l3'], tailored: ['t1'] }

  test('a save: confirmed IDs are this account, failed ones are left alone, the rest belong to another account', () => {
    expect(accountUpdates(submitted, { letters: ['l1'], tailored: ['t1'], failed: ['l2'] }, 'me', false))
      .toEqual({ letters: { l1: 'me', l3: 'other' }, tailored: { t1: 'me' } })
  })

  test('a check only confirms', () => {
    expect(accountUpdates(submitted, { letters: ['l1'], tailored: [], failed: [] }, 'me', true))
      .toEqual({ letters: { l1: 'me' }, tailored: {} })
  })
})

describe('withLocalOnly', () => {
  const server = [{ key: 'app1', id: 'app1', title: 'A', company: 'Acme', url: 'https://jobs.example/a', latestAt: '2026-10-03T00:00:00Z', coverLetters: [], tailoredResumes: [] }]

  test('adds local-only entries in date order, tagged, and leaves out other accounts', () => {
    const groups = withLocalOnly(
      server,
      [
        { id: 'l1', job: job('https://jobs.example/1'), letter: 'x', createdAt: '2026-10-04T00:00:00Z' },
        { id: 'l2', job: job('https://jobs.example/2'), letter: 'x', createdAt: '2026-10-01T00:00:00Z' },
        { id: 'l3', job: job('https://jobs.example/3'), letter: 'x', createdAt: '2026-10-05T00:00:00Z', account: 'other' },
        { id: 'l4', job: job('https://jobs.example/4'), letter: 'x', createdAt: '2026-10-06T00:00:00Z', account: 'me' },
      ],
      [],
    )
    expect(groups.map((g) => [g.key, g.localOnly ?? false])).toEqual([
      ['local:https://jobs.example/1', true],
      ['app1', false],
      ['local:https://jobs.example/2', true],
    ])
  })
})

describe('uploadSummary', () => {
  test('counts applications, not entries: a letter and a resume for one job count once', () => {
    const letters = [
      { id: 'l1', job: job('https://jobs.example/1'), letter: 'x', createdAt: '2026-10-01T00:00:00Z' },
      { id: 'l2', job: job('https://jobs.example/2'), letter: 'x', createdAt: '2026-10-01T00:00:00Z' },
      { id: 'l3', job: job('https://jobs.example/3'), letter: 'x', createdAt: '2026-10-01T00:00:00Z' },
    ]
    const tailored = [{ id: 't1', job: job('https://jobs.example/1'), resume, createdAt: '2026-10-02T00:00:00Z' }]
    expect(uploadSummary(letters, tailored, { letters: ['l1'], tailored: ['t1'], failed: ['l2'] }))
      .toEqual({ saved: 1, other: 1, failed: 1 })
  })

  test('an application with any failed entry counts as failed', () => {
    const letters = [{ id: 'l1', job: job('https://jobs.example/1'), letter: 'x', createdAt: '2026-10-01T00:00:00Z' }]
    const tailored = [{ id: 't1', job: job('https://jobs.example/1'), resume, createdAt: '2026-10-02T00:00:00Z' }]
    expect(uploadSummary(letters, tailored, { letters: ['l1'], tailored: [], failed: ['t1'] }))
      .toEqual({ saved: 0, other: 0, failed: 1 })
  })
})

describe('uploadMessage', () => {
  test('all saved', () => {
    expect(uploadMessage({ saved: 40, other: 0, failed: 0 })).toBe('Saved 40 applications to your account.')
    expect(uploadMessage({ saved: 1, other: 0, failed: 0 })).toBe('Saved 1 application to your account.')
  })
  test('some already in another account', () => {
    expect(uploadMessage({ saved: 38, other: 2, failed: 0 }))
      .toBe('Saved 38 applications to your account. 2 were already saved to another account that used this browser, so they stay with it.')
    expect(uploadMessage({ saved: 3, other: 1, failed: 0 }))
      .toBe('Saved 3 applications to your account. 1 was already saved to another account that used this browser, so it stays with it.')
  })
  test('some failed', () => {
    expect(uploadMessage({ saved: 38, other: 0, failed: 2 })).toBe("Saved 38 applications. 2 couldn't be saved, try again.")
    expect(uploadMessage({ saved: 38, other: 1, failed: 2 }))
      .toBe("Saved 38 applications. 1 was already saved to another account that used this browser, so it stays with it. 2 couldn't be saved, try again.")
  })
})
