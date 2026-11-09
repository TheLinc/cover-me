import { describe, expect, test } from 'vitest'
import { buildLineCheckPrompt, candidateText, checkAndRewriteLines, groundSkills, groundTailored, trustedNotes } from './resume-grounding'

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

// #171: Regenerate starts from the edited version, so what the user typed in
// the editor is theirs, not the model's.
describe('an edited previous version', () => {
  const bullet = 'Built React screens for a client portal on Rails, used by 25k clients.'
  const previous = { ...original, experience: [{ ...original.experience[0], bullets: [bullet] }], skills: 'React, TypeScript, Ruby on Rails', atsGaps: ['HIPAA'], atsGapsBeforeEdits: ['HIPAA', 'Rails'] }
  const tailored = { ...original, experience: [{ ...original.experience[0], bullets: [bullet] }], skills: 'React, TypeScript, Ruby on Rails, HIPAA' }
  const regrounded = (prev: object) => groundTailored(tailored, original, candidateText(original, trustedNotes(undefined, prev)), posting).resume

  test('its posting-only terms survive grounding', () => {
    const resume = regrounded({ ...previous, editedAt: '2026-11-09T00:00:00Z' })
    expect(resume.experience[0].bullets).toEqual([bullet])
    expect(resume.skills).toBe('React, TypeScript, Ruby on Rails')
  })

  test('an unedited one is earlier model output and is reverted as before', () => {
    const resume = regrounded(previous)
    expect(resume.experience[0].bullets).toEqual(original.experience[0].bullets)
    expect(resume.skills).toBe('React, TypeScript')
  })

  test('keeps the note, and the note alone without an edited version', () => {
    expect(trustedNotes('Used Ruby daily.', { ...previous, editedAt: 'x' })).toContain('Used Ruby daily.')
    expect(trustedNotes('Used Ruby daily.', previous)).toBe('Used Ruby daily.')
    expect(trustedNotes(undefined, undefined)).toBeUndefined()
  })

  describe('the line check', () => {
    const intern = { title: 'Intern', company: 'Beta Labs', bullets: ['Fixed bugs in the billing app.'] }
    const twoRoles = { ...original, experience: [original.experience[0], intern] }
    const edited = { ...twoRoles, experience: [{ ...original.experience[0], bullets: [bullet] }, intern], editedAt: 'x' }
    // The check flags the given line; no rewrite comes back, so a flagged line reverts.
    const check = (out: typeof twoRoles, id: string, prev?: object, notes?: string) => {
      const replies = [JSON.stringify({ flags: [{ id, reason: 'adds Rails' }], summary: null }), '{}']
      return checkAndRewriteLines(out, twoRoles, posting, async () => replies.shift()!, notes, prev)
    }

    test('keeps a line the user typed on the same role', async () => {
      const out = { ...twoRoles, experience: [{ ...original.experience[0], bullets: [bullet] }, intern] }
      const { resume, repair } = await check(out, 'e0b0', edited)
      expect(resume.experience[0].bullets).toEqual([bullet])
      expect(repair.flagged).toEqual([])
      // Unedited, it is checked as before.
      expect((await check(out, 'e0b0', { ...edited, editedAt: undefined })).resume.experience[0].bullets).toEqual(original.experience[0].bullets)
    })

    test('still checks it on another role, and a line copied from a note', async () => {
      const moved = { ...twoRoles, experience: [original.experience[0], { ...intern, bullets: [bullet] }] }
      expect((await check(moved, 'e1b0', edited)).resume.experience[1].bullets).toEqual(intern.bullets)
      expect((await check(moved, 'e1b0', undefined, bullet)).resume.experience[1].bullets).toEqual(intern.bullets)
    })
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

  test('a rewrite citing a number from a project bullet is used (#62)', async () => {
    const projects = [{ name: 'Class Scheduler', bullets: ['Built a scheduling app used by 300 students.'] }]
    const replies = [JSON.stringify({ flags: [], summary: 'claims leadership' }), JSON.stringify({ rewrites: [{ id: 'summary', text: 'Builds React apps, including a scheduler used by 300 students.' }] })]
    const prompts: string[] = []
    const { resume, repair } = await checkAndRewriteLines({ ...original, projects, summary: flagged }, { ...original, projects }, posting, async (p) => (prompts.push(p), replies.shift()!))
    expect(prompts[1]).toContain('Class Scheduler: Built a scheduling app used by 300 students.')
    expect(resume.summary).toBe('Builds React apps, including a scheduler used by 300 students.')
    expect(repair.summary).toBe('rewritten')
  })

  // The model copies the reply example's id; a fixed "e0b2" there emptied every flagged summary.
  test('the rewrite prompt\'s reply example uses a flagged id', async () => {
    const prompts: string[] = []
    const replies = [JSON.stringify({ flags: [], summary: 'claims leadership' }), '{}']
    await checkAndRewriteLines({ ...original, summary: flagged }, original, posting, async (p) => (prompts.push(p), replies.shift()!))
    expect(prompts[1]).toContain('{"rewrites": [{"id": "summary"')
    expect(prompts[1]).not.toContain('e0b2')
  })

  // Without the notes the checker flagged context-backed lines ("uses GitHub Actions") as invented.
  test('the check prompt carries the candidate\'s supplemental context', async () => {
    const prompts: string[] = []
    await checkAndRewriteLines({ ...original, summary: flagged }, original, posting, async (p) => (prompts.push(p), '{"flags": [], "summary": null}'), 'Cover Me uses GitHub Actions for CI/CD.')
    expect(prompts[0]).toContain('CANDIDATE NOTES')
    expect(prompts[0]).toContain('Cover Me uses GitHub Actions for CI/CD.')
    // Blank notes leave the prompt exactly as it was before notes existed.
    expect(buildLineCheckPrompt(original, original, '  ')).toBe(buildLineCheckPrompt(original, original))
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

describe('groundSkills with sections outside the six', () => {
  test('a skill backed only by a line in otherSections survives', async () => {
    const parsed = {
      experience: [{ title: 'Research Associate', bullets: ['Ran qPCR assays'] }],
      skills: 'qPCR',
      otherSections: [{ heading: 'PUBLICATIONS', lines: ['Adeyemi S. "Single-cell RNA-seq of lung tumours." J Cell Biol. 2023.'] }],
    }
    const { skills, dropped } = await groundSkills([{ skill: 'qPCR' }, { skill: 'Single-cell RNA-seq' }], candidateText(parsed))
    expect(skills).toBe('qPCR, Single-cell RNA-seq')
    expect(dropped).toEqual([])
  })
})
