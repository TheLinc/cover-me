import { describe, expect, test } from 'vitest'
import { extractNumbers, lintLetter } from './letter-lint'

const echoes = (sentence: string) =>
  lintLetter(sentence).violations.some((v) => v.startsWith('Restates the job posting'))

describe('posting echo', () => {
  // The two letters that named a missing requirement in the 2026-10-09 full eval
  test.each([
    'What stood out in the Beacon Retail Group posting is that the analysis goes straight to merchandising teams and supports A/B test analysis.',
    'Your posting pairs major gifts stewardship with proposal writing, which tells me the job depends on staying close to donors.',
    "Riverbend's posting asks for a nurse who can carry a full caseload on nights.",
    'The posting for this role asks for someone who owns the close.',
  ])('flags: %s', (s) => expect(echoes(s)).toBe(true))

  test.each([
    'Riverbend needs a nurse who can carry a full caseload on nights without dropping details.',
    'Northlight has the same shape of problem: a React storefront that has outgrown its data layer.',
    'I ran our social posting calendar, which needs a steady weekly rhythm.',
    'I wrote job descriptions that list the skills each opening requires.',
  ])('leaves alone: %s', (s) => expect(echoes(s)).toBe(false))
})

describe('invented numbers', () => {
  const letter = (sentence: string) => `Dear Hiring Manager,\n\n${sentence}\n\nKind regards,\nAlex Doe`
  const invented = (sentence: string, ...numberSources: string[]) =>
    lintLetter(letter(sentence), { numberSources }).violations.filter((v) => v.startsWith('Uses the number'))

  const plates = 'The 240th plate has to look and taste like the 10th.'

  test('flags a hard number found in no source', () => {
    expect(invented(plates, 'Line cook, 6 years.', 'Sous chef wanted.', '')).toHaveLength(1)
  })

  test.each([
    ['the resume', 'Plated 240 covers a night.', '', ''],
    ['the posting', 'Line cook.', 'A 240-seat dining room.', ''],
    ['the supplemental text', 'Line cook.', '', 'I ran a 240-cover banquet.'],
  ])('accepts a hard number from %s', (_, resume, posting, supplemental) => {
    expect(invented(plates, resume, posting, supplemental)).toEqual([])
  })

  test('leaves small numbers alone', () => {
    expect(invented('I have 10 years on the line.', 'Line cook since the start.')).toEqual([])
  })

  test.each([
    ['$1.2 million', 'Cut food costs by $1.2M.'],
    ['40 percent', 'Cut waste 40%.'],
    ['$40K', 'Saved $40,000 a year.'],
    ['$2M-3M', 'Ran budgets from $2M to $3M.'],
  ])('matches %s across formats', (amount, resume) => {
    expect(invented(`I cut costs by ${amount}.`, resume)).toEqual([])
  })

  test('flags money and percentages missing from the sources', () => {
    expect(invented('I cut waste 40 percent and saved $5 million.', 'Line cook.')).toHaveLength(2)
  })

  test.each([
    'I supported 20 K-12 schools.',
    'I closed 15 B2B accounts.',
    'I ran 4 M&A deals.',
  ])('reads a letter after the number as a word, not a K/M/B suffix: %s', (s) => {
    expect(invented(s, 'Supported 20 schools, 15 accounts, 4 deals.')).toEqual([])
  })

  test('counts the company name as a source', () => {
    expect(lintLetter(letter('3M runs 3M plants.'), { companyName: '3M', numberSources: [''] })
      .violations.filter((v) => v.startsWith('Uses the number'))).toEqual([])
  })

  test('is off without numberSources', () => {
    expect(lintLetter(letter(plates)).violations.some((v) => v.startsWith('Uses the number'))).toBe(false)
  })
})

test('extractNumbers leaves a trailing comma out of the number', () => {
  expect(extractNumbers('a staff of 400, all hourly')).toEqual([{ raw: '400', norm: '400', hard: true }])
})

// Sentence shapes the judge flagged in every letter of the 2026-11-11 eval
// run (#198). Each rule has one realistic sentence that must still pass.
describe('templated sentence shapes', () => {
  const letter = (...paragraphs: string[]) => `Dear Hiring Manager,\n\n${paragraphs.join('\n\n')}\n\nKind regards,\nAlex Doe`
  const flagged = (prefix: string, ...paragraphs: string[]) =>
    lintLetter(letter(...paragraphs), { companyName: 'Acme' }).violations.some((v) => v.startsWith(prefix))
  const opener = 'At Halcyon I cut page load from 1.2s to 400ms.'

  test.each([
    'My strongest qualification is simple: I find data problems early.',
    'My strongest qualification for Acme is the onboarding work.',
  ])('announced point: %s', (s) => expect(flagged('Announces', opener, s)).toBe(true))
  test('announced point leaves a plain claim alone', () => {
    expect(flagged('Announces', opener, 'The fix was simple, and it held for two years.')).toBe(false)
  })

  test.each([
    'That is data onboarding in practice.',
    'This is what worker activation looks like in practice.',
  ])('label: %s', (s) => expect(flagged('Labels', opener, s)).toBe(true))
  test.each([
    'I put that plan into practice across three warehouses.',
    'This is my eighth year in practice as a family physician.',
  ])('label leaves alone: %s', (s) => expect(flagged('Labels', opener, s)).toBe(false))

  test.each([
    'Documentation is a habit for me, not an afterthought.',
    'I treat testing as a craft, not a chore!',
    'It was not just a migration but a rebuild of how we shipped.',
  ])('contrast: %s', (s) => expect(flagged('Uses an "X, not Y"', opener, s)).toBe(true))
  test('contrast leaves a mid-sentence factual contrast alone', () => {
    expect(flagged('Uses an "X, not Y"', opener, 'We kept the ledger in Postgres, not a spreadsheet, so the audit took a day.')).toBe(false)
  })

  test.each([
    'Documentation is a habit for me.',
    'Checking the data first is second nature for me.',
  ])('trait claim: %s', (s) => expect(flagged('Tells', opener, s)).toBe(true))
  test('trait claim leaves a habit the team kept alone', () => {
    expect(flagged('Tells', opener, 'Weekly data reviews became a habit the whole team kept.')).toBe(false)
  })

  test('numbers: flags a paragraph stacking five figures', () => {
    const stacked = 'I grew riders from 150 to 1,100 across 3 regions, cut churn 30% and onboarded 12 cities.'
    expect(flagged('Paragraph 2 has 5 figures', opener, stacked)).toBe(true)
  })
  test('numbers: two achievements with a from-to each pass', () => {
    const two = 'I grew riders from 150 to 1,100. Later I cut page load from 1.2s to 400ms.'
    expect(flagged('Paragraph', opener, two)).toBe(false)
  })
  test('numbers: years are dates, not figures', () => {
    expect(flagged('Paragraph', opener, 'From 2019 to 2023 I grew riders from 150 to 1,100 and launched 2 cities.')).toBe(false)
  })

  test.each([
    'Bad data is cheapest to fix before anyone builds a report on it.',
    'Good onboarding is mostly about removing steps.',
  ])('maxim opener: %s', (s) => expect(flagged('Opens with a general maxim', s)).toBe(true))
  test.each([
    'Acme is rebuilding its data pipeline, and that is work I have done twice.',
    'Six years on a med-surg unit taught me to spot a patient sliding before the monitor does.',
    'Your onboarding funnel loses most riders in week one.',
    'The team is hiring one engineer to build its web app from scratch.',
    'At U.S. Bank I rebuilt the reconciliation ledger.',
    'Last year Ferris cut checkout latency by half after the rebuild.',
  ])('maxim opener leaves alone: %s', (s) => expect(flagged('Opens with a general maxim', s)).toBe(false))
  test('maxim opener accepts the employer by its short name', () => {
    const opens = (companyName: string, s: string) =>
      lintLetter(letter(s, opener), { companyName }).violations.some((v) => v.startsWith('Opens with a general maxim'))
    expect(opens('Stackhouse Ventures', 'Stackhouse needs someone who can take a venture from idea to first revenue.')).toBe(false)
    expect(opens('The Acme Corp', 'Acme is hiring a data engineer.')).toBe(false)
    expect(opens('Acme, Inc.', "Acme's warehouse network is growing faster than its hiring.")).toBe(false)
    expect(opens('Stackhouse Ventures', 'Good onboarding is mostly about removing steps.')).toBe(true)
  })

  // The three recaps in the 2026-11-11 run opened with "I bring" (#198).
  test.each([
    'I bring data profiling, SQL and data modeling, plus a habit of writing down what I find. Could we talk this month?',
    'My mix of onboarding work and unit economics fits Acme well. Can we set up a call?',
  ])('closing recap: %s', (close) => expect(flagged('The closing', opener, close)).toBe(true))
  test.each([
    'If it helps, I can walk you through the Halcyon migration, what worked and what I would change. Could we talk next week?',
    'Next week, my manager and I start a pilot. Could we talk before then?',
    'I am free Monday, Tuesday or Thursday, and I can bring the migration plan to a first call.',
    'I would welcome the chance to walk you through my experience with the Ferris migration.',
    'If useful, I can share my background in clinical audits. Could we talk next week?',
  ])('closing recap leaves alone: %s', (close) => expect(flagged('The closing', opener, close)).toBe(false))
})
