import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import FIXTURES from './fixture-resumes.json'
import { checkResumeText, hasNumber, postingTitle, resumeBullets } from './hints'

const resumes = FIXTURES
const flat = (s: string) => s.replace(/\s+/g, ' ').trim()

const asNarrowPdfText = (text: string) =>
  text.split('\n').flatMap((line) => {
    const out = ['']
    for (const word of line.replace(/^- /, '').split(' ')) {
      if (`${out[out.length - 1]} ${word}`.trim().length > 85) out.push(word)
      else out[out.length - 1] = `${out[out.length - 1]} ${word}`.trim()
    }
    return out
  }).join('\n')

function score(read: (text: string) => string) {
  let truth = 0, got = 0, right = 0
  for (const c of resumes) {
    const want = c.bullets.map(flat)
    const found = resumeBullets(read(c.text)).map(flat)
    truth += want.length
    got += found.length
    right += found.filter((b) => want.includes(b)).length
  }
  return { recall: right / truth, precision: right / got }
}

describe('experience bullets', () => {
  test.each([['as written', (t: string) => t], ['wrapped with no glyphs, as pdf.js can give', asNarrowPdfText]])(
    'are found with under 5%% misses and wrong lines %s',
    (_, read) => {
      const { recall, precision } = score(read)
      expect(recall).toBeGreaterThanOrEqual(0.95)
      expect(precision).toBeGreaterThanOrEqual(0.95)
    },
  )

  test('a role line in title case is not a bullet', () => {
    const resume = 'Experience\nMarketing Manager, Fernwood Labs\nChicago, IL · Mar 2022 - Present\nRun campaign strategy for a $1.2M budget.'
    expect(resumeBullets(resume)).toEqual(['Run campaign strategy for a $1.2M budget.'])
  })
})

describe('a number in a bullet', () => {
  test('flags exactly the fixture bullets that were read by hand and have no number', () => {
    for (const c of resumes) expect(resumeBullets(c.text).filter((b) => !hasNumber(b)), c.id).toEqual(c.noNumber)
    expect(resumes.flatMap((c) => c.noNumber)).toHaveLength(56)
  })

  test.each([
    ['Cut month-end close from 8 days to 5', true],
    ['Lead a team of four marketers', true],
    ['Grew sign-ups 48% in 18 months', true],
    ['Managed a $1.2M budget', true],
    ['Built GA4 and B2B dashboards', false],
    ['Kept projects on track since 2019', false],
    ['Earned OSHA 10 and ISO 9001 training', false],
    ['Weld structural steel in all positions', false],
    ['Jan 2020 - Present: ran payroll', false],
    ['Trained hundreds of new hires', true],
    ['Led a team of fifteen nurses', true],
    ['Grew revenue by sixty percent', true],
    ['Ran dozens of events', true],
  ])('%s: %s', (bullet, expected) => expect(hasNumber(bullet)).toBe(expected))
})

describe('the posting title', () => {
  const postings = join(__dirname, 'postings')
  test('is the first line, cut at a comma or dash, when the posting names it again', () => {
    const titles = Object.fromEntries(readdirSync(postings).map((f) => [f, postingTitle(readFileSync(join(postings, f), 'utf8'))]))
    expect(titles).toEqual({
      'amazon.txt': null,
      'ashby.txt': 'AI Systems Engineer',
      'bamboohr.txt': 'Senior Business Analyst',
      'dueto.txt': 'Director of Finance',
      'greenhouse.txt': null,
      'indeed.txt': 'Welder',
      'lever.txt': 'Administrative Business Partner',
      'linkedin.txt': 'RN',
      'phenom.txt': null,
      'python.txt': 'Senior Python Developer',
      'smartrecruiters.txt': 'Housekeeping Associate',
      'terminal.txt': 'Data Engineer',
      'workable.txt': null,
      'workday.txt': 'Senior Applied AI Engineer',
    })
  })

  test('counts as on the resume without its level', () => {
    const checks = checkResumeText('Business Analyst, Acme\n2020 - Present', 'Senior Business Analyst\nWe need a Senior Business Analyst.')
    expect(checks.title).toEqual({ posting: 'Senior Business Analyst', onResume: true })
    expect(checkResumeText('Data Analyst', 'Business Analyst\nJoin us as a Business Analyst.').title?.onResume).toBe(false)
  })

  test('is left out when the first line is a sentence or never comes up again', () => {
    expect(postingTitle('We are hiring a great analyst to join our team.\nRequirements')).toBeNull()
    expect(postingTitle('Skip to main content\nData Analyst\nJoin us as a Data Analyst.')).toBeNull()
  })
})

test('email and phone are found in every fixture resume', () => {
  for (const c of resumes) expect(checkResumeText(c.text, '')).toMatchObject({ email: true, phone: true })
})

describe('contact and title checks outside the fixtures', () => {
  test.each(['07700 900123', '+91 98765 43210', '+49 30 12345678', '0412 345 678', '(02) 9876 5432', '+33 6 12 34 56 78', '(312) 555-0142'])(
    'the phone number %s is found',
    (number) => expect(checkResumeText(`Sam Lee\n${number}\nsam@example.com`, '').phone).toBe(true),
  )

  test('dates and amounts are not read as a phone number', () => {
    expect(checkResumeText('Sam Lee\nB.A., 2013 - 2017\nManaged $1,200,000 for 150,000 users', '').phone).toBe(false)
    expect(checkResumeText('Sam Lee\nAnalyst, Acme\n2020 - 2023\n2017 - 2020\nB.A. 2013 - 2017\n2011 - 2013 A.A.', '').phone).toBe(false)
    expect(checkResumeText('Sam Lee\nZIP 60601 1200 W Main St', '').phone).toBe(false)
  })

  test.each(['About the job', 'Requirements', 'Job description', 'About Acme'])('a posting that starts with "%s" has no title', (first) => {
    expect(postingTitle(`${first}\nWe need an analyst.`)).toBeNull()
  })

  test('a short title only counts as a whole word', () => {
    expect(checkResumeText('Eager to learn and turn feedback into plans', 'RN\nRequirements\n- Active RN license').title?.onResume).toBe(false)
    expect(checkResumeText('RN, Mercy Hospital', 'RN - SAU\nRequirements\n- Active RN license').title?.onResume).toBe(true)
  })
})
