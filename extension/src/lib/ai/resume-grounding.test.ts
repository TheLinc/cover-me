import { describe, expect, test } from 'vitest'
import { buildLineCheckPrompt, candidateText, checkAndRewriteLines, groundSkills, groundTailored, buildsOnEdits, keepSeen, matchSkillCase, mixedTenseLines, seenVersion, trustedNotes } from './resume-grounding'

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

  test('a version regenerated from edits is trusted on the next Regenerate too', () => {
    expect(buildsOnEdits({ ...previous, editedAt: 'x' })).toBe(true)
    expect(buildsOnEdits({ ...previous, hasEdits: true })).toBe(true)
    expect(buildsOnEdits(previous)).toBe(false)
    expect(regrounded({ ...previous, hasEdits: true }).experience[0].bullets).toEqual([bullet])
  })

  describe('the line check', () => {
    const intern = { title: 'Intern', company: 'Beta Labs', bullets: ['Fixed bugs in the billing app.'] }
    const twoRoles = { ...original, experience: [original.experience[0], intern] }
    const edited = { ...twoRoles, experience: [{ ...original.experience[0], bullets: [bullet] }, intern], editedAt: 'x' }
    // The check flags the given line; no rewrite comes back, so a flagged line
    // reverts to its original. On Regenerate the originals are the seen version.
    const check = (out: typeof twoRoles, id: string, prev?: object, notes?: string) => {
      const replies = [JSON.stringify({ flags: [{ id, reason: 'adds Rails' }], summary: null }), '{}']
      return checkAndRewriteLines(out, seenVersion(twoRoles, prev), posting, async () => replies.shift()!, notes)
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

    test("a flagged rewording of a bullet the user added reverts to their wording, it isn't dropped", async () => {
      const added = 'Wrote the on-call runbook for the portal.'
      const grown = { ...edited, experience: [{ ...original.experience[0], bullets: [...original.experience[0].bullets, added] }, intern] }
      const out = { ...twoRoles, experience: [{ ...original.experience[0], bullets: [...original.experience[0].bullets, 'Wrote and owned the on-call runbook for the portal.'] }, intern] }
      expect((await check(out, 'e0b1', grown)).resume.experience[0].bullets).toEqual(grown.experience[0].bullets)
    })
  })

  test('seenVersion: the content the user saw, deleted sections included; otherwise the upload', () => {
    const experience = [{ ...original.experience[0], title: 'Lead Developer', bullets: [bullet, 'Added.'] }]
    const { skills: _s, ...noSkills } = previous
    const seen = seenVersion(original, { ...noSkills, summary: 'Mine.', experience, editedAt: 'x', atsScore: 80 })
    expect(seen).toEqual({ ...original, summary: 'Mine.', experience, skills: undefined })
    expect('skills' in seen).toBe(false)
    expect(seenVersion(original, { ...previous, experience: [{ bullets: 'oops' }], hasEdits: true })).toBe(original)
    expect(seenVersion(original, { ...previous, certifications: 'CPR', hasEdits: true })).toBe(original)
    // A different resume uploaded since: its roles no longer line up.
    expect(seenVersion(original, { ...previous, experience: [...previous.experience, ...previous.experience], editedAt: 'x' })).toBe(original)
    expect(seenVersion(original, { ...previous, experience: [], editedAt: 'x' }).experience).toEqual([])
    expect(seenVersion(original, previous)).toBe(original)
  })

  describe('keepSeen', () => {
    const seen = seenVersion(original, { ...previous, summary: 'Mine.', experience: [{ ...original.experience[0], bullets: [bullet] }], editedAt: 'x' })
    const merged = { ...original, summary: 'Model summary.', experience: [{ ...original.experience[0], bullets: ['New one.', 'A bullet they deleted.'] }] }

    test('caps a role at the bullets the user left it with, and keeps their summary when the run has none', () => {
      expect(keepSeen(merged, original, seen).experience[0].bullets).toEqual([bullet])
      expect(keepSeen(merged, original, seen).summary).toBe('Model summary.')
      expect(keepSeen({ ...merged, summary: ' ' }, original, seen).summary).toBe('Mine.')
    })

    test('a summary the user deleted stays deleted; an emptied one is not a deletion', () => {
      const { summary: _s, ...deleted } = seen
      expect('summary' in keepSeen(merged, original, deleted)).toBe(false)
      expect(keepSeen(merged, original, { ...seen, summary: '' }).summary).toBe('Model summary.')
    })

    test('without edits it changes nothing', () => {
      expect(keepSeen(merged, original, original)).toBe(merged)
    })
  })

  test('the line check leaves a summary identical to the original summary alone', async () => {
    const replies = [JSON.stringify({ flags: [], summary: 'claims more' }), '{}']
    const { resume, repair } = await checkAndRewriteLines({ ...original }, original, posting, async () => replies.shift()!)
    expect(resume.summary).toBe(original.summary)
    expect(repair.flagged).toEqual([])
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

// Earlier roles came back with a stray present-tense bullet (#198). A current
// role mixes on purpose: ongoing duties in present tense, finished results in
// past ("Delivered the rollout early"). Pushing those into present tense cost
// faithfulness and readability in the 2026-11-11 full eval.
describe('mixed tense within a role', () => {
  const current = { title: 'Program Lead', company: 'Foundry Labs', dates: 'Jan 2023 – Present', bullets: [
    'Ran diagnostic workshops for 40 founders',
    'Run a 12-week accelerator for early-stage teams',
    'Organize demo days with 300 attendees',
  ] }
  const earlier = { title: 'Analyst', company: 'Northwind', dates: '2019 – 2022', bullets: [
    'Built the weekly pipeline report',
    'Manage the vendor list for 12 suppliers',
    'Led onboarding for new hires',
  ] }

  test('flags the present-tense bullets of an earlier role and leaves the current role alone', () => {
    const flags = mixedTenseLines({ experience: [current, earlier] })
    expect([...flags.keys()]).toEqual(['e1b1'])
    expect(flags.get('e1b1')).toContain('past tense')
  })

  test('flags every present-tense bullet of an earlier role, even when they are most of it', () => {
    const role = { ...earlier, bullets: ['Manage the vendor list', 'Lead onboarding', 'Built the weekly report'] }
    expect([...mixedTenseLines({ experience: [role] }).keys()]).toEqual(['e0b0', 'e0b1'])
  })

  test('leaves an earlier role written wholly in another tense alone', () => {
    expect(mixedTenseLines({ experience: [{ ...earlier, bullets: ['Manage the vendor list', 'Lead onboarding'] }] }).size).toBe(0)
  })

  test('verbs spelled the same in both tenses count as neither', () => {
    const role = { ...earlier, bullets: ['Grew riders from 150 to 1,100', 'Cut onboarding from 9 days to 3', 'Set up 2 new cities'] }
    expect(mixedTenseLines({ experience: [role] }).size).toBe(0)
  })

  test('ignores "Tech:" lines, -ing openers, numbers and roles without dates', () => {
    const odd = { ...earlier, bullets: ['Built the weekly report', 'Tech: SQL, Looker', 'Managing 12 suppliers', '40+ vendor audits a year'] }
    const undated = { title: 'Volunteer', bullets: ['Built a food bank roster', 'Run the Saturday shift'] }
    expect(mixedTenseLines({ experience: [odd, undated] }).size).toBe(0)
  })

  test.each(['Mar 2022 – Till date', 'Mar 2022 –', 'Since 2022', '2022 to date', 'Jan 2023 - Presently'])(
    'a role dated "%s" may be current and is left alone', (dates) => {
      expect(mixedTenseLines({ experience: [{ ...earlier, dates, bullets: ['Built the report', 'Manage 6 people'] }] }).size).toBe(0)
    })

  test('reads past tense after a prefix or a leading adverb, and irregular forms', () => {
    const bullets = ['Built the report', 'Co-led the migration', 'Re-architected the ETL', 'Rewrote the billing service', 'Spun up a team', 'Saw a 30% lift', 'Caught 12 billing errors', 'Successfully migrated 40 clients', 'Manage the vendor list',
      'Was promoted to shift lead', 'Had full P&L for 3 stores', 'Cross-trained 8 cashiers', 'Fine-tuned the forecast model', 'As shift lead, trained 8 cashiers', 'In 2021, launched the loyalty program']
    expect([...mixedTenseLines({ experience: [{ ...earlier, bullets }] }).keys()]).toEqual(['e0b8'])
  })

  test('past forms spelled like the present, and rarer irregulars, are not flagged', () => {
    const bullets = ['Built the report', 'Proofread 40 grant reports', 'Split the team into 2 pods', 'Withstood a 3x traffic spike', 'Outgrew the old CRM', 'Reran the payroll audit']
    expect(mixedTenseLines({ experience: [{ ...earlier, bullets }] }).size).toBe(0)
  })

  test('a claim-flagged line whose source is present tense also gets the tense fix', async () => {
    const prompts: string[] = []
    const orig = { ...earlier, bullets: ['Built the weekly pipeline report', 'Manage a 6-person city operations team', 'Led onboarding for new hires'] }
    const tailored = { experience: [{ ...orig, bullets: [orig.bullets[0], 'Managed a 6-person city operations team across 3 regions', orig.bullets[2]] }] }
    const replies = [JSON.stringify({ flags: [{ id: 'e0b1', reason: 'adds 3 regions' }], summary: null }), '{}']
    await checkAndRewriteLines(tailored, { experience: [orig] }, posting, async (p) => (prompts.push(p), replies.shift()!))
    expect(prompts[1]).toMatch(/\[e0b1\][^\n]*adds 3 regions; also present tense in an earlier role/)
  })

  test('a tense-only line is sent as its own source, so the rewrite keeps its tailoring', async () => {
    const prompts: string[] = []
    const tailoredLine = 'Manage supplier onboarding for 12 vendors'
    const replies = ['{"flags": [], "summary": null}', JSON.stringify({ rewrites: [{ id: 'e0b1', text: 'Managed supplier onboarding for 12 vendors' }] })]
    const tailored = { experience: [{ ...earlier, bullets: [earlier.bullets[0], tailoredLine, earlier.bullets[2]] }] }
    const { resume } = await checkAndRewriteLines(tailored, { experience: [earlier] }, posting, async (p) => (prompts.push(p), replies.shift()!))
    expect(prompts[1]).toContain(`SOURCE LINE (the original this came from; use only its facts): ${tailoredLine}`)
    expect(resume.experience[0].bullets[1]).toBe('Managed supplier onboarding for 12 vendors')
  })

  test('the line check rewrites flagged bullets even when the model flags nothing', async () => {
    const prompts: string[] = []
    const replies = ['{"flags": [], "summary": null}', JSON.stringify({ rewrites: [{ id: 'e0b1', text: 'Managed the vendor list for 12 suppliers' }] })]
    const tailored = { experience: [earlier] }
    const { resume, repair } = await checkAndRewriteLines(tailored, tailored, posting, async (p) => (prompts.push(p), replies.shift()!))
    expect(prompts[1]).toContain('[e0b1]')
    expect(resume.experience[0].bullets).toEqual([earlier.bullets[0], 'Managed the vendor list for 12 suppliers', earlier.bullets[2]])
    expect(repair).toMatchObject({ rewritten: 1, reverted: 0 })
  })

  test('a tense fix that fails keeps the tailored line instead of reverting it', async () => {
    const replies = ['{"flags": [], "summary": null}', '{}']
    const tailored = { experience: [{ ...earlier, bullets: [earlier.bullets[0], 'Manage the vendor list for 12 suppliers in logistics', earlier.bullets[2]] }] }
    const { resume, repair } = await checkAndRewriteLines(tailored, { experience: [earlier] }, posting, async () => replies.shift()!)
    expect(resume.experience[0].bullets[1]).toBe('Manage the vendor list for 12 suppliers in logistics')
    expect(repair.reverted).toBe(0)
  })
})

// Added skills came back "Founder Coaching" beside "Unit economics" (#198).
describe('matchSkillCase', () => {
  const sources = 'Built dashboards in Power BI and wrote SQL. Experience with PowerPoint and GitHub.'

  test('sentence case list: added skills drop their inner capitals', () => {
    expect(matchSkillCase('Founder Coaching, Unit economics, Data Analysis (SQL), Power BI', 'Unit economics, Financial modeling', sources))
      .toBe('Founder coaching, Unit economics, Data analysis (SQL), Power BI')
  })

  test('Title Case list: added skills are title cased, small words stay low', () => {
    expect(matchSkillCase('founder coaching, Monitoring and evaluation, Financial Modeling', 'Financial Modeling, Unit Economics', sources))
      .toBe('Founder Coaching, Monitoring and Evaluation, Financial Modeling')
  })

  test('lowercase list: added skills go lowercase, acronyms and product names stay', () => {
    expect(matchSkillCase('Data Dictionaries, data quality, SQL, Power BI, PowerPoint, GitHub', 'data quality, stakeholder reporting', sources))
      .toBe('data dictionaries, data quality, SQL, Power BI, PowerPoint, GitHub')
  })

  test('product names written that way in the resume or posting, and dotted names, keep their casing', () => {
    const posting = 'Track campaigns in Google Analytics. Our stack is Node.js.'
    expect(matchSkillCase('Google Analytics, Node.js, Web Analytics', 'Unit economics, Financial modeling', posting)).toBe('Google Analytics, Node.js, Web analytics')
  })

  test('multi-word names, lowercase names and names in parentheses keep the casing the posting uses', () => {
    const posting = 'You will build models in dbt and Google Sheets.\nTools:\n- Tableau\n- Salesforce\nPower BI for power users.'
    expect(matchSkillCase('Google Sheets formulas, Microsoft Power BI, dbt models', 'Unit economics, Financial modeling', posting))
      .toBe('Google Sheets formulas, Microsoft Power BI, dbt models')
    expect(matchSkillCase('Data Visualization (Tableau), Salesforce Administration', 'data quality, stakeholder reporting', posting))
      .toBe('data visualization (Tableau), Salesforce administration')
    expect(matchSkillCase('Data modeling (dbt)', 'Financial Modeling, Unit Economics', posting)).toBe('Data Modeling (dbt)')
  })

  test('a resume list split by bars, bullets or lines still sets the style', () => {
    for (const own of ['Excel | Financial modeling | Budgeting | Forecasting', 'Excel • Financial modeling • Budgeting', 'Excel\nFinancial modeling\nBudgeting'])
      expect(matchSkillCase('Variance Analysis, Budget Forecasting', own, sources)).toBe('Variance analysis, Budget forecasting')
  })

  test('a name in the resume\'s own list keeps its casing where the posting uses it as a plain word', () => {
    const posting = 'Built weekly reports in Excel.\nAdvanced Excel skills. You will excel on a team that lives in Slack and Teams, and teams across the office.'
    expect(matchSkillCase('Advanced Excel, Microsoft Excel, Slack and Teams administration', 'Excel, SQL, Teams, Unit economics, Financial modeling', posting))
      .toBe('Advanced Excel, Microsoft Excel, Slack and Teams administration')
  })

  test('accented words are recased as whole words', () => {
    expect(matchSkillCase('Évaluation De Programmes', 'Unit economics, Financial modeling', sources)).toBe('Évaluation de programmes')
    expect(matchSkillCase('équipe management', 'Financial Modeling, Unit Economics', sources)).toBe('Équipe Management')
  })

  test('the resume\'s own items keep their casing, and a list with no style signal is left alone', () => {
    expect(matchSkillCase('Unit Economics, Founder Coaching', 'Unit Economics, financial modeling, SQL', sources)).toBe('Unit Economics, Founder Coaching')
    expect(matchSkillCase('Founder Coaching', undefined, sources)).toBe('Founder Coaching')
    expect(matchSkillCase(undefined, 'Unit economics', sources)).toBeUndefined()
  })
})
