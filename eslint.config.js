const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');



module.exports = [
  {
    files: ['**/*.{ts,tsx,js}'],
    ignores: ['dist/**/*'],
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