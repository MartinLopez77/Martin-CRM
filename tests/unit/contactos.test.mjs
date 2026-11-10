import { datosDePrueba } from './dom.mjs';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// El módulo entero (no { db }): db cambia con setDb y hay que leerlo siempre de ahí.
const estado = await import('../../src/shared/state.js');
const { setDb, ui } = estado;
const { FILTROS_VACIOS, CAMPOS_CONTACTO } = await import('../../src/features/contacts/schema.js');
const { filtrarContactos, ordenarContactos, cambiarContacto, contactoExistente, cargarVista, vistaModificada } = await import('../../src/features/contacts/store.js');
const { leerCampo } = await import('../../src/shared/schema.js');

beforeEach(() => setDb(datosDePrueba()));

/** @param {Partial<typeof FILTROS_VACIOS>} f */
const nombres = (f) => filtrarContactos({ ...FILTROS_VACIOS, ...f }).map((c) => c.nombre).sort();

test('filtros de la tabla de contactos', () => {
  assert.deepEqual(nombres({}), ['Ana Ruiz', 'Bruno Sanz', 'Carla Vidal', 'Diego Mora']);
  assert.deepEqual(nombres({ estado: 'negociacion' }), ['Bruno Sanz']);
  assert.deepEqual(nombres({ ownerId: 'ninguno' }), ['Carla Vidal']);
  // Ya no hay filtro de empresa: el de una vista guardada antes se ignora
  assert.equal(filtrarContactos(/** @type {any} */ ({ ...FILTROS_VACIOS, companyId: 'e-luz' })).length, 4);
  assert.deepEqual(nombres({ tarea: 'vencida' }), ['Diego Mora']);
  assert.deepEqual(nombres({ tarea: 'sin' }), ['Carla Vidal']);
  assert.deepEqual(nombres({ q: 'clínica' }), ['Ana Ruiz', 'Carla Vidal']); // por empresa
  assert.deepEqual(nombres({ q: 'VIP' }), ['Bruno Sanz']); // por etiqueta
});

test('orden por columnas (lo vacío, al final)', () => {
  const orden = (/** @type {string} */ campo, /** @type {'asc' | 'desc'} */ dir = 'asc') =>
    ordenarContactos(filtrarContactos(FILTROS_VACIOS), { campo, dir }).map((c) => c.nombre.split(' ')[0]);
  assert.deepEqual(orden('nombre'), ['Ana', 'Bruno', 'Carla', 'Diego']);
  assert.deepEqual(orden('nombre', 'desc'), ['Diego', 'Carla', 'Bruno', 'Ana']);
  assert.deepEqual(orden('estado'), ['Carla', 'Ana', 'Diego', 'Bruno']); // Nuevo → Negociación
  assert.deepEqual(orden('propietario'), ['Diego', 'Ana', 'Bruno', 'Carla']); // Lucía, Martín, Martín, sin propietario
});

test('cambiar datos deja una nota «Cambio de datos» con el antes y el después', () => {
  const c = contactoExistente('c-ana');
  cambiarContacto(c, () => Object.assign(c, { estado: 'cliente', cargo: 'CEO', companyId: 'e-sanz' }));
  const n = estado.db.notes.filter((x) => x.contactId === 'c-ana' && x.tipo === 'cambio');
  assert.equal(n.length, 1);
  assert.equal(n[0].contenido, [
    '- **Empresa:** Clínica Luz → Talleres Sanz',
    '- **Cargo:** Directora → CEO',
    '- **Estado:** Contactado → Cliente',
  ].join('\n'));
  // Sin cambios reales, no hay nota
  cambiarContacto(c, () => {});
  assert.equal(estado.db.notes.filter((x) => x.tipo === 'cambio').length, 1);
});

test('vistas: cargar una vista y saber si sus filtros se han cambiado', () => {
  cargarVista('mios');
  assert.equal(ui.filtros.ownerId, 'u-martin');
  assert.equal(vistaModificada(), false);
  ui.filtros.estado = 'cliente';
  assert.equal(vistaModificada(), true);
});

test('formulario de contacto: los campos se leen limpios según su tipo', () => {
  const campo = (/** @type {string} */ id) => /** @type {import('../../src/shared/schema.js').Campo} */ (CAMPOS_CONTACTO.find((p) => p.id === id));
  assert.equal(leerCampo(campo('email'), '  ana@x.example '), 'ana@x.example');
  assert.deepEqual(leerCampo(campo('etiquetas'), 'vip, , madrid,vip'), ['vip', 'madrid']);
  assert.throws(() => contactoExistente('no-existe'), /No existe el contacto/);
});
