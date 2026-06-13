import type { AuthSession, CoverLetter, ParsedResume, ResumeData, Settings } from '../types'

const HISTORY_LIMIT = 50

export async function getSettings(): Promise<Settings | null> {
  const { settings } = await chrome.storage.local.get('settings')
  return (settings as Settings) ?? null
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings })
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

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove('session')
}

export interface SavedLogin {
  email: string
  encryptedPassword: string
}

export async function getSavedLogin(): Promise<SavedLogin | null> {
  const { savedLogin } = await chrome.storage.local.get('savedLogin')
  return (savedLogin as SavedLogin) ?? null
}

export async function setSavedLogin(login: SavedLogin): Promise<void> {
  await chrome.storage.local.set({ savedLogin: login })
}

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
