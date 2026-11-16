// The text box a right-click answer goes into (#232): its question, its
// character limit, typing the answer in, and the status box beside it.
import type { JobData } from '../types'
import type { AnswerRevision } from '../lib/ai/answer'
import type { AnswerAllowance } from '../lib/auth'
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
.hint { margin-left: 6px; font-weight: 400; font-size: 12px; color: #A6A3C6; white-space: nowrap; }
.err .title { color: #FCA5A5; font-weight: 500; }
.note { margin: 6px 0 0 30px; color: #CFCCE6; }
.ask { margin: 10px 0 0 30px; padding-top: 10px; border-top: 1px solid #272449; }
.q { margin: 0; color: #EEEDF8; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.meta { margin: 4px 0 0; font-size: 12px; color: #A6A3C6; }
.meta .job { color: #AAB4FF; }
button { all: unset; cursor: pointer; box-sizing: border-box; }
button:focus-visible { outline: 2px solid #6366F1; outline-offset: 1px; color: #EEEDF8; }
.close { flex: none; display: grid; place-items: center; width: 22px; height: 22px;
  margin: -2px -2px 0 0; border-radius: 6px; color: #A6A3C6; }
.close:hover { background: #272449; color: #EEEDF8; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 0 30px; }
.chip { padding: 3px 10px; border: 1px solid #35315E; border-radius: 999px; background: #1C1A38;
  color: #CFCCE6; font-size: 12px; line-height: 18px; }
.chip:hover { background: #272449; border-color: #4A4580; color: #EEEDF8; }
.change { display: flex; align-items: center; margin: 8px 0 0 30px; border: 1px solid #35315E; border-radius: 8px; background: #1C1A38; }
.change:focus-within { border-color: #6366F1; box-shadow: 0 0 0 1px #6366F1; }
.change input { all: unset; flex: 1; min-width: 0; padding: 6px 8px; font-size: 13px; color: #EEEDF8; }
.change input::placeholder { color: #A6A3C6; }
.send { flex: none; display: grid; place-items: center; width: 26px; height: 26px; margin-right: 2px; border-radius: 6px; color: #AAB4FF; }
.send:hover { background: #272449; }
.send:disabled { color: #6B6894; cursor: default; background: none; }
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

let status: { host: HTMLElement; box: HTMLElement; stop: () => void } | null = null

function closeStatus(): void {
  if (!status) return
  status.stop()
  status.host.remove()
  status = null
}

// Under the field, or above it when there's no room below, so it reads as
// part of that field. It moves with the field as the page (or a scrolling
// panel) scrolls: off screen with it, and back. A field taller than the
// screen keeps the box at the bottom edge while any of it shows.
function place(anchor: HTMLElement | null, box: HTMLElement): void {
  if (anchor && !anchor.isConnected) return
  const rect = anchor?.getBoundingClientRect()
  if (!rect) {
    box.style.top = box.style.left = '16px'
    return
  }
  const h = box.offsetHeight
  const below = rect.bottom + 6
  const above = rect.top - 6 - h
  const onScreen = rect.bottom > 0 && rect.top < innerHeight
  const top = below + h <= innerHeight - 8 ? below : above >= 8 ? above : onScreen ? Math.max(8, innerHeight - h - 8) : below
  box.style.top = `${top}px`
  box.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - box.offsetWidth - 8))}px`
}

interface StatusView {
  kind: 'working' | 'done' | 'error'
  title: string
  // A short aside after the title, on the same line (the undo key).
  hint?: string
  note?: string
  // What Cover Me read from the form, shown so the applicant can see it took
  // the right question (and job) before trusting the answer.
  question?: string
  maxLength?: number
  job?: Job
  pick?: { jobs: Job[]; current: number; onPick: (index: number) => void }
  // Asks for a change to the answer in the box (quick options or typed);
  // shown: what the box says it's doing (the option's label, or the text).
  revise?: (request: string, shown: string) => void
}

// The quick changes, and what each one asks the model for.
const QUICK_CHANGES: Array<[label: string, request: string]> = [
  ['Shorter', 'Make it shorter: about half the length, keeping the strongest point.'],
  ['More specific', 'Make it more specific: use the most concrete details the resume gives.'],
  ['Another example', 'Use a different example from the resume.'],
]

function changeControls(revise: (request: string, shown: string) => void): HTMLElement[] {
  const chips = node('div', 'chips')
  for (const [label, request] of QUICK_CHANGES) {
    const chip = node('button', 'chip', label)
    chip.type = 'button'
    chip.addEventListener('click', () => revise(request, label))
    chips.append(chip)
  }
  const form = node('form', 'change')
  const input = node('input', '')
  input.type = 'text'
  input.maxLength = 500
  input.placeholder = 'Ask for a change…'
  input.setAttribute('aria-label', 'Ask for a change to the answer')
  const send = node('button', 'send')
  send.type = 'submit'
  send.disabled = true
  send.setAttribute('aria-label', 'Rewrite the answer')
  send.append(svgIcon('M3 8h10M9 4l4 4-4 4'))
  input.addEventListener('input', () => { send.disabled = !input.value.trim() })
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (input.value.trim()) revise(input.value.trim(), `“${input.value.trim()}”`)
  })
  form.append(input, send)
  return [chips, form]
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
  // Keys typed in the change box don't bubble on to the page's own shortcut
  // handlers (a "/" that jumps to search). Best effort: a page listening in
  // the capture phase still sees them first, and nothing in a content script
  // can stop that.
  for (const type of ['keydown', 'keyup', 'keypress']) box.addEventListener(type, (e) => e.stopPropagation())

  const head = node('div', 'head')
  const logo = node('canvas', 'logo')
  logo.setAttribute('aria-hidden', 'true')
  drawLogo(logo)
  const title = node('p', 'title')
  title.append(node('span', 'sr', 'Cover Me: '), view.title)
  if (view.hint) title.append(node('span', 'hint', view.hint))
  const close = node('button', 'close')
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

  if (view.revise) box.append(...changeControls(view.revise))

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

  place(anchor, box)

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
  // Capture catches scrolling inside panels and modals too; one move a frame.
  let frame = 0
  const follow = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; place(anchor, box) }) }
  document.addEventListener('keydown', onKey, true)
  addEventListener('scroll', follow, { capture: true, passive: true })
  addEventListener('resize', follow, { passive: true })
  // A tab or step switch (Ashby's Overview and Application) fires no scroll:
  // check the field itself. Gone from the page: the box closes. Only hidden:
  // the box hides with it, and comes back when the field does.
  const watch = anchor && setInterval(() => {
    if (!anchor.isConnected) return closeStatus()
    const shown = anchor.checkVisibility()
    box.style.visibility = shown ? '' : 'hidden'
    if (shown) place(anchor, box)
  }, 250)
  status = {
    host, box,
    stop: () => {
      document.removeEventListener('keydown', onKey, true)
      removeEventListener('scroll', follow, { capture: true })
      removeEventListener('resize', follow)
      cancelAnimationFrame(frame)
      if (watch) clearInterval(watch)
    },
  }
}

const jobName = (job: Job) => (job.company && job.company !== 'Unknown Company' ? `${job.title} · ${job.company}` : job.title)
const undoKey = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘Z' : 'Ctrl+Z')

// Each right-click's box, by the id the background gives it: an answer can
// take half a minute, and another box may be right-clicked meanwhile.
interface Target { el: HTMLElement; question: string; maxLength?: number }
const targets = new Map<string, Target>()

const asked = (target: Target) => ({ question: target.question, maxLength: target.maxLength })

// What the account has left, after the answer just written. Pro's 50 a day
// only shows once it runs low.
export function answersLeft(a?: AnswerAllowance): string {
  if (!a) return ''
  const n = a.remaining
  const answers = n === 1 ? 'answer' : 'answers'
  if (a.kind === 'daily') return n <= 10 ? `${n} ${answers} left today.` : ''
  if (a.kind === 'starter') return `${n} of your first ${a.limit} free answers left.`
  return n === 0 ? "That was this week's last free answer. More on Monday." : `${n} free ${answers} left this week.`
}

function done(target: Target, answer: string, jobs: Job[], index: number, jobSource: JobSource, allowance?: AnswerAllowance): void {
  if (!typeAnswer(target.el, answer)) {
    showStatus(null, { kind: 'error', title: 'The box changed while the answer was being written. Right-click it again.' })
    return
  }
  // The prompt leaves [blanks] for personal details only the applicant knows
  // (a start date, a salary).
  const notes = [
    jobSource === 'saved' && index === 0 ? 'No job posting on this page, so this uses your latest saved job.' : '',
    /\[[^\]]+\]/.test(answer) ? 'Fill in the parts in [brackets] before you submit.' : '',
    answersLeft(allowance),
  ]
  showStatus(target.el, {
    kind: 'done', title: 'Answer added', hint: `${undoKey()} to undo`, note: notes.filter(Boolean).join(' ') || undefined, ...asked(target), job: jobs[index],
    pick: { jobs, current: index, onPick: (i) => void rewrite(target, jobs, i, jobSource) },
    revise: reviser(target, answer, jobs, index, jobSource),
  })
}

// A change revises what's in the box now, so the applicant's own edits stay;
// if they cleared it (Ctrl+Z), the answer Cover Me last typed. innerText for
// a rich-text box, so its paragraphs keep their breaks.
const reviser = (target: Target, answer: string, jobs: Job[], index: number, jobSource: JobSource) => (request: string, shown: string) => {
  const now = (target.el instanceof HTMLInputElement || target.el instanceof HTMLTextAreaElement ? target.el.value : target.el.innerText ?? '').trim()
  void rewrite(target, jobs, index, jobSource, { previous: now || answer, request }, shown)
}

async function rewrite(target: Target, jobs: Job[], index: number, jobSource: JobSource, revision?: AnswerRevision, shown?: string): Promise<void> {
  const { el, question, maxLength } = target
  // The form moved on (its next step, a re-render): nothing to type into, so
  // nothing is sent and no answer is used up.
  if (!el.isConnected) {
    showStatus(null, { kind: 'error', title: 'That box is no longer on the page. Right-click it again.' })
    return
  }
  showStatus(el, { kind: 'working', title: revision ? 'Rewriting your answer…' : 'Writing your answer…', note: shown && `Change: ${shown}`, ...asked(target), job: jobs[index] })
  const source: JobSource = jobSource === 'page' && index === 0 ? 'page' : 'saved'
  try {
    const result = await chrome.runtime.sendMessage({ type: 'ANSWER_REWRITE', request: { job: jobs[index], question, maxLength, jobSource: source, revision } }) as { answer?: string; allowance?: AnswerAllowance; error?: string }
    if (result?.answer) done(target, result.answer, jobs, index, jobSource, result.allowance)
    else {
      showStatus(el, {
        kind: 'error', title: result?.error ?? 'Could not write an answer. Please try again.', ...asked(target), job: jobs[index],
        pick: { jobs, current: index, onPick: (i) => void rewrite(target, jobs, i, jobSource) },
        // A failed change can be tried again, from what's in the box by then.
        revise: revision ? reviser(target, revision.previous, jobs, index, jobSource) : undefined,
      })
    }
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
      if (target) done(target, message.answer as string, jobs, 0, jobSource, message.allowance as AnswerAllowance | undefined)
      return sendResponse({})
    case 'ANSWER_ERROR':
      showStatus(target?.el ?? null, {
        kind: 'error', title: message.error as string, ...(target && asked(target)), job: jobs[0],
        pick: target ? { jobs, current: 0, onPick: (i) => void rewrite(target, jobs, i, jobSource) } : undefined,
      })
      return sendResponse({})
  }
}
