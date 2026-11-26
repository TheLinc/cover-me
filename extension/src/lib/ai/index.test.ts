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

const NO_DEAR = 'Plan:\n- billing exports: Initech\n\nHello Hiring Team,\n\nI rebuilt the billing export at Initech.\n\nKind regards,\nSam Lee'

test('a reply with an untagged plan and no "Dear" goes to the retry, never to the user', async () => {
  call.mockResolvedValueOnce(NO_DEAR).mockResolvedValueOnce(DRAFT)
  await expect(generateCoverLetter(JOB, RESUME, 'claude', 'sk-test')).resolves.toBe(DRAFT)
  expect(call.mock.calls[1][0]).toContainEqual(expect.objectContaining({ content: expect.stringContaining('No letter found') }))
})

test('no letter in the draft or the retry is an error, not the plan', async () => {
  call.mockResolvedValueOnce(NO_DEAR).mockResolvedValueOnce(NO_DEAR)
  await expect(generateCoverLetter(JOB, RESUME, 'claude', 'sk-test')).rejects.toThrow('no letter')
})
