// node proof-firefox.cjs <port> <before|after>
// Runs Brave-on-iOS's two failing reads in WebKit (same error text as iOS) plus a control error,
// and prints the exception values the page sends to Sentry's /monitoring tunnel.
const { webkit } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const [port, label] = process.argv.slice(2)

;(async () => {
  const browser = await webkit.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const sent = []
  await page.route('**/monitoring**', async (route) => {
    const body = route.request().postData() || ''
    for (const line of body.split('\n')) {
      try {
        const item = JSON.parse(line)
        for (const ex of item.exception?.values ?? []) sent.push(`${ex.type}: ${ex.value}`)
      } catch {}
    }
    await route.fulfill({ status: 200, body: '{}' })
  })
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' })
  for (const code of ['__firefox__', 'window.__firefox__.reader', 'window.proofControl.boom']) {
    await page.addScriptTag({ content: code }).catch(() => {})
  }
  await page.waitForTimeout(3000)
  await browser.close()

  console.log(`${label} (localhost:${port}) sent to Sentry:`)
  for (const s of sent) console.log(`  ${s}`)
  const firefox = sent.filter((s) => s.includes('__firefox__')).length
  const control = sent.filter((s) => s.includes('proofControl')).length
  const want = label === 'before' ? firefox === 2 && control === 1 : firefox === 0 && control === 1
  console.log(`  __firefox__ events: ${firefox}, control events: ${control} -> ${want ? 'as expected' : 'UNEXPECTED'}`)
  process.exitCode = want ? 0 : 1
})()
