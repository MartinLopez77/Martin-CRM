import { test, expect, datosGuardados, esperarGuardado, escribirDatos } from './helpers.mjs';

test('menú lateral y reloj con la hora secundaria (Ajustes)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#reloj')).toContainText('España 10:00');
  await expect(page.locator('#reloj')).toContainText('(17:00 MY)');

  await page.locator('#menu-btn').click();
  await expect(page.locator('#menu')).toHaveAttribute('aria-hidden', 'false');
  await page.locator('#menu a[data-ruta="ajustes"]').click();
  await expect(page).toHaveURL(/#\/ajustes$/);
  await expect(page.locator('#menu a[data-ruta="ajustes"]')).toHaveClass(/active/);
  await expect(page.locator('#menu')).toHaveAttribute('aria-hidden', 'true');

  await page.locator('#aj-zona').selectOption('America/New_York');
  await expect(page.locator('.ajustes-ejemplo')).toContainText('(04:00 NY)');
  await page.locator('#aj-secundaria').uncheck();
  await expect(page.locator('.ajustes-ejemplo')).toContainText('sin hora secundaria');
  await expect(page.locator('#reloj')).not.toContainText('NY');
});

test('menú lateral: las secciones se reordenan arrastrándolas y el orden se guarda', async ({ page }) => {
  await page.goto('/');
  await page.locator('#menu-btn').click();
  const rutas = () => page.locator('#menu .menu-grupo').first().locator('a').evaluateAll((as) => as.map((a) => /** @type {HTMLElement} */ (a).dataset.ruta));
  await page.locator('#menu a[data-ruta="tareas"]').dragTo(page.locator('#menu a[data-ruta="dashboard"]'), { targetPosition: { x: 20, y: 2 } });
  await expect.poll(rutas).toEqual(['tareas', 'dashboard', 'contactos', 'empresas', 'secuencias']);
  await expect(page).not.toHaveURL(/#\/tareas/); // arrastrar no navega
  await esperarGuardado(page);
  expect(datosGuardados().settings.ordenMenu.slice(0, 2)).toEqual(['tareas', 'dashboard']);

  await page.reload();
  expect(await rutas()).toEqual(['tareas', 'dashboard', 'contactos', 'empresas', 'secuencias']);
});

test('equipo: añadir persona, asignarle un contacto y ver sus contactos', async ({ page }) => {
  await page.goto('/#/equipo');
  await page.getByRole('button', { name: '+ Añadir persona' }).click();
  await page.locator('#modal [name=nombre]').fill('Pablo');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.equipo-fila', { hasText: 'Pablo' })).toContainText('0 contactos');

  await page.goto('/#/contacto/c-carla');
  await page.locator('.propietario-select').selectOption({ label: 'Pablo' });
  await expect(page.locator('.nota', { hasText: 'Propietario' })).toContainText('(vacío) → Pablo');

  await page.goto('/#/equipo');
  await page.locator('.equipo-fila', { hasText: 'Pablo' }).getByRole('button', { name: '1 contacto' }).click();
  await expect(page.locator('#tabla-contactos tbody tr')).toHaveCount(1);
  await expect(page.locator('#tabla-contactos tbody tr')).toContainText('Carla Vidal');
});

test('secuencias: crear, añadir pasos, reordenarlos y borrar uno', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/#/secuencias');
  await page.getByRole('button', { name: '+ Nueva secuencia' }).click();
  await page.locator('#modal [name=nombre]').fill('Reactivar');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.page-head h1')).toHaveText('Reactivar');

  for (const [tipo, titulo, espera] of [['llamada', 'Llamar a {nombre}', '0'], ['whatsapp', 'WhatsApp a {nombre}', '3']]) {
    await page.getByRole('button', { name: '+ Añadir paso' }).click();
    await page.locator('#modal [name=tipo]').selectOption(tipo);
    await page.locator('#modal [name=titulo]').fill(titulo);
    await page.locator('#modal [name=espera]').fill(espera);
    await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  }
  const pasos = page.locator('.seq-paso');
  await expect(pasos).toHaveCount(2);
  await expect(pasos.nth(1)).toContainText('Paso 2 · Día 4 · WhatsApp');

  await pasos.nth(1).locator('[data-action="mover-paso"][data-d="-1"]').click();
  await expect(pasos.nth(0)).toContainText('WhatsApp a {nombre}');

  await pasos.nth(0).locator('.seq-paso-cuerpo').click();
  await page.locator('#modal .modal-borrar').click();
  await expect(pasos).toHaveCount(1);
  await expect(pasos.first()).toContainText('Llamar a {nombre}');
});

test('tareas: reprogramar vencidas a hoy (con Deshacer) y reunión cancelada', async ({ page }) => {
  await page.goto('/#/tareas');
  await page.getByRole('button', { name: 'Reprogramar a hoy' }).click();
  await expect(page.locator('#aviso')).toContainText('1 tarea movida a hoy');
  await expect(page.locator('.td-grupo.vencidas')).toHaveCount(0);
  await page.locator('#aviso').getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.locator('.td-grupo.vencidas .td-tarea')).toHaveCount(1);

  await page.locator('.td-tarea', { hasText: 'Reunión con Bruno' }).getByRole('button', { name: 'Cancelada' }).click();
  await expect(page.locator('#aviso')).toContainText('Reunión marcada como cancelada');
  await page.goto('/#/contacto/c-bruno');
  await expect(page.locator('.timeline')).toContainText('Reunión cancelada');
  await esperarGuardado(page);
  const t = datosGuardados().tasks.find((/** @type {any} */ x) => x.id === 't-reunion-bruno');
  expect([t.hecha, t.cancelada]).toEqual([true, true]);
});

test('ficha: enviar un WhatsApp desde Canales lo registra', async ({ page, context }) => {
  await page.goto('/#/contacto/c-bruno');
  await page.locator('[data-tab="canales"]').click();
  // Sin salir a internet: la pestaña de WhatsApp Web se queda en blanco.
  await context.route('https://wa.me/**', (r) => r.fulfill({ body: '' }));
  const ventana = context.waitForEvent('page');
  await page.locator('.chat-escribir [name=texto]').fill('Hola Bruno, te paso la propuesta');
  await page.locator('.chat-escribir').getByRole('button', { name: 'Enviar' }).click();
  const wa = await ventana;
  expect(wa.url()).toContain('wa.me/34600100002');
  expect(decodeURIComponent(wa.url())).toContain('Hola Bruno, te paso la propuesta');
  await wa.close();
  await expect(page.locator('.burbuja')).toContainText('Hola Bruno, te paso la propuesta');
});

test('editor de notas: negrita con Ctrl+B, lista con Enter y ampliar', async ({ page }) => {
  await page.goto('/#/contacto/c-ana');
  await page.locator('#ficha-panel').getByRole('button', { name: '+ Nota' }).click();
  const ta = page.locator('#modal [name=contenido]');
  await ta.click();
  await page.keyboard.press('Control+b');
  await page.keyboard.type('Clave');
  await page.keyboard.press('End');
  await page.keyboard.type('\n- uno');
  await page.keyboard.press('Enter');
  await page.keyboard.type('dos');
  await expect(ta).toHaveValue('**Clave**\n- uno\n- dos');

  // Ampliar agranda la ventana entera (con margen alrededor), no solo el cuadro de texto
  const antes = /** @type {{ width: number, height: number }} */ (await page.locator('#modal').boundingBox());
  await page.locator('#modal [data-md-cmd="pantalla"]').click();
  await expect(page.locator('#modal')).toHaveClass(/ampliado/);
  const ampliada = /** @type {{ x: number, y: number, width: number, height: number }} */ (await page.locator('#modal').boundingBox());
  expect(ampliada.width).toBeGreaterThan(antes.width);
  expect(ampliada.height).toBeGreaterThan(antes.height);
  expect(ampliada.y).toBeGreaterThanOrEqual(40); // deja hueco arriba
  await page.keyboard.press('Escape'); // vuelve a su tamaño, no cierra el modal
  await expect(page.locator('#modal')).not.toHaveClass(/ampliado/);
  await expect(page.locator('#modal')).toBeVisible();
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.nota').first().locator('li')).toHaveText(['uno', 'dos']);
});

test('datos de versiones anteriores se migran al cargar', async ({ page }) => {
  escribirDatos({
    contacts: [{ id: 'c-viejo', nombre: 'Elena Antigua', empresa: 'Vieja SL', web: 'vieja.example', ciudad: 'Bilbao', estado: 'nuevo', etiquetas: [] }],
    notes: [],
    tasks: [],
  });
  await page.goto('/#/contacto/c-viejo');
  await expect(page.locator('.tc-datos')).toContainText('Vieja SL');
  await esperarGuardado(page);
  const d = datosGuardados();
  const c = d.contacts[0];
  const e = d.companies.find((/** @type {any} */ x) => x.nombre === 'Vieja SL');
  expect([c.companyId, c.ownerId, 'empresa' in c]).toEqual([e.id, 'u-martin', false]);
  expect([e.web, e.ciudad]).toEqual(['vieja.example', 'Bilbao']);
  expect(d.users.map((/** @type {any} */ u) => u.id)).toEqual(['u-martin']);
});

test('dashboard: cifras del periodo, llamadas por día y embudo', async ({ page }) => {
  await page.goto('/#/dashboard');
  await expect(page.locator('h1')).toHaveText('Dashboard');
  await expect(page.locator('.menu a.active')).toHaveText(/Dashboard/);
  const llamadas = page.locator('.db-cifra', { hasText: 'Llamadas' });
  await expect(llamadas.locator('.db-cifra-valor')).toHaveText('1');
  await expect(llamadas).toContainText('1 conectadas · 100 %');
  await expect(page.locator('.db-cifra', { hasText: 'Reuniones agendadas' }).locator('.db-cifra-valor')).toHaveText('1');
  await expect(page.locator('.db-col')).toHaveCount(30);
  await page.locator('#db-periodo').selectOption('7');
  await expect(page.locator('.db-col')).toHaveCount(7);
  // El detalle de cada día aparece al pasar por encima
  const martes = page.locator('.db-col').nth(4);
  await martes.hover();
  await expect(martes.locator('.db-tip')).toBeVisible();
  await expect(martes.locator('.db-tip')).toContainText('1 llamada');
  await expect(page.locator('.db-hfila', { hasText: 'Negociación' })).toContainText('1');
});
