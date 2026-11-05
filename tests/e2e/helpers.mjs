import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Todos los tests ocurren el jueves 5 de noviembre de 2026 a las 10:00 en España (los datos ficticios
// tienen tareas de ese día, del anterior y del sábado siguiente).
export const AHORA = new Date('2026-11-05T10:00:00+01:00');

const TMP = path.resolve('tests/.tmp');
const DATOS = path.join(TMP, 'data.json');

/** Lo que el servidor tiene guardado ahora mismo (después de esperar a que el CRM guarde). */
export const datosGuardados = () => JSON.parse(fs.readFileSync(DATOS, 'utf8'));

/** Sustituye los datos de prueba (antes de abrir la página). @param {unknown} datos */
export const escribirDatos = (datos) => fs.writeFileSync(DATOS, JSON.stringify(datos));

/**
 * Espera a que el CRM termine de guardar. El CRM guarda 250 ms después del último cambio y el indicador
 * puede decir «Guardado» por un guardado anterior mientras otro sigue pendiente: por eso se espera a que
 * pase ese retardo y se vuelve a comprobar.
 * @param {import('@playwright/test').Page} page
 */
export async function esperarGuardado(page) {
  const estado = page.locator('#save-status');
  await expect(estado).not.toHaveAttribute('data-tipo', 'saving');
  await page.waitForTimeout(400);
  await expect(estado).not.toHaveAttribute('data-tipo', 'saving');
}

// Cada test empieza con los datos ficticios intactos, a la misma hora, y falla si hay errores de JavaScript.
export const test = base.extend({
  page: async ({ page }, use) => {
    fs.mkdirSync(TMP, { recursive: true });
    fs.copyFileSync('tests/fixtures/data.json', DATOS);
    /** @type {string[]} */
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
    await page.clock.setFixedTime(AHORA);
    await use(page);
    await esperarGuardado(page);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

export { expect };
