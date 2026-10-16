const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'dist/', 'site/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  {
    files: ['src/main/**/*.js', 'scripts/**/*.js', 'test/**/*.js', '*.config.js', 'eslint.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  },
  {
    files: ['src/renderer/**/*.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.browser } },
  },
  {
    files: ['scripts/sw.template.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.serviceworker, __SHELL__: 'readonly' } },
  },
  {
    // page.evaluate callbacks run in the renderer
    files: ['test/e2e/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
