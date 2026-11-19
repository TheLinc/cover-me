import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle, GuidePrompt } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('chatgpt-resume-prompts')
const POSTING_URL = 'https://careers.datadoghq.com/detail/8349721/?gh_jid=8349721'

export const metadata: Metadata = {
  title: 'ChatGPT Resume Prompts to Tailor Your Resume',
  description: 'Four tested ChatGPT and Claude prompts that tailor your resume to a job posting: keywords, summary, bullets, and a check for anything made up.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'ChatGPT Resume Prompts to Tailor Your Resume | Cover Me',
    description: 'Four prompts in order, each run in ChatGPT and Claude on a real posting, with the answers they gave.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'A check prompt catching a number the rewritten summary tied to the wrong result' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChatGPT Resume Prompts to Tailor Your Resume | Cover Me',
    description: 'Four prompts in order, each run in ChatGPT and Claude on a real posting, with the answers they gave.',
    images: [`${BASE}${guide.image}`],
  },
}

const PROMPTS = [
  {
    title: 'Pull the must-have keywords from the posting',
    prompt:
      "Here is a job posting. List the 6 must-have keywords a recruiter would search for: the hard skills, tools and qualifications that are required, repeated, or listed first. Use the posting's exact wording, and quote the line each one comes from. Then list up to 5 nice-to-have keywords on their own.\n\nJob posting:\n[PASTE THE JOB POSTING]",
    caption: "ChatGPT's answer, trimmed. Claude picked webinars where ChatGPT picked full-funnel campaigns, and kept closer to the posting's wording for the rest.",
    answer: `6 must-have keywords

1. Integrated Campaigns
“Build and run integrated campaign plans for one or more products, owning to the annual plan, tiered campaign calendar, budget, and pipeline forecast”

2. Demand Generation
“8+ years operating marketing lead/demand generation campaigns: webinars, advertising campaigns, ABM, etc.”

3. Full-Funnel Campaigns
“strategize and execute full-funnel campaigns for a portfolio of key products.”

4. Marketing Automation (Salesforce, Hubspot, Marketo)
“Experience working with CRM and marketing automation (Salesforce, Hubspot, Marketo, etc.), ad platforms, and BI tools […]”

5. Pipeline and Revenue Attribution
“Proven track record tying campaigns to pipeline and revenue […]”

6. AI Workflows
“Proven use cases with AI workflows to improve marketing efficiency and outcomes”

Up to 5 nice-to-have keywords
Account-Based Marketing (ABM), Product-Led Growth (PLG), Paid Social and Search, Webinars and Content Syndication, BI Tools (PowerBI, Tableau, Metabase)`,
    check: (
      <>
        Check each keyword against its quote. ChatGPT named number 5 &ldquo;Pipeline and Revenue Attribution&rdquo;, but the posting never says &ldquo;attribution&rdquo;. A recruiter searching the posting&rsquo;s words would search for &ldquo;pipeline&rdquo;.
      </>
    ),
  },
  {
    title: 'Rewrite your summary for the role',
    prompt:
      "Here is my resume. Rewrite my summary for this posting in 2 or 3 sentences. Use the must-have keywords only where my resume shows that experience, and keep my numbers exactly as they are. Don't add years, tools or skills my resume doesn't have. After the summary, list each must-have keyword you left out because my resume doesn't show it.\n\nResume:\n[PASTE YOUR RESUME]",
    caption: "Claude's answer, in full. ChatGPT's summary was close, and it named the same gaps: integrated campaigns, marketing automation, pipeline and AI workflows.",
    answer: `Rewritten summary

Marketing lead with seven years in B2B demand generation, planning campaigns across email, social and search. Managed a $1.2M paid media budget across four channels, cutting cost per lead 22% and growing qualified leads 38% in one year. Reports results in Google Analytics and coordinates product launches with sales, design and customer success.

Must-have keywords left out

integrated campaigns: Your resume describes campaigns across email, social and paid channels, but never calls them integrated campaigns or shows the 4-5 years of high-profile, multi-channel work the posting asks for. If that describes your work, you could add it with specifics.
webinars: Not on your resume.
CRM and marketing automation: Your resume lists only Google Analytics. No CRM or marketing automation platform is named.
pipeline: Your results are framed as qualified leads, cost per lead and conversion, not pipeline or revenue.
AI workflows: Not on your resume.`,
    check: (
      <>
        Read the list of what it left out before you read the summary. It tells you which gaps are real, and a gap you can fill truthfully is worth adding to your resume yourself. Then compare every number with your original. This summary has a mistake that prompt 4 catches.
      </>
    ),
  },
  {
    title: 'Rewrite the bullets for one role',
    prompt:
      "Now rewrite the bullets for my [JOB TITLE] role at [EMPLOYER]. Start each bullet with the strongest matching keyword from the posting, in the posting's words, where it's true. Keep every number and result exactly as it is. Don't change my job title, employer or dates, and don't merge, drop or add bullets. Show each one as Before and After.",
    caption: "ChatGPT's answer, without its closing notes. Claude put labels on three of its four bullets too.",
    answer: `Marketing Lead · Brightline · Mar 2021 – Present

1. Before: Led campaign strategy across email and social, growing qualified leads 38% in one year
After: Demand Generation: Led campaign strategy across email and social, growing qualified leads 38% in one year.

2. Before: Managed a $1.2M paid media budget across four channels and cut cost per lead 22%
After: Campaign Budgets: Managed a $1.2M paid media budget across four channels and cut cost per lead 22%.

3. Before: Grew organic traffic 64% with an SEO plan for the blog and product pages
After: SEO Strategy: Grew organic traffic 64% with an SEO plan for the blog and product pages.

4. Before: Ran A/B tests on landing pages that lifted sign-up conversion from 3.1% to 4.4%
After: Campaign Optimization: Ran A/B tests on landing pages that lifted sign-up conversion from 3.1% to 4.4%.`,
    check: (
      <>
        Both models mostly put a label in front of the bullet instead of rewriting it. A label like &ldquo;Demand Generation:&rdquo; reads as keyword stuffing to a recruiter. Work the keyword into the sentence instead, such as &ldquo;Led demand generation campaigns across email and social&rdquo;, and only where your resume backs it.
      </>
    ),
  },
  {
    title: 'Check that nothing was made up',
    prompt:
      "Check your new summary and bullets against my original resume. List every skill, tool, number or claim my original resume doesn't support, quote where you wrote it, and say what my resume actually says. If everything is supported, say so. Then give me the corrected summary and bullets.",
    caption: "Claude's answer, trimmed to the problems it found and the corrected summary. ChatGPT's check flagged “executing campaigns”, which goes beyond the resume's “plans campaigns”, and took it out. It missed that its summary credits the 38% to campaigns across email, social and search, when the resume says email and social.",
    answer: `Unsupported claims

1. Summary: "Managed a $1.2M paid media budget across four channels, cutting cost per lead 22% and growing qualified leads 38% in one year."
The problem is that I tied the 38% lead growth to the paid media budget.
Your resume says: "Led campaign strategy across email and social, growing qualified leads 38% in one year." The 38% belongs to your email and social campaign strategy.

2. Summary: "coordinates product launches with sales, design and customer success."
The problem is that I used the present tense, which implies this is current work at Brightline, and I left out the count.
Your resume says: "Coordinated three product launches with design, sales and customer success." This is from your earlier role at Juniper Labs (Jun 2018 – Feb 2021).

Corrected summary

Marketing lead with seven years in B2B demand generation, planning campaigns across email, social and search. Led campaign strategy across email and social that grew qualified leads 38% in one year, and managed a $1.2M paid media budget across four channels while cutting cost per lead 22%. Reports results in Google Analytics and previously coordinated three product launches with design, sales and customer success.`,
    check: (
      <>
        Don&rsquo;t skip this one. It found a real error: the summary from prompt 2 credited the 38% to the wrong work. A check in the same chat is still the model grading itself, so compare the final numbers with your resume once more before you send it.
      </>
    ),
  },
]

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to tailor your resume to a job posting with ChatGPT or Claude',
  description: 'Four prompts in order: pull the must-have keywords from the posting, rewrite the summary, rewrite the bullets for one role, and check that nothing was made up.',
  step: PROMPTS.map((p, i) => ({ '@type': 'HowToStep', position: i + 1, name: p.title, text: p.prompt })),
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the best ChatGPT prompt to tailor a resume?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Four short prompts in one chat work better than one long one: pull the posting's must-have keywords, rewrite the summary with only the keywords your resume backs, rewrite the bullets for one role while keeping every number, then ask it to check its rewrite against your original resume. The last step caught a real error when I tested these prompts.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can ChatGPT or Claude tailor my resume to a job posting?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Both listed the keywords the resume could not support instead of adding them. Both still made smaller mistakes, such as a number tied to the wrong result, so check the output against your original resume before you send it.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do these prompts work in Claude?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. I ran all four in ChatGPT and in Claude on the same resume and posting. The answers were close: they agreed on most keywords, wrote similar summaries, and both found a mistake in their own work in the last step.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to tailor a resume with ChatGPT?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "In my test Claude's four answers took 44 seconds and came to about 1,000 words, which is 4 to 5 minutes of reading. Copying the corrected text into your resume file and fixing its formatting comes on top of that, for every application.",
      },
    },
  ],
}

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          These four ChatGPT prompts tailor your resume to one job posting: pull the must-have keywords, rewrite your summary, rewrite the bullets for one role, and check that nothing was made up. They work the same in Claude. I ran each one in both, and the answers below are what came back.
        </>
      }
      tldr={[
        'Use four short prompts in one chat, in order, instead of one long prompt.',
        "Tell the model to use only what your resume shows, and to list the keywords it left out.",
        'Always run the last prompt. In my test it found a number the rewrite had tied to the wrong result.',
      ]}
      intro={
        <p>
          How I tested them: on November 18, 2026, I pasted a made-up resume (<a href="/guides/tailor-resume-in-word/Alex_Rivera_Resume.docx">Alex Rivera, a marketing lead</a>) and a real public posting, <a href={POSTING_URL} target="_blank" rel="noopener noreferrer">Datadog&rsquo;s Senior Demand Generation Marketing Manager</a>, into ChatGPT (logged out, on chatgpt.com) and Claude (Sonnet 5.5, through Anthropic&rsquo;s API). Each prompt went into the same chat as the one before it. The posting asks for things the resume doesn&rsquo;t have, such as Salesforce, webinars and 8 years of experience, which is the case where chatbots tend to make things up. The placeholders in brackets are what you replace.
        </p>
      }
      sections={[
        {
          title: 'The four prompts, with real answers',
          body: PROMPTS.map((p, i) => <GuidePrompt key={p.title} n={i + 1} {...p} />),
        },
        {
          title: 'What this costs for every application',
          body: (
            <>
              <p>
                The answers arrive fast. Claude took 44 seconds for all four, and ChatGPT answered each prompt I timed in 3 to 11 seconds. The time goes into the rest. You paste the posting and your resume in, read about 1,000 words of answers (4 to 5 minutes at an average pace), fix what the check finds, copy the new summary and bullets into your resume file, repair the formatting, and save a PDF. Then you do it again for the next posting, in a new chat.
              </p>
              <p>
                When I tailored my own applications in ChatGPT, a resume and a cover letter took{' '}
                <a href="https://dev.to/plain-stack/how-i-went-from-0-interviews-to-4-in-a-month-by-tailoring-every-application-1an4" target="_blank" rel="noopener noreferrer">about 12 minutes per application</a>
                . That&rsquo;s fine for a few roles a week. At several a day, it&rsquo;s the reason people stop tailoring. A cover letter is another set of prompts: see <Link href="/guides/chatgpt-cover-letter-prompts">ChatGPT cover letter prompts</Link>.
              </p>
            </>
          ),
        },
        {
          title: 'How Cover Me does the same steps',
          body: (
            <>
              <p>
                I build <Link href="/">Cover Me (cover-me.dev)</Link>, a Chrome extension that runs these steps from the posting page. You upload your resume once. On a posting, &ldquo;Tailor Resume to Job&rdquo; reads the page, finds the must-have and nice-to-have keywords, and rewrites your summary, bullets and skills in the posting&rsquo;s words. Your job titles, employers and dates stay as they are.
              </p>
              <p>
                Part of prompt 4 is built in: a skill the AI adds whose words aren&rsquo;t already in your resume or candidate context has to quote a phrase from them, code checks that the phrase is there, and a separate model call that sees only the skill and the quoted line confirms it shows the skill. Then you see an <Link href="/guides/what-is-an-ats-score">ATS match score</Link> with the keywords still missing, and you download a PDF or Word file. A Word upload keeps its own design (beta).
              </p>
              <p>
                ChatGPT and Claude can do this job well, as the answers above show. The difference is the copying and checking you do by hand. If you&rsquo;re deciding between a chatbot and a tool, <Link href="/guides/cover-me-vs-chatgpt">Cover Me vs ChatGPT</Link> compares them.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      howTo={howToJsonLd}
      cta={{
        title: 'Skip the copying for every application',
        body: 'Free with your own API key, or 10 hosted generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
