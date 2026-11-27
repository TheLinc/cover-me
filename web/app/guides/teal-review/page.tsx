import type { Metadata } from 'next'
import Link from 'next/link'
import { ComparisonTable, GuideArticle, ext } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('teal-review')

export const metadata: Metadata = {
  title: { absolute: 'Is Teal Legit? Teal Review, Job Board and Teal+ Pricing' },
  description: 'Teal is a real Miami company with a job board, a resume builder and a job tracker. Where its jobs come from, what Teal+ costs, and what users say.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Is Teal legit? A Teal review for job seekers | Cover Me',
    description: 'Who runs Teal, where its job listings come from, what Teal+ costs, and what users on Trustpilot and Reddit say.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: "Teal's company, job board, Teal+ prices and Trustpilot rating at a glance" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Is Teal legit? A Teal review for job seekers | Cover Me',
    description: 'Who runs Teal, where its job listings come from, what Teal+ costs, and what users on Trustpilot and Reddit say.',
    images: [`${BASE}${guide.image}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Teal legit?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Teal is run by Teal Labs, Inc. in South Miami, Florida, founded by Dave Fano in 2019, and it has raised $19 million from venture investors. It rates 4.3 out of 5 on Trustpilot from 120 reviews (November 19, 2026). Most bad reviews are about subscription billing, not fake jobs.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Teal a legit job site?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. Teal runs a job board whose listings, its help center says, are sourced from companies' own applicant tracking systems. Teal doesn't hire anyone. When you click Apply on a Teal listing, a pop-up offers a free Teal account, and Continue to Application takes you to the employer's own careers site, where you apply.",
      },
    },
    {
      '@type': 'Question',
      name: 'How much does Teal+ cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Teal+ costs $13 every 7 days, $29 every 30 days or $79 every 90 days, from Teal's pricing page on November 19, 2026. It renews automatically. The free plan has unlimited resumes and job tracking, the top 5 keywords for each job, and one-time AI credits: 5 bullets, 2 summaries and 2 cover letters.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can I get a refund from Teal?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Maybe. Teal's terms let you ask within 2 days of the billing period starting on the weekly plan, 7 days on the monthly plan and 14 days on the 90-day plan, by email to member support. Cancelling doesn't refund you on its own, and Teal reviews each request.",
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; them: string }[] = [
  { feature: 'Built for', coverMe: 'Tailoring your existing resume and writing a letter for each posting', them: 'Building resumes, finding jobs and tracking your search' },
  { feature: 'Free plan', coverMe: '10 generations to start, then 5 a week, or unlimited with your own API key', them: 'Unlimited resumes and job tracking, 10 templates, top 5 keywords per job, and AI credits: 5 bullets, 2 summaries, 2 cover letters' },
  { feature: 'Paid plan', coverMe: '$15 a month, or $35 every 3 months, for up to 25 generations a day', them: 'Teal+ at $13 every 7 days, $29 every 30 days or $79 every 90 days' },
  { feature: 'Where it runs', coverMe: 'Chrome extension, on the job posting you have open', them: 'Web app with its own job board, plus a Chrome extension that saves jobs to its tracker' },
  { feature: 'Tailoring', coverMe: 'One click rewrites your bullets, summary and skills in the posting’s words', them: 'Keyword matching highlights the posting’s keywords while you edit; AI writes bullets and summaries' },
  { feature: 'Match score', coverMe: 'ATS score from 0 to 100 with every missing keyword listed', them: 'Keyword insights for the job you attach' },
  { feature: 'Invented skills', coverMe: 'A check removes skills your original resume does not support', them: 'Not described on its pricing page' },
  { feature: 'Templates and design', coverMe: 'Keeps your own Word design (beta), or a standard one-column layout; download as PDF or Word', them: 'Resume templates and Design Mode' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', them: 'No' },
]

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          Yes, Teal is legit. It&rsquo;s a funded company in Miami, and its job board lists real jobs copied from employers&rsquo; own hiring systems. When you apply to one, you apply on the employer&rsquo;s site, not on Teal. The real questions are whether its listings are still open and whether Teal+ is worth $29 every 30 days.
        </>
      }
      tldr={[
        'Teal Labs, Inc. has run Teal since 2019 and raised $19 million. It rates 4.3 out of 5 on Trustpilot and 4.7 in the Chrome Web Store.',
        "Teal is partly a job site. Its board lists jobs from employers' systems, and Apply sends you to the employer. It doesn't hire for anyone.",
        'Teal+ is $13 every 7 days, $29 every 30 days or $79 every 90 days, and renews automatically. Most 1-star reviews are about being charged after trying to cancel.',
      ]}
      intro={
        <p>
          I build Cover Me, which also tailors resumes, so weigh this review with that in mind. Prices are from Teal&rsquo;s pricing page and reviews from Trustpilot and Reddit, all checked on November 19, 2026. I browsed Teal&rsquo;s job board without an account, so what Teal does after sign-up comes from its own pages and from users, apart from a later test of its free AI credits on November 26, 2026.
        </p>
      }
      sections={[
        {
          title: 'What does Teal do?',
          body: (
            <p>
              Teal is a job search workspace. You build resumes in its builder, keep a version for each role, and track applications, contacts and companies. When you attach a job description, its Job Matcher marks which of the posting&rsquo;s keywords your resume has. Its AI writes bullets, summaries and cover letters, and its Chrome extension saves jobs from{' '}
              <a href="https://www.tealhq.com/" {...ext}>over 40 job boards</a> to the tracker. It also runs its own job board.
            </p>
          ),
        },
        {
          title: 'Is Teal a job site?',
          body: (
            <>
              <p>
                Partly. Teal tracks jobs you save from other sites, and it also lists jobs itself. Its <a href="https://www.tealhq.com/jobs" {...ext}>job board</a> showed &ldquo;10,000+ Jobs&rdquo; when I looked, many posted 2 hours earlier: nurses, CDL drivers, a software architect at Siemens. Teal&rsquo;s <a href="https://help.tealhq.com/en/articles/13456939-using-teal-s-job-search" {...ext}>help center</a> says the listings are &ldquo;sourced directly from company applicant tracking systems&rdquo;, and you can save searches and get alerts.
              </p>
              <p>
                Each listing has three buttons: Apply, Save Job and Match Resume. Save Job and Match Resume go to Teal&rsquo;s sign-up page. Apply opens a pop-up that offers a free Teal account, and its Continue to Application link went to Siemens&rsquo;s own careers site. You don&rsquo;t need a Teal account to apply, and Teal isn&rsquo;t the employer.
              </p>
              <p>
                That explains a question like{' '}
                <a href="https://www.reddit.com/r/jobs/comments/1oea20s/is_teal_a_legit_company/" {...ext}>this one on r/jobs</a> from October 2025: &ldquo;There&rsquo;s this city job posted in my town and it&rsquo;s using Teal as the way to apply.&rdquo; The job is the city&rsquo;s. Teal copied the listing. If a listing looks off, find the same job on the employer&rsquo;s careers page before you send personal details. One <a href="https://www.trustpilot.com/review/tealhq.com?stars=1" {...ext}>Trustpilot reviewer</a> wrote in May 2026 that &ldquo;the job listings on their site feel like mostly ghost listings&rdquo;, which is a risk with any board that copies postings: some close before the copy does. I found no reports of scams run in Teal&rsquo;s name.
              </p>
            </>
          ),
        },
        {
          title: 'How much does Teal cost?',
          body: (
            <>
              <p>
                From <a href="https://www.tealhq.com/pricing" {...ext}>Teal&rsquo;s pricing page</a>, checked November 19, 2026:
              </p>
              <ul>
                <li>Free: unlimited resumes and job tracking, 10 templates, the top 5 keywords for each job, and one-time AI credits for 5 bullets, 2 summaries and 2 cover letters.</li>
                <li>Teal+: $13 every 7 days, $29 every 30 days or $79 every 90 days, with every keyword and unlimited AI.</li>
              </ul>
              <p>
                No credit card is needed for the free plan. Teal+ renews automatically, and the <a href="https://www.tealhq.com/terms" {...ext}>terms</a> put the job of confirming a cancellation on you: check for the cancellation banner in your account settings. Refunds aren&rsquo;t automatic. You can ask within 2 days of the billing period starting on the weekly plan, 7 days on the monthly plan and 14 days on the 90-day plan, and Teal decides case by case.
              </p>
            </>
          ),
        },
        {
          title: 'Does Teal work?',
          body: (
            <>
              <p>
                As an organizer, yes. That&rsquo;s what its happiest users praise. &ldquo;It makes it easy to find (Via Chrome Ext), add and track progress on jobs,&rdquo; one wrote on Trustpilot in June 2026, and another, in October: &ldquo;Five stars for the keywords alone. The tracker makes it an easy recommendation for anyone running a serious search.&rdquo;
              </p>
              <p>
                As a way to get interviews, users are split. On{' '}
                <a href="https://www.reddit.com/r/jobsearchhacks/comments/1li07kk/are_those_website_really_worth_jobscan_teal_etc/" {...ext}>r/jobsearchhacks</a> in June 2025, one user said &ldquo;the value is tracking how you customized the resume more than ai.&rdquo; In a July 2024 reply on{' '}
                <a href="https://www.reddit.com/r/jobs/comments/18mbu62/have_people_been_successful_with_teal_resume/" {...ext}>r/jobs</a>, another wrote that paying $30 a month, on top of LinkedIn Premium and career coaching, &ldquo;has not resulted in getting a job in over 9 months.&rdquo; The builder itself divides people. A user on{' '}
                <a href="https://www.reddit.com/r/linkedin/comments/1boagr5/whats_the_deal_with_teal/" {...ext}>r/linkedin</a> found it &ldquo;so complicated&rdquo; in March 2024 and said &ldquo;I&rsquo;d rather just make edits in Google docs.&rdquo;
              </p>
              <p>
                Teal&rsquo;s keyword matching highlights what to add, and you do the rewriting, with a few free AI credits and unlimited AI help on Teal+. Teal&rsquo;s pricing page says the free plan shows the top 5 keywords for each job.
              </p>
              <p>
                Check what its AI writes. On November 26, 2026 I tried Teal&rsquo;s free AI credits on made-up resumes. Its summary for a nurse with four years as an RN began &ldquo;Dedicated nurse with 1 year of experience in Acute Care&rdquo;, and its summary for a developer with six years said &ldquo;2+ years&rdquo;. <Link href="/guides/best-ai-for-resume-tailoring">Best AI for resume tailoring</Link> has the full test of Teal and five other tools.
              </p>
            </>
          ),
        },
        {
          title: 'Is Teal legit as a company?',
          body: (
            <>
              <p>
                Yes. The <a href="https://www.tealhq.com/terms" {...ext}>terms</a> name Teal Labs, Inc. in South Miami, Florida. Dave Fano founded it in 2019, after{' '}
                <a href="https://refreshmiami.com/news/teal-raises-6-3m-seed-round-to-grow-career-platform-empowering-job-seekers/" {...ext}>working as Chief Growth Officer at WeWork</a>. It raised $6.3 million in 2022, on top of an earlier seed round, and a{' '}
                <a href="https://pulse2.com/teal-7-5-million-series-a-closed-for-expanding-ai-based-careers-platform" {...ext}>$7.5 million Series A in January 2025</a>, for $19 million in total. In April 2026 it{' '}
                <a href="https://www.tealhq.com/post/teal-acquires-ramped-helping-more-job-seekers-navigate-their-search" {...ext}>bought Ramped</a>, another job search platform.
              </p>
              <p>
                On <a href="https://www.trustpilot.com/review/tealhq.com" {...ext}>Trustpilot</a> it rates 4.3 out of 5 from 120 reviews, 48 of them from the last 12 months. The <a href="https://chromewebstore.google.com/detail/teal-ai-job-search-compan/opafjjlpbiaicbbgifbejoochmmeikep" {...ext}>Chrome extension</a> has 4.7 stars from 3.2K ratings and 200,000 users. The 1-star reviews that call Teal a scam are about billing. One from November 2025 says it &ldquo;continuously charges your account even after you&rsquo;ve attempted to cancel multiple times&rdquo;, and another, from April 2025, says the reviewer learned too late that the 7-day plan has a 2-day refund window. Others complain about marketing emails they can&rsquo;t unsubscribe from.
              </p>
            </>
          ),
        },
        {
          title: 'Who is Teal for?',
          body: (
            <>
              <p>
                Teal suits you if you&rsquo;re running a long search and want one place for every job, resume version, contact and follow-up, or if you need to build a resume from scratch. The free plan does most of that, so start there.
              </p>
              <p>
                It suits you less if your resume is already good and the slow part is adapting it to each posting, since Teal shows you the keywords and leaves the rewrite to you. If you try Teal+, put the renewal date in your calendar, and confirm the cancellation banner appears when you cancel.
              </p>
            </>
          ),
        },
        {
          title: 'Cover Me as a Teal alternative',
          body: (
            <>
              <p>
                Cover Me skips the builder and the board. You upload your resume once, open a posting on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link> or <Link href="/for/ashby">Ashby</Link>, and click Tailor Resume to Job. It rewrites your bullets, summary and skills in the posting&rsquo;s words, shows an <Link href="/guides/what-is-an-ats-score">ATS score</Link> with every missing keyword, and writes a matching cover letter. A check removes any skill your original resume doesn&rsquo;t support before you see it.
              </p>
              <ComparisonTable name="Teal" rows={COMPARISON} caption="Teal details are from its pricing page, checked November 19, 2026." />
              <p>
                The free plan gives 10 generations to start, then 5 a week, and Pro is $15 a month or $35 every 3 months. With{' '}
                <Link href="/guides/use-your-own-api-key-for-cover-letters">your own OpenAI or Claude API key</Link> it&rsquo;s free and unlimited, and you pay the AI provider for what you use. The two work together too: Teal to find and track jobs, Cover Me to tailor each application. For other tools, see the <Link href="/guides/jobscan-review">Jobscan review</Link>, the <Link href="/guides/aiapply-review">AIApply review</Link> and <Link href="/guides/free-jobscan-alternatives">free Jobscan alternatives</Link>. Weighing Teal against Careerflow? The <Link href="/guides/careerflow-review">Careerflow review</Link> compares the two.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Tailor your resume on the posting',
        body: '10 free generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
