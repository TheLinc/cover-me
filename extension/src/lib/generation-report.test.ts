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
  })

  test("an emptied name, or another person's newest History resume, doesn't hide the resume's own first line", () => {
    const hosted = env({ resume: { text: 'Jane Doe\nSRE, Acme', filename: '', updatedAt: '' }, tailored: { ...tailored, name: 'Sam Lee' } })
    expect(buildGenerationReport({ kind: 'resume', output: { ...tailored, name: '', summary: 'Jane Doe, SRE.' }, job }, form, hosted).output)
      .toMatchObject({ summary: '[name], SRE.' })
    expect(buildGenerationReport({ kind: 'letter', output: 'Thanks,\nJane Doe', job }, form, hosted).output).toBe('Thanks,\n[name]')
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
