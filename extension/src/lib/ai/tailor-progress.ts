// Derives a human-readable progress label from the model's accumulating JSON
// output during a tailor generation. The delta schema emits its keys in a fixed
// order (summary → experience → projects → skills → keywordMatch), so the last
// key seen tells us which stage the model is in. Used by both the BYOK path
// (raw model stream) and the hosted path (NDJSON deltas from the Edge Function).
export function deriveTailorProgress(buffer: string, roleCount: number): string {
  if (buffer.includes('"keywordMatch"')) return 'Scoring ATS match…'
  if (buffer.includes('"skills"')) return 'Optimizing skills…'
  if (buffer.includes('"projects"')) return 'Tailoring projects…'
  const ex = buffer.indexOf('"experience"')
  if (ex !== -1) {
    // Each role's bullets array opens with a "bullets" key — count them to know
    // which role the model is currently rewriting.
    const started = (buffer.slice(ex).match(/"bullets"/g) ?? []).length
    if (roleCount > 1) {
      const current = Math.max(1, Math.min(started, roleCount))
      return `Rewriting experience (${current} of ${roleCount})…`
    }
    return 'Rewriting experience…'
  }
  if (buffer.includes('"summary"')) return 'Writing your summary…'
  return 'Analyzing the job posting…'
}
