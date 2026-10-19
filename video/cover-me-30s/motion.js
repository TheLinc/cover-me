// Motion helpers for stage.html. Classic script (file:// blocks module imports), so everything is global.
// Every function here is a pure function of time: seek(t) must paint the same frame every run.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a, b, k) => a + (b - a) * k

// Closed-form damped spring step response, 0 → 1, starting at t = 0. [stiffness, damping]; SNAP is quick with a
// touch of overshoot, BASE (the default) is critically damped. Most moves in film.js pass their own pair.
const SNAP = [320, 30], BASE = [170, 26]
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

// Layout: 1920×1080, positions in units of 1% of the short side (u).
const [W, H] = [1920, 1080]
const u = Math.min(W, H) / 100
const params = new URLSearchParams(location.search)

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
