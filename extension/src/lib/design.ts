// "Your design" (#131) in the extension: the upload check, which runs in the
// service worker so it survives the popup closing, and the tailor's choice of
// layout. The edit itself is lib/pdf/docx-design.ts, shared with the website.
import { checkedTier, DesignRefusedError, ensureValidSession, fetchDesignFileFromBackend, syncResume, uploadDesignFileToBackend, uploadResumeToBackend, type TailorDesign } from './auth'
import { isCurrentParse, parseResumeStructure, upgradedParse } from './ai/resume-parse'
import { decryptApiKey } from './crypto'
import { designUsable, downloadDesignDocx, tailorDesign } from './pdf/docx-design'
import { getCachedTier, getDesignFile, getResume, getSettings, resolveMode, saveDesignFile, saveParsedResume, saveResume, type DesignFile } from './storage'
import type { AuthSession, ParsedResume, ResumeData, TailoredResume } from '../types'

// The dashboard won't store a bigger Word file (#131).
export const DESIGN_UPLOAD_MAX = 2 * 1024 * 1024

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

export async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')
}

// A check this old died with the service worker, so the resume page
// offers "Try again" (#131).
export const DESIGN_CHECK_STALE_MS = 2 * 60 * 1000

function ownedBy(resume: ResumeData, session: AuthSession): boolean {
  return !resume.signedOutUpload && resume.accountId === session.user.id
}

export function usesDesign(resume: ResumeData | null | undefined): boolean {
  const d = resume?.design
  return d?.status === 'done' && !!d.check && designUsable(d.check) && resume?.layout !== 'cover-me'
}

async function setDesign(hash: string, update: Partial<NonNullable<ResumeData['design']>>, parsed?: ParsedResume): Promise<void> {
  const resume = await getResume()
  if (resume?.design?.hash !== hash) return
  await saveResume({ ...resume, ...(parsed ? { parsed } : {}), design: { ...resume.design, ...update } })
}

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
      // A re-read goes to the account first, checked against the text it replaced.
      // This upload would skip that check (#401).
      if (resume.rereadFrom) {
        await syncResume(session).catch(() => {})
        const now = await getResume()
        if (now?.design?.hash !== hash) return
        if (now.rereadFrom) throw new Error("Couldn't check your design right now. Try again in a few minutes.")
      }
      parsed = await uploadResumeToBackend(session.access_token, resume.text, resume.filename, true, { readerVersion: resume.readerVersion, uploadedAt: resume.uploadedAt })
      if (!parsed) throw new Error("Couldn't check your design right now. Try again in a few minutes.")
    } else {
      if (!settings?.apiKey) throw new Error('Add your API key in Settings to check your design.')
      // The same file uploaded again keeps its parse, so History entries made
      // from it still place their text the same way. One from before the link
      // fix (#238) takes the current parse instead, as the tailor does (#239).
      parsed = (isCurrentParse(file.parsed) ? file.parsed : undefined) ?? (isCurrentParse(resume.parsed)
        ? resume.parsed
        : upgradedParse(resume.parsed, await parseResumeStructure(resume.text, settings.provider, await decryptApiKey(settings.apiKey))))
    }

    const { check } = await tailorDesign(fromBase64(file.data), parsed!)
    // A BYOK file keeps its earlier parse when the new one doesn't fit, so its
    // History entries still download in its design (#239).
    if (hosted || !file.parsed || designUsable(check)) await saveDesignFile(hash, { ...file, parsed })
    // BYOK saves the parse so the tailor reuses it instead of making its own (#131).
    await setDesign(hash, { status: 'done', check }, hosted ? undefined : parsed)
    if (hosted) {
      const session = await ensureValidSession()
      if (session) await uploadDesignIfPro(session)
    }
  } catch (err) {
    await setDesign(hash, { status: 'error', error: err instanceof Error ? err.message : "Couldn't check your design." })
  }
}

// Safe to call again until the file lands, so a later upgrade or a failed send
// still gets it to the dashboard. checkTier asks the server for the plan
// instead of the cached one, only once there's a file to send (#181).
export async function uploadDesignIfPro(session: AuthSession, checkTier = false): Promise<void> {
  const resume = await getResume()
  const d = resume?.design
  if (!d || d.status !== 'done' || d.uploaded || d.size > DESIGN_UPLOAD_MAX || !ownedBy(resume, session)) return
  if ((checkTier ? await checkedTier(session) : await getCachedTier()) !== 'hosted_pro') return
  const file = await getDesignFile(d.hash)
  if (!file) return
  try {
    await uploadDesignFileToBackend(session.access_token, d.hash, file.data, await sha256Hex(new TextEncoder().encode(resume.text)))
    await setDesign(d.hash, { uploaded: true })
  } catch (err) {
    // A refused file is not sent again and the resume page says why.
    // Other errors retry on the next tailor (#174).
    if (err instanceof DesignRefusedError) await setDesign(d.hash, { status: 'error', error: err.message, refused: true })
  }
}

// On sign-in on another computer (#174): the Pro account's Word file for its
// current resume, checked again here against the parse it came with (no AI
// call) and marked as in the account already. Nothing changes if it can't be
// fetched or the resume changed meanwhile.
export async function restoreDesign(accessToken: string, hash: string, text: string): Promise<void> {
  const file = await fetchDesignFileFromBackend(accessToken, hash)
  if (!file?.parsed) return
  const bytes = fromBase64(file.data)
  const { check } = await tailorDesign(bytes, file.parsed)
  const resume = await getResume()
  if (resume?.text !== text || resume.design) return
  // Save the resume first: a file stored before anything points to it could
  // be pruned by a History save in between (#174).
  await saveResume({ ...resume, file: { id: hash, size: bytes.length, type: 'docx' }, design: { hash, size: bytes.length, status: 'done', check, uploaded: true } })
  await saveDesignFile(hash, file)
}

// Pro: a file this browser doesn't have, from the account (#174), such as one
// a History entry was tailored in on another computer. Stored here until the
// next prune; one only the account's History uses is fetched again next time.
async function accountDesignFile(hash: string): Promise<DesignFile | null> {
  if (await getCachedTier() !== 'hosted_pro') return null
  const session = await ensureValidSession()
  const file = session ? await fetchDesignFileFromBackend(session.access_token, hash).catch(() => null) : null
  if (file) await saveDesignFile(hash, file)
  return file
}

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

type ForTailor = Awaited<ReturnType<typeof designForTailor>>

// BYOK (#239): a Word file checked against a parse from before the link fix
// (#238) is checked again against the current one, so its tailors stop
// printing project links in the header. The file keeps the new parse only
// when it fits; History entries made from it then place their text with it.
// When it doesn't fit, this tailor falls back, and the resume page shows the
// new check, so later tailors use the Cover Me layout. Nothing changes when
// another file was uploaded while the parse ran.
export async function designWithParse(hash: string, parsed: ParsedResume): Promise<ForTailor> {
  const file = (await getResume())?.design?.hash === hash ? await getDesignFile(hash) : null
  const check = file && (await tailorDesign(fromBase64(file.data), parsed).catch(() => null))?.check
  if (file && check) {
    await setDesign(hash, { check })
    if (!designUsable(check)) return { design: { layout: 'yours', fellBack: true }, summary: true }
    await saveDesignFile(hash, { ...file, parsed })
  }
  return designForTailor()
}

export async function parseForTailor(d: ForTailor, resume: Pick<ResumeData, 'text' | 'parsed'>, read: () => Promise<ParsedResume>): Promise<{ parsed: ParsedResume; design: ForTailor }> {
  let parsed = isCurrentParse(d.parsed) ? d.parsed : resume.parsed
  if (!isCurrentParse(parsed)) {
    parsed = upgradedParse(parsed, await read())
    await saveParsedResume(parsed, resume.text)
  }
  const design = d.parsed && d.parsed !== parsed && d.design.sourceHash ? await designWithParse(d.design.sourceHash, parsed) : d
  return { parsed, design }
}

export async function finishDesign(resume: TailoredResume, d: Awaited<ReturnType<typeof designForTailor>>): Promise<TailoredResume> {
  const { sourceHash: _h, designFellBack: _f, ...plain } = resume
  if (d.design.layout !== 'yours') return plain
  if (d.file && d.parsed && d.design.sourceHash) {
    const { bytes } = await tailorDesign(d.file, d.parsed, plain).catch(() => ({ bytes: undefined }))
    if (bytes) return { ...plain, sourceHash: d.design.sourceHash }
  }
  return { ...plain, designFellBack: true }
}

export async function downloadResumeWord(resume: TailoredResume, jobTitle?: string): Promise<void> {
  const stored = resume.sourceHash ? (await getDesignFile(resume.sourceHash)) ?? await accountDesignFile(resume.sourceHash) : null
  if (stored?.parsed && await downloadDesignDocx(fromBase64(stored.data), stored.parsed, resume, jobTitle)) return
  // The docx library is large, so it loads only when someone downloads a Word file (#131).
  const { downloadTailoredResumeDocx } = await import('./pdf/resume-docx')
  await downloadTailoredResumeDocx(resume, jobTitle)
}
