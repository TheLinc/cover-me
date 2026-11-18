// node send.mjs <set> <step>  (1-based); fills placeholders like the API run
import fs from 'node:fs'
import { page } from './cdp.mjs'
const [set, step] = [process.argv[2], Number(process.argv[3])]
const T = 'C:/Users/Lincoln/AppData/Local/Temp/p277'
const prompts = JSON.parse(fs.readFileSync(`${T}/run/prompts.json`, 'utf8'))
const posting = fs.readFileSync(`${T}/posting-clean.txt`, 'utf8').trim()
const resume = fs.readFileSync(`${T}/run/resume.txt`, 'utf8').trim()
const raw = prompts[set][step - 1]
const text = raw.replace('[PASTE THE JOB POSTING]', posting).replace('[PASTE YOUR RESUME]', resume).replace('[JOB TITLE]', 'Marketing Lead').replace('[EMPLOYER]', 'Brightline')
const { browser, p } = await page()
if (step === 1 && !process.env.SAVE_ONLY) { await p.goto('https://chatgpt.com/'); await p.waitForTimeout(5000) }
if (await p.locator('#mobile-auth-dialog[open]').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(1500) }
const box = p.locator('textarea[aria-label="Chat with ChatGPT"], #prompt-textarea').first()
if (!process.env.SAVE_ONLY) { await box.click(); await box.fill(text) }
await p.waitForTimeout(800)
const before = process.env.SAVE_ONLY ? 0 : await p.locator('[data-message-role="assistant"]').count()
const t0 = Date.now()
if (!process.env.SAVE_ONLY) await box.press('Enter')
let last = '', stableSince = Date.now()
while (Date.now() - t0 < 240000) {
  await p.waitForTimeout(1000)
  const msgs = p.locator('[data-message-role="assistant"]')
  const n = await msgs.count()
  if (n <= before) continue
  const cur = await msgs.nth(n - 1).innerText()
  const streaming = (await msgs.nth(n - 1).getAttribute('data-message-complete')) === null
  if (cur !== last) { last = cur; stableSince = Date.now() }
  else if (cur.trim() && !streaming && Date.now() - stableSince > 4000) break
}
last = last.replace(/\s*Log in for more personalized help[\s\S]*$/, '').trim()
const secs = process.env.SAVE_ONLY ? null : (stableSince - t0) / 1000
const html = await p.locator('[data-message-role="assistant"]').last().innerHTML().catch(() => '')
fs.mkdirSync(`${T}/out`, { recursive: true })
const f = `${T}/out/${set}-chatgpt.json`
const d = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { model: 'chatgpt.com, logged out', ran: new Date().toISOString(), url: '', steps: [] }
d.url = p.url()
d.steps[step - 1] = { prompt: raw, secs, out: last, html }
fs.writeFileSync(f, JSON.stringify(d, null, 2))
await p.screenshot({ path: `${T}/gpt/${set}-${step}.png`, fullPage: false })
console.log(set, step, secs + 's', last.length, 'chars', p.url())
await browser.close().catch(() => {})
