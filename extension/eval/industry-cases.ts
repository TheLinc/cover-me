// Industry coverage for the resume eval. Every resume is synthetic (no real
// user data, ever). Each is written as the structured resume the parser
// should produce, then rendered to plain text in a realistic layout, so the
// same data is both the parser's input and its answer key.
//
// Like fixtures.ts, every job description asks for something its resume does
// not have (a license, a tool, a domain). failTerms must never appear in the
// tailored output; warnTerms need a human look; mustKeepSkills are JD-named
// skills the candidate really has.

import type { JobData, ParsedResume, ResumeEducation, ResumeExperience } from '../src/types'
import type { EvalCase } from './fixtures'

// ── Rendering ────────────────────────────────────────────────────────────────

type Layout = 'classic' | 'inline' | 'skills-first'

interface Spec {
  id: string
  industry: string
  resume: ParsedResume
  /** classic: "Title — Company, Location (Dates)". inline: company line, then title line (trades). skills-first: skills and certs on top. */
  layout?: Layout
  headers?: Partial<Record<'experience' | 'education' | 'skills' | 'certifications' | 'projects' | 'profile', string>>
  /** Summary paragraph in the source resume. Not part of the parsed schema: the parser must not turn it into experience. */
  profile?: string
  /** An unsupported section (publications, references). Must not leak into parsed experience or education. */
  extra?: string
  job: JobData
  failTerms: string[]
  warnTerms?: string[]
  mustKeepSkills?: string[]
  fieldNotes: string
  /** Category labels a human editor would add from specific resume evidence; see EvalCase. */
  expectedLabels?: string[][]
}

const role = (title: string, company: string, location: string, dates: string, bullets: string[]): ResumeExperience =>
  ({ title, company, location, dates, bullets })

const edu = (degree: string, institution: string, location: string, dates: string, bullets: string[] = []): ResumeEducation =>
  ({ institution, degree, location, dates, bullets })

const job = (title: string, company: string, description: string): JobData =>
  ({ title, company, description, url: `https://example.com/jobs/${encodeURIComponent(company.toLowerCase())}` })

const at = (...parts: string[]) => parts.filter(Boolean).join(', ')

function render(s: Spec): string {
  const r = s.resume
  const h = {
    experience: 'EXPERIENCE', education: 'EDUCATION', skills: 'SKILLS',
    certifications: 'CERTIFICATIONS', projects: 'PROJECTS', profile: 'PROFILE',
    ...s.headers,
  }
  const layout = s.layout ?? 'classic'
  const block = (title: string, lines: string[]) => (lines.length ? ['', title, ...lines] : [])

  const experience = block(h.experience, r.experience.flatMap((e) => [
    ...(layout === 'inline'
      ? [`${at(e.company, e.location).replace(', ', ' | ')}`, `${e.title} | ${e.dates}`]
      : [`${e.title} — ${at(e.company, e.location)} (${e.dates})`]),
    ...e.bullets.map((b) => `- ${b}`),
    '',
  ]).slice(0, -1))
  const projects = block(h.projects, (r.projects ?? []).flatMap((p) => [p.name, ...p.bullets.map((b) => `- ${b}`)]))
  const education = block(h.education, r.education.flatMap((e) => [
    `${e.degree} — ${at(e.institution, e.location)} (${e.dates})`,
    ...e.bullets.map((b) => `- ${b}`),
  ]))
  const certs = block(h.certifications, (r.certifications ?? []).map((c) => `- ${c}`))
  const skills = r.skills ? block(h.skills, [r.skills]) : []
  const profile = s.profile ? block(h.profile, [s.profile]) : []
  const extra = s.extra ? ['', s.extra] : []

  const body = layout === 'skills-first'
    ? [...profile, ...skills, ...experience, ...projects, ...education, ...certs]
    : layout === 'inline'
      ? [...profile, ...certs, ...experience, ...projects, ...education, ...skills]
      : [...profile, ...experience, ...projects, ...education, ...certs, ...skills]

  return [r.name, [r.email, r.phone, r.website].filter(Boolean).join(' | '), ...body, ...extra].join('\n')
}

const toCase = (s: Spec): EvalCase => ({
  id: s.id,
  industry: s.industry,
  job: s.job,
  resumeText: render(s),
  parsed: s.resume,
  failTerms: s.failTerms,
  warnTerms: s.warnTerms ?? [],
  mustKeepSkills: s.mustKeepSkills ?? [],
  fieldNotes: s.fieldNotes,
  expectedLabels: s.expectedLabels,
})

// ── Cases ────────────────────────────────────────────────────────────────────

const SPECS: Spec[] = [
  // ── Business ───────────────────────────────────────────────────────────────
  {
    id: 'business-analyst-missing-cert',
    industry: 'Business',
    resume: {
      name: 'Priya Natarajan', email: 'priya.natarajan@email.com', phone: '(555) 318-4402', website: '',
      experience: [
        role('Operations Analyst', 'Northgate Distribution', 'Columbus, OH', 'Apr 2021 – Present', [
          'Built Power BI dashboards tracking on-time delivery for 14 regional warehouses',
          'Wrote SQL queries against the order database to find root causes of late shipments, cutting late orders from 9% to 5%',
          'Documented as-is and to-be processes for the returns workflow and presented recommendations to the VP of Operations',
          'Gathered requirements from 6 department leads for a new carrier scheduling tool and tracked delivery in Jira',
        ]),
        role('Junior Analyst', 'Brightline Insurance Services', 'Columbus, OH', 'Jun 2019 – Mar 2021', [
          'Maintained weekly claims volume reports in Excel for 3 underwriting teams',
          'Reconciled policy data between two systems, resolving 1,200 mismatched records',
        ]),
      ],
      education: [edu('B.S. Business Administration', 'Ohio State University', 'Columbus, OH', '2015 – 2019')],
      skills: 'SQL, Power BI, Excel (pivot tables, VLOOKUP), Jira, process mapping, requirements gathering, Visio',
    },
    job: job('Senior Business Analyst', 'Keystone Health Plans', `Keystone Health Plans is modernizing its member enrollment and claims operations.

What you'll do:
- Lead requirements elicitation with business and IT stakeholders
- Model current and future-state processes in BPMN
- Build dashboards in Tableau or Power BI and query data with SQL
- Work in Agile teams, managing stories in Jira

Requirements:
- 5+ years of business analysis experience
- Lean Six Sigma Green Belt required
- Healthcare payer experience preferred
- MBA preferred`),
    failTerms: ['Six Sigma', 'Green Belt', 'MBA', 'BPMN', 'Tableau'],
    warnTerms: ['healthcare', 'payer'],
    mustKeepSkills: ['SQL', 'Power BI', 'Jira', 'requirements'],
    expectedLabels: [['Requirements Elicitation']],
    fieldNotes: 'Business analysis: requirements work, stakeholder facilitation, process improvement with measured outcomes, and BI/data tools. Should read as business-outcome focused, not like a software engineer. The JD accepts "Tableau or Power BI", so Power BI fully covers it.',
  },
  {
    id: 'sales-ae-midmarket-to-enterprise',
    industry: 'Business',
    resume: {
      name: 'Marcus Webb', email: 'marcus.webb.sales@email.com', phone: '(555) 640-2291', website: 'linkedin.com/in/marcuswebb',
      experience: [
        role('Account Executive', 'Paylane', 'Chicago, IL', 'Feb 2022 – Present', [
          'Closed $1.4M in new annual recurring revenue in 2024, 118% of quota',
          'Ran full sales cycles for mid-market companies with 50-500 employees, average deal size $38,000',
          'Built pipeline through Outreach sequences and LinkedIn, sourcing 40% of closed opportunities',
          'Kept Salesforce forecasts current and presented pipeline reviews to the sales director weekly',
        ]),
        role('Sales Development Representative', 'Paylane', 'Chicago, IL', 'Jun 2020 – Jan 2022', [
          'Booked 25+ qualified meetings a month through cold calls and email',
          'Promoted to Account Executive after 19 months',
        ]),
      ],
      education: [edu('B.A. Economics', 'University of Illinois Chicago', 'Chicago, IL', '2016 – 2020')],
      skills: 'Salesforce, Outreach, Gong, LinkedIn Sales Navigator, discovery calls, negotiation, pipeline management, forecasting',
    },
    job: job('Enterprise Account Executive', 'Sentinel Cyber', `Sentinel Cyber sells cloud security to large enterprises.

You will:
- Own an enterprise territory of 5,000+ employee accounts
- Close new-logo deals of $250K+ with multi-threaded buying committees
- Qualify rigorously using MEDDICC
- Forecast accurately in Salesforce and partner with sales engineers

Requirements:
- 5+ years of closing experience in enterprise SaaS
- Experience with MEDDICC or a similar methodology
- Cybersecurity sales experience strongly preferred`),
    failTerms: ['MEDDICC', 'MEDDIC'],
    warnTerms: ['cybersecurity', 'enterprise', 'security'],
    mustKeepSkills: ['Salesforce'],
    fieldNotes: 'Sales: quota attainment, revenue closed, deal size and cycle are the evidence and must stay exact. Mid-market experience must not be inflated into enterprise selling or cybersecurity.',
  },
  {
    id: 'project-manager-capm-not-pmp',
    industry: 'Business',
    resume: {
      name: 'Elena Petrova', email: 'elena.petrova.pm@email.com', phone: '(555) 207-9914', website: '',
      experience: [
        role('IT Project Coordinator', 'Harbor Logistics', 'Seattle, WA', 'Mar 2022 – Present', [
          'Coordinated schedules, budgets, and status reporting for 4 concurrent software rollout projects',
          'Ran daily standups and sprint planning as Scrum Master for a 7-person development team',
          'Maintained project plans in MS Project and tracked risks in a weekly RAID log',
          'Delivered a warehouse scanner rollout to 12 sites two weeks ahead of schedule',
        ]),
        role('Administrative Assistant', 'Harbor Logistics', 'Seattle, WA', 'Jan 2020 – Feb 2022', [
          'Scheduled cross-department meetings and took minutes for the IT steering committee',
        ]),
      ],
      education: [edu('B.A. Communication', 'University of Washington', 'Seattle, WA', '2015 – 2019')],
      certifications: [
        'Certified ScrumMaster (CSM) — Scrum Alliance — 2022',
        'Certified Associate in Project Management (CAPM) — PMI — 2023',
      ],
      skills: 'MS Project, Jira, Confluence, Scrum, risk management, stakeholder communication, budget tracking',
    },
    job: job('Project Manager', 'Cobalt Construction Technologies', `Cobalt builds field software for general contractors.

Responsibilities:
- Manage end-to-end delivery of customer software implementations
- Own budgets up to $2M and report status to executives
- Plan in Smartsheet or MS Project; run Agile/Scrum ceremonies

Requirements:
- PMP certification required
- 5+ years managing projects
- Construction industry experience preferred`),
    failTerms: ['PMP', 'Smartsheet'],
    warnTerms: ['construction'],
    mustKeepSkills: ['MS Project', 'Scrum'],
    fieldNotes: 'Project management: scope, schedule and budget delivery, stakeholder management, methodology and certifications. A CAPM must never be presented as a PMP; coordinator scope must not be inflated into owning $2M budgets.',
  },
  {
    id: 'hr-coordinator-to-generalist',
    industry: 'Business',
    resume: {
      name: 'Aisha Rahman', email: 'aisha.rahman.hr@email.com', phone: '(555) 733-0158', website: '',
      experience: [
        role('HR Coordinator', 'Summit Outdoor Retail', 'Denver, CO', 'Aug 2021 – Present', [
          'Ran new-hire onboarding for 150+ employees a year across 9 store locations in BambooHR',
          'Processed biweekly payroll changes in ADP for 420 employees',
          'Investigated and documented 30+ employee relations cases, escalating policy issues to the HR manager',
          'Updated the employee handbook for Colorado paid leave law changes',
        ]),
        role('HR Assistant', 'Summit Outdoor Retail', 'Denver, CO', 'Jun 2019 – Jul 2021', [
          'Scheduled interviews for store manager and associate roles',
          'Maintained personnel files and ran I-9 compliance audits',
        ]),
      ],
      education: [edu('B.S. Psychology', 'Colorado State University', 'Fort Collins, CO', '2015 – 2019')],
      skills: 'BambooHR, ADP Workforce Now, onboarding, employee relations, I-9 compliance, benefits enrollment, Microsoft Excel',
    },
    job: job('HR Generalist', 'Pinnacle Manufacturing', `Pinnacle Manufacturing runs a 600-employee unionized plant.

The role:
- Handle employee relations investigations and union grievance steps
- Administer leaves under FMLA and state law
- Maintain employee data in Workday HCM and partner with payroll on ADP
- Support recruiting and onboarding

Requirements:
- 3+ years of HR generalist experience
- SHRM-CP or PHR certification required`),
    failTerms: ['Workday', 'SHRM-CP', 'PHR', 'FMLA', 'grievance'],
    warnTerms: ['union'],
    mustKeepSkills: ['ADP', 'employee relations'],
    fieldNotes: 'HR: employee relations, compliance, HRIS and payroll systems, headcount scope. SHRM-CP/PHR are gating and must not be implied; retail HR must not be recast as union or plant experience.',
  },
  {
    id: 'customer-support-tier2',
    industry: 'Business',
    resume: {
      name: 'Tomás Alvarez', email: 'tomas.alvarez@email.com', phone: '(555) 402-7765', website: '',
      experience: [
        role('Customer Service Representative', 'Clearwave Internet', 'Phoenix, AZ', 'Mar 2022 – Present', [
          'Resolve 55-65 billing and connectivity tickets a day in Zendesk',
          'Hold a 94% CSAT score over the last 12 months, top 10% of a 60-agent team',
          'Wrote 18 help-center articles that cut repeat billing contacts',
          'Train new hires on the escalation process during their first 2 weeks',
        ]),
        role('Cashier', 'FreshMart Grocery', 'Phoenix, AZ', 'Jun 2020 – Feb 2022', [
          'Handled cash and card transactions and resolved customer complaints at the service desk',
        ]),
      ],
      education: [edu('High School Diploma', 'Desert Vista High School', 'Phoenix, AZ', '2016 – 2020')],
      skills: 'Zendesk, ticket triage, de-escalation, knowledge base writing, Microsoft Teams, typing 70 WPM',
    },
    job: job('Tier 2 Support Specialist', 'Loomly Software', `Loomly makes scheduling software for B2B teams.

You'll:
- Take escalated technical tickets from Tier 1
- Work cases in Salesforce Service Cloud
- Use basic SQL to investigate account data
- Write and maintain help articles

Nice to have: bilingual English/Spanish.`),
    failTerms: ['Service Cloud', 'SQL', 'Spanish', 'bilingual'],
    warnTerms: ['SaaS', 'technical'],
    fieldNotes: 'Customer support: ticket volume, CSAT and resolution metrics, escalations, documentation. A non-degree background is normal; a cashier job must not be inflated into customer success.',
  },
  {
    id: 'executive-assistant-tool-swap',
    industry: 'Business',
    resume: {
      name: 'Grace Kim', email: 'grace.kim.ea@email.com', phone: '(555) 918-3346', website: '',
      experience: [
        role('Executive Assistant to the CFO', 'Ironwood Capital Partners', 'New York, NY', 'Sep 2020 – Present', [
          'Manage calendar, travel, and expenses for the CFO and two managing directors',
          'Prepare board meeting materials for 4 quarterly board meetings a year',
          'Process monthly expense reports in Concur, averaging 80 receipts a month',
          'Coordinate an annual investor conference for 300 attendees',
        ]),
        role('Front Desk Coordinator', 'Ironwood Capital Partners', 'New York, NY', 'Jan 2018 – Aug 2020', [
          'Managed visitor check-in and conference room scheduling for a 120-person office',
        ]),
      ],
      education: [edu('B.A. English', 'Fordham University', 'Bronx, NY', '2013 – 2017')],
      skills: 'Microsoft 365 (Outlook, Excel, PowerPoint), Concur, calendar management, travel planning, event coordination, board meeting preparation',
    },
    job: job('Executive Assistant to the CEO', 'Northwind Robotics', `Northwind Robotics is a fast-growing startup.

Support our CEO with:
- Calendar and travel management across time zones
- Board meeting preparation and follow-ups
- Expense reporting in Expensify
- Everything in Google Workspace (Gmail, Calendar, Docs)

Startup experience preferred.`),
    failTerms: ['Google Workspace', 'Expensify', 'Gmail'],
    warnTerms: ['startup', 'robotics'],
    mustKeepSkills: ['board', 'travel'],
    expectedLabels: [['Expense Reporting', 'Expense Management']],
    fieldNotes: 'Executive assistant: scope of executive support, confidentiality, board and event logistics. Tools must not be swapped (Microsoft 365 is not Google Workspace, Concur is not Expensify).',
  },
  {
    id: 'office-manager-career-gap',
    industry: 'Business',
    profile: 'Office manager and bookkeeper returning to work after a five-year career break for family caregiving.',
    resume: {
      name: 'Linda Moreau', email: 'linda.moreau@email.com', phone: '(555) 581-2047', website: '',
      experience: [
        role('Office Manager & Bookkeeper', 'Cedar & Pine Dental', 'Portland, OR', 'Mar 2012 – Dec 2018', [
          'Kept the books in QuickBooks Desktop for a 3-dentist practice with $2.1M in annual revenue',
          'Ran payroll for 14 staff and filed quarterly payroll tax reports',
          'Negotiated supply contracts that cut dental supply spend by 12%',
          'Managed front-desk scheduling and insurance billing for 40+ patients a day',
        ]),
        role('Receptionist', 'Cedar & Pine Dental', 'Portland, OR', 'Jun 2009 – Feb 2012', [
          'Checked in patients and verified dental insurance coverage',
        ]),
      ],
      education: [edu('A.A.S. Business Administration', 'Portland Community College', 'Portland, OR', '2007 – 2009')],
      skills: 'QuickBooks, payroll, accounts payable, accounts receivable, vendor negotiation, scheduling, Microsoft Office',
    },
    job: job('Office Manager', 'Brightpath Architects', `Brightpath Architects (25 people) needs an office manager.

- Run office operations, vendors, and facilities
- Handle AP/AR in QuickBooks Online
- Process payroll through Gusto
- 5+ years of office management experience`),
    failTerms: ['Gusto'],
    warnTerms: ['QuickBooks Online', 'architecture', 'architect'],
    mustKeepSkills: ['QuickBooks', 'payroll'],
    fieldNotes: 'Returning professional: present past experience confidently without inventing recent work or hiding the gap; years of experience must not count the career break. Office management: finances, payroll, vendors, operations.',
  },

  // ── Finance ────────────────────────────────────────────────────────────────
  {
    id: 'accountant-no-cpa',
    industry: 'Finance',
    resume: {
      name: 'Daniel Okoro', email: 'daniel.okoro.acct@email.com', phone: '(555) 264-8830', website: '',
      experience: [
        role('Staff Accountant', 'Meadowbrook Foods', 'Milwaukee, WI', 'May 2021 – Present', [
          'Own month-end close for 3 entities, closing the books in 5 business days',
          'Prepare balance sheet reconciliations and journal entries under US GAAP',
          'Reduced accounts payable exceptions by 30% by standardizing vendor coding in QuickBooks Online',
          'Support the annual external audit by preparing 60+ PBC schedules',
        ]),
        role('Accounting Clerk', 'Lakeshore Property Management', 'Milwaukee, WI', 'Jul 2019 – Apr 2021', [
          'Processed 400+ vendor invoices a month',
          'Reconciled 12 bank accounts monthly',
        ]),
      ],
      education: [edu('B.B.A. Accounting', 'University of Wisconsin–Milwaukee', 'Milwaukee, WI', '2015 – 2019')],
      skills: 'QuickBooks Online, Excel (pivot tables, XLOOKUP), US GAAP, month-end close, account reconciliation, accounts payable, audit support',
    },
    job: job('Senior Accountant', 'Arcadia SaaS', `Arcadia is a subscription software company preparing for an IPO.

Responsibilities:
- Own parts of the month-end close and account reconciliations
- Revenue recognition under ASC 606
- Design and test SOX controls
- Work in NetSuite

Requirements: CPA required; 4+ years of accounting experience.`),
    failTerms: ['CPA', 'NetSuite', 'SOX', 'ASC 606'],
    warnTerms: ['SaaS', 'revenue recognition', 'IPO'],
    mustKeepSkills: ['GAAP', 'month-end close'],
    fieldNotes: 'Accounting: close timelines, reconciliations, audit support, systems; precise and conservative tone. The CPA is a license and must never be implied.',
  },
  {
    id: 'uk-finance-assistant',
    industry: 'Finance',
    layout: 'skills-first',
    headers: { profile: 'PERSONAL PROFILE', skills: 'KEY SKILLS', experience: 'EMPLOYMENT HISTORY' },
    profile: 'Finance assistant with experience in purchase ledger and credit control.',
    resume: {
      name: 'Charlotte Evans', email: 'charlotte.evans@email.co.uk', phone: '+44 7700 900123', website: '',
      experience: [
        role('Finance Assistant', 'Hartley & Sons Ltd', 'Leeds', '09/2022 – Present', [
          'Process 600+ supplier invoices a month in Xero across 3 cost centres',
          'Run weekly payment runs and supplier statement reconciliations',
          'Chase overdue debtors, reducing aged debt over 60 days by 25%',
          'Prepare VAT return workpapers for the finance manager',
        ]),
        role('Accounts Clerk', 'Brookfield Housing Association', 'Leeds', '07/2020 – 08/2022', [
          'Posted journals and reconciled 4 bank accounts',
        ]),
      ],
      education: [
        edu('AAT Level 2 Certificate in Accounting', 'Leeds City College', 'Leeds', '2019 – 2020'),
        edu('A-levels: Maths (B), Business (B), English (C)', 'Roundhay School', 'Leeds', '2017 – 2019'),
      ],
      skills: 'Xero, purchase ledger, credit control, bank reconciliation, VAT, Excel',
    },
    job: job('Accounts Payable Clerk', 'Meridian Logistics UK', `Meridian Logistics UK is hiring an Accounts Payable Clerk in Bradford.

- Process supplier invoices with 3-way matching
- Run the purchase ledger and weekly payment runs in Sage 200
- AAT Level 3 required`),
    failTerms: ['Sage', 'AAT Level 3', '3-way matching'],
    mustKeepSkills: ['purchase ledger'],
    fieldNotes: 'UK CV conventions: British spelling (centres), profile-style summary, no US-isms. Finance admin: volume and accuracy. AAT Level 2 must not be upgraded; Xero must not become Sage.',
  },

  // ── Legal ──────────────────────────────────────────────────────────────────
  {
    id: 'paralegal-litigation-to-corporate',
    industry: 'Legal',
    resume: {
      name: 'Nadia Haddad', email: 'nadia.haddad.paralegal@email.com', phone: '(555) 356-1180', website: '',
      experience: [
        role('Litigation Paralegal', 'Morrow & Keane LLP', 'Philadelphia, PA', 'Jan 2020 – Present', [
          'Manage document productions of up to 250,000 pages in Relativity for commercial litigation matters',
          'Draft discovery requests, deposition notices, and privilege logs for 5 attorneys',
          'Track court deadlines for 40+ active cases in Clio',
          'Prepared trial binders and exhibits for 3 jury trials',
        ]),
        role('Legal Assistant', 'Delgado Law Office', 'Philadelphia, PA', 'Jun 2017 – Dec 2019', [
          'Filed pleadings through PACER and the Pennsylvania e-filing system',
          'Scheduled client intake meetings',
        ]),
      ],
      education: [
        edu('Paralegal Certificate', 'Community College of Philadelphia', 'Philadelphia, PA', '2016 – 2017'),
        edu('B.A. Political Science', 'Temple University', 'Philadelphia, PA', '2012 – 2016'),
      ],
      skills: 'Relativity, Clio, PACER, e-discovery, privilege logs, legal research (Westlaw), trial preparation',
    },
    job: job('Corporate Paralegal', 'Hartwell Grant LLP', `Hartwell Grant's corporate group supports private equity clients.

Duties:
- M&A due diligence and closing checklists
- Entity management and Delaware filings
- Document management in iManage
- Research in Westlaw or Lexis

3+ years of corporate paralegal experience required.`),
    failTerms: ['iManage', 'due diligence', 'entity management', 'M&A', 'Delaware'],
    warnTerms: ['corporate', 'private equity'],
    mustKeepSkills: ['Westlaw'],
    fieldNotes: 'Legal: precise, formal language. Litigation work (discovery, trials) must not be reframed as transactional or corporate work.',
  },

  // ── Education ──────────────────────────────────────────────────────────────
  {
    id: 'teacher-out-of-state',
    industry: 'Education',
    resume: {
      name: 'Kayla Brooks', email: 'kayla.brooks.teach@email.com', phone: '(555) 480-6623', website: '',
      experience: [
        role('Math Teacher (Grades 8–9)', 'Lincoln Middle School', 'Aurora, CO', 'Aug 2020 – Present', [
          'Teach Algebra I and Pre-Algebra to 140 students across 5 sections',
          'Raised the share of students meeting state math standards from 38% to 52% over two years',
          'Write IEP and 504 accommodations into lesson plans for 22 students',
          'Use Google Classroom and Desmos for daily practice and formative assessment',
        ]),
        role('Student Teacher', 'Rangeview High School', 'Aurora, CO', 'Jan 2020 – May 2020', [
          'Co-taught Algebra II under a mentor teacher',
        ]),
      ],
      education: [edu('B.A. Mathematics with Secondary Education Licensure', 'University of Northern Colorado', 'Greeley, CO', '2016 – 2020')],
      certifications: ['Colorado Professional Educator License — Secondary Mathematics (7–12), expires 2029'],
      skills: 'Google Classroom, Desmos, differentiated instruction, IEP/504 accommodations, formative assessment, classroom management',
    },
    job: job('High School Math Teacher', 'Westlake ISD', `Westlake ISD (Texas) is hiring a high school math teacher.

- Teach AP Calculus AB and Algebra II
- Use Canvas LMS for assignments and grading
- Sponsor the math club

Requirements: Texas teaching certificate (TExES Mathematics 7–12) or eligibility.`),
    failTerms: ['AP Calculus', 'TExES', 'Canvas'],
    warnTerms: ['Texas', 'Calculus'],
    fieldNotes: 'Teaching: grade levels and subjects, student outcomes, licensure state and area, inclusion (IEP/504). An out-of-state license is stated as it is; courses never taught must not be claimed.',
  },
  {
    id: 'teacher-to-instructional-designer',
    industry: 'Education',
    profile: 'Science teacher moving into instructional design.',
    resume: {
      name: 'Monica Reyes', email: 'monica.reyes.id@email.com', phone: '(555) 772-4019', website: '',
      experience: [
        role('Science Teacher', 'Jefferson High School', 'Sacramento, CA', 'Aug 2016 – Jun 2025', [
          'Designed a 9th-grade biology curriculum of 36 units aligned to state standards',
          'Built self-paced review modules in Google Slides and Canva for 150 students a year',
          'Led professional development workshops on backward design for 25 teachers',
          'Tracked assessment data to revise units, raising unit test averages from 71% to 80%',
        ]),
      ],
      education: [
        edu('M.A. Education', 'Sacramento State University', 'Sacramento, CA', '2014 – 2016'),
        edu('B.S. Biology', 'UC Davis', 'Davis, CA', '2010 – 2014'),
      ],
      skills: 'curriculum design, backward design, Google Slides, Canva, assessment design, Google Classroom, adult facilitation',
    },
    job: job('Instructional Designer', 'Brightwell Learning', `Brightwell Learning builds corporate training programs.

- Build eLearning courses in Articulate Storyline 360 and Rise
- Follow the ADDIE model and publish SCORM packages to our LMS
- Partner with subject matter experts

Corporate training experience preferred.`),
    failTerms: ['Articulate', 'Storyline', 'ADDIE', 'SCORM'],
    warnTerms: ['corporate', 'eLearning'],
    fieldNotes: 'Career change: translate transferable work honestly into the target field (curriculum design to learning design, PD workshops to adult learning) without claiming the new field\'s tools or corporate experience.',
  },

  // ── Trades ─────────────────────────────────────────────────────────────────
  {
    id: 'electrician-commercial-to-industrial',
    industry: 'Trades',
    layout: 'inline',
    headers: { certifications: 'LICENSES & TICKETS', experience: 'WORK HISTORY', education: 'TRAINING' },
    resume: {
      name: 'Luis Ortega', email: 'luis.ortega.electric@email.com', phone: '(555) 306-7741', website: '',
      experience: [
        role('Journeyman Electrician', 'Front Range Electric', 'Denver, CO', 'Mar 2021 – Present', [
          'Install and troubleshoot 120/208V three-phase power in commercial tenant finish-outs',
          'Bend and run EMT and rigid conduit on projects up to 40,000 sq ft',
          'Read blueprints and lay out panel schedules with the foreman',
          'Lead a 3-person crew on service upgrades',
        ]),
        role('Apprentice Electrician', 'Apex Residential Electric', 'Aurora, CO', 'Aug 2017 – Feb 2021', [
          'Wired 60+ new-construction homes to NEC code',
          'Passed every city inspection on the first attempt during the final 2 years',
        ]),
      ],
      education: [edu('Electrical Apprenticeship Program', 'IEC Rocky Mountain', 'Denver, CO', '2017 – 2021')],
      certifications: [
        'Colorado Journeyman Electrician License #JW.105532',
        'OSHA 10-Hour Construction',
        'First Aid/CPR',
      ],
      skills: 'NEC code, conduit bending, blueprint reading, three-phase power, troubleshooting, panel installation',
    },
    job: job('Industrial Maintenance Electrician', 'Granite Foods', `Granite Foods' plant maintenance team keeps our production lines running.

- Troubleshoot 480V motor controls and VFDs
- Diagnose PLC faults (Allen-Bradley)
- Work to NFPA 70E arc flash requirements

Requirements: journeyman license, OSHA 30, 3+ years industrial experience.`),
    failTerms: ['PLC', 'Allen-Bradley', 'NFPA 70E', 'OSHA 30', '480V', 'VFD'],
    warnTerms: ['industrial', 'motor'],
    mustKeepSkills: ['troubleshooting'],
    fieldNotes: 'Trades: licenses and safety tickets up front, concrete work (voltages, systems, project sizes), code compliance, short plain bullets, no corporate buzzwords. OSHA 10 must never become OSHA 30.',
  },
  {
    id: 'welder-structural-to-pipe',
    industry: 'Trades',
    resume: {
      name: 'Jake Morrison', email: 'jake.morrison.weld@email.com', phone: '(555) 219-5530', website: '',
      experience: [
        role('Structural Welder', 'Ironclad Fabrication', 'Tulsa, OK', 'Jun 2019 – Present', [
          'Weld structural steel beams and columns with FCAW and SMAW in all positions',
          'Read shop drawings and weld symbols to fabricate 15-20 assemblies a week',
          'Kept a zero-rework record on 2 consecutive bridge girder jobs',
        ]),
        role('Welder Helper', 'Tulsa Steel Works', 'Tulsa, OK', 'Jan 2018 – May 2019', [
          'Prepped and ground joints and ran fit-up for senior welders',
        ]),
      ],
      education: [edu('Welding Technology Certificate', 'Tulsa Tech', 'Tulsa, OK', '2017')],
      certifications: [
        'AWS D1.1 Structural Welding — 3G and 4G (FCAW, SMAW)',
        'OSHA 10-Hour General Industry',
      ],
    },
    job: job('Pipe Welder', 'Gulf Coast Energy Services', `Gulf Coast Energy Services needs pipe welders for refinery turnarounds.

- TIG (GTAW) root passes on carbon and stainless pipe
- 6G certification required
- Work to ASME Section IX procedures
- Refinery turnaround experience preferred`),
    failTerms: ['6G', 'TIG', 'GTAW', 'ASME', 'stainless'],
    warnTerms: ['pipe', 'refinery'],
    fieldNotes: 'Welding: exact process and position certifications (3G/4G vs 6G) are gating and must never be upgraded. There is no skills section, so keywords belong in bullets only. Plain, direct trade language.',
  },

  // ── Hospitality, retail, logistics ─────────────────────────────────────────
  {
    id: 'line-cook-to-sous-chef',
    industry: 'Hospitality',
    resume: {
      name: 'Andre Thompson', email: 'andre.thompson.cook@email.com', phone: '(555) 845-2203', website: '',
      experience: [
        role('Line Cook', 'Copper Kettle Bistro', 'Austin, TX', 'Apr 2021 – Present', [
          'Run the grill station for 250+ covers on weekend nights',
          'Prep sauces and proteins for a 40-item seasonal menu',
          'Train 4 new line cooks on station setup and plating standards',
          'Keep temperature logs and have passed every health inspection since 2021',
        ]),
        role('Prep Cook', 'Taqueria del Sol', 'Austin, TX', 'Aug 2019 – Mar 2021', [
          'Prepped ingredients for 300 meals a day',
          'Received and stocked produce deliveries',
        ]),
      ],
      education: [edu('Culinary Arts Certificate', 'Austin Community College', 'Austin, TX', '2018 – 2019')],
      certifications: ['ServSafe Food Handler — 2024'],
      skills: 'grill station, sauce work, knife skills, inventory ordering, food safety, plating',
    },
    job: job('Sous Chef', 'Harbor & Vine', `Harbor & Vine is a fine dining restaurant (tasting menu, 60 seats).

- Lead a kitchen team of 12 when the chef is off
- Menu costing and food cost control
- Inventory ordering and receiving

Requirements: ServSafe Manager certification, fine dining experience.`),
    failTerms: ['ServSafe Manager', 'food cost', 'menu costing'],
    warnTerms: ['fine dining', 'tasting menu'],
    mustKeepSkills: ['inventory'],
    fieldNotes: 'Kitchen: covers and volume, stations, menu scope, training, food safety; direct language. A line cook must not be inflated into running a kitchen; a Food Handler card is not a Manager certification.',
  },
  {
    id: 'retail-keyholder-to-asm',
    industry: 'Retail',
    resume: {
      name: 'Sofia Martinez', email: 'sofia.martinez.retail@email.com', phone: '(555) 627-3398', website: '',
      experience: [
        role('Keyholder', 'Trailhead Outfitters', 'Salt Lake City, UT', 'May 2022 – Present', [
          'Open and close the store 3 days a week, including cash counts and deposits',
          'Lead a team of 6 sales associates during weekend shifts',
          'Reset seasonal floor displays using corporate planograms',
          'Beat monthly sales targets in 9 of the last 12 months',
        ]),
        role('Sales Associate', 'Trailhead Outfitters', 'Salt Lake City, UT', 'Sep 2020 – Apr 2022', [
          'Averaged $1,800 in sales per shift',
          'Signed up 35 loyalty members a month',
        ]),
      ],
      education: [edu('High School Diploma', 'West High School', 'Salt Lake City, UT', '2016 – 2020')],
      skills: 'cash handling, visual merchandising, planograms, POS systems, inventory counts, customer service',
    },
    job: job('Assistant Store Manager', 'Canyon Home Goods', `Canyon Home Goods is hiring an Assistant Store Manager.

- Share P&L responsibility with the Store Manager
- Hire, schedule, and coach a team of 20
- Drive shrink reduction and inventory management
- Own visual merchandising standards

2+ years of supervisory retail experience required.`),
    failTerms: ['P&L', 'shrink', 'hiring'],
    mustKeepSkills: ['visual merchandising', 'inventory'],
    fieldNotes: 'Retail: sales numbers, team leadership, store operations, merchandising. A keyholder must not be presented as a store manager or as having hired staff.',
  },
  {
    id: 'warehouse-lead-wms-swap',
    industry: 'Logistics',
    resume: {
      name: 'Derrick Hall', email: 'derrick.hall.ops@email.com', phone: '(555) 713-5582', website: '',
      experience: [
        role('Warehouse Lead', 'Midwest Parts Supply', 'Indianapolis, IN', 'Feb 2021 – Present', [
          'Lead a 10-person picking crew averaging 145 picks per hour',
          'Run cycle counts in Manhattan WMS with 99.6% inventory accuracy',
          'Operate sit-down and reach forklifts with zero recordable incidents in 3 years',
          'Rolled out 5S in the shipping area, freeing 800 sq ft of floor space',
        ]),
        role('Material Handler', 'Midwest Parts Supply', 'Indianapolis, IN', 'Jul 2018 – Jan 2021', [
          'Loaded and unloaded 20+ trailers a shift using RF scanners',
        ]),
      ],
      education: [edu('High School Diploma', 'Arsenal Technical High School', 'Indianapolis, IN', '2014 – 2018')],
      certifications: ['OSHA Powered Industrial Truck (Forklift) Certification — 2024'],
      skills: 'Manhattan WMS, RF scanners, forklift operation, cycle counting, 5S, shipping and receiving',
    },
    job: job('Warehouse Supervisor', 'Crossroads 3PL', `Crossroads 3PL runs a 400,000 sq ft distribution center.

- Supervise 25 associates across two shifts
- Run inventory and labor planning in SAP EWM
- Lead Lean Six Sigma improvement projects
- Enforce OSHA and forklift safety

Forklift certification required.`),
    failTerms: ['SAP', 'Six Sigma'],
    warnTerms: ['3PL', 'Lean'],
    mustKeepSkills: ['forklift'],
    fieldNotes: 'Warehouse: throughput, accuracy, safety record, equipment and systems. Manhattan WMS must not become SAP EWM; a 10-person crew must not become 25.',
  },
  {
    id: 'cdl-driver-missing-endorsement',
    industry: 'Logistics',
    resume: {
      name: 'Ray Castillo', email: 'ray.castillo.cdl@email.com', phone: '(555) 494-1106', website: '',
      experience: [
        role('Regional Truck Driver', 'Blue Mesa Freight', 'Albuquerque, NM', 'Mar 2019 – Present', [
          'Drive 2,500 miles a week on regional dry van and tanker routes across 4 states',
          'Kept a clean MVR with zero preventable accidents over 600,000 miles',
          'Complete pre-trip inspections and ELD logs under FMCSA hours-of-service rules',
        ]),
        role('Delivery Driver', 'Sunland Beverage', 'Albuquerque, NM', 'May 2016 – Feb 2019', [
          'Delivered to 25 stops a day in a 26-foot box truck',
        ]),
      ],
      education: [edu('High School Diploma', 'Rio Grande High School', 'Albuquerque, NM', '2012 – 2016')],
      certifications: [
        'CDL Class A — New Mexico — Tanker (N) endorsement',
        'DOT Medical Card — valid through 2027',
      ],
    },
    job: job('Hazmat Tanker Driver', 'Permian Fuel Transport', `Permian Fuel Transport delivers fuel to stations across West Texas.

Requirements:
- CDL-A with Hazmat (H) or combined (X) endorsement
- TWIC card
- 2+ years of tanker experience
- Clean MVR`),
    failTerms: ['Hazmat', 'TWIC', 'X endorsement'],
    warnTerms: ['fuel'],
    fieldNotes: 'Drivers: license class and endorsements, safety record, miles, equipment, compliance. Endorsements are gating; the Tanker (N) endorsement must never become Hazmat (H) or X.',
  },
  {
    id: 'veteran-to-distribution-ops',
    industry: 'Logistics',
    resume: {
      name: 'Brandon Kelly', email: 'brandon.kelly.ops@email.com', phone: '(555) 356-9920', website: '',
      experience: [
        role('Supply Sergeant (92Y)', 'U.S. Army', 'Fort Carson, CO', 'Jun 2018 – May 2024', [
          'Managed a $12M property book of vehicles, weapons, and equipment with 100% accountability across 3 inspections',
          'Supervised 6 soldiers receiving, storing, and issuing supplies for a 600-soldier battalion',
          'Ran inventory in GCSS-Army and reconciled discrepancies with the brigade supply office',
          'Planned equipment load-outs for 2 overseas deployments',
        ]),
        role('Unit Supply Specialist', 'U.S. Army', 'Fort Hood, TX', 'Jun 2014 – May 2018', [
          'Issued and tracked equipment for a 150-soldier company',
        ]),
      ],
      education: [edu('A.A.S. Logistics Management', 'Pikes Peak State College', 'Colorado Springs, CO', '2019 – 2022')],
      skills: 'inventory management, GCSS-Army, property accountability, team leadership, Microsoft Excel, hazardous materials handling',
    },
    job: job('Operations Supervisor', 'Atlas Home Distribution', `Atlas Home Distribution is hiring an Operations Supervisor for our regional DC.

- Lead 40 associates per shift
- Own throughput and accuracy KPIs
- Run the floor in our WMS (Blue Yonder)
- Drive Lean and Kaizen events
- Enforce OSHA safety standards`),
    failTerms: ['Blue Yonder', 'Kaizen', 'WMS'],
    warnTerms: ['Lean'],
    mustKeepSkills: ['inventory'],
    fieldNotes: 'Veterans: translate military jargon into civilian terms (property book to asset accountability, battalion to organization size) while keeping the real scope and numbers. Military systems must not become civilian WMS claims.',
  },

  // ── Healthcare (non-nursing) ───────────────────────────────────────────────
  {
    id: 'pharmacy-tech-retail-to-hospital',
    industry: 'Healthcare',
    resume: {
      name: 'Mei Lin Wong', email: 'meilin.wong.cpht@email.com', phone: '(555) 138-6647', website: '',
      experience: [
        role('Certified Pharmacy Technician', 'Corner Care Pharmacy', 'Sacramento, CA', 'Jan 2021 – Present', [
          'Fill and verify 300+ prescriptions a day under pharmacist supervision',
          'Process insurance claims and resolve rejections with PBMs',
          'Manage controlled substance counts and inventory for the CII safe',
          'Trained 3 new technicians on the pharmacy software',
        ]),
        role('Pharmacy Clerk', 'Corner Care Pharmacy', 'Sacramento, CA', 'Jun 2019 – Dec 2020', [
          'Handled checkout and patient questions at the pickup counter',
        ]),
      ],
      education: [edu('Pharmacy Technician Program', 'American River College', 'Sacramento, CA', '2018 – 2019')],
      certifications: [
        'Certified Pharmacy Technician (CPhT) — PTCB — 2020',
        'California Pharmacy Technician License #TCH 145872',
      ],
      skills: 'prescription processing, insurance billing, controlled substance inventory, Rx30 pharmacy system, customer service',
    },
    job: job('Hospital Pharmacy Technician', 'Valley Medical Center', `Valley Medical Center's inpatient pharmacy is hiring.

- Sterile compounding under USP 797
- IV admixture preparation
- Restock Pyxis automated dispensing cabinets

Requirements: CPhT; hospital experience preferred.`),
    failTerms: ['USP 797', 'sterile compounding', 'IV', 'Pyxis'],
    warnTerms: ['hospital', 'inpatient'],
    fieldNotes: 'Pharmacy: volume, accuracy, controlled-substance handling, certification and license. Retail work must not be recast as hospital, sterile or IV work.',
  },

  // ── Engineering, creative, government, nonprofit, science ──────────────────
  {
    id: 'mechanical-engineer-medical-device',
    industry: 'Engineering',
    resume: {
      name: 'Hannah Fischer', email: 'hannah.fischer.me@email.com', phone: '(555) 402-3319', website: '',
      experience: [
        role('Mechanical Engineer I', 'Tarsus Industrial Pumps', 'Cleveland, OH', 'Jul 2022 – Present', [
          'Design pump housings and brackets in SolidWorks with GD&T drawings for production',
          'Run static stress checks in SolidWorks Simulation on 12 redesigned components',
          'Cut part cost 18% on a bracket redesign by switching from a machined part to sheet metal',
          'Support supplier first-article inspections and resolve nonconformances with QA',
        ]),
        role('Engineering Intern', 'Tarsus Industrial Pumps', 'Cleveland, OH', 'May 2021 – Aug 2021', [
          'Built a test fixture for seal leak testing',
        ]),
      ],
      education: [edu('B.S. Mechanical Engineering', 'Case Western Reserve University', 'Cleveland, OH', '2018 – 2022')],
      certifications: ['Engineer in Training (EIT) — Ohio — 2022'],
      skills: 'SolidWorks, SolidWorks Simulation, GD&T, DFM, sheet metal design, MATLAB, first-article inspection',
    },
    job: job('Mechanical Design Engineer', 'Aurelia Medical', `Aurelia Medical designs surgical instruments.

- Design components in Creo or SolidWorks
- Run FEA in ANSYS
- Work within ISO 13485 design controls
- 3+ years of design experience; PE license preferred`),
    failTerms: ['ANSYS', 'ISO 13485', 'design controls', 'Professional Engineer', 'Creo'],
    warnTerms: ['medical device', 'surgical'],
    mustKeepSkills: ['SolidWorks'],
    fieldNotes: 'Engineering: concrete design work, tools, analysis methods, measured results (cost, weight, reliability). EIT is not a PE; SolidWorks Simulation is not ANSYS; industrial pumps are not medical devices.',
  },
  {
    id: 'graphic-designer-no-motion',
    industry: 'Creative',
    resume: {
      name: 'Olivia Grant', email: 'olivia.grant.design@email.com', phone: '(555) 781-4450', website: 'oliviagrant.design',
      experience: [
        role('Graphic Designer', 'Bramble & Co. Agency', 'Nashville, TN', 'Mar 2021 – Present', [
          'Design brand identities, packaging, and print collateral for 20+ consumer brands',
          'Led the visual refresh of a regional coffee chain across 14 locations',
          'Build social media templates in Figma and Canva used by 3 client marketing teams',
          'Prepare print-ready files in InDesign and Illustrator and manage press checks',
        ]),
        role('Junior Designer', 'Maple Print Studio', 'Nashville, TN', 'Jun 2019 – Feb 2021', [
          'Designed event posters and restaurant menus',
        ]),
      ],
      education: [edu('B.F.A. Graphic Design', 'Belmont University', 'Nashville, TN', '2015 – 2019')],
      skills: 'Adobe Illustrator, Adobe InDesign, Adobe Photoshop, Figma, Canva, brand identity, packaging design, typography, print production',
    },
    job: job('Brand Designer', 'Lumen Analytics', `Lumen Analytics (B2B SaaS) is hiring its first brand designer.

- Own our brand system across web and product marketing
- Create motion graphics in After Effects
- 3D in Cinema 4D is a plus
- Work in Figma

SaaS experience preferred.`),
    failTerms: ['After Effects', 'Cinema 4D', 'motion graphics'],
    warnTerms: ['SaaS', 'B2B'],
    mustKeepSkills: ['Figma'],
    expectedLabels: [['Brand System', 'Brand Systems']],
    fieldNotes: 'Design: portfolio link, kinds of work (identity, packaging, print), clients and scale, tools. Concrete rather than flowery; no invented tools or motion work.',
  },
  {
    id: 'policy-analyst-clearance',
    industry: 'Government',
    resume: {
      name: 'James Whitfield', email: 'james.whitfield.policy@email.com', phone: '(555) 250-8873', website: '',
      experience: [
        role('Policy Analyst', 'Colorado Department of Labor and Employment', 'Denver, CO', 'Jan 2021 – Present', [
          'Analyze unemployment insurance claims data in R to brief legislators on program trends',
          'Draft 10+ fiscal notes and policy memos a year for the state legislature',
          'Coordinated a stakeholder working group of 15 employer and worker advocacy organizations',
          "Built a public dashboard of monthly claims data used by the Governor's office",
        ]),
        role('Research Assistant', 'Bell Policy Center', 'Denver, CO', 'Jun 2019 – Dec 2020', [
          'Compiled literature reviews on state minimum wage laws',
        ]),
      ],
      education: [
        edu('Master of Public Policy', 'University of Denver', 'Denver, CO', '2017 – 2019'),
        edu('B.A. Economics', 'Colorado College', 'Colorado Springs, CO', '2013 – 2017'),
      ],
      skills: 'R, Excel, policy memo writing, fiscal analysis, stakeholder engagement, survey analysis',
    },
    job: job('Program Analyst (GS-12)', 'U.S. Department of Labor', `The U.S. Department of Labor seeks a Program Analyst.

- Evaluate federal workforce programs
- Analyze data in Stata or SAS
- Brief senior leadership

Requirements: Secret security clearance required; federal experience preferred.`),
    failTerms: ['Stata', 'SAS', 'clearance', 'Secret'],
    warnTerms: ['federal'],
    fieldNotes: 'Public sector: policy outputs (memos, fiscal notes), data methods, stakeholder work. A clearance is gating and must never be implied; state experience must not be recast as federal; R must not become Stata or SAS.',
  },
  {
    id: 'nonprofit-program-to-development',
    industry: 'Nonprofit',
    resume: {
      name: 'Rosa Delgado', email: 'rosa.delgado.np@email.com', phone: '(555) 663-2051', website: '',
      experience: [
        role('Program Coordinator', 'Eastside Youth Alliance', 'Los Angeles, CA', 'Aug 2020 – Present', [
          'Wrote 8 foundation grant proposals that secured $420,000 over three years',
          'Coordinate after-school programming for 180 students across 3 sites',
          'Track program outcomes and donor contacts in Salesforce Nonprofit Success Pack',
          'Recruited and scheduled 45 volunteers for the annual fundraising gala',
        ]),
        role('AmeriCorps Member', 'City Year Los Angeles', 'Los Angeles, CA', 'Aug 2019 – Jul 2020', [
          'Tutored 30 middle school students in reading',
        ]),
      ],
      education: [edu('B.A. Sociology', 'UC Riverside', 'Riverside, CA', '2015 – 2019')],
      skills: 'grant writing, Salesforce NPSP, program evaluation, volunteer management, event planning, bilingual English/Spanish',
    },
    job: job('Development Manager', 'Harbor Arts Foundation', `Harbor Arts Foundation funds arts education across Southern California.

- Cultivate and steward major gifts donors
- Run annual fund campaigns
- Manage donor records in Raiser's Edge
- Write foundation grant proposals

3+ years of fundraising experience.`),
    failTerms: ["Raiser's Edge", 'major gifts', 'major gift'],
    warnTerms: ['arts'],
    mustKeepSkills: ['grant writing'],
    fieldNotes: 'Nonprofit: dollars raised, grants won, programs and people served, donor systems. Program coordination and grant writing must not be inflated into major-gift fundraising.',
  },
  {
    id: 'research-associate-publications',
    industry: 'Science',
    extra: `PUBLICATIONS
Adeyemi S, Park J, Lowell R. "CRISPR screening identifies regulators of drug resistance in lung adenocarcinoma." Journal of Cell Biology. 2023;41(2):112-120.`,
    resume: {
      name: 'Samuel Adeyemi', email: 'samuel.adeyemi.lab@email.com', phone: '(555) 617-2294', website: '',
      experience: [
        role('Research Associate', 'Helix Therapeutics', 'Cambridge, MA', 'Jun 2021 – Present', [
          'Run qPCR and ELISA assays supporting 3 preclinical oncology programs',
          'Maintain 12 mammalian cell lines and cryopreserved stocks under aseptic technique',
          'Designed CRISPR knockout experiments that validated 2 drug targets',
          'Document experiments in Benchling and present results at weekly project meetings',
        ]),
        role('Lab Technician', 'Boston University School of Medicine', 'Boston, MA', 'Jul 2019 – May 2021', [
          'Prepared reagents and managed lab inventory for a 9-person lab',
        ]),
      ],
      education: [edu('B.S. Biochemistry', 'Boston University', 'Boston, MA', '2015 – 2019')],
      skills: 'qPCR, ELISA, cell culture, CRISPR-Cas9, Western blot, Benchling, GraphPad Prism',
    },
    job: job('Scientist I', 'Crestline Bio', `Crestline Bio develops cell therapies.

- Develop cell-based assays, including flow cytometry panels
- Work under GLP for IND-enabling studies
- Use CRISPR to engineer cell lines

PhD or MS preferred.`),
    failTerms: ['flow cytometry', 'GLP', 'PhD'],
    warnTerms: ['cell therapy', 'IND'],
    mustKeepSkills: ['CRISPR'],
    fieldNotes: 'Science: techniques, model systems, programs supported, publications. Exact methods matter; a B.S. must not be presented as graduate training. The parser has no publications field, so publications are expected to drop out of the structured resume.',
  },

  // ── Early career and senior leadership ─────────────────────────────────────
  {
    id: 'new-grad-data-analyst',
    industry: 'Technology',
    resume: {
      name: 'Emily Zhao', email: 'emily.zhao@email.com', phone: '(555) 845-6612', website: 'github.com/emilyzhao',
      experience: [
        role('Data Analyst Intern', 'Crescent Credit Union', 'Madison, WI', 'May 2025 – Aug 2025', [
          'Built a Python script that automated a weekly member churn report, saving the team 4 hours a week',
          'Wrote SQL queries to pull loan application data for 2 credit risk analyses',
          'Presented churn findings to the member experience team',
        ]),
        role('Barista', 'Colectivo Coffee', 'Madison, WI', 'Sep 2022 – May 2026', [
          'Trained 5 new baristas',
          'Handled opening shifts',
        ]),
      ],
      projects: [
        {
          name: 'Madison Bike Share Analysis',
          bullets: [
            'Analyzed 1.2 million trip records with pandas to model station demand',
            'Built demand charts in matplotlib for a city council transportation briefing',
          ],
        },
      ],
      education: [
        edu('B.S. Statistics', 'University of Wisconsin–Madison', 'Madison, WI', '2022 – 2026', [
          'GPA 3.7/4.0',
          'Relevant coursework: Regression Analysis, Database Systems, Machine Learning',
        ]),
      ],
      skills: 'Python, pandas, SQL, R, Excel, matplotlib, statistics',
    },
    job: job('Junior Data Analyst', 'Beacon Retail Group', `Beacon Retail Group is hiring a Junior Data Analyst.

- Query sales data with SQL
- Analyze with Python or R
- Build Tableau dashboards for merchandising teams
- Support A/B test analysis

1–2 years of experience preferred.`),
    failTerms: ['Tableau', 'A/B'],
    warnTerms: ['retail'],
    mustKeepSkills: ['SQL', 'Python'],
    fieldNotes: 'Entry level: education, projects and internships carry the weight. Must not claim years of full-time analyst experience; a part-time barista job shows reliability but must not be inflated.',
  },
  {
    id: 'vp-operations-to-coo',
    industry: 'Manufacturing',
    resume: {
      name: 'Catherine Doyle', email: 'catherine.doyle.ops@email.com', phone: '(555) 309-7715', website: 'linkedin.com/in/catherinedoyle',
      experience: [
        role('VP of Operations', 'Northfield Packaging', 'Grand Rapids, MI', 'Jan 2019 – Present', [
          'Run operations for 3 plants and 640 employees with an $85M P&L',
          'Cut scrap from 6.1% to 3.4% by launching a plant-wide lean program',
          'Led the $14M automation of 2 thermoforming lines, paid back in 26 months',
          'Raised on-time delivery from 88% to 97% by rebuilding S&OP with sales and finance',
          'Reduced the OSHA recordable rate by 45% through a behavior-based safety program',
          'Negotiated resin supply contracts worth $22M a year',
          'Built a plant manager succession bench, promoting 4 internal leaders',
        ]),
        role('Director of Manufacturing', 'Northfield Packaging', 'Grand Rapids, MI', 'Mar 2014 – Dec 2018', [
          'Managed 2 plants and 380 employees',
          'Implemented Oracle ERP across both plants',
          'Introduced OEE tracking, raising line OEE from 61% to 74%',
          'Led union contract negotiations with the Teamsters local',
          'Cut changeover time 40% using SMED',
        ]),
        role('Plant Manager', 'Delta Molding Inc.', 'Holland, MI', 'Jun 2009 – Feb 2014', [
          'Ran a 150-employee injection molding plant',
          'Achieved ISO 9001 recertification with zero major findings',
          'Reduced overtime spend by $1.1M a year',
          'Launched 12 new customer programs for automotive suppliers',
        ]),
        role('Production Supervisor', 'Delta Molding Inc.', 'Holland, MI', 'Jul 2005 – May 2009', [
          'Supervised 40 operators on second shift',
          'Trained operators on statistical process control',
        ]),
      ],
      education: [
        edu('MBA', 'University of Michigan Ross School of Business', 'Ann Arbor, MI', '2011 – 2013'),
        edu('B.S. Industrial Engineering', 'Western Michigan University', 'Kalamazoo, MI', '2001 – 2005'),
      ],
      certifications: ['Lean Six Sigma Black Belt — ASQ — 2015'],
      skills: 'Lean manufacturing, Six Sigma, S&OP, P&L management, Oracle ERP, OEE, SMED, capital projects, automation, ISO 9001, OSHA safety, union negotiations, supply contracts, thermoforming, injection molding, statistical process control, succession planning, budgeting, continuous improvement, root cause analysis, Kaizen',
    },
    job: job('Chief Operating Officer', 'Heartland Foods', `Heartland Foods (5 plants, $600M revenue) is hiring a COO.

- Lead all manufacturing, supply chain, and quality
- Own a $200M+ operating P&L
- Keep every plant SQF-certified and FSMA-compliant
- Complete our SAP S/4HANA rollout
- Lead the lean transformation

M&A integration experience preferred.`),
    failTerms: ['SQF', 'FSMA', 'SAP', 'M&A'],
    warnTerms: ['food', 'supply chain'],
    mustKeepSkills: ['P&L', 'lean'],
    expectedLabels: [['Quality Management', 'Quality Systems']],
    fieldNotes: 'Executive: scale (plants, people, P&L), strategic outcomes with exact numbers, transformation leadership; executive tone. Packaging must not be recast as food manufacturing; the $85M P&L must not grow. 18 bullets in, 18 out.',
  },
]

export const INDUSTRY_CASES: EvalCase[] = SPECS.map(toCase)
