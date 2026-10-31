import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('ats-friendly-resume-format')
const HERO_IMAGE = '/guides/ats-friendly-resume-format.png'
const HERO_ALT =
  "Results table for one made-up resume saved in six formats. Lever's resume autofill filled every field for all six: one column PDF, one column Word, a two-column design, contact details in the Word header, a Word table layout, and an image-only PDF, which it read by OCR. The simplest text reader got all the text from the one-column files, split the LinkedIn link in the two-column design, lost the contact details in the Word header, and got 0 characters from the table layout and the image-only PDF."
const FILES = '/guides/ats-friendly-resume-format/files'

export const metadata: Metadata = {
  title: 'ATS-Friendly Resume Format: 6 Layouts Tested',
  description: 'We uploaded one resume in six formats to a real ATS and ran it through text extractors. What broke, what held up, and a checklist for an ATS-friendly resume.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'How to make your resume ATS friendly: 6 formats tested | Cover Me',
    description: 'One resume, six formats, a real ATS and three text extractors. Tables, Word headers and image PDFs lost text. Plain one-column files kept all of it.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${HERO_IMAGE}`, width: 1600, height: 900, alt: 'Results of uploading one resume in six formats to Lever and to a basic text reader' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to make your resume ATS friendly: 6 formats tested | Cover Me',
    description: 'One resume, six formats, a real ATS and three text extractors. Tables, Word headers and image PDFs lost text. Plain one-column files kept all of it.',
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
        text: "Both worked in our test. Lever's autofill and Apache Tika read every word of the one-column PDF and the one-column Word file. What matters more is what's inside the file: real text in a single column, with your contact details in the body. Send whichever format the posting asks for.",
      },
    },
    {
      '@type': 'Question',
      name: 'Will a two-column resume get rejected by an ATS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Not in our test. Lever filled every contact field from our two-column design, and the text extractors kept every word. The narrow sidebar did cause damage, though. The LinkedIn link wrapped onto two lines and came out split, and pdftotext read the spaced-out headings as \"C O N TA C T\". A one-column layout avoids both problems.",
      },
    },
    {
      '@type': 'Question',
      name: 'Does an ATS automatically reject resumes?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Rarely for formatting. In a 2025 Enhancv study, 23 of 25 US recruiters said their system doesn't auto-reject resumes for formatting, content or design. The other 2 set it to reject candidates below a match or experience threshold. Most automatic rejections come from knockout questions the recruiter writes into the form, such as work authorization. The often-quoted claim that 75% of resumes are rejected by ATS has no published study behind it.",
      },
    },
    {
      '@type': 'Question',
      name: 'How can I check if my resume is ATS friendly?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Open your PDF, select all the text, and paste it into a plain text editor such as Notepad. If your name, contact details, job titles and skills come out complete and in order, a parser can read them. If nothing highlights, the PDF is an image. You can also upload your resume to a job form with resume autofill, like the ones on Lever, and check what fills in, then leave without submitting.",
      },
    },
  ],
}

// Results from October 31, 2026. "Simplest reader" is pdftotext for PDFs and
// a body-only Word reader (python-docx paragraphs) for DOCX.
const RESULTS: { format: string; file: string; lever: string; tika: string; simple: string }[] = [
  { format: 'One column, PDF', file: 'single-column.pdf', lever: 'All 6 fields', tika: 'All text', simple: 'All text' },
  { format: 'One column, Word', file: 'single-column.docx', lever: 'All 6 fields', tika: 'All text', simple: 'All text' },
  { format: 'Two-column design, PDF', file: 'two-column.pdf', lever: 'All 6 fields', tika: 'LinkedIn link split', simple: 'LinkedIn link split, spaced headings garbled' },
  { format: 'Contact in Word header', file: 'header-contact.docx', lever: 'All 6 fields', tika: 'All text', simple: 'Name, email, phone and LinkedIn missing' },
  { format: 'Table layout, Word', file: 'table-layout.docx', lever: 'All 6 fields', tika: 'All text', simple: '0 characters' },
  { format: 'Image-only PDF', file: 'image-only.pdf', lever: 'All 6 fields, read by OCR', tika: '0 characters', simple: '0 characters' },
]

const CHECKLIST: { title: string; body: string }[] = [
  { title: 'Use one column', body: 'Put everything in a single column that reads top to bottom. Sidebars squeeze long lines like links and email addresses until they wrap and split.' },
  { title: 'Keep the text real', body: "Export from Word or Google Docs, not as a picture from a design app or a scan. If you can't highlight a word in your PDF, a parser without OCR can't read it either." },
  { title: 'Put your name and contact details in the body', body: "Type them as the first lines of the page, not in Word's header or footer area." },
  { title: "Don't build the layout with tables or text boxes", body: 'Use plain paragraphs, bullets and tab stops. Tables were the only layout that gave a basic reader nothing at all.' },
  { title: 'Use standard section headings', body: 'Summary, Experience, Education and Skills. Skip letter-spaced or decorative headings, which can come out as "E D U C AT I O N".' },
  { title: 'Send a PDF or a Word file', body: 'Both worked in this test. Follow the posting if it asks for one.' },
  { title: 'Then match the posting', body: "A clean format only gets your words read. Recruiters search those words for the posting's skills, so use its wording where it's true for you." },
]

const LINK = 'text-brand-light hover:text-brand transition-colors'

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
          How to make your resume ATS friendly: we tested 6 formats
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
          An ATS-friendly resume is one a parser can read completely and in order. That means one column of real text, your name and contact details in the body of the page, standard section headings, and a PDF or Word file. We saved one resume in six formats and tested each one. Lever&rsquo;s parser read all six, even an image-only PDF. Simpler text readers lost the contact details in a Word header and got nothing at all from a table layout or an image. You can&rsquo;t tell which parser an employer runs, so the plain format is the safe one.
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
          23 of 25 US recruiters said their ATS doesn&rsquo;t auto-reject resumes for formatting, content or design. The popular claim that 75% of resumes are rejected by ATS has no published study behind it. The real cost of a bad format is quieter. Your profile shows up with empty fields, and a recruiter&rsquo;s keyword search can miss words the parser never read.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">How did we test resume formats?</h2>
        <p>
          We wrote one resume for a made-up marketing manager, Alex Rivera, and saved the same words in six formats: a plain one-column PDF and Word file, a two-column design with a colored sidebar and contact icons, a Word file with the name and contact details in the page header, a Word file laid out with a table, and an image-only PDF with no text layer.
        </p>
        <figure className="!my-8">
          <Image
            src="/guides/ats-friendly-resume-format/layouts.png"
            alt="Two of the six test resumes side by side. Left, a plain one-column resume for Alex Rivera, Marketing Manager, with Summary, Experience, Education and Skills headings. Right, the same resume as a two-column design with a dark blue sidebar holding contact details with icons, skills and education."
            width={1720}
            height={1115}
            sizes="(max-width: 800px) 100vw, 760px"
            className="w-full h-auto rounded-[12px] border border-border"
          />
          <figcaption className="text-[13px] mt-3">The plain one-column layout (left) and the two-column design (right). Both hold the same words.</figcaption>
        </figure>
        <p>Then we checked each file two ways:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-foreground">A real ATS.</strong> We uploaded each file to the resume autofill on a live Lever application form, on the careers page of Employ, the company that owns Lever, and recorded what it filled in. We never submitted an application.
          </li>
          <li>
            <strong className="text-foreground">Text extractors.</strong> We ran each file through Apache Tika, an open-source library that pulls text out of documents, and through the simplest readers we could find: pdftotext for PDFs and a Word reader that only reads body paragraphs. They show what a less capable parser gets from the same file.
          </li>
        </ul>
        <p>
          We tried other systems too. Greenhouse only parses the resume after you submit, or after you sign in to MyGreenhouse. Ashby&rsquo;s autofill said it had finished but filled nothing for any file on two employers&rsquo; forms in our automated browser, so we left it out. SmartRecruiters blocked the automated browser, and Workday needs an account for each employer.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Which resume formats did an ATS read?</h2>
        <div className="overflow-x-auto !mt-6">
          <table className="w-full text-[13.5px] border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-elevated">
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Format</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Lever autofill</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Apache Tika</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Simplest reader</th>
              </tr>
            </thead>
            <tbody>
              {RESULTS.map((row, i) => (
                <tr key={row.file} className={i % 2 === 0 ? 'bg-surface' : 'bg-elevated'}>
                  <td className="px-4 py-3 font-medium text-foreground border-b border-border">
                    <a href={`${FILES}/${row.file}`} className={LINK}>{row.format}</a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.lever}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.tika}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.simple}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px]">
          Tested October 31, 2026. Lever&rsquo;s 6 fields are full name, email, phone, location, current company and LinkedIn URL. Click a format to download the test file.
        </p>
        <p>
          Lever got every field right from every file, including the image-only PDF. A file with no text in it can only be read with optical character recognition (OCR), so Lever runs OCR on uploads. That&rsquo;s good news if your resume is a scan. But Lever&rsquo;s autofill only shows contact details and your current employer, so the test can&rsquo;t show how well it indexed the rest of the page for keyword search.
        </p>
        <figure className="!my-8">
          <Image
            src="/guides/ats-friendly-resume-format/lever-image-only.png"
            alt="Lever application form after uploading image-only.pdf. The upload shows Success, and the form is filled in with Full name Alex Rivera, Email alex.rivera@example.com, Phone 3125550142, Current location Chicago, IL, USA, and Current company Fernwood Labs."
            width={1200}
            height={1320}
            sizes="(max-width: 800px) 100vw, 760px"
            className="w-full h-auto rounded-[12px] border border-border"
          />
          <figcaption className="text-[13px] mt-3">Lever&rsquo;s form after we uploaded the image-only PDF. Every field is filled in, so Lever read the picture with OCR.</figcaption>
        </figure>

        <h2 className="text-[22px] text-foreground !mt-10">Which resume formats lose text?</h2>
        <p>
          <strong className="text-foreground">Images of text.</strong> The image-only PDF gave Tika and pdftotext 0 characters. This happens when a resume is exported as a picture from a design app, or scanned. Lever coped because it runs OCR. A parser that doesn&rsquo;t would see a blank page.
        </p>
        <p>
          <strong className="text-foreground">Contact details in the Word header.</strong> Tika read the header. The body-only Word reader started at &ldquo;Summary&rdquo;, so Alex&rsquo;s name, email, phone and LinkedIn were gone. Some resume templates put the name in the header to repeat it on every page.
        </p>
        <p>
          <strong className="text-foreground">Tables.</strong> The body-only reader got 0 characters from the table layout, because every word sat inside table cells. Tika read the cells in order.
        </p>
        <p>
          <strong className="text-foreground">Two columns.</strong> Every word came out, sidebar first and then the main column, which is a reasonable order. The narrow sidebar did damage two things. The LinkedIn link wrapped onto two lines and was read as two pieces, and pdftotext read the spaced-out headings as separate letters:
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
          For the last step, see our guides on{' '}
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
