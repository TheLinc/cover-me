import { startMockAnthropic } from './mock-anthropic'

export const MOCK_PORT = Number(process.env.MOCK_ANTHROPIC_PORT ?? 54399)

export default async function setup() {
  const server = await startMockAnthropic(MOCK_PORT)
  return () => new Promise<void>((resolve) => server.close(() => resolve()))
}
