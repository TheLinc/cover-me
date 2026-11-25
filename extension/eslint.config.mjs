import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  { ignores: ['dist/', 'eval/reports/'] },
  {
    ...tseslint.configs.base,
    files: ['**/*.{ts,tsx,js,mjs}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // page.ts also runs in the Deno scrape function, which has no DOM types to replace its any with (#261).
  { files: ['src/content/scrapers/page.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
)
