import type { AppMode, AuthSession, CoverLetter, ParsedResume, ResumeData, Settings } from '../types'

const HISTORY_LIMIT = 50

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

export async function getResume(): Promise<ResumeData | null> {
  const { resume } = await chrome.storage.local.get('resume')
  return (resume as ResumeData) ?? null
}

export async function saveResume(resume: ResumeData): Promise<void> {
  await chrome.storage.local.set({ resume })
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
}

export async function saveHistory(letters: CoverLetter[]): Promise<void> {
  await chrome.storage.local.set({ history: letters.slice(0, HISTORY_LIMIT) })
}

export async function deleteFromHistory(id: string): Promise<void> {
  const history = await getHistory()
  await chrome.storage.local.set({ history: history.filter((l) => l.id !== id) })
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
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && 'session' in changes) onChange((changes.session.newValue as AuthSession) ?? null)
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

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove('session')
}

// "Remember me" used to keep the password here, encrypted with a key stored
// next to it. The background worker deletes any leftover copy on install or update.
export async function clearSavedLogin(): Promise<void> {
  await chrome.storage.local.remove('savedLogin')
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
