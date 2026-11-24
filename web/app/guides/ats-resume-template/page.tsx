import type { Metadata } from 'next'
import Link from 'next/link'
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr'
import { GuideArticle } from '@/components/site/GuideArticle'
import { buttonVariants } from '@/components/ui/button'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('ats-resume-template')
const TEMPLATE = '/guides/ats-resume-template/ats-resume-template.docx'
const SUMMARY = 'A free one-column Word resume template with placeholder text. The same layout read correctly in Lever, Workday, Ashby and SmartRecruiters.'

export const metadata: Metadata = {
  title: 'Free ATS Resume Template for Word, Tested in 4 ATSs',
  description: guide.description,
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Free ATS resume template for Word, tested in 4 ATSs | Cover Me',
    description: SUMMARY,
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: guide.imageAlt }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free ATS resume template for Word, tested in 4 ATSs | Cover Me',
    description: SUMMARY,
    images: [`${BASE}${guide.image}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is this ATS resume template free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. It downloads as a Word file (.docx) straight from this page, with no account and no email address.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which ATSs read this resume template correctly?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Lever, Workday, Ashby and SmartRecruiters all filled in their application forms from the same one-column Word layout on October 31, 2026. On November 24, 2026, a filled-in copy of this template went through Ashby again, and the name, email, LinkedIn link and city all came through correctly.',
      },
    },
    {
      '@type': 'Question',
      name: 'Should I send the template as a Word file or a PDF?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Either one. In the test, all four systems filled in the same details from the one-column Word file and the one-column PDF. Send whichever the job posting asks for. To make a PDF, use File, then Save As, and pick PDF.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I add color or a second column to the template?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Heading colors are fine: the tested file used Word's blue heading styles. Keep one column, though. In the same test, a two-column design made Ashby cut off a LinkedIn link, and a layout built with a table made SmartRecruiters put two skills into the degree.",
      },
    },
  ],
}

const FILL_IN: { title: string; body: string }[] = [
  { title: 'Replace every placeholder', body: 'Type over Your Name, Job Title, Company Name and the dates. The bullets say what to write in each one.' },
  { title: 'Keep your name and contact details as the first lines', body: "Leave them in the page, not in Word's header area. Some simpler systems skip the header." },
  { title: 'Keep the section headings', body: 'Summary, Experience, Education and Skills are the words an ATS looks for. Rename them only if you must, and keep them plain.' },
  { title: 'Add a job by copying one', body: 'Copy a job title line, its date line and its bullets, and paste them below. That keeps the Word styles the systems read.' },
  { title: "Don't add tables, text boxes or columns", body: 'They are the layouts that broke a system in the test.' },
  { title: 'Save as Word or PDF', body: 'Both worked. Then upload it, and check what the form fills in before you submit.' },
]

const LINK = 'text-brand-light hover:text-brand transition-colors'
const TH = 'text-left px-3 py-3 font-bold text-muted-foreground border-b border-border'
const TD = 'px-3 py-3 border-b border-border'

const RESULTS: { ats: string; where: string; misread: string }[] = [
  { ats: 'Lever', where: "Employ's careers page", misread: 'Nothing' },
  { ats: 'Workday', where: "NVIDIA's careers site", misread: 'Left the latest company blank, put the job title in the address' },
  { ats: 'Ashby', where: "Ashby's own careers page", misread: 'Nothing' },
  { ats: 'SmartRecruiters', where: 'A Bosch job posting', misread: 'Shortened the school name, skipped the LinkedIn link' },
]

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          A free one-column Word resume template you can download without signing up. It&rsquo;s the same layout that Lever, Workday, Ashby and SmartRecruiters all read correctly when I tested six resume formats, with the made-up person&rsquo;s details swapped for placeholders.
        </>
      }
      tldr={
        <div className="space-y-4">
          <a href={TEMPLATE} download className={buttonVariants({ className: 'gap-2' })}>
            <DownloadSimpleIcon size={16} aria-hidden="true" />
            Download the template (.docx)
          </a>
          <ul className="list-disc space-y-2 pl-5 text-[16px] leading-[1.65] text-ink marker:text-brand">
            <li>One column, plain headings, name and contact details in the page.</li>
            <li>Read correctly by Lever, Workday, Ashby and SmartRecruiters on October 31, 2026.</li>
            <li>Free, no account, no email. Opens in Word.</li>
          </ul>
        </div>
      }
      sections={[
        {
          title: "What's in the template",
          body: (
            <>
              <p>
                One page in Calibri, in a single column that reads top to bottom: your name, job title and contact line, then Summary, Experience, Education and Skills. Each job has a title line, a date line and bullets in Word&rsquo;s own list style. Every line is a placeholder that says what goes there.
              </p>
              <p>
                It has no tables, text boxes, columns, icons or pictures. Those are what trip up the software that reads resumes, and the template is plain on purpose.
              </p>
            </>
          ),
        },
        {
          title: 'Which ATSs read it correctly',
          body: (
            <>
              <p>
                In my{' '}
                <Link href="/guides/ats-friendly-resume-format">test of six resume formats</Link>, I uploaded the one-column Word file to the &ldquo;autofill from resume&rdquo; button on live job postings, and wrote down what each system filled in. All four filled in the form correctly. This template is that file with the details swapped for placeholders: same styles, same headings, same page setup.
              </p>
              <div className="overflow-x-auto !mt-6">
                <table className="w-full min-w-[560px] text-[13.5px] border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-elevated">
                      <th className={TH}>ATS</th>
                      <th className={TH}>Where I tested it</th>
                      <th className={TH}>Small details it still got wrong</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RESULTS.map((r, i) => (
                      <tr key={r.ats} className={i % 2 === 0 ? 'bg-surface' : 'bg-elevated'}>
                        <td className={`${TD} font-medium text-foreground`}>{r.ats}</td>
                        <td className={`${TD} text-muted-foreground`}>{r.where}</td>
                        <td className={`${TD} text-muted-foreground`}>{r.misread}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[13px]">
                Tested October 31, 2026, with the one-column Word file filled in for a made-up marketing manager. No layout change fixes the small errors, so check the form before you submit. <Link href="/guides/ats-friendly-resume-format" className={LINK}>Read the full test</Link>.
              </p>
              <p>
                On November 24, 2026, I filled this template in for a made-up operations analyst and uploaded it to Ashby again. The name, email, LinkedIn link and city all came through correctly. The blank template is different: Ashby fills in the email and LinkedIn link but leaves &ldquo;Your Name&rdquo; and &ldquo;City, State&rdquo; empty, because they aren&rsquo;t a real name or place. Replace every placeholder before you apply.
              </p>
            </>
          ),
        },
        {
          title: 'How to fill it in',
          body: (
            <ol>
              {FILL_IN.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}.</strong> {s.body}
                </li>
              ))}
            </ol>
          ),
        },
        {
          title: 'Then tailor it to each job',
          body: (
            <p>
              A clean format gets your words read. Recruiters then search those words for the skills in the posting, so each application needs the posting&rsquo;s wording where it&rsquo;s true for you. See{' '}
              <Link href="/guides/tailor-resume-to-job-description">how to tailor your resume to a job description</Link>, or{' '}
              <Link href="/guides/tailor-resume-in-word">how to do it in Word without breaking the layout</Link>.
            </p>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Filled it in? Tailor it to each posting',
        body: (
          <p>
            Cover Me tailors the resume you upload to the job posting you have open, keeps a Word file&rsquo;s layout (beta), shows its ATS keyword score, and writes the cover letter. Free to start.
          </p>
        ),
      }}
    />
  )
}
