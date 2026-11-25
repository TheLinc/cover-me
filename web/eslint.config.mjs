import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  { ignores: ['.next/'] },
  {
    ...tseslint.configs.base,
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
)
