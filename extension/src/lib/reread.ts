import { ensureValidSession, ResumeChangedError, syncResume, uploadResumeToBackend } from './auth'
import { fromBase64, ownedBy, sha256Hex, toBase64 } from './design'
import { fileId, fileType } from './resume-file'
import { parseResume, READER_VERSION } from './resume-parser'
import { getDesignFile, getMode, getResume, saveDesignFile, saveResume } from './storage'
import type { ResumeData } from '../types'

// A Word upload from before #401 kept its bytes under design.hash with no file.
function storedFile(resume: ResumeData): ResumeData['file'] {
  return resume.file ?? (resume.design ? { id: resume.design.hash, size: resume.design.size, type: 'docx' } : undefined)
}

const isOld = (resume: ResumeData) => (resume.readerVersion ?? 1) < READER_VERSION

// The resume the re-read started from is still the one saved here: a new
// upload, or a sync, while it ran wins (#401).
async function unchanged(was: ResumeData): Promise<boolean> {
  const now = await getResume()
  return now?.updatedAt === was.updatedAt && now?.text === was.text
}

// When the popup opens: reads the stored file again when the reader has
// improved since, so nobody uploads again (#401). Hosted, the account's copy is
// checked first, since hosted tailoring uses it and it may be newer.
export async function refreshResume({ read = parseResume }: { read?: (file: File) => Promise<string> } = {}): Promise<'none' | 'same' | 'changed' | 'account' | 'failed'> {
  const session = (await getMode()) === 'hosted' ? await ensureValidSession() : null
  if (session) await syncResume(session).catch(() => {})

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
  if (!(await unchanged(resume))) return 'account'

  const same = text === resume.text
  const id = same ? stored.id : await fileId(bytes)
  if (session && ownedBy(resume, session)) {
    const baseTextHash = await sha256Hex(new TextEncoder().encode(resume.text))
    try {
      await uploadResumeToBackend(session.access_token, text, resume.filename, false, { readerVersion: READER_VERSION, baseTextHash })
    } catch (err) {
      if (!(err instanceof ResumeChangedError)) return 'failed'
      await syncResume(session).catch(() => {})
      return 'account'
    }
  }
  if (!(await unchanged(resume))) return 'account'

  if (same) {
    await saveResume({ ...resume, file: stored, readerVersion: READER_VERSION })
    return 'same'
  }
  const now = new Date().toISOString()
  const { parsed: _p, design: _d, ...rest } = resume
  const word = stored.type === 'docx'
  // The resume first, as on upload, so a prune can't take the new file (#131).
  await saveResume({
    ...rest, text, updatedAt: now, readerVersion: READER_VERSION, file: { ...stored, id },
    ...(word ? { design: { hash: id, size: stored.size, status: 'checking', checkedAt: now } } : {}),
  })
  await saveDesignFile(id, { data: toBase64(bytes) })
  if (word) void chrome.runtime.sendMessage({ type: 'CHECK_DESIGN', hash: id }).catch(() => {})
  return 'changed'
}

// The Resume tab's one-time note: an upload from before files were kept,
// which can only improve by uploading it again (#401).
export function needsUploadNote(resume: ResumeData | null, dismissed: boolean): boolean {
  return !!resume && !dismissed && !storedFile(resume) && isOld(resume) && fileType(resume.filename) !== null
}
