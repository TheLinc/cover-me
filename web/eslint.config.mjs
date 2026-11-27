import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  { ignores: ['.next/', '.next-verify*/'] },
  {
    ...tseslint.configs.base,
    files: ['**/*.{ts,tsx,js,mjs}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    ignores: ['app/layout.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@/lib/utils',
          importNames: ['CHROME_STORE_URL'],
          message: "A visible link to the store listing needs UTM tags, or the store dashboard can't tell which placement brought the install (#280). Use storeUrl('<placement>') from '@/lib/utils'. The bare URL is only for structured data, in app/layout.tsx and lib/structured-data.ts.",
        }],
      }],
    },
  },
)
