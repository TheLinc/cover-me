// Stands in for `claude -p` so the eval's line checker runs offline. The electrician role always gets prose back.
import { readFileSync } from 'node:fs'
const labels = JSON.parse(readFileSync(new URL('./labels.json', import.meta.url), 'utf8'))
let prompt = ''
process.stdin.on('data', (d) => (prompt += d))
process.stdin.on('end', () => {
  let result = '{"verdicts":[]}'
  const company = prompt.includes('ORIGINAL:') && Object.keys(labels).find((c) => prompt.includes(c))
  if (company === 'Front Range Electric') result = "Sorry, I can't help with that."
  else if (company) result = JSON.stringify({ flags: labels[company].map((k) => ({ id: `e0b${k}`, reason: 'inflated' })) })
  process.stdout.write(JSON.stringify({ is_error: false, result, total_cost_usd: 0, usage: { input_tokens: 0, output_tokens: 0 } }))
})
