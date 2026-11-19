import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { checkResume, marks, readPosting, type Level } from './keywords'
import { TERMS } from './terms'

const text = (name: string) => readFileSync(join(__dirname, 'postings', `${name}.txt`), 'utf8')
const posting = (name: string) => readPosting(text(name))
const pick = (p: ReturnType<typeof readPosting>, level?: Level) => p.keywords.filter((k) => !level || k.level === level).map((k) => k.name)
const names = (name: string, level?: Level) => pick(posting(name), level)
const unbulleted = (name: string, level?: Level) => pick(readPosting(text(name).replace(/^\s*[-•*]\s+/gm, '')), level)

describe('keywords from saved postings', () => {
  test.each([
    ['ashby', 'required', ['Rust', 'Python', 'LLM', 'distributed systems']],
    ['greenhouse', 'required', ['Python', 'LLM', 'machine learning']],
    ['amazon', 'required', ['Python', 'Java', 'TypeScript', 'Go', 'Rust', 'C++', 'C#', 'Linux', 'algorithms', 'data structures']],
    ['amazon', 'preferred', ['SQL', 'NoSQL', 'distributed systems', 'SDLC']],
    ['bamboohr', 'required', ['SQL', 'Snowflake', 'Power BI', 'Excel', 'Visio', 'Jira', 'Confluence', 'Agile', 'Scrum', 'SDLC', 'FactSet', 'Refinitiv', 'Bloomberg', 'CRIMS', 'IBOR', 'MBA']],
    ['dueto', 'required', ['CPA', 'ERP', 'internal controls', 'audit', "Bachelor's degree"]],
    ['dueto', 'preferred', ['GAAP', 'IFRS']],
    ['indeed', undefined, ['welding', 'MIG', 'Stick', 'grinding', 'High school diploma']],
    ['lever', 'required', ['Excel', 'Word', 'PowerPoint', 'Outlook', 'expense reports', 'travel arrangements']],
    ['linkedin', 'required', ['RN', 'BLS', 'CPR']],
    ['linkedin', 'preferred', ['CHPN']],
    ['phenom', 'required', ['LPN', 'LVN', 'CPR', "driver's license"]],
    ['python', 'required', ['Python', 'Linux', 'PostgreSQL', 'Elasticsearch', 'AWS', 'Lambda', 'EC2', 'ECS', 'RDS', 'SQS', 'S3', 'Route 53']],
    ['python', 'preferred', ['NLP', 'NER', 'LangGraph', 'machine learning']],
    ['smartrecruiters', 'required', ['customer service', 'cleaning', 'hand tools']],
    ['terminal', 'required', ['AWS', 'SQL', 'NoSQL', 'ETL']],
    ['terminal', 'preferred', ['Databricks', 'Unity Catalog', 'Delta Lake', 'SOC 2']],
    ['workable', 'required', ['Python', 'JavaScript', 'TypeScript', 'React', 'Svelte']],
    ['workable', 'preferred', ['WebRTC', 'WebSockets', 'FastAPI', 'Starlette', 'LiveKit']],
    ['workday', 'required', ['Python', 'Git', 'LLM', 'RAG', 'machine learning']],
  ] as const)('%s lists its %s skills, with or without bullets', (name, level, expected) => {
    expect(names(name, level)).toEqual(expect.arrayContaining([...expected]))
    expect(unbulleted(name, level)).toEqual(expect.arrayContaining([...expected]))
  })

  test.each([
    ['Requirements\nKnowledge of payroll and benefits\nPython and SQL\nCPA required', 'required', ['payroll', 'Python', 'SQL', 'CPA']],
    ['Qualifications\nFamiliarity with data privacy rules\nTerraform and Kubernetes', 'required', ['Terraform', 'Kubernetes']],
    ['Requirements\nPay-per-click campaign experience\nGoogle Analytics', 'required', ['PPC', 'Google Analytics']],
    ['Nice to have\nExperience with Kafka\nStrong SQL skills\nFamiliarity with dbt', 'preferred', ['Kafka', 'SQL', 'dbt']],
    ['Nice to have\n* Experience with Kafka\n* Great interpersonal skills\n* Familiarity with dbt', 'preferred', ['Kafka', 'interpersonal skills', 'dbt']],
    ['Requirements\n- Install guard rails and hand rails\n- Shift starts 7am EST, start ASAP', 'required', []],
    ['Requirements\n- You will excel in a fast-paced role\n- Positive outlook', 'required', []],
    ['About the role\nSales Requirements\n- Salesforce\n- Cold calling', 'required', ['Salesforce', 'cold calling']],
    ['Requirements\n● Python\n● Bilingual a plus\n▪ Salesforce', 'required', ['Python', 'Salesforce']],
    ['Requirements\n**Core Experience:** 5+ years of SQL', 'required', ['SQL']],
    ['Required Skills: Python, SQL, AWS', 'required', ['Python', 'SQL', 'AWS']],
    ['Minimum qualifications: Bachelor\'s degree in Computer Science', 'required', ["Bachelor's degree"]],
    ['Required qualifications:\n- Python\nPreferred: AWS certification\n- Kubernetes', 'preferred', ['AWS', 'Kubernetes']],
    ['Requirements\nResponsibilities: welding, grinding', 'mentioned', ['welding', 'grinding']],
    ['Senior Data Engineer\nSalary: $150,000\nRequirements\n- 5+ years of Python and SQL\n- Airflow, dbt', 'required', ['Python', 'SQL', 'Airflow', 'dbt']],
    ['Pay: $20.00 - $25.00 per hour\nBenefits:\n- 401(k)\nSchedule:\n- 8 hour shift\nExperience:\n- Welding: 1 year (Required)\nLicense/Certification:\n- Driver\'s License (Required)', 'required', ['welding', "driver's license"]],
    ['Responsibilities\n- Plan sprints\nExperience\n- Python and Kubernetes\n- CPR certification', 'required', ['Python', 'Kubernetes', 'CPR']],
    ['Requirements\n- You MUST have a valid license\n- COVID-19 vaccination required\n- PLEASE include a cover letter', 'required', []],
    ['Requirements\n- A master of SQL and spreadsheets', 'required', ['SQL']],
    ['Requirements\n- Familiarity with REST APIs', 'required', ['REST']],
    ['About Us\nWe build healthcare software.\nWhat It Takes\n- RN license\n- BLS certification', 'mentioned', ['RN', 'BLS']],
    ['About Acme\nAcme is a fintech startup.\nYour Toolkit\n- 5+ years of Python\n- Kafka, AWS, PostgreSQL', 'mentioned', ['Python', 'Kafka', 'AWS', 'PostgreSQL']],
    ['Who We Are\nWe are a design studio.\nKey Attributes\n- Figma and Sketch', 'mentioned', ['Figma', 'Sketch']],
    ['About the Opportunity\nJoin a growing team as a Data Engineer.\n- 4+ years with SQL, Python and Airflow', 'mentioned', ['SQL', 'Python', 'Airflow']],
    ['Nice to have\nExperience with Kafka\nYou will need a car\nKubernetes\nTerraform', 'preferred', ['Kafka', 'Kubernetes', 'Terraform']],
    ['Nice to have\nExperience with Kafka\nEducation in computer science\nSkills in public speaking\nTerraform', 'preferred', ['Kafka', 'Terraform']],
    ['Requirements:\nMust have experience in Excel, SQL and Power BI. We use Jira and Confluence daily.', 'required', ['Excel', 'SQL', 'Power BI']],
    ['We are looking for a Senior Accountant with 5+ years of experience, a CPA, strong Excel and QuickBooks skills, and knowledge of GAAP.', 'required', ['CPA', 'Excel', 'QuickBooks', 'GAAP']],
    ['Requirements\n- No H1B sponsorship, start date TBD\n- Python', 'required', ['Python']],
    ['About Brightline\nBrightline helps 4,000 clinics run their front desk. We\'re a team of 80 based in Toronto.\n\nThe job\nYou\'ll join a team of six engineers building the scheduling product our clinics use every day.\n\nHere\'s what you need\n- 4+ years building web applications in TypeScript and React\n- Experience with Node.js and PostgreSQL\n- Comfort with AWS and Docker\n- Clear written communication\n\nBonus points\n- Experience with GraphQL',
      'required', ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'communication']],
    ['About Us\nWe build software.\n- 5+ years of Python', 'mentioned', ['Python']],
    ["Minimum Qualifications\nMinimum 2 years of Salesforce administration experience\nMinimum 1 year with Apex and SOQL\nRequired knowledge of SQL\nBachelor's degree", 'required', ['Salesforce', 'SOQL', 'SQL', "Bachelor's degree"]],
    ["Requirements\nMinimum 3 years of Python experience\nMinimum 2 years with AWS\nBachelor's degree in Computer Science", 'required', ['Python', 'AWS', "Bachelor's degree"]],
    ['Requirements\nRequired certifications CPR and BLS', 'required', ['CPR', 'BLS']],
    ['Qualifications\nPreferred experience with Tableau and Looker', 'preferred', ['Tableau', 'Looker']],
    ['Perks\n- Remote work\n- Health insurance\nKnowledge, skills and abilities\n- Python\n- Strong SQL\n- Familiarity with AWS\n- Airflow', 'mentioned', ['Python', 'SQL', 'AWS', 'Airflow']],
    ['What we offer\nHealth insurance and 401k\nWho should apply\nPython developers\nPeople with SQL and AWS', 'mentioned', ['Python', 'SQL', 'AWS']],
    ['Perks\n- Remote work\n- Equity\nAWS Experience\n- Lambda\n- DynamoDB', 'mentioned', ['AWS', 'Lambda', 'DynamoDB']],
    ['Responsibilities\n- Patient care\nLicensure\n- RN license\n- BLS and ACLS', 'required', ['RN', 'BLS', 'ACLS']],
    ['Qualifications\n- Valid state teaching certificate\n- Differentiated instruction and lesson planning\n- Strong classroom management skills\n- Google Classroom and Seesaw\n- Experience with students with IEPs',
      'required', ['teaching certificate', 'differentiated instruction', 'lesson planning', 'classroom management', 'Google Classroom', 'Seesaw', 'IEP']],
    ['Requirements\n- Litigation and legal research\n- Westlaw and iManage\n- Case management, crisis intervention and trauma-informed care', 'required',
      ['litigation', 'legal research', 'Westlaw', 'iManage', 'case management', 'crisis intervention', 'trauma-informed care']],
    ['Requirements\n- Experience with our stack: Python, Django, PostgreSQL\n- You\'ll help us scale Kafka and Redis', 'required', ['Python', 'Django', 'PostgreSQL', 'Kafka', 'Redis']],
    ["What you'll do\n- Plan sprints\n🧠 What you'll bring\n- Python and Django\n✨ Nice to have\n- Kubernetes", 'required', ['Python', 'Django']],
    ['Benefits\n- Dental and vision\n- Python, SQL and Docker experience\n- Kubernetes', 'mentioned', ['Python', 'SQL', 'Docker', 'Kubernetes']],
    ['Compensation Analyst\nRequirements\nCompensation analysis experience\nAdvanced Excel and SQL\nKnowledge of Workday', 'required', ['Excel', 'SQL', 'Workday']],
    ['Accountant\nRequirements\nAbout 3-5 years of experience in accounting\nCPA required\nProficient in QuickBooks and Excel\nKnowledge of GAAP', 'required', ['CPA', 'QuickBooks', 'Excel', 'GAAP']],
    ['Requirements\nContact center experience preferred\nSalesforce and Zendesk\nData entry and typing', 'required', ['Salesforce', 'Zendesk', 'data entry', 'typing']],
    ['Requirements\nBenefits administration experience\nWorkday and HRIS\nPayroll', 'required', ['Workday', 'HRIS', 'payroll']],
    ['Requirements\nStrong sense of responsibility\nExecutive summary writing\nPython and SQL', 'required', ['Python', 'SQL']],
    ['What you\'ll do\nBuild APIs\nBring new ideas to the team\nWrite Python services', 'required', []],
  ] as const)('a short line without a bullet is not a heading: %j', (ask, level, expected) => {
    expect(pick(readPosting(ask), level)).toEqual([...expected])
  })

  test.each([
    "You'll have", 'You should have', "What you'll have", 'Your profile', 'Candidate profile', 'Your background',
    'Essential', 'Essential criteria', 'Person specification', 'Competencies', 'To be successful in this role',
    'What makes you a great fit', 'What sets you apart', "Who you'll be", "What you'll need to be successful in this role",
    'About the candidate', 'Who We Are Looking For', 'WHO WE ARE LOOKING FOR', 'Who we are looking for:', "Who we're looking for",
    "We're looking for", 'Skills and qualifications', 'Your experience', 'Education and experience', 'Key skills',
    'Technical skills', 'Is this you?', 'You have', 'The right candidate', 'Contact Center Requirements',
    "Here's what you need", 'You bring', 'You are', 'Skills you need', "Things you'll need", 'A bit about you',
    "You're a great fit if", "We'd love to hear from you if", 'Work Experience', 'Job requirements', 'Your qualifications',
    'The skills you need', 'Ideal candidate will have', 'Knowledge and skills',
  ])('"%s" starts a must-have section', (heading) => {
    expect(readPosting(`What you'll do\nPlan sprints\n${heading}\nKubernetes and Docker`).keywords.map((k) => [k.name, k.level]))
      .toEqual([['Kubernetes', 'required'], ['Docker', 'required']])
  })

  test('no two terms share a spelling', () => {
    const spellings = TERMS.flatMap((t) => t.replace(/^=/, '').split('|').map((s) => (t.startsWith('=') || !/[a-z]/.test(s) ? s : s.toLowerCase())))
    expect(spellings.filter((s, i) => spellings.indexOf(s) !== i)).toEqual([])
  })

  test.each(['Nice to haves', 'What would make you stand out', 'Desired skills', 'Desirable', 'Desirable criteria', 'Good to have', 'Ideally', 'Even better if', 'Pluses', 'Extra credit', 'It would be great if you have'])(
    '"%s" starts a nice-to-have section', (heading) => {
      expect(readPosting(`Requirements\n- Python\n${heading}\nKubernetes`).keywords.map((k) => [k.name, k.level]))
        .toEqual([['Python', 'required'], ['Kubernetes', 'preferred']])
    })

  test.each([
    ['bamboohr', 'SME'],
    ['workday', 'NVIDIA'],
    ['linkedin', 'INTEGRIS'],
    ['amazon', 'IDE'],
    ['dueto', 'GISrael'],
    ['terminal', 'DNA'],
    ['bamboohr', "Master's degree"],
  ])('%s does not list %s', (name, wrong) => {
    expect(names(name)).not.toContain(wrong)
  })

  test('years of experience asked for', () => {
    expect(posting('amazon').years).toEqual(['3+ years of software development experience'])
    expect(posting('phenom').years).toEqual(['Two years experience as an LPN/LVN in a clinical setting'])
    expect(posting('indeed').years).toEqual(['1 year experience in shop setting'])
    expect(readPosting('Requirements\n- Must be 18 years of age or older\n- Must be 21 years old').years).toEqual([])
  })
})

describe('checking a resume', () => {
  const found = (postingText: string, resume: string) =>
    Object.fromEntries(checkResume(readPosting(postingText).keywords, resume).map((k) => [k.name, k.found]))

  test('matches other spellings, plurals and hyphens', () => {
    const ask = 'Requirements\n- Power BI and Kubernetes\n- Problem-solving skills\n- Experience with ETFs'
    expect(found(ask, 'Built PowerBI dashboards on K8s. Strong problem solving. Traded ETF baskets.')).toEqual({
      'Power BI': true, Kubernetes: true, 'problem-solving': true, ETF: true,
    })
  })

  test('acronyms and common-word names match only as written', () => {
    const ask = 'Requirements\n- RN license\n- Microsoft Word and Go'
    expect(found(ask, 'Went on to learn a new word in every shift.')).toEqual({ RN: false, Word: false, Go: false })
    expect(found(ask, 'RN since 2019. Wrote reports in Word. Services in Go.')).toEqual({ RN: true, Word: true, Go: true })
    expect(pick(readPosting('Requirements\n- Go-to-market strategy\n- Salesforce'))).toEqual(['Salesforce'])
    expect(found(ask, 'A go-getter. Go-to-market lead.')).toMatchObject({ Go: false })
    expect(found('Requirements\n- React and Excel', 'React-based UI, Excel-based models')).toEqual({ React: true, Excel: true })
  })

  test('either of two options joined by "or" covers both', () => {
    const ask = 'Requirements\n- HubSpot or Salesforce\n- Tableau, or Looker\n- Agile/Scrum'
    const result = checkResume(readPosting(ask).keywords, 'Ran Salesforce reports. Built Looker dashboards. Scrum master.')
    expect(Object.fromEntries(result.map((k) => [k.name, [k.found, k.via]]))).toEqual({
      HubSpot: [true, 'Salesforce'], Salesforce: [true, undefined],
      Tableau: [true, 'Looker'], Looker: [true, undefined],
      Agile: [false, undefined], Scrum: [true, undefined],
    })
  })

  test('an "or" covers only the level and section it was written in', () => {
    const viaOf = (ask: string, resume: string, name: string) => checkResume(readPosting(ask).keywords, resume).find((k) => k.name === name)
    expect(viaOf('Requirements\n- Salesforce\nNice to have\n- HubSpot or Salesforce', 'HubSpot admin', 'Salesforce')).toMatchObject({ found: false })
    expect(viaOf('Requirements\n- HubSpot or Salesforce', 'HubSpot admin', 'Salesforce')).toMatchObject({ found: true, via: 'HubSpot' })
    expect(viaOf('About the role\nWe build in Python or Go.\nRequirements\n- Python\n- Go', 'Go services', 'Python')).toMatchObject({ found: false })
  })

  test('a plural acronym the list lacks matches its singular', () => {
    expect(found('Requirements\n- Experience defining KPIs and OKRs\n- Building SDKs', 'Owned KPI reporting and OKR planning; shipped an SDK.'))
      .toEqual({ KPI: true, OKR: true, SDK: true })
  })

  test('an acronym the list lacks also matches its spelled-out name', () => {
    const ask = 'Requirements\n- Securities Master File (SMF) data'
    expect(found(ask, 'Owned the Securities Master File for 3 funds.')).toMatchObject({ SMF: true })
  })

  test('a named credential is its own keyword, not a general skill', () => {
    expect(found('Requirements: ServSafe Manager certification.', 'ServSafe Food Handler, 2024')).toEqual({ 'ServSafe Manager': false })
    expect(found('Nice to have: accessibility (WCAG 2.1 AA) experience.', 'Fixed accessibility bugs.')).toEqual({ accessibility: true, WCAG: false })
    expect(found('Requirements\n- TESOL certificate', 'Taught ESL for 3 years.')).toEqual({ TESOL: false })
  })
})

describe('acronyms the list lacks', () => {
  test('are read from duty bullets, not company prose', () => {
    const ask = 'About Acme\nAcme trades on the NYSE.\nResponsibilities:\n- Test controls for the FRB audit\n- Report to the CFO'
    expect(pick(readPosting(ask))).toEqual(['audit', 'FRB'])
    const company = 'About us\n- Our customers include PayPal and DoorDash\n- Backed by a NASDAQ-listed parent\nWhat you will do\n- We ship to TSMC\n- Run SPC checks'
    expect(pick(readPosting(company))).toEqual(['SPC'])
  })

  test('seen first under duties, then under requirements, count as required', () => {
    const ask = 'Responsibilities\n- Maintain FRB filings\nRequirements\n- FRB reporting'
    expect(readPosting(ask).keywords.find((k) => k.name === 'FRB')?.level).toBe('required')
  })
})

describe('showing keywords in the text', () => {
  test('each keyword keeps the posting line that set its level', () => {
    const ask = 'About us\nWe use SQL every day.\nRequirements\n- **SQL** and Tableau'
    expect(readPosting(ask).keywords.find((k) => k.name === 'SQL')?.line).toBe('SQL and Tableau')
  })

  test('marks sit on the raw text, one per place, the longer name winning', () => {
    const text = 'Built Power BI dashboards and ran BI reviews in “Excel”.'
    const { keywords } = readPosting('Requirements\n- Power BI, business intelligence and Excel')
    const found = marks(text, keywords).map((m) => [m.name, text.slice(m.start, m.end)])
    expect(found).toEqual([['Power BI', 'Power BI'], ['business intelligence', 'BI'], ['Excel', 'Excel']])
  })
})
