import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so the CRXJS manifest plugin and the dist checks
// don't run under tests. Pure-logic tests only for now; the popup render tests
// (Phase 1a) switch this to jsdom with a chrome.* fake.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
