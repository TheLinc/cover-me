import type { AppMode, AuthSession, CoverLetter, ParsedResume, ResumeData, Settings, TailoredHistoryEntry } from '../types'
import type { GenerationCount, ReviewAsk } from './review-ask'

export const HISTORY_LIMIT = 50

export async function getSettings(): Promise<Settings | null> {
  const { settings } = await chrome.storage.local.get('settings')
  return (settings as Settings) ?? null
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings })
}

// Installs from before modes existed saved only a key, so a key without a
// mode means BYOK (#16).
export function resolveMode(settings: Settings | null | undefined): AppMode {
  return settings?.mode ?? (settings?.apiKey ? 'byok' : 'hosted')
}

export async function getMode(): Promise<AppMode> {
  return resolveMode(await getSettings())
}

// A resume added while signed out isn't in the account, so it doesn't count
// for the welcome tab's resume step there (#108).
export function setupState(settings: Settings | null, session: AuthSession | null, resume: ResumeData | null): { ready: boolean; hasResume: boolean } {
  const account = resolveMode(settings) === 'hosted'
  return {
    ready: account ? !!session : !!settings?.apiKey,
    hasResume: !!resume?.text && !(account && session && resume.signedOutUpload),
  }
}

export function watchSetup(onChange: () => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && ['settings', 'session', 'resume'].some((k) => k in changes)) onChange()
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

export async function getResume(): Promise<ResumeData | null> {
  const { resume } = await chrome.storage.local.get('resume')
  return (resume as ResumeData) ?? null
}

export async function saveResume(resume: ResumeData): Promise<void> {
  await chrome.storage.local.set({ resume })
  await pruneDesignFiles()
}

export async function clearResume(): Promise<void> {
  await chrome.storage.local.remove('resume')
  await pruneDesignFiles()
}

export async function saveParsedResume(parsed: ParsedResume, text: string): Promise<void> {
  const resume = await getResume()
  if (resume?.text !== text) return
  await chrome.storage.local.set({ resume: { ...resume, parsed } })
}

export async function getHistory(): Promise<CoverLetter[]> {
  const { history } = await chrome.storage.local.get('history')
  return (history as CoverLetter[]) ?? []
}

export async function addToHistory(letter: CoverLetter): Promise<void> {
  const history = await getHistory()
  history.unshift(letter)
  await chrome.storage.local.set({ history: history.slice(0, HISTORY_LIMIT) })
  await countGeneration().catch(() => {}) // A rating-prompt count that fails must not fail a finished run (#96).
}

export async function saveHistory(letters: CoverLetter[]): Promise<void> {
  await chrome.storage.local.set({ history: letters.slice(0, HISTORY_LIMIT) })
}

export async function deleteFromHistory(id: string): Promise<void> {
  const history = await getHistory()
  await chrome.storage.local.set({ history: history.filter((l) => l.id !== id) })
}

// Tailored resumes are 5 to 15 KB each, so History keeps fewer of them than letters (#17).
export const TAILORED_HISTORY_LIMIT = 20

export async function getTailoredHistory(): Promise<TailoredHistoryEntry[]> {
  const { tailoredHistory } = await chrome.storage.local.get('tailoredHistory')
  return (tailoredHistory as TailoredHistoryEntry[]) ?? []
}

export async function addToTailoredHistory(entry: TailoredHistoryEntry): Promise<void> {
  const list = await getTailoredHistory()
  await chrome.storage.local.set({ tailoredHistory: [entry, ...list].slice(0, TAILORED_HISTORY_LIMIT) })
  await pruneDesignFiles().catch(() => {})
  await countGeneration().catch(() => {}) // A rating-prompt count that fails must not fail a finished run (#96).
}

export async function deleteFromTailoredHistory(id: string): Promise<void> {
  const list = await getTailoredHistory()
  await chrome.storage.local.set({ tailoredHistory: list.filter((e) => e.id !== id) })
  await pruneDesignFiles()
}

// The user's uploaded PDF and Word files (#131, #401), each under its fileId
// (lib/resume-file.ts), kept for as long as the resume or a History entry uses
// it, so an older entry still downloads in the design it was tailored in.
// Base64: storage holds JSON. parsed: Word only, the parse the upload check
// matched against, which places the tailored text later.
export interface DesignFile { data: string; parsed?: ParsedResume }

const designKey = (hash: string) => `designFile:${hash}`

export async function getDesignFile(hash: string): Promise<DesignFile | null> {
  const key = designKey(hash)
  const got = await chrome.storage.local.get(key)
  return (got[key] as DesignFile) ?? null
}

export async function saveDesignFile(hash: string, file: DesignFile): Promise<void> {
  await chrome.storage.local.set({ [designKey(hash)]: file, designFiles: [...new Set([...(await getDesignHashes()), hash])] })
}

// An index of stored files, so History can label an entry before loading its file (#131).
export async function getDesignHashes(): Promise<string[]> {
  const { designFiles } = await chrome.storage.local.get('designFiles')
  return (designFiles as string[]) ?? []
}

async function pruneDesignFiles(): Promise<void> {
  const [stored, resume, history] = await Promise.all([getDesignHashes(), getResume(), getTailoredHistory()])
  const inUse = new Set([resume?.design?.hash, resume?.file?.id, ...history.map((e) => e.resume.sourceHash)])
  const unused = stored.filter((h) => !inUse.has(h))
  if (unused.length === 0) return
  await chrome.storage.local.remove(unused.map(designKey))
  await chrome.storage.local.set({ designFiles: stored.filter((h) => inUse.has(h)) })
}

// Every successful generation goes through one of the two history adds, so
// they count it for the rating prompt (#96).
async function countGeneration(): Promise<void> {
  const gen = await getGenerationCount()
  await chrome.storage.local.set({ generationCount: { count: (gen?.count ?? 0) + 1, firstAt: gen?.firstAt ?? new Date().toISOString() } })
}

export async function getGenerationCount(): Promise<GenerationCount | null> {
  const { generationCount } = await chrome.storage.local.get('generationCount')
  return (generationCount as GenerationCount) ?? null
}

export async function getReviewAsk(): Promise<ReviewAsk | null> {
  const { reviewAsk } = await chrome.storage.local.get('reviewAsk')
  return (reviewAsk as ReviewAsk) ?? null
}

export async function saveReviewAsk(ask: ReviewAsk): Promise<void> {
  await chrome.storage.local.set({ reviewAsk: ask })
}

export async function getWhatsNew(): Promise<string | null> {
  const { whatsNew } = await chrome.storage.local.get('whatsNew')
  return (whatsNew as string) ?? null
}

export async function saveWhatsNew(version: string): Promise<void> {
  await chrome.storage.local.set({ whatsNew: version })
}

export async function clearWhatsNew(): Promise<void> {
  await chrome.storage.local.remove('whatsNew')
}

export async function isAnswersNewsSeen(): Promise<boolean> {
  const { answersNews } = await chrome.storage.local.get('answersNews')
  return answersNews === 'seen'
}

export async function markAnswersNewsSeen(): Promise<void> {
  await chrome.storage.local.set({ answersNews: 'seen' })
}

export async function setEntryAccounts(updates: { letters?: Record<string, string>; tailored?: Record<string, string> }): Promise<void> {
  // Write only the lists that change: the background may be adding to the
  // other one at the same moment (#24).
  const mark = <T extends { id: string; account?: string }>(list: T[], accounts: Record<string, string> = {}): T[] | null =>
    list.some((e) => accounts[e.id]) ? list.map((e) => (accounts[e.id] ? { ...e, account: accounts[e.id] } : e)) : null
  const write: Record<string, unknown> = {}
  if (updates.letters && Object.keys(updates.letters).length > 0) {
    const history = mark(await getHistory(), updates.letters)
    if (history) write.history = history
  }
  if (updates.tailored && Object.keys(updates.tailored).length > 0) {
    const tailoredHistory = mark(await getTailoredHistory(), updates.tailored)
    if (tailoredHistory) write.tailoredHistory = tailoredHistory
  }
  if (Object.keys(write).length > 0) await chrome.storage.local.set(write)
}

export async function getUploadAsked(): Promise<string[]> {
  const { uploadAsked } = await chrome.storage.local.get('uploadAsked')
  return (uploadAsked as string[]) ?? []
}

export async function markUploadAsked(userId: string): Promise<void> {
  const asked = await getUploadAsked()
  if (!asked.includes(userId)) await chrome.storage.local.set({ uploadAsked: [...asked, userId] })
}

export async function getSession(): Promise<AuthSession | null> {
  const { session } = await chrome.storage.local.get('session')
  return (session as AuthSession) ?? null
}

export async function saveSession(session: AuthSession): Promise<void> {
  await chrome.storage.local.set({ session })
}

export function watchSession(onChange: (session: AuthSession | null) => void): () => void {
  return watchLocalKey('session', (value) => onChange((value as AuthSession) ?? null))
}

export function watchGoogleSignInError(onError: (message: string) => void): () => void {
  return watchLocalKey('googleSignInError', (value) => { if (value) onError(value as string) })
}

export function watchResume(onChange: (resume: ResumeData | null) => void): () => void {
  return watchLocalKey('resume', (value) => onChange((value as ResumeData) ?? null))
}

function watchLocalKey(key: string, onChange: (newValue: unknown) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && key in changes) onChange(changes[key].newValue)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

// The worker saves the error because the popup that started Google sign-in
// may have closed by then (#16).
export async function saveGoogleSignInError(message: string): Promise<void> {
  await chrome.storage.local.set({ googleSignInError: message })
}

export async function takeGoogleSignInError(): Promise<string> {
  const { googleSignInError } = await chrome.storage.local.get('googleSignInError')
  if (googleSignInError) await chrome.storage.local.remove('googleSignInError')
  return (googleSignInError as string) ?? ''
}

// An untagged resume belonged to the account that was signed in. Tag it so
// the next account on this browser can't claim it (#16).
export async function clearSession(): Promise<void> {
  const [session, resume] = await Promise.all([getSession(), getResume()])
  if (session?.user?.id && resume?.text && !resume.accountId) {
    await saveResume({ ...resume, accountId: session.user.id })
  }
  // The tier belonged to that account, so the next one caches its own (#16).
  await chrome.storage.local.remove(['session', 'cachedTier'])
}

// "Remember me" used to keep an encrypted password here. The worker deletes any
// leftover copy on every install and update: https://github.com/TheLinc/cover-me/commit/0f03141b7f9e5edd2546d1be9bd0bc4b9a347dce
export async function clearSavedLogin(): Promise<void> {
  await chrome.storage.local.remove('savedLogin')
}

// Missing until the user decides. Only true sends the page copy, so a missing
// or unreadable value never does (#29).
export const PAGE_READ_KEY = 'pageReadAgreed'

export async function getPageReadChoice(): Promise<boolean | undefined> {
  const { pageReadAgreed } = await chrome.storage.local.get(PAGE_READ_KEY)
  return typeof pageReadAgreed === 'boolean' ? pageReadAgreed : undefined
}

export async function hasAgreedToPageRead(): Promise<boolean> {
  return (await getPageReadChoice()) === true
}

export async function setPageReadChoice(agreed: boolean): Promise<void> {
  await chrome.storage.local.set({ [PAGE_READ_KEY]: agreed })
}

export function watchPageReadChoice(cb: (agreed: boolean | undefined) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local' || !(PAGE_READ_KEY in changes)) return
    const next = changes[PAGE_READ_KEY].newValue
    cb(typeof next === 'boolean' ? next : undefined)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

// "Not now" lasts until the browser restarts, so it lives in session storage (#29).
export async function isPageReadNoticeSnoozed(): Promise<boolean> {
  const { pageReadNotNow } = await chrome.storage.session.get('pageReadNotNow')
  return pageReadNotNow === true
}

export async function snoozePageReadNotice(): Promise<void> {
  await chrome.storage.session.set({ pageReadNotNow: true })
}

export async function getCachedTier(): Promise<string | null> {
  const { cachedTier } = await chrome.storage.local.get('cachedTier')
  return (cachedTier as string) ?? null
}

export async function saveCachedTier(tier: string): Promise<void> {
  await chrome.storage.local.set({ cachedTier: tier })
}

// Kept apart from the per-job fields so "New" doesn't clear it:
// https://github.com/TheLinc/cover-me/commit/46f809a1dc946cf6964c9e2ad9a400323d9bada5
export async function getCandidateContext(): Promise<string> {
  const { candidateContext } = await chrome.storage.local.get('candidateContext')
  return (candidateContext as string) ?? ''
}

export async function saveCandidateContext(text: string): Promise<void> {
  await chrome.storage.local.set({ candidateContext: text })
}
