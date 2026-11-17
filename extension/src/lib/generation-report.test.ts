import { describe, expect, test } from 'vitest'
import { buildGenerationReport, type ReportEnv } from './generation-report'
import type { ParsedResume, TailoredResume } from '../types'

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
}

const resumeText = 'Jane Doe\nToronto, ON · (416) 555-0199 · jane.doe@example.com · linkedin.com/in/janedoe\n\nSRE, Acme, 2019 - 2024\nRan 40 clusters'

const env = (over: Partial<ReportEnv> = {}): ReportEnv => ({
  mode: 'byok',
  provider: 'openai',
  version: '1.9.0',
  resume: { text: resumeText, filename: 'jane.pdf', updatedAt: '2026-11-01T00:00:00Z', parsed },
  ...over,
})

const letter = 'Dear Northwind team,\n\nI ran 40 clusters at Acme.\n\nReach me at jane.doe@example.com or (416) 555-0199.\n\nSincerely,\nJANE DOE'

const tailored: TailoredResume = {
  name: 'Jane Doe', phone: '(416) 555-0199', email: 'jane.doe@example.com', website: 'janedoe.dev',
  links: ['janedoe.dev'], location: 'Toronto, ON',
  summary: 'Platform engineer.',
  experience: parsed.experience,
  education: [],
  atsScore: 72,
  atsGaps: ['Terraform'],
}

const form = { category: 'generic' as const, comment: 'Sounds like a template', sendSource: false, contact: false }

describe('buildGenerationReport', () => {
  test('a letter goes with its posting, site name only, and the name, email and phone replaced', () => {
    const report = buildGenerationReport({ kind: 'letter', output: letter, job }, form, env())
    expect(report).toEqual({
      category: 'generic',
      comment: 'Sounds like a template',
      kind: 'letter',
      output: 'Dear Northwind team,\n\nI ran 40 clusters at Acme.\n\nReach me at [email] or [phone].\n\nSincerely,\n[name]',
      job: { title: 'Platform Engineer', company: 'Northwind', description: 'Run our Kubernetes fleet.', site: 'linkedin.com' },
      mode: 'byok',
      provider: 'openai',
      version: '1.9.0',
      contact: false,
    })
  })

  test('a resume drops its contact fields and keeps its score and gaps', () => {
    const report = buildGenerationReport({ kind: 'resume', output: tailored, job }, form, env())
    expect(report.output).toEqual({ summary: 'Platform engineer.', experience: parsed.experience, education: [], atsScore: 72, atsGaps: ['Terraform'] })
  })

  test("a resume's own lines are scrubbed too", () => {
    const named = { ...tailored, summary: 'Jane Doe runs platforms.', otherSections: [{ heading: 'References', lines: ['Ask jane.doe@example.com'] }] }
    const out = buildGenerationReport({ kind: 'resume', output: named, job }, form, env()).output as TailoredResume
    expect(out.summary).toBe('[name] runs platforms.')
    expect(out.otherSections).toEqual([{ heading: 'References', lines: ['Ask [email]'] }])
  })

  test('hosted reports say the provider is Claude', () => {
    const report = buildGenerationReport({ kind: 'letter', output: letter, job }, form, env({ mode: 'hosted', provider: 'openai' }))
    expect(report).toMatchObject({ mode: 'hosted', provider: 'claude' })
  })

  test('the original resume goes only for "added things that aren\'t true", ticked, with contact details replaced', () => {
    const invented = { ...form, category: 'invented' as const, sendSource: true }
    expect(buildGenerationReport({ kind: 'letter', output: letter, job }, invented, env()).sourceResume)
      .toBe('[name]\n[location] · [phone] · [email] · [link]\n\nSRE, Acme, 2019 - 2024\nRan 40 clusters')
    expect(buildGenerationReport({ kind: 'letter', output: letter, job }, { ...invented, sendSource: false }, env()).sourceResume).toBeUndefined()
    expect(buildGenerationReport({ kind: 'letter', output: letter, job }, { ...form, sendSource: true }, env()).sourceResume).toBeUndefined()
  })

  test("without a parse in this browser (Hosted), finds the details in the resume text and the tailored resume", () => {
    const hosted = env({ mode: 'hosted', resume: { text: resumeText, filename: 'jane.pdf', updatedAt: '' } })
    expect(buildGenerationReport({ kind: 'letter', output: letter, job }, form, hosted).output)
      .toBe('Dear Northwind team,\n\nI ran 40 clusters at Acme.\n\nReach me at [email] or [phone].\n\nSincerely,\n[name]')
    const source = buildGenerationReport({ kind: 'resume', output: tailored, job }, { ...form, category: 'invented', sendSource: true }, hosted).sourceResume
    expect(source).toBe('[name]\n[location] · [phone] · [email] · [link]\n\nSRE, Acme, 2019 - 2024\nRan 40 clusters')
  })

  test("a one-line header still gives up the name, and History's newest resume the links and location", () => {
    const header = { text: 'Jane Doe | jane@x.com | 07700 900123\nSRE, Acme', filename: '', updatedAt: '' }
    expect(buildGenerationReport({ kind: 'letter', output: 'Thanks,\nJane Doe', job }, form, env({ resume: header })).output).toBe('Thanks,\n[name]')
    const withHistory = env({ resume: { ...header, text: 'Jane Doe\nToronto, ON · 07700 900123 · jane@x.com · janedoe.dev' }, tailored: { ...tailored, phone: '07700 900123' } })
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, { ...form, category: 'invented', sendSource: true }, withHistory).sourceResume)
      .toBe('[name]\n[location] · [phone] · [email] · [link]')
    // Wherever they sit, not only near the top.
    const later = env({ resume: { ...header, text: `SRE, Acme\n${'x'.repeat(400)}\nJane Doe · Toronto, ON · 07700 900123 · janedoe.dev` }, tailored: { ...tailored, phone: '07700 900123' } })
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, { ...form, category: 'invented', sendSource: true }, later).sourceResume)
      .toBe(`SRE, Acme\n${'x'.repeat(400)}\n[name] · [location] · [phone] · [link]`)
  })

  test("an emptied name, or another person's newest History resume, doesn't hide the resume's own first line", () => {
    const hosted = env({ resume: { text: 'Jane Doe\nSRE, Acme', filename: '', updatedAt: '' }, tailored: { ...tailored, name: 'Sam Lee' } })
    expect(buildGenerationReport({ kind: 'resume', output: { ...tailored, name: '', summary: 'Jane Doe, SRE.' }, job }, form, hosted).output)
      .toMatchObject({ summary: '[name], SRE.' })
    expect(buildGenerationReport({ kind: 'letter', output: 'Thanks,\nJane Doe', job }, form, hosted).output).toBe('Thanks,\n[name]')
  })

  test("a PDF's run-together first lines still give up the name, and names match whole words only", () => {
    const pdf = (text: string) => env({ resume: { text, filename: 'r.pdf', updatedAt: '' } })
    const sign = 'Thanks,\nJane Doe'
    expect(buildGenerationReport({ kind: 'letter', output: sign, job }, form, pdf('Jane Doe Toronto, ON · (416) 555-0199 · jane@x.com Experience')).output).toBe('Thanks,\n[name]')
    expect(buildGenerationReport({ kind: 'letter', output: sign, job }, form, pdf('Jane Doe jane@x.com (416) 555-0199 Experience')).output).toBe('Thanks,\n[name]')
    expect(buildGenerationReport({ kind: 'letter', output: 'Al Ng ran nginx.', job }, form, pdf('Al Ng\nnginx')).output).toBe('[name] ran nginx.')
    expect(buildGenerationReport({ kind: 'letter', output: 'Resume Writer', job }, form, pdf('RESUME\nJane Doe')).output).toBe('Resume Writer')
    expect(buildGenerationReport({ kind: 'letter', output: 'Best,\nMaria de la Cruz', job }, form, pdf('Maria de la Cruz Madrid, Spain')).output).toBe('Best,\n[name]')
  })

  test('a sign-off without the middle initial or title, and a sidebar before the name, still match', () => {
    const sign = 'Sincerely,\nJane Doe'
    expect(buildGenerationReport({ kind: 'letter', output: sign, job }, form, env({ resume: { ...env().resume!, parsed: { ...parsed, name: 'Jane A. Doe' } } })).output).toBe('Sincerely,\n[name]')
    const text = (t: string) => env({ resume: { text: t, filename: '', updatedAt: '' } })
    expect(buildGenerationReport({ kind: 'letter', output: sign, job }, form, text('Dr. Jane Doe\nToronto')).output).toBe('Sincerely,\n[name]')
    expect(buildGenerationReport({ kind: 'letter', output: `As a software engineer, I ship.\n\n${sign}`, job }, form, text('Contact\nToronto, ON\nJane Doe\nSoftware Engineer')).output)
      .toBe('As a software engineer, I ship.\n\nSincerely,\n[name]')
  })

  test("a letter's sign-off name is taken out whatever the resume's first lines are, and in the original resume too", () => {
    const text = (t: string) => env({ resume: { text: t, filename: '', updatedAt: '' } })
    for (const t of ['Contact\nNew York, NY\nJane Doe', 'CONTACT INFORMATION\nJane Doe', 'Profile Summary\nJane Doe']) {
      expect(buildGenerationReport({ kind: 'letter', output: 'I ship.\n\nBest regards,\nJane Doe', job }, form, text(t)).output).toBe('I ship.\n\nBest regards,\n[name]')
    }
    const invented = { ...form, category: 'invented' as const, sendSource: true }
    expect(buildGenerationReport({ kind: 'letter', output: 'Sincerely,\nJane Doe', job }, invented, text('Profile Summary\nJane Doe')).sourceResume).toBe('[name]\n[name]') // the heading too: see headNames
  })

  test('a link the resume writes with https:// is caught when the letter leaves that off', () => {
    const withScheme = env({ resume: { ...env().resume!, parsed: { ...parsed, website: 'https://janedoe.dev/', links: ['https://janedoe.dev/'] } } })
    expect(buildGenerationReport({ kind: 'letter', output: 'See my work at janedoe.dev.', job }, form, withScheme).output).toBe('See my work at [link].')
  })

  test('a name spaced or stacked differently in the resume text is still taken out', () => {
    const invented = { ...form, category: 'invented' as const, sendSource: true }
    const withText = (text: string) => env({ resume: { ...env().resume!, text } })
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, invented, withText('JANE\nDOE\nSoftware Engineer')).sourceResume).toBe('[name]\nSoftware Engineer')
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, invented, withText('Jane  Doe\nSRE')).sourceResume).toBe('[name]\nSRE')
  })

  test("a street address and postal code in the original resume are replaced", () => {
    const text = 'Jane Doe\n123 Maple Street, Toronto, ON M5V 2T6 · (416) 555-0199 · jane@x.com\nSRE, Acme'
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, { ...form, category: 'invented', sendSource: true }, env({ resume: { ...env().resume!, text } })).sourceResume)
      .toBe('[name]\n[address], [location] [postal code] · [phone] · [email]\nSRE, Acme')
  })

  test('a long closing still marks the line after it as the name', () => {
    const noName = env({ resume: { text: 'Contact\nToronto, ON\n416-555-0199', filename: '', updatedAt: '' } })
    expect(buildGenerationReport({ kind: 'letter', output: 'Thank you for your time and consideration,\nJane Doe', job }, form, noName).output)
      .toBe('Thank you for your time and consideration,\n[name]')
  })

  test("without a parse or History, a bare portfolio domain in the resume's header is taken out too", () => {
    const filler = `Data scientist at Northwind Analytics, ${'building churn models for retail clients. '.repeat(9)}`
    const text = `Jane Doe\nToronto, ON · jane.doe@example.com · janedoe.dev · linkedin.com/in/janedoe\n${filler}\nSkills: Node.js, ASP.NET\nWrote about churn models at janedoe.dev/blog`
    const hosted = env({ mode: 'hosted', resume: { text, filename: '', updatedAt: '' } })
    expect(buildGenerationReport({ kind: 'letter', output: 'See my work at janedoe.dev, built with Node.js and ASP.NET.', job }, form, hosted).output)
      .toBe('See my work at [link], built with Node.js and ASP.NET.')
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, { ...form, category: 'invented', sendSource: true }, hosted).sourceResume)
      .toBe(`[name]\n[location] · [email] · [link] · [link]\n${filler}\nSkills: Node.js, ASP.NET\nWrote about churn models at [link]`)
  })

  test('only contact lines give up domains, in any case; a skills line and a known link leave the rest alone', () => {
    const letter = 'I built a chat service on socket.io. See JaneDoe.com and dev.to/janedoe.'
    const hosted = (text: string) => env({ mode: 'hosted', resume: { text, filename: '', updatedAt: '' } })
    expect(buildGenerationReport({ kind: 'letter', output: letter, job }, form, hosted('Jane Doe | JaneDoe.com | dev.to/janedoe | (416) 555-0199\nSkills: React, socket.io')).output)
      .toBe('I built a chat service on socket.io. See [link] and [link].')
  })

  test('a domain holding the name is taken in any layout; one after a label or beside an email goes with and without its path', () => {
    const hosted = (text: string) => env({ mode: 'hosted', resume: { text, filename: '', updatedAt: '' } })
    const sent = (text: string, letter: string) => buildGenerationReport({ kind: 'letter', output: letter, job }, form, hosted(text)).output
    // Word puts each paragraph on its own line; janedoe.dev holds the name.
    expect(sent('Jane Doe\n\nToronto, ON\n\njane@x.com\n\njanedoe.dev\n\nSummary', 'See janedoe.dev.')).toBe('See [link].')
    // A label, with or without a colon.
    expect(sent('Jane Doe\nPortfolio pixelforge.studio', 'See pixelforge.studio.')).toBe('See [link].')
    expect(sent('Jane Doe\nHomepage: pixelforge.studio', 'See pixelforge.studio.')).toBe('See [link].')
    // Beside an email, with a path: the bare domain goes too.
    expect(sent('Jane Doe\njane@x.com | pixelforge.studio/work', 'See pixelforge.studio.')).toBe('See [link].')
    // Accents, and a handle in the path.
    expect(sent('José Núñez\nToronto', 'See josenunez.dev and behance.net/josenunez.')).toBe('See [link] and [link].')
  })

  test("skills, an em-dash summary, a sidebar and an employer line near the top aren't taken for the user's domains", () => {
    const text = 'Jane Doe\nFull-stack engineer — real-time apps with Socket.io and fast.ai\n• Socket.io, fast.ai, Vercel.app\nShopify.com | Engineer | 2020–2024\nSocket.io\nfast.ai'
    const letter = 'At Shopify.com I built Socket.io apps on fast.ai and Vercel.app.'
    expect(buildGenerationReport({ kind: 'letter', output: letter, job }, form, env({ mode: 'hosted', resume: { text, filename: '', updatedAt: '' } })).output).toBe(letter)
  })

  test('name domains with any ending, in a resume report too; a labelled https link; platforms stay; a short name run together', () => {
    const hosted = (text: string) => env({ mode: 'hosted', resume: { text, filename: '', updatedAt: '' } })
    const sent = (text: string, letter: string) => buildGenerationReport({ kind: 'letter', output: letter, job }, form, hosted(text)).output
    expect(sent('Jane Doe\nToronto', 'See janedoe.space and janedoe.framer.website.')).toBe('See [link] and [link].')
    expect(sent('Jane Doe\nPortfolio: https://pixelforge.studio', 'See pixelforge.studio.')).toBe('See [link].')
    // A GitHub profile on the contact line goes; github.com elsewhere stays.
    expect(sent('Jane Doe\njane@x.com | github.com/jdoe', 'See github.com/jdoe. I use github.com daily.')).toBe('See [link]. I use github.com daily.')
    expect(sent('Yu Li\nToronto', 'See yuli.dev.')).toBe('See [link].')
    // A resume report searches the tailored resume's own lines for the name.
    const out = buildGenerationReport({ kind: 'resume', output: { ...tailored, summary: 'Writes at janedoe.blog.' }, job }, form, env({ resume: null })).output as TailoredResume
    expect(out.summary).toBe('Writes at [link].')
  })

  test("the original resume keeps its summary and jobs; a link in the first job is replaced where it is", () => {
    const text = 'Jane Doe\nToronto, ON | (416) 555-0199 | jane.doe@example.com | janedoe.dev\n\nSUMMARY\nAnalyst who ships models.\n\nEXPERIENCE\nData Analyst, Contoso Retail\n- Write about churn models at janedoe.dev/blog'
    const invented = { ...form, category: 'invented' as const, sendSource: true }
    const hosted = env({ mode: 'hosted', resume: { text, filename: '', updatedAt: '' } })
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, invented, hosted).sourceResume)
      .toBe('[name]\n[location] | [phone] | [email] | [link]\n\nSUMMARY\nAnalyst who ships models.\n\nEXPERIENCE\nData Analyst, Contoso Retail\n- Write about churn models at [link]')
    // A PDF's run-together text, with Title Case headings.
    const pdf = env({ mode: 'hosted', resume: { text: text.replace(/\n+/g, ' ').replace('SUMMARY', 'Summary').replace('EXPERIENCE', 'Experience'), filename: '', updatedAt: '' } })
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, invented, pdf).sourceResume)
      .toBe('[location] | [phone] | [email] | [link] Summary Analyst who ships models. Experience Data Analyst, Contoso Retail - Write about churn models at [link]')
  })

  test("a job title and section stay while the address beside the contact details goes; a platform subdomain is the user's", () => {
    const invented = { ...form, category: 'invented' as const, sendSource: true }
    const text = 'Jane Doe\nEducation Consultant\n123 Maple Street, Toronto, ON M5V 2T6 · (416) 555-0199 · jane@x.com\n\nEXPERIENCE\nAdvisor, Contoso'
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, invented, env({ mode: 'hosted', resume: { text, filename: '', updatedAt: '' } })).sourceResume)
      .toBe('[name]\nEducation Consultant\n[address], [location] [postal code] · [phone] · [email]\n\nEXPERIENCE\nAdvisor, Contoso')
    const sub = env({ mode: 'hosted', resume: { text: 'Jane Doe\njane@x.com | pixelforge.substack.com/p/intro', filename: '', updatedAt: '' } })
    expect(buildGenerationReport({ kind: 'letter', output: 'Read pixelforge.substack.com.', job }, form, sub).output).toBe('Read [link].')
  })

  test('a summary above the contact block stays; an address under its own heading goes; a line break in a resume field hides no name domain', () => {
    const invented = { ...form, category: 'invented' as const, sendSource: true }
    const hosted = (text: string) => env({ mode: 'hosted', resume: { text, filename: '', updatedAt: '' } })
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, invented, hosted('Jane Doe\nData Analyst\nPROFILE\nAnalyst who ships models.\nCONTACT\n(416) 555-0199\njane@x.com\n\nEXPERIENCE\nAdvisor')).sourceResume)
      .toBe('[name]\nData Analyst\nPROFILE\nAnalyst who ships models.\nCONTACT\n[phone]\n[email]\n\nEXPERIENCE\nAdvisor')
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, invented, hosted('Jane Doe\njane@x.com\nSKILLS\nPython, SQL\nADDRESS\n123 Maple Street, Toronto M5V 2T6\n(416) 555-0199')).sourceResume)
      .toBe('[name]\n[email]\nSKILLS\nPython, SQL\nADDRESS\n[address], Toronto [postal code]\n[phone]')
    const out = buildGenerationReport({ kind: 'resume', output: { ...tailored, summary: 'Analyst.\njanedoe.blog' }, job }, form, env({ resume: null })).output as TailoredResume
    expect(out.summary).toBe('Analyst.\n[link]')
  })

  test('a name run together backwards, a Behance profile beside a bare behance.net, and curly quotes', () => {
    const hosted = (text: string) => env({ mode: 'hosted', resume: { text, filename: '', updatedAt: '' } })
    const sent = (text: string, letter: string) => buildGenerationReport({ kind: 'letter', output: letter, job }, form, hosted(text)).output
    expect(sent('Yu Li\nToronto', 'See liyu.dev.')).toBe('See [link].')
    expect(sent('Jane Doe\njane@x.com | behance.net/jdoe', 'I post on behance.net.')).toBe('I post on behance.net.')
    expect(sent('Jane Doe\nToronto', 'See “https://pixelforge.studio”.')).toBe('See “[link]”.')
  })

  test("a name can't eat an email's first half and leave its domain", () => {
    const pdf = env({ resume: { text: 'Jane Doe jane@janedoe.dev (416) 555-0199 Experience', filename: '', updatedAt: '' } })
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, { ...form, category: 'invented', sendSource: true }, pdf).sourceResume)
      .toBe('[name] [email] [phone] Experience')
    expect(buildGenerationReport({ kind: 'letter', output: 'Write to jane@janedoe.dev.\n\nBest,\nJane', job }, form, pdf).output)
      .toBe('Write to [email].\n\nBest,\n[name]')
  })

  test("the user's own links go from a letter and from a resume's lines", () => {
    expect(buildGenerationReport({ kind: 'letter', output: 'My work is at janedoe.dev and https://github.com/janedoe/forms.', job }, form, env()).output)
      .toBe('My work is at [link] and [link].')
    const out = buildGenerationReport({ kind: 'resume', output: { ...tailored, projects: [{ name: 'forms (linkedin.com/in/janedoe)', bullets: ['See janedoe.dev/forms'] }] }, job }, form, env()).output as TailoredResume
    expect(out.projects).toEqual([{ name: 'forms ([link])', bullets: ['See [link]'] }])
  })

  test("a resume report leaves out its Word file's hash, and an underscore host sends no site", () => {
    const report = buildGenerationReport({ kind: 'resume', output: { ...tailored, sourceHash: 'abc123' }, job: { ...job, url: 'https://careers_portal.example.com/1' } }, form, env())
    expect(report.output).not.toHaveProperty('sourceHash')
    expect(report.job.site).toBe('')
  })

  test("a date range isn't taken for a phone number", () => {
    const hosted = env({ resume: { text: 'Sam Lee\nsam@example.com\nAcme, 2019 - 2024 2025', filename: '', updatedAt: '' } })
    const source = buildGenerationReport({ kind: 'letter', output: 'Hi', job }, { ...form, category: 'invented', sendSource: true }, hosted).sourceResume
    expect(source).toBe('[name]\n[email]\nAcme, 2019 - 2024 2025')
  })

  test('a pasted posting, or one at an IP address, has no site', () => {
    expect(buildGenerationReport({ kind: 'letter', output: letter, job: { ...job, url: '' } }, form, env()).job.site).toBe('')
    expect(buildGenerationReport({ kind: 'letter', output: letter, job: { ...job, url: 'http://10.0.0.1/jobs/1' } }, form, env()).job.site).toBe('')
  })
})
