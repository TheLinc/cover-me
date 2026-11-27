import { ensureValidSession } from './auth'
import { fromBase64, sha256Hex, toBase64 } from './design'
import { DOCX_MIME } from './pdf/docx-design'
import { saveFile } from './pdf/file-name'
import { READER_VERSION } from './resume-parser'
import { getDesignFile, getMode, getResume, saveDesignFile, saveResume } from './storage'
import type { AuthSession, ResumeData, ResumeSource } from '../types'

// The reader version is part of the id, so a re-read under a new reader is
// stored apart from the entry, and the parse, older History entries use (#401).
export async function fileId(bytes: Uint8Array, readerVersion = READER_VERSION): Promise<string> {
  const tag = new TextEncoder().encode(`\nreader:${readerVersion}`)
  const all = new Uint8Array(bytes.length + tag.length)
  all.set(bytes)
  all.set(tag, bytes.length)
  return sha256Hex(all)
}

export function fileType(name: string): 'pdf' | 'docx' | null {
  return (name.toLowerCase().match(/\.(pdf|docx)$/)?.[1] as 'pdf' | 'docx' | undefined) ?? null
}

// A PDF or Word file is kept so it can be read again when the reader improves
// (#401), and a Word file so tailoring can edit it in place (#131).
export async function saveUpload(file: File, text: string): Promise<{ resume: ResumeData; word?: string; hosted?: AuthSession }> {
  const type = fileType(file.name)
  const bytes = type ? new Uint8Array(await file.arrayBuffer()) : null
  const id = bytes ? await fileId(bytes) : undefined
  const word = type === 'docx' ? id : undefined
  const uploadedAt = new Date().toISOString()
  // ensureValidSession refreshes an expired token (or clears a dead session),
  // so the upload after this doesn't fail with a stale token (#16).
  const [mode, session] = await Promise.all([getMode(), ensureValidSession()])
  // Signed in (either mode): the copy belongs to this account. Signed out
  // after an account was here: it keeps that owner, so another account can't
  // claim it, and is marked so the owner's next sign-in doesn't upload it
  // either (it may be someone else's). See syncResume in lib/auth.ts (#16).
  const inherited = session ? undefined : (await getResume())?.accountId
  const resume: ResumeData = {
    text, filename: file.name, updatedAt: uploadedAt, uploadedAt, readerVersion: READER_VERSION,
    ...(session ? { accountId: session.user.id } : inherited ? { accountId: inherited, signedOutUpload: true } : {}),
    ...(bytes && id && type ? { file: { id, size: bytes.length, type } } : {}),
    ...(bytes && word ? { design: { hash: word, size: bytes.length, status: 'checking' as const, checkedAt: uploadedAt } } : {}),
  }
  // The resume first: a file stored before anything points to it could be
  // pruned by a History save in between (#131).
  await saveResume(resume)
  // The same file again, under the same reader, keeps the parse it was checked against (#131).
  if (bytes && id) await saveDesignFile(id, { ...(await getDesignFile(id)), data: toBase64(bytes) })
  return { resume, word, hosted: mode === 'hosted' && session ? session : undefined }
}

const MIME = { pdf: 'application/pdf', docx: DOCX_MIME }

export async function downloadStoredFile(id: string, filename: string): Promise<boolean> {
  const stored = await getDesignFile(id)
  if (!stored) return false
  const type = fileType(filename)
  saveFile(new Blob([fromBase64(stored.data)], type ? { type: MIME[type] } : {}), filename)
  return true
}

function uploadDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) })
}

const line = (verb: string, source: ResumeSource) => `${verb} ${source.filename}, uploaded ${uploadDate(source.uploadedAt)}`
export const usingLine = (resume: ResumeData) => line('Using', resumeSource(resume))
export const fromLine = (source: ResumeSource) => line('From', source)

// A resume from before #401 has no uploadedAt; updatedAt is the closest date it has.
export function resumeSource(resume: ResumeData): ResumeSource {
  return { filename: resume.filename, uploadedAt: resume.uploadedAt ?? resume.updatedAt, fileId: resume.file?.id }
}
