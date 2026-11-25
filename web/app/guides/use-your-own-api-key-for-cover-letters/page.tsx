import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { BrowserIcon, CloudIcon, LockSimpleIcon, SparkleIcon } from '@phosphor-icons/react/dist/ssr'
import { MODES } from '@/components/landing/privacy-modes'
import { GuideArticle, GuideFigure } from '@/components/site/GuideArticle'
import { cn } from '@/lib/utils'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('use-your-own-api-key-for-cover-letters')

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
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'Your resume and API key go from your browser straight to Anthropic or OpenAI, never to Cover Me' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Use your own OpenAI or Claude API key for cover letters | Cover Me',
    description: 'Unlimited cover letters and tailored resumes with your own API key, no account and no monthly fee.',
    images: [`${BASE}${guide.image}`],
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

function FlowNode({ icon, title, sub, dim }: { icon: ReactNode; title: string; sub: string; dim?: boolean }) {
  return (
    <div className={cn('flex w-[76px] shrink-0 flex-col items-center gap-2 text-center sm:w-[124px]', dim && 'opacity-40')}>
      <span className="flex size-14 items-center justify-center rounded-[16px] bg-panel text-ink">{icon}</span>
      <span className="text-[13px] font-semibold leading-[1.3] text-ink">{title}</span>
      <span className="-mt-1 text-[11px] leading-[1.35] text-subtle">{sub}</span>
    </div>
  )
}

const FlowLine = () => <div aria-hidden="true" className="mt-[27px] h-[2px] min-w-4 flex-1 bg-brand" />

function OwnKeyFlow() {
  return (
    <div className="flex flex-col gap-6 rounded-[12px] bg-white p-6 shadow-[0_20px_50px_-24px_rgba(30,27,75,0.25)] max-sm:p-4">
      <div aria-hidden="true" className="flex items-start">
        <FlowNode icon={<BrowserIcon size={26} />} title="Your browser" sub={MODES.byok.holds} />
        <FlowLine />
        <FlowNode
          icon={<span className="relative"><CloudIcon size={26} /><LockSimpleIcon size={12} weight="fill" className="absolute -bottom-1 -right-1.5" /></span>}
          title="Cover Me server"
          sub="Your resume skips it"
          dim
        />
        <FlowLine />
        <FlowNode icon={<SparkleIcon size={26} />} title={MODES.byok.ai} sub="Writes the letter" />
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-3">
        {MODES.byok.facts.map((f) => (
          <li key={f} className="rounded-[12px] bg-panel p-4 text-[13px] leading-[1.45] text-ink">
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          Cover Me (cover-me.dev) is an open-source Chrome extension that writes cover letters and tailors your resume with your own OpenAI or Claude API key. You get unlimited generations with no account and no monthly fee, you pay your AI provider for what you use, and your resume and key go only to that provider.
        </>
      }
      tldr={[
        "Cover Me can write cover letters and tailor your resume with your own OpenAI or Claude API key.",
        "It's unlimited, with no account and no monthly fee. You pay your AI provider for what you use, and your resume and key go only to that provider.",
        "You give up saving to an account: your history stays in the browser, and there's no applications board.",
      ]}
      intro={
        <p>
          I build Cover Me. This guide explains what bringing your own key means, how to set it up, and what you give up compared with a hosted plan.
        </p>
      }
      sections={[
        {
          title: 'What does “bring your own key” mean?',
          body: (
            <>
              <p>
                Most AI writing tools send your text to their own servers, call an AI model on their account, and charge you a subscription. With your own key, the tool uses your account at Anthropic or OpenAI instead. You pay the provider&rsquo;s per-token price directly, and the tool itself can be free.
              </p>
              <p>
                For a job search that means three things. There&rsquo;s no monthly fee and no cap on how many applications you tailor. You don&rsquo;t need an account with the tool. And your resume, which holds your work history and contact details, goes to one company you chose, under that company&rsquo;s API terms.
              </p>
            </>
          ),
        },
        {
          title: 'How do you set up your own key in Cover Me?',
          body: (
            <>
              <ol>
                {STEPS.map((s) => (
                  <li key={s.title}>
                    <strong>{s.title}.</strong> {s.body}
                  </li>
                ))}
              </ol>
              <p>
                Get a Claude key from the{' '}
                <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener noreferrer">Anthropic Console</a>{' '}
                or an OpenAI key from the{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>.
                Prices per token are on{' '}
                <a href="https://platform.claude.com/docs/en/about-claude/pricing" target="_blank" rel="noopener noreferrer">Anthropic&rsquo;s pricing page</a>{' '}
                and{' '}
                <a href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noopener noreferrer">OpenAI&rsquo;s pricing page</a>.
              </p>
            </>
          ),
        },
        {
          title: 'Which models does Cover Me use with your key?',
          body: (
            <>
              <p>
                With a Claude key, Cover Me writes letters, tailors resumes and runs its accuracy checks with Claude Sonnet 5.5, and reads your resume&rsquo;s structure with Claude Haiku 5.5. With an OpenAI key, it uses GPT-6.1 Sol for letters, tailoring and checks, and GPT-6 Luna to read your resume. OpenAI requests are sent with storage turned off, so OpenAI doesn&rsquo;t save them to your account&rsquo;s logs. OpenAI may still keep API data for abuse monitoring under its terms.
              </p>
              <p>
                Measured in October 2026, a cover letter takes about 20 seconds, and a letter plus a tailored resume about 30 seconds.
              </p>
            </>
          ),
        },
        {
          title: 'Where do your resume and key go?',
          body: (
            <>
              <p>
                The extension calls api.anthropic.com or api.openai.com directly from your browser. Cover Me&rsquo;s server never receives your resume or your key in this mode, and you can check that in the{' '}
                <a href="https://github.com/TheLinc/cover-me" target="_blank" rel="noopener noreferrer">source code</a>.
              </p>
              <GuideFigure caption="With your own key, your resume and key go from your browser straight to Claude or OpenAI and skip Cover Me’s server.">
                <OwnKeyFlow />
              </GuideFigure>
              <p>
                Your key is stored in the browser&rsquo;s extension storage, encrypted with AES-256-GCM through the Web Crypto API. The key that encrypts it is stored beside it, so this stops casual reads of the storage file but not someone with full access to your Chrome profile.
              </p>
              <p>
                Two things can reach Cover Me&rsquo;s server. Under Settings, &ldquo;Reading job pages&rdquo; sends the job page&rsquo;s address and a copy of the page to the server so it can read the posting, which lets job board changes be fixed without an extension update. The server deletes the copy once it&rsquo;s read. Turn the setting off and postings are read on your device only. While it&rsquo;s on, if the server can&rsquo;t read any page from a click, it counts each site&rsquo;s name and which part of the extension tried to read it, under a random ID. If a page can&rsquo;t be read, Request this site sends only the site&rsquo;s name, and Report bug sends the page&rsquo;s address, which part of the extension tried to read it, the error and the extension version. Each sends only when you press it.
              </p>
            </>
          ),
        },
        {
          title: 'What do you give up compared with a hosted plan?',
          body: (
            <>
              <p>
                You manage a provider account, billing and a key. Your history of letters and tailored resumes stays in the browser, up to your last 50 letters and 20 tailored resumes, because saving to an account is a hosted feature: a free account tracks every application on a board, and Pro also keeps the letters and resumes on any device. If you&rsquo;d rather skip the key, the hosted free plan gives 10 generations to start, then 5 a week, and Pro is $15 a month.
              </p>
              <p>
                Everything else is the same in both modes: the{' '}
                <Link href="/guides/what-is-an-ats-score">ATS score</Link>{' '}
                calculated from the posting&rsquo;s keywords, the check that removes skills your original resume doesn&rsquo;t support, and support for{' '}
                <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link> and <Link href="/for/ashby">Ashby</Link>, with paste for any other site. If you&rsquo;re weighing this against pasting into a chatbot with the same key, see{' '}
                <Link href="/guides/cover-me-vs-chatgpt">Cover Me vs ChatGPT</Link>.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Bring your own key',
        body: 'With your own Claude or OpenAI API key, cover letters and tailored resumes are unlimited. No account and no credit card.',
      }}
    />
  )
}
