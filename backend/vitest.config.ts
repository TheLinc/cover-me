import { defineConfig } from 'vitest/config'

// Integration tests hit the local REST API and served Edge Functions over HTTP. Run them
// through `pnpm test:functions`, which serves the functions against the mock
// Anthropic server and passes the local keys in as env vars.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    // One shared database and one mock server: run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
