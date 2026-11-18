import type { Metadata } from 'next'
import Link from 'next/link'
import { ComparisonTable, GuideArticle } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

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

const COMPARISON: { feature: string; coverMe: string; them: string }[] = [
  { feature: 'Reads the job posting', coverMe: 'Reads the open page when you click', them: 'You copy and paste it every time' },
  { feature: 'Knows your resume', coverMe: 'Uploaded once, used for every application', them: 'Paste or upload it again in each new chat' },
  { feature: 'ATS keyword matching', coverMe: 'Keywords pulled from the posting and worked in', them: 'Only if you ask for it' },
  { feature: 'Resume tailoring and match score', coverMe: 'One click, with a score out of 100 and every missing keyword', them: 'Needs detailed prompting, no consistent score' },
  { feature: 'Invented skills', coverMe: 'Removed by a check against your original resume', them: 'You have to catch them yourself' },
  { feature: 'Where it runs', coverMe: 'In the browser, on the job page', them: 'A separate tab' },
  { feature: 'Price', coverMe: 'Free with your own key, or 10 then 5 a week · Pro $15/mo for 25 a day', them: 'Free plan with limits · Plus $20/mo' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', them: 'No' },
]

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      hero={{ src: HERO_IMAGE, alt: HERO_ALT }}
      lede={
        <>
          ChatGPT can write a good cover letter if you give it the job description, your resume, and a careful prompt, and repeat that for every application. Cover Me (cover-me.dev) is an open-source Chrome extension that does it in one click on the posting: it reads the page, uses the resume you uploaded once, works in the role&rsquo;s ATS keywords, and removes any skill your resume doesn&rsquo;t support.
        </>
      }
      tldr={[
        "ChatGPT can write a good cover letter, but you paste the posting and your resume into every new chat and check the result yourself.",
        "Cover Me reads the posting when you click, uses the resume you uploaded once, and removes any skill your resume doesn't support.",
        "ChatGPT has a free plan and Plus at $20 a month. Cover Me has a free plan, and Pro is $15 a month.",
      ]}
      intro={
        <p>
          I build Cover Me, so weigh this comparison with that in mind. The trade-offs below are real, and for some people ChatGPT is enough.
        </p>
      }
      sections={[
        {
          title: 'What is the difference between Cover Me and ChatGPT?',
          body: (
            <>
              <p>
                The difference is the work around the model. Cover Me runs on Claude, or on your own OpenAI key if you prefer. With ChatGPT, each application means opening the posting, copying the description, switching tabs, pasting your resume again, writing the prompt, then fixing the clichés. When I tailored my own applications in ChatGPT it took{' '}
                <a href="https://dev.to/plain-stack/how-i-went-from-0-interviews-to-4-in-a-month-by-tailoring-every-application-1an4" target="_blank" rel="noopener noreferrer">about 12 minutes per application</a>
                , and the free plan&rsquo;s file upload limit cut off my resume uploads partway through a day of applying.
              </p>
              <p>
                Cover Me does those steps for you. It reads the posting, keeps your resume (encrypted on our server, or only in your browser with your own key), and runs the same cover letter prompt every time, with common AI clichés filtered out. Your thirtieth application of the week gets the same care as your first.
              </p>
              <p>
                The bigger difference shows up in resume tailoring. When a posting asks for a skill you lack, a chatbot will often add it anyway, so you have to read every line. Cover Me makes the AI cite resume evidence for every skill it adds, checks that evidence in code, and rewrites or reverts any bullet that claims more than your original.
              </p>
            </>
          ),
        },
        {
          title: 'Feature comparison',
          body: (
            <ComparisonTable name="ChatGPT" rows={COMPARISON} caption="Cover Me and ChatGPT compared feature by feature, from reading the posting to price." />
          ),
        },
        {
          title: 'When is ChatGPT the better choice?',
          body: (
            <>
              <p>
                If you apply to one or two roles a month and like working on the letter in conversation, a chatbot is more flexible than an extension. You can ask follow-up questions, try different angles, and rewrite one paragraph at a time. If you already pay for Plus, it costs you nothing extra.
              </p>
              <p>
                To do it in ChatGPT or Claude, start with tested prompts: the <Link href="/guides/chatgpt-resume-prompts">ChatGPT resume prompts</Link> and the <Link href="/guides/chatgpt-cover-letter-prompts">ChatGPT cover letter prompts</Link> show each prompt with the answer it gave on a real posting.
              </p>
            </>
          ),
        },
        {
          title: 'When is Cover Me the better choice?',
          body: (
            <p>
              When you apply to several roles a day. The time per application then decides whether you tailor at all, and the steps a chatbot skips unless asked are the ones that get applications past screening: using the posting&rsquo;s <Link href="/guides/what-is-an-ats-score">ATS keywords</Link>, <Link href="/guides/tailor-resume-to-job-description">tailoring the resume itself</Link>, and scoring the match before you submit. Cover Me reads postings on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link>, and <Link href="/for/ashby">Ashby</Link>, and you can paste a posting from any other site.
            </p>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Try the one-click version',
        body: 'Free with your own API key, or 10 hosted generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
