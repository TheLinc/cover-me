import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import { checkResume, readPosting } from './keywords'
import { readResumeFile } from './read-resume'

const SAMPLE = join(__dirname, '../../public/guides/ats-friendly-resume-format/files/single-column')
const file = (path: string, type = '') => new File([readFileSync(path)], path.split(/[\\/]/).pop()!, { type })

const POSTING = 'Requirements\n- SEO and content marketing\n- Google Analytics and A/B testing\n- HubSpot or Salesforce\n- Copywriting'
const EXPECTED = {
  SEO: true, 'content marketing': false, 'Google Analytics': true, 'A/B testing': true,
  HubSpot: true, Salesforce: true, copywriting: true,
}

describe('reading an uploaded resume', () => {
  beforeAll(async () => {
    const worker = 'pdfjs-dist/legacy/build/pdf.worker.mjs'
    Object.assign(globalThis, { pdfjsWorker: await import(/* @vite-ignore */ worker) })
  })

  test.each([['docx', ''], ['pdf', 'application/pdf']])('a %s upload finds the same keywords as the sample resume', async (ext, type) => {
    const text = await readResumeFile(file(`${SAMPLE}.${ext}`, type))
    const result = Object.fromEntries(checkResume(readPosting(POSTING).keywords, text).map((k) => [k.name, k.found]))
    expect(result).toEqual(EXPECTED)
  })

  test('a text file is read as is, and other types are refused', async () => {
    expect(await readResumeFile(new File(['  SQL and Python \n'], 'resume.txt', { type: 'text/plain' }))).toBe('SQL and Python')
    await expect(readResumeFile(new File(['x'], 'resume.pages'))).rejects.toThrow('Upload a PDF, a Word file (.docx) or a text file.')
  })
})
