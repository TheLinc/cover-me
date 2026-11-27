import { beforeEach, expect, test, vi } from 'vitest'

const auth = vi.hoisted(() => ({ deleteApplicationFromBackend: vi.fn(), ensureValidSession: vi.fn() }))
const storage = vi.hoisted(() => ({ deleteFromHistory: vi.fn(), deleteFromTailoredHistory: vi.fn() }))
vi.mock('../lib/auth', () => auth)
vi.mock('../lib/storage', () => storage)

import { handleDeletePort, type DeletePortMessage, type DeleteResult } from './delete'

function fakePort() {
  let onMessage: (msg: DeletePortMessage) => void = () => {}
  let onDisconnect: () => void = () => {}
  const results: DeleteResult[] = []
  const port = {
    postMessage: (r: DeleteResult) => results.push(r),
    onMessage: { addListener: (fn: typeof onMessage) => { onMessage = fn } },
    onDisconnect: { addListener: (fn: typeof onDisconnect) => { onDisconnect = fn } },
  } as unknown as chrome.runtime.Port
  handleDeletePort(port)
  return { send: (m: DeletePortMessage) => onMessage(m), close: () => onDisconnect(), results }
}

const serverTarget = { key: 'job-a', serverId: 'app-1', coverLetterIds: ['cl-1'], tailoredIds: ['tr-1'] }

beforeEach(() => {
  vi.clearAllMocks()
  auth.ensureValidSession.mockResolvedValue({ access_token: 'token' })
})

test('a server delete also removes the local copies, so their resume file can be pruned', async () => {
  auth.deleteApplicationFromBackend.mockResolvedValue(undefined)
  const port = fakePort()
  port.send({ schedule: serverTarget })
  port.close()
  await vi.waitFor(() => expect(storage.deleteFromTailoredHistory).toHaveBeenCalledWith('tr-1'))
  expect(auth.deleteApplicationFromBackend).toHaveBeenCalledWith('token', 'app-1')
  expect(storage.deleteFromHistory).toHaveBeenCalledWith('cl-1')
})

test('a failed server delete keeps the local copies', async () => {
  auth.deleteApplicationFromBackend.mockRejectedValue(new Error('offline'))
  const port = fakePort()
  port.send({ schedule: serverTarget })
  port.close()
  await vi.waitFor(() => expect(auth.deleteApplicationFromBackend).toHaveBeenCalled())
  await new Promise((r) => setTimeout(r, 0))
  expect(storage.deleteFromHistory).not.toHaveBeenCalled()
  expect(storage.deleteFromTailoredHistory).not.toHaveBeenCalled()
})
