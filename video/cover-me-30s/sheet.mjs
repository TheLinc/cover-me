// Tiles the stills in out/<format>/stills/ (sorted by time) into one contact sheet.
//   node sheet.mjs [format] [cols] [width]   → out/<format>/stills-sheet.png
import { execFileSync } from 'node:child_process'
import { readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [format = '16x9', cols = '4', width = '640'] = process.argv.slice(2)
const dir = resolve('out', format, 'stills')
const files = readdirSync(dir).filter((f) => /^t[\d.]+\.png$/.test(f)).sort((a, b) => parseFloat(a.slice(1)) - parseFloat(b.slice(1)))
const list = join(dir, 'list.txt')
writeFileSync(list, files.map((f) => `file '${join(dir, f).replace(/\\/g, '/')}'\nduration 1`).join('\n'))
const rows = Math.ceil(files.length / Number(cols))
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
  '-vf', `scale=${width}:-1,tile=${cols}x${rows}:padding=6:color=white`, '-frames:v', '1', join(dir, '..', 'stills-sheet.png')])
console.log(files.join(' '))
