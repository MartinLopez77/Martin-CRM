import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'backups/', 'test-results/', 'playwright-report/', 'tests/.tmp/'] },
  js.configs.recommended,
  {
    // Servidor (CommonJS, Node)
    files: ['server.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    // Cliente: un script clásico en el navegador
    files: ['public/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    // Configuración y tests (módulos ES en Node)
    files: ['**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
];
