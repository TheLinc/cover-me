import { startMockAnthropic } from '../../backend/tests/mock-anthropic.ts'
await startMockAnthropic(Number(process.argv[2]))
console.log('mock up on', process.argv[2])
