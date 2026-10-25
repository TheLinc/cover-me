import { describe, expect, test } from 'vitest'
import { candidateText, groundTailored } from './resume-grounding'

// Made-up posting and resume. The resume never says "web", "Ruby", "Rails" or "HIPAA".
const posting = `Frontend Web Developer
We build patient tools for Personal Health teams. You will ship Web features with React.
Experience with Ruby on Rails and HIPAA is a plus.`

const original = {
  summary: 'Full stack developer who ships React and TypeScript interfaces.',
  experience: [{ title: 'Developer', company: 'Acme Clinic Portal', bullets: ['Built React screens for a client portal used by 25k clients.'] }],
  skills: 'React, TypeScript',
}

const ground = (summary: string, bullet = original.experience[0].bullets[0], skills = original.skills) =>
  groundTailored({ ...original, summary, experience: [{ ...original.experience[0], bullets: [bullet] }], skills }, original, candidateText(original), posting)

describe('groundTailored', () => {
  test('keeps summary sentences that use an everyday word the posting capitalizes', () => {
    const summary = 'Full stack developer building accessible web interfaces in React and TypeScript. Turns designs into production web UI.'
    expect(ground(summary).resume.summary).toBe(summary)
  })

  test('keeps bullets and skills that use the everyday word in lowercase', () => {
    const bullet = 'Built responsive web screens in React for a client portal used by 25k clients.'
    const { resume } = ground(original.summary, bullet, 'React, TypeScript, web accessibility')
    expect(resume.experience[0].bullets).toEqual([bullet])
    expect(resume.skills).toBe('React, TypeScript, web accessibility')
  })

  test('still removes a summary sentence that copies a requirement the resume lacks', () => {
    const { resume, removed } = ground('Full stack developer building React interfaces. Experienced with Ruby on Rails backends.')
    expect(resume.summary).toBe('Full stack developer building React interfaces.')
    expect(removed).toEqual(expect.arrayContaining(['Ruby', 'Rails']))
  })

  test('still removes a capitalized copy of the everyday word', () => {
    expect(ground('Senior Web Developer. Ships React interfaces.').resume.summary).toBe('Ships React interfaces.')
  })

  test('acronyms still match in any case', () => {
    expect(ground('Builds React interfaces. Follows hipaa rules.').resume.summary).toBe('Builds React interfaces.')
  })
})
