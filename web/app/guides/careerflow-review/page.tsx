import type { Metadata } from 'next'
import Link from 'next/link'
import { ComparisonTable, GuideArticle, GuideFigure, GuideImage, ext } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('careerflow-review')

const PRICING = 'https://www.careerflow.ai/premium'
const TERMS = 'https://www.careerflow.ai/terms'
const DO_NOT_USE = 'https://www.reddit.com/r/jobhunting/comments/1ns4dxx/do_not_use_careerflow_ai/'

export const metadata: Metadata = {
  title: { absolute: 'Careerflow Review (2026): Pricing, Is It Legit, and vs Teal' },
  description: 'Careerflow Premium is $23.99 a month, and its free plan has no AI cover letters. Who runs Careerflow, its refund terms, what users on Reddit and Trustpilot report, and Careerflow vs Teal.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Careerflow review: is it legit, and is Premium worth paying for? | Cover Me',
    description: "Careerflow's prices on every billing term, what its free plan leaves out, its refund terms, and what users on Reddit and Trustpilot say.",
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: "Careerflow's free plan, Premium price, Trustpilot rating and company at a glance" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Careerflow review: is it legit, and is Premium worth paying for? | Cover Me',
    description: "Careerflow's prices on every billing term, what its free plan leaves out, its refund terms, and what users on Reddit and Trustpilot say.",
    images: [`${BASE}${guide.image}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Careerflow legit?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes, it's a real company: Careerflow Inc., founded in 2022 by Puneet Kohli and Nikita Gupta and part of Techstars' Oakland accelerator class of 2023. Its Chrome extension has 200,000 users and rates 4.3 from 288 ratings (November 24, 2026). Complaints are about bugs, an unexpected renewal charge and deleting an account. Careerflow also hires freelancers to label AI training data, and 8 of its 20 Trustpilot reviews are about that work, not the job search tools.",
      },
    },
    {
      '@type': 'Question',
      name: 'How much does Careerflow cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "On November 24, 2026, Careerflow's pricing page listed Premium at $8.99 a week, $23.99 a month, $54.99 for 3 months or $172.99 a year, and Premium Plus, which adds AI mock interviews, at $19.99 a week, $44.99 a month, $119.99 for 3 months or $299.99 a year. Plans renew automatically. Purchases are final except at Careerflow's discretion, refund requests are due within 7 days, and the weekly plan is never refunded.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is Careerflow free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Partly. A free account gets the Chrome extension, the LinkedIn profile score, one resume, basic resume analysis and a job tracker that Careerflow's help center caps at 10 jobs. AI cover letters, the one-click resume optimizer and AI writing are Premium only. A Careerflow team member said on Reddit that the free plan lets you tailor one resume to try it.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is Careerflow or Teal better?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Teal's free plan does more of the resume work: unlimited resumes and job tracking, plus a few AI cover letters, where Careerflow's free plan has one resume, 10 tracked jobs and no AI cover letters, plus a LinkedIn profile score. Paid, Teal+ is $29 every 30 days and Careerflow Premium is $23.99 a month. Try both free plans and pay for the one whose editor you'd use every day.",
      },
    },
  ],
}

const PRICES: { term: string; premium: string; plus: string }[] = [
  { term: 'Weekly', premium: '$8.99 a week', plus: '$19.99 a week' },
  { term: 'Monthly', premium: '$23.99 a month', plus: '$44.99 a month' },
  { term: 'Quarterly', premium: '$54.99 for 3 months ($18.33 a month)', plus: '$119.99 for 3 months ($39.99 a month)' },
  { term: 'Yearly', premium: '$172.99 a year ($14.41 a month)', plus: '$299.99 a year ($24.99 a month)' },
]

const VS_TEAL: { feature: string; careerflow: string; teal: string }[] = [
  { feature: 'Free', careerflow: '1 resume, basic resume and LinkedIn scores, up to 10 tracked jobs, no AI cover letters', teal: 'Unlimited resumes and job tracking, top 5 keywords per job, one-time AI credits including 2 cover letters' },
  { feature: 'Paid plan', careerflow: 'Premium: $8.99 a week, $23.99 a month, $54.99 for 3 months or $172.99 a year', teal: 'Teal+: $13 every 7 days, $29 every 30 days or $79 every 90 days' },
  { feature: 'Refunds', careerflow: 'Final unless Careerflow agrees; ask within 7 days; weekly plan never refunded', teal: 'Ask within 2, 7 or 14 days depending on the plan; decided case by case' },
  { feature: 'Extra tools', careerflow: 'LinkedIn profile score and rewrite, AI mock interviews on Premium Plus', teal: 'Its own job board, built from employers’ hiring systems, and a LinkedIn profile review' },
  { feature: 'Chrome extension', careerflow: '4.3 from 288 ratings, 200,000 users', teal: '4.7 from 3.2K ratings, 200,000 users' },
  { feature: 'Trustpilot', careerflow: '3.8 from 20 reviews, 8 of them about freelance data work', teal: '4.3 from 120 reviews' },
]

const COMPARISON: { feature: string; coverMe: string; them: string }[] = [
  { feature: 'Resume tailoring', coverMe: 'One click on the posting, with an ATS match score and missing keywords shown before you use it', them: 'One tailored resume on the free plan; the one-click optimizer is Premium' },
  { feature: 'Cover letters', coverMe: 'Included on the free plan', them: 'Premium only' },
  { feature: 'Invented skills', coverMe: 'A check removes skills your original resume does not support', them: 'Not described on its pages' },
  { feature: 'Job tracker', coverMe: 'A board of the jobs you make a letter or resume for, tracked by stage', them: 'Kanban tracker for jobs saved from 45+ sites, 10 jobs on the free plan' },
  { feature: 'LinkedIn profile', coverMe: 'No', them: 'Profile score on the free plan, AI rewrite on Premium' },
  { feature: 'Pricing', coverMe: 'Free for 10, then 5 a week · Pro $15 a month for 25 a day', them: 'Premium $23.99 a month, or $14.41 a month billed yearly' },
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
          Careerflow is legit: a 2022 company that went through Techstars&rsquo; accelerator, with a Chrome extension 200,000 people use. Its free plan scores your LinkedIn profile and tracks up to 10 jobs, but AI cover letters and one-click resume tailoring need Premium, which is $23.99 a month. Whether that&rsquo;s worth it depends on whether you&rsquo;d use its resume editor and LinkedIn tools, not just one of them.
        </>
      }
      tldr={[
        'Careerflow is a job search toolkit: a resume builder that tailors to a posting, a job tracker, a LinkedIn profile optimizer, AI cover letters and a Chrome extension that saves jobs from 45+ sites.',
        'Premium is $8.99 a week, $23.99 a month, $54.99 for 3 months or $172.99 a year. Purchases are final unless Careerflow agrees to a refund, and the weekly plan is never refunded.',
        "Users praise the tracker and LinkedIn tools and complain about bugs, setup time and an unexpected renewal. Teal's free plan allows more resumes and tracked jobs.",
      ]}
      intro={
        <p>
          I build Cover Me, which also tailors resumes and writes cover letters, so weigh this review with that in mind. Everything here is from Careerflow&rsquo;s pricing page, terms and help center, its Chrome Web Store listing, Trustpilot and Reddit, checked on November 24, 2026. Careerflow publishes its prices, so I didn&rsquo;t need an account to read them. I didn&rsquo;t sign up or pay, so what it&rsquo;s like to use comes from what users report.
        </p>
      }
      sections={[
        {
          title: 'What is Careerflow?',
          body: (
            <>
              <p>
                Careerflow.ai is a set of job search tools in one account, run by Careerflow Inc. Its{' '}
                <a href="https://chromewebstore.google.com/detail/careerflow-ai-job-applica/iadokddofjgcgjpjlfhngclhpmaelnli" {...ext}>Chrome Web Store listing</a> calls it &ldquo;your AI Copilot for your career&rdquo;. The parts:
              </p>
              <ul>
                <li>A resume builder that imports your resume or LinkedIn profile, scores it, and makes a job-tailored copy for a posting you&rsquo;ve saved.</li>
                <li>A job tracker on a Kanban board. The extension saves jobs &ldquo;from 45+ job platforms including LinkedIn, Indeed, Monster, USAJobs, and more&rdquo;, with salary and recruiter details.</li>
                <li>A LinkedIn optimizer that scores your profile from 0 to 100, with an AI rewrite on Premium.</li>
                <li>AI cover letters, made from your resume or LinkedIn profile and the job description, plus autofill for application forms.</li>
                <li>AI mock interviews, on Premium Plus only.</li>
              </ul>
              <p>
                The extension has 200,000 users and rates 4.3 from 288 ratings. Careerflow&rsquo;s <a href="https://www.careerflow.ai/press" {...ext}>press page</a> says it has more than 1 million registered users.
              </p>
            </>
          ),
        },
        {
          title: 'How much does Careerflow cost?',
          body: (
            <>
              <p>
                Careerflow&rsquo;s <a href={PRICING} {...ext}>pricing page</a> lists two paid plans on four billing terms. Premium adds unlimited AI resumes, the ATS optimizer and the AI cover letter writer. Premium Plus adds AI mock interviews, interview analysis and priority support. On November 24, 2026:
              </p>
              <GuideFigure caption={<>From Careerflow&rsquo;s <a href={PRICING} {...ext}>pricing page</a>, checked November 24, 2026. Each paid plan also shows a crossed-out $45.</>}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-[13.5px] bg-white border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-elevated">
                        <th className={th}>Billing</th>
                        <th className={th}>Premium</th>
                        <th className={th}>Premium Plus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PRICES.map((row) => (
                        <tr key={row.term}>
                          <td className={`${td} font-medium text-foreground`}>{row.term}</td>
                          <td className={td}>{row.premium}</td>
                          <td className={td}>{row.plus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GuideFigure>
              <GuideImage
                src="/guides/careerflow-review/pricing-monthly.png"
                alt="Careerflow's pricing page with the Monthly tab selected. Basic: Free. Premium: $23.99 a month, $45 crossed out, $23.99 total, save 20% on yearly plans. Premium Plus: $44.99 a month, $45 crossed out, $44.99 total, save 35% on yearly plans."
                width={1310}
                height={420}
                caption="Careerflow's pricing page on the Monthly tab, November 24, 2026."
              />
              <p>
                Every plan and term shows the same crossed-out $45, from $8.99 a week to $44.99 a month, so it isn&rsquo;t a discount from one regular price. The weekly plan costs $35.96 for four weeks, more than a month at $23.99.
              </p>
              <p>
                Plans renew automatically. Careerflow&rsquo;s <a href={TERMS} {...ext}>terms</a> say you must cancel at least 24 hours before renewal in the Stripe portal on your Account page, and &ldquo;Emailing us is not sufficient grounds for cancellation.&rdquo; Refunds are the exception: &ldquo;All purchases made through the Site are final and non-refundable, except as specified in the terms of a specific service or product offering.&rdquo; Careerflow can grant one at its discretion if you ask within 7 days of the original purchase, the{' '}
                <a href="https://help.careerflow.ai/en/articles/10581224-refund-and-cancelation-policy" {...ext}>help center</a> says forgetting to cancel is &ldquo;non-refundable by default&rdquo;, and &ldquo;The Weekly Subscription is strictly non-refundable under all circumstances.&rdquo;
              </p>
              <p>
                Careerflow&rsquo;s own pages don&rsquo;t agree on the window. Its{' '}
                <a href="https://help.careerflow.ai/en/articles/8965369-cancel-or-pause-your-careerflow-premium-subscription" {...ext}>cancellation article</a> says &ldquo;You can request a refund within 30 days of your purchase&rdquo;, and a line near the end of the terms says &ldquo;We do not provide any refunds for any of our services.&rdquo; Plan on 7 days, and on no refund for the weekly plan.
              </p>
            </>
          ),
        },
        {
          title: 'Is Careerflow free?',
          body: (
            <>
              <p>
                Partly. Its <a href="https://help.careerflow.ai/en/articles/10605570-free-vs-premium-access" {...ext}>help center</a> lists what a free account gets: one resume, a basic resume score and keyword score, a job tracker capped at 10 jobs, and an extension limited to the LinkedIn optimizer, saving jobs and adding contacts. The AI cover letter generator, the One-Click Optimizer and Write with AI are Premium only. The <a href={PRICING} {...ext}>pricing page</a> marks the AI cover letter writer &ldquo;N/A&rdquo; on the free plan, and says the tracker, autofill and document storage are &ldquo;Included (Will be limited soon)&rdquo;.
              </p>
              <p>
                Tailoring is where people disagree. The author of the{' '}
                <a href={DO_NOT_USE} {...ext}>&ldquo;Do not use Careerflow AI&rdquo;</a> post on r/jobhunting wrote in September 2025 that the free version &ldquo;didn&rsquo;t allow me to tailor my resume so i decided to pay and test one month.&rdquo; A Careerflow team member replied, &ldquo;The free version lets you tailor one resume for free to try out our resume tailoring before you buy.&rdquo;
              </p>
            </>
          ),
        },
        {
          title: 'Careerflow reviews: what users report',
          body: (
            <>
              <p>
                The <a href={DO_NOT_USE} {...ext}>r/jobhunting post</a> that ranked first on Google for Careerflow reviews in November 2026 is a paid user&rsquo;s complaint: &ldquo;The linkedin optimizer is filled with bugs and isn&rsquo;t actually helpful. The write with AI feature deleted my entire 4 hours of work after clicking add.&rdquo; They found setting up the main resume &ldquo;very tedious and time consuming (20 hours +)&rdquo;. A Careerflow team member answered that it &ldquo;shouldn&rsquo;t take you 20 hours to edit a resume&rdquo; and offered help.
              </p>
              <p>
                Two other users under the same post disagreed. One wrote in January 2026 that with Careerflow &ldquo;I was able to rapidly tailor resumes for job ad-specific keywords &amp; send out hundreds of resumes&rdquo;, and liked tracking jobs from saved to offer. Another, in February 2026, said they used it &ldquo;to create multiple resume versions and tailor my resume for multiple jobs&rdquo; and called the tracker &ldquo;such a lifesaver.&rdquo;
              </p>
              <p>
                A user who{' '}
                <a href="https://www.reddit.com/r/AIToolTalks/comments/1w4hztf/paid_for_careerflow_for_exactly_2_months/" {...ext}>paid for two months</a> posted on r/AIToolTalks in September 2026 that the LinkedIn optimizer gave &ldquo;specific keyword and headline fixes&rdquo;, but &ldquo;the free tracker caps at ~10 jobs so you get nudged to pay fast, and the AI bullets/cover letters dont quite get my writing style so rewrote them.&rdquo; Their verdict: &ldquo;worth it month-to-month while aggresively applying, might not keep it year-round.&rdquo; They cancelled the day they accepted an offer.
              </p>
              <p>
                On <a href="https://www.trustpilot.com/review/careerflow.ai" {...ext}>Trustpilot</a>, job seekers who left reviews mostly praise the resume tools, the LinkedIn optimizer and support. Two complaints stand out. In March 2026 a user{' '}
                <a href="https://www.trustpilot.com/reviews/69a85164662006451938a6fb" {...ext}>reported an unexpected renewal charge</a>, and wrote that &ldquo;the initial response included a request to leave a review before processing the refund.&rdquo; Careerflow replied that it refunded them and sends renewal reminders seven days before each renewal. In May 2025 another user{' '}
                <a href="https://www.trustpilot.com/reviews/681403dc681f64bb2497edec" {...ext}>said there was no way to delete an account yourself</a>: &ldquo;they require you to email support and wait until the end of the month to be added to some &lsquo;deletion queue.&rsquo;&rdquo;
              </p>
            </>
          ),
        },
        {
          title: 'Is Careerflow legit?',
          body: (
            <>
              <p>
                Yes. The <a href={TERMS} {...ext}>terms</a> are an agreement with Careerflow Inc., under Delaware law. Its <a href="https://www.careerflow.ai/press" {...ext}>press page</a> says it was founded in 2022, and its{' '}
                <a href="https://www.careerflow.ai/blog/careerflow-techstars" {...ext}>blog</a> names the founders, Puneet Kohli (CEO) and Nikita Gupta (COO), and says it was selected for the Techstars Accelerator Oakland class of 2023. The Chrome Web Store lists Puneet Kohli as the extension&rsquo;s developer, with an address in Sunnyvale, California.
              </p>
              <p>
                Read its Trustpilot page with care. It rates 3.8 from 20 reviews, but Careerflow also runs a{' '}
                <a href="https://www.careerflow.ai/human-data" {...ext}>Human Data</a> business that hires freelancers to label data for AI labs, and 8 of those 20 reviews are from freelancers about that work. Five praise it. Three say freelancers weren&rsquo;t paid in full, including one titled{' '}
                <a href="https://www.trustpilot.com/reviews/6a9e7726bbabf6272b95936f" {...ext}>&ldquo;The company refused to pay me for projects&rdquo;</a>; Careerflow replied that it paid for &ldquo;the work that was accepted&rdquo;. None of that is about the job search tools, which leaves about a dozen reviews from job seekers.
              </p>
            </>
          ),
        },
        {
          title: 'Careerflow vs Teal',
          body: (
            <>
              <p>
                <a href="https://www.tealhq.com" {...ext}>Teal</a> is the closest match: a resume builder that matches a posting&rsquo;s keywords, a job tracker and a Chrome extension, with a paid plan for AI writing. Careerflow&rsquo;s own extension listing compares itself with Teal. See the <Link href="/guides/teal-review">Teal review</Link> for more on Teal.
              </p>
              <GuideFigure caption="Careerflow from its pricing page, help center, Chrome Web Store listing and Trustpilot, November 24, 2026. Teal from its pricing page and Trustpilot on November 19, 2026, and its Chrome Web Store listing on November 24. Sources are linked below the table.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-[13.5px] bg-white border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-elevated">
                        <th className={th}>Feature</th>
                        <th className={th}>Careerflow</th>
                        <th className={th}>Teal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {VS_TEAL.map((row) => (
                        <tr key={row.feature}>
                          <td className={`${td} font-medium text-foreground`}>{row.feature}</td>
                          <td className={td}>{row.careerflow}</td>
                          <td className={td}>{row.teal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GuideFigure>
              <p>
                Teal&rsquo;s figures are from its <a href="https://www.tealhq.com/pricing" {...ext}>pricing page</a>, <a href="https://chromewebstore.google.com/detail/teal-job-search-companion/opafjjlpbiaicbbgifbejoochmmeikep" {...ext}>Chrome Web Store listing</a> and <a href="https://www.trustpilot.com/review/tealhq.com" {...ext}>Trustpilot</a>. On their stated limits, Teal&rsquo;s free plan gives more room for resumes: unlimited resumes and tracking against Careerflow&rsquo;s one resume and 10 jobs. One user who <a href="https://www.reddit.com/r/ResumeExperts/comments/1snygj5/tried_careerflow_teal_for_2_months_honestly/" {...ext}>used both for two months</a> found the opposite in practice, writing in April 2026 that Teal &ldquo;feels nicer to use&rdquo; but its free version is &ldquo;kinda restrictive... you hit limits fast&rdquo; and that with Careerflow &ldquo;you get more for free&rdquo;. Paid, Careerflow Premium is $23.99 a month and Teal+ is $29 every 30 days, and both weekly plans cost more over a month. Teal&rsquo;s{' '}
                <a href="https://www.tealhq.com/terms" {...ext}>terms</a> let you ask for a refund on any plan; Careerflow never refunds its weekly plan.
              </p>
            </>
          ),
        },
        {
          title: 'Who is Careerflow for?',
          body: (
            <>
              <p>
                Careerflow suits you if you want one account for your resume, your LinkedIn profile and your applications, and you&rsquo;ll use all three. The free plan is enough to test the LinkedIn score and the extension, and Careerflow says it lets you tailor one resume.
              </p>
              <p>
                If you pay, skip the weekly plan unless you&rsquo;re sure: it&rsquo;s never refunded, and four weeks cost more than a month. Cancel in the Stripe portal at least 24 hours before renewal, since an email doesn&rsquo;t count, and ask for any refund within 7 days of your first payment. Check what the AI writes before you send it: one paying user rewrote its bullets and cover letters to sound like themselves.
              </p>
            </>
          ),
        },
        {
          title: 'Cover Me as a Careerflow alternative',
          body: (
            <>
              <p>
                Cover Me does the tailoring without a resume builder to set up. You upload the resume you have, open a posting on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link> or <Link href="/for/ashby">Ashby</Link>, and it writes a tailored resume with an <Link href="/guides/what-is-an-ats-score">ATS score</Link> and a cover letter for you to edit and send. A check removes any skill your original resume doesn&rsquo;t support. It doesn&rsquo;t score your LinkedIn profile.
              </p>
              <ComparisonTable name="Careerflow" rows={COMPARISON} caption="Careerflow details are from its pricing page, help center and Chrome Web Store listing, checked November 24, 2026." />
              <p>
                The free plan gives 10 generations to start, then 5 a week, cover letters included, and Pro is $15 a month. With{' '}
                <Link href="/guides/use-your-own-api-key-for-cover-letters">your own OpenAI or Claude API key</Link> it&rsquo;s free and unlimited, and you pay the AI provider for what you use. For other tools, see the <Link href="/guides/jobscan-review">Jobscan review</Link>, the <Link href="/guides/jobright-review">Jobright review</Link> and <Link href="/guides/free-jobscan-alternatives">free Jobscan alternatives</Link>, or check a resume against a posting with the <Link href="/ats-checker">free ATS resume checker</Link>.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Tailor each application, cover letter included',
        body: '10 free generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
