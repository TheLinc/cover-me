// node ev.mjs <tab> <file with JS>  -> runs it via browse eval
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const [tab, file] = process.argv.slice(2)
const out = execFileSync('browse', ['eval', '--json', JSON.stringify({ tab: Number(tab), expression: readFileSync(file, 'utf8'), timeout: 60000 })], { encoding: 'utf8', maxBuffer: 1e8 })
process.stdout.write(out)
