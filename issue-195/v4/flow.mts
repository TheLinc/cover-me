// Proof for #195: the "can't read this site" card, Request this site, then (after) the
// "Email me when it's supported" box, its site_watch row, the PostHog response,
// and notify-site. Usage: tsx flow.mts <before|after> <extension dist> <out dir>
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { launchExtension, seedHostedSession, showUnreadSite } from '../scripts/e2e.ts'

const [label, dist, out] = process.argv.slice(2)
const { API, SECRET, PUBLISHABLE, MOCK } = process.env as Record<string, string>
const HOST = 'jobs.example-board.com'
const log: string[] = []
const note = (s: string) => { console.log(s); log.push(s) }
const check = (ok: boolean, what: string) => { note(`${ok ? 'PASS' : 'FAIL'} ${what}`); if (!ok) process.exitCode = 1 }

const admin = { apikey: SECRET, 'Content-Type': 'application/json' }
const email = `proof-${label}-${Date.now()}@example.test`
const created = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: { ...admin, Authorization: `Bearer ${SECRET}` }, body: JSON.stringify({ email, password: 'password123', email_confirm: true }) })).json()
const session = await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: PUBLISHABLE, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password123' }) })).json()
const rows = async () => (await fetch(`${API}/rest/v1/site_watch?host=eq.${HOST}&select=host,user_id`, { headers: admin })).json()
await fetch(`${API}/rest/v1/site_watch?host=eq.${HOST}`, { method: 'DELETE', headers: admin })

const { ctx, popupUrl } = await launchExtension({ dist, headless: true })
try {
  const ip = `198.51.100.${Math.floor(Math.random() * 250)}`
  await ctx.route('**/functions/v1/site-request', (route) => route.continue({ headers: { ...route.request().headers(), 'cf-connecting-ip': ip } }))
  const popup = ctx.pages()[0] ?? await ctx.newPage()
  await popup.goto(popupUrl)
  await seedHostedSession(popup, { access_token: session.access_token, refresh_token: session.refresh_token, expires_at: session.expires_at, user: { id: session.user.id, email: session.user.email } }, 'Sam Example. Software Engineer at Initech, 2019-2024.')
  await showUnreadSite(popup, HOST)
  const card = popup.locator('.scrape-failure-card')
  await card.waitFor({ timeout: 10_000 }).catch(async (e) => { await popup.screenshot({ path: join(out, label + '-debug.png') }); throw e })
  const box = popup.getByRole('checkbox', { name: /^Email me .* when it's supported$/ })
  if (label === 'after') {
    check(await box.isVisible() && !(await box.isChecked()), 'after: the box shows between the site field and Request this site, unticked')
    const visible = await popup.locator('.site-watch').evaluate((el) => {
      const copy = el.cloneNode(true) as HTMLElement
      copy.querySelectorAll('.sr-only').forEach((n) => n.remove())
      return copy.textContent!.replace(/\s+/g, ' ').trim()
    })
    check(visible === "Email me when it's supported", `after: the visible label is just "${visible}"`)
    check(await popup.locator('.site-watch-me').getAttribute('title') === email, 'after: "me" shows the account email on hover')
    check(await popup.getByRole('checkbox', { name: `Email me (${email}) when it's supported` }).count() === 1, 'after: screen readers hear the address in the box name')
    await box.check()
    check(JSON.stringify(await rows()) === '[]', 'after: ticking before pressing Request saves nothing yet')
  } else {
    check(await box.count() === 0, 'before: no "Email me" box')
  }
  await card.screenshot({ path: join(out, `${label}-1-card.png`) })

  await popup.getByRole('button', { name: 'Request this site' }).click()
  await popup.getByText(`Thanks, we've noted ${HOST}.`).waitFor()
  await popup.waitForTimeout(800)
  await card.screenshot({ path: join(out, `${label}-2-thanks.png`) })

  if (label === 'before') {
    check(await box.count() === 0, 'before: still no box after the request')
  } else {
    const r = await rows()
    note(`site_watch rows after Request: ${JSON.stringify(r)}`)
    check(r.length === 1 && r[0].user_id === created.id, 'after: pressing Request with the box ticked creates exactly one site_watch row')
    check(await box.isChecked(), 'after: the box stays ticked under the thanks line')
    await box.uncheck(); await popup.waitForFunction(() => !document.querySelector<HTMLInputElement>('.site-watch input')?.disabled)
    await card.screenshot({ path: join(out, `${label}-3-unticked.png`) })
    check(JSON.stringify(await rows()) === '[]', 'after: unticking under the thanks line deletes it')
    await box.check(); await popup.waitForFunction(() => !document.querySelector<HTMLInputElement>('.site-watch input')?.disabled)
    check((await rows()).length === 1, 'after: ticking again there saves one row again')
  }

  const events = (await (await fetch(`${MOCK}/__mock/posthog`)).json()).filter((e: { properties: Record<string, unknown> }) => e.properties.$survey_response_1 === HOST)
  const mine = events.at(-1)
  note(`PostHog survey response: ${JSON.stringify(mine)}`)
  check(!!mine && /^[0-9a-f-]{36}$/.test(mine.distinct_id) && mine.distinct_id !== created.id, `${label}: the survey response has a random distinct_id`)
  check(!!mine && !JSON.stringify(mine).includes(created.id) && !JSON.stringify(mine).includes(email), `${label}: and no account ID or email`)

  if (label === 'after') {
    const second = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: { ...admin, Authorization: `Bearer ${SECRET}` }, body: JSON.stringify({ email: `proof-second-${Date.now()}@example.test`, password: 'password123', email_confirm: true }) })).json()
    await fetch(`${API}/rest/v1/site_watch`, { method: 'POST', headers: admin, body: JSON.stringify({ host: HOST, user_id: second.id }) })
    note(`rows before notify: ${(await rows()).length}`)
    const outText = execFileSync(process.execPath, ['F:/worktrees/cover-me/t3-dc972783-3e9af868d984a1e0/backend/scripts/notify-site.mjs', `https://www.${HOST}/jobs/1`], { cwd: 'F:/worktrees/cover-me/t3-dc972783-3e9af868d984a1e0/backend', encoding: 'utf8' })
    note(`$ pnpm notify-site https://www.${HOST}/jobs/1\n${outText.trim()}`)
    const mails = (await (await fetch(`${MOCK}/__mock/emails`)).json()).filter((m: { body: { to: string[] } }) => m.body.to.includes(email) || m.body.to.includes(second.email))
    check(mails.length === 2, 'notify sends one email per row (2 rows, 2 emails)')
    note(`email: To ${mails[0].body.to} | Reply-To ${mails[0].body.reply_to} | Subject: ${mails[0].body.subject}\n${mails[0].body.text}`)
    check(JSON.stringify(await rows()) === '[]', 'notify leaves no rows for that host')
    await fetch(`${API}/auth/v1/admin/users/${second.id}`, { method: 'DELETE', headers: { ...admin, Authorization: `Bearer ${SECRET}` } })
  }
} finally {
  await ctx.close()
  await fetch(`${API}/auth/v1/admin/users/${created.id}`, { method: 'DELETE', headers: { ...admin, Authorization: `Bearer ${SECRET}` } })
  writeFileSync(join(out, `${label}-log.txt`), log.join('\n') + '\n')
}
