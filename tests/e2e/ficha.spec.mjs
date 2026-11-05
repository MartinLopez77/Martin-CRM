import { test, expect, datosGuardados, esperarGuardado } from './helpers.mjs';

test('ficha: pestañas Notas, Tareas, WhatsApp y Correo', async ({ page }) => {
  await page.goto('/#/contacto/c-bruno');
  const tabs = page.locator('.ficha-tabs .vista-tab');
  await expect(tabs).toHaveCount(4);
  await expect(tabs.nth(1)).toContainText('Tareas');
  await expect(tabs.nth(1)).toContainText('2');

  await tabs.nth(1).click();
  await expect(page.locator('.td-ficha .td-tarea')).toHaveCount(2);

  await tabs.nth(2).click();
  await expect(page.locator('.chat')).toBeVisible();
  await expect(page.locator('.etq-borrador').first()).toBeVisible();

  // Correo: «Enviar» registra la acción (el mailto: se ignora en el test).
  await page.getByRole('button', { name: 'Email' }).first().click();
  await expect(page.locator('.vista-tab.active')).toContainText('Correo');
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
  await expect(page.locator('.chip', { hasText: 'Cambio de datos' })).toContainText('2');

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
