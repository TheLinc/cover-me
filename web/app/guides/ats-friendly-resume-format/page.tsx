import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { GuideArticle, GuideImage } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('ats-friendly-resume-format')
const FILES = '/guides/ats-friendly-resume-format/files'
const SUMMARY = 'One resume, six formats, four real ATSs. Workday read nothing from an image PDF, Ashby cut a link out of a two-column design, and SmartRecruiters mixed skills into a degree from a table.'

export const metadata: Metadata = {
  title: 'ATS-Friendly Resume Format: 6 Layouts Tested in 4 ATSs',
  description: 'I uploaded one resume in six formats to Lever, Workday, Ashby and SmartRecruiters. What broke, what held up, and a checklist for an ATS-friendly resume.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'How to make your resume ATS friendly: 6 formats tested in 4 ATSs | Cover Me',
    description: SUMMARY,
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 3200, height: 1800, alt: 'Results of uploading one resume in six formats to Lever, Workday, Ashby and SmartRecruiters' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to make your resume ATS friendly: 6 formats tested in 4 ATSs | Cover Me',
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
      name: 'Is a PDF or a Word document better for an ATS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Both worked in my test. Lever, Workday, Ashby and SmartRecruiters filled in the same details from the one-column PDF and the one-column Word file. The layout inside the file matters more than the file type. Send whichever one the job posting asks for.",
      },
    },
    {
      '@type': 'Question',
      name: 'Will a two-column resume get rejected by an ATS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Probably not rejected, but it can be misread. Three of the four systems read my two-column resume correctly. Ashby cut my LinkedIn link short, because the narrow sidebar had wrapped it onto a second line, so a recruiter clicking it would get a broken page. A one-column layout avoids that.",
      },
    },
    {
      '@type': 'Question',
      name: 'Does an ATS automatically reject resumes?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Rarely for formatting. In a 2025 Enhancv study, 23 of 25 US recruiters said their system doesn't auto-reject resumes for formatting, content or design. The other 2 set it to reject candidates below a match or experience threshold. Recruiters can also add knockout questions to the form, such as work authorization, that reject an application automatically. The often-quoted claim that 75% of resumes are rejected by ATS has no published study behind it.",
      },
    },
    {
      '@type': 'Question',
      name: 'How can I check if my resume is ATS friendly?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Open your PDF, select all the text, and paste it into a plain text editor such as Notepad. If your name, contact details, job titles and skills come out complete and in order, an ATS can read them. If you can't select any text, your resume is an image. You can also upload it to a job application that has an \"autofill from resume\" button, check what fills in, and leave without submitting.",
      },
    },
  ],
}

type PassOrWhatWentWrong = true | string
const RESULTS: { format: string; file: string; cells: [PassOrWhatWentWrong, PassOrWhatWentWrong, PassOrWhatWentWrong, PassOrWhatWentWrong] }[] = [
  { format: 'One column, PDF', file: 'single-column.pdf', cells: [true, true, true, true] },
  { format: 'One column, Word', file: 'single-column.docx', cells: [true, true, true, true] },
  { format: 'Two columns', file: 'two-column.pdf', cells: [true, true, 'Cut off the LinkedIn link', true] },
  { format: 'Name and contact in the Word header', file: 'header-contact.docx', cells: [true, true, true, true] },
  { format: 'Built with a table', file: 'table-layout.docx', cells: [true, true, true, 'Put skills in the degree'] },
  { format: 'Saved as an image', file: 'image-only.pdf', cells: [true, 'Read nothing', true, true] },
]

const DO = [
  'Use one column that reads top to bottom',
  'Type your name and contact details at the top of the page',
  'Use plain headings: Summary, Experience, Education, Skills',
  'Save it as a PDF or Word file from Word or Google Docs',
  'Check the form after it fills itself in',
]
const DONT = [
  'Send a resume that is a picture or a scan',
  'Use a two-column or sidebar design',
  'Lay it out with a table',
]

const CHECKLIST: { title: string; body: string }[] = [
  { title: 'Use one column', body: 'Everything in a single column that reads top to bottom. My two-column sidebar wrapped the LinkedIn link onto two lines, and Ashby kept only the first one.' },
  { title: 'Make sure the text is real text', body: "Save from Word or Google Docs, not as a picture from a design app or a scan. Workday filled in nothing from my image version. If you can't highlight a word in your PDF, it's a picture." },
  { title: "Don't use tables to line things up", body: 'Use plain paragraphs and bullet points. SmartRecruiters mixed two of my skills into my degree from the table version.' },
  { title: 'Put your name and contact details on the page', body: "Type them as the first lines, not in Word's header area. All four systems found them in the header, but simpler ones don't." },
  { title: 'Use standard section headings', body: 'Summary, Experience, Education and Skills. Skip spaced-out or decorative headings.' },
  { title: 'Send a PDF or a Word file', body: 'Both worked. Follow the job posting if it asks for one.' },
  { title: 'Check what the form filled in', body: 'Workday and SmartRecruiters got details wrong even from the plain file. Fix them by hand before you submit.' },
  { title: 'Then match the job posting', body: "A clean format only gets your words read. Recruiters search those words for the skills in the posting, so use its wording where it's true for you." },
]

const LINK = 'text-brand-light hover:text-brand transition-colors'
const TH = 'text-left px-3 py-3 font-bold text-muted-foreground border-b border-border'

function Ok() {
  return <Check aria-label="Read correctly" className="size-4 text-brand shrink-0" strokeWidth={2.5} />
}

function Bad({ children }: { children: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[#9A3412] font-medium">
      <X aria-hidden className="size-4 shrink-0" strokeWidth={2.5} />
      {children}
    </span>
  )
}

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          An ATS-friendly resume is one the hiring software can read correctly. I took one resume, saved it in six different layouts, and uploaded each one to four of the systems companies use to collect applications: Lever, Workday, Ashby and SmartRecruiters. The plain one-column versions worked in all four. Three of the fancier layouts each broke one system.
        </>
      }
      tldr={
        <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand mb-2">Do</p>
            <ul className="space-y-2 text-[14.5px] leading-[1.6]">
              {DO.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check aria-hidden className="size-4 text-brand shrink-0 mt-1" strokeWidth={2.5} />
                  <span className="text-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#9A3412] mb-2">Don&rsquo;t</p>
            <ul className="space-y-2 text-[14.5px] leading-[1.6]">
              {DONT.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <X aria-hidden className="size-4 text-[#9A3412] shrink-0 mt-1" strokeWidth={2.5} />
                  <span className="text-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      }
      intro={
        <p>
          I build Cover Me, a Chrome extension that tailors resumes to job postings. I ran this test because most resume formatting advice gets repeated from article to article without anyone checking it.
        </p>
      }
      sections={[
        {
          title: 'What is an ATS?',
          body: (
            <>
              <p>
                An ATS, or applicant tracking system, is the software a company uses to collect job applications. When you upload your resume, it copies the text out of your file and sorts it into boxes: your name, email, past jobs, education and skills. Recruiters then search those boxes for the skills they need. If your layout confuses the software, the boxes come out empty or wrong. My{' '}
                <Link href="/guides/what-is-an-ats-score#how-ats-screening-works">guide to ATS scores</Link>{' '}
                explains how that screening works in more detail.
              </p>
              <p>
                A badly read resume usually isn&rsquo;t thrown out automatically. In a{' '}
                <a href="https://enhancv.com/blog/does-ats-reject-resumes/" target="_blank" rel="noopener noreferrer">2025 Enhancv study</a>,
                23 of 25 US recruiters said their system doesn&rsquo;t auto-reject resumes for their format. The popular claim that 75% of resumes get rejected by an ATS has no published study behind it. The real cost is quieter. Your application shows up with missing or wrong details, and a recruiter&rsquo;s search can miss skills the software never read.
              </p>
            </>
          ),
        },
        {
          title: 'How I tested it',
          body: (
            <>
              <p>
                I wrote a resume for a made-up marketing manager, Alex Rivera, and saved the same words six ways:
              </p>
              <ul>
                <li>A plain one-column PDF</li>
                <li>The same thing as a Word file</li>
                <li>A two-column design with a colored sidebar, like many resume templates</li>
                <li>A Word file with the name and contact details in the page header</li>
                <li>A Word file laid out with a table</li>
                <li>A PDF that is just a picture of the resume, like a scan</li>
              </ul>
              <GuideImage
                src="/guides/ats-friendly-resume-format/layouts.png"
                alt="Two of the six test resumes side by side. Left, a plain one-column resume for Alex Rivera, Marketing Manager, with Summary, Experience, Education and Skills headings. Right, the same resume as a two-column design with a dark blue sidebar holding contact details with icons, skills and education."
                width={1720}
                height={1115}
                caption="The plain one-column layout (left) and the two-column design (right). Both hold the same words."
              />
              <p>
                Many job applications have an &ldquo;autofill from resume&rdquo; button that reads your file and fills in the form for you. That shows exactly what the system pulled out of your resume. I used it on live job postings at each of the four systems, started from an empty form every time, wrote down what filled in, and never submitted an application.
              </p>
              <p className="text-[13px]">
                Where I tested: Lever on the careers page of Employ, the company that owns Lever. Ashby on Ashby&rsquo;s own careers page. SmartRecruiters on a Bosch job posting. Workday on NVIDIA&rsquo;s careers site, where I signed in and started a new application for each file.
              </p>
            </>
          ),
        },
        {
          title: 'The results',
          body: (
            <>
              <div className="overflow-x-auto !mt-6">
                <table className="w-full min-w-[620px] text-[13.5px] border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-elevated">
                      <th className={TH}>Resume layout</th>
                      <th className={TH}>Lever</th>
                      <th className={TH}>Workday</th>
                      <th className={TH}>Ashby</th>
                      <th className={TH}>Smart&shy;Recruiters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RESULTS.map((row, i) => (
                      <tr key={row.file} className={i % 2 === 0 ? 'bg-surface' : 'bg-elevated'}>
                        <td className="px-3 py-3 font-medium text-foreground border-b border-border min-w-[150px]">
                          <a href={`${FILES}/${row.file}`} className={LINK}>{row.format}</a>
                        </td>
                        {row.cells.map((c, j) => (
                          <td key={j} className="px-3 py-3 border-b border-border align-middle">
                            {c === true ? <Ok /> : <Bad>{c}</Bad>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[13px]">
                A check means the system filled in the form correctly from that file. Tested October 31, 2026. Click a layout to download the test file, or get the one-column Word file with placeholders as a free{' '}
                <Link href="/guides/ats-resume-template">ATS resume template</Link>.
              </p>
              <p>
                The plain one-column PDF and Word file worked everywhere. So did putting your name in the Word header, which a lot of advice says to avoid. The other three layouts each broke one system.
              </p>
            </>
          ),
        },
        {
          title: '3 resume layouts that broke a real ATS',
          body: (
            <>
              <h3>1. A resume saved as a picture</h3>
              <p>
                Some resumes are exported from a design app as an image, or scanned. There&rsquo;s no real text in the file, only a picture of text. Lever, Ashby and SmartRecruiters could read the picture anyway. Workday couldn&rsquo;t, and left every box empty.
              </p>
              <p>
                <strong>Quick test:</strong> open your PDF and try to highlight a single word. If you can&rsquo;t, your resume is a picture.
              </p>
              <GuideImage
                src="/guides/ats-friendly-resume-format/workday-image-only.png"
                alt="Workday's My Information step after two uploads, side by side. Left, after single-column.pdf, First Name is Alex, Last Name is Rivera, and Address Line 1 says Marketing Manager. Right, after image-only.pdf, all three fields are empty."
                width={1840}
                height={1110}
                caption="Workday after the plain PDF (left) and the picture PDF (right). It read nothing from the picture."
              />

              <h3>2. A two-column layout</h3>
              <p>
                The sidebar is narrow, so the LinkedIn link wrapped onto a second line. Ashby only kept the first line and filled in &ldquo;linkedin.com/in/alexrivera-exa&rdquo;. A recruiter who clicks that gets a broken page. The other three systems read the two-column design correctly.
              </p>
              <GuideImage
                src="/guides/ats-friendly-resume-format/ashby-two-column.png"
                alt="Ashby's LinkedIn Profile field after two uploads. After single-column.pdf it reads linkedin.com/in/alexrivera-example. After two-column.pdf it reads linkedin.com/in/alexrivera-exa."
                width={1504}
                height={762}
                caption="Ashby's LinkedIn box after the plain PDF (top) and the two-column design (bottom)."
              />

              <h3>3. A layout built with a table</h3>
              <p>
                Some Word templates use a table to line up the sections. In mine, education and skills sat in boxes next to each other. SmartRecruiters filled in the degree as &ldquo;B.A. Communications A/B testing, Copywriting&rdquo;, with two skills stuck on the end. The other three systems were fine.
              </p>
              <GuideImage
                src="/guides/ats-friendly-resume-format/smartrecruiters-table.png"
                alt="SmartRecruiters' Education entry after two uploads. After single-column.pdf it shows University of Illinois, 2013 to 2017, B.A. Communications. After table-layout.docx the degree line reads B.A. Communications A/B testing, Copywriting."
                width={1232}
                height={950}
                caption="SmartRecruiters' education entry after the plain PDF (top) and the table layout (bottom)."
              />
            </>
          ),
        },
        {
          title: 'Even a plain resume gets misread',
          body: (
            <>
              <p>
                Lever and Ashby read the plain one-column file perfectly. Workday and SmartRecruiters still made mistakes with it:
              </p>
              <ul>
                <li>Workday left the company name blank on the most recent job.</li>
                <li>Workday put the job title &ldquo;Marketing Manager&rdquo; in the street address box.</li>
                <li>SmartRecruiters shortened &ldquo;University of Illinois Chicago&rdquo; to &ldquo;University of Illinois&rdquo;.</li>
                <li>SmartRecruiters never filled in the LinkedIn box.</li>
              </ul>
              <p>
                No layout change fixes these. When a form fills itself in from your resume, read every box before you submit.
              </p>
            </>
          ),
        },
        {
          title: 'ATS-friendly resume checklist',
          body: (
            <>
              <ol>
                {CHECKLIST.map((s) => (
                  <li key={s.title}>
                    <strong>{s.title}.</strong> {s.body}
                  </li>
                ))}
              </ol>
              <p>
                For the last step, see my guides on{' '}
                <Link href="/guides/tailor-resume-to-job-description">tailoring your resume to a job description</Link>{' '}
                and{' '}
                <Link href="/guides/what-is-an-ats-score">what an ATS score measures</Link>.
              </p>
            </>
          ),
        },
        {
          title: 'How to check your own resume',
          body: (
            <>
              <ol>
                <li>Open your resume PDF and select all the text.</li>
                <li>Paste it into Notepad (Windows) or TextEdit (Mac).</li>
                <li>Check that your name, contact details, job titles and skills all came through, in order. If nothing would highlight, your resume is a picture.</li>
              </ol>
              <p>
                You can also upload it to any job application with an &ldquo;autofill from resume&rdquo; button, see what fills in, and leave without submitting.
              </p>
            </>
          ),
        },
        {
          title: 'What do simpler systems lose?',
          body: (
            <>
              <p>
                To see what a more basic system would get, I also ran every file through three free tools that pull text out of documents: Apache Tika, pdftotext for PDFs, and a Word reader that only reads the main body of the page. They lost a lot more:
              </p>
              <ul>
                <li><strong>Word header.</strong> The basic Word reader started at &ldquo;Summary&rdquo;. Alex&rsquo;s name, email, phone and LinkedIn were gone.</li>
                <li><strong>Table.</strong> The basic Word reader got no text at all, because every word sat inside a table.</li>
                <li><strong>Picture PDF.</strong> Tika and pdftotext both got no text.</li>
                <li><strong>Two columns.</strong> Tika and pdftotext both split the LinkedIn link in the same place Ashby cut it, and pdftotext read the spaced-out headings as separate letters.</li>
              </ul>
              <pre className="text-[12.5px] leading-[1.6] bg-elevated border border-border rounded-[8px] p-4 overflow-x-auto text-foreground whitespace-pre-wrap">
{`Alex Rivera
Marketing Manager
C O N TA C T
Chicago, IL (312) 555-0142 alex.rivera@example.com linkedin.com/in/alexrivera-exa mple
SKILLS
SEO Campaign strategy Google Analytics Budget management ...`}
              </pre>
              <p className="text-[13px] !mt-2">What pdftotext got from the two-column design.</p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Format fixed? Tailor the words next',
        body: (
          <>
            <p>
              Cover Me tailors your resume to the job posting you have open, shows its ATS keyword score, and writes the cover letter. Free to start.
            </p>
            <p>
              Using a Word file? See <Link href="/guides/tailor-resume-in-word">how to tailor it without losing its formatting</Link>.
            </p>
          </>
        ),
      }}
    />
  )
}
