import { describe, expect, test } from 'vitest'
import { tailoredResumePdf } from './resume'
import type { TailoredResume } from './types'

const resume = (bullets: number): TailoredResume => ({
  name: 'Pat Lee', phone: '555-0100', email: 'pat@example.com', website: '',
  experience: [{
    title: 'Engineer', company: 'Acme', location: 'Remote', dates: '2024 - Present',
    bullets: Array.from({ length: bullets }, () => 'Built a service that does a reasonably long thing for a long sentence that wraps once on the page width.'),
  }],
  education: [{ institution: 'State University', degree: 'BS Computer Science', location: '', dates: '2020', bullets: [] }],
})

describe('fit to page', () => {
  test('a resume a little over one page is tightened onto one', () => {
    expect(tailoredResumePdf(resume(27)).getNumberOfPages()).toBe(1)
  })

  test('a one-page resume stays one page', () => {
    expect(tailoredResumePdf(resume(5)).getNumberOfPages()).toBe(1)
  })
})
