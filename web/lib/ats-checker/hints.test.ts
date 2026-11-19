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
  ])('%s: %s', (bullet, expected) => expect(hasNumber(bullet)).toBe(expected))
})

describe('the posting title', () => {
  const postings = join(__dirname, 'postings')
  test('is the first line of every saved posting, cut at a comma or dash', () => {
    const titles = Object.fromEntries(readdirSync(postings).map((f) => [f, postingTitle(readFileSync(join(postings, f), 'utf8'))]))
    expect(titles).toMatchObject({
      'lever.txt': 'Administrative Business Partner',
      'linkedin.txt': 'RN',
      'smartrecruiters.txt': 'Housekeeping Associate',
      'workable.txt': 'Senior Open-Source Python Engineer',
      'indeed.txt': 'Welder',
    })
    expect(Object.values(titles).every(Boolean)).toBe(true)
  })

  test('counts as on the resume without its level', () => {
    const checks = checkResumeText('Business Analyst, Acme\n2020 - Present', 'Senior Business Analyst\nAbout the role')
    expect(checks.title).toEqual({ posting: 'Senior Business Analyst', onResume: true })
    expect(checkResumeText('Data Analyst', 'Business Analyst').title?.onResume).toBe(false)
  })

  test('is left out when the first line is a sentence', () => {
    expect(postingTitle('We are hiring a great analyst to join our team.\nRequirements')).toBeNull()
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
  })

  test.each(['About the job', 'Requirements', 'Job description', 'About Acme'])('a posting that starts with "%s" has no title', (first) => {
    expect(postingTitle(`${first}\nWe need an analyst.`)).toBeNull()
  })

  test('a short title only counts as a whole word', () => {
    expect(checkResumeText('Eager to learn and turn feedback into plans', 'RN\nRequirements').title?.onResume).toBe(false)
    expect(checkResumeText('RN, Mercy Hospital', 'RN - SAU\nRequirements').title?.onResume).toBe(true)
  })
})
