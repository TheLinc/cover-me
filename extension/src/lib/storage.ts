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

// The one place the default mode is decided. New installs get the free hosted
// account; anyone who saved a mode (or, before modes existed, a key) keeps it.
export function resolveMode(settings: Settings | null | undefined): AppMode {
  return settings?.mode ?? (settings?.apiKey ? 'byok' : 'hosted')
}

export async function getMode(): Promise<AppMode> {
  return resolveMode(await getSettings())
}

// The welcome tab's progress. Step 1 is done once signed in to the account or
// an API key is saved. Step 2 is done once there's a resume to use; a copy
// added while signed out isn't in the signed-in account, so it doesn't count there.
export function setupState(settings: Settings | null, session: AuthSession | null, resume: ResumeData | null): { ready: boolean; hasResume: boolean } {
  const account = resolveMode(settings) === 'hosted'
  return {
    ready: account ? !!session : !!settings?.apiKey,
    hasResume: !!resume?.text && !(account && session && resume.signedOutUpload),
  }
}

// Calls back when anything setupState reads changes: a sign-in, sign-out,
// key save, mode switch or resume upload.
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
}

export async function saveParsedResume(parsed: ParsedResume): Promise<void> {
  const { resume } = await chrome.storage.local.get('resume')
  if (!resume) return
  await chrome.storage.local.set({ resume: { ...(resume as object), parsed } })
}

export async function getHistory(): Promise<CoverLetter[]> {
  const { history } = await chrome.storage.local.get('history')
  return (history as CoverLetter[]) ?? []
}

export async function addToHistory(letter: CoverLetter): Promise<void> {
  const history = await getHistory()
  history.unshift(letter)
  await chrome.storage.local.set({ history: history.slice(0, HISTORY_LIMIT) })
  await countGeneration().catch(() => {}) // a missed count must not fail a finished run
}

export async function saveHistory(letters: CoverLetter[]): Promise<void> {
  await chrome.storage.local.set({ history: letters.slice(0, HISTORY_LIMIT) })
}

export async function deleteFromHistory(id: string): Promise<void> {
  const history = await getHistory()
  await chrome.storage.local.set({ history: history.filter((l) => l.id !== id) })
}

// Tailored resumes are 5–15 KB each, so fewer are kept than letters.
export const TAILORED_HISTORY_LIMIT = 20

export async function getTailoredHistory(): Promise<TailoredHistoryEntry[]> {
  const { tailoredHistory } = await chrome.storage.local.get('tailoredHistory')
  return (tailoredHistory as TailoredHistoryEntry[]) ?? []
}

export async function addToTailoredHistory(entry: TailoredHistoryEntry): Promise<void> {
  const list = await getTailoredHistory()
  await chrome.storage.local.set({ tailoredHistory: [entry, ...list].slice(0, TAILORED_HISTORY_LIMIT) })
  await pruneDesignFiles().catch(() => {})
  await countGeneration().catch(() => {}) // a missed count must not fail a finished run
}

export async function deleteFromTailoredHistory(id: string): Promise<void> {
  const list = await getTailoredHistory()
  await chrome.storage.local.set({ tailoredHistory: list.filter((e) => e.id !== id) })
  await pruneDesignFiles()
}

// The user's own Word files (#131), each under the SHA-256 of its bytes, kept
// for as long as the resume or a History entry uses it, so an older entry
// still downloads in the design it was tailored in. Base64: storage holds JSON.
// parsed: the parse the upload check matched against, which places the
// tailored text later.
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

// Which files are stored, so History can label an entry before loading its file.
export async function getDesignHashes(): Promise<string[]> {
  const { designFiles } = await chrome.storage.local.get('designFiles')
  return (designFiles as string[]) ?? []
}

async function pruneDesignFiles(): Promise<void> {
  const [stored, resume, history] = await Promise.all([getDesignHashes(), getResume(), getTailoredHistory()])
  const inUse = new Set([resume?.design?.hash, ...history.map((e) => e.resume.sourceHash)])
  const unused = stored.filter((h) => !inUse.has(h))
  if (unused.length === 0) return
  await chrome.storage.local.remove(unused.map(designKey))
  await chrome.storage.local.set({ designFiles: stored.filter((h) => inUse.has(h)) })
}

// Every successful generation lands in one of the two history lists above, so
// they count it for the rating prompt (lib/review-ask.ts). Local only.
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

// Marks local entries with the account that holds them (see CoverLetter.account).
export async function setEntryAccounts(updates: { letters?: Record<string, string>; tailored?: Record<string, string> }): Promise<void> {
  // Only the lists that change are written: the background may be adding to
  // the other one at the same moment.
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

// Accounts that answered the "save these to your account?" prompt (Save or
// Not now). They get the quiet link instead of the prompt from then on.
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

// Calls back when the saved session changes in another context: the worker
// finishing Google sign-in, or a sign-in or sign-out in the popup while the
// welcome tab is open. Returns the unsubscribe function.
export function watchSession(onChange: (session: AuthSession | null) => void): () => void {
  return watchLocalKey('session', (value) => onChange((value as AuthSession) ?? null))
}

// Calls back when the worker saves a Google sign-in error, for a panel that
// opened while Google's window was still up.
export function watchGoogleSignInError(onError: (message: string) => void): () => void {
  return watchLocalKey('googleSignInError', (value) => { if (value) onError(value as string) })
}

// Calls back when the resume changes elsewhere, e.g. a sign-in downloading the
// account's copy while the welcome tab shows the upload step.
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

// A Google sign-in error the worker saved because the popup that started the
// flow had already closed. Returned once, then removed.
export async function saveGoogleSignInError(message: string): Promise<void> {
  await chrome.storage.local.set({ googleSignInError: message })
}

export async function takeGoogleSignInError(): Promise<string> {
  const { googleSignInError } = await chrome.storage.local.get('googleSignInError')
  if (googleSignInError) await chrome.storage.local.remove('googleSignInError')
  return (googleSignInError as string) ?? ''
}

// Sign-out, or a session that can't be refreshed. An untagged resume belonged
// to the account that was signed in: tag it, so the next account to sign in on
// this browser can't claim it (see syncResume in lib/auth.ts).
export async function clearSession(): Promise<void> {
  const [session, resume] = await Promise.all([getSession(), getResume()])
  if (session?.user?.id && resume?.text && !resume.accountId) {
    await saveResume({ ...resume, accountId: session.user.id })
  }
  // The tier belonged to that account too; the next account caches its own.
  await chrome.storage.local.remove(['session', 'cachedTier'])
}

// "Remember me" used to keep the password here, encrypted with a key stored
// next to it. The background worker deletes any leftover copy on install or update.
export async function clearSavedLogin(): Promise<void> {
  await chrome.storage.local.remove('savedLogin')
}

// The user's choice about sending the page copy to our server
// (popup/components/PageReadNotice.tsx and PageReadSetting.tsx): true once they
// agree, false once they turn it off in Settings, missing until they decide.
// Only true sends (preferServerScrapes in background/index.ts), so a missing
// or unreadable value never does.
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

// Calls back with the new choice whenever it changes, from either component.
export function watchPageReadChoice(cb: (agreed: boolean | undefined) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local' || !(PAGE_READ_KEY in changes)) return
    const next = changes[PAGE_READ_KEY].newValue
    cb(typeof next === 'boolean' ? next : undefined)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

// "Not now" hides the notice until the browser restarts (session storage).
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

// Standing facts about the candidate (e.g. "4 years total experience — resume
// only shows 3", "referred by Jane Chen") that apply to every future cover
// letter and resume tailor, not just the generation in progress. Stored
// separately from the per-job supplemental fields so it survives "New" resets.
export async function getCandidateContext(): Promise<string> {
  const { candidateContext } = await chrome.storage.local.get('candidateContext')
  return (candidateContext as string) ?? ''
}

export async function saveCandidateContext(text: string): Promise<void> {
  await chrome.storage.local.set({ candidateContext: text })
}
