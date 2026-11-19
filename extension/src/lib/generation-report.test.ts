import { describe, expect, test } from 'vitest'
import { buildGenerationReport, resumeTexts, withResumeText, type ReportEnv, type ReportForm, type ReportTarget } from './generation-report'
import type { ParsedResume, TailoredResume } from '../types'

// The user's details come from their parsed resume (report-resume.ts reads it),
// so each test names the person through `parsed`.
const job = {
  title: 'Platform Engineer',
  company: 'Northwind',
  description: 'Run our Kubernetes fleet.',
  url: 'https://www.linkedin.com/jobs/view/4012345678/?trk=abc',
}

const parsed: ParsedResume = {
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  phone: '(416) 555-0199',
  website: 'janedoe.dev',
  links: ['janedoe.dev', 'linkedin.com/in/janedoe'],
  location: 'Toronto, ON',
  experience: [{ title: 'SRE', company: 'Acme', location: 'Toronto, ON', dates: '2019 - 2024', bullets: ['Ran 40 clusters'] }],
  education: [],
  otherSections: [{ heading: 'Awards', lines: ['MLH Hackathon 2023 First Place'] }, { heading: 'Personal Details', lines: ['Date of Birth: 12/04/1995'] }],
  sectionOrder: ['experience', 'education', 'other'],
}

const env = (over: Partial<ReportEnv> = {}): ReportEnv => ({ mode: 'byok', provider: 'openai', version: '1.9.0', parsed, ...over })
const form: ReportForm = { category: 'generic', comment: 'Sounds like a template', sendSource: false, contact: false }
const invented: ReportForm = { ...form, category: 'invented', sendSource: true }

const tailored: TailoredResume = {
  name: 'Jane Doe', phone: '(416) 555-0199', email: 'jane.doe@example.com', website: 'janedoe.dev',
  links: ['janedoe.dev'], location: 'Toronto, ON',
  summary: 'Platform engineer.',
  experience: [{ title: 'SRE', company: 'Acme', location: 'Toronto, ON', dates: '2019 - 2024', bullets: ['Ran 40 clusters'] }],
  education: [],
  atsScore: 72,
  atsGaps: ['Terraform'],
}

const letter = (output: string, e: ReportEnv = env()) => buildGenerationReport({ kind: 'letter', output, job }, form, e).output as string
const resume = (output: TailoredResume, e: ReportEnv = env()) => buildGenerationReport({ kind: 'resume', output, job }, form, e).output as Record<string, unknown>
const source = (e: ReportEnv, target: ReportTarget = { kind: 'letter', output: 'Hi', job }) => buildGenerationReport(target, invented, e).sourceResume


describe('buildGenerationReport', () => {
  test('a letter goes with its posting, site name only, mode, provider and version', () => {
    expect(buildGenerationReport({ kind: 'letter', output: 'Dear team,\n\nI ran 40 clusters.', job }, form, env())).toEqual({
      category: 'generic',
      comment: 'Sounds like a template',
      kind: 'letter',
      output: 'Dear team,\n\nI ran 40 clusters.',
      job: { title: 'Platform Engineer', company: 'Northwind', description: 'Run our Kubernetes fleet.', site: 'linkedin.com' },
      mode: 'byok',
      provider: 'openai',
      version: '1.9.0',
      contact: false,
    })
  })

  test('hosted reports say the provider is Claude; a pasted posting or one at an IP address has no site', () => {
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, form, env({ mode: 'hosted' }))).toMatchObject({ mode: 'hosted', provider: 'claude' })
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job: { ...job, url: '' } }, form, env()).job.site).toBe('')
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job: { ...job, url: 'http://10.0.0.1/jobs/1' } }, form, env()).job.site).toBe('')
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job: { ...job, url: 'https://careers_portal.example.com/1' } }, form, env()).job.site).toBe('')
  })

  test("a resume drops its contact fields, Word file hash and deleted sections, and keeps its score and gaps", () => {
    const out = resume({
      ...tailored, sourceHash: 'abc123', deletedSections: [{ key: 'summary', index: 0, summary: 'x' }],
      otherSections: [{ heading: 'Contact', lines: ['jane.doe@example.com'] }, { heading: 'References', lines: ['Sam Lee, 555-0100'] }, { heading: 'Awards', lines: ['Dean’s List'] }],
    })
    expect(out).toEqual({
      summary: 'Platform engineer.',
      experience: [{ title: 'SRE', company: 'Acme', location: '[location]', dates: '2019 - 2024', bullets: ['Ran 40 clusters'] }],
      education: [],
      atsScore: 72,
      atsGaps: ['Terraform'],
      // Other sections go scrubbed; the preview is where the rest comes out.
      otherSections: [{ heading: 'Contact', lines: ['[email]'] }, { heading: 'References', lines: ['Sam Lee, 555-0100'] }, { heading: 'Awards', lines: ['Dean’s List'] }],
    })
  })

  test("the original resume goes only for \"added things that aren't true\", ticked, as the parse without contact fields", () => {
    expect(source(env())).toEqual({
      experience: [{ title: 'SRE', company: 'Acme', location: '[location]', dates: '2019 - 2024', bullets: ['Ran 40 clusters'] }],
      education: [],
      otherSections: [{ heading: 'Awards', lines: ['MLH Hackathon 2023 First Place'] }, { heading: 'Personal Details', lines: ['Date of Birth: 12/04/1995'] }],
      sectionOrder: ['experience', 'education', 'other'],
    })
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, { ...invented, sendSource: false }, env()).sourceResume).toBeUndefined()
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, { ...form, sendSource: true }, env()).sourceResume).toBeUndefined()
  })

  describe('names', () => {
    test('the full name, short forms, each part alone, any case or spacing', () => {
      expect(letter('JANE DOE here. Jane  Doe there. Jane\nDoe. Jane wrote it. Ms. Doe agreed.')).toBe('[name] here. [name] there. [name]. [name] wrote it. Ms. [name] agreed.')
      const dr = env({ parsed: { ...parsed, name: 'Dr. Jane A. Doe' } })
      expect(letter('I ship.\n\nSincerely,\nJane Doe', dr)).toBe('I ship.\n\nSincerely,\n[name]')
      expect(letter('Jane Doe leads SRE.', dr)).toBe('[name] leads SRE.')
    })

    test('accents, particles, nicknames and an edited name in the reported resume', () => {
      expect(letter('José Núñez and Núñez.', env({ parsed: { ...parsed, name: 'José Núñez' } }))).toBe('[name] and [name].')
      expect(letter('Maria de la Cruz wrote.', env({ parsed: { ...parsed, name: 'Maria de la Cruz' } }))).toBe('[name] wrote.')
      expect(letter('Jon Smith and Jonathan.', env({ parsed: { ...parsed, name: 'Jonathan "Jon" Smith' } }))).toBe('[name] [name] and [name].')
      expect((resume({ ...tailored, name: 'Janet Doe', summary: 'Janet Doe ships.' })).summary).toBe('[name] ships.')
    })

    test('a common word that is also a first name stays in lower case', () => {
      expect(letter('Will Smith will help.', env({ parsed: { ...parsed, name: 'Will Smith' } }))).toBe('[name] will help.')
    })
  })

  describe('emails', () => {
    test('known, any address, and the account email', () => {
      expect(letter('Write to jane.doe@example.com or sam@acme.io.')).toBe('Write to [email] or [email].')
      expect(letter('Reach me at JDoe.Work@gmail.com.', env({ accountEmail: 'jdoe.work@gmail.com' }))).toBe('Reach me at [email].')
    })

    test("a name can't eat an email's first half and leave its domain", () => {
      expect(letter('Write to jane@janedoe.dev.')).toBe('Write to [email].')
    })
  })

  describe('links', () => {
    test("the user's links as written or bare, and any web address", () => {
      expect(letter('See janedoe.dev, https://janedoe.dev/, www.linkedin.com/in/janedoe, https://pixelforge.studio/work and www.example.org.'))
        .toBe('See [link], [link], [link], [link] and [link].')
      expect(letter('See “https://pixelforge.studio”.')).toBe('See “[link]”.')
    })

    test("the user's profile handle written alone", () => {
      expect(letter('My GitHub is janedoe; LinkedIn: janedoe.', env({ parsed: { ...parsed, links: ['https://github.com/janedoe'] } }))).toBe('My GitHub is [link]; LinkedIn: [link].')
    })

    test('tech names shaped like domains, and file names, stay', () => {
      const text = 'Built with Socket.io, fast.ai, Node.js, Next.js, ASP.NET and Vue.js; see README.md and main.py.'
      expect(letter(text)).toBe(text)
    })
  })

  describe('phones', () => {
    test("any country's format, and the known phone written another way", () => {
      expect(letter('Call 07700 900123, +44 7700 900123, 020 7946 0958, 0412 345 678, (02) 9876 5432, 06 12 34 56 78, 030 12345678, 0049 30 1234567, 98765 43210.'))
        .toBe('Call [phone], [phone], [phone], [phone], [phone], [phone], [phone], [phone], [phone].')
      expect(letter('Text 416.555.0199 or 555-0199 or 4165550199.')).toBe('Text [phone] or [phone] or [phone].')
    })

    test('years, dates, money, IDs and big numbers stay', () => {
      const text = 'From 2019 - 2024 2025 (2018–2020), on 12/04/1995, cut $25,000 in Q3 2023, Employee ID 10234, 1500000000 units, ISBN 978-0-13-468599-1.'
      expect(letter(text)).toBe(text)
    })
  })

  describe('location', () => {
    test("the user's whole location, and its city anywhere", () => {
      expect(letter("I'm a Toronto-based analyst in Toronto, ON, at Acme TORONTO.")).toBe("I'm a [location]-based analyst in [location], at Acme [location].")
      expect(letter('Based in Sydney NSW 2000.', env({ parsed: { ...parsed, location: 'Sydney NSW 2000' } }))).toBe('Based in [location].')
      expect(letter('I moved to Brooklyn.', env({ parsed: { ...parsed, location: 'Brooklyn NY 11201' } }))).toBe('I moved to [location].')
      expect(letter('Montréal or Montreal.', env({ parsed: { ...parsed, location: 'Montréal, QC' } }))).toBe('[location] or [location].')
      expect(letter('Remote work suits me.', env({ parsed: { ...parsed, location: 'Remote' } }))).toBe('Remote work suits me.')
    })
  })

  test("ordinary text stays: employers, titles, skills, years, money", () => {
    const text = 'Senior Data Analyst at Contoso Retail and Fabrikam, 2018 - 2024: Python, SQL, Socket.io, Next.js, React, UI design; cut $25,000 in Q3 2023.'
    expect(letter(text)).toBe(text)
    expect(source(env({ parsed: { ...parsed, experience: [{ title: 'Senior Data Analyst', company: 'Contoso Retail', location: 'Austin, TX', dates: 'Jan 2021 - Present', bullets: [text] }] } }))?.experience)
      .toEqual([{ title: 'Senior Data Analyst', company: 'Contoso Retail', location: 'Austin, TX', dates: 'Jan 2021 - Present', bullets: [text] }])
  })
})

describe('resume preview', () => {
  test('lists each text in resume order with where it sits, and writes an edit back without touching the rest', () => {
    const r = { atsGaps: ['SQL'], summary: 'Hi', experience: [{ bullets: ['a', 'b'], title: 'SRE' }], atsScore: 72, sectionOrder: ['experience'], editedAt: '2026-01-01' }
    expect(resumeTexts(r)).toEqual([
      { path: ['summary'], text: 'Hi' },
      { path: ['experience', 0, 'title'], text: 'SRE' },
      { path: ['experience', 0, 'bullets', 0], text: 'a' },
      { path: ['experience', 0, 'bullets', 1], text: 'b' },
      { path: ['atsGaps', 0], text: 'SQL' },
    ])
    const edited = withResumeText(r, ['experience', 0, 'bullets', 1], '')
    expect(edited.experience).toEqual([{ title: 'SRE', bullets: ['a', ''] }])
    expect(r.experience[0].bullets[1]).toBe('b')
  })
})
