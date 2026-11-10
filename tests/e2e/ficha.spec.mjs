import { test, expect, datosGuardados, esperarGuardado } from './helpers.mjs';

test('ficha: pestañas Notas, Tareas y Canales (WhatsApp y correo)', async ({ page }) => {
  await page.goto('/#/contacto/c-bruno');
  const tabs = page.locator('.ficha-tabs .vista-tab');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(2)).toHaveText(/Canales/);
  await expect(tabs.nth(1)).toContainText('Tareas');
  await expect(tabs.nth(1)).toContainText('2');

  await tabs.nth(1).click();
  await expect(page.locator('.td-ficha .td-tarea')).toHaveCount(2);

  await tabs.nth(2).click();
  await expect(page.locator('.chat')).toBeVisible();
  await expect(page.locator('#ficha-panel')).not.toContainText('Borrador');
  await page.locator('.canales-selector').getByRole('tab', { name: /Correo/ }).click();
  await expect(page.locator('.correo-escribir')).toBeVisible();
  await page.locator('.canales-selector').getByRole('tab', { name: /WhatsApp/ }).click();
  await expect(page.locator('.chat')).toBeVisible();

  // El botón Email de la tarjeta lleva a Canales › Correo. «Enviar» registra la acción (el mailto: se ignora en el test).
  await page.getByRole('button', { name: 'Email' }).first().click();
  await expect(page.locator('.vista-tab.active')).toContainText('Canales');
  await expect(page.locator('.canales-selector .active')).toContainText('Correo');
  await page.route('mailto:*', (r) => r.abort());
  await page.locator('.correo-escribir [name=asunto]').fill('Propuesta Diga');
  await page.locator('.correo-escribir [name=cuerpo]').fill('Hola Bruno');
  await page.locator('.correo-escribir').getByRole('button', { name: 'Enviar' }).click();
  await expect(page.locator('.correo-item')).toContainText('Propuesta Diga');
  await esperarGuardado(page);
  expect(datosGuardados().actions.some((/** @type {any} */ a) => a.contactId === 'c-bruno' && a.tipo === 'email' && a.resumen === 'Propuesta Diga')).toBe(true);
});

test('ficha: cambiar estado y editar datos deja notas de «Cambio de datos»', async ({ page }) => {
  await page.goto('/#/contacto/c-ana');
  await page.locator('.tc-datos .estado-select').selectOption('reunion');
  await expect(page.locator('.nota', { hasText: 'Contactado → Reunión agendada' })).toBeVisible();

  await page.locator('.tc-cabecera [data-td-pop]').click();
  await page.getByRole('button', { name: 'Editar contacto' }).click();
  await page.locator('#modal [name=cargo]').fill('CEO');
  await page.locator('#modal [name=telefono]').fill('+34 699 000 000');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  const nota = page.locator('.nota', { hasText: 'Directora → CEO' });
  await expect(nota).toBeVisible();
  await expect(nota).toContainText('Teléfono');
  await expect(page.locator('.nota', { hasText: 'Cambio de datos' })).toHaveCount(2);

  await esperarGuardado(page);
  const cambios = datosGuardados().notes.filter((/** @type {any} */ n) => n.contactId === 'c-ana' && n.tipo === 'cambio');
  expect(cambios).toHaveLength(2);
});

test('ficha: notas (crear, fijar, borrar) y acciones (registrar)', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/#/contacto/c-ana');
  await page.locator('#ficha-panel').getByRole('button', { name: '+ Nota' }).click();
  await page.locator('#modal [name=titulo]').fill('Le gusta el plan Pro');
  await page.locator('#modal [name=contenido]').fill('**Importante**: decide el socio');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  const nota = page.locator('.nota', { hasText: 'Le gusta el plan Pro' });
  await expect(nota.locator('strong')).toHaveText('Importante');
  await nota.locator('[data-action="fijar-nota"]').click();
  await expect(page.locator('.nota').first()).toHaveClass(/fijada/);

  await page.getByRole('button', { name: '+ Registrar' }).click();
  await page.locator('#modal [name=tipo]').selectOption('whatsapp');
  await page.locator('#modal [name=resumen]').fill('Le mando el vídeo');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.timeline .tl-item', { hasText: 'Le mando el vídeo' })).toBeVisible();

  await page.locator('.nota', { hasText: 'Le gusta el plan Pro' }).locator('[data-action="borrar-nota"]').click();
  await expect(page.locator('.nota', { hasText: 'Le gusta el plan Pro' })).toHaveCount(0);
});

test('eliminar contacto borra también sus notas, tareas y acciones', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/#/contacto/c-ana');
  await page.locator('.tc-cabecera [data-td-pop]').click();
  await page.getByRole('button', { name: 'Eliminar contacto' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await esperarGuardado(page);
  const d = datosGuardados();
  expect(d.contacts.some((/** @type {any} */ c) => c.id === 'c-ana')).toBe(false);
  for (const col of ['notes', 'tasks', 'actions']) expect(d[col].some((/** @type {any} */ x) => x.contactId === 'c-ana')).toBe(false);
});

test('ficha: los datos de la tarjeta se editan pulsándolos; la empresa no', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/#/contacto/c-carla');
  const tarjeta = page.locator('.tarjeta-contacto');
  const pop = page.locator('.dato-pop');

  // Un campo vacío también se puede rellenar: se abre un recuadro con el campo
  await tarjeta.locator('dd.editable[data-campo="email"]').click();
  await expect(pop).toBeVisible();
  await pop.locator('[name=valor]').fill('carla@clinicaluz.example');
  await pop.locator('[name=valor]').press('Enter');
  await expect(pop).toHaveCount(0);
  await expect(tarjeta.locator('dd[data-campo="email"]')).toContainText('carla@clinicaluz.example');

  // Esc cancela sin guardar
  await tarjeta.locator('h1.editable').click();
  await pop.locator('[name=valor]').fill('Otro nombre');
  await pop.locator('[name=valor]').press('Escape');
  await expect(pop).toHaveCount(0);
  await expect(tarjeta.locator('h1')).toHaveText('Carla Vidal');

  // Si el dato es un enlace (mailto:), el enlace hace lo suyo y se edita con el lápiz.
  // Un email que ya tiene otro contacto no se acepta.
  await tarjeta.locator('dd.editable[data-campo="email"] .editable-lapiz').click();
  await pop.locator('[name=valor]').fill('ana@clinicaluz.example');
  await pop.getByRole('button', { name: 'Guardar' }).click();
  await expect(pop).toBeVisible();
  await pop.getByRole('button', { name: 'Cancelar' }).click();

  // La empresa relaciona el contacto con la empresa: es fija
  await expect(tarjeta.locator('dt', { hasText: 'Empresa' }).locator('+ dd')).not.toHaveClass(/editable/);

  await esperarGuardado(page);
  const c = datosGuardados().contacts.find((/** @type {any} */ x) => x.id === 'c-carla');
  expect(c.email).toBe('carla@clinicaluz.example');
  expect(datosGuardados().notes.some((/** @type {any} */ n) => n.contactId === 'c-carla' && n.tipo === 'cambio')).toBe(true);
});

test('empresa: sus datos se editan pulsándolos (texto y desplegable)', async ({ page }) => {
  await page.goto('/#/empresa/e-luz');
  const tarjeta = page.locator('.tarjeta-contacto');
  await tarjeta.locator('dd.editable[data-campo="sector"]').click();
  await page.locator('.dato-pop [name=valor]').fill('Clínicas dentales');
  await page.locator('.dato-pop [name=valor]').press('Enter');
  await expect(tarjeta.locator('dd[data-campo="sector"]')).toContainText('Clínicas dentales');

  // Un desplegable guarda en cuanto se elige
  await tarjeta.locator('dd.editable[data-campo="estadoLead"]').click();
  await page.locator('.dato-pop select[name=valor]').selectOption('meeting');
  await expect(tarjeta.locator('dd[data-campo="estadoLead"]')).toContainText('Meeting');

  await esperarGuardado(page);
  const e = datosGuardados().companies.find((/** @type {any} */ x) => x.id === 'e-luz');
  expect(e.sector).toBe('Clínicas dentales');
  expect(e.estadoLead).toBe('meeting');
});
