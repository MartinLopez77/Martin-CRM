import { test, expect, datosGuardados, esperarGuardado } from './helpers.mjs';

/** @param {any[]} tareas @param {string} titulo */
const buscar = (tareas, titulo) => tareas.find((t) => t.titulo === titulo);

test('tarea rápida con Q: fecha, hora y tipo sacados del título', async ({ page }) => {
  await page.goto('/#/tareas');
  await page.keyboard.press('q');
  const titulo = page.locator('#modal [name=titulo]');
  await expect(titulo).toBeFocused();
  await titulo.fill('Llamar a Carla mañana a las 17');
  await expect(page.locator('#modal .td-chip-fecha')).toContainText('Mañana 17:00');
  await expect(page.locator('#modal [name=accion]')).toHaveValue('llamada');
  await page.keyboard.press('Enter');
  await expect(page.locator('#aviso')).toContainText('Tarea añadida');
  await esperarGuardado(page);
  const t = buscar(datosGuardados().tasks, 'Llamar a Carla');
  expect([t.fecha, t.hora, t.accion]).toEqual(['2026-11-06', '17:00', 'llamada']);
});

test('vistas de tareas: Hoy, Generales, completar con Deshacer y vista propia', async ({ page }) => {
  await page.goto('/#/tareas');
  await page.locator('[data-vista="hoy"]').click();
  // Vencidas (1) + hoy (3)
  await expect(page.locator('#lista-tareas .td-tarea')).toHaveCount(4);
  await page.locator('[data-vista="generales"]').click();
  await expect(page.locator('.td-grupo', { hasText: 'Administración' }).locator('.td-tarea')).toHaveCount(1);

  await page.locator('[data-vista="bandeja"]').click();
  await page.locator('.td-tarea', { hasText: 'Revisar facturas' }).locator('.td-check').click();
  await expect(page.locator('#aviso')).toContainText('Tarea completada');
  await expect(page.locator('.td-tarea', { hasText: 'Revisar facturas' })).toHaveCount(0);
  await page.locator('#aviso').getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.locator('.td-tarea', { hasText: 'Revisar facturas' })).toHaveCount(1);

  await page.getByRole('button', { name: '+ Vista' }).click();
  await page.locator('#modal [name=nombre]').fill('Clientes de Bruno');
  await page.locator('#modal [name=contacto]').selectOption('con');
  await page.locator('#modal [name=estado]').selectOption('negociacion');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.td-h1')).toContainText('Clientes de Bruno');
  await expect(page.locator('#lista-tareas .td-tarea')).toHaveCount(2);
  await expect(page.locator('.td-sub')).toContainText('Contacto: Negociación');
  await esperarGuardado(page);
  expect(datosGuardados().taskViews).toHaveLength(1);
});

test('cola de tareas en la ficha: «Tarea X de N», flechas, completar y tareas sin contacto', async ({ page }) => {
  await page.goto('/#/tareas');
  // Orden: vencida (Diego), Ana 11:00, Bruno WhatsApp, Revisar facturas, reunión del sábado
  await page.locator('.td-cuerpo', { hasText: 'Llamar a Ana para presentar Diga' }).click();
  await expect(page).toHaveURL(/#\/contacto\/c-ana$/);
  await expect(page.locator('.sq-progreso b')).toHaveText('Tarea 2 de 5');
  await expect(page.locator('.ficha-grid .tarjeta-contacto')).toBeVisible();
  // Es una llamada: se abre sola la ventana de llamada
  await expect(page.locator('#llamada')).toBeVisible();
  await expect(page.locator('#llamada')).toContainText('Ana Ruiz');

  await page.locator('body').click({ position: { x: 5, y: 500 } });
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#\/contacto\/c-bruno$/);
  await expect(page.locator('.sq-progreso b')).toHaveText('Tarea 3 de 5');
  await expect(page.locator('#llamada')).toBeHidden();

  // En la ficha no hay tarjeta de la tarea: solo la barra de arriba, con la tarea y sus botones
  await expect(page.locator('.sq-tarea')).toHaveCount(0);
  await expect(page.locator('.sq-cabecera')).toContainText('WhatsApp a Bruno con la propuesta');
  await page.getByRole('button', { name: '✓ Completar y siguiente' }).click();
  // La siguiente no tiene contacto: se hace en #/cola
  await expect(page).toHaveURL(/#\/cola$/);
  await expect(page.locator('.sq-titulo')).toHaveText('Revisar facturas');
  await expect(page.locator('.sq-progreso b')).toHaveText('Tarea 4 de 5');

  await page.getByRole('button', { name: 'Pasar a mañana' }).click();
  await expect(page.locator('.sq-progreso b')).toHaveText('Tarea 5 de 5');
  await page.getByRole('button', { name: '← Anterior' }).click();
  await page.getByRole('button', { name: '← Anterior' }).click();
  await expect(page.locator('.sq-hecha')).toBeVisible();
  await page.locator('[data-action="sq-salir"]').first().click();
  await expect(page).toHaveURL(/#\/tareas$/);

  await esperarGuardado(page);
  const d = datosGuardados();
  expect(buscar(d.tasks, 'WhatsApp a Bruno con la propuesta').hecha).toBe(true);
  expect(buscar(d.tasks, 'Revisar facturas').fecha).toBe('2026-11-06');
  expect(d.actions.some((/** @type {any} */ a) => a.contactId === 'c-bruno' && a.tipo === 'whatsapp')).toBe(true);
});

test('secuencias: inscribir crea el primer paso y completarlo crea el siguiente', async ({ page }) => {
  await page.goto('/#/contacto/c-diego');
  await page.getByRole('button', { name: 'Inscribir' }).click();
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.tc-datos')).toContainText('Primer contacto');
  await expect(page.locator('.tc-datos')).toContainText('paso 1/2');

  await page.locator('[data-tab="tareas"]').click();
  await page.locator('.td-tarea', { hasText: 'Llamar a Diego' }).locator('.td-check').click();
  await expect(page.locator('.tc-datos')).toContainText('paso 2/2');
  await esperarGuardado(page);
  const t = buscar(datosGuardados().tasks, 'Email a Diego de Reformas Mora');
  expect([t.fecha, t.accion, t.hecha]).toEqual(['2026-11-07', 'email', false]);

  await page.goto('/#/secuencias/s-primer');
  await expect(page.locator('.seq-grid')).toContainText('Paso 2 de 2');
});
