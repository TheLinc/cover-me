import { ensureValidSession, syncResume } from './auth'
import { fromBase64, sha256Hex, toBase64 } from './design'
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

// Hosted, the account's copy is checked first: hosted tailoring uses it, and
// it may be newer than this computer's (#401).
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
  const same = text === resume.text
  const id = same ? stored.id : await fileId(bytes)
  const word = stored.type === 'docx'
  const now = new Date().toISOString()
  const { parsed: _p, design: _d, ...rest } = resume
  // The account's copy goes through syncResume, which sends this as a re-read
  // of the text it replaced, from this open or any later sync (#401).
  const rereadFrom = resume.accountId && !resume.signedOutUpload ? await sha256Hex(new TextEncoder().encode(resume.text)) : undefined
  // updatedAt stays: a re-read is not an upload, and a newer account copy must still win the sync (#401).
  const next: ResumeData = {
    ...(same ? { ...resume, file: stored } : {
      ...rest, text, file: { ...stored, id },
      ...(word ? { design: { hash: id, size: stored.size, status: 'checking' as const, checkedAt: now } } : {}),
    }),
    readerVersion: READER_VERSION,
    ...(rereadFrom ? { rereadFrom } : {}),
  }
  if (!(await unchanged(resume))) return 'account'
  // The resume first, as on upload, so a prune can't take the new file (#131).
  await saveResume(next)
  if (!same) await saveDesignFile(id, { data: toBase64(bytes) })
  if (session && rereadFrom) await syncResume(session).catch(() => {})
  if (!same && word) void chrome.runtime.sendMessage({ type: 'CHECK_DESIGN', hash: id }).catch(() => {})

  const after = await getResume()
  if (after?.text !== next.text) return 'account'
  if (session && after.rereadFrom) return 'failed'
  return same ? 'same' : 'changed'
}

// The Resume tab's one-time note: an upload from before files were kept,
// which can only improve by uploading it again (#401).
export function needsUploadNote(resume: ResumeData | null, dismissed: boolean): boolean {
  return !!resume && !dismissed && !storedFile(resume) && isOld(resume) && fileType(resume.filename) !== null
}
