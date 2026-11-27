import { ensureValidSession, ResumeChangedError, syncResume, uploadResumeToBackend } from './auth'
import { fromBase64, ownedBy, sha256Hex, toBase64 } from './design'
import { fileId, fileType } from './resume-file'
import { parseResume, READER_VERSION } from './resume-parser'
import { getDesignFile, getMode, getResume, saveDesignFile, saveResume } from './storage'
import type { AuthSession, ResumeData } from '../types'

// A Word upload from before #401 kept its bytes under design.hash with no file.
function storedFile(resume: ResumeData): ResumeData['file'] {
  return resume.file ?? (resume.design ? { id: resume.design.hash, size: resume.design.size, type: 'docx' } : undefined)
}

const isOld = (resume: ResumeData) => (resume.readerVersion ?? 1) < READER_VERSION

const textHash = (text: string) => sha256Hex(new TextEncoder().encode(text))

// The resume the re-read started from is still the one saved here: a new
// upload, or a sync, while it ran wins (#401).
async function unchanged(was: ResumeData): Promise<boolean> {
  const now = await getResume()
  return now?.updatedAt === was.updatedAt && now?.text === was.text
}

// A re-read saved here keeps rereadFrom until the account has it, so a popup
// closed mid-send can't let the next sync replace this copy and prune its file (#401).
async function sendReread(session: AuthSession, resume: ResumeData, baseTextHash: string): Promise<'sent' | 'changed' | 'failed'> {
  let result: 'sent' | 'changed' = 'sent'
  try {
    await uploadResumeToBackend(session.access_token, resume.text, resume.filename, false, { readerVersion: resume.readerVersion, baseTextHash })
  } catch (err) {
    if (!(err instanceof ResumeChangedError)) return 'failed'
    result = 'changed'
  }
  const { rereadFrom, ...done } = resume
  if (rereadFrom && await unchanged(resume)) await saveResume(done)
  return result
}

// Hosted, the account's copy is checked first: hosted tailoring uses it, and
// it may be newer than this computer's (#401).
export async function refreshResume({ read = parseResume }: { read?: (file: File) => Promise<string> } = {}): Promise<'none' | 'same' | 'changed' | 'account' | 'failed'> {
  const session = (await getMode()) === 'hosted' ? await ensureValidSession() : null
  if (session) {
    const pending = await getResume()
    if (pending?.rereadFrom && ownedBy(pending, session) && (await sendReread(session, pending, pending.rereadFrom)) === 'failed') return 'failed'
    await syncResume(session).catch(() => {})
  }

  const resume = await getResume()
  const stored = resume && storedFile(resume)
  if (!resume || !stored || !isOld(resume)) return 'none'
  const kept = await getDesignFile(stored.id)
  if (!kept) return 'none'
  const bytes = fromBase64(kept.data)

  let text: string
  try {
    text = await read(new File([bytes], resume.filename))
  } catch {
    return 'failed'
  }
  const same = text === resume.text
  const owned = !!session && ownedBy(resume, session)
  const baseTextHash = await textHash(resume.text)
  const id = same ? stored.id : await fileId(bytes)
  const word = stored.type === 'docx'
  const now = new Date().toISOString()
  const { parsed: _p, design: _d, ...rest } = resume
  // updatedAt stays: a re-read is not an upload, and a newer account copy must still win the sync (#401).
  const next: ResumeData = same ? { ...resume, file: stored, readerVersion: READER_VERSION } : {
    ...rest, text, readerVersion: READER_VERSION, file: { ...stored, id },
    ...(word ? { design: { hash: id, size: stored.size, status: 'checking', checkedAt: now } } : {}),
    ...(owned ? { rereadFrom: baseTextHash } : {}),
  }
  if (!(await unchanged(resume))) return 'account'
  // The resume first, as on upload, so a prune can't take the new file (#131).
  await saveResume(next)
  if (!same) {
    await saveDesignFile(id, { data: toBase64(bytes) })
    if (word) void chrome.runtime.sendMessage({ type: 'CHECK_DESIGN', hash: id }).catch(() => {})
  }
  if (!session || !owned) return same ? 'same' : 'changed'

  const sent = await sendReread(session, next, baseTextHash)
  if (sent === 'failed') return 'failed'
  if (sent === 'changed') {
    await syncResume(session).catch(() => {})
    return 'account'
  }
  return same ? 'same' : 'changed'
}

// The Resume tab's one-time note: an upload from before files were kept,
// which can only improve by uploading it again (#401).
export function needsUploadNote(resume: ResumeData | null, dismissed: boolean): boolean {
  return !!resume && !dismissed && !storedFile(resume) && isOld(resume) && fileType(resume.filename) !== null
}
