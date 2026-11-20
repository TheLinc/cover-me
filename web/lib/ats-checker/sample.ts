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
    "Tableau or Looker",
    "agency management",
    "SaaS company experience"
  ],
  "keywordMatch": {
    "tier1Covered": [
      "SEO",
      "content marketing",
      "Google Analytics",
      "A/B testing",
      "HubSpot or Salesforce",
      "B2B demand generation"
    ],
    "tier1Missing": [],
    "tier2Covered": [
      "paid search",
      "email marketing",
      "events marketing",
      "team management",
      "budget management",
      "campaign planning",
      "leadership reporting",
      "copywriting",
      "bachelor's degree"
    ],
    "tier2Missing": [
      "Tableau or Looker",
      "agency management",
      "SaaS company experience"
    ],
    "gatingGaps": []
  },
  "quotes": [
    {
      "name": "SEO",
      "posting_text": "SEO",
      "resume_text": "rebuilding the SEO plan"
    },
    {
      "name": "content marketing",
      "posting_text": "content marketing",
      "resume_text": "rebuilding the SEO plan and site content"
    },
    {
      "name": "Google Analytics",
      "posting_text": "Google Analytics",
      "resume_text": "Built Google Analytics dashboards"
    },
    {
      "name": "A/B testing",
      "posting_text": "A/B testing",
      "resume_text": "Ran 40+ A/B tests"
    },
    {
      "name": "HubSpot or Salesforce",
      "posting_text": "HubSpot or Salesforce",
      "resume_text": "Salesforce"
    },
    {
      "name": "B2B demand generation",
      "posting_text": "B2B demand generation programs",
      "resume_text": "lifted demo requests 22%"
    },
    {
      "name": "paid search",
      "posting_text": "paid search",
      "resume_text": "paid search"
    },
    {
      "name": "email marketing",
      "posting_text": "Email marketing",
      "resume_text": "client email programs reaching 150,000 subscribers"
    },
    {
      "name": "events marketing",
      "posting_text": "events",
      "resume_text": "trade show events"
    },
    {
      "name": "Tableau or Looker",
      "posting_text": "Tableau or Looker",
      "resume_text": ""
    },
    {
      "name": "agency management",
      "posting_text": "Manage two agency partners",
      "resume_text": ""
    },
    {
      "name": "team management",
      "posting_text": "a team of four",
      "resume_text": "lead a team of four"
    },
    {
      "name": "budget management",
      "posting_text": "Own the marketing budget",
      "resume_text": "manage a $1.2M annual budget"
    },
    {
      "name": "campaign planning",
      "posting_text": "Plan and run campaigns",
      "resume_text": "Run campaign strategy"
    },
    {
      "name": "leadership reporting",
      "posting_text": "report results to leadership",
      "resume_text": "Kept leadership up to date on campaign results"
    },
    {
      "name": "copywriting",
      "posting_text": "copywriting",
      "resume_text": "Copywriting"
    },
    {
      "name": "SaaS company experience",
      "posting_text": "SaaS company",
      "resume_text": ""
    },
    {
      "name": "bachelor's degree",
      "posting_text": "Bachelor's degree in marketing, communications or a related field",
      "resume_text": "B.A. Communications"
    }
  ],
  "title": "Marketing Manager"
}
