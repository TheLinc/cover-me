// What the popup shows while generating: a short list of steps, each done,
// active or still to come, built from the stage the stream already reports
// (deriveTailorProgress in lib/ai/tailor-progress.ts). No invented progress.
export type StepState = 'done' | 'active' | 'todo'
export interface Step { label: string; state: StepState }

function mark(labels: string[], active: number): Step[] {
  return labels.map((label, i) => ({ label, state: i < active ? 'done' : i === active ? 'active' : 'todo' }))
}

export function letterSteps(hasJob: boolean): Step[] {
  return mark(['Read the posting', 'Write the letter'], hasJob ? 1 : 0)
}

export function tailorSteps(progress: string, hasJob: boolean, includeSummary: boolean): Step[] {
  const role = progress.match(/\((\d+ of \d+)\)/)?.[1]
  const labels = [
    'Read the posting',
    ...(includeSummary ? ['Write the summary'] : []),
    role ? `Rewrite experience (${role})` : 'Rewrite experience',
    'Skills and projects',
    'Score the match',
  ]
  const at = (label: string) => labels.findIndex((l) => l.startsWith(label))
  let active = 0 // still reading the posting, or a stage label we don't know
  if (!hasJob) active = 0
  else if (/Scoring/.test(progress)) active = at('Score the match')
  else if (/skills|projects/i.test(progress)) active = at('Skills and projects')
  else if (/Rewriting experience/.test(progress)) active = at('Rewrite experience')
  else if (/summary/i.test(progress) && includeSummary) active = at('Write the summary')
  return mark(labels, active)
}
