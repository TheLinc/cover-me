import { afterEach, describe, expect, test, vi } from 'vitest'
import type { ParsedResume } from '../../types'
import { orderedSections } from '../pdf/sections'
import { isCurrentParse, parseParsedJson, parseResumeStructure, upgradedParse, withSectionOrder } from './resume-parse'

const RESUME = { name: 'A', email: 'a@x.co', experience: [], education: [{ institution: 'U of T' }] }
const json = JSON.stringify(RESUME)
const sse = (events: unknown[]) => new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n')

afterEach(() => vi.unstubAllGlobals())

describe('parseResumeStructure streams', () => {
  test('Claude: joins the text deltas', async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => sse([json.slice(0, 20), json.slice(20)].map((text) => ({ type: 'content_block_delta', delta: { type: 'text_delta', text } }))))
    vi.stubGlobal('fetch', fetch)
    expect(await parseResumeStructure('r', 'claude', 'k')).toEqual({ ...RESUME, otherSections: [], sectionOrder: [] })
    expect(JSON.parse(fetch.mock.calls[0]![1].body as string).stream).toBe(true)
  })
  test('OpenAI: joins the Chat Completions deltas', async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => sse([json.slice(0, 20), json.slice(20)].map((content) => ({ choices: [{ delta: { content } }] }))))
    vi.stubGlobal('fetch', fetch)
    expect(await parseResumeStructure('r', 'openai', 'k')).toEqual({ ...RESUME, otherSections: [], sectionOrder: [] })
    expect(JSON.parse(fetch.mock.calls[0]![1].body as string).stream).toBe(true)
  })
  test("OpenAI: a mid-stream error surfaces OpenAI's message", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([{ choices: [{ delta: { content: '{' } }] }, { error: { message: 'Server overloaded' } }])))
    await expect(parseResumeStructure('r', 'openai', 'k')).rejects.toThrow('Server overloaded')
  })
})

describe('parseParsedJson otherSections', () => {
  const parse = (otherSections: unknown) => parseParsedJson(JSON.stringify({ ...RESUME, otherSections })).otherSections

  test('keeps each heading and its lines verbatim, in order', () => {
    const sections = [
      { heading: 'PUBLICATIONS', lines: ['Adeyemi S. "CRISPR screening." J Cell Biol. 2023;41(2):112-120.'] },
      { heading: 'Volunteer Work', lines: ['Tutor, Boston Reads (2018 – 2019)', 'Taught reading to 6 children weekly'] },
    ]
    expect(parse(sections)).toEqual(sections)
  })

  test('is an empty array when the model leaves it out, so a parse always carries it', () => {
    expect(parseParsedJson(JSON.stringify(RESUME)).otherSections).toEqual([])
  })

  test('drops entries without a heading or any text lines', () => {
    expect(parse([{ heading: '', lines: ['x'] }, { heading: 'AWARDS', lines: [] }, { heading: 'AWARDS', lines: [3, ' ', "Dean's List"] }, 'LANGUAGES', null]))
      .toEqual([{ heading: 'AWARDS', lines: ["Dean's List"] }])
    expect(parse('PUBLICATIONS')).toEqual([])
  })
})

describe('parseParsedJson links', () => {
  const parse = (contact: object) => parseParsedJson(JSON.stringify({ ...RESUME, ...contact }))

  test('keeps every contact-line URL, and website as the first for builds that print only website', () => {
    const r = parse({ website: '', links: ['ada.dev', ' linkedin.com/in/ada ', 'github.com/ada', 3, ''] })
    expect(r.links).toEqual(['ada.dev', 'linkedin.com/in/ada', 'github.com/ada'])
    expect(r.website).toBe('ada.dev')
  })

  test('puts website first when the model left it out of links', () => {
    expect(parse({ website: 'ada.dev', links: ['linkedin.com/in/ada'] }).links).toEqual(['ada.dev', 'linkedin.com/in/ada'])
  })
})

describe('parseParsedJson sectionOrder', () => {
  const FULL = {
    ...RESUME,
    experience: [{ title: 'RN', company: 'General', location: '', dates: '', bullets: ['Triage'] }],
    skills: 'Epic',
    certifications: ['RN License'],
    otherSections: [{ heading: 'Volunteering', lines: ['Food bank'] }, { heading: 'Languages', lines: ['French'] }],
  }
  const parse = (sectionOrder: unknown) => parseParsedJson(JSON.stringify({ ...FULL, sectionOrder })).sectionOrder

  test("keeps the resume's order, extra sections in place, with the summary the tailor writes first", () => {
    expect(parse(['certifications', 'experience', 'other', 'education', 'skills', 'other']))
      .toEqual(['summary', 'certifications', 'experience', 'other', 'education', 'skills', 'other'])
  })

  test(`drops duplicate, unknown and missing-section keys, the model's own summary, and an "other" past the extra sections`, () => {
    expect(parse(['skills', 'skills', 'hobbies', 3, 'toString', 'projects', 'summary', 'other', 'other', 'other', 'experience']))
      .toEqual(['summary', 'skills', 'other', 'other', 'experience'])
  })

  test('is [] when nothing valid is left or the model leaves it out, so a parse always carries it', () => {
    expect(parse(['hobbies', 'projects'])).toEqual([])
    expect(parse('certifications')).toEqual([])
    expect(parseParsedJson(JSON.stringify(FULL)).sectionOrder).toEqual([])
  })

  test('a tailored resume built from a partial order still prints every section', () => {
    const parsed = withSectionOrder({ ...FULL, sectionOrder: ['skills', 'skills', 'other', 'other', 'other'] } as unknown as ParsedResume)
    const keys = orderedSections({ ...parsed, summary: 'Nurse.' }).map((s) => s.key)
    expect(keys.slice(0, 4)).toEqual(['summary', 'skills', 'other', 'other'])
    expect(new Set(keys)).toEqual(new Set(['summary', 'skills', 'other', 'experience', 'projects', 'education', 'certifications']))
  })
})

describe('isCurrentParse', () => {
  test('a stored parse from before extra sections or section order is parsed again; a new parse never is', () => {
    expect(isCurrentParse(undefined)).toBe(false)
    expect(isCurrentParse({ ...RESUME, otherSections: [] } as unknown as ParsedResume)).toBe(false)
    expect(isCurrentParse({ ...RESUME, sectionOrder: [] } as unknown as ParsedResume)).toBe(false)
    expect(isCurrentParse(parseParsedJson(json))).toBe(true)
  })
})

describe('upgradedParse', () => {
  const fresh = parseParsedJson(JSON.stringify({ ...RESUME, experience: [{ title: 'RN', company: 'General', location: '', dates: '', bullets: ['Triage', 'Charting'] }], sectionOrder: ['education', 'experience'] }))

  test('a parse with extra sections but no order keeps its own content and takes only the fresh order', () => {
    const cached = { ...RESUME, experience: [{ title: 'RN', company: 'General', location: '', dates: '', bullets: ['Triage and charting'] }], otherSections: [] } as unknown as ParsedResume
    const up = upgradedParse(cached, fresh)
    expect(up.experience).toEqual(cached.experience)
    expect(up.sectionOrder).toEqual(['summary', 'education', 'experience'])
    expect(isCurrentParse(up)).toBe(true)
  })

  test('a parse from before extra sections, or none, is replaced by the fresh one', () => {
    expect(upgradedParse({ ...RESUME } as unknown as ParsedResume, fresh)).toBe(fresh)
    expect(upgradedParse(undefined, fresh)).toBe(fresh)
  })
})
