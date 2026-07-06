import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('cover-me-vs-chatgpt')
const HERO_IMAGE = '/guides/cover-me-vs-chatgpt.png'
const HERO_ALT =
  'Infographic comparing Cover Me and ChatGPT for cover letters: Cover Me generates a letter in one click in about 5 seconds with ATS and resume tailoring built in, while ChatGPT requires copying, pasting, and prompting for 5–10 minutes per letter. The difference is workflow, not intelligence.'

export const metadata: Metadata = {
  title: 'Cover Me vs ChatGPT for Cover Letters — Honest Comparison',
  description: 'Can ChatGPT write a good cover letter? Yes — with manual work. Here’s what a purpose-built extension does differently: auto-reading postings, resume grounding, and ATS keyword matching.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Cover Me vs ChatGPT for Cover Letters — Cover Me',
    description: 'What a purpose-built extension does that a general chatbot can’t — an honest comparison.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}/guides/cover-me-vs-chatgpt.png`, width: 1672, height: 941, alt: 'Cover Me vs ChatGPT for cover letters — one-click workflow vs manual prompting' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me vs ChatGPT for Cover Letters — Cover Me',
    description: 'What a purpose-built extension does that a general chatbot can’t — an honest comparison.',
    images: [`${BASE}/guides/cover-me-vs-chatgpt.png`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Can ChatGPT write a good cover letter?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — if you paste in the job description and your resume, prompt it carefully, and edit out the clichés. The quality ceiling is similar to a purpose-built tool; the difference is the 5–10 minutes of manual work per application versus one click, and the risk of generic output if you rush the prompt.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Cover Me cheaper than ChatGPT Plus?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'For cover letters, yes. ChatGPT Plus costs $20/month. Cover Me is free with your own API key (you pay cents per letter directly to Anthropic or OpenAI), free for 10 hosted generations per day, or $4/month for unlimited hosted use.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Cover Me use the same AI models as ChatGPT?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Cover Me uses Claude (Anthropic) on the hosted tiers, and in BYOK mode you choose your own Claude or OpenAI API key. The differentiator isn’t the model — it’s the automation around it: scraping the posting, grounding the letter in your stored resume, ATS keyword extraction, and prompts tuned specifically for cover letters.',
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; chatgpt: string }[] = [
  { feature: 'Reads the job posting', coverMe: 'Automatic — scrapes the open page', chatgpt: 'Manual copy-paste every time' },
  { feature: 'Knows your resume', coverMe: 'Stored once, used every generation', chatgpt: 'Re-paste or re-upload per chat' },
  { feature: 'ATS keyword matching', coverMe: 'Extracted from the posting, woven in', chatgpt: 'Only if you prompt for it explicitly' },
  { feature: 'Resume tailoring + match score', coverMe: 'One click, scored with gap analysis', chatgpt: 'Not without elaborate prompting' },
  { feature: 'Where it runs', coverMe: 'In the browser, on the job page', chatgpt: 'Separate tab, constant switching' },
  { feature: 'Price', coverMe: 'Free (BYOK or 10/day) · $4/mo unlimited', chatgpt: 'Free tier limited · $20/mo Plus' },
  { feature: 'Open source', coverMe: 'Yes — MIT licensed, auditable', chatgpt: 'No' },
]

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
        <h1 className="text-[clamp(30px,4.5vw,46px)] font-extrabold tracking-[-1.8px] text-foreground leading-[1.02] mt-4 mb-4">
          Cover Me vs ChatGPT for cover letters
        </h1>
        <p className="text-[12px] text-muted-foreground">
          <time dateTime={guide.date}>Updated July 6, 2026</time> · Lincoln Laylor
        </p>
      </div>

      {/* Hero graphic */}
      <figure className="mb-12">
        <Image
          src={HERO_IMAGE}
          alt={HERO_ALT}
          width={1672}
          height={941}
          priority
          sizes="(max-width: 800px) 100vw, 760px"
          className="w-full h-auto rounded-[12px] border border-border"
        />
      </figure>

      <article className="space-y-5 text-[15.5px] text-muted-foreground leading-[1.85]">
        <p className="text-[17px] text-foreground font-medium leading-[1.7]">
          ChatGPT can write a decent cover letter if you feed it the job description, your resume, and a careful prompt — and repeat that for every application. Cover Me is a Chrome extension that does the same job in one click on the posting itself: it reads the page, already knows your resume, extracts the role&rsquo;s ATS keywords, and generates a tailored letter in about 10 seconds.
        </p>
        <p>
          This is an honest comparison — we build Cover Me, but the trade-offs below are real, and for some people ChatGPT is genuinely enough.
        </p>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">The core difference: workflow, not intelligence</h2>
        <p>
          Both tools sit on the same generation of AI models — Cover Me runs on Claude (or your own OpenAI key in BYOK mode). The difference is everything around the model. With ChatGPT, each application means: open the posting, copy the description, switch tabs, re-establish context (&ldquo;here&rsquo;s my resume, here&rsquo;s the job, write a letter that…&rdquo;), generate, then fix the clichés. Five to ten minutes when you&rsquo;re careful; generic output when you&rsquo;re not.
        </p>
        <p>
          Cover Me collapses that loop into a click because it&rsquo;s purpose-built: the scraper reads the posting, your resume is stored (encrypted, or fully on-device in BYOK mode), and the prompt — purpose-built for cover letters, with explicit bans on AI-tell phrases like &ldquo;I&rsquo;m excited to apply&rdquo; — is applied consistently every time. Application #30 of the week gets the same quality as application #1.
        </p>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">Feature comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px] border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-elevated">
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Feature</th>
                <th className="text-left px-4 py-3 font-bold text-brand-light border-b border-border">Cover Me</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">ChatGPT</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? 'bg-surface' : 'bg-elevated'}>
                  <td className="px-4 py-3 font-medium text-foreground border-b border-border">{row.feature}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.coverMe}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.chatgpt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">When ChatGPT is the right choice</h2>
        <p>
          If you apply to one or two roles a month and enjoy iterating on the letter conversationally, a chatbot is flexible in ways an extension isn&rsquo;t — you can ask follow-ups, explore angles, and rewrite paragraphs interactively. You already pay for Plus? The marginal cost is zero.
        </p>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">When a purpose-built tool wins</h2>
        <p>
          Volume and consistency. If you&rsquo;re applying to multiple roles a day, the per-application overhead is the whole game — and the things a chatbot won&rsquo;t do without prompting are exactly the things that get applications past screening: mirroring the posting&rsquo;s <Link href="/guides/what-is-an-ats-score" className="text-brand-light hover:text-brand transition-colors">ATS keywords</Link>, <Link href="/guides/tailor-resume-to-job-description" className="text-brand-light hover:text-brand transition-colors">tailoring the resume itself</Link>, and scoring the match before you submit. Cover Me also works on <Link href="/for/linkedin" className="text-brand-light hover:text-brand transition-colors">LinkedIn</Link>, <Link href="/for/indeed" className="text-brand-light hover:text-brand transition-colors">Indeed</Link>, <Link href="/for/greenhouse" className="text-brand-light hover:text-brand transition-colors">Greenhouse</Link>, <Link href="/for/lever" className="text-brand-light hover:text-brand transition-colors">Lever</Link>, <Link href="/for/workday" className="text-brand-light hover:text-brand transition-colors">Workday</Link>, and <Link href="/for/ashby" className="text-brand-light hover:text-brand transition-colors">Ashby</Link> without leaving the page.
        </p>
      </article>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] mb-4">Frequently asked questions</h2>
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
        <h2 className="text-[20px] font-bold text-foreground tracking-[-0.4px] mb-2">Try the one-click version</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          Free with your own API key or 10 hosted generations a day. No credit card required.
        </p>
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-brand text-white font-semibold text-[14px] px-5 py-2.5 rounded-[8px] hover:bg-brand/90 transition-colors"
        >
          Install free · Chrome
        </a>
      </div>
    </main>
  )
}
