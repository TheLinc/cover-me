// "Your design" (#131) in the extension: the upload check, which runs in the
// service worker so it survives the popup closing, and the tailor's choice of
// layout. The edit itself is lib/pdf/docx-design.ts, shared with the website.
import { ensureValidSession, uploadDesignFileToBackend, uploadResumeToBackend, type TailorDesign } from './auth'
import { parseResumeStructure } from './ai/resume-parse'
import { decryptApiKey } from './crypto'
import { designUsable, downloadDesignDocx, tailorDesign } from './pdf/docx-design'
import { getCachedTier, getDesignFile, getResume, getSettings, resolveMode, saveDesignFile, saveParsedResume, saveResume } from './storage'
import type { AuthSession, ParsedResume, ResumeData, TailoredResume } from '../types'

// The account's dashboard keeps Word files up to this size.
export const DESIGN_UPLOAD_MAX = 2 * 1024 * 1024

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

export async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')
}

// A check that started this long ago without finishing died with the
// service worker; the resume page offers "Try again".
export const DESIGN_CHECK_STALE_MS = 2 * 60 * 1000

// The account may receive this upload's text and file: it was added while
// signed in to this account. A copy added signed out, or another account's,
// is never sent (the rule syncResume in lib/auth.ts follows).
function ownedBy(resume: ResumeData, session: AuthSession): boolean {
  return !resume.signedOutUpload && resume.accountId === session.user.id
}

// "Your design" is used: its check passed and the user hasn't picked the Cover Me layout.
export function usesDesign(resume: ResumeData | null | undefined): boolean {
  const d = resume?.design
  return d?.status === 'done' && !!d.check && designUsable(d.check) && resume?.layout !== 'cover-me'
}

// Saves the check's progress on the resume, unless another upload replaced it meanwhile.
async function setDesign(hash: string, update: Partial<NonNullable<ResumeData['design']>>): Promise<void> {
  const resume = await getResume()
  if (resume?.design?.hash !== hash) return
  await saveResume({ ...resume, design: { ...resume.design, ...update } })
}

// The CHECK_DESIGN message: parses the resume (on the server for an account,
// with the user's key for BYOK), then runs the edit as a dry run against that
// parse. Pro accounts then upload the file for the dashboard.
export async function checkUploadedDesign(hash: string): Promise<void> {
  try {
    const [resume, file, settings] = await Promise.all([getResume(), getDesignFile(hash), getSettings()])
    if (resume?.design?.hash !== hash) return
    if (!file) throw new Error('Upload your .docx again.')
    await setDesign(hash, { status: 'checking', error: undefined, checkedAt: new Date().toISOString() })

    let parsed: ParsedResume | undefined
    const hosted = resolveMode(settings) === 'hosted'
    if (hosted) {
      const session = await ensureValidSession()
      if (!session) throw new Error('Sign in to check your design.')
      if (!ownedBy(resume, session)) throw new Error('Upload your .docx again while signed in to use your design.')
      parsed = await uploadResumeToBackend(session.access_token, resume.text, resume.filename, true)
      if (!parsed) throw new Error("Couldn't check your design right now. Try again in a few minutes.")
    } else {
      if (!settings?.apiKey) throw new Error('Add your API key in Settings to check your design.')
      // The same file uploaded again keeps its parse, so History entries made
      // from it still place their text the same way.
      parsed = file.parsed ?? (Array.isArray(resume.parsed?.otherSections)
        ? resume.parsed
        : await parseResumeStructure(resume.text, settings.provider, await decryptApiKey(settings.apiKey)))
      await saveParsedResume(parsed!)
    }

    const { check } = await tailorDesign(fromBase64(file.data), parsed!)
    await saveDesignFile(hash, { ...file, parsed })
    await setDesign(hash, { status: 'done', check })
    if (hosted) {
      const session = await ensureValidSession()
      if (session) await uploadDesignIfPro(session)
    }
  } catch (err) {
    await setDesign(hash, { status: 'error', error: err instanceof Error ? err.message : "Couldn't check your design." })
  }
}

// Pro accounts keep the Word file for the dashboard. Tried after each check
// and each hosted tailor until it lands, so an upgrade after the upload, or a
// failed send, still gets the file there.
export async function uploadDesignIfPro(session: AuthSession): Promise<void> {
  const resume = await getResume()
  const d = resume?.design
  if (!d || d.status !== 'done' || d.uploaded || d.size > DESIGN_UPLOAD_MAX || !ownedBy(resume, session)) return
  if ((await getCachedTier()) !== 'hosted_pro') return
  const file = await getDesignFile(d.hash)
  if (!file) return
  try {
    await uploadDesignFileToBackend(session.access_token, d.hash, file.data)
    await setDesign(d.hash, { uploaded: true })
  } catch { /* tried again on the next tailor */ }
}

// What a tailor needs about the layout: the file to edit when "Your design"
// is used, and whether it fell back to the Cover Me layout because the file
// is gone or no longer passes its check.
export async function designForTailor(): Promise<{ design: TailorDesign; file?: Uint8Array; parsed?: ParsedResume; summary: boolean }> {
  const resume = await getResume()
  if (!usesDesign(resume)) return { design: { layout: 'cover-me', fellBack: false }, summary: true }
  const hash = resume!.design!.hash
  const stored = await getDesignFile(hash)
  const file = stored?.parsed ? fromBase64(stored.data) : undefined
  const check = file ? (await tailorDesign(file, stored!.parsed!).catch(() => null))?.check : undefined
  if (!file || !check || !designUsable(check)) return { design: { layout: 'yours', fellBack: true }, summary: true }
  return { design: { layout: 'yours', fellBack: false, sourceHash: hash }, file, parsed: stored!.parsed, summary: check.summary }
}

// After the tailor: marks the resume as tailored in the user's file, or as
// fallen back when the tailored text can't be placed in it.
export async function finishDesign(resume: TailoredResume, d: Awaited<ReturnType<typeof designForTailor>>): Promise<TailoredResume> {
  const { sourceHash: _h, designFellBack: _f, ...plain } = resume
  if (d.design.layout !== 'yours') return plain
  if (d.file && d.parsed && d.design.sourceHash) {
    const { bytes } = await tailorDesign(d.file, d.parsed, plain).catch(() => ({ bytes: undefined }))
    if (bytes) return { ...plain, sourceHash: d.design.sourceHash }
  }
  return { ...plain, designFellBack: true }
}

// The Word download of a tailored resume: inside the user's own file when it
// was tailored in one that's still stored, else the Cover Me layout.
export async function downloadResumeWord(resume: TailoredResume, jobTitle?: string): Promise<void> {
  const stored = resume.sourceHash ? await getDesignFile(resume.sourceHash) : null
  if (stored?.parsed && await downloadDesignDocx(fromBase64(stored.data), stored.parsed, resume, jobTitle)) return
  // docx is big, so it loads only when someone asks for this Word file.
  const { downloadTailoredResumeDocx } = await import('./pdf/resume-docx')
  await downloadTailoredResumeDocx(resume, jobTitle)
}
