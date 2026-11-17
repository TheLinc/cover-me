import { afterEach, describe, expect, test, vi } from 'vitest'
import { chosenOrder, editedResume, openResumeEditor, postingTitleInSummary, remainingGaps, restoreSection, returnToTab, saveResumeEdit, shownSections, withSections } from './resume-edit'
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

describe("the note on a summary that uses the posting's title (#244)", () => {
  const fullStack = (summary: string): TailoredResume => ({
    ...resume, summary, experience: [{ ...resume.experience[0], title: 'Full Stack Developer' }],
  })

  test('shows when the summary opens with a title none of the jobs carry', () => {
    expect(postingTitleInSummary(fullStack('Software Engineer who builds web applications.'), 'Software Engineer')).toEqual({ title: 'Software Engineer', shorter: false })
  })

  test('matches the title without its level or a scraped suffix', () => {
    expect(postingTitleInSummary(fullStack('Software Engineer who builds web applications.'), 'Senior Software Engineer, Payments (Remote)')).toEqual({ title: 'Software Engineer', shorter: false })
  })

  test("not when the summary keeps the user's own title", () => {
    expect(postingTitleInSummary(fullStack('Full Stack Developer who builds web applications.'), 'Software Engineer')).toBeUndefined()
  })

  test("not when one of the user's jobs already has that title, with or without a level", () => {
    const r = { ...fullStack('Software Engineer who builds web applications.'), experience: [{ ...resume.experience[0], title: 'Senior Software Engineer' }] }
    expect(postingTitleInSummary(r, 'Software Engineer')).toBeUndefined()
  })

  test('goes once the title is edited out of the summary', () => {
    expect(postingTitleInSummary(fullStack('Developer who builds web applications.'), 'Software Engineer')).toBeUndefined()
  })

  test('not for a one-word posting title, which may be any word in the summary', () => {
    expect(postingTitleInSummary(fullStack('Full Stack Developer who works with every designer.'), 'Designer')).toBeUndefined()
  })

  test('not once the experience section is deleted, with no job titles left to compare', () => {
    expect(postingTitleInSummary({ ...fullStack('Software Engineer who builds web applications.'), experience: [] }, 'Software Engineer')).toBeUndefined()
  })

  test("shows a shorter form of the posting's title, flagged as shorter (#253)", () => {
    expect(postingTitleInSummary(fullStack('Software Engineer building full-stack applications.'), 'Software Development Engineer')).toEqual({ title: 'Software Engineer', shorter: true })
  })

  test('a shorter form may skip any words but the last, after levels are dropped', () => {
    expect(postingTitleInSummary(fullStack('Data Engineer who builds pipelines.'), 'Senior Data Platform Engineer')).toEqual({ title: 'Data Engineer', shorter: true })
  })

  test("no shorter form when one of the user's jobs has it", () => {
    const r = { ...fullStack('Software Engineer building full-stack applications.'), experience: [{ ...resume.experience[0], title: 'Software Engineer II' }] }
    expect(postingTitleInSummary(r, 'Software Development Engineer')).toBeUndefined()
  })

  test("one word of the posting's title never counts as a shorter form", () => {
    expect(postingTitleInSummary(fullStack('Engineer building full-stack applications.'), 'Software Development Engineer')).toBeUndefined()
  })

  test('not for a posting with no title', () => {
    expect(postingTitleInSummary(fullStack('Developer who builds web applications.'), '')).toBeUndefined()
  })
})

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
      { key: 'summary' }, { key: 'experience' }, { key: 'projects' }, { key: 'education' },
      { key: 'certifications' }, { key: 'skills' }, { key: 'other', index: 0 },
    ])
  })

  test('a new order is saved, and extra sections move with their "other" place', () => {
    const two = { ...resume, otherSections: [{ heading: 'Talks', lines: ['x'] }, { heading: 'Awards', lines: ['y'] }] }
    const [summary, experience, , , , skills, talks, awards] = shownSections(two)
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

describe('restoring a deleted section', () => {
  const titled = (r: TailoredResume) => shownSections(r).map((s) => (s.key === 'other' ? r.otherSections![s.index].heading : s.key))
  const without = (r: TailoredResume, key: string) => withSections(r, shownSections(r).filter((s) => (s.key === 'other' ? r.otherSections![s.index].heading : s.key) !== key))

  test.each(['summary', 'experience', 'projects', 'education', 'certifications', 'skills', 'Talks'])('%s comes back with its text, in its place', (key) => {
    const deleted = without(resume, key)
    expect(titled(deleted)).not.toContain(key)
    expect(deleted.deletedSections).toHaveLength(1)
    const back = restoreSection(deleted, 0)
    expect(titled(back)).toEqual(titled(resume))
    expect(back.deletedSections).toEqual([])
    const { sectionOrder: _o, deletedSections: _d, ...content } = back
    expect(content).toEqual(resume)
  })

  test('an extra section between two others goes back between them', () => {
    const three = { ...resume, otherSections: [{ heading: 'Talks', lines: ['x'] }, { heading: 'Volunteering', lines: ['Food bank'] }, { heading: 'Awards', lines: ['y'] }] }
    const back = restoreSection(without(three, 'Volunteering'), 0)
    expect(back.otherSections).toEqual(three.otherSections)
    expect(titled(back)).toEqual(titled(three))
  })

  test('two deleted sections go back in their places, restored in either order', () => {
    const deleteBoth = (first: string, second: string) => without(without(resume, first), second)
    for (const [first, second] of [['education', 'certifications'], ['certifications', 'education']]) {
      const both = deleteBoth(first, second)
      expect(titled(restoreSection(restoreSection(both, 0), 0))).toEqual(titled(resume))
      expect(titled(restoreSection(restoreSection(both, 1), 0))).toEqual(titled(resume))
    }
  })

  test('with three deleted from the top, the oldest still goes back near the top', () => {
    const three = without(without(without(resume, 'experience'), 'summary'), 'projects')
    expect(titled(restoreSection(three, 0))[0]).toBe('experience')
  })

  test('moving sections leaves nothing to restore', () => {
    const [summary, experience, ...rest] = shownSections(resume)
    expect(withSections(resume, [experience, summary, ...rest]).deletedSections).toBeUndefined()
  })

  test('a stored place past the end of the list clamps to the end', () => {
    const deleted = without(resume, 'summary')
    const back = restoreSection({ ...deleted, deletedSections: [{ ...deleted.deletedSections![0], index: 99 }] }, 0)
    expect(titled(back).slice(-1)[0]).toBe('summary')
    expect(back.summary).toBe(resume.summary)
  })

  test('a deleted section prints nowhere', () => {
    const deleted = without(resume, 'certifications')
    expect(deleted.certifications).toBeUndefined()
    expect(titled(deleted)).not.toContain('certifications')
  })
})

describe('the order saved for future resumes', () => {
  test('is the shown order, with deleted sections back in their places', () => {
    const two = { ...resume, otherSections: [{ heading: 'Talks', lines: ['x'] }, { heading: 'Awards', lines: ['y'] }] }
    const [summary, experience, , education, certifications, skills, talks, awards] = shownSections(two)
    const deleted = withSections(two, [summary, experience, education, certifications, skills, talks, awards])
    const [s, e, ed, c, sk, t, a] = shownSections(deleted)
    const moved = withSections(deleted, [s, e, ed, c, sk, a, t])
    expect(chosenOrder(moved)).toEqual({
      sectionOrder: ['summary', 'experience', 'projects', 'education', 'certifications', 'skills', 'other', 'other'],
      headings: ['Awards', 'Talks'],
    })
  })
})

describe('the editor tab returns to the job tab (#223)', () => {
  function fakeTabs(active: { id?: number; index: number; windowId: number } | undefined) {
    const chrome = {
      runtime: { getURL: (p: string) => `chrome-extension://id/${p}` },
      tabs: {
        query: vi.fn(async () => (active ? [active] : [])),
        create: vi.fn(async () => ({})),
        update: vi.fn(async (id: number) => ({ id, windowId: 7 })),
      },
      windows: { update: vi.fn(async () => ({})) },
      action: { openPopup: vi.fn(async () => {}) },
    }
    vi.stubGlobal('chrome', chrome)
    return chrome
  }

  test('the editor opens next to the job tab and remembers it', async () => {
    const chrome = fakeTabs({ id: 42, index: 3, windowId: 7 })
    await openResumeEditor('a b')
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://id/src/editor/index.html?id=a%20b&from=42', openerTabId: 42, index: 4,
    })
  })

  test('with no active tab it opens as before', async () => {
    const chrome = fakeTabs(undefined)
    await openResumeEditor('x')
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'chrome-extension://id/src/editor/index.html?id=x' })
  })

  test('Done makes the job tab active and opens the popup in its window', async () => {
    const chrome = fakeTabs(undefined)
    await returnToTab(42)
    expect(chrome.tabs.update).toHaveBeenCalledWith(42, { active: true })
    expect(chrome.windows.update).toHaveBeenCalledWith(7, { focused: true })
    expect(chrome.action.openPopup).toHaveBeenCalledWith({ windowId: 7 })
  })

  test('a closed job tab or an old Chrome never throws', async () => {
    const chrome = fakeTabs(undefined)
    chrome.tabs.update.mockRejectedValueOnce(new Error('No tab with id: 42'))
    await expect(returnToTab(42)).resolves.toBeUndefined()
    expect(chrome.action.openPopup).not.toHaveBeenCalled()
    chrome.action.openPopup.mockRejectedValueOnce(new Error('not available'))
    await expect(returnToTab(42)).resolves.toBeUndefined()
  })
})
