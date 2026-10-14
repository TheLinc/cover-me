import { describe, expect, test } from 'vitest'
import { deriveTailorProgress } from './ai/tailor-progress'
import { letterSteps, tailorSteps } from './progress-steps'

const states = (steps: { state: string }[]) => steps.map((s) => s.state)
const active = (progress: string) => tailorSteps(progress, true).find((s) => s.state === 'active')

describe('letterSteps', () => {
  test('reading the posting, then writing', () => {
    expect(states(letterSteps(false))).toEqual(['active', 'todo'])
    expect(states(letterSteps(true))).toEqual(['done', 'active'])
  })
})

describe('tailorSteps', () => {
  test('four steps, in order', () => {
    expect(tailorSteps('', false).map((s) => s.label)).toEqual(['Read the posting', 'Plan the changes', 'Rewrite your resume', 'Check and score'])
    expect(states(tailorSteps('', false))).toEqual(['active', 'todo', 'todo', 'todo'])
  })

  test('the posting is done once it is read; thinking is "Plan"', () => {
    expect(states(tailorSteps('', true))).toEqual(['done', 'active', 'todo', 'todo'])
    expect(states(tailorSteps('Analyzing the job posting…', true))).toEqual(['done', 'active', 'todo', 'todo'])
    expect(active('Something new…')?.label).toBe('Plan the changes')
  })

  test('every part being written is "Rewrite", with the part as the detail', () => {
    expect(active('Writing your summary…')).toEqual({ label: 'Rewrite your resume', state: 'active', detail: 'Summary' })
    expect(active('Rewriting experience (2 of 3)…')?.detail).toBe('Experience, 2 of 3')
    expect(active('Rewriting experience…')?.detail).toBe('Experience')
    expect(active('Tailoring projects…')?.detail).toBe('Projects')
    expect(active('Optimizing skills…')?.detail).toBe('Skills')
  })

  test('the keyword lists and the checks are "Check and score"', () => {
    expect(states(tailorSteps('Scoring ATS match…', true))).toEqual(['done', 'done', 'done', 'active'])
    expect(active('Checking every line against your resume…')?.label).toBe('Check and score')
  })

  test('the first-run resume read is part of planning', () => {
    expect(active('Reading your resume (first run only)…')).toEqual({ label: 'Plan the changes', state: 'active', detail: 'Reading your resume first' })
  })

  test('only the active step has a detail', () => {
    expect(tailorSteps('Rewriting experience (1 of 2)…', true).filter((s) => s.detail)).toHaveLength(1)
  })
})

describe('deriveTailorProgress', () => {
  const full = '{"summary":"x","experience":[{"bullets":["a"]}],"skills":"y","keywordMatch":{"tier1Covered":[]}}'

  test('follows the keys as they stream', () => {
    expect(deriveTailorProgress('', 2)).toBe('Analyzing the job posting…')
    expect(deriveTailorProgress('{"summary":"x","experience":[{"bullets":["a"]},{"bullets":[', 2)).toBe('Rewriting experience (2 of 2)…')
    expect(deriveTailorProgress(full.slice(0, -2), 2)).toBe('Scoring ATS match…')
  })

  test('a complete object means the checks are running', () => {
    expect(deriveTailorProgress(full, 2)).toBe('Checking every line against your resume…')
    expect(deriveTailorProgress('```json\n' + full + '\n```', 2)).toBe('Checking every line against your resume…')
  })

  test('a closed inner object is not the end', () => {
    expect(deriveTailorProgress('{"summary":"x","keywordMatch":{"tier1Covered":[]}', 2)).toBe('Scoring ATS match…')
  })
})
