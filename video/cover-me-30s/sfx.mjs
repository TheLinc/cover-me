// UI sound effects synthesized in code, placed on the timeline.
//   node sfx.mjs cues.json out/sfx.wav      cues: [{ "t": 0.5, "type": "click", "gain": 1 }, ...]
// Types: click (button press), tick (typing, toggles), pop (element lands), thump (big moment on a downbeat),
// whoosh (camera move or wipe), chime (success). Keep them quiet under music: mix sits around -6 dB below the score.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const SR = 48000
const cues = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const buf = new Float32Array(Math.ceil((Math.max(...cues.map((c) => c.t)) + 2) * SR))

let s = 42
const noise = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2147483648 - 1
const tone = (f, t) => Math.sin(2 * Math.PI * f * t)
const VOICES = {
  click: [0.05, (t) => tone(1800, t) * Math.exp(-t * 90) * 0.5],
  tick: [0.03, (t) => tone(3200, t) * Math.exp(-t * 160) * 0.25],
  pop: [0.15, (t) => tone(600 + 900 * t, t) * Math.exp(-t * 30) * 0.4],
  thump: [0.5, (t) => tone(90 - 60 * t, t) * Math.exp(-t * 9) * 0.9],
  whoosh: [0.35, (t) => noise() * Math.sin(Math.PI * Math.min(1, t / 0.35)) * 0.25],
  chime: [0.9, (t) => (tone(1047, t) + 0.6 * tone(1568, t) * (t > 0.08)) * Math.exp(-t * 5) * 0.25],
}
for (const c of cues) {
  if (!VOICES[c.type]) throw new Error(`unknown sfx type: ${c.type}`)
  const [len, fn] = VOICES[c.type], start = Math.floor(c.t * SR), gain = c.gain ?? 1
  for (let i = 0; i < len * SR && start + i < buf.length; i++) buf[start + i] += fn(i / SR) * gain
}

const n = buf.length, b = Buffer.alloc(44 + n * 2) // 16-bit mono WAV
b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8)
b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22)
b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
b.write('data', 36); b.writeUInt32LE(n * 2, 40)
for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2)
mkdirSync(dirname(process.argv[3]), { recursive: true })
writeFileSync(process.argv[3], b)
