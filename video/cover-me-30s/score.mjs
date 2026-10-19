// A sparse score synthesized in code, on the film's grid: 96 BPM, 12 bars of 2.5 s, D major.
//   node score.mjs out/music.wav
// Bars: D Bm G A | D Bm G A | Bm G A D. The end card sits on A so the CTA click (27.5 s) resolves to D.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const SR = 48000, DUR = 30, N = SR * DUR
const BEAT = 60 / 96, BAR = BEAT * 4, S16 = BEAT / 4
const L = new Float32Array(N), R = new Float32Array(N)
const padBus = [new Float32Array(N), new Float32Array(N)], verbIn = new Float32Array(N), echoIn = new Float32Array(N)
const kickEnv = new Float32Array(N)
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)
let seed = 7
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648 - 1)

const CHORDS = [
  { bass: 38, pad: [54, 57, 61, 64] }, // Dmaj9 (no root in the pad)
  { bass: 35, pad: [54, 57, 61, 62] }, // Bm9
  { bass: 31, pad: [54, 59, 62, 66] }, // Gmaj7
  { bass: 33, pad: [52, 57, 61, 66] }, // A6
]
const PROG = [0, 1, 2, 3, 0, 1, 2, 3, 1, 2, 3, 0]
const chordAt = (t) => CHORDS[PROG[Math.min(11, Math.floor(t / BAR))]]
const bar = (t) => Math.floor(t / BAR) + 1

// ── drums ──
function kick(t0, gain = 1) {
  let ph = 0
  for (let i = 0; i < 0.45 * SR; i++) {
    const t = i / SR, n = Math.floor(t0 * SR) + i
    if (n >= N) break
    const f = 46 + 90 * Math.exp(-t * 32)
    ph += (2 * Math.PI * f) / SR
    const v = Math.sin(ph) * Math.exp(-t * 7.5) * gain * 0.7 + (i < 90 ? noise() * 0.08 * gain * (1 - i / 90) : 0)
    L[n] += v; R[n] += v
    kickEnv[n] = Math.max(kickEnv[n], Math.exp(-t * 6) * gain)
  }
}
function clap(t0, gain = 1) {
  let lp = 0, prev = 0
  for (let i = 0; i < 0.35 * SR; i++) {
    const t = i / SR, n = Math.floor(t0 * SR) + i
    if (n >= N) break
    // three quick bursts, then a short tail; band-limited by a one-pole high-pass and low-pass
    const env = (t < 0.03 ? (Math.floor(t / 0.01) % 1 === 0 ? Math.exp(-((t % 0.01) * 300)) : 0) : 0) + Math.exp(-(t - 0.02) * 22) * (t > 0.02)
    const x = noise(); const hp = x - prev; prev = x
    lp += 0.35 * (hp - lp)
    const v = lp * env * gain * 0.32
    L[n] += v * 0.9; R[n] += v * 1.1; verbIn[n] += v * 0.5
  }
}
function hat(t0, gain = 1, open = false) {
  let prev = 0
  const len = open ? 0.18 : 0.045
  for (let i = 0; i < len * SR; i++) {
    const t = i / SR, n = Math.floor(t0 * SR) + i
    if (n >= N) break
    const x = noise(); const hp = x - prev; prev = x
    const v = hp * Math.exp(-t * (open ? 18 : 90)) * gain * 0.09
    L[n] += v * 1.15; R[n] += v * 0.85
  }
}

// ── bass: sub sine plus a soft second harmonic, follows the root ──
function bassNote(t0, dur, midi, gain = 1) {
  const f = mtof(midi)
  for (let i = 0; i < (dur + 0.08) * SR; i++) {
    const t = i / SR, n = Math.floor(t0 * SR) + i
    if (n >= N) break
    const env = Math.min(1, t / 0.008) * (t < dur ? Math.exp(-t * 1.2) : Math.exp(-dur * 1.2) * Math.exp(-(t - dur) * 60))
    const v = (Math.sin(2 * Math.PI * f * t) + 0.22 * Math.sin(4 * Math.PI * f * t) + 0.06 * Math.sin(6 * Math.PI * f * t)) * env * gain * 0.26
    L[n] += v; R[n] += v
  }
}

// ── pad: detuned saws through a slow one-pole low-pass, per bar ──
function padChord(t0, dur, notes, gain = 1, cutoff = 1400) {
  for (const [vi, m] of notes.entries()) {
    for (const [ch, det] of [[0, -0.07], [1, 0.07]]) {
      const f = mtof(m) * 2 ** (det / 12)
      let lp = 0, ph = (vi * 0.37 + ch * 0.21) % 1
      const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR)
      for (let i = 0; i < (dur + 1.2) * SR; i++) {
        const t = i / SR, n = Math.floor(t0 * SR) + i
        if (n >= N) break
        ph += f / SR; ph -= Math.floor(ph)
        const saw = 2 * ph - 1
        lp += a * (saw - lp)
        const env = Math.min(1, t / 0.35) * (t < dur ? 1 : Math.exp(-(t - dur) * 3.2))
        padBus[ch][n] += lp * env * gain * 0.065
      }
    }
  }
}

// ── pluck: two-operator FM bell, short, into a dotted-eighth echo ──
function pluck(t0, midi, gain = 1) {
  const f = mtof(midi)
  for (let i = 0; i < 0.6 * SR; i++) {
    const t = i / SR, n = Math.floor(t0 * SR) + i
    if (n >= N) break
    const idx = 2.2 * Math.exp(-t * 18)
    const v = Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * 2 * t)) * Math.exp(-t * 7) * Math.min(1, t / 0.002) * gain * 0.19
    const pan = 0.5 + 0.25 * Math.sin(midi * 1.7)
    L[n] += v * (1 - pan) * 1.4; R[n] += v * pan * 1.4
    echoIn[n] += v * 0.55; verbIn[n] += v * 0.35
  }
}

// ── riser: filtered noise swell into a downbeat ──
function riser(t0, t1, gain = 1) {
  let lp = 0
  for (let n = Math.floor(t0 * SR); n < Math.min(N, t1 * SR); n++) {
    const k = (n / SR - t0) / (t1 - t0)
    lp += (0.02 + 0.3 * k * k) * (noise() - lp)
    const v = lp * k * k * gain * 0.25
    L[n] += v; R[n] += v; verbIn[n] += v * 0.4
  }
}

// ── arrangement ──
const ARP = [0, 2, 1, 3, 2, 0, 3, 1]
for (let b = 1; b <= 12; b++) {
  const t0 = (b - 1) * BAR, ch = CHORDS[PROG[b - 1]]
  const last = b === 12
  padChord(t0, last ? 2.6 : BAR, ch.pad, b === 9 ? 1.6 : b === 1 ? 0.8 : last ? 1.3 : 1, b === 9 ? 2200 : 1400)
  // Arp: 16ths, octave up; lighter in the hero bars, eighths and fading in the last bar.
  for (let s = 0; s < 16; s++) {
    const t = t0 + s * S16
    if (last && (s % 2 || s > 10)) continue
    if (b === 9 && s % 2) continue
    const m = ch.pad[ARP[s % 8]] + 12
    const accent = s % 4 === 0 ? 1 : 0.62
    pluck(t, m, (b === 1 ? 1.1 : b === 4 || b === 5 ? 0.75 : last ? 0.9 * (1 - s / 14) : 0.9) * accent)
  }
  if (b >= 2 && !last) {
    // bass: root on 1, the and of 2, and 3; the fifth as a pickup on the and of 4
    const r = ch.bass
    const notes = b === 9 ? [[0, 2.4, r]] : [[0, 0.55, r], [1.5, 0.3, r], [2, 0.5, r], [3.5, 0.3, r + 7]]
    for (const [beat, d, m] of notes) {
      const t = t0 + beat * BEAT
      if (b === 6 && t >= 13.1 && t < 13.75) continue
      bassNote(t, d, m, 1)
    }
  }
  if (last) bassNote(t0, 2.4, ch.bass, 1)
  // drums
  if (b >= 2 && !last) {
    for (const beat of [0, 2]) {
      const t = t0 + beat * BEAT
      if (b === 6 && t >= 13.1 && t < 13.75) continue
      kick(t, beat === 0 ? 1 : 0.85)
    }
    if (b !== 9) kick(t0 + 3.5 * BEAT, 0.45)
  }
  if (last) kick(t0, 1.1)
  if (b >= 3 && !last && b !== 9) {
    clap(t0 + 2 * BEAT, 1)
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * (BEAT / 2)
      if (b === 6 && t >= 13.1 && t < 13.75) continue
      hat(t, e % 2 ? 1 : 0.55, e === 7 && b % 4 === 0)
      if (b === 10) hat(t + BEAT / 4, 0.35)
    }
  }
  if (b === 9) for (let e = 1; e < 8; e += 2) hat(t0 + e * (BEAT / 2), 0.5)
}
riser(1.6, 2.5, 0.9)
riser(24.2, 25.0, 1.0)

// ── effects: echo (dotted eighth), Schroeder reverb, sidechain on pad and bass-free bus ──
const echoD = Math.round(BEAT * 0.75 * SR), echo = new Float32Array(N)
for (let n = 0; n < N; n++) echo[n] = echoIn[n] + (n >= echoD ? 0.32 * echo[n - echoD] : 0)
for (let n = echoD; n < N; n++) { L[n] += echo[n - echoD] * 0.3; if (n >= echoD + 700) R[n] += echo[n - echoD - 700] * 0.3 }
function reverb(x) {
  const out = new Float32Array(N)
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d, buf: new Float32Array(d), i: 0, lp: 0 }))
  const aps = [225, 556].map((d) => ({ d, buf: new Float32Array(d), i: 0 }))
  for (let n = 0; n < N; n++) {
    let s = 0
    for (const c of combs) { const y = c.buf[c.i]; c.lp = y * 0.75 + c.lp * 0.25; c.buf[c.i] = x[n] + c.lp * 0.84; c.i = (c.i + 1) % c.d; s += y }
    s *= 0.25
    for (const a of aps) { const y = a.buf[a.i]; const v = -s * 0.5 + y; a.buf[a.i] = s + y * 0.5; a.i = (a.i + 1) % a.d; s = v }
    out[n] = s
  }
  return out
}
const padMono = new Float32Array(N)
for (let n = 0; n < N; n++) padMono[n] = (padBus[0][n] + padBus[1][n]) * 0.5
for (let n = 0; n < N; n++) verbIn[n] += padMono[n] * 0.5
const verb = reverb(verbIn)
for (let n = 0; n < N; n++) {
  const duck = 1 - 0.45 * kickEnv[n]
  L[n] += padBus[0][n] * duck + verb[n] * 0.55
  R[n] += padBus[1][n] * duck + verb[Math.max(0, n - 311)] * 0.55
}

// ── master: fade the last 0.5 s, soft clip, 16-bit stereo WAV ──
let peak = 0
for (let n = 0; n < N; n++) {
  const t = n / SR, f = t > DUR - 0.5 ? (DUR - t) / 0.5 : 1
  L[n] = Math.tanh(L[n] * 1.2) * f; R[n] = Math.tanh(R[n] * 1.2) * f
  peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]))
}
const g = 0.89 / peak
const b = Buffer.alloc(44 + N * 4)
b.write('RIFF', 0); b.writeUInt32LE(36 + N * 4, 4); b.write('WAVEfmt ', 8)
b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22)
b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34)
b.write('data', 36); b.writeUInt32LE(N * 4, 40)
for (let n = 0; n < N; n++) { b.writeInt16LE(Math.round(L[n] * g * 32767), 44 + n * 4); b.writeInt16LE(Math.round(R[n] * g * 32767), 46 + n * 4) }
const outFile = process.argv[2] ?? 'out/music.wav'
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, b)
console.log('music →', outFile)
