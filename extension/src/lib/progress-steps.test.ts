import { describe, expect, test } from 'vitest'
import { derivePlanningProgress, deriveTailorProgress } from './ai/tailor-progress'
import { letterSteps, tailorSteps } from './progress-steps'

const states = (steps: { state: string }[]) => steps.map((s) => s.state)
const active = (progress: string) => tailorSteps(progress, true, true).find((s) => s.state === 'active')

describe('letterSteps', () => {
  test('reading the posting, then writing', () => {
    expect(states(letterSteps(false))).toEqual(['active', 'todo'])
    expect(states(letterSteps(true))).toEqual(['done', 'active'])
  })
})

describe('tailorSteps', () => {
  test('four steps, in order', () => {
    expect(tailorSteps('', false, true).map((s) => s.label)).toEqual(['Read the posting', 'Plan the changes', 'Rewrite your resume', 'Check and score'])
    expect(states(tailorSteps('', false, true))).toEqual(['active', 'todo', 'todo', 'todo'])
  })

  test('the posting is done once it is read; thinking is "Plan"', () => {
    expect(states(tailorSteps('', true, true))).toEqual(['done', 'active', 'todo', 'todo'])
    expect(states(tailorSteps('Analyzing the job posting…', true, true))).toEqual(['done', 'active', 'todo', 'todo'])
    expect(active('Something new…')?.label).toBe('Plan the changes')
  })

  test('every part being written is "Rewrite", with the part as the detail', () => {
    expect(active('Writing your summary…')).toEqual({ label: 'Rewrite your resume', state: 'active', detail: 'Summary' })
    expect(active('Rewriting experience (2 of 3)…')?.detail).toBe('Experience, 2 of 3')
    expect(active('Rewriting experience…')?.detail).toBe('Experience')
    expect(active('Tailoring projects…')?.detail).toBe('Projects')
    expect(active('Optimizing skills…')?.detail).toBe('Skills')
  })

  test('the keyword lists, and the checks after them, are "Check and score"', () => {
    expect(states(tailorSteps('Scoring ATS match…', true, true))).toEqual(['done', 'done', 'done', 'active'])
  })

  test('no "Summary" detail when the summary is off', () => {
    expect(tailorSteps('Writing your summary…', true, false).find((s) => s.state === 'active')).toEqual({ label: 'Rewrite your resume', state: 'active' })
  })

  test('the first-run resume read is part of planning', () => {
    expect(active('Reading your resume (first run only)…')).toEqual({ label: 'Plan the changes', state: 'active', detail: 'Reading your resume first' })
  })

  test('the thinking summary is the planning detail, even when it names a later stage', () => {
    expect(active('Planning: Matching the posting')).toEqual({ label: 'Plan the changes', state: 'active', detail: 'Matching the posting', thought: true })
    expect(active('Planning: The summary should lead with skills.')?.label).toBe('Plan the changes')
  })

  test('only the active step has a detail', () => {
    expect(tailorSteps('Rewriting experience (1 of 2)…', true, true).filter((s) => s.detail)).toHaveLength(1)
  })
})

describe('deriveTailorProgress', () => {
  const full = '{"summary":"x","experience":[{"bullets":["a"]}],"skills":"y","keywordMatch":{"tier1Covered":[]}}'

  test('follows the keys as they stream, staying on scoring to the end', () => {
    expect(deriveTailorProgress('', 2)).toBe('Analyzing the job posting…')
    expect(deriveTailorProgress('{"summary":"x","experience":[{"bullets":["a"]},{"bullets":[', 2)).toBe('Rewriting experience (2 of 2)…')
    expect(deriveTailorProgress(full.slice(0, -2), 2)).toBe('Scoring ATS match…')
    expect(deriveTailorProgress(full, 2)).toBe('Scoring ATS match…')
  })
})

describe('derivePlanningProgress', () => {
  test('shows the latest finished line, never one still streaming', () => {
    expect(derivePlanningProgress('')).toBe('')
    expect(derivePlanningProgress('**Matching the post')).toBe('')
    expect(derivePlanningProgress('**Matching the posting**\n\nThe posting asks')).toBe('Planning: Matching the posting')
    expect(derivePlanningProgress('**Matching the posting**\n\nThe posting asks for Kafka. The resume')).toBe('Planning: The posting asks for Kafka.')
    expect(derivePlanningProgress('Done? Next one')).toBe('Planning: Done?')
  })

  test('clips a long line', () => {
    const p = derivePlanningProgress(`${'word '.repeat(40)}end.\n`)
    expect(p.length).toBeLessThanOrEqual('Planning: '.length + 120)
    expect(p.endsWith('…')).toBe(true)
  })
})
