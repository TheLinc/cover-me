import type { Metadata } from 'next'
import Link from 'next/link'
import { ComparisonTable, GuideArticle, ext } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('jobscan-review')

export const metadata: Metadata = {
  title: { absolute: 'Jobscan Review (2026): Pricing, Free Plan and Is It Worth It' },
  description: 'Jobscan costs $49.95 a month after 5 free scans. What it does, what users on Trustpilot and Reddit say, who runs it, and who should pay for it.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Jobscan review: is it legit and worth paying for? | Cover Me',
    description: 'Prices from its plan page, what reviewers say, and what its match rate measures.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: "Jobscan's prices, free plan, Trustpilot rating and company at a glance" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jobscan review: is it legit and worth paying for? | Cover Me',
    description: 'Prices from its plan page, what reviewers say, and what its match rate measures.',
    images: [`${BASE}${guide.image}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Jobscan legit?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. Jobscan is a real company in Seattle, started by James Hu in 2013, and it rates 4.2 out of 5 on Trustpilot from 348 reviews (November 19, 2026). The complaints are about billing, mostly people charged for 3 months after a trial, not about a fake product. Its match rate is its own keyword count, not the score an employer's applicant tracking system shows a recruiter.",
      },
    },
    {
      '@type': 'Question',
      name: 'How much does Jobscan cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "The free plan gives 5 resume scans a month, and each rescan uses one. Premium is $49.95 a month, or $89.95 every 3 months. Only the 3-month plan has a 7-day free trial, and it charges $89.95 when the trial ends unless you cancel. Prices are from Jobscan's plan page, checked November 19, 2026.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is Jobscan free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Partly. A free account gets 5 scans a month, a job tracker, a resume builder and the Chrome extension. AI rewriting, the cover letter generator and the LinkedIn optimizer need Premium or the trial. You need an account to run any scan.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is Jobscan worth it?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "For a few important applications, the free plan is enough to find keywords your resume is missing. At $49.95 a month it's worth it only if you want its rewriting, LinkedIn optimizer and job tracker in one place. Users on Reddit report that the match rate rises when you copy the posting's wording, so treat the missing keywords as the useful part, not the number.",
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; them: string }[] = [
  { feature: 'Free plan', coverMe: '10 generations to start, then 5 a week, or unlimited with your own API key', them: '5 resume scans a month, with an account' },
  { feature: 'Paid plan', coverMe: '$15 a month, or $35 every 3 months, for up to 25 generations a day', them: '$49.95 a month, or $89.95 every 3 months after a 7-day free trial' },
  { feature: 'Where it runs', coverMe: 'Chrome extension, on the job posting you have open', them: 'Web app, plus a Chrome extension that saves jobs to its tracker' },
  { feature: 'Match score', coverMe: 'ATS score from 0 to 100 with every missing keyword listed', them: 'Match rate with ATS and recruiter findings' },
  { feature: 'Resume rewriting', coverMe: 'One click rewrites your bullets, summary and skills for the posting', them: 'AI optimizations on paid plans' },
  { feature: 'Invented skills', coverMe: 'A check removes skills your original resume does not support', them: 'Not described on its plan page' },
  { feature: 'Cover letters', coverMe: 'On every plan, written for the posting', them: 'AI cover letter generator on paid plans' },
  { feature: 'LinkedIn, job tracker, resume builder', coverMe: 'A simple board of your applications by stage; no LinkedIn optimizer or resume builder', them: 'LinkedIn optimizer on paid plans; job tracker and resume builder on every plan' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', them: 'No' },
]

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          Jobscan is legit: a Seattle company that James Hu started in 2013, rated 4.2 out of 5 on Trustpilot. Whether it&rsquo;s worth $49.95 a month depends on how many jobs you apply to, and on what you expect its match rate to tell you.
        </>
      }
      tldr={[
        'Jobscan compares your resume with a job description and gives a match rate with the keywords you are missing. Rewriting, cover letters and the LinkedIn optimizer are on Premium.',
        'Free gets 5 scans a month. Premium is $49.95 a month, or $89.95 every 3 months after a 7-day trial that bills automatically.',
        'Most bad reviews are about billing after a trial, not the product. The match rate is a keyword count. Reddit users report raising it by copying the posting’s words.',
      ]}
      intro={
        <p>
          I build Cover Me, which also tailors resumes, so weigh this review with that in mind. Prices are from Jobscan&rsquo;s plan page and reviews from Trustpilot and Reddit, all checked on November 19, 2026. I didn&rsquo;t create a Jobscan account, so what it does after sign-up comes from its own pages and from users.
        </p>
      }
      sections={[
        {
          title: 'What does Jobscan do?',
          body: (
            <p>
              You give Jobscan your resume and a job description, and its scanner runs{' '}
              <a href="https://www.jobscan.co/resume-scanner" {...ext}>30+ checks across five categories</a> and reports a match rate. The report lists the hard skills and job title the posting uses that your resume doesn&rsquo;t. Paid plans add AI rewriting, a cover letter generator, a LinkedIn profile optimizer and a few auto-apply credits. A job tracker, a resume builder and a Chrome extension that saves jobs come with every plan.
            </p>
          ),
        },
        {
          title: 'How much does Jobscan cost?',
          body: (
            <>
              <p>
                From <a href="https://app.jobscan.co/plan" {...ext}>Jobscan&rsquo;s plan page</a>, checked November 19, 2026:
              </p>
              <ul>
                <li>Free: 5 resume scans a month. Each rescan after an edit <a href="https://jobscansupport.frontkb.com/en/articles/11538561" {...ext}>uses another scan</a>.</li>
                <li>Monthly: $49.95, billed every month, with no trial.</li>
                <li>Quarterly: $89.95 every 3 months, which works out to $29.98 a month, after a 7-day free trial.</li>
              </ul>
              <p>
                The trial is the part to watch. The plan page says that once it ends &ldquo;you will be billed for the next quarter of your subscription&rdquo;, so cancel before day 7 if you only wanted a week. Its <a href="https://www.jobscan.co/cancellation-policy" {...ext}>cancellation policy</a> gives 2 calendar days to ask for a refund, charges a 3.5% fee, and refunds only a period you haven&rsquo;t used.
              </p>
            </>
          ),
        },
        {
          title: 'Does Jobscan work?',
          body: (
            <>
              <p>
                It does what it says: it finds the words a posting uses that your resume doesn&rsquo;t. That list is useful. A missing job title or a tool you use but never named is an easy fix, and a recruiter searching the ATS for that word would miss you without it.
              </p>
              <p>
                Logged out, Jobscan&rsquo;s home page lets you paste a resume and a job description, but clicking Scan opens a sign-up page. There&rsquo;s no scan without an account.
              </p>
              <p>
                The match rate itself is where users push back. In{' '}
                <a href="https://www.reddit.com/r/ResumeTips/comments/1w77opy/jobscan_ats_checker_is_the_ats_score_actually/" {...ext}>a September 2026 r/ResumeTips post</a>, one user&rsquo;s first scan came back at 41%. They copied the posting&rsquo;s job title and skills word for word and it reached 79% in about 15 minutes: &ldquo;My experience didn&rsquo;t change at all, I just swapped my wording for theirs.&rdquo; A reply under that post: &ldquo;Paid for a month, pushed everything into the 80s, callback rate didn&rsquo;t move at all.&rdquo; In{' '}
                <a href="https://www.reddit.com/r/jobsearchhacks/comments/1li07kk/are_those_website_really_worth_jobscan_teal_etc/" {...ext}>a June 2025 r/jobsearchhacks post</a>, a user says the same resume and job description scored 85% on one scan and 61% on the next.
              </p>
              <p>
                That fits what recruiters say about applicant tracking systems. A recruiter writing for{' '}
                <a href="https://www.aol.com/landed-over-dozen-job-interviews-133130573.html" {...ext}>Business Insider</a> got 16% on Jobscan and still landed more than a dozen interviews. In the ATS that recruiter used at work, &ldquo;no applicants were filtered out by keywords or formatting.&rdquo; In{' '}
                <a href="https://enhancv.com/blog/does-ats-reject-resumes/" {...ext}>a survey by Enhancv</a>, which sells resume tools, 23 of 25 recruiters said their ATS doesn&rsquo;t reject resumes automatically for formatting, content or design. <Link href="/guides/what-is-an-ats-score">What an ATS score measures</Link> covers what the number can and can&rsquo;t tell you.
              </p>
            </>
          ),
        },
        {
          title: 'Is Jobscan legit?',
          body: (
            <>
              <p>
                Yes. James Hu <a href="https://www.jobscan.co/about" {...ext}>started Jobscan in 2013</a> while looking for a job, and{' '}
                <a href="https://www.jobscan.co/blog/meet-founders-behind-jobscan/" {...ext}>co-founder Michael Lee</a> joined after 8 years as an engineer at Google. It&rsquo;s{' '}
                <a href="https://www.jobscan.co/team" {...ext}>based in Seattle</a>, and its{' '}
                <a href="https://wellfound.com/company/jobscan" {...ext}>Wellfound profile</a> calls it user-funded and profitable, with 11 to 50 people.
              </p>
              <p>
                On <a href="https://www.trustpilot.com/review/jobscan.co" {...ext}>Trustpilot</a> it rates 4.2 out of 5 from 348 reviews, 75 of them from the last 12 months. The good reviews say the scans led to interviews: &ldquo;I definitely got more interviews with this tool&rdquo; (November 9, 2026). The bad ones are mostly about money. &ldquo;I cancelled my trial and Jobscan charged me for 3 months premium subscription&rdquo; (November 16, 2026), and &ldquo;They make it hard to cancel&rdquo; (August 23, 2026). A 2-star review from October 2026 found &ldquo;many mistakes in interpreting professional terms in my technical area.&rdquo; Another review site, <a href="https://www.smartcustomer.com/reviews/jobscan.co" {...ext}>SmartCustomer</a>, rates it lower, 3.7 out of 5 from 1,699 reviews. The <a href="https://chromewebstore.google.com/detail/jobscan-job-search-tracke/apppjobnbahbomhgmcgolplkpigjlofl" {...ext}>Chrome extension</a> has 4.3 stars from 45 ratings and 10,000 users.
              </p>
            </>
          ),
        },
        {
          title: 'Who is Jobscan for?',
          body: (
            <>
              <p>
                Jobscan suits you if you apply to a handful of jobs that matter and want a second pair of eyes on keywords. The free plan&rsquo;s 5 scans a month cover that. It also suits people who want resume, LinkedIn and job tracking in one paid tool and will use the LinkedIn optimizer.
              </p>
              <p>
                It suits you less if you apply to dozens of jobs a week, where 5 scans run out in a day and $49.95 a month adds up. As one{' '}
                <a href="https://www.reddit.com/r/ResumeTips/comments/1v3lyok/jobscan_free_version_is_useless_now_any_decent/" {...ext}>r/ResumeTips user</a> put it in July 2026, &ldquo;$50/mo is a lot when you&rsquo;re applying to like 30 jobs a week.&rdquo; It also suits you less if you&rsquo;d chase the match rate past the point where your resume still reads like you.{' '}
                <Link href="/guides/free-jobscan-alternatives">Free Jobscan alternatives</Link> compares six tools that check a resume against a posting for free.
              </p>
            </>
          ),
        },
        {
          title: 'Cover Me as a Jobscan alternative',
          body: (
            <>
              <p>
                Cover Me does the rewrite instead of reporting what to change. On a posting on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link> or <Link href="/for/ashby">Ashby</Link>, click Tailor Resume to Job. It rewrites your bullets, summary and skills in the posting&rsquo;s words, shows an ATS score with every missing keyword, and writes a cover letter when you ask. Before you see the result, a check removes any skill your original resume doesn&rsquo;t support, so the score can&rsquo;t rise on experience you don&rsquo;t have.
              </p>
              <ComparisonTable name="Jobscan" rows={COMPARISON} caption="Jobscan details are from its plan page, checked November 19, 2026." />
              <p>
                The free plan gives 10 generations to start, then 5 a week, and Pro is $15 a month. With{' '}
                <Link href="/guides/use-your-own-api-key-for-cover-letters">your own OpenAI or Claude API key</Link> it&rsquo;s free and unlimited, and you pay the AI provider for what you use. Cover Me&rsquo;s score is calculated in code from the posting&rsquo;s must-have and nice-to-have keywords, and the code is public in{' '}
                <a href="https://github.com/TheLinc/cover-me/blob/master/extension/src/lib/ai/ats-score.ts" {...ext}>ats-score.ts</a>. Looking at other paid tools too? The <Link href="/guides/teal-review">Teal review</Link> and <Link href="/guides/aiapply-review">AIApply review</Link> cover two more.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Tailor and score your resume on the posting',
        body: '10 free generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
