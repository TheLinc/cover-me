import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, mockClaude, mockPosthog, type TestUser } from './helpers'

// site-request sends the event before it responds, so there's nothing to wait for (#383).
const surveyEvents = () => mockPosthog.eventsNamed('survey sent', () => true)

// Rate-limited per client IP, like scrape: each call claims its own IP unless
// a test shares one on purpose (#150).
let nextIp = 1
const freshIp = () => `198.51.100.${nextIp++ % 250}`
const send = (body: unknown, ip = freshIp(), token?: string) =>
  callFunction('site-request', typeof body === 'string'
    ? { rawBody: new TextEncoder().encode(body), headers: { 'cf-connecting-ip': ip, 'Content-Type': 'application/json' } }
    : { body, token, headers: { 'cf-connecting-ip': ip } })

const BUG = {
  kind: 'bug',
  url: 'https://www.linkedin.com/jobs/search/?currentJobId=4012345678',
  scraper: 'linkedin',
  error: 'Could not find job details on this LinkedIn page.',
  version: '1.6.0',
}

describe('site-request', () => {
  beforeEach(() => mockClaude.reset())

  it('records a site request as a survey response with the hostname only, without an account', async () => {
    const res = await send({ kind: 'site', host: 'jobs.acme-careers.com' })
    expect(res.status).toBe(200)
    const [event] = await surveyEvents()
    expect(event.event).toBe('survey sent')
    expect(event.distinct_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(event.properties).toEqual({
      $survey_id: 'survey_mock',
      $survey_response: 'Site request',
      $survey_response_1: 'jobs.acme-careers.com',
      $survey_completed: true,
      $process_person_profile: false,
      $geoip_disable: true,
    })
  })

  it('records a bug report with the URL, scraper, error and version', async () => {
    expect((await send(BUG)).status).toBe(200)
    const [event] = await surveyEvents()
    expect(event.properties).toEqual({
      $survey_id: 'survey_mock',
      $survey_response: 'Bug report',
      $survey_response_1: 'www.linkedin.com',
      $survey_response_2: BUG.url,
      $survey_completed: true,
      scraper: 'linkedin',
      error: BUG.error,
      version: '1.6.0',
      $process_person_profile: false,
      $geoip_disable: true,
    })
  })

  it('gives each send its own distinct_id', async () => {
    await send({ kind: 'site', host: 'a.example.com' })
    await send({ kind: 'site', host: 'b.example.com' })
    const [a, b] = await surveyEvents()
    expect(a.distinct_id).not.toBe(b.distinct_id)
  })

  it.each([
    ["a body that isn't JSON", '{"kind": "site",'],
    ['an unknown kind', { kind: 'other', host: 'acme.com' }],
    ['a host with a path', { kind: 'site', host: 'acme.com/jobs' }],
    ['a host with no dot', { kind: 'site', host: 'localhost' }],
    ['a host over 253 characters', { kind: 'site', host: `${'a'.repeat(250)}.com` }],
    ['a non-http URL', { ...BUG, url: 'javascript:alert(1)' }],
    ['a URL over 2,048 characters', { ...BUG, url: `https://acme.com/?q=${'a'.repeat(2048)}` }],
    ['an unknown scraper', { ...BUG, scraper: 'monster' }],
    ['an error over 300 characters', { ...BUG, error: 'x'.repeat(301) }],
    ['a malformed version', { ...BUG, version: '1.6.0; drop' }],
  ])('rejects %s with 400 and sends nothing', async (_, body) => {
    expect((await send(body)).status).toBe(400)
    expect(await surveyEvents()).toEqual([])
  })

  it('stops reading a body over 8 KB', async () => {
    expect((await send({ kind: 'site', host: 'acme.com', pad: 'x'.repeat(9000) })).status).toBe(413)
  })

  it('limits each IP to 5 sends a minute', async () => {
    // Clear of a minute boundary, so the six calls share one window (#150).
    const left = 60_000 - (Date.now() % 60_000)
    if (left < 10_000) await new Promise((r) => setTimeout(r, left + 500))
    const ip = '203.0.113.70'
    for (let i = 0; i < 5; i++) expect((await send({ kind: 'site', host: 'acme.com' }, ip)).status).toBe(200)
    expect((await send({ kind: 'site', host: 'acme.com' }, ip)).status).toBe(429)
    expect((await send({ kind: 'site', host: 'acme.com' }, '203.0.113.71')).status).toBe(200)
  })

  it("doesn't share the scrape function's counter", async () => {
    const ip = '203.0.113.72'
    for (let i = 0; i < 5; i++) await send({ kind: 'site', host: 'acme.com' }, ip)
    const scrape = await callFunction('scrape', {
      body: { pages: [{ url: 'https://example.com/', html: '<html></html>' }] },
      headers: { 'cf-connecting-ip': ip },
    })
    expect(scrape.status).toBe(200)
  })
})

// "Email me when Cover Me reads this site" (#195): signed-in only, stored in
// site_watch, never sent to PostHog.
describe('site-request watch', () => {
  let user: TestUser
  beforeEach(async () => {
    await mockClaude.reset()
    user = await createUser()
  })
  afterEach(() => deleteUser(user))

  const rows = async (host = 'jobs.acme-careers.com') =>
    (await admin.from('site_watch').select('host, user_id').eq('user_id', user.id).eq('host', host)).data

  it('stores one row per tick, however many ticks, and sends nothing to PostHog', async () => {
    for (let i = 0; i < 2; i++) {
      expect((await send({ kind: 'watch', host: 'jobs.acme-careers.com', watch: true }, freshIp(), user.token)).status).toBe(200)
    }
    expect(await rows()).toEqual([{ host: 'jobs.acme-careers.com', user_id: user.id }])
    expect(await surveyEvents()).toEqual([])
  })

  it('deletes the row when the box is unticked', async () => {
    await send({ kind: 'watch', host: 'jobs.acme-careers.com', watch: true }, freshIp(), user.token)
    expect((await send({ kind: 'watch', host: 'jobs.acme-careers.com', watch: false }, freshIp(), user.token)).status).toBe(200)
    expect(await rows()).toEqual([])
  })

  it('leaves the site request it follows under a random ID', async () => {
    await send({ kind: 'site', host: 'jobs.acme-careers.com' }, freshIp(), user.token)
    await send({ kind: 'watch', host: 'jobs.acme-careers.com', watch: true }, freshIp(), user.token)
    const events = await surveyEvents()
    expect(events).toHaveLength(1)
    expect(events[0].distinct_id).not.toBe(user.id)
    expect(JSON.stringify(events[0])).not.toContain(user.id)
    expect(JSON.stringify(events[0])).not.toContain(user.email)
  })

  it.each([
    ['without a token', undefined],
    ['with a bad token', 'not-a-token'],
  ])('refuses a watch %s with 401 and stores nothing', async (_, token) => {
    expect((await send({ kind: 'watch', host: 'jobs.acme-careers.com', watch: true }, freshIp(), token)).status).toBe(401)
    expect(await rows()).toEqual([])
  })

  it.each([
    ['a bad host', { kind: 'watch', host: 'acme.com/jobs', watch: true }],
    ['no choice', { kind: 'watch', host: 'acme.com' }],
  ])('rejects a watch with %s with 400', async (_, body) => {
    expect((await send(body, freshIp(), user.token)).status).toBe(400)
  })
})
