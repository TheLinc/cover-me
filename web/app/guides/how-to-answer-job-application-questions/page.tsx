import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle, GuideFigure, ext } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'
import { PLAN_LIMITS as L } from '@/lib/limits'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('how-to-answer-job-application-questions')

const SOURCES = {
  zapier: 'https://www.huffingtonpost.co.uk/entry/recruiters-job-application-chatgpt_l_6723b4e1e4b0871068fe81ad',
  civilService: 'https://www.civil-service-careers.gov.uk/artificial-intelligence-and-recruitment/',
  newYork: 'https://www.ny.gov/salary-history-ban/salary-history-ban-what-you-need-know',
  california: 'https://women.ca.gov/californiapayequity/employers-resources/guidance-for-employers-on-starting-compensation',
  washington: 'https://app.leg.wa.gov/RCW/default.aspx?cite=49.58.100',
  ranges: 'https://business.columbia.edu/faculty/research/tandem-anchoring-informational-and-politeness-effects-range-offers-social-exchange',
}

export const metadata: Metadata = {
  title: 'Why Are You Interested in This Position? Sample Answers',
  description: 'How to answer "Why are you interested in this position?", "Why do you want to work here?" and three more job application questions, with a sample answer for each.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Why Are You Interested in This Position? Sample Answers | Cover Me',
    description: 'What the employer checks for in five written application questions, how to answer from your resume and the posting, and a sample answer for each.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'A sample answer to "Why are you interested in this position?" built from one line of the posting and one result from the resume' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Why Are You Interested in This Position? Sample Answers | Cover Me',
    description: 'What the employer checks for in five written application questions, how to answer from your resume and the posting, and a sample answer for each.',
    images: [`${BASE}${guide.image}`],
  },
}

function Sample({ children }: { children: string }) {
  return (
    <GuideFigure caption={`Sample answer for Alex Rivera, a made-up applicant, to a made-up Northwind posting. ${children.length} characters.`}>
      <p className="!m-0 rounded-[12px] bg-white p-5 text-[15px] leading-[1.65] text-ink max-sm:p-4">{children}</p>
    </GuideFigure>
  )
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do you answer "Why are you interested in this position?"',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Name one part of the job, in the posting\'s words, in your first sentence. Then give one result from your resume that shows you have done that work, and say how the two connect. Leave out praise for the company\'s mission. Three or four sentences is enough for most form boxes.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do you answer "Why do you want to work here?"',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Give a reason about this company that wouldn't fit any other: what it sells, who its customers are, or a problem the posting says it has. Then tie it to one thing you have done. If the only reason you can find is the mission statement, write about the job instead.",
      },
    },
    {
      '@type': 'Question',
      name: 'How do you answer "Tell us about yourself" on a job application?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Write three or four sentences: what you do now and for how long, one result that matches the posting, and why you are applying for this job. Skip your life story and anything already in the fields above it, such as your address or school.',
      },
    },
    {
      '@type': 'Question',
      name: 'What should you put for desired salary on a job application?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Check the posting for a pay range first. California, Colorado, Washington, British Columbia and Ontario are among the places that require one. Give a range whose bottom is the figure you want, such as $90,000 to $100,000. If the field takes only a number, put your target. An employer asking for your desired salary is not asking for your current pay, and some places, including California, New York and Washington, bar employers from asking for pay history.',
      },
    },
    {
      '@type': 'Question',
      name: 'What should you put for reason for leaving on a job application?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'One true sentence about what you want next, not about what went wrong. If you are still employed, say so. If you were laid off, say "position eliminated" or "laid off" plainly. Don\'t criticize a past employer, since the reader can only hear one side.',
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
          The written questions on a job application are short, and the people reading them have read the same few answers many times. Below are five of the most common, what the employer is checking for in each, how to answer from your resume and the posting, and a sample answer.
        </>
      }
      tldr={[
        'Answer the question in your first sentence, then back it with one real result from your resume.',
        "Use the posting's own words for what the job is, and your resume for what you've done. Don't praise the company's mission.",
        'Salary, start date and reason for leaving are facts only you know. Keep those answers to one or two sentences.',
      ]}
      intro={
        <p>
          The sample answers are mine, written by hand for Alex Rivera, a made-up marketing lead whose resume is the same one used in <Link href="/guides/tailor-resume-in-word">the Word tailoring guide</Link>. The posting is made up too: a Marketing Manager role in Denver at Northwind, which sells scheduling software to independent clinics. It asks for someone to own campaign strategy across email and social, manage a $1.2M budget and report results in Google Analytics, and lists a pay range of $80,000 to $100,000. Your answers should use your own facts, not these.
        </p>
      }
      sections={[
        {
          title: 'Why are you interested in this position?',
          body: (
            <>
              <p>
                This is the question applicants most often get wrong in the same way. A recruiting manager at Zapier told{' '}
                <a href={SOURCES.zapier} {...ext}>HuffPost UK</a> that many applicants answered it with the same template, starting &ldquo;Company&rsquo;s mission of &lsquo;insert mission statement&rsquo; resonates with me&rdquo;, and that once it repeats, &ldquo;it becomes obvious they all plugged this into the same tool.&rdquo;
              </p>
              <h3>What the employer is checking</h3>
              <p>
                Whether you know what the job is, and whether you&rsquo;ve done that kind of work. The UK Civil Service, which publishes how it reads applications, says a good one shows{' '}
                <a href={SOURCES.civilService} {...ext}>&ldquo;how your skills and experience align with the role&rdquo; and &ldquo;what motivates you to do your best work&rdquo;</a>.
              </p>
              <h3>How to answer</h3>
              <ol>
                <li>Pick the one part of the job you most want to do, and name it in the posting&rsquo;s words in your first sentence.</li>
                <li>Find one result on your resume that shows you&rsquo;ve done that part already. Use its real number.</li>
                <li>Say in one sentence how the two connect. Stop there. A form box is not a cover letter.</li>
              </ol>
              <Sample>
                This role puts campaign strategy and the paid budget with one person, and that&apos;s the part of my work I want more of. At Brightline I led campaign strategy across email and social that grew qualified leads 38% in one year, and I manage a $1.2M paid media budget across four channels, where I cut cost per lead 22%. Your posting asks for both, at the same budget size.
              </Sample>
              <p>
                It never says &ldquo;passionate&rdquo; or praises Northwind. The reason is in the first sentence, and the two numbers are what make it believable.
              </p>
            </>
          ),
        },
        {
          title: 'Why do you want to work here?',
          body: (
            <>
              <p>
                It sounds like the same question, and many applications ask only one of the two. The difference is the subject: the first is about the job, this one is about the company.
              </p>
              <h3>What the employer is checking</h3>
              <p>
                Whether you picked this company or would send the same answer anywhere. A reason that fits any company tells them the second.
              </p>
              <h3>How to answer</h3>
              <ol>
                <li>Find something specific to this company: what it sells, who buys it, or a problem the posting says it has. The posting and the company&rsquo;s own product pages are enough. You don&rsquo;t need inside knowledge.</li>
                <li>Say why that matters to you, in your first sentence.</li>
                <li>Back it with one thing you&rsquo;ve done that fits.</li>
              </ol>
              <Sample>
                Northwind sells to independent clinics, where one or two people decide what to buy, and I want to market to buyers I can reach directly through email and search. That&apos;s where I&apos;ve had my best results: at Brightline, an SEO plan for the blog and product pages grew organic traffic 64%. I&apos;m also in Denver, so the office days are easy for me.
              </Sample>
              <p>
                If the only reason you can find is the company&rsquo;s mission statement, write about the job instead. A true answer about the work reads better than borrowed praise.
              </p>
            </>
          ),
        },
        {
          title: 'Tell us about yourself',
          body: (
            <>
              <p>
                On a form, this isn&rsquo;t the two-minute spoken version. The reader has your resume open beside it.
              </p>
              <h3>What the employer is checking</h3>
              <p>Whether you can pick the parts of your background that matter for this job, and say them briefly.</p>
              <h3>How to answer</h3>
              <p>
                Three or four sentences: what you do now and for how long, one result that matches the posting, and why you&rsquo;re applying. Leave out anything already in the form, such as your school or address.
              </p>
              <Sample>
                I&apos;m a marketing lead with seven years in B2B demand generation, now at Brightline in Denver. I plan campaigns across email, social and search, and I manage a $1.2M paid media budget, where I cut cost per lead 22%. I&apos;m applying because this role owns the same channels and budget, and I&apos;d like to bring them to a product for clinics.
              </Sample>
            </>
          ),
        },
        {
          title: 'Desired salary',
          body: (
            <>
              <p>
                Look for a pay range in the posting before you type anything. California, Colorado, Washington, British Columbia and Ontario are among the places that now require one, and an answer inside it is the easy case.
              </p>
              <h3>What the employer is checking</h3>
              <p>
                Whether you fit the budget for the role. It&rsquo;s a question about what you want, not what you earn now. New York&rsquo;s guidance says{' '}
                <a href={SOURCES.newYork} {...ext}>&ldquo;An employer may ask an applicant for their salary expectations for the position&rdquo;</a>, while the same law bars asking for pay history. California and Washington have similar bans (<a href={SOURCES.california} {...ext}>California</a>, <a href={SOURCES.washington} {...ext}>Washington</a>).
              </p>
              <h3>How to answer</h3>
              <ul>
                <li>Give a range whose bottom is the figure you actually want. In five negotiation experiments, opening with a range like that got better final terms than a single number, as long as the range wasn&rsquo;t too wide (<a href={SOURCES.ranges} {...ext}>Ames and Mason, 2015</a>). Those were negotiations, not application forms, so treat it as a guide.</li>
                <li>If the field takes only a number, put your target.</li>
                <li>If it asks for your current salary, you can answer with your expectations instead. Where the law allows the question, sharing your pay history is your choice.</li>
              </ul>
              <Sample>
                $90,000 to $100,000, depending on the full benefits package. That sits in the upper half of the range in your posting.
              </Sample>
            </>
          ),
        },
        {
          title: 'Reason for leaving',
          body: (
            <>
              <p>
                Applications ask this for your current job and sometimes for each past one. It has the shortest good answer of the five.
              </p>
              <h3>What the employer is checking</h3>
              <p>Whether something went wrong that could go wrong again, and whether you&rsquo;ll talk about a past employer badly.</p>
              <h3>How to answer</h3>
              <ul>
                <li>Write one true sentence about what you want next. If you&rsquo;re still employed, say so.</li>
                <li>If you were laid off, say &ldquo;Position eliminated&rdquo; or &ldquo;Laid off in a reorganization&rdquo;. It&rsquo;s common, and a plain answer reads better than a vague one.</li>
                <li>Don&rsquo;t criticize the employer. The reader only hears your side, and it&rsquo;s the side they&rsquo;ll remember.</li>
              </ul>
              <Sample>
                I&apos;m still at Brightline. I&apos;m looking for a role where I own the whole campaign plan for one product, and this one does.
              </Sample>
            </>
          ),
        },
        {
          title: 'Write a first draft in the box',
          body: (
            <>
              <p>
                I build <Link href="/">Cover Me</Link>, a Chrome extension that can write a first draft of these answers for you to edit. On the application, right-click the question box and choose &ldquo;Cover Me: write an answer&rdquo;. It reads the question and the job posting on the page, or the job you last saved in Cover Me, writes an answer from your resume, and types it into the box. You edit it there, ask for a change such as Shorter, or press Ctrl+Z to undo.
              </p>
              <p>
                It follows the rules above: the answer comes first, and every fact comes from your resume or what you&rsquo;ve told Cover Me about yourself. Details only you know, such as your salary or start date, stay in [brackets] for you to fill in. It never submits the form. Free accounts get {L.answer_starter} answers to start, then {L.answer_weekly} a week, Pro gets {L.answer_pro_daily} a day, and there&rsquo;s no limit with your own API key. You can <a href="#get-cover-me">install it below</a>.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Get a first draft in the box',
        body: `Right-click any question on an application. Free with your own API key, or ${L.answer_starter} answers to start, then ${L.answer_weekly} a week. No credit card required.`,
      }}
    />
  )
}
