import { defineConfig } from '@playwright/test';

const PORT = 4600;

// Tests de las rutas críticas en el navegador, contra el servidor real con datos ficticios
// (tests/fixtures/data.json, copiado a tests/.tmp antes de cada test). Nunca toca data.json.
export default defineConfig({
  testDir: 'tests/e2e',
  // Todos los tests comparten el mismo archivo de datos: uno detrás de otro.
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: 'chrome', // el Chrome instalado: no hace falta descargar navegadores
    viewport: { width: 1400, height: 1000 },
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node server.js',
    env: { PORT: String(PORT), CRM_DATA_FILE: 'tests/.tmp/data.json' },
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
  },
});
