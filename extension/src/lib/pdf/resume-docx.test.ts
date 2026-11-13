import mammoth from 'mammoth'
import { describe, expect, it } from 'vitest'
import { buildResumeDocx } from './resume-docx'
import type { TailoredResume } from './types'

const resume: TailoredResume = {
  name: 'Ada Lovelace',
  phone: '555-0100',
  email: 'ada@example.com',
  website: 'ada.dev',
  summary: 'Engineer who ships.',
  experience: [{
    title: 'Senior Engineer', company: 'Analytical Co', location: 'London', dates: '2020 – Present',
    bullets: ['Built the engine', 'Led a team of 4'],
  }],
  projects: [{ name: 'Note G', bullets: ['First published algorithm'] }],
  education: [{ institution: 'Home', degree: 'Mathematics', location: 'London', dates: '1830', bullets: [] }],
  skills: 'TypeScript, Postgres',
  certifications: ['AWS SAA'],
  otherSections: [{ heading: 'Publications', lines: ['Sketch of the Analytical Engine'] }],
}

// Read the file back with an independent .docx reader, as Word or Docs would.
async function read(r: TailoredResume) {
  const buffer = Buffer.from(await (await buildResumeDocx(r)).arrayBuffer())
  return (await mammoth.convertToHtml({ buffer })).value
}

describe('buildResumeDocx', () => {
  it('writes section titles as headings and bullets as a real list', async () => {
    const html = await read(resume)
    for (const h of ['SUMMARY', 'EXPERIENCE', 'PROJECTS', 'EDUCATION', 'CERTIFICATIONS', 'SKILLS', 'PUBLICATIONS']) {
      expect(html).toContain(`<h1>${h}</h1>`)
    }
    expect(html).toContain('<li>Built the engine</li><li>Led a team of 4</li>')
    expect(html).toContain('<li>AWS SAA</li>')
    expect(html).toContain('<li>Sketch of the Analytical Engine</li>')
  })

  it('prints the sections in the order set in the editor, leaving out deleted ones', async () => {
    const html = await read({ ...resume, summary: undefined, sectionOrder: ['other', 'skills', 'experience', 'projects', 'education', 'certifications'] })
    const headings = [...html.matchAll(/<h1>([^<]+)<\/h1>/g)].map((m) => m[1])
    expect(headings).toEqual(['PUBLICATIONS', 'SKILLS', 'EXPERIENCE', 'PROJECTS', 'EDUCATION', 'CERTIFICATIONS'])
  })

  it('puts the dates and location on the same line as the role, after a tab', async () => {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(await (await buildResumeDocx(resume)).arrayBuffer()) })
    expect(value).toContain('Senior Engineer\t2020 – Present')
    expect(value).toContain('Analytical Co\tLondon')
  })

  it('prints the location and every link on the contact line', async () => {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(await (await buildResumeDocx({
      ...resume, location: 'Toronto, ON', links: ['ada.dev', 'linkedin.com/in/ada', 'github.com/ada'],
    })).arrayBuffer()) })
    expect(value).toContain('Toronto, ON  |  555-0100  |  ada@example.com  |  ada.dev  |  linkedin.com/in/ada  |  github.com/ada')
  })

  it('prints website on a resume parsed before links were kept', async () => {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(await (await buildResumeDocx(resume)).arrayBuffer()) })
    expect(value).toContain('555-0100  |  ada@example.com  |  ada.dev')
  })

  it('skips empty sections and falls back to "Resume" without a name', async () => {
    const html = await read({ name: '', phone: '', email: '', website: '', experience: [], education: [] })
    expect(html).toContain('Resume')
    expect(html).not.toContain('<h1>')
  })
})
