import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { callFunction, createUser, deleteUser, mockClaude, mockPosthog, type TestUser } from './helpers'

// Only survey events: another file's background count can land after a reset.
const surveyEvents = async () => (await mockPosthog.events()).filter((e) => e.event === 'survey sent')

// Rate-limited per client IP, like site-request: each call claims its own IP
// unless a test shares one on purpose.
let nextIp = 1
const freshIp = () => `198.51.100.${nextIp++ % 250}`
const send = (body: unknown, { ip = freshIp(), token }: { ip?: string; token?: string } = {}) =>
  callFunction('generation-report', typeof body === 'string'
    ? { rawBody: new TextEncoder().encode(body), headers: { 'cf-connecting-ip': ip, 'Content-Type': 'application/json' } }
    : { body, token, headers: { 'cf-connecting-ip': ip } })

const JOB = { title: 'Platform Engineer', company: 'Northwind', description: 'Run our Kubernetes fleet.', site: 'linkedin.com' }

const LETTER = {
  category: 'generic',
  comment: 'Sounds like a template',
  kind: 'letter',
  output: 'Dear Northwind team,\n\nI ran 40 clusters.\n\nSincerely,\n[name]',
  job: JOB,
  mode: 'byok',
  provider: 'openai',
  version: '1.9.0',
  contact: false,
}

const RESUME = {
  ...LETTER,
  category: 'invented',
  comment: '',
  kind: 'resume',
  mode: 'hosted',
  provider: 'claude',
  output: {
    summary: 'Platform engineer.',
    experience: [{ title: 'SRE', company: 'Acme', location: '', dates: '2019 - 2024', bullets: ['Ran 40 clusters'] }],
    education: [],
    atsScore: 72,
    atsGaps: ['Terraform'],
    editedAt: '2026-11-17T10:00:00Z',
  },
  sourceResume: '[name]\nSRE, Acme, 2019 - 2024\nRan 40 clusters',
}

describe('generation-report', () => {
  let user: TestUser | undefined
  beforeEach(() => mockClaude.reset())
  afterEach(async () => { await deleteUser(user); user = undefined })

  it('records a letter report as a survey response, without an account', async () => {
    expect((await send(LETTER)).status).toBe(200)
    const [event] = await surveyEvents()
    expect(event.distinct_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(event.properties).toEqual({
      $survey_id: 'survey_generation_mock',
      $survey_response: 'The wording sounded generic or not like me',
      $survey_response_1: 'Sounds like a template',
      $survey_response_2: 'Cover letter',
      $survey_completed: true,
      output: LETTER.output,
      job_title: 'Platform Engineer',
      company: 'Northwind',
      description: 'Run our Kubernetes fleet.',
      site: 'linkedin.com',
      mode: 'byok',
      provider: 'openai',
      version: '1.9.0',
      $process_person_profile: false,
      $geoip_disable: true,
    })
  })

  it("records a resume report with its score, gaps, edited mark and the original resume, and drops contact fields that slipped through", async () => {
    const output = { ...RESUME.output, name: 'Jane Doe', email: 'jane@example.com', phone: '416 555 0199', website: 'jane.dev', links: ['jane.dev'], location: 'Toronto' }
    expect((await send({ ...RESUME, output })).status).toBe(200)
    const [event] = await surveyEvents()
    expect(event.properties).toMatchObject({
      $survey_response: "It added things that aren't true",
      $survey_response_1: '',
      $survey_response_2: 'Tailored resume',
      output: RESUME.output,
      ats_score: 72,
      ats_gaps: ['Terraform'],
      edited: true,
      source_resume: RESUME.sourceResume,
      mode: 'hosted',
    })
    expect(JSON.stringify(event.properties)).not.toMatch(/Jane Doe|jane@example\.com|416 555 0199|Toronto/)
  })

  it('adds the account ID only when the report says "You can email me" and carries a valid token', async () => {
    user = await createUser()
    await send({ ...LETTER, mode: 'hosted', contact: true }, { token: user.token })
    await send({ ...LETTER, mode: 'hosted', contact: false }, { token: user.token })
    await send({ ...LETTER, mode: 'hosted', contact: true })
    const [withContact, withoutTick, withoutToken] = await surveyEvents()
    expect(withContact.properties.account_id).toBe(user.id)
    expect(withContact.distinct_id).not.toBe(user.id)
    expect(withoutTick.properties).not.toHaveProperty('account_id')
    expect(withoutToken.properties).not.toHaveProperty('account_id')
  })

  it('refuses "You can email me" with a bad token and sends nothing', async () => {
    expect((await send({ ...LETTER, mode: 'hosted', contact: true }, { token: 'not-a-token' })).status).toBe(401)
    expect(await surveyEvents()).toEqual([])
  })

  it.each([
    ["a body that isn't JSON", '{"kind": "letter",'],
    ['an unknown category', { ...LETTER, category: 'bad' }],
    ['"Other" without a comment', { ...LETTER, category: 'other', comment: '  ' }],
    ['a comment over 500 characters', { ...LETTER, comment: 'x'.repeat(501) }],
    ['an unknown kind', { ...LETTER, kind: 'answer' }],
    ['a letter that is not text', { ...LETTER, output: { text: 'hi' } }],
    ['an empty letter', { ...LETTER, output: '' }],
    ['a resume that is not an object', { ...RESUME, output: 'resume' }],
    ['a site with a path', { ...LETTER, job: { ...JOB, site: 'linkedin.com/jobs' } }],
    ['a description over 15,000 characters', { ...LETTER, job: { ...JOB, description: 'x'.repeat(15_001) } }],
    ['an unknown mode', { ...LETTER, mode: 'free' }],
    ['an unknown provider', { ...LETTER, provider: 'gemini' }],
    ['a malformed version', { ...LETTER, version: '1.9; drop' }],
    ['an original resume with another category', { ...LETTER, sourceResume: 'text' }],
  ])('rejects %s with 400 and sends nothing', async (_, body) => {
    expect((await send(body)).status).toBe(400)
    expect(await surveyEvents()).toEqual([])
  })

  it('accepts a pasted posting with no site', async () => {
    expect((await send({ ...LETTER, job: { ...JOB, site: '' } })).status).toBe(200)
  })

  it('stops reading a body over 320 KB', async () => {
    expect((await send({ ...LETTER, pad: 'x'.repeat(330_000) })).status).toBe(413)
  })

  it('limits each IP to 5 reports a minute', async () => {
    // Clear of a minute boundary, so the six calls share one window.
    const left = 60_000 - (Date.now() % 60_000)
    if (left < 10_000) await new Promise((r) => setTimeout(r, left + 500))
    const ip = '203.0.113.80'
    for (let i = 0; i < 5; i++) expect((await send(LETTER, { ip })).status).toBe(200)
    expect((await send(LETTER, { ip })).status).toBe(429)
    expect((await send(LETTER, { ip: '203.0.113.81' })).status).toBe(200)
  })
})
