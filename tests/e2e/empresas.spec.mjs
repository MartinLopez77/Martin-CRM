import { test, expect, datosGuardados, esperarGuardado } from './helpers.mjs';

test('empresa: estado lead y campos de nurturing como en HubSpot', async ({ page }) => {
  await page.goto('/#/empresa/e-luz');
  await page.locator('.tc-cabecera [data-td-pop]').click();
  await page.getByRole('button', { name: 'Editar empresa' }).click();
  const nurturing = page.locator('#modal .nurturing-campos');
  await expect(nurturing).toBeHidden();
  await page.locator('#modal [name="p-estadoLead"]').selectOption('nurturing_sdr');
  await expect(nurturing).toBeVisible();
  await page.locator('#modal [name="p-nurturingReason"]').selectOption('contact_in_future');
  await page.locator('#modal [name="p-empleados"]').fill('25');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();

  await expect(page.locator('.tc-datos')).toContainText('Nurturing SDR');
  await expect(page.locator('.tc-datos')).toContainText('Contact in the future');
  await esperarGuardado(page);
  const e = datosGuardados().companies.find((/** @type {any} */ x) => x.id === 'e-luz');
  expect([e.estadoLead, e.nurturingReason, e.empleados]).toEqual(['nurturing_sdr', 'contact_in_future', '25']);

  // La ficha de un contacto de la empresa muestra el estado lead
  await page.goto('/#/contacto/c-ana');
  await expect(page.locator('.tc-datos')).toContainText('Nurturing SDR');

  // Tabla de empresas con filtro por estado lead
  await page.goto('/#/empresas');
  await page.locator('#e-estado').selectOption('open_deal');
  await expect(page.locator('#tabla-empresas tbody tr')).toHaveCount(1);
  await expect(page.locator('#tabla-empresas tbody tr')).toContainText('Talleres Sanz');
});

test('ajustes: ocultar propiedades y crear una propia', async ({ page }) => {
  await page.goto('/#/ajustes');
  await page.locator('.aj-prop[data-id="sector"]').uncheck();
  await page.getByRole('button', { name: '+ Añadir propiedad' }).click();
  await page.locator('#modal [name=label]').fill('CRM que usan');
  await page.locator('#modal [name=tipo]').selectOption('opciones');
  await page.locator('#modal [name=opciones]').fill('HubSpot\nSalesforce\nNinguno');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.prop-fila', { hasText: 'CRM que usan' })).toContainText('3 opciones');

  await page.goto('/#/empresas');
  const cabeceras = page.locator('#tabla-empresas th');
  await expect(cabeceras).toContainText(['Empresa', 'Contactos', 'Estado lead', 'Ciudad', 'Web']);
  await expect(page.locator('#tabla-empresas th', { hasText: 'Sector' })).toHaveCount(0);

  await page.goto('/#/empresa/e-mora');
  await page.locator('.tc-cabecera [data-td-pop]').click();
  await page.getByRole('button', { name: 'Editar empresa' }).click();
  await expect(page.locator('#modal .field > span', { hasText: 'Sector' })).toHaveCount(0);
  const prop = page.locator('#modal label.field', { hasText: 'CRM que usan' }).locator('select');
  await prop.selectOption('HubSpot');
  await page.locator('#modal').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.tc-datos')).toContainText('HubSpot');
  await esperarGuardado(page);
  const e = datosGuardados().companies.find((/** @type {any} */ x) => x.id === 'e-mora');
  expect(Object.values(e.extra)).toEqual(['HubSpot']);
  expect(e.sector).toBe('Reformas'); // oculta: conserva su valor
});
