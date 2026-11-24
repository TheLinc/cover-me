// Proof for #311. Usage: node proof-311.cjs <before|after> <baseUrl> <outDir> <env file>
// Needs the local Supabase stack. Seeds a made-up user (proof-311@example.com).
const { readFileSync } = require('node:fs')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PW || 'playwright')
const [mode, base, out, envFile] = process.argv.slice(2)
const env = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const EMAIL = 'proof-311@example.com', PASSWORD = 'proof-311-pass'
const CODE = 'PROOF311'
const after = mode === 'after'

async function seedUser() {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
  })
  if (!r.ok && r.status !== 422) throw new Error(`seed user: ${r.status} ${await r.text()}`)
}

const logo = (p) => p.locator('header a').first().boundingBox()
const scrollWidth = (p) => p.evaluate(() => document.documentElement.scrollWidth)
// "free week" inside the h1, in its own element with brand-strong (#4F46E5) text
const highlight = (p) => p.locator('h1 span', { hasText: 'free week' }).evaluateAll((els) => els.map((e) => getComputedStyle(e).color))
const badge = (p) => p.locator('main span.rounded-full:has(svg)').count()

async function giftLook(p, label) {
  if (after) {
    assert.deepEqual(await highlight(p), ['rgb(79, 70, 229)'], `${label}: "free week" in brand purple`)
    assert.equal(await badge(p), 1, `${label}: gift badge above the heading`)
  } else {
    assert.deepEqual(await highlight(p), [], `${label}: no highlight before`)
    assert.equal(await badge(p), 0, `${label}: no badge before`)
  }
}

;(async () => {
  await seedUser()
  const b = await chromium.launch()
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } })
    const p = await ctx.newPage()
    await p.goto(base + '/', { waitUntil: 'networkidle' })
    const home = await logo(p)
    for (const path of [`/redeem/${CODE}`, '/uninstalled', '/unsubscribe', '/upgraded']) {
      await p.goto(base + path, { waitUntil: 'networkidle' })
      const box = await logo(p)
      const same = box.x === home.x && box.height === home.height && box.width === home.width
      console.log(`${w}px ${path}: logo x=${box.x} w=${box.width} (home x=${home.x} w=${home.width})`)
      if (after) assert.ok(same, `${path} logo matches / at ${w}px`)
      else if (w === 1440) assert.ok(!same, `${path} logo differs from / at ${w}px on base`)
      if (after) assert.equal(await scrollWidth(p), w, `${path} no horizontal scroll at ${w}px`)
      if (path === '/uninstalled' && w === 1440) await p.screenshot({ path: `${out}/${mode}-1-header-uninstalled-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 96 } })
    }
    await p.goto(base + `/redeem/${CODE}`, { waitUntil: 'networkidle' })
    await giftLook(p, `signed out ${w}px`)
    await p.screenshot({ path: `${out}/${mode}-2-redeem-signed-out-${w}.png` })

    await p.goto(base + `/auth?next=${encodeURIComponent(`/redeem/${CODE}`)}`, { waitUntil: 'networkidle' })
    await p.fill('#email', EMAIL)
    await p.fill('#password', PASSWORD)
    await p.locator('form button[type=submit]').click()
    await p.waitForURL(`**/redeem/${CODE}`, { timeout: 30000 })
    await p.getByRole('button', { name: 'Start my free week' }).waitFor()
    await p.waitForLoadState('networkidle')
    await giftLook(p, `signed in ${w}px`)
    if (after) assert.equal(await scrollWidth(p), w, `signed in no horizontal scroll at ${w}px`)
    await p.screenshot({ path: `${out}/${mode}-3-redeem-signed-in-${w}.png` })
    await ctx.close()
  }
  await b.close()
  console.log(`${mode}: all assertions passed`)
})().catch((e) => { console.error(e); process.exit(1) })
