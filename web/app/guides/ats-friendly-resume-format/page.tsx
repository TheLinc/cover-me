import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('ats-friendly-resume-format')
const HERO_IMAGE = '/guides/ats-friendly-resume-format.png'
const HERO_ALT =
  "Results table for one made-up resume saved in six formats and uploaded to the resume autofill of Lever, Workday, Ashby and SmartRecruiters. All four read the one-column PDF, the one-column Word file and the Word file with contact details in the header. The two-column design made Ashby cut off the LinkedIn link. The table layout made SmartRecruiters mix skills into the degree. The image-only PDF gave Workday nothing, while the other three read it by OCR."
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
    images: [{ url: `${BASE}${HERO_IMAGE}`, width: 1600, height: 900, alt: 'Results of uploading one resume in six formats to Lever, Workday, Ashby and SmartRecruiters' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to make your resume ATS friendly: 6 formats tested in 4 ATSs | Cover Me',
    description: SUMMARY,
    images: [`${BASE}${HERO_IMAGE}`],
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
        text: "Both worked in my test. Lever, Workday, Ashby and SmartRecruiters filled in the same fields from the one-column PDF and the one-column Word file. What matters more is what's inside the file: real text in a single column, with no tables. Send whichever format the posting asks for.",
      },
    },
    {
      '@type': 'Question',
      name: 'Will a two-column resume get rejected by an ATS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "It's unlikely to be rejected, but it can be misread. Lever, Workday and SmartRecruiters read my two-column design correctly. Ashby cut the LinkedIn link off at \"alexrivera-exa\", where the narrow sidebar had wrapped it onto a second line. Text extractors split the same link, and pdftotext read the spaced-out headings as \"C O N TA C T\". A one-column layout avoids all of it.",
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
        text: "Open your PDF, select all the text, and paste it into a plain text editor such as Notepad. If your name, contact details, job titles and skills come out complete and in order, a parser can read them. If nothing highlights, the PDF is an image. You can also upload your resume to a job form with resume autofill, such as Lever, Ashby, SmartRecruiters or Workday, and check what fills in, then leave without submitting.",
      },
    },
  ],
}

// Results from October 31, 2026. "Simplest reader" is pdftotext for PDFs and
// a body-only Word reader (python-docx paragraphs) for DOCX.
const RESULTS: { format: string; file: string; lever: string; workday: string; ashby: string; sr: string; simple: string }[] = [
  { format: 'One column, PDF', file: 'single-column.pdf', lever: 'All fields', workday: 'All sections', ashby: 'All fields', sr: 'All sections', simple: 'All text' },
  { format: 'One column, Word', file: 'single-column.docx', lever: 'All fields', workday: 'All sections', ashby: 'All fields', sr: 'All sections', simple: 'All text' },
  { format: 'Two-column design, PDF', file: 'two-column.pdf', lever: 'All fields', workday: 'All sections', ashby: 'LinkedIn link cut off', sr: 'All sections', simple: 'LinkedIn link split, spaced headings garbled' },
  { format: 'Contact in Word header', file: 'header-contact.docx', lever: 'All fields', workday: 'All sections', ashby: 'All fields', sr: 'All sections', simple: 'Name, email, phone and LinkedIn missing' },
  { format: 'Table layout, Word', file: 'table-layout.docx', lever: 'All fields', workday: 'All sections', ashby: 'All fields', sr: 'Skills mixed into the degree', simple: '0 characters' },
  { format: 'Image-only PDF', file: 'image-only.pdf', lever: 'All fields, by OCR', workday: 'Nothing', ashby: 'All fields, by OCR', sr: 'All sections, by OCR', simple: '0 characters' },
]

const CHECKLIST: { title: string; body: string }[] = [
  { title: 'Use one column', body: 'Put everything in a single column that reads top to bottom. My two-column sidebar wrapped the LinkedIn link onto two lines, and Ashby kept only the first one.' },
  { title: 'Keep the text real', body: "Export from Word or Google Docs, not as a picture from a design app or a scan. Workday filled in nothing from my image-only PDF. If you can't highlight a word in your PDF, a parser without OCR can't read it either." },
  { title: "Don't build the layout with tables or text boxes", body: 'Use plain paragraphs, bullets and tab stops. SmartRecruiters mixed two skills into my degree from the table layout, and the basic Word reader got nothing at all.' },
  { title: 'Put your name and contact details in the body', body: "Type them as the first lines of the page, not in Word's header or footer area. All four ATSs found them in the header, but the basic Word reader didn't." },
  { title: 'Use standard section headings', body: 'Summary, Experience, Education and Skills. Skip letter-spaced or decorative headings, which can come out as "E D U C AT I O N".' },
  { title: 'Send a PDF or a Word file', body: 'Both worked in this test. Follow the posting if it asks for one.' },
  { title: 'Check what the form filled in', body: 'Every ATS got something wrong, even from the plain file. Fix those fields by hand before you submit.' },
  { title: 'Then match the posting', body: "A clean format only gets your words read. Recruiters search those words for the posting's skills, so use its wording where it's true for you." },
]

const LINK = 'text-brand-light hover:text-brand transition-colors'
const TH = 'text-left px-3 py-3 font-bold text-muted-foreground border-b border-border'
const TD = 'px-3 py-3 text-muted-foreground border-b border-border'

function Figure({ src, alt, width, height, caption }: { src: string; alt: string; width: number; height: number; caption: string }) {
  return (
    <figure className="!my-8">
      <Image src={src} alt={alt} width={width} height={height} sizes="(max-width: 800px) 100vw, 760px" className="w-full h-auto rounded-[12px] border border-border" />
      <figcaption className="text-[13px] mt-3">{caption}</figcaption>
    </figure>
  )
}

export default function Page() {
  return (
    <main className="max-w-[760px] mx-auto px-8 py-20 max-md:px-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideArticleJsonLd(guide, HERO_IMAGE)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideBreadcrumbJsonLd(guide)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="mb-12">
        <Link href="/guides" className="text-[12px] font-semibold text-brand-light hover:text-brand transition-colors">
          ← All guides
        </Link>
        <h1 className="text-[clamp(30px,4.5vw,46px)] text-foreground leading-[1.02] mt-4 mb-4">
          How to make your resume ATS friendly: I tested 6 formats in 4 ATSs
        </h1>
        <p className="text-[12px] text-muted-foreground">
          <time dateTime={guide.updated ?? guide.date}>Published October 31, 2026</time> · Lincoln Laylor
        </p>
      </div>

      {/* Hero graphic */}
      <div className="mb-10 h-px bg-line" />
      <figure className="mb-12">
        <Image
          src={HERO_IMAGE}
          alt={HERO_ALT}
          width={1600}
          height={900}
          priority
          sizes="(max-width: 800px) 100vw, 760px"
          className="w-full h-auto rounded-[12px] border border-border"
        />
      </figure>

      <article className="space-y-5 text-[15.5px] text-muted-foreground leading-[1.85]">
        <p className="text-[17px] text-foreground font-medium leading-[1.7]">
          An ATS-friendly resume is one a parser can read completely and in order. That means one column of real text, no tables, your name and contact details in the body of the page, standard section headings, and a PDF or Word file. I saved one resume in six formats and uploaded each one to four real applicant tracking systems: Lever, Workday, Ashby and SmartRecruiters. All four read the plain one-column files. The fancier formats each broke one of them. Workday got nothing from an image-only PDF, Ashby cut a link out of a two-column design, and SmartRecruiters mixed skills into the degree from a table layout. You can&rsquo;t tell which ATS an employer runs, so the plain format is the safe one.
        </p>
        <p>
          I build Cover Me, a Chrome extension that tailors resumes to job postings. I ran this test because most ATS formatting advice is repeated from article to article without anyone checking it.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What does ATS friendly mean?</h2>
        <p>
          An applicant tracking system (ATS) stores every application for a job. When you upload a resume, it pulls the text out of the file, tries to split it into fields like name, email and current employer, and indexes the words so recruiters can search them. A resume is ATS friendly when that text comes out whole and in the right order.
        </p>
        <p>
          A badly parsed resume usually isn&rsquo;t thrown away automatically. In a{' '}
          <a href="https://enhancv.com/blog/does-ats-reject-resumes/" target="_blank" rel="noopener noreferrer" className={LINK}>2025 Enhancv study</a>,
          23 of 25 US recruiters said their ATS doesn&rsquo;t auto-reject resumes for formatting, content or design. The popular claim that 75% of resumes are rejected by ATS has no published study behind it. The real cost of a bad format is quieter. Your profile shows up with empty or wrong fields, and a recruiter&rsquo;s keyword search can miss words the parser never read.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">How did I test resume formats?</h2>
        <p>
          I wrote one resume for a made-up marketing manager, Alex Rivera, and saved the same words in six formats: a plain one-column PDF and Word file, a two-column design with a colored sidebar and contact icons, a Word file with the name and contact details in the page header, a Word file laid out with a table, and an image-only PDF with no text layer.
        </p>
        <Figure
          src="/guides/ats-friendly-resume-format/layouts.png"
          alt="Two of the six test resumes side by side. Left, a plain one-column resume for Alex Rivera, Marketing Manager, with Summary, Experience, Education and Skills headings. Right, the same resume as a two-column design with a dark blue sidebar holding contact details with icons, skills and education."
          width={1720}
          height={1115}
          caption="The plain one-column layout (left) and the two-column design (right). Both hold the same words."
        />
        <p>Then I checked each file two ways:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-foreground">Four real ATSs.</strong> I uploaded each file to the resume autofill on live job applications: Lever on the careers page of Employ, the company that owns Lever, Ashby on Ashby&rsquo;s own careers page, SmartRecruiters on a Bosch posting, and Workday on NVIDIA&rsquo;s careers site, where I signed in and started a new application for each file. I started every upload from an empty form, noted what filled in, and never submitted an application.
          </li>
          <li>
            <strong className="text-foreground">Text extractors.</strong> I ran each file through Apache Tika, an open-source library that pulls text out of documents, and through the simplest readers I could find: pdftotext for PDFs and a Word reader that only reads body paragraphs. They show what a less capable parser gets from the same file.
          </li>
        </ul>
        <p>
          I picked these four because each one shows you what its parser pulled out before you apply. Lever and Ashby fill in your contact details. Workday and SmartRecruiters go further and fill in your work history and education too. Greenhouse only parses the resume after you submit, or after you sign in to MyGreenhouse.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Which resume formats can an ATS read?</h2>
        <div className="overflow-x-auto !mt-6">
          <table className="w-full text-[13px] border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-elevated">
                <th className={TH}>Format</th>
                <th className={TH}>Lever</th>
                <th className={TH}>Workday</th>
                <th className={TH}>Ashby</th>
                <th className={TH}>Smart&shy;Recruiters</th>
                <th className={TH}>Simplest reader</th>
              </tr>
            </thead>
            <tbody>
              {RESULTS.map((row, i) => (
                <tr key={row.file} className={i % 2 === 0 ? 'bg-surface' : 'bg-elevated'}>
                  <td className="px-3 py-3 font-medium text-foreground border-b border-border">
                    <a href={`${FILES}/${row.file}`} className={LINK}>{row.format}</a>
                  </td>
                  <td className={TD}>{row.lever}</td>
                  <td className={TD}>{row.workday}</td>
                  <td className={TD}>{row.ashby}</td>
                  <td className={TD}>{row.sr}</td>
                  <td className={TD}>{row.simple}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px]">
          Tested October 31, 2026. Lever fills in name, email, phone, location, current company and LinkedIn. Ashby fills in name, email and LinkedIn. SmartRecruiters fills in name, email, city, phone, every job with its dates and description, and education. Workday fills in the same sections plus suggested skills, but takes the email from your account instead of the resume. Click a format to download the test file.
        </p>
        <p>
          The plain one-column PDF and Word file came through all four. So did the Word file with contact details in the header, which some advice says an ATS can&rsquo;t see. Each of the other three formats broke exactly one ATS, and a different one each time.
        </p>

        <h3 className="text-[18px] text-foreground !mt-8">The image-only PDF: Workday read nothing</h3>
        <p>
          A file with no text layer can only be read with optical character recognition (OCR). Lever, Ashby and SmartRecruiters all filled in the right name from the image, so all three run OCR on uploads. Workday left every field blank. That happens when a resume is exported as a picture from a design app, or scanned.
        </p>
        <Figure
          src="/guides/ats-friendly-resume-format/workday-image-only.png"
          alt="Workday's My Information step after two uploads, side by side. Left, after single-column.pdf, First Name is Alex, Last Name is Rivera, and Address Line 1 says Marketing Manager. Right, after image-only.pdf, all three fields are empty."
          width={924}
          height={543}
          caption="Workday after the plain PDF (left) and the image-only PDF (right). It read nothing from the image."
        />

        <h3 className="text-[18px] text-foreground !mt-8">The two-column design: Ashby cut off the link</h3>
        <p>
          The sidebar is narrow, so the LinkedIn link wrapped onto a second line. Ashby kept only the first line and filled in &ldquo;linkedin.com/in/alexrivera-exa&rdquo;. A recruiter who clicks it gets a page that doesn&rsquo;t exist. Lever, Workday and SmartRecruiters read the design correctly.
        </p>
        <Figure
          src="/guides/ats-friendly-resume-format/ashby-two-column.png"
          alt="Ashby's LinkedIn Profile field after two uploads. After single-column.pdf it reads linkedin.com/in/alexrivera-example. After two-column.pdf it reads linkedin.com/in/alexrivera-exa."
          width={746}
          height={342}
          caption="Ashby's LinkedIn field after the plain PDF (top) and the two-column design (bottom)."
        />

        <h3 className="text-[18px] text-foreground !mt-8">The table layout: SmartRecruiters mixed up cells</h3>
        <p>
          In the table version, the education and skills sat in neighbouring cells. SmartRecruiters filled in the degree as &ldquo;B.A. Communications A/B testing, Copywriting&rdquo;, with two skills stuck on the end. Workday read the table but kept the &ldquo;&bull;&rdquo; bullet characters in the job descriptions. Lever and Ashby were fine.
        </p>
        <Figure
          src="/guides/ats-friendly-resume-format/smartrecruiters-table.png"
          alt="SmartRecruiters' Education entry after two uploads. After single-column.pdf it shows University of Illinois, 2013 to 2017, B.A. Communications. After table-layout.docx the degree line reads B.A. Communications A/B testing, Copywriting."
          width={1176}
          height={422}
          caption="SmartRecruiters' education entry after the plain PDF (top) and the table layout (bottom)."
        />

        <h3 className="text-[18px] text-foreground !mt-8">Every ATS made mistakes on the plain file too</h3>
        <p>
          Workday left the company blank on the newest job, Fernwood Labs, for every file. It put the job title &ldquo;Marketing Manager&rdquo; into the address line for three of them and never picked a degree. SmartRecruiters shortened &ldquo;University of Illinois Chicago&rdquo; to &ldquo;University of Illinois&rdquo; and never filled in the LinkedIn field. Changing the format wouldn&rsquo;t fix any of that, so read the form before you submit.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What do simpler parsers lose?</h2>
        <p>
          The text extractors show what a less capable parser gets from the same files. Apache Tika read all the text from everything except the image-only PDF. The simplest readers lost more:
        </p>
        <p>
          <strong className="text-foreground">Contact details in the Word header.</strong> The body-only Word reader started at &ldquo;Summary&rdquo;, so Alex&rsquo;s name, email, phone and LinkedIn were gone. Some resume templates put the name in the header to repeat it on every page.
        </p>
        <p>
          <strong className="text-foreground">Tables.</strong> The body-only reader got 0 characters from the table layout, because every word sat inside table cells.
        </p>
        <p>
          <strong className="text-foreground">Images of text.</strong> Tika and pdftotext both got 0 characters from the image-only PDF.
        </p>
        <p>
          <strong className="text-foreground">Two columns.</strong> All the text came out, sidebar first and then the main column. Tika and pdftotext both split the LinkedIn link in two, the same place Ashby cut it, and pdftotext read the spaced-out headings as separate letters:
        </p>
        <pre className="text-[12.5px] leading-[1.6] bg-elevated border border-border rounded-[8px] p-4 overflow-x-auto text-foreground whitespace-pre-wrap">
{`Alex Rivera
Marketing Manager
C O N TA C T
Chicago, IL (312) 555-0142 alex.rivera@example.com linkedin.com/in/alexrivera-exa mple
SKILLS
SEO Campaign strategy Google Analytics Budget management ...`}
        </pre>
        <p className="text-[13px] !mt-2">pdftotext&rsquo;s output for the two-column design.</p>

        <h2 className="text-[22px] text-foreground !mt-10">How do you make your resume ATS friendly?</h2>
        <ol className="list-decimal pl-6 space-y-3">
          {CHECKLIST.map((s) => (
            <li key={s.title}>
              <strong className="text-foreground">{s.title}.</strong> {s.body}
            </li>
          ))}
        </ol>
        <p>
          For the last step, see my guides on{' '}
          <Link href="/guides/tailor-resume-to-job-description" className={LINK}>tailoring your resume to a job description</Link>{' '}
          and{' '}
          <Link href="/guides/what-is-an-ats-score" className={LINK}>what an ATS score measures</Link>.
        </p>
        <p>
          To check your own file, open the PDF, select all the text and paste it into Notepad or TextEdit. If your name, contact details, job titles and skills come out complete and in order, a parser can read them. If nothing highlights, it&rsquo;s an image.
        </p>
      </article>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-[22px] text-foreground mb-4">Frequently asked questions</h2>
        <div className="divide-y divide-border border-t border-border">
          {(faqJsonLd.mainEntity as { name: string; acceptedAnswer: { text: string } }[]).map((item) => (
            <div key={item.name} className="py-6">
              <h3 className="text-[16px] font-bold text-foreground tracking-[-0.3px] mb-2.5">{item.name}</h3>
              <p className="text-[14px] text-muted-foreground leading-[1.8]">{item.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="border border-border rounded-[12px] p-8 bg-surface text-center mt-14">
        <h2 className="text-[20px] text-foreground mb-2">Format fixed? Tailor the words next</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[440px] mx-auto leading-[1.7]">
          Cover Me tailors your resume to the job posting you have open, shows its ATS keyword score, and writes the cover letter. Free to start.
        </p>
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-brand-strong text-white font-semibold text-[14px] px-5 py-2.5 rounded-[8px] hover:bg-brand-deep transition-colors"
        >
          Install free · Chrome
        </a>
      </div>
    </main>
  )
}
