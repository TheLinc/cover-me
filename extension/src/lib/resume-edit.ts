import type { TailoredResume } from '../types'
import { getTailoredHistory } from './storage'

// Every piece of text the PDF prints, as one string.
function resumeText(r: TailoredResume): string {
  return [
    r.name, r.phone, r.email, r.website, r.summary, r.skills,
    ...(r.experience ?? []).flatMap((e) => [e.title, e.company, e.location, e.dates, ...(e.bullets ?? [])]),
    ...(r.projects ?? []).flatMap((p) => [p.name, ...(p.bullets ?? [])]),
    ...(r.education ?? []).flatMap((e) => [e.institution, e.degree, e.location, e.dates, ...(e.bullets ?? [])]),
    ...(r.certifications ?? []),
    ...(r.otherSections ?? []).flatMap((s) => [s.heading, ...(s.lines ?? [])]),
  ].filter(Boolean).join('\n').toLowerCase()
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The ATS gaps an edit hasn't filled: a gap goes once its keyword appears in
// the resume as a word of its own, in any case. No re-score: that's a model call.
export function remainingGaps(gaps: string[] | undefined, resume: TailoredResume): string[] {
  const text = resumeText(resume)
  return (gaps ?? []).filter((g) => !new RegExp(`(^|[^a-z0-9])${escape(g.toLowerCase())}($|[^a-z0-9])`).test(text))
}

// The edit as saved: the draft's text, the score from before the edit, the
// gaps it hasn't filled, and when it was edited. Overwrites the entry in local
// History when it's there; a Pro resume only on the server isn't added here.
export async function saveResumeEdit(id: string, scored: TailoredResume, draft: TailoredResume, now = new Date()): Promise<TailoredResume> {
  const saved: TailoredResume = {
    ...draft,
    atsScore: scored.atsScore,
    atsGaps: remainingGaps(scored.atsGaps, draft),
    editedAt: now.toISOString(),
  }
  if (scored.atsScore === undefined) delete saved.atsScore
  const list = await getTailoredHistory()
  if (list.some((e) => e.id === id)) {
    await chrome.storage.local.set({ tailoredHistory: list.map((e) => (e.id === id ? { ...e, resume: saved } : e)) })
  }
  return saved
}

// The editor tab, a page of its own (vite.config.ts builds it).
export const EDITOR_PATH = 'src/editor/index.html'

export function openResumeEditor(id: string): void {
  void chrome.tabs.create({ url: chrome.runtime.getURL(`${EDITOR_PATH}?id=${encodeURIComponent(id)}`) })
}
