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
    'I ran 20K-12 tutoring.',
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
