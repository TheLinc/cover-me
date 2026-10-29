import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('cover-me-vs-chatgpt')
const HERO_IMAGE = '/guides/cover-me-vs-chatgpt.png'
const HERO_ALT =
  "Comparison of the steps for each application. In a chatbot: copy the posting into a chat, paste or upload your resume, ask for a tailored resume, ask again for a cover letter, then fix, format and export a PDF. In Cover Me: click Tailor Resume to Job on the posting, then Generate Cover Letter, and get a tailored resume, a cover letter and an ATS score."

export const metadata: Metadata = {
  title: { absolute: 'Cover Me vs ChatGPT for Cover Letters and Resumes' },
  description: "ChatGPT writes good cover letters if you paste in the posting and resume each time. Cover Me works from the posting and checks the result against your resume.",
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Cover Me vs ChatGPT for Cover Letters | Cover Me',
    description: 'What a cover letter extension does that a general chatbot leaves to you, compared honestly.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}/guides/cover-me-vs-chatgpt.png`, width: 1600, height: 900, alt: "Five chatbot steps per application compared with two clicks in Cover Me" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me vs ChatGPT for Cover Letters | Cover Me',
    description: 'What a cover letter extension does that a general chatbot leaves to you, compared honestly.',
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
        text: 'Yes, if you paste in the job description and your resume, prompt it carefully, and edit out the clichés. The writing can be as good as a dedicated tool. The cost is the manual work for every application, and generic output when you rush the prompt.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Cover Me cheaper than ChatGPT Plus?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'For cover letters and resume tailoring, yes. ChatGPT Plus is $20 a month. Cover Me is free with your own Claude or OpenAI API key, where you pay the provider for what you use. The hosted free plan gives 10 generations to start, then 5 a week, and Pro is $15 a month for up to 25 a day.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Cover Me use the same AI models as ChatGPT?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Cover Me uses Claude from Anthropic on the hosted plans. With your own key, you choose Claude or OpenAI, the company behind ChatGPT. The difference is the work around the model: reading the posting, using your saved resume, extracting ATS keywords, and checking that the output doesn't claim skills your resume lacks.",
      },
    },
    {
      '@type': 'Question',
      name: 'Will ChatGPT add skills I do not have to my resume?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "It can. When a posting asks for a skill, chatbots often add it to the tailored resume or letter, so you have to check every line. Cover Me removes any skill or claim your original resume doesn't support before you see the result.",
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; chatgpt: string }[] = [
  { feature: 'Reads the job posting', coverMe: 'Reads the open page when you click', chatgpt: 'You copy and paste it every time' },
  { feature: 'Knows your resume', coverMe: 'Uploaded once, used for every application', chatgpt: 'Paste or upload it again in each new chat' },
  { feature: 'ATS keyword matching', coverMe: 'Keywords pulled from the posting and worked in', chatgpt: 'Only if you ask for it' },
  { feature: 'Resume tailoring and match score', coverMe: 'One click, with a score out of 100 and every missing keyword', chatgpt: 'Needs detailed prompting, no consistent score' },
  { feature: 'Invented skills', coverMe: 'Removed by a check against your original resume', chatgpt: 'You have to catch them yourself' },
  { feature: 'Where it runs', coverMe: 'In the browser, on the job page', chatgpt: 'A separate tab' },
  { feature: 'Price', coverMe: 'Free with your own key, or 10 then 5 a week · Pro $15/mo for 25 a day', chatgpt: 'Free plan with limits · Plus $20/mo' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', chatgpt: 'No' },
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
        <h1 className="text-[clamp(30px,4.5vw,46px)] text-foreground leading-[1.02] mt-4 mb-4">
          Cover Me vs ChatGPT for cover letters
        </h1>
        <p className="text-[12px] text-muted-foreground">
          <time dateTime={guide.updated ?? guide.date}>Updated October 29, 2026</time> · Lincoln Laylor
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
          ChatGPT can write a good cover letter if you give it the job description, your resume, and a careful prompt, and repeat that for every application. Cover Me (cover-me.dev) is an open-source Chrome extension that does it in one click on the posting: it reads the page, uses the resume you uploaded once, works in the role&rsquo;s ATS keywords, and removes any skill your resume doesn&rsquo;t support.
        </p>
        <p>
          I build Cover Me, so weigh this comparison with that in mind. The trade-offs below are real, and for some people ChatGPT is enough.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What is the difference between Cover Me and ChatGPT?</h2>
        <p>
          The difference is the work around the model. Cover Me runs on Claude, or on your own OpenAI key if you prefer. With ChatGPT, each application means opening the posting, copying the description, switching tabs, pasting your resume again, writing the prompt, then fixing the clichés. When I tailored my own applications in ChatGPT it took{' '}
          <a href="https://dev.to/plain-stack/how-i-went-from-0-interviews-to-4-in-a-month-by-tailoring-every-application-1an4" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">about 12 minutes per application</a>
          , and the free plan&rsquo;s file upload limit cut off my resume uploads partway through a day of applying.
        </p>
        <p>
          Cover Me does those steps for you. It reads the posting, keeps your resume (encrypted on our server, or only in your browser with your own key), and runs the same cover letter prompt every time, with common AI clichés filtered out. Your thirtieth application of the week gets the same care as your first.
        </p>
        <p>
          The bigger difference shows up in resume tailoring. When a posting asks for a skill you lack, a chatbot will often add it anyway, so you have to read every line. Cover Me makes the AI cite resume evidence for every skill it adds, checks that evidence in code, and rewrites or reverts any bullet that claims more than your original.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Feature comparison</h2>
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

        <h2 className="text-[22px] text-foreground !mt-10">When is ChatGPT the better choice?</h2>
        <p>
          If you apply to one or two roles a month and like working on the letter in conversation, a chatbot is more flexible than an extension. You can ask follow-up questions, try different angles, and rewrite one paragraph at a time. If you already pay for Plus, it costs you nothing extra.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">When is Cover Me the better choice?</h2>
        <p>
          When you apply to several roles a day. The time per application then decides whether you tailor at all, and the steps a chatbot skips unless asked are the ones that get applications past screening: using the posting&rsquo;s <Link href="/guides/what-is-an-ats-score" className="text-brand-light hover:text-brand transition-colors">ATS keywords</Link>, <Link href="/guides/tailor-resume-to-job-description" className="text-brand-light hover:text-brand transition-colors">tailoring the resume itself</Link>, and scoring the match before you submit. Cover Me reads postings on <Link href="/for/linkedin" className="text-brand-light hover:text-brand transition-colors">LinkedIn</Link>, <Link href="/for/indeed" className="text-brand-light hover:text-brand transition-colors">Indeed</Link>, <Link href="/for/greenhouse" className="text-brand-light hover:text-brand transition-colors">Greenhouse</Link>, <Link href="/for/lever" className="text-brand-light hover:text-brand transition-colors">Lever</Link>, <Link href="/for/workday" className="text-brand-light hover:text-brand transition-colors">Workday</Link>, and <Link href="/for/ashby" className="text-brand-light hover:text-brand transition-colors">Ashby</Link>, and you can paste a posting from any other site.
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
        <h2 className="text-[20px] text-foreground mb-2">Try the one-click version</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          Free with your own API key, or 10 hosted generations to start, then 5 a week. No credit card required.
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
