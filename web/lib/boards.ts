// Per-job-board landing page content for /for/[board].
// Each board gets differentiated copy. Search engines and AI engines penalize
// near-duplicate doorway pages, so keep the intros, steps, and FAQs specific,
// and keep board behavior claims in line with extension/src/content/scrapers.

export interface BoardFaq {
  q: string
  a: string
}

export interface Board {
  slug: string
  name: string
  /** e.g. "job board", "applicant tracking system", used in copy */
  kind: string
  metaTitle: string
  metaDescription: string
  h1: string
  /** Direct-answer paragraph rendered right under the H1, written for featured snippets. */
  answer: string
  intro: string[]
  steps: { title: string; body: string }[]
  faqs: BoardFaq[]
}

export const BOARDS: Board[] = [
  {
    slug: 'linkedin',
    name: 'LinkedIn',
    kind: 'job board',
    metaTitle: 'AI Cover Letter and Resume Tailor for LinkedIn Jobs',
    metaDescription:
      'Click once on a LinkedIn job and Cover Me writes a cover letter and tailors your resume to it. Works in the search results panel too. Free Chrome extension.',
    h1: 'AI cover letters and tailored resumes for LinkedIn jobs',
    answer:
      'To tailor a cover letter and resume to a LinkedIn job, open the posting and click the Cover Me icon. Cover Me (cover-me.dev) is a free Chrome extension that reads the job title, company and description from the page, then writes a cover letter and rewrites your resume for that role, using only what your resume already shows.',
    intro: [
      "LinkedIn shows jobs two ways: a full job page, and a split view where the posting opens in a panel beside your search results or saved collections. Cover Me reads both, so you don't have to open each job in its own tab first.",
      "It has no LinkedIn integration and never signs in to your account. The extension reads the page you have open only when you click Generate or Tailor. LinkedIn changes its layout often, so Cover Me's scrapers are tested against live LinkedIn postings every week, and once you agree, Cover Me's server also reads the page, which lets most layout changes get fixed without a new extension release.",
    ],
    steps: [
      {
        title: 'Open a job on LinkedIn',
        body: 'Use the full job page or the job panel beside your search results or saved collections.',
      },
      {
        title: 'Click Generate or Tailor',
        body: 'Cover Me reads the title, company and full description from that tab. Nothing is posted to LinkedIn and your account is never accessed.',
      },
      {
        title: 'Add it to Easy Apply',
        body: 'Edit the letter, then copy it or download a PDF. If the Easy Apply form takes a resume upload, upload the tailored resume PDF.',
      },
    ],
    faqs: [
      {
        q: 'Does Cover Me work with LinkedIn Easy Apply?',
        a: "Yes. Copy the letter or download it as a PDF, then add it in the Easy Apply form. If the form takes a resume upload, use the tailored resume PDF. Cover Me never fills in or submits the form, so you check everything before it's sent.",
      },
      {
        q: 'Does Cover Me need access to my LinkedIn account?',
        a: "No. Cover Me reads the page only when you click Generate or Tailor. It never signs in to LinkedIn, never opens your profile or connections, and has no LinkedIn integration. Since version 1.3.0, once you agree, a copy of the job page goes to Cover Me's server to read the posting. On a signed-in LinkedIn page that copy can include your name. Cover Me doesn't keep the copy. See the privacy policy for details.",
      },
      {
        q: 'Does it work on LinkedIn search results, or only full job pages?',
        a: 'Both. Cover Me reads the job panel that opens beside LinkedIn search results and saved-job collections, as well as full job pages, so you can generate without leaving your search.',
      },
    ],
  },
  {
    slug: 'indeed',
    name: 'Indeed',
    kind: 'job board',
    metaTitle: 'AI Cover Letter and Resume Tailor for Indeed Jobs',
    metaDescription:
      'Click once on an Indeed job and Cover Me writes a cover letter and tailors your resume to it, from the job page or the search preview pane. Free Chrome extension.',
    h1: 'AI cover letters and tailored resumes for Indeed jobs',
    answer:
      "To write a cover letter for an Indeed job, open the posting or select it in your search results, then click the Cover Me icon. Cover Me (cover-me.dev) is a free Chrome extension that reads the posting from Indeed's page and writes a letter and a tailored resume from your own resume, so each application matches its job.",
    intro: [
      'Indeed is built for applying to a lot of jobs, and that is where cover letters usually get copied from the last application. Tailoring each one by hand takes long enough that most people stop after a few.',
      "Cover Me reads the job in Indeed's right-hand preview pane on search results, or on the full job page. It pulls the title, company and full description, then builds the letter and resume from your resume and that posting. The tenth application of the day gets the same treatment as the first.",
    ],
    steps: [
      {
        title: 'Open a job on Indeed',
        body: 'Select a job in your search results so it opens in the preview pane, or open the full job page.',
      },
      {
        title: 'Click Generate or Tailor',
        body: "Cover Me reads the title, company and description. If Indeed shows a layout the scraper doesn't recognize, paste the description into Cover Me instead.",
      },
      {
        title: 'Add it to your application',
        body: "Edit the letter, then paste it into Indeed's application form or upload the PDF. When a job sends you to the company's own site, open the posting there and run Cover Me again.",
      },
    ],
    faqs: [
      {
        q: "Does Cover Me work with Indeed's application form?",
        a: 'Yes. When the form asks for a cover letter, paste the text or upload the PDF from Cover Me. Cover Me never fills in or submits applications.',
      },
      {
        q: "Does it work when Indeed links out to a company's own career site?",
        a: 'Usually. Many company career sites run on Greenhouse, Lever, Workday or Ashby, and Cover Me reads those when you click, including postings a careers page embeds from those systems. On any other site, paste the job description into Cover Me.',
      },
      {
        q: 'Can I see how my resume matches an Indeed job before I apply?',
        a: "Yes. Tailor Resume to Job scores your resume against the posting from 0 to 100 and lists the keywords you're missing. Cover Me calculates the score in code from which of the posting's must-have and nice-to-have keywords your resume covers, so the same keyword coverage always gives the same score.",
      },
    ],
  },
  {
    slug: 'greenhouse',
    name: 'Greenhouse',
    kind: 'applicant tracking system',
    metaTitle: 'AI Cover Letter and Resume Tailor for Greenhouse Applications',
    metaDescription:
      'Applying through a Greenhouse job page? Cover Me reads the posting and writes a cover letter and tailored resume from your own resume in one click. Free Chrome extension.',
    h1: 'AI cover letters and tailored resumes for Greenhouse applications',
    answer:
      'To tailor a cover letter for a Greenhouse application, open the posting and click the Cover Me icon. Cover Me (cover-me.dev) is a free Chrome extension that reads Greenhouse postings on job-boards.greenhouse.io, on company career pages that embed them, and in your my.greenhouse.io account, then writes a letter and tailored resume from your resume.',
    intro: [
      "Greenhouse is the applicant tracking system behind many tech company career pages. You'll recognize its postings by the job-boards.greenhouse.io address, or by an application form at the bottom of a company's own careers page. Many Greenhouse forms include a cover letter field, often marked optional.",
      "Cover Me reads the posting wherever it appears. On a company site, the Greenhouse posting often loads inside a frame from greenhouse.io, and Cover Me has permission to read that frame when you click. If you search and track jobs in my.greenhouse.io, it also reads the posting in the job pop-up and on your Applications page.",
    ],
    steps: [
      {
        title: 'Open a Greenhouse posting',
        body: 'On job-boards.greenhouse.io, on a company careers page with a Greenhouse form, or in my.greenhouse.io.',
      },
      {
        title: 'Click Generate or Tailor',
        body: 'Cover Me reads the title, company and full description, including from an embedded Greenhouse frame.',
      },
      {
        title: 'Attach it',
        body: 'Paste the letter into the cover letter field or upload the PDF, and upload the tailored resume PDF in the resume field.',
      },
    ],
    faqs: [
      {
        q: 'Greenhouse says the cover letter is optional. Should I still send one?',
        a: 'If you can make it specific, yes. A letter about their posting gives the reader one more reason to move you forward, and a generic letter adds little. Cover Me writes the specific version from your resume and the posting, so filling the field takes one click and a read-through.',
      },
      {
        q: 'Does Cover Me work on Greenhouse boards embedded in company websites?',
        a: "Yes. Whether the posting is on job-boards.greenhouse.io or embedded in a company's careers page, Cover Me reads it when you click. If a heavily customized page doesn't read cleanly, paste the description into Cover Me instead.",
      },
      {
        q: 'Will the letter use the keywords recruiters search for?',
        a: "Yes. Cover Me pulls the must-have and nice-to-have keywords from the posting and uses the ones your resume supports in the letter and the tailored resume. Tailor Resume to Job also shows a match score from 0 to 100 and the keywords you're still missing.",
      },
    ],
  },
  {
    slug: 'lever',
    name: 'Lever',
    kind: 'applicant tracking system',
    metaTitle: 'AI Cover Letter and Resume Tailor for Lever Applications',
    metaDescription:
      'Applying through jobs.lever.co? Cover Me reads the Lever posting and writes a cover letter and tailored resume from your own resume in one click. Free Chrome extension.',
    h1: 'AI cover letters and tailored resumes for Lever applications',
    answer:
      "To write a cover letter for a Lever application, open the jobs.lever.co posting and click the Cover Me icon. Cover Me (cover-me.dev) is a free Chrome extension that reads the role, company and description from the posting's structured job data, then writes a letter and a tailored resume from your resume.",
    intro: [
      'Lever is an applicant tracking system used by many startups and growing companies. Its application form usually ends with an Additional information box, which is where a short cover letter goes when the form has no separate field for one.',
      'Lever postings include structured job data that names the company and role exactly, and Cover Me reads it when you click. Add a note before you generate, like a referral or a project you want mentioned, and the letter uses it alongside your resume.',
    ],
    steps: [
      {
        title: 'Open a Lever posting',
        body: "Any jobs.lever.co job page works, and so do Lever postings embedded in a company's careers page.",
      },
      {
        title: 'Add context if you want',
        body: 'Type a referral, a project, or the reason you want this company. Cover Me works it into the letter with your resume.',
      },
      {
        title: 'Paste it in',
        body: 'Paste the letter into the cover letter field or the Additional information box, or attach the PDF. Edit anything first.',
      },
    ],
    faqs: [
      {
        q: 'Does Cover Me work on every Lever job page?',
        a: "Cover Me reads standard jobs.lever.co postings, and Lever postings embedded on company sites, when you click. If a company has customized its page so it doesn't read cleanly, paste the description into Cover Me and you get the same result.",
      },
      {
        q: 'Can I personalize the letter beyond my resume?',
        a: 'Yes. Before generating, add context: a referral, a project you want highlighted, or why you want this company. Cover Me uses it in the letter along with your resume and the posting.',
      },
      {
        q: 'Is Cover Me free for Lever applications?',
        a: 'Yes. With your own Claude or OpenAI API key it is free and unlimited, with no account needed. The hosted free plan gives 10 generations to start, then 5 a week. Pro is $15 a month or $35 every 3 months for up to 25 generations a day.',
      },
    ],
  },
  {
    slug: 'workday',
    name: 'Workday',
    kind: 'applicant tracking system',
    metaTitle: 'AI Cover Letter and Resume Tailor for Workday Applications',
    metaDescription:
      'Workday applications are long. Cover Me reads the myworkdayjobs.com posting and writes your cover letter and tailored resume in one click, before you start the form.',
    h1: 'AI cover letters and tailored resumes for Workday applications',
    answer:
      "To tailor a cover letter for a Workday application, open the myworkdayjobs.com posting and click the Cover Me icon before you start the form. Cover Me (cover-me.dev) is a free Chrome extension that reads the job from Workday's page and writes a cover letter and tailored resume as PDFs you can upload in the application.",
    intro: [
      'Workday is the applicant tracking system many large employers use. Its applications are long: you create an account with each employer, check the details Workday parsed from your resume, and answer screening questions, and the cover letter upload comes late in the process.',
      "Tailoring first means both documents are ready before you start. Cover Me reads Workday's page by labels that stay the same across employers, and takes the company name from the posting's address, like acme.wd1.myworkdayjobs.com.",
    ],
    steps: [
      {
        title: 'Open a Workday posting',
        body: "Open the job description on the employer's myworkdayjobs.com site, before you click Apply.",
      },
      {
        title: 'Click Generate or Tailor',
        body: "Cover Me reads the title, company and description. If an employer's Workday site doesn't read cleanly, paste the description into Cover Me instead.",
      },
      {
        title: 'Upload in Workday',
        body: 'Download the tailored resume and the cover letter as PDFs. Upload the resume when the application starts and the letter where the form asks for documents, or paste the letter text.',
      },
    ],
    faqs: [
      {
        q: 'Is a cover letter worth it on a Workday application?',
        a: 'When the form has a place for one, a specific letter costs you little and gives the recruiter more to go on than the form fields. The tailored resume matters too, because Workday reads your resume into the fields recruiters review.',
      },
      {
        q: "Does Cover Me work on every company's Workday site?",
        a: "Cover Me reads standard myworkdayjobs.com postings when you click. Employers can customize their Workday sites, so if a page doesn't read completely, paste the description into Cover Me and you get the same result.",
      },
      {
        q: 'Can Cover Me fill out the Workday application for me?',
        a: 'No. Cover Me writes the cover letter and tailors your resume. It never fills in or submits a Workday application, so the form stays in your hands.',
      },
    ],
  },
  {
    slug: 'ashby',
    name: 'Ashby',
    kind: 'applicant tracking system',
    metaTitle: 'AI Cover Letter and Resume Tailor for Ashby Applications',
    metaDescription:
      'Applying through jobs.ashbyhq.com? Cover Me reads the Ashby posting and writes a cover letter and tailored resume from your own resume in one click. Free Chrome extension.',
    h1: 'AI cover letters and tailored resumes for Ashby applications',
    answer:
      "To write a cover letter for an Ashby application, open the jobs.ashbyhq.com posting and click the Cover Me icon. Cover Me (cover-me.dev) is a free Chrome extension that reads the role, company and description from the posting's structured job data and writes a letter and tailored resume from your resume, with stock AI phrases filtered out.",
    intro: [
      "Ashby is a newer applicant tracking system used by many startups. At a small company the person reading your application can be the hiring manager, so a letter about their actual role does more than one that could go to any company.",
      'Cover Me checks each letter for stock phrases like "I am excited to apply" and "passionate", and builds it from results in your resume in the posting\'s own words. It also reads Ashby postings embedded in company careers pages, through permission to read the Ashby frame when you click.',
    ],
    steps: [
      {
        title: 'Open an Ashby posting',
        body: 'Any jobs.ashbyhq.com page works, as do Ashby job boards embedded on company sites.',
      },
      {
        title: 'Click Generate or Tailor',
        body: "Cover Me reads the role, company and description from Ashby's structured job data.",
      },
      {
        title: 'Apply',
        body: "Edit the letter, then paste it into Ashby's form or attach the PDF, with the tailored resume PDF in the resume field.",
      },
    ],
    faqs: [
      {
        q: 'Do startups expect cover letters?',
        a: "It varies by company. When the form has a field for one, a short letter about the specific role and stack tells the reader something a resume can't, and a generic one can count against you. Cover Me builds each letter from the posting's requirements and your resume, so it is about that role.",
      },
      {
        q: 'Will the letter sound like AI wrote it?',
        a: 'Cover Me\'s prompts ban stock phrases like "I am excited to apply" and "As a passionate...", and a check flags them in the output. Letters are built from results in your resume, in the posting\'s own words, and you can edit every word before sending.',
      },
      {
        q: 'Does Cover Me also tailor my resume for Ashby applications?',
        a: "Yes. Click Tailor Resume to Job on any Ashby posting. Cover Me rewrites your bullets around the posting's keywords, removes any skill your original resume doesn't support, shows a 0 to 100 match score with the missing keywords, and exports a PDF.",
      },
    ],
  },
]

export function getBoard(slug: string): Board | undefined {
  return BOARDS.find((b) => b.slug === slug)
}
