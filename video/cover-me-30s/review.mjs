// Review images for the critique loop (craft.md): contact sheet, phone test, and strips around fast actions.
//   node review.mjs [video] [strip times...]   → out/16x9/review/
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const [video = 'out/16x9/silent.mp4', ...strips] = process.argv.slice(2)
const dir = 'out/16x9/review'
mkdirSync(dir, { recursive: true })
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a])
// Contact sheet, split in two halves so each tile stays readable: 2 frames a second, 6 across.
ff('-i', video, '-t', '15', '-vf', 'fps=2,scale=400:-1,tile=6x5:padding=4:color=white', '-frames:v', '1', `${dir}/contact-a.png`)
ff('-ss', '15', '-i', video, '-vf', 'fps=2,scale=400:-1,tile=6x5:padding=4:color=white', '-frames:v', '1', `${dir}/contact-b.png`)
// Phone test: 1 frame a second at 360 px wide.
ff('-i', video, '-vf', 'fps=1,scale=360:-1,tile=6x5:padding=4:color=white', '-frames:v', '1', `${dir}/phone.png`)
// Strips: 12 consecutive frames from each given time.
for (const t of strips) ff('-ss', String(t), '-i', video, '-vf', 'scale=320:-1,tile=6x2:padding=3:color=white', '-frames:v', '1', `${dir}/strip-${t}.png`)
console.log('review →', dir)
