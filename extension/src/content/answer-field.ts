// The text box a right-click answer goes into (#232): its question, its
// character limit, typing the answer in, and the status box beside it.

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

interface Job { title: string; company: string; description: string; url: string }
type JobSource = 'page' | 'saved'

// The box right-clicked: right-clicking a box focuses it, so it's the focused
// element (inside open shadow roots too).
function focusedField(): HTMLElement | null {
  let el = document.activeElement as HTMLElement | null
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement as HTMLElement
  if (!el) return null
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement || el.isContentEditable) return el
  return null
}

// Replaces the box's text with the answer as if typed: execCommand updates
// React-built forms and rich-text boxes, and the browser's undo (Ctrl+Z)
// brings back what was there. The value setter is the fallback for a box that
// refuses it, set through the prototype so React notices.
function typeAnswer(el: HTMLElement, text: string): void {
  el.focus()
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
  if (document.execCommand('insertText', false, text)) return
  if (plain) {
    const proto = plain instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(plain, text)
  } else {
    el.textContent = text
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

const STYLE = `
:host { all: initial; }
.box { position: fixed; z-index: 2147483647; box-sizing: border-box; width: min(360px, calc(100vw - 16px));
  padding: 10px 12px; border-radius: 10px; background: #18181b; color: #fafafa; border: 1px solid #3f3f46;
  box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35);
  font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
.row { display: flex; gap: 8px; align-items: flex-start; }
.brand { font-weight: 600; color: #a5b4fc; flex: none; }
.msg { flex: 1; margin: 0; }
.err .brand { color: #fca5a5; }
button { all: unset; cursor: pointer; flex: none; width: 20px; height: 20px; text-align: center; border-radius: 4px; color: #a1a1aa; }
button:hover, button:focus-visible { background: #27272a; color: #fafafa; outline: 2px solid #6366f1; }
label { display: block; margin-top: 8px; color: #a1a1aa; font-size: 12px; }
select { display: block; width: 100%; margin-top: 4px; padding: 4px 6px; border-radius: 6px; border: 1px solid #3f3f46;
  background: #27272a; color: #fafafa; font: inherit; }
`

let status: { host: HTMLElement; onKey: (e: KeyboardEvent) => void } | null = null

function closeStatus(): void {
  if (!status) return
  document.removeEventListener('keydown', status.onKey, true)
  status.host.remove()
  status = null
}

// The small status box by the field: working, done (with the job used and a
// way to pick another) or an error. Text only goes in through textContent,
// since job titles come from web pages.
function showStatus(
  anchor: HTMLElement | null,
  kind: 'working' | 'done' | 'error',
  message: string,
  pick?: { jobs: Job[]; current: number; onPick: (index: number) => void },
): void {
  closeStatus()
  const host = document.createElement('cover-me-answer-status')
  const root = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = STYLE
  const box = document.createElement('div')
  box.className = kind === 'error' ? 'box err' : 'box'
  box.setAttribute('role', kind === 'error' ? 'alert' : 'status')

  const row = document.createElement('div')
  row.className = 'row'
  const brand = document.createElement('span')
  brand.className = 'brand'
  brand.textContent = 'Cover Me'
  const msg = document.createElement('p')
  msg.className = 'msg'
  msg.textContent = message
  const close = document.createElement('button')
  close.type = 'button'
  close.setAttribute('aria-label', 'Close')
  close.textContent = '×'
  close.addEventListener('click', closeStatus)
  row.append(brand, msg, close)
  box.append(row)

  if (pick && pick.jobs.length > 1) {
    const label = document.createElement('label')
    label.textContent = 'Use another job'
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

  root.append(style, box)
  document.documentElement.append(host)

  // Under the box, kept on screen.
  const rect = anchor?.getBoundingClientRect()
  const top = rect ? Math.min(rect.bottom + 6, innerHeight - box.offsetHeight - 8) : 16
  const left = rect ? Math.min(rect.left, innerWidth - box.offsetWidth - 8) : 16
  box.style.top = `${Math.max(top, 8)}px`
  box.style.left = `${Math.max(left, 8)}px`

  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeStatus() }
  document.addEventListener('keydown', onKey, true)
  status = { host, onKey }
}

const jobName = (job: Job) => (job.company && job.company !== 'Unknown Company' ? `${job.title} at ${job.company}` : job.title)
const undoKey = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘Z' : 'Ctrl+Z')

let target: { el: HTMLElement; question: string; maxLength?: number } | null = null

function done(answer: string, jobs: Job[], index: number, jobSource: JobSource): void {
  if (!target) return
  typeAnswer(target.el, answer)
  const job = jobs[index]
  const message = jobSource === 'saved' && index === 0
    ? `No job posting on this page, so this answer uses your latest saved job: ${jobName(job)}. ${undoKey()} undoes it.`
    : `Answer added for ${jobName(job)}. ${undoKey()} undoes it.`
  showStatus(target.el, 'done', message, { jobs, current: index, onPick: (i) => void rewrite(jobs, i, jobSource) })
}

async function rewrite(jobs: Job[], index: number, jobSource: JobSource): Promise<void> {
  if (!target) return
  const { el, question, maxLength } = target
  showStatus(el, 'working', `Writing an answer for ${jobName(jobs[index])}…`)
  const source: JobSource = jobSource === 'page' && index === 0 ? 'page' : 'saved'
  try {
    const result = await chrome.runtime.sendMessage({ type: 'ANSWER_REWRITE', request: { job: jobs[index], question, maxLength, jobSource: source } }) as { answer?: string; error?: string }
    if (result?.answer) done(result.answer, jobs, index, jobSource)
    else showStatus(el, 'error', result?.error ?? 'Could not write an answer. Please try again.', { jobs, current: index, onPick: (i) => void rewrite(jobs, i, jobSource) })
  } catch {
    showStatus(el, 'error', 'Cover Me was updated or restarted. Right-click the box again.')
  }
}

// Messages from the background (background/answer.ts).
export function handleAnswerMessage(message: Record<string, unknown>, sendResponse: (r: unknown) => void): void {
  const jobs = (message.jobs as Job[] | undefined) ?? []
  const jobSource = (message.jobSource as JobSource | undefined) ?? 'page'
  switch (message.type) {
    case 'ANSWER_START': {
      const el = focusedField()
      if (!el) {
        showStatus(null, 'error', 'Click into the text box first, then right-click it and choose "Cover Me: write an answer".')
        return sendResponse({ ok: false })
      }
      const question = fieldQuestion(el)
      if (!question) {
        showStatus(el, 'error', "Cover Me couldn't find this box's question on the page.")
        return sendResponse({ ok: false })
      }
      target = { el, question, maxLength: fieldMaxLength(el) }
      showStatus(el, 'working', 'Reading the job posting…')
      return sendResponse({ ok: true, question, maxLength: target.maxLength })
    }
    case 'ANSWER_STATUS':
      showStatus(target?.el ?? null, 'working', `Writing an answer for ${jobName(message.job as Job)}…`)
      return sendResponse({})
    case 'ANSWER_DONE':
      done(message.answer as string, jobs, 0, jobSource)
      return sendResponse({})
    case 'ANSWER_ERROR':
      showStatus(target?.el ?? null, 'error', message.error as string,
        jobs.length > 1 ? { jobs, current: 0, onPick: (i) => void rewrite(jobs, i, jobSource) } : undefined)
      return sendResponse({})
  }
}
