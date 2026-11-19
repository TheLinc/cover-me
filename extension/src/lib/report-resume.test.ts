import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { AuthSession, ParsedResume, ResumeData, Settings } from '../types'

const storage = vi.hoisted(() => ({ getResume: vi.fn(), saveParsedResume: vi.fn() }))
const parse = vi.hoisted(() => vi.fn())
vi.mock('./storage', () => storage)
vi.mock('./crypto', () => ({ decryptApiKey: async (k: string) => `plain-${k}` }))
vi.mock('./ai/resume-parse', () => ({ parseResumeStructure: parse, upgradedParse: (_: unknown, p: ParsedResume) => p }))

const { readResumeForReport } = await import('./report-resume')

const structured = { name: 'Jane Doe', experience: [] } as unknown as ParsedResume
const session = { access_token: 'tok', user: { id: 'u1', email: 'jane@example.com' } } as AuthSession
const settings: Settings = { provider: 'openai', apiKey: 'enc', mode: 'byok' }
const resume = (over: Partial<ResumeData> = {}) => ({ text: 'Jane Doe resume', filename: 'r.pdf', updatedAt: '', ...over }) as ResumeData

beforeEach(() => vi.resetAllMocks())

describe('readResumeForReport', () => {
  test('hosted: the account’s parse, or a message by status', async () => {
    const reply = (body: unknown, status = 200) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))
    reply({ structured })
    await expect(readResumeForReport('hosted', null, session)).resolves.toEqual(structured)
    reply({ error: 'No resume found' }, 404)
    await expect(readResumeForReport('hosted', null, session)).rejects.toThrow('Add your resume first.')
    reply({ error: 'Resume parse failed' }, 500)
    await expect(readResumeForReport('hosted', null, session)).rejects.toThrow("Couldn't read your resume")
    await expect(readResumeForReport('hosted', null, null)).rejects.toThrow('Sign in again')
  })

  test('BYOK: the kept parse, else one made with the key and kept only for the same resume', async () => {
    storage.getResume.mockResolvedValue(resume({ parsed: structured }))
    await expect(readResumeForReport('byok', null, null)).resolves.toEqual(structured)
    expect(parse).not.toHaveBeenCalled()

    storage.getResume.mockResolvedValue(resume())
    await expect(readResumeForReport('byok', null, null)).rejects.toThrow('Add your API key')

    parse.mockResolvedValue(structured)
    await expect(readResumeForReport('byok', settings, null)).resolves.toEqual(structured)
    expect(parse).toHaveBeenCalledWith('Jane Doe resume', 'openai', 'plain-enc')
    // With the text it read, so a resume replaced meanwhile keeps its own parse.
    expect(storage.saveParsedResume).toHaveBeenCalledWith(structured, 'Jane Doe resume')

    storage.getResume.mockResolvedValue(resume())
    parse.mockRejectedValue(new Error('401'))
    await expect(readResumeForReport('byok', settings, null)).rejects.toThrow('Check your API key')
    storage.getResume.mockResolvedValue(null)
    await expect(readResumeForReport('byok', settings, null)).rejects.toThrow('Add your resume first.')
  })
})
