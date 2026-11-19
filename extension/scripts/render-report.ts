// Turns a "Flag a problem" report back into the PDF the user saw, to tell a
// content problem from a layout one (#256). The header is tags as long as the
// real values, so its line breaks match; the letter's date is the report's.
//
//   pnpm render-report <report.json> [out.pdf]
//
// report.json: a "survey sent" event from PostHog (the event, or just its
// properties), or the body the extension sends.
import { readFileSync, writeFileSync } from 'node:fs'
import { coverLetterPdf } from '../src/lib/pdf/cover-letter'
import { tailoredResumePdf } from '../src/lib/pdf/resume'
import type { TailoredResume } from '../src/lib/pdf/types'

const [file, out = file?.replace(/\.json$/i, '') + '.pdf'] = process.argv.slice(2)
if (!file) {
  console.error('Usage: pnpm render-report <report.json> [out.pdf]')
  process.exit(1)
}
const raw = JSON.parse(readFileSync(file, 'utf8'))
const p = raw.properties ?? raw
const kind = p.kind ?? (p.$survey_response_2 === 'Cover letter' ? 'letter' : 'resume')
const job = { title: p.job?.title ?? p.job_title ?? '', company: p.job?.company ?? p.company ?? '' }

const doc = kind === 'letter'
  ? coverLetterPdf(String(p.output), job, raw.timestamp ?? new Date().toISOString())
  : tailoredResumePdf(p.output as TailoredResume)
writeFileSync(out, Buffer.from(doc.output('arraybuffer')))
console.log(`${kind === 'letter' ? 'Letter' : 'Resume'} written to ${out}`)
