import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      // The site reads Word files in the browser, and only mammoth's browser build takes an arrayBuffer (#278).
      mammoth: fileURLToPath(new URL('node_modules/mammoth/mammoth.browser.js', import.meta.url)),
    },
  },
})
