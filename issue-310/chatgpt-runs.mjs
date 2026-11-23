import { createRequire } from 'node:module'
import { writeFileSync, existsSync, readFileSync } from 'node:fs'

const { chromium } = createRequire('F:/scratch/ai-visibility/package.json')('playwright')
const OUT = new URL('./results.json', import.meta.url)

const RESUME = `Alex Rivera
Marketing Lead
Denver, CO

PROFILE
Marketing lead with seven years in B2B demand generation. Plans campaigns across email, social and search, manages budgets over $1M, and reports results in Google Analytics.

EXPERIENCE
Marketing Lead, Brightline (Mar 2021 to Present)
- Led campaign strategy across email and social, growing qualified leads 38% in one year
- Managed a $1.2M paid media budget across four channels and cut cost per lead 22%
- Grew organic traffic 64% with an SEO plan for the blog and product pages
- Ran A/B tests on landing pages that lifted sign-up conversion from 3.1% to 4.4%

Marketing Specialist, Juniper Labs (Jun 2018 to Feb 2021)
- Wrote and scheduled a weekly newsletter for 40,000 subscribers with a 41% open rate
- Built the monthly reporting dashboard in Google Analytics for the sales team
- Coordinated three product launches with design, sales and customer success

EDUCATION
B.S. in Marketing, University of Colorado Boulder (2014 to 2018)

SKILLS
Campaign strategy, SEO, Google Analytics, A/B testing, Paid media, Budget management, Copywriting, Team leadership`

const POSTING = `Marketing Manager, Northwind (Denver, CO)

Northwind makes scheduling software for independent clinics. Our mission is to give small practices back the hours they lose to scheduling.

What you'll do:
- Own our campaign strategy across email and social
- Manage a $1.2M marketing budget
- Report campaign results in Google Analytics

What you bring:
- Strong SEO skills
- Hands-on HubSpot experience
- A record of team leadership
- A/B testing and copywriting are a plus

Pay range: $80,000 to $100,000`

const prompt = (q) =>
  `I'm applying for this job. The application form asks: "${q}" Write my answer for the form box.\n\nMy resume:\n${RESUME}\n\nThe job posting:\n${POSTING}`

const QUESTIONS = ['Why are you interested in this position?', 'Why do you want to work here?']
const RUNS = 5
const jobs = QUESTIONS.flatMap((q) => Array.from({ length: RUNS }, (_, i) => ({ q, run: i + 1 })))

const results = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : []
const browser = await chromium.connectOverCDP('http://127.0.0.1:9334')
const ctx = browser.contexts()[0]

const clean = (t) => t.replace(/Log in for more personalized help[\s\S]*$/i, '').replace(/This might also interest you[\s\S]*$/i, '').trim()

for (const job of jobs) {
  if (results.some((r) => r.q === job.q && r.run === job.run)) continue
  const page = await ctx.newPage()
  try {
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' })
    const box = page.locator('textarea[aria-label="Chat with ChatGPT"], #prompt-textarea').first()
    await box.waitFor({ timeout: 60_000 })
    if (await page.locator('#mobile-auth-dialog').count()) await page.keyboard.press('Escape')
    await box.click()
    await box.fill(prompt(job.q))
    await page.keyboard.press('Enter')
    const done = page.locator('[data-message-role="assistant"][data-message-complete], [data-message-author-role="assistant"]').last()
    await done.waitFor({ timeout: 120_000 })
    await page.waitForTimeout(8000)
    if (await page.locator('#mobile-auth-dialog').count()) await page.keyboard.press('Escape')
    const text = clean(await page.locator('[data-message-role="assistant"], [data-message-author-role="assistant"]').last().innerText())
    results.push({ ...job, at: new Date().toISOString(), text })
    writeFileSync(OUT, JSON.stringify(results, null, 2))
    console.log(`done ${job.q} #${job.run}: ${text.slice(0, 90).replace(/\n/g, ' ')}`)
  } catch (e) {
    console.log(`fail ${job.q} #${job.run}: ${e.message.split('\n')[0]}`)
    await page.screenshot({ path: new URL(`./fail-${results.length}.png`, import.meta.url).pathname.slice(1) }).catch(() => {})
  }
  await page.close()
  await new Promise((r) => setTimeout(r, 65_000))
}
await browser.close().catch(() => {})
console.log(`results: ${results.length}`)
