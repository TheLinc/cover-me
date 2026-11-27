import { describe, expect, test } from 'vitest'
import { accountUpdates, capWarning, groupLocalHistory, groupsFromApplications, ownPending, answerJobs, recentJobs, uploadMessage, uploadSummary, withLocalOnly } from './history'

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

  test("a letter keeps the resume it came from (#401)", () => {
    const source = { filename: 'Pat.pdf', uploadedAt: '2026-09-30T00:00:00Z', fileId: 'f' }
    const [g] = groupLocalHistory([{ id: 'l1', job: job('https://jobs.example/1'), letter: 'x', createdAt: '2026-10-01T00:00:00Z', source }], [])
    expect(g.coverLetters[0].source).toEqual(source)
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
        // Another Pro account's letter whose save failed: still that account's.
        { id: 'l5', job: job('https://jobs.example/5'), letter: 'x', createdAt: '2026-10-07T00:00:00Z', saveTo: 'you' },
      ],
      [],
      'me',
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

describe('groupsFromApplications', () => {
  // Same rule as local cards: the date is the newest thing made for the job,
  // so a card doesn't jump to an older date once it's saved.
  test('dates each application by its newest letter or resume', () => {
    const [g] = groupsFromApplications([{
      id: 'app1', title: 'A', company: 'Acme', url: 'https://jobs.example/a', createdAt: '2026-10-01T00:00:00Z',
      coverLetters: [{ id: 'l1', letter: 'x', createdAt: '2026-10-02T00:00:00Z' }],
      tailoredResumes: [{ id: 't1', resume, createdAt: '2026-10-05T00:00:00Z' }],
    }])
    expect(g).toMatchObject({ key: 'app1', id: 'app1', latestAt: '2026-10-05T00:00:00Z' })
  })

  test('lists the most recently active first', () => {
    const app = (id: string, createdAt: string, letterAt?: string) => ({
      id, title: id, company: 'Acme', url: '', createdAt, tailoredResumes: [],
      coverLetters: letterAt ? [{ id: `l-${id}`, letter: 'x', createdAt: letterAt }] : [],
    })
    // The server orders by when each application was made.
    const groups = groupsFromApplications([app('b', '2026-10-05T00:00:00+00:00'), app('a', '2026-10-01T00:00:00+00:00', '2026-10-10T00:00:00+00:00')])
    expect(groups.map((g) => g.id)).toEqual(['a', 'b'])
  })

  test('an application with nothing in it keeps its own date', () => {
    const [g] = groupsFromApplications([{ id: 'app1', title: 'A', company: 'Acme', url: '', createdAt: '2026-10-01T00:00:00Z', coverLetters: [], tailoredResumes: [] }])
    expect(g.latestAt).toBe('2026-10-01T00:00:00Z')
  })
})

describe('ownPending', () => {
  test("picks unsaved entries made while this account was Pro, nobody else's", () => {
    const l = (id: string, extra: object = {}) => ({ id, job: job(`https://jobs.example/${id}`), letter: 'x', createdAt: 'a', ...extra })
    const out = ownPending(
      [l('mine', { saveTo: 'me' }), l('saved', { saveTo: 'me', account: 'me' }), l('theirs', { saveTo: 'you' }), l('free-era')],
      [{ id: 't1', job: job('https://jobs.example/t'), resume, createdAt: 'a', saveTo: 'me' }],
      'me',
    )
    expect(out.letters.map((e) => e.id)).toEqual(['mine'])
    expect(out.tailored.map((e) => e.id)).toEqual(['t1'])
  })
})

describe('recentJobs', () => {
  const posting = (url: string, title = 'Engineer') => ({ title, company: 'Northwind', url, description: `Posting for ${title}` })

  test('lists saved jobs newest first, once each, from letters and resumes alike', () => {
    const jobs = recentJobs(
      [{ id: 'l1', job: posting('https://a', 'A'), letter: 'x', createdAt: '2026-10-01T00:00:00Z' }],
      [
        { id: 't1', job: posting('https://b', 'B'), resume, createdAt: '2026-10-03T00:00:00Z' },
        { id: 't2', job: posting('https://a', 'A'), resume, createdAt: '2026-10-02T00:00:00Z' },
      ],
    )
    expect(jobs.map((j) => j.title)).toEqual(['B', 'A'])
    expect(jobs[0].description).toBe('Posting for B')
  })

  test("skips jobs with no posting text and other accounts' entries, and keeps at most the limit", () => {
    const letters = Array.from({ length: 12 }, (_, i) => ({ id: `l${i}`, job: posting(`https://${i}`, `J${i}`), letter: 'x', createdAt: `2026-10-${String(10 + i)}T00:00:00Z` }))
    const jobs = recentJobs([
      ...letters,
      { id: 'blank', job: job('https://blank'), letter: 'x', createdAt: '2026-11-01T00:00:00Z' },
      { id: 'theirs', job: posting('https://theirs', 'Theirs'), letter: 'x', createdAt: '2026-11-02T00:00:00Z', account: 'other' },
      { id: 'b', job: posting('https://b', 'Account B'), letter: 'x', createdAt: '2026-11-03T00:00:00Z', account: 'user-b' },
      { id: 'pro', job: posting('https://pro', 'Saving to B'), letter: 'x', createdAt: '2026-11-04T00:00:00Z', saveTo: 'user-b' },
      { id: 'mine', job: posting('https://mine', 'Mine'), letter: 'x', createdAt: '2026-11-05T00:00:00Z', account: 'user-a' },
    ], [], 'user-a', 10)
    expect(jobs).toHaveLength(10)
    expect(jobs.map((j) => j.title).slice(0, 2)).toEqual(['Mine', 'J11'])
    expect(jobs.map((j) => j.title)).not.toEqual(expect.arrayContaining(['Theirs']))
    expect(jobs.map((j) => j.title).filter((t) => ['Theirs', 'Account B', 'Saving to B'].includes(t))).toEqual([])
  })
})

describe('answerJobs', () => {
  const posting = (url: string, title = 'Engineer', company = 'Northwind', description = `Posting for ${title}`) => ({ title, company, url, description })
  const saved = [posting('https://jobs.lever.co/northwind/123', 'Backend Engineer'), posting('https://b', 'Designer')]

  test("the page's job comes first, with saved jobs after it", () => {
    const page = posting('https://other/9', 'Analyst')
    const { jobs, jobSource } = answerJobs(page, saved)
    expect(jobs.map((j) => j.title)).toEqual(['Analyst', 'Backend Engineer', 'Designer'])
    expect(jobSource).toBe('page')
  })

  test('with no posting on the page, the latest saved job is used', () => {
    expect(answerJobs(null, saved)).toEqual({ jobs: saved, jobSource: 'saved' })
  })

  // Lever and Ashby put the form on its own page, which the scrapers can read
  // as a "posting" made of form text. The saved copy has the real posting.
  test("an application page matching a saved job uses the saved job's posting", () => {
    const form = posting('https://jobs.lever.co/northwind/123/apply', 'Backend Engineer', 'Northwind', 'Submit your application Resume/CV Full name')
    const { jobs, jobSource } = answerJobs(form, saved)
    expect(jobs[0].description).toBe('Posting for Backend Engineer')
    expect(jobs).toHaveLength(2)
    expect(jobSource).toBe('page')
  })

  // LinkedIn and Indeed tell jobs apart by the query alone.
  test('jobs whose links differ only in the query are different jobs', () => {
    const a = posting('https://www.linkedin.com/jobs/search/?currentJobId=111', 'Analyst A', 'Acme')
    const b = posting('https://www.linkedin.com/jobs/search/?currentJobId=222', 'Analyst B', 'Globex')
    expect(answerJobs(b, [a]).jobs.map((j) => j.title)).toEqual(['Analyst B', 'Analyst A'])
  })

  test('an application page with tracking in its query still finds its posting', () => {
    const form = posting('https://jobs.lever.co/northwind/123/apply?lever-origin=applied', 'Backend Eng', 'Northwind', 'form text')
    expect(answerJobs(form, saved).jobs[0].description).toBe('Posting for Backend Engineer')
  })

  test("two unknown companies' jobs with the same title aren't the same job", () => {
    const savedUnknown = [posting('https://a.example/1', 'Software Engineer', 'Unknown Company')]
    const page = posting('https://b.example/2', 'Software Engineer', 'Unknown Company', 'Another posting')
    expect(answerJobs(page, savedUnknown).jobs[0].description).toBe('Another posting')
  })

  test("a posting page doesn't take another posting's place for sharing its title and company", () => {
    const page = posting('https://careers.northwind.com/jobs/2', 'Designer', 'Northwind', 'The ED posting')
    expect(answerJobs(page, saved).jobs.map((j) => j.description)).toEqual(['The ED posting', 'Posting for Backend Engineer', 'Posting for Designer'])
  })

  test('the same title and company count as the same job on an application page', () => {
    const page = posting('https://careers.northwind.com/apply?id=1', 'designer', 'NORTHWIND', 'form text')
    expect(answerJobs(page, saved).jobs[0]).toBe(saved[1])
  })
})
