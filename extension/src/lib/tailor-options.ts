// The user's file sets the page, so "Your design" has no compacting, and a
// summary only where the file has one (#131).
export function tailorSummary(o: { compact: boolean; trim: boolean; includeSummary: boolean; yours: boolean; designSummary: boolean }): string {
  const on = [
    o.yours && 'Your design',
    !o.yours && o.compact && 'One page',
    o.trim && 'Trim bullets',
    (!o.yours || o.designSummary) && o.includeSummary && 'Summary',
  ].filter(Boolean)
  return on.join(' · ') || 'None'
}
