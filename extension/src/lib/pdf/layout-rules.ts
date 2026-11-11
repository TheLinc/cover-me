// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy).
//
// Text patterns the PDF and Word layouts both read, kept here so the Word
// module doesn't load jsPDF.

// "GPA: 4.0" and similar lines that read better on the degree line than as bullets.
export const GPA_LINE = /^(?:cumulative\s+)?(?:c?gpa|grade)\b[^\n]{0,40}$/i

// "Languages: Python, SQL": a labelled skills group, one per line.
export const SKILL_GROUP = /^([^:,\n]{2,48}):\s*(.+)$/
