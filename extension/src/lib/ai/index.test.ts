import { beforeEach, expect, test, vi } from 'vitest'
import { callClaude } from './claude'
import { generateCoverLetter } from './index'

vi.mock('./claude', () => ({ callClaude: vi.fn() }))
const call = vi.mocked(callClaude)

const JOB = { title: 'Backend Engineer', company: 'Acme', description: 'Build event pipelines in Go.', url: 'https://example.com/job' }
const RESUME = 'Sam Lee\nEngineer at Initech. Rebuilt the billing export in TypeScript.'
const DRAFT = 'Dear Hiring Manager,\n\nI delve into billing exports at Initech.\n\nKind regards,\nSam Lee'

beforeEach(() => call.mockReset())

test('a failed cleanup retry still returns the first draft', async () => {
  call.mockResolvedValueOnce(DRAFT).mockRejectedValueOnce(new Error('Claude API error: 429'))
  await expect(generateCoverLetter(JOB, RESUME, 'claude', 'sk-test')).resolves.toBe(DRAFT)
  expect(call).toHaveBeenCalledTimes(2)
})

test('an empty cleanup retry still returns the first draft', async () => {
  call.mockResolvedValueOnce(DRAFT).mockResolvedValueOnce('')
  await expect(generateCoverLetter(JOB, RESUME, 'claude', 'sk-test')).resolves.toBe(DRAFT)
  expect(call).toHaveBeenCalledTimes(2)
})
