// Renders stage.html frame by frame into ffmpeg. Needs playwright and ffmpeg on PATH, and the popup captures
// (`pnpm capture`). The film is laid out for 16:9 only.
//   node render.mjs                              full film, 30 fps → out/16x9/silent.mp4
//   node render.mjs --fps 60 --sub 4             final: 60 fps with 4 blended subframes (motion blur)
//   node render.mjs --stills 0.5,2,3.7           PNGs at those seconds → out/16x9/stills/
//   node render.mjs --from 8 --to 12             only that span → out/16x9/span.mp4 (for review)
//   node render.mjs --workers 6                  parallel pages, joined losslessly
import { chromium } from 'playwright'
import { execFileSync, spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

process.chdir(dirname(fileURLToPath(import.meta.url)))
const argv = process.argv.slice(2)
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d }
const FPS = Number(opt('fps', 30)), SUB = Number(opt('sub', 1))
const WORKERS = Number(opt('workers', 4))
const stage = resolve('stage.html')
const out = resolve('out', '16x9')
const [w, h] = [1920, 1080]
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
async function open() {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(pathToFileURL(stage).href)
  await page.evaluate(() => document.fonts.ready)
  if (errors.length) throw new Error(`stage.html threw: ${errors[0]}`)
  // A missing image isn't a script error, so check them: without the captures every popup would render blank.
  const missing = await page.evaluate(() => [...document.images].filter((i) => i.getAttribute('src') && !i.naturalWidth).map((i) => i.getAttribute('src')))
  if (missing.length) throw new Error(`${missing.length} images didn't load (first: ${missing[0]}). Run \`pnpm capture\` first.`)
  return page
}
// The stage fills the viewport at 0,0, so a plain page screenshot is the stage, without a locator's checks per frame.
const shoot = async (page, t) => {
  await page.evaluate((t) => window.seek(t), t)
  return page.screenshot({ type: 'png' })
}

try {
  const first = await open()
  const stills = opt('stills')
  if (stills) {
    mkdirSync(join(out, 'stills'), { recursive: true })
    for (const t of stills.split(',').map(Number)) {
      writeFileSync(join(out, 'stills', `t${t.toFixed(2)}.png`), await shoot(first, t))
    }
    console.log(`stills → ${join(out, 'stills')}`)
  } else {
    const [duration, cuts] = await first.evaluate(() => [window.DURATION, window.CUTS ?? []])
    const from = Number(opt('from', 0)), to = Math.min(Number(opt('to', duration)), duration)
    // A frame's motion-blur subframes stop just before the next hard cut, so no frame blends two pictures.
    const at = (f, k) => {
      // Snapped to the microsecond, so a fractional --from can't put a frame that starts on a cut a hair before it.
      const t0 = Math.round((from + f / FPS) * 1e6) / 1e6, t = t0 + k / (FPS * SUB)
      const cut = cuts.find((c) => c > t0 && c <= t)
      // ...and never past the end, where no scene is shown.
      return Math.min(cut === undefined ? t : cut - 1e-4, duration - 1e-4)
    }
    const frames = Math.round((to - from) * FPS)
    const per = Math.ceil(frames / WORKERS)
    const name = opt('from') || opt('to') ? 'span' : 'silent'
    // Each run's segments go in their own folder, so two renders at once can't overwrite each other's.
    const tmp = mkdtempSync(join(out, 'segs-'))
    const procs = []
    try {
      // tmix averages SUB consecutive subframes; select keeps the last of each group, so groups line up per segment.
      const vf = SUB > 1 ? ['-vf', `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB`] : []
      const segs = await Promise.all(Array.from({ length: Math.ceil(frames / per) }, async (_, s) => {
        const page = s === 0 ? first : await open()
        const file = join(tmp, `seg${s}.mp4`)
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'png', '-i', '-',
          ...vf, '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'inherit', 'inherit'] })
        procs.push(ff)
        // A dead ffmpeg ends this worker with an error instead of crashing Node on the next write.
        ff.stdin.on('error', () => {})
        const done = new Promise((ok, fail) => { ff.on('error', fail); ff.on('close', (c) => (c ? fail(new Error(`ffmpeg exited ${c}`)) : ok())) })
        done.catch(() => {})
        for (let f = s * per; f < Math.min(frames, (s + 1) * per); f++) {
          for (let k = 0; k < SUB; k++) {
            const png = await shoot(page, at(f, k))
            if (!ff.stdin.write(png)) await Promise.race([once(ff.stdin, 'drain'), done])
          }
          if (f % (FPS * 2) === 0) console.log(`worker ${s}: ${(from + f / FPS).toFixed(1)}s`)
        }
        ff.stdin.end()
        await done
        return file
      }))
      writeFileSync(join(tmp, 'segs.txt'), segs.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'))
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'segs.txt'),
        '-c', 'copy', '-movflags', '+faststart', join(out, `${name}.mp4`)])
      console.log(`${frames} frames → ${join(out, `${name}.mp4`)}`)
    } finally {
      // Also after a failure: stop any ffmpeg still writing, then retry while Windows releases its files.
      for (const ff of procs) ff.kill()
      try { rmSync(tmp, { recursive: true, force: true, maxRetries: 10 }) } catch {}
    }
  }
} finally {
  await browser.close()
}
