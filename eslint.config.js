// ESLint flat config: JS recommended rules + typescript-eslint recommended (no type-aware rules,
// so linting stays fast and needs no project wiring). Formatting is not linted on purpose.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'docs/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Same convention as tsc's noUnusedParameters: a leading underscore marks an intentionally unused name.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // the accessibility check (scripts/a11y) is plain Node; its page.evaluate callbacks run in the browser
    files: ['scripts/a11y/**/*.mjs'],
    languageOptions: {
      globals: Object.fromEntries(
        ['process', 'console', 'setTimeout', 'fetch', 'URL', 'document', 'window', 'getComputedStyle'].map((g) => [g, 'readonly']),
      ),
    },
  },
);
