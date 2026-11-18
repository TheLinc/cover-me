import fs from 'node:fs'
const dir = new URL('.', import.meta.url)
const readEnv = (p, k) => fs.readFileSync(p, 'utf8').split(/\r?\n/).find((l) => l.startsWith(k + '='))?.slice(k.length + 1).replace(/^["']|["']$/g, '').trim()
const ANTHROPIC = readEnv('F:/personal-projects/cover-me/extension/.env', 'ANTHROPIC_API_KEY')
const OPENAI = readEnv('F:/personal-projects/cover-me/extension/eval/.env', 'OPENAI_API_KEY')
const [posting, resume] = [process.argv[2], new URL('resume.txt', dir)].map((p) => fs.readFileSync(p, 'utf8').trim())
const prompts = JSON.parse(fs.readFileSync(new URL('prompts.json', dir), 'utf8'))
const fill = (p) => p.replace('[PASTE THE JOB POSTING]', posting).replace('[PASTE YOUR RESUME]', resume).replace('[JOB TITLE]', 'Marketing Lead').replace('[EMPLOYER]', 'Brightline')

async function claude(messages) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': ANTHROPIC, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 4000, messages }) })
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j))
  return j.content.filter((c) => c.type === 'text').map((c) => c.text).join('')
}
async function gpt(messages) {
  const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { authorization: `Bearer ${OPENAI}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: 'gpt-6.1-sol', store: false, max_output_tokens: 16000, input: messages }) })
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j))
  return j.output.filter((o) => o.type === 'message').flatMap((o) => o.content).filter((c) => c.type === 'output_text').map((c) => c.text).join('')
}

const runOne = async (name, call, set) => {
  const messages = [], steps = []
  for (const p of prompts[set]) {
    messages.push({ role: 'user', content: fill(p) })
    const t = Date.now(); const out = await call(messages); const secs = (Date.now() - t) / 1000
    messages.push({ role: 'assistant', content: out }); steps.push({ prompt: p, secs, out })
    console.log(name, set, steps.length, secs + 's')
  }
  fs.writeFileSync(new URL(`../out/${set}-${name}.json`, dir), JSON.stringify({ model: name, ran: new Date().toISOString(), steps }, null, 2))
}
fs.mkdirSync(new URL('../out', dir), { recursive: true })
const only = process.argv[3]
await Promise.all(['resume', 'letter'].flatMap((s) => [['claude-sonnet-5-5', claude], ['gpt-6.1-sol', gpt]].filter(([n]) => !only || n === only).map(([n, f]) => runOne(n, f, s))))
