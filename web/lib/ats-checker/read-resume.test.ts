import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import { checkResumeText } from './hints'
import { checkResume, readPosting } from './keywords'
import { readResumeFile } from './read-resume'

const FILES = join(__dirname, '../../public/guides/ats-friendly-resume-format/files')
const SAMPLE = join(FILES, 'single-column')
const file = (path: string, type = '') => new File([readFileSync(path)], path.split(/[\\/]/).pop()!, { type })

const POSTING = 'Requirements\n- SEO and content marketing\n- Google Analytics and A/B testing\n- HubSpot or Salesforce\n- Copywriting'
const EXPECTED = {
  SEO: true, 'content marketing': false, 'Google Analytics': true, 'A/B testing': true,
  HubSpot: true, Salesforce: true, copywriting: true,
}

describe('reading an uploaded resume', () => {
  // Loading pdf.js and mammoth took over 5 s on a cold CI runner, which failed the first upload test (#278).
  beforeAll(async () => {
    Object.assign(globalThis, { pdfjsWorker: await import('pdfjs-dist/legacy/build/pdf.worker.mjs') })
    await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('mammoth')])
  }, 30_000)

  test.each([['docx', ''], ['pdf', 'application/pdf']])('a %s upload finds the same keywords as the sample resume', async (ext, type) => {
    const { text } = await readResumeFile(file(`${SAMPLE}.${ext}`, type))
    const result = Object.fromEntries(checkResume(readPosting(POSTING).keywords, text).map((k) => [k.name, k.found]))
    expect(result).toEqual(EXPECTED)
  })

  test('a text file is read as is, and other types are refused', async () => {
    expect(await readResumeFile(new File(['  SQL and Python \n'], 'resume.txt', { type: 'text/plain' }))).toEqual({ text: 'SQL and Python' })
    await expect(readResumeFile(new File(['x'], 'resume.pages'))).rejects.toThrow('Upload a PDF, a Word file (.docx) or a text file.')
  })

  test.each([['resume.pdf', 'application/pdf'], ['resume.docx', '']])('an unreadable %s gets a plain message', async (name, type) => {
    await expect(readResumeFile(new File(['not really a file'], name, { type }))).rejects.toThrow(
      `Couldn't read ${name}. If it has a password, save a copy without one, or paste the text instead.`,
    )
  })

  test.each([['single-column.pdf', 'application/pdf'], ['single-column.docx', ''], ['two-column.pdf', 'application/pdf'], ['table-layout.docx', '']])(
    '%s gives only real bullets, each with its number, and a page count for PDFs',
    async (name, type) => {
      const { text, pages } = await readResumeFile(file(join(FILES, name), type))
      const { bullets, email, phone } = checkResumeText(text, '')
      expect(bullets.total).toBe(7)
      expect(bullets.withoutNumber).toEqual([])
      expect({ email, phone }).toEqual({ email: true, phone: true })
      expect(pages).toBe(type ? 1 : undefined)
    },
  )

  test('contact details in the Word header are reported missing, as the guide found', async () => {
    const { text } = await readResumeFile(file(join(FILES, 'header-contact.docx')))
    expect(checkResumeText(text, '')).toMatchObject({ email: false, phone: false })
  })

  test('a picture PDF gives no text, so the upload asks for a paste', async () => {
    expect(await readResumeFile(file(join(FILES, 'image-only.pdf'), 'application/pdf'))).toEqual({ text: '', pages: 1 })
  })
})

test('the ATS resume template reads as placeholders, with contact details in the body and nothing left of the test resume', async () => {
  const { text } = await readResumeFile(file(join(__dirname, '../../public/guides/ats-resume-template/ats-resume-template.docx')))
  expect(text).toMatch(/^Your Name\s+City, State/)
  for (const heading of ['SUMMARY', 'EXPERIENCE', 'EDUCATION', 'SKILLS']) expect(text).toContain(heading)
  expect(text).not.toMatch(/Alex|Rivera|Fernwood|Quillmark|Tidewater|Illinois/)
  expect(checkResumeText(text, '')).toMatchObject({ email: true, phone: true, bullets: { total: 5 } })
}, 30_000)
