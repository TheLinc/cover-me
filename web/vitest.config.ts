import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Resolve the `@/` import alias the same way tsconfig does.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
})
