import { describe, expect, test } from 'vitest'
import { lintLetter } from './letter-lint'

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
