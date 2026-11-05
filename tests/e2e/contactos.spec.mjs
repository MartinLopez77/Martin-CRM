import { test, expect, datosGuardados, esperarGuardado } from './helpers.mjs';

test('buscador de la barra superior: contactos y empresas, con teclado', async ({ page }) => {
  await page.goto('/#/tareas');
  await page.keyboard.press('/');
  await expect(page.locator('#buscar-global')).toBeFocused();
  await page.keyboard.type('luz');
  const items = page.locator('.br-item');
  // Ana y Carla son de Clínica Luz; la empresa también aparece.
  await expect(items).toHaveCount(3);
  await expect(items.last()).toContainText('Clínica Luz');
  await expect(items.last()).toContainText('Empresa');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/contacto\/c-carla$/);
  await expect(page.locator('#buscar-global')).toHaveValue('');

  // Por teléfono (solo dígitos)
  await page.locator('#buscar-global').fill('100002');
  await expect(page.locator('.br-item')).toHaveCount(1);
  await expect(page.locator('.br-item')).toContainText('Bruno Sanz');
  await page.keyboard.press('Escape');
  await expect(page.locator('#buscar-resultados')).toBeHidden();
});

test('tabla de contactos: filtros, búsqueda, orden y vistas guardadas', async ({ page }) => {
  await page.goto('/');
  const filas = page.locator('#tabla-contactos tbody tr');
  await expect(filas).toHaveCount(4);

  await page.locator('#f-estado').selectOption('negociacion');
  await expect(filas).toHaveCount(1);
  await expect(filas.first()).toContainText('Bruno Sanz');

  // Guardar como vista nueva
  await page.getByRole('button', { name: 'Guardar como vista nueva' }).click();
  await page.locator('#modal [name=nombre]').fill('En negociación');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.vista-tab.active')).toHaveText('En negociación');
  await page.locator('.vista-tab', { hasText: 'Todos los contactos' }).click();
  await expect(filas).toHaveCount(4);

  await page.locator('#f-q').fill('sevilla');
  await expect(filas).toHaveCount(1);
  await expect(filas.first()).toContainText('Diego Mora');
  await page.locator('#f-q').fill('');

  await page.locator('.th-orden', { hasText: 'Contacto' }).click();
  await expect(filas.first()).toContainText('Ana Ruiz');
  await page.locator('.th-orden', { hasText: 'Contacto' }).click();
  await expect(filas.first()).toContainText('Diego Mora');

  await esperarGuardado(page);
  expect(datosGuardados().views.map((/** @type {{nombre: string}} */ v) => v.nombre)).toEqual(['En negociación']);
});

test('acciones masivas: cambiar estado crea una nota de cambio en cada contacto', async ({ page }) => {
  await page.goto('/');
  await page.locator('.sel-contacto[data-id="c-ana"]').check();
  await page.locator('.sel-contacto[data-id="c-carla"]').check();
  await expect(page.locator('.tabla-barra.seleccion')).toContainText('2 seleccionados');
  await page.getByRole('button', { name: 'Cambiar estado' }).click();
  await page.locator('#modal [name=estado]').selectOption('cliente');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await esperarGuardado(page);
  const d = datosGuardados();
  for (const id of ['c-ana', 'c-carla']) {
    expect(d.contacts.find((/** @type {any} */ c) => c.id === id).estado).toBe('cliente');
    expect(d.notes.some((/** @type {any} */ n) => n.contactId === id && n.tipo === 'cambio' && n.contenido.includes('→ Cliente'))).toBe(true);
  }
});

test('nuevo contacto: no deja repetir un email existente', async ({ page }) => {
  await page.goto('/');
  /** @type {string[]} */
  const alertas = [];
  page.on('dialog', (d) => { alertas.push(d.message()); d.accept(); });
  await page.getByRole('button', { name: '+ Nuevo contacto' }).click();
  await page.locator('#modal [name=nombre]').fill('Otra Ana');
  await page.locator('#modal [name=email]').fill('ANA@clinicaluz.example');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await expect.poll(() => alertas[0]).toContain('Ana Ruiz');
  await page.locator('#modal [name=email]').fill('otra@clinicaluz.example');
  await page.locator('#modal [name=empresa]').fill('Clínica Luz');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.tarjeta-contacto h1')).toHaveText('Otra Ana');
  await expect(page.locator('.tc-datos')).toContainText('Clínica Luz');
});
