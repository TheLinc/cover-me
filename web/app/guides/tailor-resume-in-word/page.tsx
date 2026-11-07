import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('tailor-resume-in-word')
const HERO_IMAGE = '/guides/tailor-resume-in-word.png'
const HERO_ALT =
  "A made-up Word resume for Alex Rivera after Cover Me tailored it to a sample Marketing Manager posting. The serif name, teal section rules, square bullets and right-aligned dates are the same as in the original file; the profile, bullets and skills line are rewritten. Labels read fonts kept, words rewritten and layout kept."
const FILES = '/guides/tailor-resume-in-word'
const SUMMARY = 'Change the words inside the paragraphs your resume already has, and leave the paragraphs alone. What breaks a Word design, how to tailor by hand, and a tested run with Cover Me.'

export const metadata: Metadata = {
  title: 'Tailor a Word Resume Without Losing Formatting',
  description: 'How to tailor a Word resume to a job without breaking its fonts and layout: what breaks it, how to edit it by hand, and a tested run with Cover Me.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'How to tailor your resume in Word without losing its formatting | Cover Me',
    description: SUMMARY,
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${HERO_IMAGE}`, width: 1600, height: 900, alt: 'A made-up Word resume tailored to a job posting with its fonts and layout unchanged' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to tailor your resume in Word without losing its formatting | Cover Me',
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
      name: 'Can AI tailor my resume without changing its format?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes, if it edits the text inside your Word file instead of rebuilding the resume. Cover Me does this when you upload a .docx: it rewrites your bullets, summary and skills line in place, and the Word download keeps your fonts, spacing and layout. The feature is in beta, and it tells you before you tailor how many bullets it can edit in place.",
      },
    },
    {
      '@type': 'Question',
      name: 'Does Cover Me keep the design of a PDF resume?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No. A PDF can't be edited in place, so a tailored resume from a PDF upload uses Cover Me's standard one-column layout. To keep your design, upload the Word file you made the PDF from. From Google Docs, use File, Download, Microsoft Word.",
      },
    },
    {
      '@type': 'Question',
      name: 'Why did a bold word in my bullet become plain after tailoring?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Cover Me puts each rewritten bullet into the formatting of the longest stretch of text in that bullet. A bullet that starts with a bold lead-in, like \"Growth:\" followed by plain text, comes back all plain. Bold the lead-in again in Word, or keep bullets in one formatting.",
      },
    },
  ],
}

function Figure({ src, alt, width, height, caption, narrow }: { src: string; alt: string; width: number; height: number; caption: string; narrow?: boolean }) {
  return (
    <figure className={narrow ? 'max-w-[340px] mx-auto' : '!my-8'}>
      <Image src={src} alt={alt} width={width} height={height} sizes={narrow ? '340px' : '(max-width: 800px) 100vw, 760px'} className="w-full h-auto rounded-[12px] border border-border" />
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
          How to tailor your resume in Word without losing its formatting
        </h1>
        <p className="text-[12px] text-muted-foreground">
          <time dateTime={guide.updated ?? guide.date}>Updated November 7, 2026</time> · Lincoln Laylor
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
          To tailor a Word resume without losing its formatting, change the words inside the paragraphs it already has and leave the paragraphs themselves alone. The design breaks when new text brings its own formatting, when one bullet is split across several lines, or when the resume is rebuilt in another tool&rsquo;s template. I tailored a made-up Word resume to a sample posting with Cover Me, and its fonts, spacing and layout came back unchanged.
        </p>
        <p>
          I build Cover Me, a Chrome extension that tailors resumes to job postings, so weigh what I say about it with that in mind. The resume, the person and the posting below are all made up. You can download{' '}
          <a href={`${FILES}/Alex_Rivera_Resume.docx`} className="text-brand-light hover:text-brand transition-colors">the sample resume</a> and try it yourself.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Why does tailoring break a Word resume&rsquo;s formatting?</h2>
        <p>
          Because the new words arrive with formatting of their own, or the resume gets rebuilt somewhere else. Three things cause most of it:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Pasting rewritten text from a chat window or web page. Word&rsquo;s paste keeps the source&rsquo;s font and size unless you tell it otherwise, so a pasted bullet can end up in a different font from the ones around it, with its own spacing.
          </li>
          <li>
            Bullets that aren&rsquo;t their own paragraph. If you pressed Shift+Enter to start a new line inside a bullet, a longer or shorter rewrite leaves stray line breaks, and the next bullet moves with it.
          </li>
          <li>
            Moving the resume into a resume builder. Builders lay your content out in their own templates. <a href="https://www.rezi.ai/ai-resume-builder" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">Rezi&rsquo;s builder page</a>, for example, says an imported resume&rsquo;s experience goes into a new Rezi document (checked November 7, 2026; see{' '}
            <Link href="/guides/cover-me-vs-rezi" className="text-brand-light hover:text-brand transition-colors">Cover Me vs Rezi</Link>). That works if you want a new design, but your own Word layout doesn&rsquo;t come with it.
          </li>
        </ul>

        <h2 className="text-[22px] text-foreground !mt-10">How do you tailor a Word resume by hand without breaking it?</h2>
        <p>
          Edit the text, not the structure. Work on a copy, type or paste plain text into the bullets you already have, and keep one bullet per paragraph.
        </p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Save a copy for the job with File, Save As, and work on that copy.</li>
          <li>Click inside a bullet and select its words, not the whole line with its bullet mark, then type the new wording over them. The new words take the bullet&rsquo;s formatting.</li>
          <li>If you paste, use the Paste Options button that appears after pasting and choose Keep Text Only. The text then matches the bullet you pasted into.</li>
          <li>Keep one bullet per paragraph. Press Enter between bullets, never Shift+Enter.</li>
          <li>To reorder bullets within a role, move whole paragraphs. Leave job titles, employers and dates alone.</li>
          <li>Check the page count before you send it. A rewrite that adds a few words to each bullet can push a one-page resume onto a second page.</li>
        </ol>
        <p>
          The <Link href="/guides/tailor-resume-to-job-description" className="text-brand-light hover:text-brand transition-colors">tailoring guide</Link> covers what to change in the words: which keywords to use from the posting, which bullets to rewrite, and what never to add.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What does Cover Me change in a Word file, and what does it keep?</h2>
        <p>
          It changes the text of your bullets, your summary and your skills line, inside the paragraphs that already hold them. Everything else in the file stays as it was: fonts, sizes, colors, spacing, margins, headings, bullet style, dates and contact details.
        </p>
        <Figure
          src={`${FILES}/before-after.png`}
          alt="The same made-up Word resume before and after Cover Me tailored it. Both have the same serif name, teal section rules, square bullets and right-aligned dates. After tailoring, the profile is rewritten and runs four lines instead of two, five of the seven bullets are reworded, the Juniper Labs bullets are in a new order, and the skills line starts with Campaign strategy, Paid media and SEO and adds Cost per lead and Email Marketing."
          width={1600}
          height={782}
          caption="Before and after, both opened in Word. The design is unchanged. The profile went from two lines to four, so the page count is worth checking."
        />
        <p>
          In my run, tailored to a sample Marketing Manager posting at a made-up company, Northwind, here is what changed:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Five of the 7 bullets were reworded, and the other two kept their words. The three bullets for the older role came back in a new order, with the Google Analytics reporting bullet first.</li>
          <li>The profile was rewritten around the posting&rsquo;s campaign, paid media and SEO work.</li>
          <li>The skills line was reordered to lead with the posting&rsquo;s skills, and two terms from the bullets were added: cost per lead and email marketing.</li>
          <li>HubSpot stayed off the resume. The posting asks for it, Alex&rsquo;s resume doesn&rsquo;t mention it, and Cover Me listed it as missing instead of adding it.</li>
        </ul>
        <p>
          There are limits. Cover Me finds each bullet by its text, so a bullet it can&rsquo;t find as its own paragraph stays as written. If it can&rsquo;t find at least 80% of your bullets, it doesn&rsquo;t edit the file and uses its standard layout instead. A rewritten bullet takes the formatting of the longest stretch of text in it, so a bold lead-in comes back plain.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">How do you keep your Word design in Cover Me?</h2>
        <p>
          Upload your resume as a Word file, leave &ldquo;Your design&rdquo; selected, and download the result as Word.
        </p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>On the Resume tab, upload your .docx. From Google Docs, use File, Download, Microsoft Word first.</li>
          <li>Cover Me checks the file and shows how many bullets it can tailor, whether it found a summary and what happens to your skills.</li>
          <li>Open a posting on a job site, or paste one in, and click Tailor Resume to Job.</li>
          <li>Click &ldquo;Word (your design)&rdquo;. The other button, &ldquo;PDF (Cover Me layout)&rdquo;, gives you the standard one-column layout instead.</li>
        </ol>
        <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1 !my-8">
          <Figure
            narrow
            src={`${FILES}/popup-design-check.png`}
            alt="The Cover Me popup's Resume tab after uploading Alex_Rivera_Resume.docx. Your design (Beta) is selected and reads: 7 of 7 bullets can be tailored, Summary: rewritten, Skills: reordered. Below it is the Cover Me layout option."
            width={760}
            height={1120}
            caption="The check after uploading the Word file."
          />
          <Figure
            narrow
            src={`${FILES}/popup-result.png`}
            alt="The Cover Me popup after tailoring for Marketing Manager, Demand Generation at Northwind. The ATS match is 78. Missing keywords include HubSpot or similar marketing automation platform and lifecycle email and nurture programs, plus 4 more. Buttons read Word (your design) and PDF (Cover Me layout)."
            width={760}
            height={1120}
            caption="The result: a 78 ATS match, with HubSpot listed as missing."
          />
        </div>
        <p>
          Tailoring took 22 seconds. Upload a PDF and you&rsquo;ll get the standard layout, since a PDF can&rsquo;t be edited in place.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Should you send the Word file or a PDF?</h2>
        <p>
          Either works if the layout is simple, so send what the application asks for. When I uploaded{' '}
          <Link href="/guides/ats-friendly-resume-format" className="text-brand-light hover:text-brand transition-colors">one resume in six formats</Link> to Lever, Workday, Ashby and SmartRecruiters, all four read the one-column Word file and the one-column PDF correctly. To send your own design as a PDF, open the tailored Word file and use File, Save As, PDF. Cover Me&rsquo;s PDF button uses its own layout.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Which Word layouts can&rsquo;t be tailored in place?</h2>
        <p>
          Anything that keeps a bullet from being its own normal paragraph. Cover Me shows these after the upload, so you can fix them in Word and upload again.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Bullets in text boxes stay as written. Move them into normal paragraphs.</li>
          <li>Bullets joined with Shift+Enter can&rsquo;t be found one by one. Put each on its own line with Enter.</li>
          <li>Skills in a table or spread over several lines are kept as written. A single line of skills gets reordered.</li>
          <li>Two columns, tables and text boxes get a warning: some application systems read them out of order, as the <Link href="/guides/ats-friendly-resume-format" className="text-brand-light hover:text-brand transition-colors">ATS format test</Link> showed.</li>
        </ul>
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
        <h2 className="text-[20px] text-foreground mb-2">Tailor your Word resume, keep your design</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[440px] mx-auto leading-[1.7]">
          Upload your .docx once, then tailor it to each posting you open. Free with your own API key, or 10 hosted generations to start, then 5 a week.
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
