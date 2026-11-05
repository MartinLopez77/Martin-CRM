// Para importar en Node los módulos del cliente (stores, schemas): un DOM de jsdom con el index.html real,
// datos de prueba y la fecha fija de los tests. Los intervalos (reloj, cronómetro) no corren.
import { mock } from 'node:test';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

mock.timers.enable({ apis: ['Date', 'setInterval'], now: new Date('2026-11-05T10:00:00+01:00') });

const dom = new JSDOM(fs.readFileSync('src/client/index.html', 'utf8'), { url: 'http://127.0.0.1/' });
for (const nombre of ['window', 'document', 'localStorage', 'location', 'Event', 'Node', 'HTMLElement', 'getSelection']) {
  Object.defineProperty(globalThis, nombre, { value: dom.window[nombre], configurable: true, writable: true });
}

/** Los datos ficticios de tests/fixtures/data.json, recién leídos (cada test puede cambiarlos sin afectar a otros). */
export const datosDePrueba = () => JSON.parse(fs.readFileSync('tests/fixtures/data.json', 'utf8'));
