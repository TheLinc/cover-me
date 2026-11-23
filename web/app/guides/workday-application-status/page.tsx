import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle, GuideFigure, ext } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'
import { PLAN_LIMITS as L } from '@/lib/limits'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('workday-application-status')

const SOCIAL_DESCRIPTION = "What Submitted, In Progress and Completed mean in Workday, why Completed usually means you weren't picked, and what to do at each one."

export const metadata: Metadata = {
  title: 'Workday Application Status Meanings, Explained',
  description: "What each Workday application status means: Submitted, In Progress, Completed and Withdrew. Why Completed usually means no, and what to do next. From HR guides.",
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Workday Application Status Meanings, Explained | Cover Me',
    description: SOCIAL_DESCRIPTION,
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'Table of Workday application statuses: Submitted, In Progress and Completed, with the tab each appears on and what it usually means' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Workday Application Status Meanings, Explained | Cover Me',
    description: SOCIAL_DESCRIPTION,
    images: [`${BASE}${guide.image}`],
  },
}

const SOURCES = {
  wisc: {
    name: 'UW–Madison HR',
    url: 'https://hr.wisc.edu/hr-guides/for-hr-professionals/candidate-view-by-job-application-status/',
  },
  uw: {
    name: 'University of Washington',
    url: 'https://www.washington.edu/jobs/after-applying/',
  },
  uwHr: {
    name: 'UW Human Resources',
    url: 'https://hr.uw.edu/talent/hiring-process/workday-recruiting-job-aids/candidate-communications',
  },
  workday: {
    name: 'Workday’s recruiting manual',
    url: 'https://doc.workday.com/workday-education/en-us/course-manuals/recruiting-for-administrators/the-job-application-business-process.html',
  },
  montgomery: {
    name: 'Montgomery College',
    url: 'https://info.montgomerycollege.edu/_documents/offices/information-technology/workday/bi-yearly-upgrade/jobs-hub.pdf',
  },
}

type Source = keyof typeof SOURCES

const STATUSES: { status: string; tab: string; means: string; next: string; sources: Source[] }[] = [
  {
    status: 'Submitted',
    tab: 'Active',
    means: 'The employer has your application, and it is in the first review stage.',
    next: 'Nothing yet. Keep applying elsewhere.',
    sources: ['wisc'],
  },
  {
    status: 'In Progress',
    tab: 'Active',
    means: 'You are still being considered. At some employers it means you’re past the first review, such as at interview or assessment. At others it covers every active stage, review included.',
    next: 'Watch your email and the tasks in your candidate account. A scheduled phone screen doesn’t change the status.',
    sources: ['wisc', 'workday', 'uw'],
  },
  {
    status: 'Completed',
    tab: 'Inactive',
    means: 'The process ended for you. Usually you were declined, or the job was canceled. At some employers, hired applications move to the Inactive tab too.',
    next: 'If you have no offer, treat it as a no. You can still apply for other jobs at the same employer.',
    sources: ['wisc', 'montgomery'],
  },
  {
    status: 'Withdrew',
    tab: 'Inactive',
    means: 'You took yourself out of consideration.',
    next: 'Nothing. If you change your mind, contact the recruiter.',
    sources: ['wisc', 'uw'],
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What does "Completed" mean on a Workday application?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "It means the hiring process has ended for you, and usually that you weren't selected. In UW–Madison's Workday setup, every decline reason except a withdrawal shows the candidate \"Completed\" on the Inactive tab, and so does a canceled job. At some employers, hired applications move to the Inactive tab too, so if you accepted an offer, that may be why. If you didn't, read it as a no.",
      },
    },
    {
      '@type': 'Question',
      name: 'Does Workday tell you when you are rejected?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Not always. Employers set up their own notices. UW–Madison's HR guide says changing a candidate's status in Workday \"does not send them any kind of notification/communication\", while the University of Washington sends a notice when a candidate is no longer under consideration. Workday also lets employers delay decline notices by a day or more, so the status can change before any email arrives.",
      },
    },
    {
      '@type': 'Question',
      name: 'What does "In Progress" mean on Workday?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "It means your application is active and still being considered. Workday's own manual gives the example of showing candidates \"In Progress\" instead of Review, Screen or Interview, so one label can cover several stages. At UW–Madison it means you're past the first review. At the University of Washington it means HR is reviewing your resume.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is "In Progress" a good sign on Workday?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "It means you haven't been turned down yet, and not much more. At the University of Washington, In Progress is the status from the day HR starts reading your resume, so it says nothing about interviews. Read it as \"not rejected yet\", and keep applying elsewhere.",
      },
    },
    {
      '@type': 'Question',
      name: 'What does "Submitted" mean on Workday?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "It means the employer received your application and it is in the first review stage. In UW–Madison's setup, candidates see \"Submitted\" while their application is in the Review stage, and it changes to \"In Progress\" when they move to a later stage, such as an interview.",
      },
    },
  ],
}

function Cite({ source }: { source: Source }) {
  return (
    <a href={SOURCES[source].url} {...ext}>
      {SOURCES[source].name}
    </a>
  )
}

export default function Page() {
  const th = 'border-b border-line px-4 py-3 text-left font-bold text-muted-foreground'
  const td = 'border-b border-line px-4 py-3 align-top'
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          A Workday application shows a status such as Submitted, In Progress, Completed or Withdrew, and employers can rename them. The one that trips people up is Completed, which in most cases means you weren&rsquo;t selected. Here is what each status means, where it comes from, and what to do next.
        </>
      }
      tldr={[
        'Submitted: the employer has it, and it is in the first review.',
        'In Progress: you are still being considered. It can cover every stage from first review to interview.',
        "Completed, on the Inactive tab: the process ended for you. Unless you have an offer, you weren't selected.",
        "Changing your status in Workday doesn't send an email by itself, so the status can be the only answer you get.",
      ]}
      intro={
        <p>
          The meanings below come from employers&rsquo; and universities&rsquo; own HR guides and from Workday&rsquo;s recruiting manual for administrators, not from other job sites. I read each source on November 23, 2026, and each row of the table links to the ones it rests on. Employers set up Workday their own way, so your employer&rsquo;s labels can differ. The section after the table explains how.
        </p>
      }
      sections={[
        {
          title: 'Workday application statuses and what they mean',
          body: (
            <>
              <p>
                In Workday, each application has a status (Active or Inactive), a stage such as Screen or Interview, and a step within the stage. You see a simplified version on your candidate account. Active applications sit on one tab and inactive ones on another, and a label tells you roughly where yours stands.
              </p>
              <GuideFigure caption="What candidates see in Workday, from the HR guides and Workday manual linked in each row. Read November 23, 2026.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] overflow-hidden rounded-[8px] border border-line bg-white text-[14px]" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-paper">
                        <th className={th}>Status</th>
                        <th className={th}>Tab</th>
                        <th className={th}>What it usually means</th>
                        <th className={th}>What to do</th>
                        <th className={th}>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STATUSES.map((s, i) => (
                        <tr key={s.status} className={i % 2 === 0 ? 'bg-surface' : 'bg-paper'}>
                          <td className={`${td} font-medium text-foreground`}>{s.status}</td>
                          <td className={`${td} text-muted-foreground`}>{s.tab}</td>
                          <td className={`${td} text-muted-foreground`}>{s.means}</td>
                          <td className={`${td} text-muted-foreground`}>{s.next}</td>
                          <td className={`${td} text-muted-foreground`}>
                            {s.sources.map((source, j) => (
                              <span key={source}>
                                {j > 0 && ', '}
                                <Cite source={source} />
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GuideFigure>
              <p>
                UW&ndash;Madison&rsquo;s HR guide gives the clearest mapping. While an application is in the Review stage, the candidate sees &ldquo;Application Status: Submitted&rdquo; on the Active tab. Any other active stage, such as an interview, an assessment or an employment agreement, shows &ldquo;Application Status: In Progress&rdquo;. Any decline reason except a withdrawal shows &ldquo;Application Status: Completed&rdquo; on the Inactive tab, and so does a canceled job (<Cite source="wisc" />).
              </p>
            </>
          ),
        },
        {
          title: 'What “Completed” means in Workday',
          body: (
            <>
              <p>
                &ldquo;Completed&rdquo; on a Workday application means the hiring process has ended for you, and in most cases that you weren&rsquo;t selected. It doesn&rsquo;t mean your application went through and is complete. The word describes the process, not the outcome.
              </p>
              <p>
                In UW&ndash;Madison&rsquo;s table, Completed appears in two cases: the employer declined you for any reason other than your own withdrawal, or the job requisition was canceled (<Cite source="wisc" />). The University of Washington&rsquo;s statuses make the same point in plainer words. Theirs says &ldquo;Not selected&rdquo;, which &ldquo;can occur at any time after application&rdquo;, and a canceled job shows &ldquo;Recruitment Canceled&rdquo; (<Cite source="uw" />).
              </p>
              <p>
                Hires can end up on the same tab. Montgomery College&rsquo;s Workday guide for its own employees says applications that have been &ldquo;withdrawn, rejected or are ready for hire appear under the Inactive tab&rdquo; (<Cite source="montgomery" />). Neither guide says which label a hire shows. If you accepted an offer, that may be why your application moved. If you didn&rsquo;t, Completed means no.
              </p>
              <h3>Why you might see Completed with no email</h3>
              <p>
                UW&ndash;Madison&rsquo;s HR guide warns its own recruiters that changing a candidate&rsquo;s status in Workday, &ldquo;including removing them from consideration or closing the Job Requisition, does not send them any kind of notification/communication&rdquo; (<Cite source="wisc" />). An email goes out only if the recruiter sends one or the employer has set Workday up to send it. The University of Washington does. It sends a &ldquo;Disposition notification&rdquo; that &ldquo;Informs the candidate when they are no longer under consideration&rdquo; (<Cite source="uwHr" />).
              </p>
              <p>
                Workday also lets employers hold decline emails back. Its manual says &ldquo;Candidates do not receive notifications immediately if they are declined from a job application&rdquo; when an employer turns on the delay, and &ldquo;The minimum delay is one day&rdquo; (<Cite source="workday" />). So the status can change a day or more before the email, and at some employers the email never comes.
              </p>
            </>
          ),
        },
        {
          title: 'Why your Workday status may use other words',
          body: (
            <>
              <p>
                Employers can rename what candidates see. Workday&rsquo;s manual for administrators describes an &ldquo;External Label Override&rdquo; for communications sent to candidates, and gives the example: &ldquo;instead of Review, Screen, or Interview, &lsquo;In Progress&rsquo; displays for candidates&rdquo; (<Cite source="workday" />).
              </p>
              <p>The University of Washington is one employer with its own labels. Its candidates can see five (<Cite source="uw" />):</p>
              <ul>
                <li>&ldquo;In Progress: Your application has been received and University of Washington Human Resources (UWHR) is reviewing your resume for minimum qualifications and eligibility&rdquo;</li>
                <li>&ldquo;Sent to dept: UWHR has reviewed your resume and sent it to the department&rsquo;s hiring manager&rdquo;</li>
                <li>&ldquo;Not selected: You were not selected for this position&rdquo;</li>
                <li>&ldquo;Withdrew: You asked to be removed from consideration for the position&rdquo;</li>
                <li>&ldquo;Recruitment Canceled: Recruitment was canceled by the department, so the position will not be filled&rdquo;</li>
              </ul>
              <p>
                There, In Progress means HR is still checking your resume, which is earlier than UW&ndash;Madison&rsquo;s In Progress. The same word means a different stage at each employer.
              </p>
              <p>
                If your status uses a word that isn&rsquo;t in the table, such as &ldquo;Under consideration&rdquo;, the tab tells you more than the word. I couldn&rsquo;t find an HR guide that defines &ldquo;Under consideration&rdquo;, so I won&rsquo;t guess at a meaning. An application on the Active tab is still open, and one on the Inactive tab is closed.
              </p>
            </>
          ),
        },
        {
          title: 'What your Workday status doesn’t show',
          body: (
            <>
              <p>
                The status leaves out most of what the recruiter sees. Workday tracks a step inside each stage, such as a phone screen or a resume screen, but UW&ndash;Madison&rsquo;s guide says the status and stage &ldquo;will influence what they see in their Candidate Home account, while the Step does not&rdquo; (<Cite source="wisc" />). A recruiter can move you through several steps and your status won&rsquo;t change.
              </p>
              <p>
                It also doesn&rsquo;t show timing. The University of Washington says &ldquo;The total time it takes to fill any position varies&rdquo; and that &ldquo;Hiring departments only contact the most competitive candidates to interview&rdquo; (<Cite source="uw" />). An application can stay In Progress for weeks, and a status that hasn&rsquo;t changed tells you nothing either way.
              </p>
              <p>
                So while a status sits unchanged, put your time into the next application rather than refreshing this one.
              </p>
            </>
          ),
        },
        {
          title: 'Get your next Workday application ready',
          body: (
            <>
              <p>
                I build <Link href="/">Cover Me</Link>, a Chrome extension that gets the documents for a Workday application ready before you start the form. Open the posting on the employer&rsquo;s myworkdayjobs.com site and click the Cover Me icon. It reads the job and tailors your resume to it, writes a cover letter from your resume, and gives you an ATS score for how well the resume covers the posting&rsquo;s keywords. For a written question in the form, right-click its box and choose &ldquo;Cover Me: write an answer&rdquo;. More on how it works in Workday is on the <Link href="/for/workday">Cover Me for Workday</Link> page.
              </p>
              <p>
                Upload the resume as a text PDF or a Word file. In my test of <Link href="/guides/ats-friendly-resume-format">six resume formats in four ATSs</Link>, Workday read nothing from an image-only PDF.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Tailor your next Workday application',
        body: `Open a myworkdayjobs.com posting and click the icon. Free with your own API key, or ${L.free_starter} generations to start, then ${L.free_weekly} a week. No credit card required.`,
      }}
    />
  )
}
