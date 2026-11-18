import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { checkResume, readPosting, type Level } from './keywords'

const text = (name: string) => readFileSync(join(__dirname, 'postings', `${name}.txt`), 'utf8')
const posting = (name: string) => readPosting(text(name))
const pick = (p: ReturnType<typeof readPosting>, level?: Level) => p.keywords.filter((k) => !level || k.level === level).map((k) => k.name)
const names = (name: string, level?: Level) => pick(posting(name), level)
const unbulleted = (name: string, level?: Level) => pick(readPosting(text(name).replace(/^\s*[-•*]\s+/gm, '')), level)

describe('keywords from saved postings', () => {
  test.each([
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
    ['Requirements\nPay-per-click campaign experience\nGoogle Analytics', 'required', ['Google Analytics']],
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
  ] as const)('a short line without a bullet is not a heading: %j', (ask, level, expected) => {
    expect(pick(readPosting(ask), level)).toEqual([...expected])
  })

  test.each([
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

  test('an acronym the list lacks also matches its spelled-out name', () => {
    const ask = 'Requirements\n- Securities Master File (SMF) data'
    expect(found(ask, 'Owned the Securities Master File for 3 funds.')).toMatchObject({ SMF: true })
  })
})
