// Per-job-board landing page content for /for/[board].
// Each board gets differentiated copy — search engines and AI engines penalize
// near-duplicate doorway pages, so keep the intros, steps, and FAQs specific.

export interface BoardFaq {
  q: string
  a: string
}

export interface Board {
  slug: string
  name: string
  /** e.g. "job board", "applicant tracking system" — used in copy */
  kind: string
  metaTitle: string
  metaDescription: string
  h1: string
  /** Direct-answer paragraph rendered right under the H1 — written for featured snippets. */
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
    metaTitle: 'AI Cover Letter Generator for LinkedIn Jobs',
    metaDescription:
      'Generate a tailored, ATS-friendly cover letter from any LinkedIn job posting in one click. Free Chrome extension — works on full postings and search results.',
    h1: 'AI cover letters for LinkedIn job postings',
    answer:
      'Cover Me is a free Chrome extension that reads the LinkedIn job posting you have open, extracts the role’s requirements and ATS keywords, and generates a tailored cover letter from your resume in about 10 seconds — no copying or pasting.',
    intro: [
      'LinkedIn is where most applications start — and where most generic cover letters get written. Easy Apply makes submitting fast, but the applications that get callbacks are the ones tailored to the posting. Cover Me closes that gap: it reads the job page you’re already on and builds the letter for you.',
      'It works on full LinkedIn job pages and in the search-results view with the job panel open. No LinkedIn integration, no login sharing — the extension simply reads the visible posting, so it never touches your LinkedIn account.',
    ],
    steps: [
      {
        title: 'Open a job on LinkedIn',
        body: 'Browse LinkedIn Jobs as you normally do. Cover Me works on the full job page and in the split-view job panel on search results — anywhere the description is visible.',
      },
      {
        title: 'Click the Cover Me icon',
        body: 'The extension scrapes the job title, company, and full description from the page automatically. Nothing is sent to LinkedIn and your account is never accessed.',
      },
      {
        title: 'Generate and apply',
        body: 'Get a tailored cover letter built from your resume and the posting’s exact keywords. Edit it inline, copy it into the Easy Apply flow, or download a PDF.',
      },
    ],
    faqs: [
      {
        q: 'Does Cover Me work with LinkedIn Easy Apply?',
        a: 'Yes. Generate your letter with Cover Me, then copy it to your clipboard or download the PDF and attach it in the Easy Apply flow. Cover Me does not auto-submit applications — you stay in control of what gets sent.',
      },
      {
        q: 'Does Cover Me need access to my LinkedIn account?',
        a: 'No. Cover Me only reads the job description visible on the page when you click the extension. It never logs into LinkedIn, never accesses your profile or connections, and has no LinkedIn integration.',
      },
      {
        q: 'Does it work on LinkedIn search results, or only full job pages?',
        a: 'Both. Cover Me reads the job panel that opens next to LinkedIn search results as well as full job pages, so you can generate letters without leaving your search.',
      },
    ],
  },
  {
    slug: 'indeed',
    name: 'Indeed',
    kind: 'job board',
    metaTitle: 'AI Cover Letter Generator for Indeed Jobs',
    metaDescription:
      'One click on any Indeed job posting — AI writes a tailored, ATS-friendly cover letter from your resume. Free Chrome extension, works on postings and search results.',
    h1: 'AI cover letters for Indeed job postings',
    answer:
      'Cover Me is a free Chrome extension that reads the Indeed job posting you have open and generates a tailored, ATS-optimized cover letter from your resume in about 10 seconds — on full postings and in the search-results preview pane.',
    intro: [
      'Indeed aggregates millions of postings, which makes it perfect for applying at volume — and volume is exactly where cover letter quality collapses. Writing a fresh letter for the tenth application of the day is where most people give up and send something generic.',
      'Cover Me keeps every application tailored at that pace. It reads the posting on the page, extracts the requirements and keywords, and builds each letter from your actual resume — so application #10 is as specific as application #1.',
    ],
    steps: [
      {
        title: 'Open a job on Indeed',
        body: 'Works on full Indeed job pages and in the preview pane on search results — wherever the job description is visible on screen.',
      },
      {
        title: 'Click the Cover Me icon',
        body: 'The extension scrapes the title, company, and description automatically. If a posting loads in an unusual format, paste the description into the manual fallback — it takes five seconds.',
      },
      {
        title: 'Generate and apply',
        body: 'A tailored letter, built from your resume and the role’s keywords, in about 10 seconds. Edit inline, copy it into Indeed’s application form, or download a PDF.',
      },
    ],
    faqs: [
      {
        q: 'Does Cover Me work with Indeed’s own apply flow?',
        a: 'Yes. When Indeed’s application form asks for a cover letter, generate it with Cover Me, then paste the text or upload the PDF. Cover Me never submits applications for you.',
      },
      {
        q: 'Does it work when Indeed links out to a company’s own career site?',
        a: 'Usually yes — many of those career sites run on Greenhouse, Lever, Workday, or Ashby, all of which Cover Me scrapes automatically. For anything else, the manual paste fallback works on any page.',
      },
      {
        q: 'Can I generate letters from Indeed search results?',
        a: 'Yes. Cover Me reads the job preview pane on Indeed search results as well as full job pages.',
      },
    ],
  },
  {
    slug: 'greenhouse',
    name: 'Greenhouse',
    kind: 'applicant tracking system',
    metaTitle: 'AI Cover Letter Generator for Greenhouse Applications',
    metaDescription:
      'Applying through a Greenhouse job page? Cover Me reads the posting and writes a tailored, ATS-friendly cover letter from your resume in one click. Free Chrome extension.',
    h1: 'AI cover letters for Greenhouse job applications',
    answer:
      'Cover Me is a free Chrome extension that reads any Greenhouse job posting — the boards.greenhouse.io pages used by thousands of tech companies — and generates a tailored cover letter from your resume in about 10 seconds.',
    intro: [
      'Greenhouse is the ATS behind the careers pages of a huge share of tech companies — if you’re applying to startups and scale-ups, you’ll see its clean single-page postings constantly. Those applications almost always include an optional cover letter field, and “optional” is where tailored letters quietly win interviews.',
      'Cover Me reads the Greenhouse posting directly — including embedded Greenhouse boards on company career sites — and builds a letter matched to the role’s requirements, so filling that optional field costs you seconds instead of half an hour.',
    ],
    steps: [
      {
        title: 'Open a Greenhouse posting',
        body: 'Works on boards.greenhouse.io and job-boards.greenhouse.io pages, and on Greenhouse boards embedded in company career sites.',
      },
      {
        title: 'Click the Cover Me icon',
        body: 'The extension reads the job title, company, and full description from the structured Greenhouse page — Greenhouse publishes job data in a machine-readable format, which makes scraping dependable.',
      },
      {
        title: 'Generate and attach',
        body: 'Get a letter tailored to the role’s exact requirements. Paste it into the cover letter field or upload the PDF with your application.',
      },
    ],
    faqs: [
      {
        q: 'Greenhouse says the cover letter is optional. Should I still include one?',
        a: 'Yes — optional fields are a differentiator. Most applicants skip them, so a tailored letter is one of the few signals that separates you at the screening stage. With Cover Me it costs about 10 seconds, so there’s no reason to leave it empty.',
      },
      {
        q: 'Does Cover Me work on Greenhouse boards embedded in company websites?',
        a: 'Yes. Whether the posting lives on boards.greenhouse.io or is embedded in a company’s own careers page, Cover Me detects the Greenhouse structure and scrapes it automatically. If a heavily customized page slips through, the manual paste fallback covers it.',
      },
      {
        q: 'Will the letter make it past the ATS screening?',
        a: 'Cover Me extracts the keywords and requirements from the posting itself and weaves them into your letter, so the letter speaks the same language the recruiter — and any keyword filter — is looking for. You can also tailor your resume to the same posting and see an ATS match score.',
      },
    ],
  },
  {
    slug: 'lever',
    name: 'Lever',
    kind: 'applicant tracking system',
    metaTitle: 'AI Cover Letter Generator for Lever Applications',
    metaDescription:
      'Applying through jobs.lever.co? Cover Me reads the Lever posting and writes a tailored, ATS-friendly cover letter from your resume in one click. Free Chrome extension.',
    h1: 'AI cover letters for Lever job applications',
    answer:
      'Cover Me is a free Chrome extension that reads any Lever job posting — the jobs.lever.co pages used by startups and scale-ups — and generates a tailored cover letter from your resume in about 10 seconds.',
    intro: [
      'Lever powers hiring at thousands of startups and growth-stage companies. Its postings are clean and structured, and its application form has a dedicated field for additional information — the natural home for a cover letter that actually addresses the role.',
      'Cover Me reads the Lever posting you have open, maps its requirements against your resume, and produces a letter specific to that company and role — not a template with the company name swapped in.',
    ],
    steps: [
      {
        title: 'Open a Lever posting',
        body: 'Any jobs.lever.co job page works. Cover Me detects Lever’s posting structure and reads the full description automatically.',
      },
      {
        title: 'Click the Cover Me icon',
        body: 'The extension extracts the role, company, and requirements from the page. Add an optional note — “referred by Jane”, “emphasize leadership” — and it gets woven in.',
      },
      {
        title: 'Generate and submit',
        body: 'Paste the tailored letter into Lever’s application form or attach the PDF. Edit anything inline first — the letter is fully editable before you send it.',
      },
    ],
    faqs: [
      {
        q: 'Does Cover Me work on every Lever job page?',
        a: 'Cover Me scrapes standard jobs.lever.co postings automatically. For companies that heavily customize their Lever pages, the manual paste fallback generates the same tailored letter from a copied description.',
      },
      {
        q: 'Can I personalize the letter beyond my resume?',
        a: 'Yes. Add supplemental context before generating — a referral, a project you want highlighted, a reason you want this specific company — and Cover Me weaves it into the letter alongside your resume and the job requirements.',
      },
      {
        q: 'Is Cover Me free for Lever applications?',
        a: 'Yes. Bring your own Claude or OpenAI API key for unlimited free generation, or use the hosted free tier for 10 generations per day. Pro at $4/month removes the daily limit.',
      },
    ],
  },
  {
    slug: 'workday',
    name: 'Workday',
    kind: 'applicant tracking system',
    metaTitle: 'AI Cover Letter Generator for Workday Applications',
    metaDescription:
      'Workday applications are long — the cover letter doesn’t have to be. Cover Me reads any myworkdayjobs.com posting and writes a tailored letter in one click. Free.',
    h1: 'AI cover letters for Workday job applications',
    answer:
      'Cover Me is a free Chrome extension that reads any Workday job posting — the myworkdayjobs.com pages used by large enterprises — and generates a tailored, ATS-friendly cover letter from your resume in about 10 seconds.',
    intro: [
      'Workday is the ATS of the enterprise world — banks, airlines, retailers, and Fortune 500s. Its application flow is famously long: account creation, resume re-entry, screening questions. By the time you reach the cover letter step, most applicants have nothing left to give it.',
      'That’s exactly the wrong place to go generic — enterprise recruiting pipelines are the most keyword-filtered of all. Cover Me reads the Workday posting before you start the form and hands you a letter matched to the role’s requirements, so the highest-leverage part of the application is the one part that’s already done.',
    ],
    steps: [
      {
        title: 'Open a Workday posting',
        body: 'Works on myworkdayjobs.com job pages across employers. Open the posting’s description view so the full text is visible.',
      },
      {
        title: 'Click the Cover Me icon',
        body: 'The extension reads the title, company, and description from the page. Workday’s layouts vary by employer — if a page resists scraping, paste the description into the manual fallback.',
      },
      {
        title: 'Generate and upload',
        body: 'Download the tailored letter as a PDF and attach it in Workday’s documents step, or paste the text wherever the form asks for it.',
      },
    ],
    faqs: [
      {
        q: 'Do enterprise companies actually read cover letters?',
        a: 'The screening layer does, even when humans skim: enterprise ATS pipelines filter on keywords from the job description. A letter that mirrors the posting’s requirements — which is what Cover Me generates — helps you clear that layer, and gives the recruiter who does read it a reason to advance you.',
      },
      {
        q: 'Does Cover Me work on every company’s Workday site?',
        a: 'Cover Me handles standard myworkdayjobs.com postings automatically. Workday allows heavy per-employer customization, so for the occasional page that scrapes incompletely, the manual paste fallback produces the same tailored result.',
      },
      {
        q: 'Can Cover Me fill out the Workday application for me?',
        a: 'No — Cover Me generates documents, it never auto-fills or submits applications. It writes the cover letter and tailors your resume; the application itself stays entirely in your hands.',
      },
    ],
  },
  {
    slug: 'ashby',
    name: 'Ashby',
    kind: 'applicant tracking system',
    metaTitle: 'AI Cover Letter Generator for Ashby Applications',
    metaDescription:
      'Applying through jobs.ashbyhq.com? Cover Me reads the Ashby posting and writes a tailored, ATS-friendly cover letter from your resume in one click. Free Chrome extension.',
    h1: 'AI cover letters for Ashby job applications',
    answer:
      'Cover Me is a free Chrome extension that reads any Ashby job posting — the jobs.ashbyhq.com pages used by fast-growing startups — and generates a tailored cover letter from your resume in about 10 seconds.',
    intro: [
      'Ashby is the ATS of choice for a new generation of startups — the kind of companies where a hiring manager, not just a recruiter, reads applications. That’s the audience where a specific, well-matched cover letter moves the needle most.',
      'Cover Me reads the Ashby posting you have open and builds a letter from your resume and the role’s actual requirements — concrete, specific, and free of the AI clichés that hiring managers at these companies spot instantly.',
    ],
    steps: [
      {
        title: 'Open an Ashby posting',
        body: 'Any jobs.ashbyhq.com job page works, including Ashby boards embedded on company career sites.',
      },
      {
        title: 'Click the Cover Me icon',
        body: 'The extension reads the role, company, and full description from Ashby’s structured posting format automatically.',
      },
      {
        title: 'Generate and apply',
        body: 'Get a tailored letter in about 10 seconds. Edit it inline, paste it into Ashby’s application form, or attach the PDF.',
      },
    ],
    faqs: [
      {
        q: 'Do startups expect cover letters?',
        a: 'Small teams read applications closely — at many Ashby-using startups the hiring manager screens candidates personally. A letter that addresses their specific role and stack is a strong signal; a generic one is worse than none. Cover Me builds each letter from the posting’s actual requirements, so it always addresses the specific role.',
      },
      {
        q: 'Will the letter sound like AI wrote it?',
        a: 'Cover Me’s prompts explicitly forbid the clichés and AI tells — “I’m excited to apply…”, “As a passionate…” — and build the letter from concrete achievements in your resume using the posting’s own language. You can edit every word before sending.',
      },
      {
        q: 'Does Cover Me also tailor my resume for Ashby applications?',
        a: 'Yes. Click “Tailor Resume to Job” on any Ashby posting and Cover Me rewrites your resume bullets to match the role’s keywords, shows an ATS match score, and exports a formatted PDF.',
      },
    ],
  },
]

export function getBoard(slug: string): Board | undefined {
  return BOARDS.find((b) => b.slug === slug)
}
