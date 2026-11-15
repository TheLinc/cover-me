// Right-click "Cover Me: write an answer" on any text box (#232). The page
// script (content/answer-field.ts) reads the box's question and limit, the
// answer is written here (own key, or the account's answer allowance), and
// the page script types it in.
import { answerViaBackend, ensureValidSession } from '../lib/auth'
import { buildAnswerPrompt, finishAnswer } from '../lib/ai/answer'
import { callClaude } from '../lib/ai/claude'
import { callOpenAI } from '../lib/ai/openai'
import { decryptApiKey } from '../lib/crypto'
import { jobKey, recentJobs } from '../lib/history'
import { getCandidateContext, getHistory, getResume, getSession, getSettings, getTailoredHistory, resolveMode } from '../lib/storage'
import type { JobData } from '../types'

export const ANSWER_MENU_ID = 'cover-me-answer'

// Menus outlive the service worker; recreated on install and update.
export function registerAnswerMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: ANSWER_MENU_ID, title: 'Cover Me: write an answer', contexts: ['editable'] })
  })
}

export type AnswerResult = { answer: string } | { error: string }

export interface AnswerRequest {
  job: JobData
  question: string
  maxLength?: number
  jobSource: 'page' | 'saved'
}

export async function writeAnswer({ job, question, maxLength, jobSource }: AnswerRequest): Promise<AnswerResult> {
  try {
    const settings = await getSettings()
    const supplemental = (await getCandidateContext()).trim() || undefined
    if (resolveMode(settings) === 'hosted') {
      const session = await ensureValidSession()
      if (!session) return { error: 'Sign in to your Cover Me account: open Cover Me from the toolbar, then Settings.' }
      return { answer: await answerViaBackend(session.access_token, { job, question, maxLength, supplemental, jobSource }) }
    }
    if (!settings?.apiKey) return { error: 'No API key set. Open Cover Me from the toolbar, then Settings, to add your key.' }
    const resume = await getResume()
    if (!resume?.text) return { error: 'No resume uploaded. Open Cover Me from the toolbar to upload yours.' }
    const apiKey = await decryptApiKey(settings.apiKey)
    const prompt = buildAnswerPrompt(job, resume.text, question, maxLength, supplemental)
    const text = `${prompt.context}\n\n${prompt.question}`
    const raw = settings.provider === 'claude' ? await callClaude(text, apiKey) : await callOpenAI(text, apiKey)
    const answer = finishAnswer(raw, maxLength)
    return answer ? { answer } : { error: 'Empty response from AI. Please try again.' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not write an answer. Please try again.' }
  }
}

// The menu click: read the box, find the job (this page's posting, else the
// latest saved job), write, and send the answer back to type in.
export async function handleAnswerClick(
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab | undefined,
  scrapeTab: (tabId: number, opts: { forAnswer: true }) => Promise<JobData>,
  contentScript: string,
): Promise<void> {
  const tabId = tab?.id
  if (info.menuItemId !== ANSWER_MENU_ID || tabId === undefined) return
  const frameId = info.frameId ?? 0
  const send = (message: Record<string, unknown>) => chrome.tabs.sendMessage(tabId, message, { frameId })

  let field: { ok: boolean; question?: string; maxLength?: number }
  try {
    await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, files: [contentScript] })
    field = await send({ type: 'ANSWER_START' })
  } catch {
    // A frame Chrome won't let the extension into (another site's embed).
    // Say so in the page itself, where possible.
    if (frameId !== 0) {
      await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: [contentScript] }).catch(() => {})
      await chrome.tabs.sendMessage(tabId, { type: 'ANSWER_ERROR', error: "Cover Me can't reach this box: it's inside a frame from another site." }, { frameId: 0 }).catch(() => {})
    }
    return
  }
  if (!field.ok || !field.question) return // the page script has said why

  const page = await scrapeTab(tabId, { forAnswer: true }).catch(() => null)
  const saved = recentJobs(await getHistory(), await getTailoredHistory(), (await getSession())?.user?.id)
  const jobs = page ? [page, ...saved.filter((j) => jobKey(j) !== jobKey(page))] : saved
  const job = jobs[0]
  if (!job) {
    await send({ type: 'ANSWER_ERROR', error: "There's no job posting on this page and no saved jobs yet. Open Cover Me from the toolbar on the job posting first." }).catch(() => {})
    return
  }
  const jobSource = page ? 'page' : 'saved'
  await send({ type: 'ANSWER_STATUS', job, jobSource }).catch(() => {})

  const result = await writeAnswer({ job, question: field.question, maxLength: field.maxLength, jobSource })
  await send('answer' in result
    ? { type: 'ANSWER_DONE', answer: result.answer, job, jobs, jobSource }
    : { type: 'ANSWER_ERROR', error: result.error, job, jobs, jobSource }).catch(() => {})
}
