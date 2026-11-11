// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy).
import type { SectionKey, TailoredResume } from './types'

export type StandardSection = Exclude<SectionKey, 'other'>
export type PlacedSection = { key: StandardSection } | { key: 'other'; index: number }

export const DEFAULT_ORDER: StandardSection[] = ['summary', 'skills', 'experience', 'projects', 'education', 'certifications']

// The print order without a saved one: skills up top where a recruiter scans
// first, extra sections (open source, awards, publications) after projects,
// education last.
function defaultLayout(others: number): SectionKey[] {
  return ['summary', 'skills', 'experience', 'projects', ...Array<SectionKey>(others).fill('other'), 'education', 'certifications']
}

// The order the layouts print the resume's sections in, set in the editor
// (#118). Each 'other' takes the next of otherSections. Anything the saved
// order leaves out prints after it, so no section is lost. The layouts skip
// sections with nothing in them.
export function orderedSections(resume: TailoredResume): PlacedSection[] {
  const others = resume.otherSections?.length ?? 0
  const out: PlacedSection[] = []
  const seen = new Set<StandardSection>()
  let next = 0
  for (const key of resume.sectionOrder?.length ? resume.sectionOrder : defaultLayout(others)) {
    if (key === 'other') {
      if (next < others) out.push({ key, index: next++ })
    } else if (DEFAULT_ORDER.includes(key) && !seen.has(key)) {
      seen.add(key)
      out.push({ key })
    }
  }
  for (const key of DEFAULT_ORDER) if (!seen.has(key)) out.push({ key })
  while (next < others) out.push({ key: 'other', index: next++ })
  return out
}
