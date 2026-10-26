import { describe, expect, test } from 'vitest'
import { candidateText, checkAndRewriteLines, groundTailored } from './resume-grounding'

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

  test('still removes an all-caps copy of a plain-word requirement', () => {
    expect(ground('Builds React interfaces. Knows RUBY ON RAILS.').resume.summary).toBe('Builds React interfaces.')
  })

  test('acronyms and inner-caps tokens still match in any case', () => {
    expect(ground('Builds React interfaces. Follows hipaa rules.').resume.summary).toBe('Builds React interfaces.')
    const netsuite = groundTailored({ ...original, summary: 'Builds React interfaces. Syncs orders to netsuite.' }, original, candidateText(original), 'You will use NetSuite daily.')
    expect(netsuite.resume.summary).toBe('Builds React interfaces.')
  })

  test('a word the posting also writes in lowercase is not a requirement, in any case', () => {
    const job = 'Frontend Web Developer\nYou will build web apps in React. Ruby on Rails is a plus.'
    const tailored = { ...original, summary: 'Web developer building React apps. Knows Ruby on Rails.', skills: 'React, Responsive Web Design' }
    const { resume, removed } = groundTailored(tailored, original, candidateText(original), job)
    expect(resume.summary).toBe('Web developer building React apps.')
    expect(resume.skills).toBe('React, Responsive Web Design')
    expect(removed).not.toContain('Web')
  })

  test('an all-caps posting heading does not turn everyday words into acronyms', () => {
    const job = 'SENIOR WEB DEVELOPER\nYou will build React apps.'
    const summary = 'Builds accessible web interfaces in React.'
    expect(groundTailored({ ...original, summary }, original, candidateText(original), job).resume.summary).toBe(summary)
    expect(groundTailored({ ...original, summary: 'Senior Web Developer. Builds React apps.' }, original, candidateText(original), job).resume.summary).toBe('Builds React apps.')
  })
})

describe('checkAndRewriteLines summary', () => {
  // The check flags only the summary; the rewrite reply is the given text.
  const run = (summary: string, rewrite: string | null, input: { summary?: string } = original) => {
    const replies = [JSON.stringify({ flags: [], summary: 'claims leadership' }), JSON.stringify({ rewrites: rewrite === null ? [] : [{ id: 'summary', text: rewrite }] })]
    return checkAndRewriteLines({ ...original, summary }, { ...original, ...input }, posting, async () => replies.shift()!)
  }
  const flagged = 'Led a team of 12 building React portals.'

  test('a usable rewrite replaces the summary', async () => {
    const { resume, repair } = await run(flagged, 'Builds React screens for a portal used by 25k clients.')
    expect(resume.summary).toBe('Builds React screens for a portal used by 25k clients.')
    expect(repair.summary).toBe('rewritten')
  })

  test('an unusable rewrite falls back to the candidate\'s own summary', async () => {
    const { resume, repair } = await run(flagged, 'Led 12 developers building React portals.')
    expect(resume.summary).toBe(original.summary)
    expect(repair).toMatchObject({ summary: 'original', reverted: 1 })
  })

  test('with no original summary, keeps the rewrite\'s sentences that pass the number check', async () => {
    const { resume, repair } = await run(flagged, 'Led 12 developers. Builds React screens for 25k clients.', { summary: '' })
    expect(resume.summary).toBe('Builds React screens for 25k clients.')
    expect(repair.summary).toBe('trimmed')
  })

  test('empties the summary only when no sentence survives', async () => {
    expect((await run(flagged, 'Led 12 developers.', { summary: '' })).repair.summary).toBe('emptied')
    const missing = await run(flagged, null, { summary: '' })
    expect(missing.resume.summary).toBe('')
    expect(missing.repair.summary).toBe('emptied')
  })

  test('a flag on an empty summary changes nothing ("Include summary" off)', async () => {
    for (const summary of ['', ' ']) {
      const { resume, repair } = await run(summary, 'Anything.')
      expect(resume.summary).toBe(summary)
      expect(repair.flagged).toEqual([])
      expect(repair.summary).toBeUndefined()
    }
  })
})
