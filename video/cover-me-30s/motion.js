// Motion helpers for stage.html. Classic script (file:// blocks module imports), so everything is global.
// Every function here is a pure function of time: seek(t) must paint the same frame every run.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a, b, k) => a + (b - a) * k

// Closed-form damped spring step response, 0 → 1, starting at t = 0.
// Presets: SNAP for buttons and leading edges, BASE for cards and camera,
// HEAVY for big type and logo lockups, PLAY for mascots (visible overshoot).
const SNAP = [320, 30], BASE = [170, 26], HEAVY = [90, 20], PLAY = [220, 14]
function spring(t, [k, d] = BASE) {
  if (t <= 0) return 0
  const w0 = Math.sqrt(k), z = d / (2 * w0)
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z)
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t))
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
}

// A value that changes target several times: one spring per change, summed.
// keys: [[time, value], ...] sorted by time. Frame 812 never needs frames 0 to 811.
function track(t, keys, s = BASE) {
  let v = keys[0][1]
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], s)
  return v
}

// Something that stretches as it moves (tab indicator, toggle knob): two edges on different springs.
function stretch(t, keys, width) {
  const lead = track(t, keys, SNAP), trail = track(t, keys, [140, 22])
  return { left: Math.min(lead, trail), right: Math.max(lead, trail) + width }
}

// Text inside a morphing container: in after the morph starts, out before the next one.
const swapAlpha = (t, tIn, tOut) => Math.min(clamp((t - tIn - 0.08) / 0.12), clamp((tOut - 0.1 - t) / 0.1))

// Seeded noise. Never Math.random: the render has to be identical every run.
function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

// Format and layout. Scenes position things in units of the short side (u) and
// check `portrait`, so 16:9, 9:16 and 1:1 are each composed, not cropped.
const FORMATS = { '16x9': [1920, 1080], '9x16': [1080, 1920], '1x1': [1080, 1080] }
const params = new URLSearchParams(location.search)
const FORMAT = FORMATS[params.get('format')] ? params.get('format') : '16x9'
const [W, H] = FORMATS[FORMAT]
const u = Math.min(W, H) / 100
const portrait = H > W

// Scene list: [{ from, to, draw(t, local) }]. draw gets global t and t since the scene started.
function playScenes(scenes, t) {
  for (const s of scenes) if (t >= s.from && t < s.to) s.draw(t, t - s.from)
}

// Element helpers: build once, style every frame.
const $ = (sel, root = document) => root.querySelector(sel)
function el(tag, style = {}, parent = $('#stage'), html = '') {
  const e = document.createElement(tag)
  Object.assign(e.style, { position: 'absolute', ...style })
  e.innerHTML = html
  parent.appendChild(e)
  return e
}
function show(e, on) { e.style.display = on ? '' : 'none' }
