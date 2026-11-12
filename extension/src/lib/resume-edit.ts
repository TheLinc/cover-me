import { contactParts } from './pdf/contact'
import { orderedSections, type PlacedSection, type StandardSection } from './pdf/sections'
import type { DeletedSection, SectionKey } from './pdf/types'
import type { TailoredHistoryEntry, TailoredResume } from '../types'
import { getTailoredHistory } from './storage'

// Every piece of text the PDF prints, as one string.
function resumeText(r: TailoredResume): string {
  return [
    r.name, ...contactParts(r), r.summary, r.skills,
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

const placeId = (s: PlacedSection) => (s.key === 'other' ? `other-${s.index}` : s.key)

// What a deleted section takes with it: its content, and where it sat.
function stashed(r: TailoredResume, s: PlacedSection, index: number): DeletedSection {
  return s.key === 'other' ? { key: 'other', index, section: r.otherSections![s.index] } : { key: s.key, index, [s.key]: r[s.key] }
}

// The resume with its sections in list's order. A shown section missing from
// list is deleted: its content moves to deletedSections (#197), which nothing
// prints. Moving and deleting both go through here.
export function withSections(r: TailoredResume, list: PlacedSection[]): TailoredResume {
  const keep = new Set(list.map((s) => s.key))
  const listed = new Set(list.map(placeId))
  const gone = shownSections(r).flatMap((s, i) => (listed.has(placeId(s)) ? [] : [stashed(r, s, i)]))
  const next: TailoredResume = {
    ...r,
    sectionOrder: list.map((s) => s.key),
    otherSections: list.flatMap((s) => (s.key === 'other' ? [r.otherSections![s.index]] : [])),
    ...(gone.length && { deletedSections: [...(r.deletedSections ?? []), ...gone] }),
  }
  if (!keep.has('summary')) delete next.summary
  if (!keep.has('experience')) next.experience = []
  if (!keep.has('projects')) delete next.projects
  if (!keep.has('education')) next.education = []
  if (!keep.has('certifications')) delete next.certifications
  if (!keep.has('skills')) delete next.skills
  return next
}

// The resume with deleted section i back, with its text, where it sat (the
// end of the list when that's past it).
export function restoreSection(r: TailoredResume, i: number): TailoredResume {
  const d = r.deletedSections![i]
  const next: TailoredResume = { ...r, deletedSections: r.deletedSections!.filter((_, j) => j !== i) }
  let placed: PlacedSection
  if (d.key === 'other') {
    next.otherSections = [...(r.otherSections ?? []), d.section]
    placed = { key: 'other', index: next.otherSections.length - 1 }
  } else {
    const { key, index: _index, ...content } = d
    Object.assign(next, content)
    placed = { key }
  }
  const list = shownSections(r)
  list.splice(Math.min(d.index, list.length), 0, placed)
  return withSections(next, list)
}

// "Use this order for future resumes?" (#197): this resume's order with its
// deleted sections back in their places, since deletions never carry over,
// and its extra sections' headings in that order (withChosenOrder matches them).
export function chosenOrder(r: TailoredResume): { sectionOrder: SectionKey[]; headings: string[] } {
  while (r.deletedSections?.length) r = restoreSection(r, r.deletedSections.length - 1)
  return { sectionOrder: shownSections(r).map((s) => s.key), headings: (r.otherSections ?? []).map((s) => s.heading) }
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
