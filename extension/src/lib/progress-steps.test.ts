import { describe, expect, test } from 'vitest'
import { letterSteps, tailorSteps } from './progress-steps'

const states = (steps: { state: string }[]) => steps.map((s) => s.state)

describe('letterSteps', () => {
  test('reading the posting, then writing', () => {
    expect(states(letterSteps(false))).toEqual(['active', 'todo'])
    expect(states(letterSteps(true))).toEqual(['done', 'active'])
  })
})

describe('tailorSteps', () => {
  test('follows the stream stage', () => {
    expect(states(tailorSteps('', false, true))).toEqual(['active', 'todo', 'todo', 'todo', 'todo'])
    expect(states(tailorSteps('Writing your summary…', true, true))).toEqual(['done', 'active', 'todo', 'todo', 'todo'])
    expect(states(tailorSteps('Optimizing skills…', true, true))).toEqual(['done', 'done', 'done', 'active', 'todo'])
    expect(states(tailorSteps('Scoring ATS match…', true, true))).toEqual(['done', 'done', 'done', 'done', 'active'])
  })

  test('shows which role is being rewritten', () => {
    const steps = tailorSteps('Rewriting experience (2 of 3)…', true, true)
    expect(steps[2]).toEqual({ label: 'Rewrite experience (2 of 3)', state: 'active' })
  })

  test('no summary step when the summary is off', () => {
    const labels = tailorSteps('Rewriting experience…', true, false).map((s) => s.label)
    expect(labels).not.toContain('Write the summary')
    expect(labels).toHaveLength(4)
  })

  test('the first-run resume read and unknown labels sit on the first step', () => {
    expect(states(tailorSteps('Reading your resume (first run only)…', true, true))[0]).toBe('active')
    expect(states(tailorSteps('Something new…', true, true))[0]).toBe('active')
  })

  test('projects count as the skills step', () => {
    expect(states(tailorSteps('Tailoring projects…', true, true))[3]).toBe('active')
  })
})
