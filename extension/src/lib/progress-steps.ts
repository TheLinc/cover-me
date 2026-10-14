// What the popup shows while generating: a short list of steps, each done,
// active or still to come, built from the stage the stream already reports
// (deriveTailorProgress in lib/ai/tailor-progress.ts). No invented progress.
export type StepState = 'done' | 'active' | 'todo'
export interface Step { label: string; state: StepState; detail?: string }

function mark(labels: string[], active: number, detail?: string): Step[] {
  return labels.map((label, i) => ({
    label,
    state: i < active ? 'done' : i === active ? 'active' : 'todo',
    ...(i === active && detail ? { detail } : {}),
  }))
}

export function letterSteps(hasJob: boolean): Step[] {
  return mark(['Read the posting', 'Write the letter'], hasJob ? 1 : 0)
}

const TAILOR_STEPS = ['Read the posting', 'Plan the changes', 'Rewrite your resume', 'Check and score']

// Four steps, so none flashes by: the model's thinking is "Plan", every part
// it writes is "Rewrite" (the part shows as the detail), and the keyword lists
// plus the checks against the original resume that follow them are "Check".
export function tailorSteps(progress: string, hasJob: boolean, includeSummary: boolean): Step[] {
  if (!hasJob) return mark(TAILOR_STEPS, 0)
  if (/Scoring/.test(progress)) return mark(TAILOR_STEPS, 3)
  if (/skills/i.test(progress)) return mark(TAILOR_STEPS, 2, 'Skills')
  if (/projects/i.test(progress)) return mark(TAILOR_STEPS, 2, 'Projects')
  if (/Rewriting experience/.test(progress)) {
    const role = progress.match(/\((\d+) of (\d+)\)/)
    return mark(TAILOR_STEPS, 2, role ? `Experience, ${role[1]} of ${role[2]}` : 'Experience')
  }
  // With the summary off the model still writes an empty one first.
  if (/summary/i.test(progress)) return mark(TAILOR_STEPS, 2, includeSummary ? 'Summary' : undefined)
  if (/Reading your resume/.test(progress)) return mark(TAILOR_STEPS, 1, 'Reading your resume first')
  return mark(TAILOR_STEPS, 1) // thinking, or a stage label we don't know
}
