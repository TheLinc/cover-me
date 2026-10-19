// Cover Me, 30 s. Contract with render.mjs:
//   window.DURATION  seconds
//   window.seek(t)   paints frame t from nothing but t
//   window.CUTS      every hard change of picture; render.mjs keeps motion-blur subframes from blending across them
// No captions: the kinetic type carries the story. Times sit on a 96 BPM grid: beat 0.625 s, bar 2.5 s.
// All markup set through innerHTML here is written in this file; nothing comes from outside.

window.DURATION = 30

const BEAT = 60 / 96, E8 = BEAT / 2, E16 = BEAT / 4
const C = {
  paper: '#F5F3F2', panel: '#ECEAE7', line: '#E2DFDB', card: '#FFFFFF', letter: '#FBF7EF',
  ink: '#1E1B4B', body: '#2A2A2A', ink2: '#5A534D', subtle: '#6B635D',
  brand: '#6366F1', brandStrong: '#4F46E5', tint: '#EEEEFF', tintInk: '#4338CA', track: '#E7E6F5',
  gap: '#F97316', gapTint: '#FFEDD5', gapInk: '#9A3412', night: '#15132B',
}
const SH = {
  doc: '0 30px 70px -28px rgba(30,27,75,.38), 0 2px 6px rgba(30,27,75,.06)',
  browser: '0 26px 60px -26px rgba(30,27,75,.30), 0 1px 3px rgba(30,27,75,.06)',
  popup: '0 40px 90px -30px rgba(21,19,43,.55), 0 2px 8px rgba(21,19,43,.18)',
  ring: '0 14px 34px -14px rgba(30,27,75,.40), 0 1px 3px rgba(30,27,75,.08)',
  chip: '0 8px 20px -10px rgba(30,27,75,.35)',
}
const POP = 'assets/popup/'
// The logo and the board logos come from the website, the fonts (stage.html) from the extension.
const LOGO = '../../web/public/logo.png'

const stage = $('#stage')
Object.assign(stage.style, { width: W + 'px', height: H + 'px', background: C.paper })

// ── helpers ───────────────────────────────────────────────────────────
const px = (v) => v + 'px'
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3)
function img(src, style, parent) { const e = el('img', style, parent); e.src = src; e.draggable = false; return e }
function cam(e, cx, cy, s) { e.style.transformOrigin = '0 0'; e.style.transform = `translate(${W / 2}px,${H / 2}px) scale(${s}) translate(${-cx}px,${-cy}px)` }
function localXY(e, root) { let x = 0, y = 0; while (e && e !== root) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent } return [x, y] }
function center(e, root) { const [x, y] = localXY(e, root); return [x + e.offsetWidth / 2, y + e.offsetHeight / 2] }
function scene(bg = C.paper) { const s = el('div', { left: 0, top: 0, width: W + 'px', height: H + 'px', background: bg, overflow: 'hidden' }); return s }
function world(parent) { return el('div', { left: 0, top: 0, width: W + 'px', height: H + 'px' }, parent) }

// Posting text from web/components/landing/visuals.tsx EXAMPLE.
const POSTING = [
  ["You'll own our ", { k: 'Campaign strategy', text: 'campaign strategy' }, ' across email and social, manage a $1.2M ', { k: 'Budget', text: 'budget' }, ' and report results in ', { k: 'Google Analytics' }, '.'],
  ['You bring strong ', { k: 'SEO' }, ' skills, hands-on ', { k: 'HubSpot' }, ' experience and a record of ', { k: 'Team leadership', text: 'team leadership' }, '. ', { k: 'Salesforce' }, ', ', { k: 'SQL' }, ', ', { k: 'A/B testing' }, ' and ', { k: 'Copywriting', text: 'copywriting' }, ' are a plus.'],
]
const kwHTML = (k, text) => `<span class="kw" data-k="${k}"><span class="kwbg"></span><span class="kwt">${esc(text)}</span></span>`
const postingHTML = (gap = '0.7em') => POSTING.map((l) => `<p style="margin:0 0 ${gap}">` + l.map((p) => typeof p === 'string' ? esc(p) : kwHTML(p.k, p.text ?? p.k)).join('') + '</p>').join('')
function kws(root) {
  const m = {}
  root.querySelectorAll('.kw').forEach((k) => { m[k.dataset.k] = { k, bg: k.querySelector('.kwbg'), t: k.querySelector('.kwt') } })
  return m
}
function lit(h, s, gap = false) {
  h.bg.style.transform = `scaleX(${clamp(s, 0, 1.15)})`
  h.bg.style.background = gap ? C.gapTint : C.tint
  h.t.style.color = s > 0.35 ? (gap ? C.gapInk : C.tintInk) : ''
}

// Kinetic type: each word rises out of a mask on a heavy spring, leaves upward on a snap.
function kinetic(parent, text, style) {
  const box = el('div', { fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.0, color: C.ink, ...style }, parent)
  const words = text.split(' ').filter((w) => w !== '|').map((w) => {
    const mask = document.createElement('span')
    Object.assign(mask.style, { display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0.04em 0 0.16em', margin: '-0.04em 0.22em -0.16em 0' })
    const inner = document.createElement('span')
    Object.assign(inner.style, { display: 'inline-block' })
    inner.textContent = w
    mask.appendChild(inner)
    return [mask, inner]
  })
  // Place them in order, with a line break where the text has a '|'.
  text.split(' ').reduce((i, w) => { if (w === '|') { box.appendChild(document.createElement('br')); return i } box.appendChild(words[i][0]); return i + 1 }, 0)
  words.forEach((w, i) => { words[i] = w[1] })
  return {
    box,
    draw(t, tIn, tOut, step = E16) {
      words.forEach((w, i) => {
        const s = spring(t - tIn - i * step, [260, 32.2]) // stiff, so a word doesn't drop its last pixel after landing
        const o = spring(t - tOut, SNAP)
        w.style.transform = `translateY(${(1 - s) * 115 - o * 115}%)`
      })
    },
  }
}

// Cursor: white arrow, ink outline. keys [[t, x, y]], each move on a spring along a slight arc.
const cursor = el('div', { left: 0, top: 0, width: 4.2 * u + 'px', height: 4.2 * u + 'px', zIndex: 50, transformOrigin: '18% 10%' }, stage,
  `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M5 2.5 L5 19.5 L9.4 15.4 L12.4 21.6 L15.3 20.3 L12.4 14.2 L18.4 14.2 Z" fill="#fff" stroke="${C.ink}" stroke-width="1.4" stroke-linejoin="round"/></svg>`)
function drawCursor(t, keys, clicks = [], arc = 0.06) {
  let x = keys[0][1], y = keys[0][2]
  for (let i = 1; i < keys.length; i++) {
    const p = spring(t - keys[i][0], [95, 19.5])
    const dx = keys[i][1] - keys[i - 1][1], dy = keys[i][2] - keys[i - 1][2]
    x += dx * p; y += dy * p
    const bend = Math.sin(Math.PI * clamp(p)) * arc
    x += -dy * bend; y += dx * bend
  }
  let press = 1
  for (const c of clicks) if (t >= c - 0.02 && t < c + 0.3) press = Math.min(press, 1 - 0.1 * Math.sin(Math.PI * clamp((t - c + 0.02) / 0.22)))
  show(cursor, true)
  cursor.style.transform = `translate(${x - 0.18 * 4.2 * u}px, ${y - 0.1 * 4.2 * u}px) scale(${press})`
}

// Browser window (BrowserFrame in visuals.tsx).
function makeBrowser(parent, x, y, w, h, url) {
  const root = el('div', { left: px(x), top: px(y), width: px(w), height: px(h), background: C.card, borderRadius: '18px', boxShadow: SH.browser, overflow: 'hidden' }, parent)
  const bar = el('div', { left: 0, top: 0, width: '100%', height: '56px', background: '#F2F0ED' }, root)
  for (let i = 0; i < 3; i++) el('div', { left: px(22 + i * 20), top: '22px', width: '12px', height: '12px', borderRadius: '50%', background: '#E0DCD7' }, bar)
  const urlBox = el('div', { left: '96px', top: '13px', right: '76px', height: '30px', borderRadius: '99px', background: '#fff', color: C.subtle, fontSize: '16px', lineHeight: '30px', padding: '0 16px', whiteSpace: 'nowrap', overflow: 'hidden' }, bar, esc(url))
  const icon = el('div', { right: '16px', top: '9px', width: '38px', height: '38px', borderRadius: '11px', background: '#fff', boxShadow: '0 1px 2px rgba(30,27,75,.14)' }, bar)
  img(LOGO, { left: '6px', top: '6px', width: '26px', height: '26px' }, icon)
  const page = el('div', { left: 0, top: '56px', width: '100%', bottom: 0 }, root)
  return { root, bar, urlBox, icon, page }
}
function postingHeader(page, { letter = 'N', title = 'Marketing Manager', meta = 'Northwind · Denver, CO · Full-time' } = {}) {
  const mark = el('div', { left: '56px', top: '46px', width: '66px', height: '66px', borderRadius: '16px', background: C.ink, color: '#fff', fontSize: '30px', fontWeight: 600, lineHeight: '66px', textAlign: 'center' }, page, letter)
  const tEl = el('div', { left: '144px', top: '44px', fontSize: '34px', fontWeight: 600, color: C.ink, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }, page, esc(title))
  const mEl = el('div', { left: '144px', top: '88px', fontSize: '20px', color: C.ink2, whiteSpace: 'nowrap' }, page, esc(meta))
  return { mark, tEl, mEl }
}

// ATS ring (ScoreRing): white disc, indigo arc, the number in ink.
function makeRing(parent, d, style = {}) {
  const R = 38, L = 2 * Math.PI * R
  const root = el('div', { width: px(d), height: px(d), borderRadius: '50%', background: '#fff', boxShadow: SH.ring, ...style }, parent,
    `<svg width="${d}" height="${d}" viewBox="0 0 100 100" style="position:absolute;left:0;top:0"><circle cx="50" cy="50" r="${R}" fill="none" stroke="${C.track}" stroke-width="7.5"/><circle class="arc" cx="50" cy="50" r="${R}" fill="none" stroke="${C.brand}" stroke-width="7.5" stroke-linecap="round" transform="rotate(-90 50 50)" stroke-dasharray="${L}" stroke-dashoffset="${L}"/></svg>`)
  const num = el('div', { left: 0, top: px(d * 0.27), width: '100%', textAlign: 'center', fontSize: px(d * 0.32), fontWeight: 600, color: C.ink, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }, root)
  el('div', { left: 0, top: px(d * 0.63), width: '100%', textAlign: 'center', fontSize: px(d * 0.07), color: C.subtle, fontFamily: 'Geist Mono', letterSpacing: '0.14em' }, root, 'ATS')
  const arc = root.querySelector('.arc')
  return { root, set(v, a = v) { num.textContent = Math.round(v); arc.setAttribute('stroke-dashoffset', L * (1 - clamp(a / 100))) } }
}

// The tailored resume, laid out line for line like the real PDF (assets/popup/resume-page.png): Times, rules,
// right-aligned dates. The three bullets that rewrite clear first, then type in around a gap the keyword drops into.
const BULLETS = [
  { before: 'Handled social media and email marketing that grew leads 38%', after: ['Owned ', 'campaign strategy', ' for email and social, growing qualified leads 38%'], k: 'Campaign strategy' },
  { before: 'Managed $1.2M in paid media spend across four channels', after: ['Managed a $1.2M paid media ', 'budget', ' across four channels'], k: 'Budget' },
  { before: 'Wrote blog posts that grew organic traffic 64%', after: ['Grew organic traffic 64% with an ', 'SEO', ' content program'], k: 'SEO' },
]
function makeResume(parent, x, y, { w = 880, h = 1160 } = {}) {
  const pad = 64, fs = 21
  const root = el('div', { left: px(x), top: px(y), width: px(w), height: px(h), background: '#fff', borderRadius: '8px', boxShadow: SH.doc, overflow: 'hidden' }, parent)
  root.className = 'serif'
  const T = (txt, st) => el('div', { whiteSpace: 'nowrap', fontSize: px(fs), ...st }, root, txt)
  T('Alex Rivera', { left: 0, width: '100%', top: '50px', textAlign: 'center', fontSize: '46px', fontWeight: 700 })
  T('(555) 014-2290 &nbsp;|&nbsp; alex.rivera@example.com &nbsp;|&nbsp; linkedin.com/in/alexrivera-example', { left: 0, width: '100%', top: '112px', textAlign: 'center', fontSize: '16px' })
  const head = (txt, top) => { T(txt, { left: px(pad), top: px(top), fontSize: '19px', fontWeight: 700, letterSpacing: '0.02em' }); el('div', { left: px(pad), right: px(pad), top: px(top + 25), height: '1.5px', background: '#111' }, root) }
  const role = (title, dates, org, place, top) => {
    T(title, { left: px(pad), top: px(top), fontWeight: 700 }); T(dates, { right: px(pad), top: px(top) })
    T(org, { left: px(pad), top: px(top + 30), fontStyle: 'italic' }); T(place, { right: px(pad), top: px(top + 30) })
  }
  const bullet = (txt, top) => { T('•', { left: px(pad + 6), top: px(top) }); return T(txt, { left: px(pad + 26), top: px(top) }) }
  head('EXPERIENCE', 160)
  role('Marketing Lead', 'Mar 2021 – Present', 'Brightline', 'Denver, CO', 196)
  const lineW = w - pad * 2 - 26
  const bullets = BULLETS.map((b, i) => {
    const top = 266 + i * 38
    T('•', { left: px(pad + 6), top: px(top) })
    const box = el('div', { left: px(pad + 26), top: px(top), width: px(lineW), height: '32px' }, root)
    const before = el('div', { left: 0, top: 0, width: '100%', fontSize: px(fs), whiteSpace: 'nowrap' }, box, `<span>${esc(b.before)}</span>`)
    before.className = 'flow'
    const after = el('div', { left: 0, top: 0, width: '100%', fontSize: px(fs), whiteSpace: 'nowrap' }, box,
      `<span>${esc(b.after[0])}${kwHTML(b.k, b.after[1])}${esc(b.after[2])}</span>`)
    after.className = 'flow'
    const caret = el('div', { left: 0, top: '2px', width: '3px', height: '26px', borderRadius: '2px', background: C.brand }, box)
    return { box, before, after, caret, bText: before.firstChild, aText: after.firstChild, slot: kws(after)[b.k] }
  })
  bullet('Lead a team of 4 and report weekly results in Google Analytics', 380)
  role('Marketing Specialist', 'Jun 2018 – Feb 2021', 'Fieldstone Co.', 'Boulder, CO', 432)
  bullet('Ran A/B tests on landing pages and emails that lifted sign-ups 17%', 502)
  bullet('Wrote launch copy for 12 product releases', 540)
  head('EDUCATION', 600)
  T('University of Colorado Boulder', { left: px(pad), top: '638px', fontWeight: 700 }); T('2014 – 2018', { right: px(pad), top: '638px' })
  T('B.S. Marketing', { left: px(pad), top: '668px', fontStyle: 'italic' }); T('Boulder, CO', { right: px(pad), top: '668px' })
  head('SKILLS', 720)
  T('Campaign strategy, SEO, Google Analytics, Budget management, Team leadership, A/B testing, Copywriting', { left: px(pad), top: '758px', width: px(w - pad * 2), whiteSpace: 'normal', lineHeight: 1.4 })
  const api = {
    root, bullets,
    // The keyword lands at L. Before it: the old line clears from the right (L-0.62 → L-0.38), then the new
    // line types up to the keyword's gap; the keyword arrives at L; the rest types in after.
    drawBullet(i, t, L) {
      const b = bullets[i]
      const done = t >= L + 0.35, fresh = t < L - 0.62
      show(b.before, t < L - 0.38)
      show(b.after, t >= L - 0.36)
      b.slot.k.style.visibility = t >= L ? 'visible' : 'hidden'
      lit(b.slot, t >= L ? 1 : 0)
      if (done || fresh) { b.before.style.clipPath = b.after.style.clipPath = 'none'; show(b.caret, false); return }
      const bw = b.bText.offsetWidth, aw = b.aText.offsetWidth
      const gapL = b.slot.k.offsetLeft, gapR = gapL + b.slot.k.offsetWidth
      const keep = (1 - ease((t - (L - 0.62)) / 0.24)) * bw
      const typed = t < L ? gapL * ease((t - (L - 0.36)) / 0.36) : gapR + (aw - gapR) * ease((t - L) / 0.3)
      b.before.style.clipPath = `inset(-4px ${lineW - keep}px -4px -4px)`
      b.after.style.clipPath = `inset(-4px ${lineW - typed}px -4px -4px)`
      show(b.caret, true)
      b.caret.style.left = px(t < L - 0.38 ? keep : typed)
    },
  }
  BULLETS.forEach((_, i) => api.drawBullet(i, -99, 0))
  return api
}

// The cover letter (LetterDoc), warm paper. Words are spans so they can type in without reflowing.
const LETTER = [
  'Your posting asks for someone to own {campaign strategy} across email and social. At Brightline I do exactly that, and I grew qualified leads 38% on a flat spend.',
  'I also manage a $1.2M paid media {budget} across four channels, and the {SEO} program I started lifted organic traffic 64%.',
]
function makeLetter(parent, x, y, { w = 1250, h = 950, fs = 34, pad = 80 } = {}) {
  const root = el('div', { left: px(x), top: px(y), width: px(w), height: px(h), background: C.letter, borderRadius: '18px', boxShadow: SH.doc, overflow: 'hidden' }, parent)
  el('div', { left: px(pad), top: px(pad * 0.9), fontSize: px(fs * 1.06), fontWeight: 600, color: C.ink }, root, 'Dear Northwind team,')
  const flow = el('div', { left: px(pad), top: px(pad * 0.9 + fs * 2.2), width: px(w - pad * 2), fontSize: px(fs), lineHeight: 1.6, color: C.body }, root)
  flow.className = 'flow'
  const words = []
  flow.innerHTML = LETTER.map((p) => '<p style="margin:0 0 0.8em">' + p.replace(/\{([^}]+)\}|(\S+)/g, (m, k, w) => {
    const i = words.length; words.push({ kw: !!k })
    return k ? `<span class="w" data-i="${i}">${kwHTML(k, k)}</span>` : `<span class="w" data-i="${i}">${esc(w)}</span>`
  }) + '</p>').join('')
  flow.querySelectorAll('.w').forEach((s, i) => { words[i].s = s; words[i].h = s.querySelector('.kw') && { k: s.querySelector('.kw'), bg: s.querySelector('.kwbg'), t: s.querySelector('.kwt') } })
  const caret = el('div', { left: 0, top: 0, width: '3px', height: px(fs * 1.1), background: C.ink }, flow)
  caret.style.position = 'absolute'
  return {
    root,
    // Word i appears at t0 + i * step; a keyword pops as it appears.
    type(t, t0, step) {
      let last = null
      words.forEach((w, i) => {
        const on = t >= t0 + i * step
        w.s.style.visibility = on ? 'visible' : 'hidden'
        if (on) last = w
        if (w.h) lit(w.h, spring(t - t0 - i * step, SNAP))
      })
      show(caret, !!last && t < t0 + words.length * step + 0.4)
      if (last) { const [lx, ly] = localXY(last.s, flow); caret.style.left = px(lx + last.s.offsetWidth + 4); caret.style.top = px(ly + fs * 0.2) }
    },
  }
}

// Real popup captures (3x of 380×560): one <img> per state, only one shown.
function makePopup(parent, names) {
  const root = el('div', { left: 0, top: 0, width: '380px', height: '560px', borderRadius: '14px', overflow: 'hidden', background: C.night, boxShadow: SH.popup, transformOrigin: '0 0' }, parent)
  const imgs = Object.fromEntries(names.map((n) => [n, img(POP + n + '.png', { left: 0, top: 0, width: '380px', height: '560px' }, root)]))
  return { root, show(n) { for (const k in imgs) show(imgs[k], k === n) } }
}

// ── 1 · Hook: frame 0 is a macro on "campaign strategy". On beat 2 it lifts off the posting, the camera
// pulls out, and it drops into the resume below while the score ticks 44 → 58. ──────────────────────
const S1 = scene(C.paper)
const w1 = world(S1)
// The posting is shot 2's page at 34/23 (same markup, same measure), so the cut at 2.5 lands on it.
const HOOK = { f: 34 / 23, x: 90, y: 110, w: 990, h: 458, paraW: 560 }
const card1 = el('div', { left: px(HOOK.x), top: px(HOOK.y), width: px(HOOK.w), height: px(HOOK.h), background: C.card, borderRadius: '18px', boxShadow: SH.browser, overflow: 'hidden' }, w1)
const page1 = el('div', { left: 0, top: 0, width: px(HOOK.w / HOOK.f), height: px(HOOK.h / HOOK.f), transformOrigin: '0 0', transform: `scale(${HOOK.f})` }, card1)
postingHeader(page1)
el('div', { left: '56px', top: '160px', fontSize: '19px', fontWeight: 600, color: C.ink2 }, page1, 'About the role')
const s1Para = el('div', { left: '56px', top: '200px', width: px(HOOK.paraW), fontSize: '23px', lineHeight: 1.5, letterSpacing: '-0.01em', color: C.body }, page1, postingHTML('0.55em'))
s1Para.className = 'flow'
const s1K = kws(s1Para)
// The resume below it: the real layout at 1.4×, cropped to the first role.
const RES1 = { x: 710, y: 600, w: 1110, h: 380, k: 1.4, cropX: 40, cropY: 150 }
const resCard1 = el('div', { left: px(RES1.x), top: px(RES1.y), width: px(RES1.w), height: px(RES1.h), background: '#fff', borderRadius: '16px', boxShadow: SH.doc, overflow: 'hidden' }, w1)
const res1 = makeResume(resCard1, -RES1.cropX * RES1.k, -RES1.cropY * RES1.k)
res1.root.style.transformOrigin = '0 0'
res1.root.style.transform = `scale(${RES1.k})`
res1.root.style.boxShadow = 'none'
const ring1 = makeRing(w1, 150, { left: px(RES1.x + RES1.w - 105), top: px(RES1.y - 120) })
const fly1 = el('div', { left: 0, top: 0, padding: '3px 12px', borderRadius: '9px', background: C.tint, color: C.tintInk, fontSize: '34px', whiteSpace: 'nowrap', boxShadow: SH.chip, transformOrigin: '50% 50%' }, w1, 'campaign strategy')
const s1TypeA = kinetic(S1, 'Every job has', { left: '1150px', top: '170px', fontSize: px(6.8 * u), whiteSpace: 'nowrap' })
const s1TypeB = kinetic(S1, 'its own words.', { left: '1150px', top: px(170 + 7.4 * u), fontSize: px(6.8 * u), whiteSpace: 'nowrap' })
// Only four of the posting's words ever light: three fly into the resume, HubSpot bounces off.
// Campaign strategy flies in the hook; the other three light after it lands and stay lit until they fly.
const LATER = ['Budget', 'SEO', 'HubSpot']
const HOOK_LAND = 2 * BEAT
const LATER_AT = { Budget: HOOK_LAND + 0.3125, SEO: HOOK_LAND + 0.625, HubSpot: HOOK_LAND + 0.9375 }

// ── 2 · The browser, the click, the popup grows out of the icon ───────
const S2 = scene(C.paper)
const w2 = world(S2)
const s2Stage = el('div', { left: '150px', top: '70px', width: '1620px', height: '940px', borderRadius: '36px', background: C.panel, overflow: 'hidden' }, w2,
  `<svg width="1620" height="940" style="position:absolute;left:0;top:0"><defs><pattern id="g2" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="${C.line}" stroke-width="1.2"/></pattern></defs><rect width="1620" height="940" fill="url(#g2)" opacity=".8"/></svg>`)
const b2 = makeBrowser(w2, 290, 140, 1340, 800, 'job-boards.greenhouse.io/northwind/jobs/4821')
postingHeader(b2.page)
el('div', { left: '56px', top: '160px', fontSize: '19px', fontWeight: 600, color: C.ink2 }, b2.page, 'About the role')
const s2Para = el('div', { left: '56px', top: '200px', width: px(HOOK.paraW), fontSize: '23px', lineHeight: 1.5, letterSpacing: '-0.01em', color: C.body }, b2.page, postingHTML('0.55em'))
s2Para.className = 'flow'
const s2K = kws(s2Para)
LATER.forEach((k) => lit(s2K[k], 1))
const s2Skel = el('div', { left: '56px', top: '470px', width: '700px' }, b2.page, '<div class="skel" style="width:92%"></div><div class="skel" style="width:84%"></div><div class="skel" style="width:60%"></div>')
s2Skel.className = 'flow'
el('div', { left: '56px', top: '590px', height: '52px', padding: '0 30px', borderRadius: '99px', background: C.brandStrong, color: '#fff', fontSize: '20px', fontWeight: 500, lineHeight: '52px' }, b2.page, 'Apply')
// The popup opens under the icon, right-aligned with it, the way Chrome places it.
const ICON2 = { x: 290 + 1340 - 16 - 38, y: 140 + 9, w: 38, h: 38 }
const POP2 = { x: ICON2.x + 38 - 380 + 6, y: 140 + 56 + 8, w: 380, h: 560 }
const morph2 = el('div', { overflow: 'hidden', background: C.night, boxShadow: SH.popup }, w2)
const pop2 = makePopup(morph2, ['idle'])
pop2.root.style.boxShadow = 'none'
pop2.show('idle')

// ── 3 · The real popup: Tailor, then the progress steps ───────────────
const S3 = scene(C.paper)
const TAIL_STEPS = ['plan', 'exp1', 'exp2', 'skills', 'score']
const pop3 = makePopup(S3, ['idle', 'idle-hover-tailor', ...TAIL_STEPS.flatMap((k) => [0, 1, 2, 3].map((f) => `tail-${k}-${f}`))])
// The Tailor button (css 18, 217 to 362, 251) darkens on the click, like Download PDF does.
const press3 = el('div', { left: '18px', top: '217px', width: '344px', height: '34px', borderRadius: '10px', background: 'rgba(10,8,30,.32)', zIndex: 5 }, pop3.root)
const s3Type = kinetic(S3, 'One click.', { left: px(1220), top: px(43 * u), fontSize: px(11 * u), whiteSpace: 'nowrap' })
// Where shot 2's push ends: the popup's center on screen and its css scale (about 1.55, so 868 px tall, left of
// center). Shot 3 then cuts in on its Tailor button (cam3).
const POP_S3 = { cx: 30 * u + (190 * 994) / 560, cy: H / 2, k: (994 / 560) * 0.873 }

// ── 4 + 5 · Keywords fly into the resume; HubSpot bounces off ─────────
const S4 = scene(C.paper)
const w4 = world(S4)
const card4 = el('div', { left: '40px', top: '330px', width: '700px', height: '540px', background: C.card, borderRadius: '18px', boxShadow: SH.browser }, w4)
postingHeader(card4, {})
const s4Para = el('div', { left: '56px', top: '150px', width: '590px', fontSize: '22px', lineHeight: 1.62, color: C.body }, card4, postingHTML('0.6em'))
s4Para.className = 'flow'
const s4K = kws(s4Para)
LATER.forEach((k) => lit(s4K[k], 1))
const RES4 = { x: 800, y: 70, k: 1.2 }
const res4 = makeResume(w4, RES4.x, RES4.y)
res4.root.style.transformOrigin = '0 0'
const res4Move = (dx = 0) => { res4.root.style.transform = `translateX(${dx}px) scale(${RES4.k})` }
res4Move()
const ring4 = makeRing(w4, 176, { left: px(1820 - 88), top: px(130 - 88) }) // keep in step with RING4
// Bullet 1 landed in the hook; budget and SEO land here.
const LANDS = [HOOK_LAND, 9.375, 10.625]
// HubSpot: lifts a bar after SEO lands (after the proof beat), hits the page a beat later, rests beside the ring
// a beat after that; Salesforce and SQL pop in beside it on the next two sixteenths.
const HUB = { lift: 13.125, hit: 13.75, rest: 14.375 }
// The push onto the ring for the match cut, and the cut itself.
const PUSH_AT = 15.0, CUT6 = 15.625
// The proof beat: the top of the resume at 1.8×, so the three rewritten bullets read (45 px) with the ring.
const PROOF = { cx: 1408, cy: 300, s: 1.8 }
const fly4 = BULLETS.map((b) => el('div', { left: 0, top: 0, padding: '3px 12px', borderRadius: '9px', background: C.tint, color: C.tintInk, fontSize: '27px', whiteSpace: 'nowrap', boxShadow: SH.chip, transformOrigin: '50% 50%' }, w4, esc(b.after[1])))
const hub = el('div', { left: 0, top: 0, height: '58px', borderRadius: '99px', background: C.tint, color: C.tintInk, fontSize: '28px', fontWeight: 500, lineHeight: '58px', whiteSpace: 'nowrap', overflow: 'hidden', boxShadow: SH.chip, transformOrigin: '50% 50%' }, w4,
  '<span style="padding-left:21px">HubSpot</span>')
// The popup's gap row, drawn: HubSpot flies; Salesforce and SQL pop in beside it once it lands.
// Measured in the popup capture (css px): chips at y 155 to 177.5, HubSpot 151 to 213, Salesforce 219 to 290,
// SQL 296 to 336; the "MISSING" label's top at 137.5.
const GAPS_CSS = { left: 151, cy: 166.25, h: 22.5, centers: [182, 254.5, 316], labelTop: 137.5, labelSize: 10.5 }
const gapChip = (txt) => el('div', { left: 0, top: 0, height: '58px', padding: '0 21px', borderRadius: '99px', background: C.gapTint, color: C.gapInk, fontSize: '28px', fontWeight: 500, lineHeight: '58px', whiteSpace: 'nowrap', boxShadow: `inset 0 0 0 2px ${C.gap}, ${SH.chip}`, transformOrigin: '50% 50%' }, w4, txt)
const more4 = ['Salesforce', 'SQL'].map(gapChip)
const missLabel4 = el('div', { left: 0, top: 0, fontFamily: 'Geist Mono', fontSize: '20px', lineHeight: 1, letterSpacing: '0.16em', color: C.subtle, whiteSpace: 'nowrap', transformOrigin: '0 0' }, w4, 'MISSING')
const s4Type = kinetic(S4, 'Your resume, | in its words.', { left: px(4 * u), top: px(8 * u), fontSize: px(7.4 * u), whiteSpace: 'nowrap', lineHeight: 1.02 })
const s5Type = kinetic(S4, "It won't fake | experience.", { left: px(1352), top: px(60 * u), fontSize: px(7.2 * u), whiteSpace: 'nowrap', lineHeight: 1.02 })

// ── 6 · Match cut into the real popup's 86, then Download PDF ───────
const S6 = scene(C.paper)
// On the click the popup's own night ground floods out to the frame's edges.
const flood6 = el('div', { background: C.night }, S6)
const pop6 = makePopup(S6, ['result', 'result-hover-download'])
pop6.show('result')
const RING_CSS = { x: 85, y: 186, d: 92 }
// Where the glide ends: the popup framed left, its Download PDF button (css 18, 384 to 198, 419) at the cursor.
const K6 = 1.75, P6 = { x: 100, y: (H - 560 * 1.75) / 2 }
const DL6 = { x: P6.x + 18 * K6, y: P6.y + 384 * K6, w: 180 * K6, h: 35 * K6 }
const CLICK6 = CUT6 + 3 * E8
const press6 = el('div', { left: px(DL6.x), top: px(DL6.y), width: px(DL6.w), height: px(DL6.h), borderRadius: px(10 * K6), background: 'rgba(10,8,30,.28)' }, S6)
// The page, cropped just below the skills line so no blank paper shows.
const PDF6 = { x: 860, y: 250, w: 990 }
PDF6.h = Math.round(PDF6.w * (2376 / 1836) * 0.47)
const page6 = el('div', { overflow: 'hidden', background: '#fff', boxShadow: '0 40px 90px -30px rgba(0,0,0,.6)' }, S6)
const pdf6img = img(POP + 'resume-page.png', { left: 0, top: 0 }, page6)
const tag6 = el('div', { left: px(PDF6.x), top: px(PDF6.y - 7.4 * u - 26), height: px(7.4 * u), padding: `0 ${2.6 * u}px 0 ${2 * u}px`, borderRadius: '99px', background: '#fff', color: C.ink, fontSize: px(3.4 * u), fontWeight: 500, lineHeight: px(7.4 * u), whiteSpace: 'nowrap', boxShadow: SH.chip }, S6,
  `<svg viewBox="0 0 24 24" width="${3.2 * u}" height="${3.2 * u}" style="vertical-align:-${0.75 * u}px;margin-right:${1.2 * u}px" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13H8M16 17H8"/></svg>Alex_Rivera_Resume.pdf`)

// ── 7 · The cover letter types itself ──────────────────────────────────
const S7 = scene(C.paper)
const w7 = world(S7)
const let7 = makeLetter(w7, 260, 230, { w: 1400, h: 1100, fs: 40, pad: 96 })
const s7Type = kinetic(S7, 'And the cover letter.', { left: px(7.5 * u), top: px(6 * u), fontSize: px(8.2 * u), whiteSpace: 'nowrap' })
const LETTER_AT = 17.5

// ── 9 · Montage: eight boards ──────────────────────────────────────────
const BOARDS = [
  ['linkedin.svg', 'LinkedIn', 'linkedin.com/jobs/view/3907714', 'L', 'Clinic Operations Manager', 'Larkspur Clinics · Portland, OR', 'Run {patient scheduling} across three clinics and lead {staff training} for our 40 front-desk and nursing staff, starting this spring.'],
  ['indeed.svg', 'Indeed', 'indeed.com/viewjob?jk=8f2a91c7', 'T', 'Dispatch Coordinator', 'Tidewater Freight · Norfolk, VA', 'Own {route planning} for 60 drivers a day and keep shippers updated with clear {customer service} from pickup to delivery.'],
  ['greenhouse.svg', 'Greenhouse', 'job-boards.greenhouse.io/northwind/jobs/4821', 'N', 'Marketing Manager', 'Northwind · Denver, CO', "You'll own our {campaign strategy} across email and social, manage a $1.2M {budget} and report results to leadership."],
  ['lever.png', 'Lever', 'jobs.lever.co/fernhill/7c1e2d', 'F', 'Product Designer', 'Fernhill Studio · Remote', 'Design end-to-end flows in {Figma} and run {user research} with real customers every sprint, then ship with engineering.'],
  ['workday.png', 'Workday', 'harborpine.wd5.myworkdayjobs.com/careers', 'H', 'Financial Analyst', 'Harborpine Bank · Charlotte, NC', 'Build {financial models} for the lending team and present {forecasting} results to the leadership team each quarter.'],
  ['ashby.png', 'Ashby', 'jobs.ashbyhq.com/bluebell', 'B', 'Data Analyst', 'Bluebell Data · Austin, TX', 'Write {SQL} against our warehouse and build the {dashboards} the sales team checks every morning before standup.'],
  ['bamboohr.png', 'BambooHR', 'junipergrocers.bamboohr.com/careers/112', 'J', 'Store Manager', 'Juniper Grocers · Boise, ID', 'Lead a team of 25, own {inventory management} for two stores and keep {customer satisfaction} above 90% all year.'],
  ['workable.png', 'Workable', 'apply.workable.com/quillmere', 'Q', 'Research Associate', 'Quillmere Labs · Boston, MA', 'Run {lab experiments} to protocol, keep clean {data analysis} notebooks and present findings at the weekly lab meeting.'],
]
const S9 = scene(C.paper)
const w9 = world(S9)
const b9 = makeBrowser(w9, 260, 210, 1400, 820, '')
const m9 = postingHeader(b9.page, {})
const desc9 = el('div', { left: '56px', top: '158px', width: '1000px', fontSize: '31px', lineHeight: 1.5, color: C.body, letterSpacing: '-0.01em' }, b9.page)
desc9.className = 'flow'
el('div', { left: '56px', top: '300px', width: '1100px' }, b9.page, '<div class="skel" style="width:94%;height:12px"></div><div class="skel" style="width:86%;height:12px;margin-top:22px"></div><div class="skel" style="width:60%;height:12px;margin-top:22px"></div><div class="skel" style="width:90%;height:12px;margin-top:46px"></div><div class="skel" style="width:74%;height:12px;margin-top:22px"></div>').className = 'flow'
el('div', { left: '56px', top: '560px', height: '56px', padding: '0 32px', borderRadius: '99px', background: C.brandStrong, color: '#fff', fontSize: '21px', fontWeight: 500, lineHeight: '56px' }, b9.page, 'Apply')
// The board's name sits in a tab above the window, the way a browser tab would.
const tab9 = el('div', { left: '290px', top: '126px', height: '84px', borderRadius: '18px 18px 0 0', background: '#F2F0ED' }, w9)
const boardLogos9 = BOARDS.map(([logo]) => img('../../web/public/boards/' + logo, { left: '28px', top: '20px', width: '44px', height: '44px', objectFit: 'contain' }, tab9))
const boardName9 = el('div', { left: '88px', top: '17px', fontSize: px(4.6 * u), fontWeight: 600, color: C.ink, letterSpacing: '-0.03em', lineHeight: '50px', whiteSpace: 'nowrap' }, tab9)
let cur9 = -1, k9 = []

// ── 10 · End card: the lockup, centered on the night ground ─────────
const S10 = scene(C.night)
const row10 = el('div', { left: 0, top: px(9 * u), width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: px(2.6 * u) }, S10,
  `<img src="${LOGO}" style="width:${11 * u}px;height:${11 * u}px"><span style="font-size:${6.6 * u}px;font-weight:600;color:#F5F3F2;letter-spacing:-0.03em;white-space:nowrap">Cover Me</span>`)
const head10 = kinetic(S10, 'Tailor your resume | to any job posting.', { left: 0, top: px(23.5 * u), width: '100%', textAlign: 'center', fontSize: px(7.8 * u), lineHeight: 1.04, whiteSpace: 'nowrap', color: '#F5F3F2' })
const cta10 = el('div', { left: 0, top: px(44.5 * u), width: '100%', textAlign: 'center' }, S10,
  `<span style="display:inline-block;height:${9.6 * u}px;padding:0 ${4.6 * u}px 0 ${3.6 * u}px;border-radius:99px;background:${C.brandStrong};color:#fff;font-size:${3.5 * u}px;font-weight:500;line-height:${9.6 * u}px;white-space:nowrap;box-shadow:0 14px 36px -20px rgba(99,102,241,.55)"><svg viewBox="0 0 24 24" width="${3.6 * u}" height="${3.6 * u}" style="vertical-align:-${0.9 * u}px;margin-right:${1.5 * u}px" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" x2="12" y1="8" y2="8"/><line x1="3.95" x2="8.54" y1="6.06" y2="14"/><line x1="10.88" x2="15.46" y1="21.94" y2="14"/></svg>Add to Chrome, it's free</span>`)
const ctaPill10 = cta10.firstChild
// The product in the last frame: the real popup's result (86, HubSpot missing), cropped by the bottom edge.
const K10 = 1.75
const pop10 = makePopup(S10, ['result'])
pop10.show('result')

// ── measurements (after fonts load) ───────────────────────────────────
let M = null
function measure() {
  if (M || document.fonts.status !== 'loaded') return M
  M = {}
  // Hidden scenes have no layout: show them while measuring.
  const hidden = [S1, S4, S7, hub, fly1, ...fly4, ...res4.bullets.map((b) => b.after), ...res1.bullets.map((b) => b.after)]
  hidden.forEach((e) => show(e, true))
  // The resume is scaled about its top-left corner; offsets ignore transforms, so scale them here.
  const inRes = ([x, y]) => [RES4.x + (x - RES4.x) * RES4.k, RES4.y + (y - RES4.y) * RES4.k]
  M.fly = BULLETS.map((b, i) => ({ from: center(s4K[b.k].k, w4), to: inRes(center(res4.bullets[i].slot.k, w4)) }))
  M.flyW = fly4.map((f) => [f.offsetWidth, f.offsetHeight])
  M.hubFrom = center(s4K.HubSpot.k, w4)
  // HubSpot hits the page's right margin, level with bullet 3 (the SEO line).
  const [, b3y] = localXY(res4.bullets[2].aText, res4.root)
  M.hubHit = inRes([RES4.x + 880 - 34, RES4.y + b3y + 14])
  M.hubA = hub.children[0].offsetWidth + 21
  // Shot 1's posting and resume are scaled about their corners; offsets ignore transforms, so map them.
  const [px1, py1] = center(s1K['Campaign strategy'].k, page1)
  M.s1cs = [HOOK.x + px1 * HOOK.f, HOOK.y + py1 * HOOK.f]
  M.let7p2 = center(let7.root.querySelectorAll('p')[1], w7)
  const [rx1, ry1] = center(res1.bullets[0].slot.k, res1.root)
  M.s1to = [RES1.x + (rx1 - RES1.cropX) * RES1.k, RES1.y + (ry1 - RES1.cropY) * RES1.k]
  M.fly1W = [fly1.offsetWidth, fly1.offsetHeight]
  ;[S1, S4, S7].forEach((e) => show(e, false))
  return M
}

// Camera for shots 4 and 5, one continuous move: wide, pushing toward the resume on each landing, then
// into a crop on the resume's right edge with the ring, then onto the ring for the match cut.
const RING4 = [1820, 130, 176]
// The ring's stroke spans 83.5% of the white disc (viewBox r 38 + half of 7.5, of 100).
const RING4_STROKE = RING4[2] * 0.835
const CAM5 = { s: 1.3, cx: 1856 - (1300 - 960) / 1.3, cy: 130 - (190 - 540) / 1.3 }
// Where the push ends: the ring left of center, its chip right of center.
const PUSH_END = [RING4[0] + 0.55 * RING4_STROKE, RING4[1] + 8, 2.6]
function cam4(t) {
  const A = [80, 17.9], push = spring(t - PUSH_AT, [110, 21])
  // Wide for budget and SEO; in to the proof (10.75); back out to see HubSpot leave the posting (12.5);
  // then follow it to the ring (13.85).
  const keys = [[7.5, 960, 540, 0.94], [9.375, 1010, 520, 1.0], [10.75, PROOF.cx, PROOF.cy, PROOF.s], [12.5, 1120, 480, 1.1], [13.85, CAM5.cx, CAM5.cy, CAM5.s]]
  const cx = track(t, keys.map((k) => [k[0], k[1]]), A)
  const cy = track(t, keys.map((k) => [k[0], k[2]]), A)
  const ls = track(t, keys.map((k) => [k[0], Math.log(k[3])]), A)
  // Still while the line is read (a slow drift would make the text hop a pixel at a time), then onto the ring
  // with the chips beside it for the match cut.
  return {
    cx: lerp(cx, PUSH_END[0], push), cy: lerp(cy, PUSH_END[1], push),
    s: Math.exp(lerp(ls, Math.log(PUSH_END[2]), push)),
  }
}

// Shot 3's camera: a cut in on the Tailor button for the click, then onto the step list (the usage note below it
// stays out of frame).
// f: the popup point (css px) held at screen point (sx, sy), at css scale k.
function cam3(t) {
  const S = [90, 19]
  return {
    fx: track(t, [[5, 190], [5.72, 150]], S), fy: track(t, [[5, 234], [5.72, 135]], S),
    sx: track(t, [[5, 600], [5.72, 520]], S), sy: track(t, [[5, 540], [5.72, 560]], S),
    k: Math.exp(track(t, [[5, Math.log(2.5)], [5.72, Math.log(2.7)]], S)),
  }
}

// ── the film ──────────────────────────────────────────────────────────
const SCENES = [
  { from: 0, to: 2.5, root: S1, draw(t) {
    const m = measure()
    // Macro on the word with the whole job title above it, pulling out from frame 0 to the whole desk.
    const z = spring(t + 0.04, [60, 15.5])
    const [wx, wy] = m ? [m.s1cs[0], m.s1cs[1] - 45] : [W / 2, H / 2]
    cam(w1, lerp(wx, W / 2, z), lerp(wy, H / 2, z), Math.exp(lerp(Math.log(2.4), 0, z)))
    // The word: lit on frame 0, lifts on beat 2 (its posting copy goes plain), lands on beat 3.
    lit(s1K['Campaign strategy'], t < 0.6 ? spring(t + 0.15, SNAP) : 0)
    for (const k of LATER) lit(s1K[k], spring(t - LATER_AT[k], SNAP))
    show(fly1, !!m && t >= 0.6 && t < HOOK_LAND)
    if (m && t >= 0.6 && t < HOOK_LAND) {
      const q = clamp(spring(t - 0.6, [110, 21]))
      const [x0, y0] = m.s1cs, [x1, y1] = m.s1to
      const cpx = lerp(x0, x1, 0.75), cpy = y0 + 40
      const x = (1 - q) ** 2 * x0 + 2 * (1 - q) * q * cpx + q * q * x1
      const y = (1 - q) ** 2 * y0 + 2 * (1 - q) * q * cpy + q * q * y1
      fly1.style.transform = `translate(${x - m.fly1W[0] / 2}px, ${y - m.fly1W[1] / 2}px) scale(${1 + 0.8 * Math.sin(Math.PI * q)})`
    }
    res1.drawBullet(0, t, HOOK_LAND)
    res1.drawBullet(1, -99, 0); res1.drawBullet(2, -99, 0)
    ring1.set(track(t, [[0, 44], [HOOK_LAND, 58]], [300, 32]))
    ring1.root.style.transform = `scale(${1 + 0.07 * Math.max(0, Math.sin(Math.PI * clamp((t - HOOK_LAND) / 0.25)))})`
    // In two halves: the first with the landing, the second an eighth later. Leaves before the cut.
    s1TypeA.draw(t, HOOK_LAND - 0.04, 2.38, 0.03)
    s1TypeB.draw(t, HOOK_LAND + E8 - 0.04, 2.38, 0.03)
  } },
  { from: 2.5, to: 5, root: S2, draw(t) {
    // Pull out from the posting to the posting and toolbar, then follow the popup in to POP_S3;
    // shot 3 cuts in from there onto the Tailor button.
    const pull = spring(t - 2.5, [110, 21]), push = spring(t - 3.9, [42, 13])
    // Start where shot 1 left its posting: the page at the same size, in the same place on screen.
    const s0 = HOOK.f, p0 = [HOOK.x, HOOK.y]
    const cx0 = 290 - (p0[0] - W / 2) / s0, cy0 = 140 + 56 - (p0[1] - H / 2) / s0
    const sEnd = POP_S3.k, cxEnd = POP2.x + 190 + (W / 2 - POP_S3.cx) / sEnd, cyEnd = POP2.y + 280 + (H / 2 - POP_S3.cy) / sEnd
    const s = Math.exp(lerp(lerp(Math.log(s0), Math.log(1.35), pull), Math.log(sEnd), push))
    const cx = lerp(lerp(cx0, 980, pull), cxEnd, push), cy = lerp(lerp(cy0, 380, pull), cyEnd, push)
    cam(w2, cx, cy, s)
    // Icon press on the click, then the dark square grows from the icon into the popup.
    const press = 1 - 0.08 * Math.sin(Math.PI * clamp((t - 3.735) / 0.2))
    b2.icon.style.transform = `scale(${press})`
    const m = spring(t - 3.8, [150, 22])
    show(morph2, t >= 3.8)
    const r = { x: lerp(ICON2.x, POP2.x, m), y: lerp(ICON2.y, POP2.y, m), w: lerp(ICON2.w, POP2.w, m), h: lerp(ICON2.h, POP2.h, m) }
    Object.assign(morph2.style, { left: px(r.x), top: px(r.y), width: px(r.w), height: px(r.h), borderRadius: px(lerp(11, 14, m)) })
    // The real popup scales with the box (anchored top right, under the icon) instead of being clipped.
    const ks = r.h / POP2.h
    pop2.root.style.left = px(r.w - POP2.w * ks)
    pop2.root.style.top = '0px'
    pop2.root.style.transform = `scale(${ks})`
    // Cursor: enters bottom right, arcs to the icon, clicks on the beat. Screen coords via the camera.
    const toScreen = ([x, y]) => [(x - cx) * s + W / 2, (y - cy) * s + H / 2]
    const ic = toScreen([ICON2.x + 19, ICON2.y + 19])
    drawCursor(t, [[2.5, W + 60, H - 80], [2.85, ic[0] + 6, ic[1] + 4]], [3.75])
    if (t > 4.2) show(cursor, false)
  } },
  { from: 5, to: 7.5, root: S3, draw(t) {
    const c = cam3(t), k = c.k * (1 + 0.025 * spring(t - 6.0, [6, 5]))
    pop3.root.style.transform = `translate(${c.sx - c.fx * k}px, ${c.sy - c.fy * k}px) scale(${k})`
    const spin = Math.floor(((t % 0.65) / 0.65) * 4)
    let st = 'idle'
    if (t >= 5.36) st = 'idle-hover-tailor'
    if (t >= 5.7) st = `tail-plan-${spin}`
    if (t >= 6.25) st = `tail-exp1-${spin}`
    if (t >= 6.5625) st = `tail-exp2-${spin}`
    if (t >= 6.875) st = `tail-skills-${spin}`
    if (t >= 7.1875) st = `tail-score-${spin}`
    pop3.show(st)
    const pr3 = t < 5.7 ? Math.max(0, Math.sin(Math.PI * clamp((t - 5.605) / 0.16))) : 0
    show(press3, pr3 > 0.01)
    press3.style.opacity = pr3
    s3Type.draw(t, 5.08, 7.28, E8)
    drawCursor(t, [[5, W * 0.62, H + 40], [5.0, 600 + 60, 540 + 10]], [5.625], 0.04)
    if (t >= 5.75) show(cursor, false)
  } },
  { from: 7.5, to: CUT6, root: S4, draw(t) {
    const m = measure()
    const { cx, cy, s } = cam4(t)
    cam(w4, cx, cy, s)
    // Score: 58 after the hook, +14 per must-have that lands.
    ring4.set(track(t, [[0, 58], [LANDS[1], 72], [LANDS[2], 86]], [300, 32]))
    ring4.root.style.transform = `scale(${1 + 0.06 * LANDS.slice(1).reduce((a, L) => a + Math.max(0, Math.sin(Math.PI * clamp((t - L) / 0.25))), 0)})`
    BULLETS.forEach((b, i) => {
      if (i === 0) { res4.drawBullet(0, 99, 0); show(fly4[0], false); return }
      const L = LANDS[i]
      res4.drawBullet(i, t, L)
      // The posting's word goes plain as its copy lifts off.
      lit(s4K[b.k], t < L - 0.66 ? 1 : 0)
      const f = fly4[i]
      const q = spring(t - (L - 0.66), [110, 21])
      show(f, m && t >= L - 0.66 && t < L)
      if (m && t >= L - 0.66 && t < L) {
        const [x0, y0] = m.fly[i].from, [x1, y1] = m.fly[i].to
        const cxp = (x0 + x1) / 2, cyp = Math.max(y0, y1) + 140 // swoop under: the type sits above
        const qq = clamp(q)
        const x = (1 - qq) ** 2 * x0 + 2 * (1 - qq) * qq * cxp + qq * qq * x1
        const y = (1 - qq) ** 2 * y0 + 2 * (1 - qq) * qq * cyp + qq * qq * y1
        f.style.transform = `translate(${x - m.flyW[i][0] / 2}px, ${y - m.flyW[i][1] / 2}px) scale(${1 + 1.15 * Math.sin(Math.PI * qq)})`
      }
    })
    // HubSpot: lifts out of the posting like the others, hits the page beside bullet 3, turns orange,
    // and is thrown up to rest beside the ring as the "missing" chip.
    lit(s4K.HubSpot, t < HUB.lift ? 1 : 0)
    show(hub, !!m && t >= HUB.lift)
    if (t < HUB.rest) { more4.forEach((c) => show(c, false)); show(missLabel4, false) }
    if (m && t >= HUB.lift) {
      const A = m.hubFrom, B = m.hubHit
      // The gap row sits where the real popup's sits relative to its ring, laid out 15% larger at rest; during
      // the push it shrinks onto the popup's own row, so the cut matches the ring and all three chips.
      const GS = RING4_STROKE / RING_CSS.d, CHIP_CUT = (GAPS_CSS.h * GS) / 58, CHIP_REST = CHIP_CUT * 1.15
      const pushK = spring(t - PUSH_AT, [110, 21])
      const f = lerp(1.15, 1, pushK)
      const rowLeft = RING4[0] + (GAPS_CSS.left - RING_CSS.x) * GS
      const rowY = RING4[1] + (GAPS_CSS.cy - RING_CSS.y) * GS
      const cxAt = (i) => rowLeft + (GAPS_CSS.centers[i] - GAPS_CSS.left) * GS * f
      const Cc = [cxAt(0), rowY]
      let x, y, sc = 1
      const hit = HUB.hit, land = HUB.rest
      if (t < hit) {
        // The same arc as the words that landed, but accelerating: fastest at contact.
        const q = clamp((t - HUB.lift) / (hit - HUB.lift)) ** 1.8
        const cpx = (A[0] + B[0]) / 2, cpy = Math.max(A[1], B[1]) + 140
        x = (1 - q) ** 2 * A[0] + 2 * (1 - q) * q * cpx + q * q * B[0]
        y = (1 - q) ** 2 * A[1] + 2 * (1 - q) * q * cpy + q * q * B[1]
        sc = 1 + 1.0 * Math.sin(Math.PI * q)
      } else {
        // Thrown back after a short squash, arcing up to rest beside the ring.
        const v2 = spring(t - hit - 0.05, [70, 14])
        const cpx = Cc[0] + 60, cpy = B[1]
        x = (1 - v2) ** 2 * B[0] + 2 * (1 - v2) * v2 * cpx + v2 * v2 * Cc[0]
        y = (1 - v2) ** 2 * B[1] + 2 * (1 - v2) * v2 * cpy + v2 * v2 * Cc[1]
        sc = lerp(1, CHIP_REST, clamp(v2)) * (1 - 0.08 * Math.max(0, Math.sin(Math.PI * clamp((t - land) / 0.16))))
      }
      const sq = Math.max(0, Math.sin(Math.PI * clamp((t - hit) / 0.12)))
      const gap = t >= hit
      const wPill = m.hubA
      sc *= lerp(1, CHIP_CUT / CHIP_REST, pushK)
      Object.assign(hub.style, { width: px(wPill), background: gap ? C.gapTint : C.tint, color: gap ? C.gapInk : C.tintInk, boxShadow: gap ? `inset 0 0 0 2px ${C.gap}, ${SH.chip}` : SH.chip })
      hub.style.transformOrigin = t >= hit && t < hit + 0.12 ? '100% 50%' : '50% 50%'
      hub.style.transform = `translate(${x - wPill / 2}px, ${y - 29}px) scale(${sc * (1 - 0.22 * sq)}, ${sc * (1 + 0.1 * sq)})`
      // Salesforce and SQL pop in beside it, a sixteenth apart, under the "MISSING" label.
      more4.forEach((c, j) => {
        const at = land + (j + 1) * E16
        show(c, t >= at)
        if (t < at) return
        const pp = spring(t - at, [260, 18])
        const kc = lerp(CHIP_REST, CHIP_CUT, pushK) * (0.55 + 0.45 * pp)
        c.style.transform = `translate(${cxAt(j + 1) - c.offsetWidth / 2}px, ${rowY - 29}px) scale(${kc})`
        c.style.clipPath = `inset(-20% ${100 - 100 * clamp(pp * 1.4)}% -20% 0 round 99px)`
      })
      show(missLabel4, t >= land)
      const lk = spring(t - land, SNAP)
      const ls4 = (GAPS_CSS.labelSize * GS * f) / 20
      missLabel4.style.transform = `translate(${rowLeft}px, ${rowY + (GAPS_CSS.labelTop - GAPS_CSS.cy) * GS * f + (1 - lk) * 10}px) scale(${ls4})`
      missLabel4.style.clipPath = `inset(-20% ${100 - 100 * clamp(lk)}% -20% 0)`
      // The page takes the hit: pushed back a few pixels, then settles.
      const k = t - hit
      res4Move(k > 0 ? 22 * Math.exp(-8 * k) * Math.sin(26 * k) : 0)
    } else res4Move()
    s4Type.draw(t, 7.56, 9.62, E16)
    s5Type.draw(t, HUB.hit + 0.05, PUSH_AT - 0.12, E16)
  } },
  { from: CUT6, to: 17.5, root: S6, draw(t) {
    // Starts with the popup's ring stroke exactly where and as big as the drawn ring's, holds 0.1 s,
    // then glides out to frame the popup left with its Download PDF button under the cursor.
    const c = cam4(CUT6 - 1e-4)
    const r0 = [(RING4[0] - c.cx) * c.s + W / 2, (RING4[1] - c.cy) * c.s + H / 2]
    const k0 = (RING4_STROKE * c.s) / RING_CSS.d
    const g = spring(t - (CUT6 + 0.1), [40, 12.6])
    const ringF = [P6.x + RING_CSS.x * K6, P6.y + RING_CSS.y * K6]
    const k = Math.exp(lerp(Math.log(k0), Math.log(K6), g))
    const rr = [lerp(r0[0], ringF[0], g), lerp(r0[1], ringF[1], g)]
    pop6.root.style.transform = `translate(${rr[0] - RING_CSS.x * k}px, ${rr[1] - RING_CSS.y * k}px) scale(${k})`
    pop6.show(t >= CLICK6 - 0.25 && t < CLICK6 + 0.3 ? 'result-hover-download' : 'result')
    drawCursor(t, [[CUT6 + 0.2, 760, H + 60], [CUT6 + 0.2, DL6.x + DL6.w / 2 + 20, DL6.y + DL6.h / 2 + 6]], [CLICK6], 0.05)
    if (t > CLICK6 + 0.35) show(cursor, false)
    // Press: the button darkens and gives 4%.
    const pr = Math.max(0, Math.sin(Math.PI * clamp((t - CLICK6 + 0.02) / 0.18)))
    show(press6, pr > 0.01)
    press6.style.opacity = pr
    press6.style.transform = `scale(${1 - 0.04 * pr})`
    // The night ground floods out of the button, past all four edges in a few frames.
    const f = spring(t - CLICK6, [700, 53])
    show(flood6, t >= CLICK6)
    const fc = [DL6.x + DL6.w / 2, DL6.y + DL6.h / 2], R = lerp(20, 2400, f)
    Object.assign(flood6.style, { left: px(fc[0] - R), top: px(fc[1] - R), width: px(2 * R), height: px(2 * R), borderRadius: '50%' })
    // The page grows out of the button.
    const gp = spring(t - CLICK6 - 0.03, [120, 20])
    show(page6, t >= CLICK6 + 0.03)
    const r = { x: lerp(DL6.x, PDF6.x, gp), y: lerp(DL6.y, PDF6.y, gp), w: lerp(DL6.w, PDF6.w, gp), h: lerp(DL6.h, PDF6.h, gp) }
    Object.assign(page6.style, { left: px(r.x), top: px(r.y), width: px(r.w), height: px(r.h), borderRadius: px(lerp(18, 8, clamp(gp))) })
    pdf6img.style.width = px(r.w)
    const tg = spring(t - (CLICK6 + 0.5), SNAP)
    show(tag6, t >= CLICK6 + 0.5)
    tag6.style.transform = `translateY(${(1 - tg) * 2 * u}px)`
    tag6.style.clipPath = `inset(-20% ${100 - 100 * clamp(tg)}% -20% 0 round 99px)`
  } },
  { from: LETTER_AT, to: 22.5, root: S7, draw(t) {
    const m = measure()
    let7.root.style.transform = `translateY(${260 * (1 - spring(t - LETTER_AT, [160, 25.3]))}px)`
    let7.type(t, LETTER_AT + 0.35, 0.045)
    s7Type.draw(t, LETTER_AT + 0.05, 20.15, E16)
    // Once it's typed, push in on the second paragraph so budget and SEO read on a phone.
    const z = spring(t - 20.15, [60, 15.5])
    const [px2, py2] = m ? m.let7p2 : [W / 2, H / 2]
    cam(w7, lerp(W / 2, px2, z), lerp(H / 2, py2, z), Math.exp(lerp(0, Math.log(1.6), z)))
  } },
  { from: 22.5, to: 25, root: S9, draw(t) {
    cam(w9, 760, 380, 1.45) // no drift: the board swaps are the motion
    const i = clamp(Math.floor((t - 22.5) / E8), 0, 7)
    if (cur9 !== i) {
      cur9 = i
      const [, name, url, letter, role, meta, desc] = BOARDS[i]
      boardLogos9.forEach((e, j) => show(e, j === i))
      boardName9.textContent = name
      tab9.style.width = px(88 + boardName9.offsetWidth + 36)
      b9.urlBox.textContent = url
      m9.mark.textContent = letter
      m9.tEl.textContent = role
      m9.mEl.textContent = meta
      desc9.innerHTML = esc(desc).replace(/\{([^}]+)\}/g, (_, k) => kwHTML(k, k))
      k9 = Object.values(kws(desc9))
    }
    // Each posting's own keywords light on the beat, as in the hook.
    const lt = t - 22.5 - i * E8
    k9.forEach((h, j) => lit(h, spring(lt - 0.04 - j * 0.08, SNAP)))
    b9.icon.style.transform = `scale(${1 + 0.3 * Math.sin(Math.PI * clamp(lt / 0.2))})`
    const pop = spring(lt, [420, 26])
    boardName9.style.transform = `translateY(${(1 - pop) * 1.2 * u}px)`
    boardLogos9[i].style.transform = `scale(${0.8 + 0.2 * pop})`
  } },
  { from: 25, to: 30, root: S10, draw(t) {
    // The lockup and CTA hold still once they land (moving text steps a pixel at a time); the popup card rises,
    // then keeps growing slowly from its top edge, so the frame never freezes.
    const up = spring(t - 25.1, [70, 16.7])
    const k10 = K10 * (1 + 0.035 * spring(t - 25.6, [1.2, 2.2]))
    pop10.root.style.transform = `translate(${(W - 380 * k10) / 2}px, ${lerp(H + 40, H - 262 * K10, up)}px) scale(${k10})`
    const lock = spring(t - 25.0, [110, 21])
    row10.style.transform = `translateY(${(1 - lock) * 3 * u}px)`
    row10.style.clipPath = `inset(${(1 - clamp(lock)) * 100}% 0 -20% 0)`
    head10.draw(t, 25.2, 99, E16)
    const c = spring(t - 25.8, [200, 20])
    ctaPill10.style.transform = `translateY(${(1 - c) * 3 * u}px)`
    ctaPill10.style.clipPath = `inset(-40% ${(1 - clamp(c * 1.4)) * 100}% -40% 0 round 99px)`
  } },
]
SCENES.forEach((s) => show(s.root, false))
// Every hard change of picture: the scene cuts, the popup's state swaps in shot 3 and shot 6, and the board swaps.
// render.mjs keeps a frame's motion-blur subframes on one side of these, so no frame shows two pictures at once.
window.CUTS = [
  ...SCENES.map((s) => s.from).filter((t) => t > 0),
  5.36, 5.7, 6.25, 6.5625, 6.875, 7.1875,
  CLICK6 - 0.25, CLICK6 + 0.3,
  ...[1, 2, 3, 4, 5, 6, 7].map((i) => 22.5 + i * E8),
].sort((a, b) => a - b)

window.seek = (t) => {
  measure()
  show(cursor, false)
  for (const s of SCENES) {
    const on = t >= s.from && t < s.to
    show(s.root, on)
    if (on) s.draw(t)
  }
  return true
}
