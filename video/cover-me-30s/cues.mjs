// Writes cues.json from the film's timeline: one sound per real action. Keep in step with film.js.
//   node cues.mjs && node sfx.mjs cues.json out/sfx.wav
import { writeFileSync } from 'node:fs'

const BEAT = 60 / 96, E8 = BEAT / 2
const HOOK_LAND = 2 * BEAT
const LANDS = [9.375, 10.625]
const HUB = { lift: 13.125, hit: 13.75, rest: 14.375 }
const PUSH_AT = 15.0, CUT6 = 15.625, CLICK6 = CUT6 + 3 * E8
// The letter: the same text as film.js's LETTER, typed from 17.85 at 0.045 s a word.
// Word and keyword indices are counted from the text, the way film.js splits it.
const LETTER_TEXT = [
  'Your posting asks for someone to own {campaign strategy} across email and social. At Brightline I do exactly that, and I grew qualified leads 38% on a flat spend.',
  'I also manage a $1.2M paid media {budget} across four channels, and the {SEO} program I started lifted organic traffic 64%.',
]
const LETTER = { t0: 17.85, step: 0.045, words: 0, kw: [] }
for (const p of LETTER_TEXT) {
  for (const m of p.matchAll(/\{([^}]+)\}|(\S+)/g)) {
    if (m[1]) LETTER.kw.push(LETTER.words)
    LETTER.words++
  }
}

const c = []
const at = (t, type, gain) => c.push({ t: +t.toFixed(4), type, gain })

// 1 · the word lifts on beat 2 and lands on beat 3; budget lights an eighth later (SEO and HubSpot are out of frame)
at(0.6, 'whoosh', 0.35); at(HOOK_LAND, 'pop', 0.9); at(HOOK_LAND + E8, 'tick', 0.5)
// 2 · pull out, click the icon, popup grows
at(2.5, 'whoosh', 0.4); at(3.75, 'click', 1); at(3.82, 'pop', 0.5)
// 3 · Tailor, then each progress step
at(5.625, 'click', 1)
for (const t of [5.7, 6.25, 6.5625, 6.875, 7.1875]) at(t, 'tick', 0.4)
// 4 · budget and SEO lift and land; the push in to the proof
for (const L of LANDS) { at(L - 0.62, 'whoosh', 0.28); at(L, 'pop', 0.85) }
at(10.75, 'whoosh', 0.25)
// 5 · HubSpot lifts, hits the page, is thrown to rest beside the ring; then the push onto the ring
at(HUB.lift, 'whoosh', 0.35); at(HUB.hit, 'thump', 0.9); at(HUB.rest, 'pop', 0.7); at(PUSH_AT + 0.02, 'whoosh', 0.4)
// Salesforce and SQL pop in beside HubSpot, a sixteenth apart
for (const j of [1, 2]) at(HUB.rest + j * (BEAT / 4), 'pop', 0.45)
// 6 · the cut into the real popup; Download PDF clicked, the ground floods, the page grows, the filename lands
at(CUT6, 'chime', 0.55)
at(CLICK6, 'click', 1); at(CLICK6 + 0.04, 'whoosh', 0.35); at(CLICK6 + 0.5, 'pop', 0.55)
// 7 · the letter types: a soft tick every third word, a pop on each keyword
for (let i = 0; i < LETTER.words; i += 3) at(LETTER.t0 + i * LETTER.step, 'tick', 0.16)
at(20.15, 'whoosh', 0.22) // the push onto paragraph 2
for (const i of LETTER.kw) at(LETTER.t0 + i * LETTER.step, 'pop', 0.45)
// 9 · a tick per board
for (let i = 0; i < 8; i++) at(22.5 + i * E8, 'tick', 0.5)
// 10 · end card lands; the CTA lands
at(25, 'thump', 0.8); at(25.85, 'pop', 0.5)

c.sort((a, b) => a.t - b.t)
writeFileSync('cues.json', JSON.stringify(c).replace(/},/g, '},\n'))
console.log(c.length, 'cues → cues.json; letter', LETTER.words, 'words, keywords at', LETTER.kw.join(', '))
