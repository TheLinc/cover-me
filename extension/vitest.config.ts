import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so the CRXJS manifest plugin and the dist checks
// don't run under tests (https://github.com/TheLinc/cover-me/commit/19482ab3).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'eval/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
})
