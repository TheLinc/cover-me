import { afterEach, describe, expect, test, vi } from 'vitest'
import type { ParsedResume } from '../../types'
import { orderedSections } from '../pdf/sections'
import { isCurrentParse, parseParsedJson, parseResumeStructure, upgradedParse, withChosenOrder, withLinks, withSectionOrder } from './resume-parse'
import { checkParse, checkParseUrls, resumeUrls } from '../../../eval/checks'
import type { EvalCase } from '../../../eval/fixtures'

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

describe('the section order comes from the resume text', () => {
  const job = (title: string, company: string, bullets: string[]) => ({ title, company, location: '', dates: '', bullets })
  const school = { institution: 'University of Michigan', degree: 'B.S. in Statistics', location: '', dates: '', bullets: [] }
  // The model's order in each: its JSON's order, not the resume's, as it gave in the live check.
  const parse = (text: string, fields: object) => parseParsedJson(JSON.stringify({ name: 'P', email: '', phone: '', website: '', ...fields }), text).sectionOrder

  test('skills first, ahead of a profile that names a skill', () => {
    const text = `Pat Lee\npat@x.co\n\nPERSONAL PROFILE\nFinance assistant fluent in Excel.\n\nKEY SKILLS\n- Excel\n- Sage 50\n- Purchase ledger\n\nEMPLOYMENT HISTORY\nAccounts Assistant — Hale & Co, Leeds (2021 – Present)\n- Reconciled 300 supplier statements a month in Sage 50\n\nEDUCATION\nB.S. in Statistics — University of Michigan (2017 – 2021)`
    expect(parse(text, {
      experience: [job('Accounts Assistant', 'Hale & Co', ['Reconciled 300 supplier statements a month in Sage 50'])],
      education: [school], skills: 'Excel, Sage 50, Purchase ledger', otherSections: [],
      sectionOrder: ['experience', 'education', 'skills'],
    })).toEqual(['summary', 'skills', 'experience', 'education'])
  })

  test('education first, an extra section last, and a bullet the text wraps', () => {
    const text = `EDUCATION\nB.S. in Statistics — University of Michigan (2021 – 2025)\n\nPROJECTS\nRideshare Demand Forecast\n- Built a Python model forecasting hourly ride demand from 2M trip records,\ncutting error 18% versus a seasonal baseline\n\nSKILLS\nPython, pandas, SQL\n\nEXPERIENCE\nData Intern — Meridian Health Partners (2024)\n- Automated an Excel report in Python, saving the team 4 hours a week\n\nAWARDS\nMichigan Data Challenge, 2nd place (2024)`
    expect(parse(text, {
      experience: [job('Data Intern', 'Meridian Health Partners', ['Automated an Excel report in Python, saving the team 4 hours a week'])],
      projects: [{ name: 'Rideshare Demand Forecast', bullets: ['Built a Python model forecasting hourly ride demand from 2M trip records, cutting error 18% versus a seasonal baseline'] }],
      education: [school], skills: 'Python, pandas, SQL',
      otherSections: [{ heading: 'AWARDS', lines: ['Michigan Data Challenge, 2nd place (2024)'] }],
      sectionOrder: ['education', 'other', 'experience', 'projects', 'skills'],
    })).toEqual(['summary', 'education', 'projects', 'skills', 'experience', 'other'])
  })

  test('extra sections between standard ones stay where they sat', () => {
    const text = `EXPERIENCE\nProgram Coordinator — Brightpath Youth Alliance (2021 – Present)\n- Recruited and trained 25 volunteer tutors\n\nVOLUNTEERING\nBoard Member — Oakland Community Garden Collective\n\nEDUCATION\nB.S. in Statistics — University of Michigan\n\nAWARDS & HONORS\nBrightpath Staff Excellence Award (2023)\n\nSKILLS\nSalesforce, grant reporting\n\nCERTIFICATIONS\nNonprofit Management Certificate — UC Berkeley Extension (2022)`
    expect(parse(text, {
      experience: [job('Program Coordinator', 'Brightpath Youth Alliance', ['Recruited and trained 25 volunteer tutors'])],
      education: [school], skills: 'Salesforce, grant reporting',
      certifications: ['Nonprofit Management Certificate — UC Berkeley Extension (2022)'],
      otherSections: [{ heading: 'VOLUNTEERING', lines: ['Board Member — Oakland Community Garden Collective'] }, { heading: 'AWARDS & HONORS', lines: ['Brightpath Staff Excellence Award (2023)'] }],
      sectionOrder: ['experience', 'other', 'other', 'education', 'skills', 'certifications'],
    })).toEqual(['summary', 'experience', 'other', 'education', 'other', 'skills', 'certifications'])
  })

  test("a section the text doesn't hold keeps the model's order", () => {
    const fields = { experience: [job('RN', 'General', ['Triage'])], education: [school], skills: 'Epic', otherSections: [], sectionOrder: ['skills', 'experience', 'education'] }
    expect(parse('EXPERIENCE\nRN — General\n- Triage\n\nEDUCATION\nB.S. in Statistics — University of Michigan', fields)).toEqual(['summary', 'skills', 'experience', 'education'])
    expect(parseParsedJson(JSON.stringify({ name: 'P', email: '', phone: '', website: '', ...fields })).sectionOrder).toEqual(['summary', 'skills', 'experience', 'education'])
  })
})

// #197: "Use this order for future resumes?" in the editor.
describe('withChosenOrder', () => {
  const job = { title: 'RN', company: 'General', location: '', dates: '', bullets: ['Triage'] }
  const school = { institution: 'U of T', degree: 'BScN', location: '', dates: '', bullets: [] }
  const parsed = {
    name: 'P', email: '', phone: '', website: '', experience: [job], education: [school], skills: 'Epic',
    otherSections: [{ heading: 'Talks', lines: ['x'] }, { heading: 'Awards', lines: ['y'] }],
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'other', 'other'],
  } as ParsedResume
  const headings = (p: ParsedResume) => p.otherSections!.map((s) => s.heading)

  test('takes the order, summary and extra sections included', () => {
    const next = withChosenOrder(parsed, ['other', 'skills', 'summary', 'experience', 'education', 'other'], ['Awards', 'Talks'])
    expect(next.sectionOrder).toEqual(['other', 'skills', 'summary', 'experience', 'education', 'other'])
    expect(headings(next)).toEqual(['Awards', 'Talks'])
    expect(next.experience).toEqual(parsed.experience)
  })

  test('the summary keeps its place among the sections the parse has', () => {
    // An emptied certifications list shows in the editor, but the parse has none.
    expect(withChosenOrder(parsed, ['certifications', 'summary', 'experience', 'education', 'skills', 'other', 'other'], []).sectionOrder)
      .toEqual(['summary', 'experience', 'education', 'skills', 'other', 'other'])
    expect(withChosenOrder(parsed, ['experience', 'projects', 'summary', 'education', 'skills', 'other', 'other'], []).sectionOrder)
      .toEqual(['experience', 'summary', 'education', 'skills', 'other', 'other'])
  })

  test('an extra section renamed in the editor is matched by its place', () => {
    const next = withChosenOrder(parsed, ['summary', 'other', 'experience', 'education', 'skills', 'other'], ['Awards', 'My talks'])
    expect(headings(next)).toEqual(['Awards', 'Talks'])
  })

  test('a section the order leaves out keeps its place, and one the parse lacks is dropped', () => {
    const next = withChosenOrder(parsed, ['summary', 'skills', 'experience', 'projects', 'other', 'other'], ['Talks', 'Awards'])
    expect(next.sectionOrder).toEqual(['summary', 'skills', 'education', 'experience', 'other', 'other'])
    expect(isCurrentParse(next)).toBe(true)
  })

  test('junk leaves the parse in a valid order', () => {
    const next = withChosenOrder(parsed, 'nope', 42)
    expect(next.sectionOrder).toEqual(parsed.sectionOrder)
    expect(headings(next)).toEqual(['Talks', 'Awards'])
  })
})

// A made-up resume with a link in every section (#236), and a parse that put
// the project's URL on the contact line as well as under its project.
const LINKED_TEXT = `Ada Lovelace
ada@acme.dev | 555-0100 | https://ada.dev | linkedin.com/in/ada
Engineer who ships tools.

EXPERIENCE
Software Engineer, Acme Corp — 2021 – Present
Built the billing service, live at acme.com/billing

PROJECTS
Cover Me (https://github.com/ada/cover-me)
Built a resume tailoring tool

EDUCATION
BSc Computer Science, University of Toronto — 2017 – 2021
Thesis code at github.com/ada/thesis

VOLUNTEERING
Mentor, Code Club (codeclub.org/mentors)`

const LINKED_PARSE = {
  name: 'Ada Lovelace',
  email: 'ada@acme.dev',
  phone: '555-0100',
  website: 'https://ada.dev',
  links: ['https://ada.dev', 'linkedin.com/in/ada', 'https://github.com/ada/cover-me'],
  experience: [{ title: 'Software Engineer', company: 'Acme Corp', location: '', dates: '2021 – Present', bullets: ['Built the billing service, live at acme.com/billing'] }],
  projects: [{ name: 'Cover Me (https://github.com/ada/cover-me)', bullets: ['Built a resume tailoring tool'] }],
  education: [{ institution: 'University of Toronto', degree: 'BSc Computer Science', location: '', dates: '2017 – 2021', bullets: ['Thesis code at github.com/ada/thesis'] }],
  otherSections: [{ heading: 'VOLUNTEERING', lines: ['Mentor, Code Club (codeclub.org/mentors)'] }],
} as unknown as ParsedResume

// The backend copy reads Deno.env when loaded; its path is built at runtime so
// tsc, which doesn't cover backend/, doesn't follow it.
const backendParse = '../../../../backend/supabase/functions/_shared/resume-parse.ts'
describe.each([
  ['extension', async () => (await import('./resume-parse')).withLinks],
  ['backend', async () => {
    vi.stubGlobal('Deno', { env: { get: () => undefined } })
    return ((await import(/* @vite-ignore */ backendParse)) as typeof import('./resume-parse')).withLinks
  }],
])('%s withLinks keeps the contact line to the contact block (#236)', (_copy, load) => {
  test("drops a project's URL found only under its project, and keeps the contact URLs", async () => {
    const r = (await load())(LINKED_PARSE, LINKED_TEXT)
    expect(r.links).toEqual(['https://ada.dev', 'linkedin.com/in/ada'])
    expect(r.website).toBe('https://ada.dev')
  })

  test('drops website too when it is a section URL', async () => {
    const r = (await load())({ ...LINKED_PARSE, website: 'https://github.com/ada/cover-me', links: ['https://github.com/ada/cover-me'] }, LINKED_TEXT)
    expect(r.links ?? []).toEqual([])
    expect(r.website).toBe('')
  })

  test('keeps a profile URL a sidebar puts after the first section', async () => {
    const text = `Ada Lovelace\nEXPERIENCE\nSoftware Engineer, Acme Corp\nBuilt the billing service, live at acme.com/billing\nCONTACT\nada@acme.dev\nlinkedin.com/in/ada\ngithub.com/ada/`
    const r = (await load())({ ...LINKED_PARSE, website: '', links: ['linkedin.com/in/ada', 'github.com/ada/'] }, text)
    expect(r.links).toEqual(['linkedin.com/in/ada', 'github.com/ada/'])
  })

  test('a company in the email domain or a job title in a tagline does not end the contact block', async () => {
    const text = `Ada Lovelace — Software Engineer\nada@acmecorp.com | ada.dev\n${LINKED_TEXT.split('\n').slice(3).join('\n')}`
    const r = (await load())({ ...LINKED_PARSE, email: 'ada@acmecorp.com', website: '', links: ['ada.dev'], experience: [{ ...LINKED_PARSE.experience[0]!, company: 'AcmeCorp' }] }, text)
    expect(r.links).toEqual(['ada.dev'])
  })

  test("a header naming a skill, a licence or the employer doesn't end the contact block", async () => {
    const text = `Ruby Chen, CISSP\nSenior Engineer at Shopify\nruby@mail.com | ruby.dev\n\nEXPERIENCE\nSenior Engineer, Shopify\nBuilt checkout at shopify.com/checkout\n\nSKILLS\nRuby, React\n\nCERTIFICATIONS\nCISSP`
    const r = (await load())({
      ...LINKED_PARSE, email: 'ruby@mail.com', website: '', links: ['ruby.dev'], projects: [], education: [], otherSections: [],
      experience: [{ title: 'Senior Engineer', company: 'Shopify', location: '', dates: '', bullets: ['Built checkout at shopify.com/checkout'] }],
      skills: 'Ruby, React', certifications: ['CISSP'],
    }, text)
    expect(r.links).toEqual(['ruby.dev'])
  })

  test('a short entry inside a contact URL ("Git" in github.com) costs no link', async () => {
    const text = `Ada Lovelace\nada@mail.com | 555-0100 | github.com/ada | ada.dev\n\nTOOLS\nGit\nDocker`
    const r = (await load())({ ...LINKED_PARSE, email: 'ada@mail.com', website: '', links: ['github.com/ada', 'ada.dev'], experience: [], projects: [], education: [], otherSections: [{ heading: 'TOOLS', lines: ['Git', 'Docker'] }] }, text)
    expect(r.links).toEqual(['github.com/ada', 'ada.dev'])
  })

  test("keeps a section URL the parse has nowhere else, so it isn't lost", async () => {
    const r = (await load())({ ...LINKED_PARSE, projects: [{ name: 'Cover Me', bullets: ['Built a resume tailoring tool'] }] }, LINKED_TEXT)
    expect(r.links).toEqual(LINKED_PARSE.links)
  })
})

describe('the URL check (#236)', () => {
  test('lists every URL in the resume text, and not emails or file names', () => {
    expect(resumeUrls(`${LINKED_TEXT}\nNode.js, résumé.pdf, ada.lovelace.dev@mail.com, www.ada.dev/blog.`)).toEqual([
      'https://ada.dev', 'linkedin.com/in/ada', 'acme.com/billing', 'https://github.com/ada/cover-me', 'github.com/ada/thesis', 'codeclub.org/mentors', 'www.ada.dev/blog',
    ])
  })

  test('passes on a parse that keeps every URL, with only contact URLs on the contact line', () => {
    expect(checkParseUrls(withLinks(LINKED_PARSE, LINKED_TEXT), LINKED_TEXT)).toEqual([])
  })

  test("reports a URL on the contact line that the parse also gives a section, whatever withLinks made of it", () => {
    const text = LINKED_TEXT.replace(' (https://github.com/ada/cover-me)', '')
    expect(checkParseUrls(LINKED_PARSE, text)).toEqual(['section URL on the contact line: "https://github.com/ada/cover-me"'])
  })

  test('reports a section URL the model moved from its entry to the contact line', () => {
    const parsed = { ...LINKED_PARSE, projects: [{ name: 'Cover Me', bullets: ['Built a resume tailoring tool'] }] }
    expect(checkParseUrls(parsed, LINKED_TEXT)).toEqual(['section URL on the contact line: "https://github.com/ada/cover-me"'])
  })

  test('checkParse reports a URL missing from the parse, and a section URL on the contact line', () => {
    const parsed = { ...LINKED_PARSE, education: [{ ...LINKED_PARSE.education[0]!, bullets: ['Thesis code'] }] }
    const { failures } = checkParse(parsed, { resumeText: LINKED_TEXT, parsed } as unknown as EvalCase)
    expect(failures).toEqual([
      'URL missing from the parse: "github.com/ada/thesis"',
      'section URL on the contact line: "https://github.com/ada/cover-me"',
    ])
  })
})
