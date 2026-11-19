import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import { GuideArticle, GuideFigure } from '@/components/site/GuideArticle'
import { EXAMPLE, Hl, Label } from '@/components/landing/visuals'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('tailor-resume-to-job-description')

export const metadata: Metadata = {
  title: 'Tailor Your Resume to a Job Description in 5 Steps',
  description: "How to tailor your resume to a job description in five steps: find the must-have keywords, use the posting's words, and never add skills you don't have.",
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'How to Tailor Your Resume to a Job Description | Cover Me',
    description: 'A step-by-step method for matching your resume to one role: which keywords matter, what to rewrite, and what never to add.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}/guides/tailor-resume-to-job-description.png`, width: 1600, height: 900, alt: "Two resume bullets rewritten in a job posting's words, with their real results kept" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Tailor Your Resume to a Job Description | Cover Me',
    description: 'A step-by-step method for matching your resume to one role: which keywords matter, what to rewrite, and what never to add.',
    images: [`${BASE}/guides/tailor-resume-to-job-description.png`],
  },
}

const STEPS = [
  {
    name: 'Find the 4 to 6 must-have keywords',
    text: 'Read the posting twice. Mark the hard skills, tools, and qualifications listed as required, repeated, or placed first. Recruiters filter the ATS by these terms, so they matter more than the long list of nice-to-haves.',
  },
  {
    name: "Use the posting's exact wording",
    text: 'ATS searches are often literal. If the posting says "React", write "React", not "modern JavaScript frameworks". If it says "stakeholder management", use those words, as long as they truthfully describe your experience.',
  },
  {
    name: 'Rewrite your most relevant bullets first',
    text: "You don't need to rewrite everything. Take the 4 to 6 bullets most relevant to this role and lead each one with a matched skill, keeping your real numbers and results. Recruiters skim from the top, so put your strongest matches early.",
  },
  {
    name: 'Reorder your skills section for the role',
    text: 'Move the skills this posting asks for to the front of your skills list, and cut skills that add noise for this application. Each must-have you really have should appear in your summary, your skills, and at least one bullet.',
  },
  {
    name: 'Check the match before you submit',
    text: "Score your tailored resume against the posting, either by checklist or with a tool that shows an ATS match score and lists the gaps. Fix what you truthfully can, and accept the gaps you can't.",
  },
]

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to tailor your resume to a job description',
  description: "A five-step method for matching your resume to one role: find the must-have keywords, use the posting's wording, rewrite the right bullets, reorder your skills, and check the match.",
  totalTime: 'PT20M',
  step: STEPS.map((s, i) => ({
    '@type': 'HowToStep',
    name: s.name,
    text: s.text,
    position: i + 1,
  })),
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Should I tailor my resume for every job application?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "For every role you want, yes. Recruiters search each posting's applicants separately, and Huntr's analysis of over 1.39 million applications found tailored resumes reached the interview stage 2.1 times as often as untailored ones. A tool like Cover Me makes it one click, which makes tailoring every application practical.",
      },
    },
    {
      '@type': 'Question',
      name: "Is it okay to add keywords I don't have experience with?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No. An invented keyword can get you past the ATS and then fail in the interview, and a discovered fabrication ends your candidacy. Tailoring means describing your real experience in the posting's language.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can AI tailor my resume automatically?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. The Cover Me Chrome extension reads the job posting you have open and rewrites your resume around the role's keywords without changing your job titles, employers, or dates. A check removes any skill or claim your original resume doesn't support. It shows a match score with the remaining gaps, and the result downloads as a PDF or Word file.",
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to tailor a resume?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Doing it well by hand takes long enough that most people stop after a few applications a day. Using ChatGPT, it took the developer of Cover Me about 12 minutes per application. Cover Me does the tailoring in one click, and a typical run takes about 30 seconds.',
      },
    },
  ],
}

function BulletRewrites() {
  return (
    <div className="flex flex-col gap-5 rounded-[12px] bg-white p-6 text-[15px] leading-[1.6] shadow-[0_20px_50px_-24px_rgba(30,27,75,0.25)] max-sm:p-4">
      <Label>Tailored for {EXAMPLE.role} at {EXAMPLE.company}</Label>
      {EXAMPLE.bullets.map(({ before, after: [a, k, b] }) => (
        <div key={k} className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Your bullet</Label>
            <p className="text-ink-2">{before}</p>
          </div>
          <div className="space-y-2">
            <Label>In the posting&rsquo;s words</Label>
            <p className="text-ink">{a}<Hl>{k}</Hl>{b}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          To tailor your resume to a job description, find the posting&rsquo;s 4 to 6 must-have keywords, use its exact wording wherever it truthfully describes your experience, rewrite your most relevant bullets to lead with those skills, and cut what doesn&rsquo;t serve the role. Never add a skill you don&rsquo;t have.
        </>
      }
      tldr={[
        "Find the posting's 4 to 6 must-have keywords and use its exact wording wherever it truthfully describes your experience.",
        "Rewrite your most relevant bullets to lead with those skills, and cut what doesn't serve the role.",
        "Never add a skill you don't have. In Huntr's analysis of 1.39 million applications, tailored resumes reached an interview 2.1 times as often.",
      ]}
      intro={
        <p>
          It matters because recruiters search their applicant tracking system for the posting&rsquo;s terms, so a strong candidate with an untailored resume often doesn&rsquo;t come up. Huntr analyzed over 1.39 million applications and found tailored resumes reached the interview stage{' '}
          <a href="https://huntr.co/research/job-search-trends-q2-2025" target="_blank" rel="noopener noreferrer">2.1 times as often</a>
          , 5.75% against 2.68%.
        </p>
      }
      sections={[
        {
          title: 'What are the steps to tailor a resume?',
          body: STEPS.map((s, i) => (
            <Fragment key={s.name}>
              <h3>
                <span className="mr-3 text-[11px] font-bold text-brand tracking-[0.08em]">{String(i + 1).padStart(2, '0')}</span>
                {s.name}
              </h3>
              <p>{s.text}</p>
              {i === 2 && (
                <GuideFigure caption="Three bullets from a sample resume, tailored to a sample Marketing Manager posting: each keeps its numbers and borrows the posting’s words.">
                  <BulletRewrites />
                </GuideFigure>
              )}
            </Fragment>
          )),
        },
        {
          title: 'What should you never add when tailoring?',
          body: (
            <>
              <p>
                Anything you can&rsquo;t back up. Rewriting &ldquo;built dashboards used by leadership&rdquo; as &ldquo;stakeholder reporting and data visualization&rdquo; is honest tailoring, because the experience is the same and only the wording changed. Adding &ldquo;Kubernetes&rdquo; because the posting wants it and you once watched a talk is fabrication. It passes the ATS, then costs you the interview, and sometimes an offer you already had.
              </p>
              <p>
                A practical test: could you talk about this bullet, as written, for two minutes in an interview? If not, leave it off the tailored resume.
              </p>
              <p>
                AI tools get this wrong often. When a posting asks for a certification or tool, chatbots tend to add it to your resume, so read every line they write before you send it.
              </p>
            </>
          ),
        },
        {
          title: 'Can you tailor a resume in one click?',
          body: (
            <>
              <p>
                Yes. Done well by hand, this method takes long enough that most people stop tailoring after a few applications a day. Using ChatGPT, it took me about 12 minutes per application, which is why I built <Link href="/">Cover Me (cover-me.dev)</Link>, an open-source Chrome extension that follows the same method.
              </p>
              <p>
                On a job posting, &ldquo;Tailor Resume to Job&rdquo; finds the role&rsquo;s keywords and rewrites your bullets, summary, and skills in the posting&rsquo;s language. Your job titles, employers, and dates stay as they are. Every skill the AI adds has to cite evidence from your resume, and a check removes any skill or claim your original doesn&rsquo;t support. You then see your <Link href="/guides/what-is-an-ats-score">ATS match score</Link> with each missing keyword listed, and you can download the result as a PDF or Word file. Upload your resume as a Word file and the tailored Word file keeps its own fonts and layout (beta); the <Link href="/guides/tailor-resume-in-word">Word formatting guide</Link> shows how.
              </p>
              <p>
                It works on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link>, and <Link href="/for/ashby">Ashby</Link>, and you can paste a posting from any other site. It&rsquo;s free and unlimited with your own Claude or OpenAI API key.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      howTo={howToJsonLd}
      cta={{
        title: 'Tailor your resume in one click',
        body: 'Keywords matched, score shown, gaps listed, and no invented skills.',
      }}
    />
  )
}
