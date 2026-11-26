// Opens the popup of one build, pastes a job by hand, and screenshots the
// tailoring options with the cutting option's tooltip showing.
// Usage: tsx popup-proof.mts <extension dir> <dist dir> <before|after> <out dir>
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

const [dir, dist, side, out] = process.argv.slice(2)
const { launchExtension, seedOwnKey } = await import(pathToFileURL(join(dir, 'scripts/e2e.ts')).href)
const { ctx, popupUrl } = await launchExtension({ dist, headless: true })
try {
  const popup = await ctx.newPage()
  await popup.goto(popupUrl)
  await seedOwnKey(popup, { provider: 'claude', apiKey: 'sk-ant-proof-not-a-real-key', resumeText: 'Jordan Vale\nBackend Engineer\nSkills: Go, Kafka, PostgreSQL' })
  await popup.getByText("Can't detect the posting? Paste it manually").click()
  await popup.getByPlaceholder('e.g. Senior Software Engineer').fill('Senior Backend Engineer')
  await popup.getByPlaceholder('e.g. Acme Corp (optional)').fill('Northline Logistics')
  await popup.getByPlaceholder('Paste the full job description here…').fill('Build shipment services in Go on Kafka and PostgreSQL.')
  const option = popup.locator('.toggle-row').filter({ has: popup.locator('.tooltip-icon') }).first()
  const label = (await option.locator('label').innerText()).trim()
  const tip = await option.locator('.tooltip-icon').getAttribute('data-tooltip')
  console.log(`[${side}] option label: ${label}`)
  console.log(`[${side}] tooltip: ${tip}`)
  await option.locator('.tooltip-icon').hover()
  await popup.waitForTimeout(400)
  await popup.locator('.tailor-section').scrollIntoViewIfNeeded()
  await popup.screenshot({ path: join(out, `${side}-1-cut-option.png`) })
  const expected = side === 'after' ? "Cut what doesn't fit this job" : 'Remove irrelevant bullets'
  if (label !== expected) throw new Error(`${side}: label is "${label}", expected "${expected}"`)
  if (side === 'after' && !/skills/.test(tip ?? '')) throw new Error('after: tooltip does not mention skills')
} finally {
  await ctx.close()
}
