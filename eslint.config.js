const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');



module.exports = [
  {
    ignores: ['dist/**/*', '.qa-artifacts/**/*', '.playwright-mcp/**/*', 'test-results/**/*'],
  },
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },

    rules: {
    },
  },
];