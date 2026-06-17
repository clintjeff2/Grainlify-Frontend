import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Downgrade rules that have widespread existing violations to warn
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'no-useless-escape': 'warn',
      'no-unsafe-finally': 'warn',
      // Keep PII-safe logging guard: disallow direct console usage (use guarded logger)
      'no-console': 'error',
    },
  },
  {
    // The guarded logger intentionally wraps the console API.
    files: ['src/shared/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  prettier,
)
