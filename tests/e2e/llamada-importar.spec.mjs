import fs from 'node:fs';
import path from 'node:path';
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

  // Antes de llamar no se puede poner el resultado ni registrar
  const resultado = ventana.locator('[name="ll-resultado"]');
  await expect(resultado).toBeDisabled();
  await expect(ventana.getByRole('button', { name: 'Registrar llamada' })).toBeDisabled();
  await page.evaluate(() => document.addEventListener('click', (e) => {
    if (/** @type {Element} */ (e.target).closest('a[href^="tel:"]')) e.preventDefault();
  }));
  await ventana.getByRole('link', { name: 'Llamar' }).click();
  await expect(ventana.locator('.ll-grabando')).toContainText('Grabando');
  await ventana.getByRole('button', { name: 'Colgar' }).click();
  // Después de llamar: viene en «Sin completar», que desaparece de la lista al elegir un resultado
  await expect(resultado).toBeEnabled();
  await expect(resultado).toHaveValue('');
  await expect(ventana.getByRole('button', { name: 'Registrar llamada' })).toBeDisabled();
  await resultado.selectOption('sin-respuesta');
  await expect(resultado.locator('option', { hasText: 'Sin completar' })).toHaveCount(0);
  await ventana.locator('[name="ll-notas"]').fill('Volver a llamar el lunes');
  await ventana.getByRole('button', { name: 'Registrar llamada' }).click();
  await expect(ventana).toBeHidden();
  await expect(page.locator('.timeline')).toContainText('Llamada sin respuesta');
  await esperarGuardado(page);
  const d = datosGuardados();
  expect(d.actions.some((/** @type {any} */ a) => a.contactId === 'c-carla' && a.tipo === 'llamada-sin-respuesta')).toBe(true);
  expect(d.notes.some((/** @type {any} */ n) => n.contactId === 'c-carla' && n.contenido === 'Volver a llamar el lunes')).toBe(true);
});

test('llamada: se graba siempre, una sola llamada por ventana y no se cierra sin resultado', async ({ page }) => {
  page.on('dialog', (dl) => dl.accept());
  await page.goto('/#/contacto/c-carla');
  // El enlace tel: no se abre de verdad: Chrome mostraría su diálogo de «abrir la app» y se tragaría los clics.
  // Se cancela después de que la ventana de llamada lo haya atendido.
  await page.evaluate(() => document.addEventListener('click', (e) => {
    if (/** @type {Element} */ (e.target).closest('a[href^="tel:"]')) e.preventDefault();
  }));
  await page.getByRole('button', { name: 'Llamar' }).click();
  const ventana = page.locator('#llamada');

  // La ventana es cuadrada; arriba solo «Llamada» y, bajo el nombre, la empresa (sin el cargo)
  const caja = /** @type {{ width: number, height: number }} */ (await ventana.boundingBox());
  expect(Math.abs(caja.width - caja.height)).toBeLessThanOrEqual(2);
  await expect(ventana.locator('.ll-cabecera')).not.toContainText('Carla');
  await expect(ventana.locator('.persona')).toContainText('Clínica Luz');
  await expect(ventana.locator('.persona')).not.toContainText('Recepción');
  await expect(ventana.locator('[name="ll-grabar"]')).toHaveCount(0); // no hay casilla: se graba siempre

  await ventana.getByRole('link', { name: 'Llamar' }).click();
  await expect(ventana.locator('.ll-grabando')).toContainText('Grabando solo tu voz'); // sin «Mezcla estéreo» en el test
  await page.waitForTimeout(1500);
  await ventana.getByRole('button', { name: 'Colgar' }).click();
  await expect(ventana.locator('.ll-grabando')).toContainText('Llamada grabada');

  // Después de colgar: «Llamar» apagado y la ventana no se quita sin elegir el resultado
  await expect(ventana.locator('.ll-cabecera')).toContainText('Llamada terminada');
  await expect(ventana.getByRole('button', { name: 'Llamar' })).toBeDisabled();
  await expect(ventana.locator('[name="ll-resultado"]')).toHaveClass(/falta/);
  await ventana.getByRole('button', { name: 'Cerrar' }).click();
  await expect(ventana).toBeVisible();
  await expect(page.locator('#aviso')).toContainText('Elige el resultado');
  // Tampoco se abre otra llamada mientras esta no se registre
  await page.goto('/#/contacto/c-ana');
  await page.getByRole('button', { name: 'Llamar' }).first().click();
  await expect(ventana.locator('.persona')).toContainText('Carla Vidal');

  // Con el resultado, cerrar la registra
  await ventana.locator('[name="ll-resultado"]').selectOption('conectada');
  await ventana.getByRole('button', { name: 'Cerrar' }).click();
  await expect(ventana).toBeHidden();

  await page.goto('/#/contacto/c-carla');
  const audio = page.locator('.timeline audio.tl-audio');
  await expect(audio).toHaveCount(1);
  await esperarGuardado(page);
  const accion = datosGuardados().actions.find((/** @type {any} */ a) => a.contactId === 'c-carla' && a.grabacion);
  expect(accion.resultado).toBe('conectada');
  const archivo = path.resolve('tests/.tmp/grabaciones', `${accion.grabacion}.webm`);
  await expect.poll(() => fs.existsSync(archivo) && fs.statSync(archivo).size).toBeGreaterThan(0);
  // El reproductor carga el audio (y pulsarlo no abre el editor de la acción)
  await expect.poll(() => audio.evaluate((a) => /** @type {HTMLAudioElement} */ (a).readyState)).toBeGreaterThan(0);
  await audio.click();
  await expect(page.locator('#modal')).toBeHidden();

  // Borrar la acción borra también la grabación
  await page.locator('.timeline .tl-cuerpo', { has: page.locator('audio') }).locator('.tl-cabecera').click();
  await page.locator('#modal').getByRole('button', { name: /Eliminar/ }).click();
  await expect(audio).toHaveCount(0);
  await expect.poll(() => fs.existsSync(archivo)).toBe(false);
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
