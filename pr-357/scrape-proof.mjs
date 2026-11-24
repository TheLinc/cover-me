// node scrape-proof.mjs <label> : posts two requests to the local scrape function and prints what came back
import { readFileSync } from 'node:fs'
const [label] = process.argv.slice(2)
const URL_ = 'http://127.0.0.1:55321/functions/v1/scrape'
const KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const fixture = readFileSync(process.argv[3], 'utf8')
const fixtureUrl = fixture.match(/^<!-- (\S+)/)[1]
const deep = '<html><body>' + '<div>'.repeat(254) + 'lorem ipsum dolor '.repeat(190000) + '</div>'.repeat(254) + '</body></html>'
const post = async (name, pages) => {
  const t = performance.now()
  const res = await fetch(URL_, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ pages }) })
  const text = await res.text()
  let body; try { body = JSON.parse(text) } catch { body = text.slice(0, 200) }
  const results = body.results?.map((r) => r.ok ? { ok: true, title: r.job.title, company: r.job.company, descriptionChars: r.job.description.length } : r) ?? body
  console.log(`[${label}] ${name}: HTTP ${res.status} in ${((performance.now() - t) / 1000).toFixed(2)} s`)
  console.log(JSON.stringify(results))
}
await post('made-up posting (Northwind Traders)', [{ url: fixtureUrl, html: fixture }])
await post(`254 nested blocks around 3.4 MB of words (${(deep.length / 1e6).toFixed(2)} MB)`, [{ url: 'https://careers.example.com/jobs/1', html: deep }])
