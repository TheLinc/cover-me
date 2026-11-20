import type { Metadata } from 'next'
import Link from 'next/link'
import { ComparisonTable, GuideArticle, ext } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('aiapply-review')

export const metadata: Metadata = {
  title: { absolute: 'AIApply Review (2026): Pricing, Auto Apply and Is It Legit' },
  description: "AIApply's writing tools cost $29 a month, and auto-apply is $49 a month for 100 applications. Who runs it, what its free checker found, and what users report.",
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'AIApply review: is it legit, and is auto-apply worth it? | Cover Me',
    description: 'Prices from its help center, a test of its free ATS checker, and what users on Trustpilot and Reddit say.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: "AIApply's prices, free plan, Trustpilot rating and company at a glance" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AIApply review: is it legit, and is auto-apply worth it? | Cover Me',
    description: 'Prices from its help center, a test of its free ATS checker, and what users on Trustpilot and Reddit say.',
    images: [`${BASE}${guide.image}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is AIApply legit?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes, it's a real company: AIApply Limited, registered in England and Wales in October 2023, with two named directors at Companies House. It rates 4.3 out of 5 on Trustpilot from 2,255 reviews (November 19, 2026). The 1-star reviews describe double charges, charges after cancelling, and credits spent on jobs that didn't match what the user asked for.",
      },
    },
    {
      '@type': 'Question',
      name: 'How much does AIApply cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "AIApply's help center lists Premium, its writing tools, at $29 a month or $144 a year. Auto Apply is a separate subscription: $49 a month for 100 applications, $99 a month for 250, or $199 a quarter for 750. There's no free trial. Its pricing page showed no prices when checked on November 19, 2026.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is AIApply free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Partly. A free account gets up to two mock interviews, its job board, saved jobs and a limited number of cover letters, but not the resume builder or Auto Apply. Its free tools, such as the resume ATS checker, work without an account.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does AIApply auto-apply work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "It sends applications in volume, which is what it promises. Results depend on how many of those applications fit you. One Reddit user landed a job after 1,283 applications and $639 over 78 days. Others report applications to jobs outside their filters, and AIApply's own terms say employers may use bot detection.",
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; them: string }[] = [
  { feature: 'Submits applications for you', coverMe: 'No, you review and submit every one', them: 'Yes, with Auto Apply credits; Review mode asks you first' },
  { feature: 'Where you find jobs', coverMe: 'Any posting you open on LinkedIn, Indeed, Greenhouse, Lever, Workday or Ashby, or paste', them: 'Its own job board and matching' },
  { feature: 'Where it runs', coverMe: 'Browser extension, on the page you are viewing', them: 'Separate web dashboard' },
  { feature: 'Resume tailoring', coverMe: 'One click, with an ATS match score and missing keywords shown before you use it', them: 'Tailored Resume add-on, $12 a month' },
  { feature: 'Invented skills', coverMe: 'A check removes skills your original resume does not support', them: 'Not described on its pages' },
  { feature: 'Cover letter', coverMe: 'Written for the posting and editable before you send it', them: 'On Premium; Tailored Cover Letter add-on for Auto Apply, $12 a month' },
  { feature: 'Interview help', coverMe: 'Not included, letters and resumes only', them: 'Mock interviews and Interview Buddy, $19 a month' },
  { feature: 'Pricing', coverMe: 'Free for 10, then 5 a week · Pro $15 a month for 25 a day · prices on the site', them: 'Premium $29 a month; Auto Apply from $49 a month for 100 applications; prices in its help center' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', them: 'No' },
]

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          AIApply is legit: a registered UK company with a Trustpilot rating of 4.3 from more than 2,000 reviews. Its auto-apply sends applications in your name, as many as 100 a day, and it&rsquo;s a separate subscription, $49 a month for 100 of them. Whether that&rsquo;s worth it depends on how much you trust it to pick the right jobs.
        </>
      }
      tldr={[
        'AIApply finds jobs, tailors your resume and cover letter, and submits applications for you. Its writing tools are $29 a month, and Auto Apply is a separate $49 a month for 100 applications.',
        'It is run by AIApply Limited, a UK company founded in 2023. Most 1-star reviews describe billing problems or applications to jobs that did not match.',
        'Its free ATS checker found the right missing keyword in my test, and also reported formatting problems that weren’t there.',
      ]}
      intro={
        <p>
          I build Cover Me, which writes tailored resumes and cover letters but never submits them, so weigh this review with that in mind. Prices are from AIApply&rsquo;s help center and terms, and reviews from Trustpilot and Reddit, all checked on November 19, 2026. I tried its free ATS checker without an account. I didn&rsquo;t buy Auto Apply, because testing it means sending real applications to real employers.
        </p>
      }
      sections={[
        {
          title: 'What does AIApply do?',
          body: (
            <>
              <p>
                AIApply is built around Auto Apply. You upload your resume, set the jobs you want, and it{' '}
                <a href="https://support.aiapply.co/en/articles/14216708-how-does-auto-apply-works" {...ext}>submits applications on your behalf</a>, from 10 to 100 a day depending on the limit you set. It answers the screening questions from your profile and a library of saved answers, and it{' '}
                <a href="https://support.aiapply.co/en/articles/15069695-how-can-i-access-login-credentials-and-application-details-for-jobs-applied-through-aiapply" {...ext}>may create accounts on employer websites</a> to do it.
              </p>
              <p>
                There are three modes. Auto applies to every match, Hybrid submits jobs with a fit score of 75 or higher and holds the rest, and Review asks you to approve each one. Separately, a Premium plan covers a resume builder, cover letters and mock interviews.
              </p>
            </>
          ),
        },
        {
          title: 'How much does AIApply cost?',
          body: (
            <>
              <p>
                AIApply&rsquo;s pricing page sent me to its home page without showing a price. Its help center lists them, checked November 19, 2026:
              </p>
              <ul>
                <li>
                  <a href="https://support.aiapply.co/en/articles/15126913-premium-plans-account" {...ext}>Premium</a>, the writing tools: $29 a month or $144 a year.
                </li>
                <li>
                  <a href="https://support.aiapply.co/en/articles/16864279-how-plans-credits-and-charges-work" {...ext}>Auto Apply</a>, a separate subscription: $49 a month for 100 applications, $99 a month for 250, or $199 a quarter for 750. Tailored resumes and cover letters for each application are add-ons at $12 a month each.
                </li>
                <li>
                  <a href="https://support.aiapply.co/en/articles/15692800-free-trial-getting-started" {...ext}>Free</a>: no trial, but a free account gets up to two mock interviews, the job board and a limited number of cover letters.
                </li>
              </ul>
              <p>
                One credit is one application, and when the credits run out Auto Apply stops until your plan renews or you buy more. The{' '}
                <a href="https://support.aiapply.co/en/articles/15069772-what-is-aiapply-s-refund-policy" {...ext}>refund policy</a> covers an accidental purchase only if you contact support within 30 minutes of the charge. Auto Apply isn&rsquo;t refunded once applications have gone out, and renewals are &ldquo;generally non-refundable&rdquo;.
              </p>
            </>
          ),
        },
        {
          title: 'Does AIApply work?',
          body: (
            <>
              <p>
                I ran its free <a href="https://aiapply.co/tools/resume-ats-checker" {...ext}>resume ATS checker</a>, which needs no account, on a made-up marketing manager&rsquo;s resume and a made-up posting that asked for HubSpot. A text file failed with &ldquo;HTTP error! status: 400&rdquo;, though the page says it takes TXT. A PDF of the same resume worked, and the report came back in about 14 seconds with a 72% match.
              </p>
              <p>
                The keyword list was right. It flagged HubSpot and social media as missing, which they were, and said to add HubSpot &ldquo;only if you have genuinely used it&rdquo;. The formatting findings were not. It said the resume &ldquo;is provided as structured JSON rather than a document&rdquo; when I had uploaded a PDF, and that one job&rsquo;s bullets had no numbers when they mention 150,000 subscribers and 12 events a year. Use the keyword list and check the rest yourself.
              </p>
              <p>
                For Auto Apply, users are split. In June 2026 one user posted on{' '}
                <a href="https://www.reddit.com/r/jobsearchhacks/comments/1u8aeim/ai_apply_639_78_days_and_1283_applications_later/" {...ext}>r/jobsearchhacks</a> that they had landed a job after 1,283 applications, 78 days and $639: &ldquo;There is no way I could have submitted over 1,000 applications on my own. It&rsquo;s ridiculously expensive if you want it to work.&rdquo; Another, in{' '}
                <a href="https://www.reddit.com/r/jobsearchhacks/comments/1uiyguq/aiapply_was_a_waste_of_money/" {...ext}>a post called &ldquo;Aiapply was a waste of money&rdquo;</a>, said it applied to jobs requiring French after being told not to. On Trustpilot, a 2-star review from August 2026 says &ldquo;i only got 2 interviews among hundreds of applications&rdquo;, and a 1-star one from November 2026 says it &ldquo;wasted my credits for two consecutive months applying to jobs that clearly don&rsquo;t match my requirements.&rdquo;
              </p>
              <p>
                Employers can notice too. AIApply&rsquo;s own <a href="https://aiapply.co/terms" {...ext}>terms</a> say &ldquo;Employers/platforms may use AI/bot-detection; we do not guarantee any outcome.&rdquo;
              </p>
            </>
          ),
        },
        {
          title: 'Is AIApply legit?',
          body: (
            <>
              <p>
                Yes. The terms name AIApply Limited, company number 15200716, registered in England and Wales. <a href="https://find-and-update.company-information.service.gov.uk/company/15200716/officers" {...ext}>Companies House</a> lists it as incorporated on 10 October 2023, with two directors, Aidan Cramer and Peter Utekal. The investor{' '}
                <a href="https://haatch.com/latest-news/AIApply-Named-in-Tech-Nations-Future-Fifty-and-Why-It-Matters" {...ext}>Haatch</a> backed it in March 2024, and in 2026 it joined Tech Nation&rsquo;s Future Fifty.
              </p>
              <p>
                On <a href="https://www.trustpilot.com/review/aiapply.co" {...ext}>Trustpilot</a> it rates 4.3 out of 5 from 2,255 reviews, 1,347 of them from the last 12 months, and Trustpilot notes that AIApply invites customers to review it. The 5-star reviews praise how many jobs it finds: &ldquo;AIApply found more jobs in ten minutes than I could find in a month!!!&rdquo; (November 19, 2026). The 1-star reviews are about billing and support: &ldquo;I was charged twice in one day, and trying to contact someone for help has been impossible&rdquo; (October 2026). Its help center has articles on the same problems, including{' '}
                <a href="https://support.aiapply.co/en/collections/18314774-faqs" {...ext}>&ldquo;The tool is applying to jobs outside my criteria&rdquo;</a>.
              </p>
            </>
          ),
        },
        {
          title: 'Who is AIApply for?',
          body: (
            <>
              <p>
                AIApply suits you if you&rsquo;re applying broadly, for roles where you&rsquo;d take most offers, and the hours spent on application forms are what&rsquo;s stopping you. The user who landed a job after 1,283 applications is that case. Start in Review mode, so you see each job before it goes out, and loosen it once the matches look right.
              </p>
              <p>
                It suits you less if you&rsquo;re aiming at a few specific employers, where an application sent to the wrong role under your name costs more than it saves. Budget for it as a subscription with credits on top, and cancel at least 24 hours before renewal, as the terms require.
              </p>
            </>
          ),
        },
        {
          title: 'Cover Me as an AIApply alternative',
          body: (
            <>
              <p>
                Cover Me stops one step earlier, on purpose. On a posting on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link> or <Link href="/for/ashby">Ashby</Link>, it writes a tailored resume with an <Link href="/guides/what-is-an-ats-score">ATS score</Link> and a cover letter, then hands them to you to edit and send. Nothing goes out under your name that you haven&rsquo;t read, and a check removes any skill your original resume doesn&rsquo;t support.
              </p>
              <ComparisonTable name="AIApply" rows={COMPARISON} caption="AIApply details are from its help center and terms, checked November 19, 2026." />
              <p>
                The free plan gives 10 generations to start, then 5 a week, and Pro is $15 a month, with no credit packs. With{' '}
                <Link href="/guides/use-your-own-api-key-for-cover-letters">your own OpenAI or Claude API key</Link> it&rsquo;s free and unlimited, and you pay the AI provider for what you use. If you&rsquo;re comparing resume checkers rather than auto-apply, try Cover Me&rsquo;s <Link href="/ats-checker">free ATS resume checker</Link>, which also needs no account, or see the <Link href="/guides/jobscan-review">Jobscan review</Link>, the <Link href="/guides/teal-review">Teal review</Link> and <Link href="/guides/free-jobscan-alternatives">free Jobscan alternatives</Link>.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Try applications you review first',
        body: '10 free generations to start, then 5 a week. No credit packs and no credit card required.',
      }}
    />
  )
}
