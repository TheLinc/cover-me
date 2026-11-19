import { parseResumeStructure, upgradedParse } from './ai/resume-parse'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'
import { decryptApiKey } from './crypto'
import { getResume, saveParsedResume } from './storage'
import type { AppMode, AuthSession, ParsedResume, Settings } from '../types'

// The user's parsed resume for "Flag a problem" (#256), which names their
// details exactly so the report can leave them out. BYOK: the parse kept in
// this browser, or one made now with their key (and kept, so tailoring reuses
// it). Hosted: the account's, which the server parses now if it has none.
// Throws an error whose message the form shows.
export async function readResumeForReport(mode: AppMode, settings: Settings | null, session: AuthSession | null): Promise<ParsedResume> {
  if (mode === 'hosted') {
    if (!session) throw new Error('Sign in again to send a report.')
    const res = await fetch(`${SUPABASE_URL}/functions/v1/resume?parse=1`, {
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(60_000),
    }).catch(() => null)
    const data = (await res?.json().catch(() => null)) as { structured?: ParsedResume } | null
    if (res?.ok && Array.isArray(data?.structured?.experience)) return data!.structured!
    throw new Error(res?.status === 404 ? 'Add your resume first.' : "Couldn't read your resume to take your details out. Try again in a moment.")
  }
  const resume = await getResume()
  if (!resume?.text) throw new Error('Add your resume first.')
  if (resume.parsed && Array.isArray(resume.parsed.experience)) return resume.parsed
  if (!settings?.apiKey) throw new Error('Add your API key in Settings first: it reads your resume to take your details out.')
  try {
    const parsed = upgradedParse(undefined, await parseResumeStructure(resume.text, settings.provider, await decryptApiKey(settings.apiKey)))
    // Kept only if the resume is still the one read (#256).
    await saveParsedResume(parsed, resume.text)
    return parsed
  } catch {
    throw new Error("Couldn't read your resume to take your details out. Check your API key, then try again.")
  }
}
