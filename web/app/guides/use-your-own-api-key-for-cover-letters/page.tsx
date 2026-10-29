import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('use-your-own-api-key-for-cover-letters')
const HERO_IMAGE = '/guides/use-your-own-api-key-for-cover-letters.png'
const HERO_ALT =
  "Diagram of Cover Me with your own API key. Your resume and API key stay in your browser, with the key stored encrypted, and go straight to your AI provider, Anthropic or OpenAI, using Claude Sonnet 5.5 or GPT-6.1 Sol. Cover Me's server never receives your resume or key. Optionally, a copy of the job page, not your resume, goes to Cover Me's server to read the posting."

export const metadata: Metadata = {
  title: 'Cover Letters With Your Own OpenAI or Claude Key',
  description: 'Cover Me writes cover letters and tailors resumes with your own OpenAI or Claude API key. Unlimited, no account, and your resume goes only to your provider.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Use your own OpenAI or Claude API key for cover letters | Cover Me',
    description: 'Unlimited cover letters and tailored resumes with your own API key, no account and no monthly fee.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${HERO_IMAGE}`, width: 1600, height: 900, alt: 'Your resume and API key go from your browser straight to Anthropic or OpenAI, never to Cover Me' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Use your own OpenAI or Claude API key for cover letters | Cover Me',
    description: 'Unlimited cover letters and tailored resumes with your own API key, no account and no monthly fee.',
    images: [`${BASE}${HERO_IMAGE}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Cover Me really free with my own API key?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Cover Me charges nothing in this mode and sets no limit on how many letters or tailored resumes you make. Your AI provider bills you for what you use at its published per-token prices, so the cost depends on how often you generate. You can see the usage on your Anthropic or OpenAI account.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is my API key safe in Cover Me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "The key is stored in your browser's extension storage, encrypted with AES-256-GCM, and it's only sent to Anthropic or OpenAI. The key that encrypts it is stored beside it, so this stops casual reads of the storage file but not someone with full access to your Chrome profile. You can set a spending limit on your provider account and revoke the key at any time.",
      },
    },
    {
      '@type': 'Question',
      name: 'Should I use Claude or OpenAI for cover letters in Cover Me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Both work. With Claude, Cover Me uses Claude Sonnet 5.5 for letters, tailoring and its accuracy checks, and Cover Me's automated output tests run on Claude, so that path is the one measured most. With OpenAI, it uses GPT-6.1 Sol at medium reasoning effort, which wrote a full letter in about 20 seconds in testing. Pick the provider you already have an account with.",
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need a Cover Me account to use my own key?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Install the extension, open Settings, click "I have an API key", pick Claude or OpenAI, paste your key and save. A Cover Me account is only for the hosted free plan and Pro.',
      },
    },
  ],
}

const STEPS: { title: string; body: string }[] = [
  { title: 'Get an API key', body: 'Create a key in the Anthropic Console or on the OpenAI Platform, and add billing there. Setting a monthly spending limit is a good idea.' },
  { title: 'Add it in Cover Me', body: 'Install the extension, open Settings and click "I have an API key". Choose Claude or OpenAI under AI Provider, paste the key and click Save Settings.' },
  { title: 'Upload your resume once', body: 'Upload a PDF, DOCX or TXT file. The text is pulled out on your device and kept in the browser.' },
  { title: 'Generate on any posting', body: 'Open a job posting and click Tailor Resume to Job or Generate Cover Letter. The request goes from your browser straight to your provider.' },
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
          How to use your own OpenAI or Claude API key for cover letters
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
          Cover Me (cover-me.dev) is an open-source Chrome extension that writes cover letters and tailors your resume with your own OpenAI or Claude API key. You get unlimited generations with no account and no monthly fee, you pay your AI provider for what you use, and your resume and key go only to that provider.
        </p>
        <p>
          I build Cover Me. This guide explains what bringing your own key means, how to set it up, and what you give up compared with a hosted plan.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What does &ldquo;bring your own key&rdquo; mean?</h2>
        <p>
          Most AI writing tools send your text to their own servers, call an AI model on their account, and charge you a subscription. With your own key, the tool uses your account at Anthropic or OpenAI instead. You pay the provider&rsquo;s per-token price directly, and the tool itself can be free.
        </p>
        <p>
          For a job search that means three things. There&rsquo;s no monthly fee and no cap on how many applications you tailor. You don&rsquo;t need an account with the tool. And your resume, which holds your work history and contact details, goes to one company you chose, under that company&rsquo;s API terms.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">How do you set up your own key in Cover Me?</h2>
        <ol className="list-decimal pl-6 space-y-3">
          {STEPS.map((s) => (
            <li key={s.title}>
              <strong className="text-foreground">{s.title}.</strong> {s.body}
            </li>
          ))}
        </ol>
        <p>
          Get a Claude key from the{' '}
          <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">Anthropic Console</a>{' '}
          or an OpenAI key from the{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">OpenAI Platform</a>.
          Prices per token are on{' '}
          <a href="https://platform.claude.com/docs/en/about-claude/pricing" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">Anthropic&rsquo;s pricing page</a>{' '}
          and{' '}
          <a href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">OpenAI&rsquo;s pricing page</a>.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Which models does Cover Me use with your key?</h2>
        <p>
          With a Claude key, Cover Me writes letters, tailors resumes and runs its accuracy checks with Claude Sonnet 5.5, and reads your resume&rsquo;s structure with Claude Haiku 4.5. With an OpenAI key, it uses GPT-6.1 Sol for letters, tailoring and checks, and GPT-6 Luna to read your resume. OpenAI requests are sent with storage turned off, so OpenAI doesn&rsquo;t save them to your account&rsquo;s logs. OpenAI may still keep API data for abuse monitoring under its terms.
        </p>
        <p>
          Measured in October 2026, a cover letter takes about 20 seconds, and a letter plus a tailored resume about 30 seconds.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Where do your resume and key go?</h2>
        <p>
          The extension calls api.anthropic.com or api.openai.com directly from your browser. Cover Me&rsquo;s server never receives your resume or your key in this mode, and you can check that in the{' '}
          <a href="https://github.com/TheLinc/cover-me" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">source code</a>.
        </p>
        <p>
          Your key is stored in the browser&rsquo;s extension storage, encrypted with AES-256-GCM through the Web Crypto API. The key that encrypts it is stored beside it, so this stops casual reads of the storage file but not someone with full access to your Chrome profile.
        </p>
        <p>
          One thing does reach Cover Me&rsquo;s server if you allow it. Under Settings, &ldquo;Reading job pages&rdquo; sends the job page&rsquo;s address and a copy of the page to the server so it can read the posting, which lets job board changes be fixed without an extension update. The server deletes the copy once it&rsquo;s read. Turn it off and postings are read on your device only.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What do you give up compared with a hosted plan?</h2>
        <p>
          You manage a provider account, billing and a key. Your history of letters and tailored resumes stays in the browser, up to your last 50 letters and 20 tailored resumes, because the Pro dashboard that saves every application is a hosted feature. If you&rsquo;d rather skip the key, the hosted free plan gives 10 generations to start, then 5 a week, and Pro is $15 a month.
        </p>
        <p>
          Everything else is the same in both modes: the{' '}
          <Link href="/guides/what-is-an-ats-score" className="text-brand-light hover:text-brand transition-colors">ATS score</Link>{' '}
          calculated from the posting&rsquo;s keywords, the check that removes skills your original resume doesn&rsquo;t support, and support for{' '}
          <Link href="/for/linkedin" className="text-brand-light hover:text-brand transition-colors">LinkedIn</Link>, <Link href="/for/indeed" className="text-brand-light hover:text-brand transition-colors">Indeed</Link>, <Link href="/for/greenhouse" className="text-brand-light hover:text-brand transition-colors">Greenhouse</Link>, <Link href="/for/lever" className="text-brand-light hover:text-brand transition-colors">Lever</Link>, <Link href="/for/workday" className="text-brand-light hover:text-brand transition-colors">Workday</Link> and <Link href="/for/ashby" className="text-brand-light hover:text-brand transition-colors">Ashby</Link>, with paste for any other site. If you&rsquo;re weighing this against pasting into a chatbot with the same key, see{' '}
          <Link href="/guides/cover-me-vs-chatgpt" className="text-brand-light hover:text-brand transition-colors">Cover Me vs ChatGPT</Link>.
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
        <h2 className="text-[20px] text-foreground mb-2">Bring your own key</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          With your own Claude or OpenAI API key, cover letters and tailored resumes are unlimited. No account and no credit card.
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
