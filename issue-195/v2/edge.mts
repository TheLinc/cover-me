// Proof for #195, the edges: an unticked request saves nothing; a site requested earlier can
// still be ticked under the thanks line; the email request failing after the site request,
// and an untick failing. Usage: tsx edge.mts <out dir>
import { join } from 'node:path'
import { launchExtension, seedHostedSession, showUnreadSite } from '../scripts/e2e.ts'

const { API, SECRET, PUBLISHABLE } = process.env as Record<string, string>
const out = process.argv[2]
const admin = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' }
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`); if (!ok) process.exitCode = 1 }
const rows = async (host: string) => (await (await fetch(`${API}/rest/v1/site_watch?host=eq.${host}&select=user_id`, { headers: admin })).json()).length

const email = `proof-edge-${Date.now()}@example.test`
const user = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: admin, body: JSON.stringify({ email, password: 'password123', email_confirm: true }) })).json()
const s = await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: PUBLISHABLE, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password123' }) })).json()
const { ctx, popupUrl } = await launchExtension({ dist: 'dist', headless: true })
try {
  let failWatch = false
  await ctx.route('**/functions/v1/site-request', (route) =>
    failWatch && JSON.parse(route.request().postData() ?? '{}').kind === 'watch' ? route.fulfill({ status: 500, body: '{}' }) : route.continue())
  const popup = ctx.pages()[0] ?? await ctx.newPage()
  await popup.goto(popupUrl)
  await seedHostedSession(popup, { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, user: { id: s.user.id, email } }, 'Sam Example.')
  const box = popup.getByRole('checkbox', { name: /Email me at/ })

  await showUnreadSite(popup, 'jobs.later-example.com')
  await popup.getByRole('button', { name: 'Request this site' }).click()
  await popup.getByText("Thanks, we've noted jobs.later-example.com.").waitFor()
  await popup.waitForTimeout(1000)
  check(await rows('jobs.later-example.com') === 0, 'Request with the box unticked creates no row')
  await showUnreadSite(popup, 'jobs.later-example.com')
  await popup.getByText("Thanks, we've noted jobs.later-example.com.").waitFor()
  check(await box.isVisible() && !(await box.isChecked()), 'reopened on a site requested earlier: thanks line with the box, unticked')
  await box.check(); await popup.waitForTimeout(1500)
  check(await rows('jobs.later-example.com') === 1, 'ticking it there saves one row')
  await popup.locator('.scrape-failure-card').screenshot({ path: join(out, 'after-5-requested-earlier.png') })

  failWatch = true
  await box.uncheck(); await popup.waitForTimeout(1000)
  const untickAlert = await popup.getByRole('alert').textContent()
  check(await box.isChecked() && untickAlert === "Couldn't save that. Try again in a moment.", `a failed untick leaves the box ticked: "${untickAlert}"`)
  check(await rows('jobs.later-example.com') === 1, 'and the row stays')

  await showUnreadSite(popup, 'jobs.fail-example.com')
  await box.check()
  await popup.getByRole('button', { name: 'Request this site' }).click()
  await popup.getByText("Thanks, we've noted jobs.fail-example.com.").waitFor()
  const alert = await popup.getByRole('alert').textContent()
  check(!(await box.isChecked()) && alert === "Couldn't save the email request. Tick the box to try again.", `request sent, email request failed: thanks line, box unticked, "${alert}"`)
  check(await rows('jobs.fail-example.com') === 0, 'and no row')
  await popup.locator('.scrape-failure-card').screenshot({ path: join(out, 'after-4-watch-failed.png') })
} finally {
  await ctx.close()
  await fetch(`${API}/auth/v1/admin/users/${user.id}`, { method: 'DELETE', headers: admin })
}
