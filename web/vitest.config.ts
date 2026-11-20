import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: local('.') },
      // The site reads uploads in the browser, and only mammoth's browser build takes an arrayBuffer (#278).
      { find: /^mammoth$/, replacement: local('node_modules/mammoth/mammoth.browser.js') },
    ],
  },
  oxc: { jsx: { runtime: 'automatic' } },
})
