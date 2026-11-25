import { writeFileSync } from 'node:fs'
import { afterAll, expect, it } from 'vitest'
import { callFunction, createUser, deleteUser, JOB, mockPosthog, RESUME_TEXT, type TestUser, waitForParsedResume } from './helpers'

const side = process.env.PROOF_SIDE as 'before' | 'after'
let user: TestUser | undefined
afterAll(async () => { if (user) await deleteUser(user) })

it(`PR 170 proof (${side})`, async () => {
  user = await createUser()
  const log: Array<{ step: string; request: unknown; status: number }> = []
  const call = async (step: string, fn: string, body: Record<string, unknown>) => {
    const res = await callFunction(fn, { token: user!.token, body })
    const json = await res.json()
    log.push({ step, request: { function: fn, ...body, ...(body.previous ? { previous: '<first tailored resume>' } : {}), ...(body.text ? { text: '<resume text>' } : {}) }, status: res.status })
    return json
  }

  await call('1. upload a resume', 'resume', { text: RESUME_TEXT, filename: 'Jane Doe Resume.DOCX' })
  await waitForParsedResume(user.id)
  const first = await call('2. tailor', 'tailor', { job: JOB })
  await call('3. regenerate with added context', 'tailor', { job: JOB, supplemental: 'Led the Kafka migration at Initech', previous: first.resume })

  const mine = async () => (await mockPosthog.events()).filter((e) => e.distinct_id === user!.id)
  let events = await mine()
  for (let i = 0; i < 30 && events.filter((e) => e.event === 'tailor_run').length < 2; i++) events = await new Promise((r) => setTimeout(r, 100)).then(mine)
  await new Promise((r) => setTimeout(r, 1000))
  events = (await mine()).map((e) => ({ ...e, distinct_id: '<test account id>' }))

  writeFileSync(process.env.PROOF_OUT!, JSON.stringify({ side, calls: log, posthog: events }, null, 2))

  const runs = events.filter((e) => e.event === 'tailor_run')
  expect(runs).toHaveLength(2)
  expect(JSON.stringify(events)).not.toMatch(/Kafka|Initech|Jane Doe/)
  if (side === 'after') {
    expect(events.filter((e) => e.event === 'resume_upload').map((e) => e.properties.file_type)).toEqual(['docx'])
    expect(runs.find((e) => e.properties.regenerate === true)?.properties).toMatchObject({ regenerate: true, hasContext: true, tier: 'hosted_free' })
  } else {
    expect(events.some((e) => e.event === 'resume_upload')).toBe(false)
    expect(runs.every((e) => !('regenerate' in e.properties))).toBe(true)
  }
})
