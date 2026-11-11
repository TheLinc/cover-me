import { contactParts } from './pdf/contact'
import { orderedSections, type PlacedSection, type StandardSection } from './pdf/sections'
import type { TailoredHistoryEntry, TailoredResume } from '../types'
import { getTailoredHistory } from './storage'

// Every piece of text the PDF prints, as one string.
function resumeText(r: TailoredResume): string {
  return [
    r.name, r.headline, ...contactParts(r), r.summary, r.skills,
    ...(r.experience ?? []).flatMap((e) => [e.title, e.company, e.location, e.dates, ...(e.bullets ?? [])]),
    ...(r.projects ?? []).flatMap((p) => [p.name, p.tech, p.link, ...(p.bullets ?? [])]),
    ...(r.education ?? []).flatMap((e) => [e.institution, e.degree, e.location, e.dates, ...(e.bullets ?? [])]),
    ...(r.certifications ?? []),
    ...(r.otherSections ?? []).flatMap((s) => [s.heading, ...(s.lines ?? []),
      ...(s.entries ?? []).flatMap((e) => [e.name, e.subtitle, e.link, e.dates, ...(e.bullets ?? [])])]),
  ].filter(Boolean).join('\n').toLowerCase()
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The ATS gaps an edit hasn't filled: a gap goes once its keyword appears in
// the resume as a word of its own, in any case. No re-score: that's a model call.
export function remainingGaps(gaps: string[] | undefined, resume: TailoredResume): string[] {
  const text = resumeText(resume)
  return (gaps ?? []).filter((g) => !new RegExp(`(^|[^a-z0-9])${escape(g.toLowerCase())}($|[^a-z0-9])`).test(text))
}

// The edit as saved: the draft's text, the score from before any edit, and
// the gaps the text hasn't filled, measured against the gaps that score found
// (atsGapsBeforeEdits), so deleting a keyword in a later edit brings its gap back.
export function editedResume(scored: TailoredResume, draft: TailoredResume, now = new Date()): TailoredResume {
  const before = scored.atsGapsBeforeEdits ?? scored.atsGaps
  const { atsScore: _score, atsGaps: _gaps, atsGapsBeforeEdits: _before, ...text } = draft
  return {
    ...text,
    ...(scored.atsScore !== undefined && { atsScore: scored.atsScore }),
    ...(before && { atsGaps: remainingGaps(before, draft), atsGapsBeforeEdits: before }),
    editedAt: now.toISOString(),
  }
}

// Whether the editor shows a standard section: the resume has it. An emptied
// summary, skills or certifications list still counts, so it can be filled again.
function hasSection(r: TailoredResume, key: StandardSection): boolean {
  switch (key) {
    case 'summary': return r.summary !== undefined
    case 'experience': return r.experience.length > 0
    case 'projects': return (r.projects?.length ?? 0) > 0
    case 'education': return r.education.length > 0
    case 'certifications': return r.certifications !== undefined
    case 'skills': return r.skills !== undefined
  }
}

// The sections the editor shows, in print order.
export function shownSections(r: TailoredResume): PlacedSection[] {
  return orderedSections(r).filter((s) => s.key === 'other' || hasSection(r, s.key))
}

// The resume with its sections in list's order. A shown section missing from
// list is deleted. Moving and deleting both go through here.
export function withSections(r: TailoredResume, list: PlacedSection[]): TailoredResume {
  const keep = new Set(list.map((s) => s.key))
  const next: TailoredResume = {
    ...r,
    sectionOrder: list.map((s) => s.key),
    otherSections: list.flatMap((s) => (s.key === 'other' ? [r.otherSections![s.index]] : [])),
  }
  if (!keep.has('summary')) delete next.summary
  if (!keep.has('experience')) next.experience = []
  if (!keep.has('projects')) delete next.projects
  if (!keep.has('education')) next.education = []
  if (!keep.has('certifications')) delete next.certifications
  if (!keep.has('skills')) delete next.skills
  return next
}

// History with one entry's resume replaced, or null when the entry isn't
// there (a Pro resume only on the server isn't added).
export function withResumeEdit(list: TailoredHistoryEntry[], id: string, saved: TailoredResume): TailoredHistoryEntry[] | null {
  return list.some((e) => e.id === id) ? list.map((e) => (e.id === id ? { ...e, resume: saved } : e)) : null
}

export async function saveResumeEdit(id: string, saved: TailoredResume): Promise<void> {
  const next = withResumeEdit(await getTailoredHistory(), id, saved)
  if (next) await chrome.storage.local.set({ tailoredHistory: next })
}

// The editor tab, a page of its own (vite.config.ts builds it).
const EDITOR_PATH = 'src/editor/index.html'

export function openResumeEditor(id: string): void {
  void chrome.tabs.create({ url: chrome.runtime.getURL(`${EDITOR_PATH}?id=${encodeURIComponent(id)}`) })
}
