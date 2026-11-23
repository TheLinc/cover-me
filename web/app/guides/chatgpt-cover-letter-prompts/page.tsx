import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle, GuidePrompt } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('chatgpt-cover-letter-prompts')
const POSTING_URL = 'https://careers.datadoghq.com/detail/8349721/?gh_jid=8349721'

export const metadata: Metadata = {
  title: 'ChatGPT Cover Letter Prompts, With Real Output',
  description: 'Four tested ChatGPT and Claude prompts that write a cover letter from your resume and the posting, strip the AI phrases, and check every claim.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'ChatGPT Cover Letter Prompts, With Real Output | Cover Me',
    description: 'Four prompts in order, each run in ChatGPT and Claude on a real posting, with the letters they wrote.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'A cover letter line before and after the prompt that strips AI phrases' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChatGPT Cover Letter Prompts, With Real Output | Cover Me',
    description: 'Four prompts in order, each run in ChatGPT and Claude on a real posting, with the letters they wrote.',
    images: [`${BASE}${guide.image}`],
  },
}

const PROMPTS = [
  {
    title: 'Pick what the employer cares about most',
    prompt:
      "Here is a job posting and my resume. Pick the 3 things this employer cares about most. For each one, quote the line of my resume that shows I've done it. If nothing in my resume shows one, say so instead of stretching another line to fit.\n\nJob posting:\n[PASTE THE JOB POSTING]\n\nResume:\n[PASTE YOUR RESUME]",
    caption: "Claude's answer, trimmed. ChatGPT folded the budget into its pipeline point and picked cross-functional product launches as its third.",
    answer: `1. Full-funnel integrated campaigns across paid, owned, and earned channels (partial match)
"Led campaign strategy across email and social, growing qualified leads 38% in one year"
This shows multi-channel campaign leadership with a measurable result. But it covers only email and social. Nothing in your resume mentions webinars, content syndication, events, ABM, or partnering with Product Marketing on messaging.

2. Tying campaigns to pipeline and revenue, and reporting it to leadership (not shown)
Nothing in your resume shows this. Your results are stated in qualified leads, cost per lead, traffic, and sign-up conversion, with no SQLs, pipeline, pipe-to-spend, or revenue. […] If you have pipeline or revenue numbers from Brightline, this is the most important thing to add.

3. Owning a budget and making trade-offs across channels (strong match)
"Managed a $1.2M paid media budget across four channels and cut cost per lead 22%"
This is your best line for this role. It shows budget ownership, allocation across channels, and an efficiency result.

Other gaps: The posting also asks for AI workflow/GTM tool experience, technical audience marketing, and 8+ years of experience. Your resume shows none of the first two and seven years of the third.`,
    check: (
      <>
        Check each rating against its quote. ChatGPT rated the same email and social line &ldquo;strong evidence&rdquo; for campaigns across webinars, events and content, then listed webinars as a gap later in the same answer. A letter built on a stretched match makes a claim you&rsquo;d have to defend in the interview.
      </>
    ),
  },
  {
    title: 'Write the letter from those points',
    prompt:
      'Write a cover letter for this role from those 3 points. Keep it under 250 words, in 3 short paragraphs. Open with why I want this role, not with "I am writing to apply". Use only facts from my resume and keep my numbers exactly. Sign it with my name.',
    caption: "ChatGPT's first draft, in full. Claude's draft opened with “I want this role because” and had neither “excited” line.",
    answer: `Dear Datadog Hiring Team,

Datadog’s focus on connecting product marketing, sales, and global marketing through integrated campaigns is exactly the kind of work I want to do. I’m excited by the opportunity to help drive product growth through coordinated, measurable demand generation programs.

As Marketing Lead at Brightline, I led campaign strategy across email and social, growing qualified leads 38% in one year. I also managed a $1.2M paid media budget across four channels and cut cost per lead 22%. My experience combines multi-channel campaign execution, budget ownership, and a focus on improving marketing performance. Previously, at Juniper Labs, I coordinated three product launches with design, sales and customer success, building experience working across teams to bring products to market.

I would welcome the opportunity to bring my campaign strategy, performance optimization, and cross-functional collaboration experience to Datadog. I’m excited about the possibility of contributing to campaigns that connect marketing efforts with meaningful business results.

Best regards,
Alex Rivera`,
    check: (
      <>
        Check that the numbers match your resume, then count the stock phrases. Every number here is right, but the draft says &ldquo;I&rsquo;m excited&rdquo; twice, and its last paragraph would fit any marketing job at any company.
      </>
    ),
  },
  {
    title: 'Strip the phrases that sound AI-written',
    prompt:
      'Edit the letter to remove phrases that sound AI-written: "I am excited", "I am writing to express", "passionate", "thrilled", "leverage", "proven track record", "dynamic", "fast-paced", "align with", "I believe", "Furthermore", "In today\'s", dashes used as commas, and any sentence that would fit any company. Replace each one with a plain sentence about this role. Don\'t add facts. Show only the final letter.',
    caption: "ChatGPT's edit, in full. Claude's edit kept its first draft's structure and tied each paragraph to a line of the posting.",
    answer: `Dear Datadog Hiring Team,

Datadog’s focus on integrated campaigns across product marketing, sales, and global marketing makes this role a strong next step for my experience in B2B demand generation. I’m interested in helping build campaigns that connect product initiatives with measurable lead growth and marketing performance.

At Brightline, I led campaign strategy across email and social, growing qualified leads 38% in one year. I also managed a $1.2M paid media budget across four channels and cut cost per lead 22%. At Juniper Labs, I coordinated three product launches with design, sales and customer success. These experiences have given me hands-on experience managing campaigns, budgets, and cross-functional launch activities.

I would bring this experience to Datadog's integrated campaigns, contributing to multi-channel execution, budget management, and collaboration across teams to support product growth.

Best regards,
Alex Rivera`,
    check: (
      <>
        Read it once more for lines that would fit any company. Both &ldquo;excited&rdquo; lines are gone, but the edit swapped &ldquo;My experience combines multi-channel campaign execution&rdquo; for &ldquo;These experiences have given me hands-on experience managing campaigns, budgets, and cross-functional launch activities&rdquo;, which is just as generic and repeats the sentences before it. Cut a line like that yourself.
      </>
    ),
  },
  {
    title: 'Check every claim against your resume',
    prompt:
      "Check the letter against my resume. List every skill, tool, number or claim my resume doesn't support, quote the sentence it's in, and say what my resume actually says. If everything is supported, say so. Then give me the corrected letter.",
    caption: "ChatGPT's answer, trimmed to what it flagged and the corrected letter. Claude's check cut “so I am used to reporting results to sales”, because the resume says Alex built a dashboard for sales, not that Alex reported to them.",
    answer: `The letter is largely supported by your resume. However, a few phrases go beyond what it explicitly establishes.

"integrated campaigns across product marketing, sales, and global marketing": Partially supported. You led campaigns across email and social and coordinated launches with design, sales and customer success. Global marketing and product marketing experience aren't stated.

"support product growth": Not explicitly established. Your resume documents product launches, SEO growth, and increased qualified leads, but doesn't directly claim responsibility for product growth.

Numbers check: All numbers used in the letter match your resume. No unsupported tools are mentioned.

Corrected cover letter

Dear Datadog Hiring Team,

Datadog’s focus on integrated campaigns across multiple channels and product launches makes this role a strong next step for my B2B demand generation experience. I’m interested in contributing to campaigns that generate qualified leads and improve marketing performance.

At Brightline, I led campaign strategy across email and social, growing qualified leads 38% in one year. I also managed a $1.2M paid media budget across four channels and cut cost per lead 22%. Previously, at Juniper Labs, I coordinated three product launches with design, sales and customer success. These responsibilities gave me experience managing campaign strategy, paid media budgets, and cross-functional product launch activities.

I would bring my experience in campaign execution, budget management, and performance optimization to Datadog's integrated campaigns. I look forward to contributing to the team's efforts across marketing channels and product launches.

Best regards,
Alex Rivera`,
    check: (
      <>
        Read the corrected letter too, because a fix can bring new filler. This one added &ldquo;I look forward to contributing to the team&rsquo;s efforts&rdquo;, the kind of stock closing prompt 3 tells the model to cut. The check also can&rsquo;t know what your resume leaves out: if you did work with product marketing, put it back in your own words.
      </>
    ),
  },
]

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to write a cover letter with ChatGPT or Claude',
  description: 'Four prompts in order: pick the three things the employer cares about, write the letter from them, strip the phrases that sound AI-written, and check every claim against your resume.',
  step: PROMPTS.map((p, i) => ({ '@type': 'HowToStep', position: i + 1, name: p.title, text: p.prompt })),
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is a good ChatGPT prompt for a cover letter?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Split it into four prompts in one chat. First ask which three things the employer cares about most, with a quote from your resume for each. Then ask for a letter under 250 words from those points, then an edit that removes the phrases that sound AI-written, then a check of every claim against your resume.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I make a ChatGPT cover letter not sound like AI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ask for an edit that names the phrases to remove, such as "I am excited", "passionate", "leverage" and "proven track record", and any sentence that would fit any company. In my test that removed the stock lines from the first draft, but the edit wrote a new generic sentence in place of an old one, so read the result yourself.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use Claude instead of ChatGPT for a cover letter?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. I ran the same four prompts in both. Claude's first draft had fewer stock phrases, and both checks found a claim the resume didn't support. Either works if you check the letter before you send it.",
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
          These four ChatGPT cover letter prompts write a letter from your resume and the job posting, then strip the phrases that make it sound AI-written and check every claim. They work the same in Claude. I ran each one in both, and the answers below are what came back.
        </>
      }
      tldr={[
        'Ask for the three points first, each backed by a line of your resume, then the letter.',
        'Name the AI phrases to cut, and ask for a plain sentence about the role in place of each one.',
        'Check every claim, and read the corrected letter too, since the fix can add new filler.',
      ]}
      intro={
        <p>
          How I tested them: on November 18, 2026, I pasted a made-up resume (<a href="/guides/tailor-resume-in-word/Alex_Rivera_Resume.docx">Alex Rivera, a marketing lead</a>) and a real public posting, <a href={POSTING_URL} target="_blank" rel="noopener noreferrer">Datadog&rsquo;s Senior Demand Generation Marketing Manager</a>, into ChatGPT (logged out, on chatgpt.com) and Claude (Sonnet 5.5, through Anthropic&rsquo;s API). Each prompt went into the same chat as the one before it. The placeholders in brackets are what you replace. To tailor the resume itself first, use the <Link href="/guides/chatgpt-resume-prompts">ChatGPT resume prompts</Link>.
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
                The waiting is short. Claude took 40 seconds for all four answers, and ChatGPT took 26. The rest is yours: paste in the posting and your resume, read about 1,000 words of answers (4 to 5 minutes at an average pace), cut what the edit missed, and copy the letter into a document. If you also tailor your resume, that&rsquo;s a second set of prompts and another 1,000 words for the same application.
              </p>
              <p>
                When I wrote my own applications in ChatGPT, a letter and a tailored resume took{' '}
                about 12 minutes per application. That&rsquo;s fine for a few roles a week, and it adds up fast at several a day.
              </p>
            </>
          ),
        },
        {
          title: 'How Cover Me does the same steps',
          body: (
            <>
              <p>
                I build <Link href="/">Cover Me (cover-me.dev)</Link>, a Chrome extension that writes the letter from the posting page. You upload your resume once. On a posting, &ldquo;Generate Cover Letter&rdquo; reads the page and writes from your resume and the posting, in about 20 seconds.
              </p>
              <p>
                Part of prompt 3 is built in, with the checking done in code. Every letter is scanned for stock AI words and clichés, generic openers like &ldquo;I am writing to apply&rdquo;, and passive closes. It also flags any dollar amount, percentage or figure of three digits or more that isn&rsquo;t in your resume, your candidate context or the posting. When it finds a problem, Cover Me sends the letter back to the model once with each one listed, and keeps the new version unless it has more.
              </p>
              <p>
                ChatGPT and Claude can write a good letter, as the answers above show. The difference is the copying and checking you do by hand. If you&rsquo;re deciding between a chatbot and a tool, <Link href="/guides/cover-me-vs-chatgpt">Cover Me vs ChatGPT</Link> compares them. For the written questions on the application form, see <Link href="/guides/how-to-answer-job-application-questions">how to answer job application questions</Link>.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      howTo={howToJsonLd}
      cta={{
        title: 'Get the letter without the prompts',
        body: 'Free with your own API key, or 10 hosted generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
