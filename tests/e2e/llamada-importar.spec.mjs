import { test, expect, datosGuardados, esperarGuardado } from './helpers.mjs';

test('ventana de llamada: arrastrar, minimizar y registrar', async ({ page }) => {
  await page.goto('/#/contacto/c-carla');
  // Con texto seleccionado en la página (el caso que rompía el arrastre)
  await page.evaluate(() => {
    const r = document.createRange();
    r.selectNodeContents(/** @type {Node} */ (document.querySelector('.tc-datos')));
    getSelection()?.addRange(r);
  });
  await page.getByRole('button', { name: 'Llamar' }).click();
  const ventana = page.locator('#llamada');
  const cabecera = ventana.locator('.ll-cabecera');
  const antes = /** @type {{x: number, y: number}} */ (await ventana.boundingBox());

  const caja = /** @type {{x: number, y: number}} */ (await cabecera.boundingBox());
  await page.mouse.move(caja.x + 60, caja.y + 15);
  await page.mouse.down();
  await page.mouse.move(caja.x - 500, caja.y - 300, { steps: 10 });
  await page.mouse.up();
  const despues = /** @type {{x: number, y: number}} */ (await ventana.boundingBox());
  expect(despues.x).toBeLessThan(antes.x - 400);
  expect(despues.y).toBeLessThan(antes.y - 200);
  await expect(ventana).not.toHaveClass(/minimizada/); // soltar no minimiza

  await cabecera.click({ position: { x: 60, y: 15 } });
  await expect(ventana).toHaveClass(/minimizada/);
  await cabecera.click({ position: { x: 60, y: 15 } });

  await ventana.locator('[name="ll-resultado"]').selectOption('sin-respuesta');
  await ventana.locator('[name="ll-notas"]').fill('Volver a llamar el lunes');
  await ventana.getByRole('button', { name: 'Registrar llamada' }).click();
  await expect(ventana).toBeHidden();
  await expect(page.locator('.timeline')).toContainText('Llamada sin respuesta');
  await esperarGuardado(page);
  const d = datosGuardados();
  expect(d.actions.some((/** @type {any} */ a) => a.contactId === 'c-carla' && a.tipo === 'llamada-sin-respuesta')).toBe(true);
  expect(d.notes.some((/** @type {any} */ n) => n.contactId === 'c-carla' && n.contenido === 'Volver a llamar el lunes')).toBe(true);
});

test('importar CSV: solo contactos con email válido y único, con nombre de importación', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Importar CSV' }).click();
  await page.locator('#modal [name=archivo]').setInputFiles('tests/fixtures/contactos.csv');
  const resumen = page.locator('#imp-resumen');
  await expect(resumen).toContainText('3 contactos nuevos de 6 filas');
  await expect(resumen).toContainText('1 ya existe en el CRM');
  await expect(resumen).toContainText('1 con el email repetido');
  await expect(resumen).toContainText('1 sin email válido');
  // Columnas reconocidas solas por la cabecera
  const mapa = await page.locator('#imp-mapa select').evaluateAll((ss) => ss.map((s) => /** @type {HTMLSelectElement} */ (s).value));
  expect(mapa).toEqual(['pila', 'apellidos', 'email', 'telefono', 'empresa', 'cargo', 'estadoLead']);
  await page.locator('#modal [name=nombreImp]').fill('Dentistas noviembre');
  await page.getByRole('button', { name: 'Importar contactos' }).click();

  await expect(page.locator('#aviso')).toContainText('3 contactos importados');
  await expect(page.locator('#tabla-contactos tbody tr')).toHaveCount(3);
  await expect(page.locator('#f-importacion')).toHaveValue('Dentistas noviembre');
  await esperarGuardado(page);
  const d = datosGuardados();
  const nuevos = d.contacts.filter((/** @type {any} */ c) => c.importacion === 'Dentistas noviembre');
  expect(nuevos.map((/** @type {any} */ c) => c.email).sort()).toEqual(['lucia@dentalnorte.example', 'pedro@reformasmartin.example', 'raul@dentalnorte.example']);
  expect(nuevos.find((/** @type {any} */ c) => c.email.startsWith('pedro')).nombre).toBe('Pedro, hijo Martín');
  const lead = Object.fromEntries(d.companies.filter((/** @type {any} */ e) => e.importacion).map((/** @type {any} */ e) => [e.nombre, e.estadoLead]));
  expect(lead).toEqual({ 'Dental Norte': 'prospecting', 'Reformas Martín, S.L.': 'open_deal' });

  // Volver a importar el mismo archivo no crea nada
  /** @type {string[]} */
  const alertas = [];
  page.on('dialog', (dl) => { alertas.push(dl.message()); dl.accept(); });
  await page.getByRole('button', { name: 'Importar CSV' }).click();
  await page.locator('#modal [name=archivo]').setInputFiles('tests/fixtures/contactos.csv');
  await expect(resumen).toContainText('0 contactos nuevos');
  await page.locator('#modal [name=nombreImp]').fill('Otra vez');
  await page.getByRole('button', { name: 'Importar contactos' }).click();
  await expect.poll(() => alertas[0]).toContain('ningún contacto nuevo');
});
