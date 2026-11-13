// Resume fields added for long master resumes (#190): a headline, a project's
// link and tech line, entries in an extra section, and skills in labelled
// groups, one per line. A client built before them prints only the fields it
// knows, and the backend ships before a new extension clears store review,
// so a client asks for them with this header; any other gets them folded
// into the fields it already prints.
export const RESUME_FIELDS_HEADER = 'X-Resume-Fields'
export const RESUME_FIELDS_VERSION = '2'

export function wantsNewFields(req: Request): boolean {
  return req.headers.get(RESUME_FIELDS_HEADER) === RESUME_FIELDS_VERSION
}

type Rec = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) : [])

/**
 * The resume in the shape an older client prints in full: each project's tech
 * and link as its first bullet ("Python, React | github.com/x"; an older
 * client never wraps a project name, so a long one would run off the page), each
 * extra-section entry as a line ("Name | subtitle | dates | link") followed by
 * its bullets as lines, and grouped skills on one line. The headline stays: an
 * older client never printed one, and keeping it lets a save round-trip.
 * A resume without the new fields comes back unchanged.
 */
export function withOlderFields<T>(resume: T, req: Request): T {
  if (wantsNewFields(req) || !resume || typeof resume !== 'object') return resume
  const r = { ...(resume as Rec) }
  if (Array.isArray(r.projects)) {
    r.projects = r.projects.map((p: Rec) => {
      if (!p || typeof p !== 'object' || (!str(p.tech) && !str(p.link))) return p
      const { link, tech, ...rest } = p
      return { ...rest, bullets: [[str(tech), str(link)].filter(Boolean).join(' | '), ...strings(p.bullets)] }
    })
  }
  if (Array.isArray(r.otherSections)) {
    r.otherSections = r.otherSections.map((s: Rec) => {
      if (!s || typeof s !== 'object' || !Array.isArray(s.entries)) return s
      const { entries, ...rest } = s
      const fromEntries = (entries as Rec[]).flatMap((e) => {
        const header = [str(e?.name), str(e?.subtitle), str(e?.dates), str(e?.link)].filter(Boolean).join(' | ')
        return header ? [header, ...strings(e?.bullets)] : []
      })
      return { ...rest, lines: [...fromEntries, ...strings(s.lines)] }
    })
  }
  if (typeof r.skills === 'string' && r.skills.includes('\n')) {
    r.skills = r.skills.split(/\n+/).map((l) => l.trim()).filter(Boolean).join('; ')
  }
  return r as T
}
