import type { AiKeyword } from './ai'

export const SAMPLE_POSTING = `Marketing Manager

Northwind is hiring a Marketing Manager to run our B2B demand generation programs.

What you'll do
- Plan and run campaigns across paid search, email and events
- Own the marketing budget and report results to leadership
- Manage two agency partners and a team of four

Requirements
- 5+ years of B2B marketing experience
- SEO and content marketing
- Google Analytics and A/B testing
- HubSpot or Salesforce
- Strong copywriting and communication skills
- Bachelor's degree in marketing, communications or a related field

Nice to have
- Experience with Tableau or Looker
- Email marketing in a SaaS company

About Northwind
Northwind is a made-up company used for this example. We offer health benefits and remote work.`

export const SAMPLE_RESUME = `Alex Rivera
Marketing Manager
Chicago, IL | (312) 555-0142 | alex.rivera@example.com | linkedin.com/in/alexrivera-example

Summary
Marketing manager with 7 years of B2B campaign work. I plan and run campaigns across search, email and events, manage a $1.2M annual budget, and lead a team of four.

Experience
Marketing Manager, Fernwood Labs
Chicago, IL · Mar 2022 - Present
- Run campaign strategy for a $1.2M annual budget across paid search, email and events.
- Grew organic sign-ups 48% in 18 months by rebuilding the SEO plan and site content.
- Kept leadership up to date on campaign results and next steps.

Senior Marketing Specialist, Quillmark Software
Chicago, IL · Jun 2019 - Feb 2022
- Built Google Analytics dashboards that cut monthly reporting from three days to one.
- Ran 40+ A/B tests on landing pages and lifted demo requests 22%.

Marketing Coordinator, Tidewater Creative
Evanston, IL · Aug 2017 - May 2019
- Wrote copy for client email programs reaching 150,000 subscribers.
- Coordinated trade show events, from booking to lead follow-up.

Education
B.A. Communications, University of Illinois Chicago, 2013 - 2017

Skills
SEO, Campaign strategy, Google Analytics, Budget management, Team leadership, A/B testing, Copywriting, Salesforce`

export const SAMPLE_AI: AiKeyword[] = [
  {
    name: "SEO and content marketing",
    level: "required",
    posting_text: "SEO and content marketing",
    resume_text: "rebuilding the SEO plan and site content",
    found: true
  },
  {
    name: "Google Analytics",
    level: "required",
    posting_text: "Google Analytics",
    resume_text: "Built Google Analytics dashboards",
    found: true
  },
  {
    name: "A/B testing",
    level: "required",
    posting_text: "A/B testing",
    resume_text: "Ran 40+ A/B tests",
    found: true
  },
  {
    name: "HubSpot or Salesforce",
    level: "required",
    posting_text: "HubSpot or Salesforce",
    resume_text: "Salesforce",
    found: true
  },
  {
    name: "copywriting",
    level: "required",
    posting_text: "copywriting",
    resume_text: "Copywriting",
    found: true
  },
  {
    name: "Bachelor's degree",
    level: "required",
    posting_text: "Bachelor's degree in marketing, communications or a related field",
    resume_text: "B.A. Communications",
    found: true
  },
  {
    name: "paid search",
    level: "required",
    posting_text: "paid search",
    resume_text: "paid search",
    found: true
  },
  {
    name: "Plan and run campaigns",
    level: "required",
    posting_text: "Plan and run campaigns",
    resume_text: "Run campaign strategy",
    found: true
  },
  {
    name: "marketing budget",
    level: "required",
    posting_text: "Own the marketing budget",
    resume_text: "manage a $1.2M annual budget",
    found: true
  },
  {
    name: "report results to leadership",
    level: "required",
    posting_text: "report results to leadership",
    resume_text: "Kept leadership up to date on campaign results",
    found: true
  },
  {
    name: "Manage two agency partners",
    level: "required",
    posting_text: "Manage two agency partners",
    resume_text: "",
    found: false
  },
  {
    name: "Manage a team of four",
    level: "required",
    posting_text: "a team of four",
    resume_text: "lead a team of four",
    found: true
  },
  {
    name: "demand generation",
    level: "required",
    posting_text: "B2B demand generation programs",
    resume_text: "lifted demo requests 22%",
    found: true
  },
  {
    name: "Email marketing",
    level: "preferred",
    posting_text: "Email marketing in a SaaS company",
    resume_text: "client email programs reaching 150,000 subscribers",
    found: true
  },
  {
    name: "Tableau or Looker",
    level: "preferred",
    posting_text: "Tableau or Looker",
    resume_text: "",
    found: false
  }
]
