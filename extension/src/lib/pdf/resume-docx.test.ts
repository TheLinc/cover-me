import JSZip from 'jszip'
import mammoth from 'mammoth'
import { describe, expect, it } from 'vitest'
import { contactLines } from './resume'
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

// Read the file back with an independent .docx reader, as Word or Docs would (#120).
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
    expect(value).toContain('Toronto, ON   |   555-0100   |   ada@example.com   |   ada.dev   |   linkedin.com/in/ada   |   github.com/ada')
  })

  it('prints website on a resume parsed before links were kept', async () => {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(await (await buildResumeDocx(resume)).arrayBuffer()) })
    expect(value).toContain('555-0100   |   ada@example.com   |   ada.dev')
  })

  it('skips empty sections and falls back to "Resume" without a name', async () => {
    const html = await read({ name: '', phone: '', email: '', website: '', experience: [], education: [] })
    expect(html).toContain('Resume')
    expect(html).not.toContain('<h1>')
  })

  it('writes a long master\'s headline, project tech and link, grouped skills and entries (#190)', async () => {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(await (await buildResumeDocx({
      ...resume,
      headline: 'Registered Nurse, Telemetry',
      projects: [{ name: 'Fall huddle', link: 'example.org/huddle', tech: 'Epic, Excel', bullets: ['Rewrote the checklist'] }],
      skills: 'Clinical: Telemetry, IV therapy\nSystems: Epic',
      otherSections: [{ heading: 'Awards', lines: ['Unit Nurse of the Quarter, Q2 2022'], entries: [{ name: 'DAISY Award', subtitle: 'Mercy General', dates: '2023', bullets: ['Nominated by a patient\'s family'] }] }],
    })).arrayBuffer()) })
    for (const s of ['Registered Nurse, Telemetry', 'Epic, Excel', 'example.org/huddle', 'Clinical: Telemetry, IV therapy', 'Systems: Epic', 'DAISY Award', 'Mercy General', 'Nominated by a patient\'s family', 'Unit Nurse of the Quarter, Q2 2022']) {
      expect(value).toContain(s)
    }
  })

  describe("in the resume's template (#119)", () => {
    async function xml(r: TailoredResume) {
      const zip = await JSZip.loadAsync(await (await buildResumeDocx(r)).arrayBuffer())
      const [styles, doc] = await Promise.all(['word/styles.xml', 'word/document.xml'].map((f) => zip.file(f)!.async('string')))
      const style = (id: string) => styles.match(new RegExp(`<w:style [^>]*w:styleId="${id}"[\\s\\S]*?</w:style>`))![0]
      return { styles, doc, title: style('Title'), heading: style('Heading1') }
    }

    it('prints Classic, and an unknown or missing template, in centred Times with black headings', async () => {
      for (const template of [undefined, 'classic', 'retro'] as const) {
        const { styles, title, heading } = await xml({ ...resume, template: template as TailoredResume['template'] })
        expect(styles).toContain('w:ascii="Times New Roman"')
        expect(title).toContain('<w:jc w:val="center"/>')
        expect(heading).toContain('<w:color w:val="000000"/>')
      }
    })

    it('prints Modern left-aligned in Arial with headings and rule in its accent', async () => {
      const indigo = await xml({ ...resume, template: 'modern' })
      expect(indigo.styles).toContain('w:ascii="Arial"')
      expect(indigo.title).not.toContain('w:val="center"')
      expect(indigo.heading).toContain('<w:color w:val="4F46E5"/>')
      expect(indigo.heading).toMatch(/<w:bottom [^>]*w:color="4F46E5"/)
      const teal = await xml({ ...resume, template: 'modern', accent: '#0f766e' })
      expect(teal.heading).toContain('<w:color w:val="0F766E"/>')
      expect(teal.heading).toMatch(/<w:bottom [^>]*w:color="0F766E"/)
    })

    it('ignores an accent on a template without one, and an invalid accent', async () => {
      expect((await xml({ ...resume, template: 'classic', accent: '#0F766E' })).heading).toContain('<w:color w:val="000000"/>')
      expect((await xml({ ...resume, template: 'modern', accent: 'red' })).heading).toContain('<w:color w:val="4F46E5"/>')
    })

    it('gives Compact narrower margins and Minimal wider ones than Classic', async () => {
      const left = async (template: TailoredResume['template']) => Number((await xml({ ...resume, template })).doc.match(/<w:pgMar [^>]*w:left="(\d+)"/)![1])
      expect(await left('compact')).toBeLessThan(await left('classic'))
      expect(await left('minimal')).toBeGreaterThan(await left('classic'))
    })

    it('breaks the contact line where the PDF does, never inside a link', async () => {
      const r: TailoredResume = { ...resume, template: 'minimal', location: 'Toronto, ON', links: ['alexandra.dev', 'linkedin.com/in/alexandra-montgomery-okonkwo', 'github.com/amontgomery'] }
      const lines = contactLines(r)
      expect(lines.length).toBeGreaterThan(1)
      const { doc } = await xml(r)
      for (const line of lines.slice(1)) expect(doc).toContain(`<w:br/><w:t xml:space="preserve">${line}</w:t>`)
    })

    it("puts each line on the PDF's baseline step and never splits a bullet across pages", async () => {
      const { doc } = await xml(resume)
      // A job's second bullet sits the PDF's 12pt line plus its 1pt gap below the first (#119).
      expect(doc).toMatch(/<w:keepLines\/><w:numPr>.*?<\/w:numPr><w:spacing w:after="0" w:before="20" w:line="240" w:lineRule="exact"\/><\/w:pPr><w:r><w:t xml:space="preserve">Led a team of 4</)
    })

    it("sets Minimal's larger name in regular weight", async () => {
      const { title } = await xml({ ...resume, template: 'minimal' })
      expect(title).toContain('<w:sz w:val="68"/>')
      expect(title).toMatch(/<w:b w:val="false"\/>|<w:b w:val="0"\/>/)
    })
  })
})
