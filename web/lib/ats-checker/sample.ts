import type { AiReport } from './ai'

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

export const SAMPLE_AI: AiReport = {
  "score": 93,
  "gaps": [
    "agency partners",
    "Tableau or Looker",
    "SaaS company"
  ],
  "keywordMatch": {
    "tier1Covered": [
      "B2B marketing",
      "demand generation",
      "SEO",
      "Google Analytics",
      "A/B testing",
      "HubSpot or Salesforce"
    ],
    "tier1Missing": [],
    "tier2Covered": [
      "paid search",
      "email marketing",
      "events",
      "content marketing",
      "copywriting",
      "marketing budget",
      "report results to leadership",
      "team management",
      "Bachelor's degree"
    ],
    "tier2Missing": [
      "agency partners",
      "Tableau or Looker",
      "SaaS company"
    ],
    "gatingGaps": []
  },
  "quotes": [
    {
      "name": "B2B marketing",
      "posting_text": "B2B marketing",
      "resume_text": "7 years of B2B campaign work"
    },
    {
      "name": "demand generation",
      "posting_text": "demand generation",
      "resume_text": "lifted demo requests 22%"
    },
    {
      "name": "SEO",
      "posting_text": "SEO",
      "resume_text": "SEO plan"
    },
    {
      "name": "Google Analytics",
      "posting_text": "Google Analytics",
      "resume_text": "Google Analytics dashboards"
    },
    {
      "name": "A/B testing",
      "posting_text": "A/B testing",
      "resume_text": "A/B tests"
    },
    {
      "name": "HubSpot or Salesforce",
      "posting_text": "HubSpot or Salesforce",
      "resume_text": "Salesforce"
    },
    {
      "name": "paid search",
      "posting_text": "paid search",
      "resume_text": "paid search"
    },
    {
      "name": "email marketing",
      "posting_text": "Email marketing",
      "resume_text": "client email programs"
    },
    {
      "name": "events",
      "posting_text": "events",
      "resume_text": "trade show events"
    },
    {
      "name": "content marketing",
      "posting_text": "content marketing",
      "resume_text": "site content"
    },
    {
      "name": "copywriting",
      "posting_text": "copywriting",
      "resume_text": "Wrote copy"
    },
    {
      "name": "marketing budget",
      "posting_text": "marketing budget",
      "resume_text": "manage a $1.2M annual budget"
    },
    {
      "name": "report results to leadership",
      "posting_text": "report results to leadership",
      "resume_text": "Kept leadership up to date on campaign results"
    },
    {
      "name": "team management",
      "posting_text": "a team of four",
      "resume_text": "lead a team of four"
    },
    {
      "name": "Bachelor's degree",
      "posting_text": "Bachelor's degree in marketing, communications or a related field",
      "resume_text": "B.A. Communications"
    },
    {
      "name": "agency partners",
      "posting_text": "agency partners",
      "resume_text": ""
    },
    {
      "name": "Tableau or Looker",
      "posting_text": "Tableau or Looker",
      "resume_text": ""
    },
    {
      "name": "SaaS company",
      "posting_text": "SaaS company",
      "resume_text": ""
    }
  ],
  "title": "Marketing Manager"
}
