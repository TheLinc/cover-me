import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle, GuideFigure } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('cover-me-vs-aiapply')
const HERO_IMAGE = '/guides/cover-me-vs-aiapply.png'
const HERO_ALT =
  "Comparison of how applications go out. AIApply: buy auto-apply credits, the AI writes the application, and it submits for you. Cover Me: click Tailor Resume to Job on a posting, read and edit the resume and letter, and submit it yourself."

export const metadata: Metadata = {
  title: { absolute: 'Cover Me vs AIApply: Auto-Apply or Tailored Applications' },
  description: "AIApply submits applications for you with paid credits. Cover Me tailors your resume and letter for the posting you have open, and you send it yourself.",
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Cover Me vs AIApply | Cover Me',
    description: 'Auto-apply compared with one-click applications you review first.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${HERO_IMAGE}`, width: 1600, height: 900, alt: "AIApply submits applications for you; with Cover Me you review and submit each one" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me vs AIApply | Cover Me',
    description: 'Auto-apply compared with one-click applications you review first.',
    images: [`${BASE}${HERO_IMAGE}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Does Cover Me auto-apply to jobs for me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No, on purpose. Cover Me writes a tailored cover letter and resume for the job posting you have open. You review, edit, and submit it yourself.',
      },
    },
    {
      '@type': 'Question',
      name: "Is AIApply's auto-apply worth it?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It depends on what you want more of. If you want the most applications sent for the least time, auto-apply does that. If you want more interviews from each application, a tailored application you have read and checked gives you a better chance, because nothing goes out with a claim you cannot back up.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is AIApply free like Cover Me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "AIApply has a limited free tier. Full access needs a paid Premium subscription, and auto-apply runs on credits sold in packs, such as 100 or 250. Its pricing page didn't list prices when we checked in October 2026. Cover Me is free with your own API key, free for 10 hosted generations to start and then 5 a week, or $15 a month for up to 25 a day, with every price public.",
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; aiapply: string }[] = [
  { feature: 'Submits applications for you', coverMe: 'No, you review and submit every one', aiapply: 'Yes, with paid auto-apply credits' },
  { feature: 'Where you find jobs', coverMe: 'Any posting you open on LinkedIn, Indeed, Greenhouse, Lever, Workday or Ashby, or paste', aiapply: 'Its own job search board' },
  { feature: 'Where it runs', coverMe: 'Browser extension, on the page you are viewing', aiapply: 'Separate web dashboard' },
  { feature: 'Resume tailoring', coverMe: 'One click, with an ATS match score and missing keywords shown before you use it', aiapply: 'Resumes tailored to each job description' },
  { feature: 'Invented skills', coverMe: 'A check removes skills your original resume does not support', aiapply: 'Not described on its pricing page' },
  { feature: 'Cover letter', coverMe: 'Written for the posting and editable before you send it', aiapply: 'Cover letter generator' },
  { feature: 'Interview help, job board, translator', coverMe: 'Not included, letters and resumes only', aiapply: 'Live interview coaching, job search board, resume translator' },
  { feature: 'Pricing', coverMe: 'Free with your own key, or 10 then 5 a week · Pro $15/mo for 25 a day, all public', aiapply: 'Premium subscription plus credit packs, prices not listed on its pricing page' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', aiapply: 'No' },
]

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      hero={{ src: HERO_IMAGE, alt: HERO_ALT }}
      lede={
        <>
          AIApply is a job search platform built around auto-apply: you buy credits and it submits applications for you with an AI-written resume and cover letter. Cover Me (cover-me.dev) is an open-source Chrome extension that writes a tailored resume and cover letter for the posting you have open, and shows them to you before anything is sent.
        </>
      }
      tldr={[
        "AIApply submits applications for you from its own job board, using paid auto-apply credits.",
        "Cover Me writes a tailored resume and cover letter for the posting you have open, and you read and send each one yourself.",
        "Cover Me's prices are public: a free plan, and Pro at $15 a month. AIApply's pricing page doesn't list its prices.",
      ]}
      intro={
        <p>
          I build Cover Me, so weigh this comparison with that in mind. The trade-off is real, and for some job searches AIApply&rsquo;s approach fits better.
        </p>
      }
      sections={[
        {
          title: 'What is the difference between Cover Me and AIApply?',
          body: (
            <>
              <p>
                AIApply is built for volume. It finds roles on its job board, tailors your materials, and submits applications for you, paid for with credit packs. You don&rsquo;t have to read each application that goes out under your name. If you treat the job search as a numbers game, that&rsquo;s a reasonable strategy.
              </p>
              <p>
                Cover Me stops one step earlier, on purpose. It writes the letter and the tailored, <Link href="/guides/what-is-an-ats-score">ATS-scored</Link> resume for the posting you&rsquo;re looking at, then hands them back to you to edit, copy, or download. You always submit the application yourself. Auto-apply is left out by design.
              </p>
            </>
          ),
        },
        {
          title: 'Feature comparison',
          body: (
            <>
              <GuideFigure caption="AIApply details are from its pricing page, checked October 2026.">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] bg-white text-[13.5px] border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-paper">
                      <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Feature</th>
                      <th className="text-left px-4 py-3 font-bold text-brand-light border-b border-border">Cover Me</th>
                      <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">AIApply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row, i) => (
                      <tr key={row.feature} className={i % 2 === 0 ? 'bg-surface' : 'bg-paper'}>
                        <td className="px-4 py-3 font-medium text-foreground border-b border-border">{row.feature}</td>
                        <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.coverMe}</td>
                        <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.aiapply}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </GuideFigure>
            </>
          ),
        },
        {
          title: 'When does AIApply make sense?',
          body: (
            <p>
              If you&rsquo;re applying broadly to roles you&rsquo;d be happy with and you&rsquo;d trade polish on each application for reach, auto-apply removes most of the repetitive work. AIApply also bundles a job board, live interview coaching, and a resume translator into one subscription, which helps if you want a single tool for the whole search.
            </p>
          ),
        },
        {
          title: 'When do reviewed, tailored applications win?',
          body: (
            <>
              <p>
                When each application counts. An AI-written resume or letter you never read can include a claim you can&rsquo;t back up in an interview, or read as generic to a hiring manager, and you only find out after it&rsquo;s sent. Reviewing each one also lets you fix what the AI got wrong before a recruiter sees it.
              </p>
              <p>
                Cover Me is for people who want AI to do the repetitive part, the copying and pasting, keyword matching, and blank-page start, while every submission stays their decision. Before you see a tailored resume, a check removes any skill or claim your original doesn&rsquo;t support. It works on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link>, and <Link href="/for/ashby">Ashby</Link>, and it&rsquo;s free to try with no credit packs to buy first.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Try applications you review first',
        body: 'Free with your own API key, or 10 hosted generations to start, then 5 a week. No credit packs and no credit card required.',
      }}
    />
  )
}
