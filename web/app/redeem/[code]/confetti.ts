// A one-off confetti burst from a point on screen (the redeem button), drawn
// on a throwaway full-screen canvas that never takes clicks. Skipped for
// people who ask for reduced motion.

// Brand indigos plus the orange accent (the palette in globals.css).
const COLORS = ['#6366F1', '#4F46E5', '#4338CA', '#F97316', '#FDBA74']
const COUNT = 140
const GRAVITY = 0.32
const DRAG = 0.985
const LIFE_MS = 2600

export function confettiFrom(x: number, y: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const dpr = window.devicePixelRatio || 1
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:100'
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  // Mostly upward, fanned out: angle around straight up, a spread of speeds.
  const pieces = Array.from({ length: COUNT }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9
    const speed = 7 + Math.random() * 11
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 6 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      spin: Math.random() * Math.PI,
      vspin: (Math.random() - 0.5) * 0.35,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }
  })

  const start = performance.now()
  let last = start
  function frame(now: number) {
    const t = (now - start) / LIFE_MS
    // Steps in 60fps frames, so a 120Hz screen (or a throttled tab) runs the same speed.
    const dt = Math.min(4, (now - last) / (1000 / 60))
    last = now
    const drag = DRAG ** dt
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 0.6) / 0.4) // fade over the last 40%
    for (const p of pieces) {
      p.vx *= drag
      p.vy = p.vy * drag + GRAVITY * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.spin += p.vspin * dt
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.spin)
      ctx.scale(1, Math.cos(p.spin * 2)) // flutter: the piece turns edge-on and back
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    if (t < 1) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}
