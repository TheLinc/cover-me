import type { Metadata } from 'next'
import Link from 'next/link'
import { ComparisonTable, GuideArticle, GuideFigure, GuideImage, ext } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('jobright-review')

export const metadata: Metadata = {
  title: { absolute: 'Jobright Review (2026): Turbo Pricing, Is It Legit, and vs Simplify' },
  description: "Jobright's job board is free, and Turbo was $29.99 a month on a timed offer. Who runs Jobright, what users report, and how it compares with Simplify.",
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Jobright review: is it legit, and is Turbo worth paying for? | Cover Me',
    description: "Turbo's prices from Jobright's signed-in upgrade page, its refund policy, what users on Trustpilot and Reddit say, and Jobright vs Simplify.",
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: "Jobright's free plan, Turbo price, Trustpilot rating and company at a glance" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jobright review: is it legit, and is Turbo worth paying for? | Cover Me',
    description: "Turbo's prices from Jobright's signed-in upgrade page, its refund policy, what users on Trustpilot and Reddit say, and Jobright vs Simplify.",
    images: [`${BASE}${guide.image}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Jobright legit?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes, it's a real company: Jobright Inc., registered in Delaware and based in Santa Clara, California. It was founded in 2023 by Eric Cheng and Ethan Zheng and has raised $7.7 million, including a 2025 round with Indeed's venture arm. It rates 4.8 out of 5 on Trustpilot from 3,811 reviews (November 21, 2026), and its recent reviews come from Jobright's own invitations. The complaints are about price, listings that led nowhere and few replies from employers.",
      },
    },
    {
      '@type': 'Question',
      name: 'How much does Jobright cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Jobright has no public pricing page for job seekers, so you see Turbo's price after you sign up. Signed in on November 21, 2026, its upgrade page showed $29.99 a month, $69.99 for 3 months or $17.99 a week. The monthly and quarterly prices were a timed special offer, against crossed-out prices of $49.99 a month and $149.97 for 3 months. Turbo renews automatically, and you can ask for a full refund within 7 days of a first monthly charge.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is Jobright free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Mostly, with daily limits. A free account can browse jobs, see match scores and track applications. Its upgrade page caps the free plan at 2 AI resumes, 4 autofills and 2 cover letters a day, with limited access to the AI Agent that applies for you. AI job search and the hidden jobs filter are Turbo only.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is Jobright or Simplify better?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Neither is better for everyone: try both free plans with the same resume and keep the one whose matches you'd apply to. They do the same core job: a job board with matches, a tracker and an autofill extension, all free. Simplify lists Simplify+ at $39.99 a month with 20 auto-submitted applications a week; Jobright showed Turbo at $29.99 a month on a timed offer, $49.99 without it. Simplify's free autofill has no limit where Jobright's allows 4 a day, and Simplify's extension has 3,900 ratings to Jobright's 433.",
      },
    },
  ],
}

const VS_SIMPLIFY: { feature: string; jobright: string; simplify: string }[] = [
  { feature: 'Free', jobright: 'Job board, match scores and tracker; 2 AI resumes, 4 autofills and 2 cover letters a day', simplify: 'Job board, matches, tracker, unlimited autofill and a resume builder' },
  { feature: 'Paid plan', jobright: 'Turbo: $17.99 a week, or $29.99 a month and $69.99 for 3 months on a timed offer; prices shown only after sign-up', simplify: 'Simplify+: $19.99 a week, $39.99 a month or $89.99 for 3 months' },
  { feature: 'Applies for you', jobright: 'The Agent: limited on the free plan, unlimited on Turbo', simplify: 'Autopilot, 20 applications a week on Simplify+' },
  { feature: 'Refunds', jobright: 'Full refund on request within 7 days of a first monthly charge, unless you’ve used Turbo heavily', simplify: 'Generally non-refundable once active' },
  { feature: 'Chrome extension', jobright: '4.9 from 433 ratings, 300,000 users', simplify: '4.8 from 3,900 ratings, 500,000 users' },
  { feature: 'Trustpilot', jobright: '4.8 from 3,811 reviews, claimed, invites reviews', simplify: '2.7 from 22 reviews, unclaimed' },
]

const COMPARISON: { feature: string; coverMe: string; them: string }[] = [
  { feature: 'Finds jobs for you', coverMe: 'No, it works on postings you open on LinkedIn, Indeed, Greenhouse, Lever, Workday or Ashby, or paste', them: 'Yes, its own job board with match scores, U.S. roles only' },
  { feature: 'Submits applications', coverMe: 'No, you review and send every one', them: 'Autofill for you to review, 4 a day free; the Agent can submit, limited on the free plan' },
  { feature: 'Resume tailoring', coverMe: 'One click, with an ATS match score and missing keywords shown before you use it', them: 'AI resumes, 2 a day on the free plan, unlimited on Turbo' },
  { feature: 'Invented skills', coverMe: 'A check removes skills your original resume does not support', them: 'Not described on its pages' },
  { feature: 'Pricing', coverMe: 'Free for 10, then 5 a week · Pro $15 a month for 25 a day · prices on the site', them: 'Free plan with daily limits; Turbo $29.99 a month on a timed offer, prices shown only after sign-up' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', them: 'No' },
]

const th = 'text-left px-4 py-3 font-bold text-muted-foreground border-b border-border'
const td = 'px-4 py-3 text-muted-foreground border-b border-border'

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          Jobright is legit: a Santa Clara company backed by $7.7 million in funding, including from Indeed&rsquo;s venture arm. Its job board, match scores and autofill are free. Turbo, the paid plan, showed $29.99 a month when I signed in, as a timed offer against a crossed-out $49.99. Whether it&rsquo;s worth paying for depends on how many of its matches turn into interviews for you.
        </>
      }
      tldr={[
        'Jobright pulls U.S. job listings into one board, scores how well each fits your resume, and fills in applications with a browser extension. Those parts are free with an account, with daily limits on AI resumes and autofill.',
        'Turbo lifts the limits and unlocks the Agent that applies for you. Signed in, it showed $29.99 a month on a timed offer or $17.99 a week, and you can ask for a refund within 7 days of a first monthly charge.',
        'Simplify does the same core job with prices you can read before signing up, unlimited free autofill and a larger extension user base. Pick on which job board finds better matches for your field.',
      ]}
      intro={
        <p>
          I build Cover Me, which writes tailored resumes and cover letters but doesn&rsquo;t find jobs, so weigh this review with that in mind. Everything here is from Jobright&rsquo;s and Simplify&rsquo;s own pages, their App Store and Chrome Web Store listings, press coverage, Trustpilot and Reddit, checked on November 21, 2026. Jobright shows Turbo&rsquo;s prices only after you sign in, so I made a free account to read its upgrade page. I didn&rsquo;t pay for Turbo, so what it&rsquo;s like to use comes from what users report.
        </p>
      }
      sections={[
        {
          title: 'What does Jobright do?',
          body: (
            <>
              <p>
                Jobright is a job board that does the searching for you. It collects openings from job boards and company career sites, and its{' '}
                <a href="https://apps.apple.com/us/app/jobright-ai-job-search/id6738236788" {...ext}>App Store listing</a> says it adds about 400,000 a day, U.S. roles only. You upload your resume, and it scores each job from 0 to 100 on how well your skills, experience and salary fit.
              </p>
              <p>
                Around the board sit a tracker, an &ldquo;H1B sponsor likely&rdquo; label for jobs likely to sponsor a visa, a{' '}
                <a href="https://chromewebstore.google.com/detail/jobright-autofill-%E2%80%93-insta/odcnpipkhjegpefkfplmedhmkmmhmoko" {...ext}>Chrome extension</a> that fills in application forms, resume tailoring, and a chat coach called Orion. In June 2025 it added the{' '}
                <a href="https://jobright.ai/blog/jobright-launches-first-ai-agent-to-put-job-search-on-autopilot/" {...ext}>Jobright Agent</a>, which it calls the first AI career agent that &ldquo;finds, customizes, and submits applications on behalf of job seekers&rdquo;.
              </p>
            </>
          ),
        },
        {
          title: 'How much does Jobright cost?',
          body: (
            <>
              <p>
                Jobright has no public pricing page for job seekers. <code>jobright.ai/pricing</code> returned a 404 on November 21, 2026, and the only <a href="https://jobright.ai/employers/pricing" {...ext}>pricing page</a> on the site is for employers. Its{' '}
                <a href="https://jobright.ai/legal/service" {...ext}>terms</a> say paid subscriptions are sold for &ldquo;weekly, monthly, quarterly, six-month, or other billing periods&rdquo; at &ldquo;the amount shown at checkout&rdquo;. Signed in to a free account the same day, the upgrade page showed three Turbo plans:
              </p>
              <GuideImage
                src="/guides/jobright-review/turbo-pricing.png"
                alt="Jobright's upgrade page. Monthly: $29.99 a month, crossed out from $49.99, save 40%. Quarterly: $69.99 for 3 months, crossed out from $149.97, save 53%. Both under a Your Special Offer banner with a 59:21 countdown. Weekly: $17.99 a week, $71.96 a month. Free plan: $0.00. Turbo gives unlimited AI custom resumes, autofill, AI Agent, AI cover letters, LinkedIn email finder, saved filters and job alerts, plus AI job search, office hours and a hidden jobs filter. The free plan gives 2 resume credits, 4 autofill credits, 2 cover letter credits and 2 email finder credits a day, limited access to the AI Agent, 1 saved filter and 1 alert a day."
                width={1104}
                height={650}
                caption="Jobright's upgrade page, signed in to a free account on November 21, 2026."
              />
              <p>
                The monthly and quarterly prices sat under a &ldquo;Your Special Offer&rdquo; banner with a countdown timer, next to crossed-out prices of $49.99 a month and $149.97 for 3 months. The weekly plan works out to $71.96 a month, more than twice the monthly offer. Other prices on record:
              </p>
              <ul>
                <li>
                  In December 2025 a student posted their Turbo checkout on{' '}
                  <a href="https://www.reddit.com/r/jobright/comments/1q0nizg/has_anyone_purchased_the_turbo_plan/" {...ext}>r/jobright</a>: a monthly plan at $39.99, crossed out to $19.99 with a 50% student discount.
                </li>
                <li>
                  Jobright&rsquo;s own <a href="https://jobright.ai/blog/is-jobright-worth-it-a-detailed-comparison/" {...ext}>comparison post</a>, last updated April 2026, lists it as &ldquo;Free / $29.99/mo&rdquo;, and its <a href="https://jobright.ai/blog/is-jobright-legit/" {...ext}>&ldquo;Is Jobright legit?&rdquo; post</a> mentions &ldquo;Premium plans ($30/month)&rdquo;.
                </li>
                <li>
                  A <a href="https://www.trustpilot.com/reviews/6ad7de16d96ffd3478a7cef4" {...ext}>Trustpilot reviewer</a> wrote in October 2026, &ldquo;everytime I click on upgrade the priced are increased.&rdquo;
                </li>
              </ul>
              <p>
                Turbo renews automatically. Its{' '}
                <a href="https://jobright.ai/legal/refund" {...ext}>refund policy</a> lets you request a full refund within 7 days of a first monthly, quarterly or six-month charge, or 24 hours for a weekly plan, though it can be refused if you&rsquo;ve made &ldquo;substantial use&rdquo; of Turbo. For an unplanned renewal, you have 3 days to ask, and a refund &ldquo;may be available&rdquo; if you haven&rsquo;t used Turbo since. Not getting interviews isn&rsquo;t grounds for a refund: the policy rules out requests &ldquo;based only on not receiving interviews, callbacks, offers, or another particular job-search outcome.&rdquo;
              </p>
            </>
          ),
        },
        {
          title: 'Is Jobright free?',
          body: (
            <p>
              Mostly, with daily limits. The <a href="https://apps.apple.com/us/app/jobright-ai-job-search/id6738236788" {...ext}>App Store listing</a> says &ldquo;Browsing jobs, receiving match scores, and tracking applications are free.&rdquo; The rest is capped. The upgrade page above gives a free account 2 AI resumes, 4 autofills, 2 cover letters and 2 LinkedIn email lookups a day, one saved filter, one job alert a day, and &ldquo;Limited Access&rdquo; to the AI Agent. AI job search, the hidden jobs filter and Turbo&rsquo;s weekly Q&amp;A sessions with a recruiter are paid only. A July 2026 <a href="https://www.trustpilot.com/reviews/6a64d29cbcdf891d969d0917" {...ext}>Trustpilot review</a> is titled &ldquo;Only two credits for free Resume Tweaking&rdquo;, and a user on{' '}
              <a href="https://www.reddit.com/r/jobright/comments/1u50y3h/has_anyone_gotten_a_job/" {...ext}>r/jobright</a> said in June 2026, &ldquo;I don&rsquo;t like they took away features in free to add to Turbo.&rdquo;
            </p>
          ),
        },
        {
          title: 'Does Jobright work?',
          body: (
            <>
              <p>
                For finding jobs, users mostly say yes. The <a href="https://apps.apple.com/us/app/jobright-ai-job-search/id6738236788" {...ext}>App Store</a> rating is 4.8 from 1,700 ratings, and a February 2025 review there calls it &ldquo;way more helpful for job search than LinkedIn, Google, Indeed&rdquo;. On{' '}
                <a href="https://www.reddit.com/r/csMajors/comments/1wkbnp4/anyone_can_help_me_understand_jobright_or_simplify/" {...ext}>r/csMajors</a> in September 2026, a user called it &ldquo;just a good aggregator of open jobs&rdquo; that sends you to the company&rsquo;s own page to apply.
              </p>
              <p>
                For getting interviews, reports are thinner. Under a post asking{' '}
                <a href="https://www.reddit.com/r/cscareeradvice/comments/1ponvy7/how_legit_is_jobright/" {...ext}>&ldquo;How legit is JobRight?&rdquo;</a>, one user wrote in July 2026, &ldquo;I tried it for 4 months. I got one interview from nearly 100 applications.&rdquo; Another paid for a month and cancelled, and said, &ldquo;I don&rsquo;t trust the details it fills in outside of my name and contact info.&rdquo; On{' '}
                <a href="https://www.reddit.com/r/jobright/comments/1r8795q/is_jobright_turbo_worth_it/" {...ext}>&ldquo;is Jobright Turbo worth it?&rdquo;</a>, a user wrote in February 2026, &ldquo;I applied to over 100 jobs with turbo so far and no answer,&rdquo; after a month. A commenter who said they were Jobright&rsquo;s founder replied on <a href="https://www.reddit.com/r/jobright/comments/1q0nizg/has_anyone_purchased_the_turbo_plan/" {...ext}>another post</a> that Turbo &ldquo;is a time-saver (and can increase the interview rate), but not a magic bullet.&rdquo;
              </p>
              <p>
                Check what the Agent writes. A paying user posted in{' '}
                <a href="https://www.reddit.com/r/recruitinghell/comments/1pex53h/jobright_agent_sucks/" {...ext}>r/recruitinghell</a> in December 2025 that &ldquo;The Agent is filling up fake answers for custom questions!&rdquo;, including a team project &ldquo;recognized at a national conference&rdquo; that wasn&rsquo;t in their profile. A hiring manager left a 1-star{' '}
                <a href="https://www.trustpilot.com/reviews/6a9860b689fc2bfd462a7425" {...ext}>Trustpilot review</a> in September 2026 saying most applicants for an inventory role came through Jobright and &ldquo;Every resume looks the same.&rdquo;
              </p>
            </>
          ),
        },
        {
          title: 'Is Jobright legit?',
          body: (
            <>
              <p>
                Yes. The terms name Jobright Inc., registered in Delaware, with a mailing address at 3120 Scott Blvd in Santa Clara, California. Its{' '}
                <a href="https://jobright.ai/blog/is-jobright-legit/" {...ext}>own &ldquo;Is Jobright legit?&rdquo; post</a> names the founders, Eric Cheng, an early engineer at Box, and Ethan Zheng, who led AI work at NewsBreak, and says it has raised $7.7 million: a $4.5 million seed round in 2023 led by Lanchi Ventures, and $3.2 million in 2025 led by Translink Capital with HR Tech Investments, Indeed&rsquo;s venture arm. TechCrunch{' '}
                <a href="https://techcrunch.com/2024/06/25/jobright-uses-ai-to-help-foreign-workers-navigate-the-us-job-market/" {...ext}>covered it in June 2024</a>.
              </p>
              <p>
                On <a href="https://www.trustpilot.com/review/jobright.ai" {...ext}>Trustpilot</a> it rates 4.8 out of 5 from 3,811 reviews: 3,205 five-star and 46 one-star. Jobright pays for Trustpilot, invites customers to review it, and has replied to all 60 of its negative reviews. All 20 of the most recent reviews on November 21 came through its invitations, and most are a line long: &ldquo;Very convenient and reliable.&rdquo;
              </p>
              <p>
                The low ratings are about results and listings. One from November 2026:{' '}
                <a href="https://www.trustpilot.com/reviews/6af76f50a575ee117cfdf453" {...ext}>&ldquo;I&rsquo;ve sent over 600 resumes, and over the time I&rsquo;ve been desperately searching for a job, all I&rsquo;ve gotten back are scam calls, fake listings, broken listings, scam emails and fake emails.&rdquo;</a> Another says the{' '}
                <a href="https://www.trustpilot.com/reviews/6aff6091dc7893709e51f14b" {...ext}>&ldquo;H1B sponsor likely&rdquo; label</a> is &ldquo;based on company, not for the specific job position&rdquo;; Jobright replied that it&rsquo;s based on the posting.
              </p>
            </>
          ),
        },
        {
          title: 'Jobright vs Simplify',
          body: (
            <>
              <p>
                <a href="https://simplify.jobs" {...ext}>Simplify</a> is the closest match to Jobright: a job board with personal matches, a tracker, and an autofill extension, all free, plus a paid plan for AI writing and automatic applying. It was started by Michael Yan, Rushil Srivastava and Ethan Horoschak, who made{' '}
                <a href="https://www.forbes.com/profile/simplify-jobs/" {...ext}>Forbes 30 Under 30</a> in 2023. The difference is in the details:
              </p>
              <GuideFigure caption="From each company's own pages, the App Store, the Chrome Web Store and Trustpilot, checked November 21, 2026.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-[13.5px] bg-white border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-elevated">
                        <th className={th}>Feature</th>
                        <th className={th}>Jobright</th>
                        <th className={th}>Simplify</th>
                      </tr>
                    </thead>
                    <tbody>
                      {VS_SIMPLIFY.map((row) => (
                        <tr key={row.feature}>
                          <td className={`${td} font-medium text-foreground`}>{row.feature}</td>
                          <td className={td}>{row.jobright}</td>
                          <td className={td}>{row.simplify}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GuideFigure>
              <p>
                Simplify&rsquo;s <a href="https://help.simplify.jobs/articles/5623502-whats-included-in-simplify-features-and-pricing" {...ext}>help center</a> lists Simplify+ at $39.99 a month, between Turbo&rsquo;s $29.99 offer and its crossed-out $49.99, and you can read it before signing up. Its refunds are stricter: its <a href="https://help.simplify.jobs/articles/8410005-manage-or-cancel-your-subscription" {...ext}>billing help</a> says &ldquo;Activated subscriptions are generally non-refundable&rdquo;, with exceptions in its refund policy. Its Autopilot submits &ldquo;without a review step&rdquo;, using one of 20 weekly credits per application, and its <a href="https://simplify.jobs/copilot" {...ext}>Copilot page</a> says of the free autofill, &ldquo;There is no limit on how many applications you can submit with Copilot!&rdquo;, where Jobright&rsquo;s free plan allows 4 autofills a day. Its{' '}
                <a href="https://chromewebstore.google.com/detail/simplify-copilot-autofill/pbanhockgagggenencehbnadejlgchfc" {...ext}>extension</a> has more users and nine times as many ratings as Jobright&rsquo;s. On{' '}
                <a href="https://www.trustpilot.com/review/simplify.jobs" {...ext}>Trustpilot</a> it has only 22 reviews and hasn&rsquo;t claimed the page, so its 2.7 says little either way.
              </p>
              <p>
                Since the free plans overlap so much, try both. Upload the same resume to each and compare the top 20 matches for your field. Keep the one whose matches you&rsquo;d actually apply to, and only then decide whether either paid plan is worth paying for.
              </p>
            </>
          ),
        },
        {
          title: 'Who is Jobright for?',
          body: (
            <>
              <p>
                Jobright suits you if you&rsquo;re searching U.S. jobs and spend more time finding openings than applying to them. The free plan covers that: the board, match scores, tracker and 4 autofills a day. For other autofill and tracking extensions with their free limits, see the <Link href="/guides/best-chrome-extensions-for-job-applications">best Chrome extensions for job applications</Link>. Jobright&rsquo;s blog said in 2025 that about 30% of its users were international candidates looking for H-1B sponsorship. If that&rsquo;s you, check the posting itself: a Trustpilot reviewer said the &ldquo;H1B sponsor likely&rdquo; label is set per company, not per job, though Jobright replied that it&rsquo;s based on the posting and &ldquo;isn&rsquo;t a guarantee of sponsorship.&rdquo;
              </p>
              <p>
                Pay for Turbo only once the free matches are good for your field, and use it lightly at first: the refund window covers 7 days from a first monthly charge, but heavy use can rule a refund out. For jobs you care about, read what the Agent or autofill puts in each answer before it goes out, since one user found invented ones.
              </p>
            </>
          ),
        },
        {
          title: 'Cover Me as a Jobright alternative',
          body: (
            <>
              <p>
                Cover Me does the part after you&rsquo;ve found the job. On a posting on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link> or <Link href="/for/ashby">Ashby</Link>, including one you found through Jobright, it writes a tailored resume with an <Link href="/guides/what-is-an-ats-score">ATS score</Link> and a cover letter for you to edit and send. A check removes any skill your original resume doesn&rsquo;t support, so it won&rsquo;t write a project you never did.
              </p>
              <ComparisonTable name="Jobright" rows={COMPARISON} caption="Jobright details are from its terms, refund policy, signed-in upgrade page, store listings and blog, checked November 21, 2026." />
              <p>
                The free plan gives 10 generations to start, then 5 a week, and Pro is $15 a month. With{' '}
                <Link href="/guides/use-your-own-api-key-for-cover-letters">your own OpenAI or Claude API key</Link> it&rsquo;s free and unlimited, and you pay the AI provider for what you use. For a tool that applies for you, see the <Link href="/guides/aiapply-review">AIApply review</Link>. For a resume builder with a job tracker and LinkedIn tools, see the <Link href="/guides/careerflow-review">Careerflow review</Link>. To check a resume against a posting for free, try Cover Me&rsquo;s <Link href="/ats-checker">free ATS resume checker</Link> or see <Link href="/guides/free-jobscan-alternatives">free Jobscan alternatives</Link>.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Tailor each application you find',
        body: '10 free generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
