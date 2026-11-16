// The text box a right-click answer goes into (#232): its question, its
// character limit, typing the answer in, and the status box beside it.
import type { JobData } from '../types'
import logoUrl from '../public/icon/48.png?inline'

const clean = (s: string | null | undefined) =>
  (s ?? '').replace(/\s+/g, ' ').replace(/[\s*✱]+$/, '').trim()

// Text of an element without the form controls inside it (a label wrapped
// around its box would otherwise include the box's own text).
function textWithoutFields(el: Element): string {
  const copy = el.cloneNode(true) as Element
  copy.querySelectorAll('input, textarea, select, [contenteditable]').forEach((n) => n.remove())
  return clean(copy.textContent)
}

// The question a box asks: its label, aria-labelledby, aria-label, the
// nearest text above it, then its placeholder. '' when nothing names it.
export function fieldQuestion(el: HTMLElement): string {
  const root = el.getRootNode() as Document | ShadowRoot

  const ids = el.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? []
  const labelledBy = clean(ids.map((id) => root.getElementById?.(id)?.textContent ?? '').join(' '))
  if (labelledBy) return labelledBy

  const labels = [
    ...(el.id ? Array.from(root.querySelectorAll('label')).filter((l) => l.getAttribute('for') === el.id) : []),
    ...(el.closest('label') ? [el.closest('label')!] : []),
  ]
  for (const label of labels) {
    const text = textWithoutFields(label)
    if (text) return text
  }

  const ariaLabel = clean(el.getAttribute('aria-label'))
  if (ariaLabel) return ariaLabel

  // Lever and many custom forms: the question sits in an element before the
  // box's wrapper. A few levels up at most, so a far-off heading isn't taken.
  let node: Element | null = el
  for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
    for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
      const text = textWithoutFields(sib)
      if (text && text.length <= 500) return text
      if (text) break
    }
  }

  return clean(el.getAttribute('placeholder'))
}

// The box's character limit, when it sets one.
export function fieldMaxLength(el: HTMLElement): number | undefined {
  const n = Number.parseInt(el.getAttribute('maxlength') ?? '', 10)
  return n > 0 ? n : undefined
}

// ── In the page ──────────────────────────────────────────────────────────────
// Everything below runs in the injected page script and isn't unit-tested:
// it needs a real browser's focus, selection and execCommand.

type Job = JobData
type JobSource = 'page' | 'saved'

function deepActive(): HTMLElement | null {
  let el = document.activeElement as HTMLElement | null
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement as HTMLElement
  return el
}

// The box right-clicked: right-clicking a box focuses it, so it's the focused
// element (inside open shadow roots too).
function focusedField(): HTMLElement | null {
  const el = deepActive()
  if (!el) return null
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement || el.isContentEditable) return el
  return null
}

// Replaces the box's text with the answer as if typed: execCommand updates
// React-built forms and rich-text boxes, and the browser's undo (Ctrl+Z)
// brings back what was there. The value setter is the fallback for a box that
// refuses it, set through the prototype so React notices.
// false when the box is gone or won't take focus (re-rendered, or its form
// step hidden while the answer was written): then nothing is typed, rather
// than typing into whatever box has focus now. Focus goes back to the box the
// applicant moved on to while waiting, so their next keys don't land in the
// answer.
function typeAnswer(el: HTMLElement, text: string): boolean {
  const before = deepActive()
  el.focus()
  if (!el.isConnected || deepActive() !== el) return false
  const typed = insert(el, text)
  if (before && before !== el && before !== document.body && before.isConnected) before.focus()
  return typed
}

function insert(el: HTMLElement, text: string): boolean {
  const plain = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el : null
  if (plain) {
    plain.select()
  } else {
    const range = document.createRange()
    range.selectNodeContents(el)
    const selection = getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }
  if (document.execCommand('insertText', false, text)) return true
  if (plain) {
    const proto = plain instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(plain, text)
  } else {
    el.textContent = text
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}

// The popup's palette (src/popup/index.css), so the box reads as Cover Me on
// any page. Text sizes stay small: it sits on someone else's form.
const STYLE = `
:host { all: initial; }
.box { position: fixed; z-index: 2147483647; box-sizing: border-box; width: min(340px, calc(100vw - 16px));
  padding: 12px 12px 14px 14px; border-radius: 12px; overflow: hidden;
  background: #15132B; color: #EEEDF8; border: 1px solid #35315E;
  box-shadow: 0 1px 2px rgba(21,19,43,.35), 0 12px 32px rgba(21,19,43,.32);
  font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
.box ::selection { background: rgba(99,102,241,.45); color: #fff; }
.head { display: flex; gap: 10px; align-items: flex-start; }
.logo { flex: none; width: 20px; height: 20px; margin-top: -1px; border-radius: 5px; }
.title { flex: 1; margin: 0; font-weight: 600; }
.err .title { color: #FCA5A5; font-weight: 500; }
.note { margin: 6px 0 0 30px; color: #CFCCE6; }
.ask { margin: 10px 0 0 30px; padding-top: 10px; border-top: 1px solid #272449; }
.q { margin: 0; color: #EEEDF8; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.meta { margin: 4px 0 0; font-size: 12px; color: #A6A3C6; }
.meta .job { color: #AAB4FF; }
button { all: unset; cursor: pointer; flex: none; display: grid; place-items: center; width: 22px; height: 22px;
  margin: -2px -2px 0 0; border-radius: 6px; color: #A6A3C6; }
button:hover { background: #272449; color: #EEEDF8; }
button:focus-visible { outline: 2px solid #6366F1; outline-offset: 1px; color: #EEEDF8; }
label { display: block; margin: 10px 0 0 30px; color: #A6A3C6; font-size: 12px; }
select { display: block; width: 100%; box-sizing: border-box; margin-top: 4px; padding: 5px 8px; border-radius: 8px;
  border: 1px solid #35315E; background: #1C1A38; color: #EEEDF8; font: inherit; font-size: 13px; }
select:focus-visible { outline: 2px solid #6366F1; outline-offset: 1px; }
.bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: #35315E; overflow: hidden; }
.bar::after { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 45%; border-radius: 3px;
  background: linear-gradient(90deg, #6366F1, #AAB4FF);
  animation: slide 1.2s cubic-bezier(.65,0,.35,1) infinite alternate; }
@keyframes slide { from { transform: translateX(-15%); } to { transform: translateX(137%); } }
@media (prefers-reduced-motion: reduce) { .bar::after { animation: none; width: 100%; } }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
`

// The toolbar icon, bundled into the page script and drawn on a canvas: an
// <img> of an extension file would need web_accessible_resources (which lets
// any page detect Cover Me) and can be blocked by the page's img-src policy.
let logoBitmap: Promise<ImageBitmap | null> | null = null
function drawLogo(canvas: HTMLCanvasElement): void {
  const scale = Math.max(2, Math.ceil(devicePixelRatio || 1))
  canvas.width = canvas.height = 20 * scale
  logoBitmap ??= (async () => {
    try {
      const bytes = Uint8Array.from(atob(logoUrl.slice(logoUrl.indexOf(',') + 1)), (c) => c.charCodeAt(0))
      return await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    } catch {
      return null
    }
  })()
  void logoBitmap.then((bitmap) => {
    const ctx = canvas.getContext('2d')
    if (!bitmap || !ctx) return
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  })
}

function svgIcon(d: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', '12')
  svg.setAttribute('height', '12')
  svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS(ns, 'path')
  path.setAttribute('d', d)
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.75')
  path.setAttribute('stroke-linecap', 'round')
  svg.append(path)
  return svg
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag)
  if (className) n.className = className
  if (text !== undefined) n.textContent = text
  return n
}

let status: { host: HTMLElement; box: HTMLElement; onKey: (e: KeyboardEvent) => void } | null = null

function closeStatus(): void {
  if (!status) return
  document.removeEventListener('keydown', status.onKey, true)
  status.host.remove()
  status = null
}

interface StatusView {
  kind: 'working' | 'done' | 'error'
  title: string
  note?: string
  // What Cover Me read from the form, shown so the applicant can see it took
  // the right question (and job) before trusting the answer.
  question?: string
  maxLength?: number
  job?: Job
  pick?: { jobs: Job[]; current: number; onPick: (index: number) => void }
}

// The small status box by the field: working (with a loading bar), done (with
// the job used and a way to pick another) or an error. Text only goes in
// through textContent, since questions and job titles come from web pages.
function showStatus(anchor: HTMLElement | null, view: StatusView): void {
  // The box being replaced, if any, so the new one grows or shrinks from it.
  const from = status?.box.getBoundingClientRect()
  closeStatus()
  const host = document.createElement('cover-me-answer-status')
  const root = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = STYLE
  const box = node('div', view.kind === 'error' ? 'box err' : 'box')
  box.setAttribute('role', view.kind === 'error' ? 'alert' : 'status')
  if (view.kind === 'working') box.setAttribute('aria-busy', 'true')

  const head = node('div', 'head')
  const logo = node('canvas', 'logo')
  logo.setAttribute('aria-hidden', 'true')
  drawLogo(logo)
  const title = node('p', 'title')
  title.append(node('span', 'sr', 'Cover Me: '), view.title)
  const close = node('button', '')
  close.type = 'button'
  close.setAttribute('aria-label', 'Close')
  close.append(svgIcon('M4 4l8 8M12 4l-8 8'))
  close.addEventListener('click', closeStatus)
  head.append(logo, title, close)
  box.append(head)
  if (view.note) box.append(node('p', 'note', view.note))

  const picking = !!view.pick && view.pick.jobs.length > 1
  if (view.question) {
    const ask = node('div', 'ask')
    ask.append(node('p', 'q', `“${view.question}”`))
    const meta = node('p', 'meta')
    // With a picker the job shows in it, so the line keeps only the limit.
    if (view.job && !picking) meta.append(node('span', 'job', jobName(view.job)))
    if (view.maxLength) meta.append(`${meta.childNodes.length ? ' · ' : ''}${view.maxLength.toLocaleString()} characters max`)
    if (meta.childNodes.length) ask.append(meta)
    box.append(ask)
  }

  if (picking) {
    const pick = view.pick!
    const label = node('label', '', 'Written for')
    const select = document.createElement('select')
    pick.jobs.forEach((job, i) => {
      const option = document.createElement('option')
      option.value = String(i)
      option.textContent = jobName(job)
      option.selected = i === pick.current
      select.append(option)
    })
    select.addEventListener('change', () => pick.onPick(Number(select.value)))
    label.append(select)
    box.append(label)
  }

  if (view.kind === 'working') {
    const bar = node('div', 'bar')
    bar.setAttribute('aria-hidden', 'true')
    box.append(bar)
  }

  root.append(style, box)
  document.documentElement.append(host)

  // Under the box, kept on screen.
  const rect = anchor?.getBoundingClientRect()
  const top = rect ? Math.min(rect.bottom + 6, innerHeight - box.offsetHeight - 8) : 16
  const left = rect ? Math.min(rect.left, innerWidth - box.offsetWidth - 8) : 16
  box.style.top = `${Math.max(top, 8)}px`
  box.style.left = `${Math.max(left, 8)}px`

  // A new state in the same place (the job picker appearing, an error after
  // writing) eases from the old box's size instead of jumping to the new one.
  const to = box.getBoundingClientRect()
  if (from && Math.abs(from.left - to.left) < 1 && Math.abs(from.height - to.height) >= 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    box.animate(
      [{ top: `${from.top}px`, height: `${from.height}px` }, { top: `${to.top}px`, height: `${to.height}px` }],
      { duration: 280, easing: 'cubic-bezier(.16,1,.3,1)' },
    )
  }

  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeStatus() }
  document.addEventListener('keydown', onKey, true)
  status = { host, box, onKey }
}

const jobName = (job: Job) => (job.company && job.company !== 'Unknown Company' ? `${job.title} · ${job.company}` : job.title)
const undoKey = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘Z' : 'Ctrl+Z')

// Each right-click's box, by the id the background gives it: an answer can
// take half a minute, and another box may be right-clicked meanwhile.
interface Target { el: HTMLElement; question: string; maxLength?: number }
const targets = new Map<string, Target>()

const asked = (target: Target) => ({ question: target.question, maxLength: target.maxLength })

function done(target: Target, answer: string, jobs: Job[], index: number, jobSource: JobSource): void {
  if (!typeAnswer(target.el, answer)) {
    showStatus(null, { kind: 'error', title: 'The box changed while the answer was being written. Right-click it again.' })
    return
  }
  // The prompt leaves [blanks] for personal details only the applicant knows
  // (a start date, a salary).
  const notes = [
    jobSource === 'saved' && index === 0 ? 'No job posting on this page, so this uses your latest saved job.' : '',
    /\[[^\]]+\]/.test(answer) ? 'Fill in the parts in [brackets] before you submit.' : '',
    `${undoKey()} undoes it.`,
  ]
  showStatus(target.el, {
    kind: 'done', title: 'Answer added', note: notes.filter(Boolean).join(' '), ...asked(target), job: jobs[index],
    pick: { jobs, current: index, onPick: (i) => void rewrite(target, jobs, i, jobSource) },
  })
}

async function rewrite(target: Target, jobs: Job[], index: number, jobSource: JobSource): Promise<void> {
  const { el, question, maxLength } = target
  showStatus(el, { kind: 'working', title: 'Writing your answer…', ...asked(target), job: jobs[index] })
  const source: JobSource = jobSource === 'page' && index === 0 ? 'page' : 'saved'
  try {
    const result = await chrome.runtime.sendMessage({ type: 'ANSWER_REWRITE', request: { job: jobs[index], question, maxLength, jobSource: source } }) as { answer?: string; error?: string }
    if (result?.answer) done(target, result.answer, jobs, index, jobSource)
    else showStatus(el, { kind: 'error', title: result?.error ?? 'Could not write an answer. Please try again.', ...asked(target), job: jobs[index], pick: { jobs, current: index, onPick: (i) => void rewrite(target, jobs, i, jobSource) } })
  } catch {
    showStatus(el, { kind: 'error', title: 'Cover Me was updated or restarted. Right-click the box again.' })
  }
}

// Messages from the background (background/answer.ts).
export function handleAnswerMessage(message: Record<string, unknown>, sendResponse: (r: unknown) => void): void {
  const jobs = (message.jobs as Job[] | undefined) ?? []
  const jobSource = (message.jobSource as JobSource | undefined) ?? 'page'
  const id = message.id as string | undefined
  const target = id ? targets.get(id) : undefined
  switch (message.type) {
    case 'ANSWER_START': {
      const el = focusedField()
      if (!el) {
        showStatus(null, { kind: 'error', title: 'Click into the text box first, then right-click it and choose "Cover Me: write an answer".' })
        return sendResponse({ ok: false })
      }
      const question = fieldQuestion(el)
      if (!question) {
        showStatus(el, { kind: 'error', title: "Cover Me couldn't find this box's question on the page." })
        return sendResponse({ ok: false })
      }
      const maxLength = fieldMaxLength(el)
      if (id) targets.set(id, { el, question, maxLength })
      showStatus(el, { kind: 'working', title: 'Reading the job posting…', question, maxLength })
      return sendResponse({ ok: true, question, maxLength })
    }
    case 'ANSWER_STATUS':
      showStatus(target?.el ?? null, { kind: 'working', title: 'Writing your answer…', ...(target && asked(target)), job: message.job as Job })
      return sendResponse({})
    case 'ANSWER_DONE':
      if (target) done(target, message.answer as string, jobs, 0, jobSource)
      return sendResponse({})
    case 'ANSWER_ERROR':
      showStatus(target?.el ?? null, {
        kind: 'error', title: message.error as string, ...(target && asked(target)), job: jobs[0],
        pick: target ? { jobs, current: 0, onPick: (i) => void rewrite(target, jobs, i, jobSource) } : undefined,
      })
      return sendResponse({})
  }
}
