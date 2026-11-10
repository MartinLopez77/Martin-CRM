import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'backups/', 'test-results/', 'playwright-report/', 'tests/.tmp/', 'demo/'] },
  js.configs.recommended,
  {
    // Cliente: módulos ES en el navegador
    files: ['src/**/*.js'],
    languageOptions: { sourceType: 'module', globals: globals.browser },
  },
  {
    // Servidor: módulos ES en Node
    files: ['server.js', 'src/server/**/*.js'],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
  {
    // Configuración y tests (módulos ES en Node; los E2E también ejecutan código en el navegador)
    files: ['**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
];
