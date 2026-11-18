import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: local('.') },
      // The site reads uploads in the browser: only mammoth's browser build takes an arrayBuffer,
      // and pdf.js's default build needs browser APIs Node lacks (#278).
      { find: /^mammoth$/, replacement: local('node_modules/mammoth/mammoth.browser.js') },
      { find: /^pdfjs-dist$/, replacement: local('node_modules/pdfjs-dist/legacy/build/pdf.mjs') },
    ],
  },
})
