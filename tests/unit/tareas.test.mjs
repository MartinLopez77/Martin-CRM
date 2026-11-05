import { datosDePrueba } from './dom.mjs';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const estado = await import('../../src/shared/state.js');
const { FILTROS_TAREA_VACIOS } = await import('../../src/features/tasks/schema.js');
const { ordenTareas, cumpleFiltroTarea, marcarTarea, tareaExistente, pendientesDe } = await import('../../src/features/tasks/store.js');

beforeEach(() => estado.setDb(datosDePrueba()));

/** Ids de las tareas pendientes que cumplen unos filtros. @param {Partial<typeof FILTROS_TAREA_VACIOS>} f */
const filtradas = (f) => estado.db.tasks.filter((t) => !t.hecha && cumpleFiltroTarea(t, { ...FILTROS_TAREA_VACIOS, ...f })).map((t) => t.id).sort();

test('orden de las tareas: por fecha, luego con hora antes que sin hora, luego por prioridad', () => {
  const ids = estado.db.tasks.filter((t) => !t.hecha).sort(ordenTareas).map((t) => t.id);
  assert.deepEqual(ids, ['t-email-diego', 't-llamar-ana', 't-wa-bruno', 't-facturas', 't-reunion-bruno']);
  const base = { id: 'x', titulo: '', detalle: '', contactId: null, accion: null, hora: null, hecha: false, completada: null, creado: '' };
  const sinFecha = { ...base, fecha: null, prioridad: 'alta' };
  const conFecha = { ...base, fecha: '2026-12-01', prioridad: 'ninguna' };
  assert.equal(ordenTareas(conFecha, sinFecha), -1); // con fecha, antes
  assert.ok(ordenTareas({ ...conFecha, prioridad: 'alta' }, conFecha) < 0); // a igual fecha y hora, P1 antes
});

test('filtros de las vistas propias de tareas', () => {
  assert.deepEqual(filtradas({ cuando: 'vencidas' }), ['t-email-diego']);
  assert.deepEqual(filtradas({ cuando: 'solo-hoy' }), ['t-facturas', 't-llamar-ana', 't-wa-bruno']);
  assert.deepEqual(filtradas({ accion: 'llamada' }), ['t-llamar-ana']);
  assert.deepEqual(filtradas({ accion: 'interna' }), ['t-facturas']);
  assert.deepEqual(filtradas({ contacto: 'sin' }), ['t-facturas']);
  assert.deepEqual(filtradas({ estado: 'negociacion' }), ['t-reunion-bruno', 't-wa-bruno']);
  assert.deepEqual(filtradas({ estadoLead: 'open_deal' }), ['t-reunion-bruno', 't-wa-bruno']); // Talleres Sanz
  assert.deepEqual(filtradas({ ownerId: 'u-lucia' }), ['t-email-diego']);
  assert.deepEqual(filtradas({ lista: 'Administración' }), ['t-facturas']);
  assert.deepEqual(filtradas({ prioridad: 'alta', cuando: 'hoy' }), ['t-llamar-ana']);
});

test('completar una tarea con tipo de acción la registra en el historial; deshacer la quita', () => {
  const t = tareaExistente('t-wa-bruno');
  marcarTarea(t, true);
  const ac = estado.db.actions.filter((a) => a.taskId === t.id);
  assert.equal(ac.length, 1);
  assert.deepEqual([ac[0].tipo, ac[0].contactId, ac[0].fecha], ['whatsapp', 'c-bruno', '2026-11-05']);
  assert.equal(pendientesDe('c-bruno').length, 1);
  marcarTarea(t, false);
  assert.equal(estado.db.actions.some((a) => a.taskId === t.id), false);
  assert.equal(pendientesDe('c-bruno').length, 2);
});

test('una reunión cancelada cuenta como hecha y queda como «Reunión cancelada»', () => {
  const t = tareaExistente('t-reunion-bruno');
  marcarTarea(t, true, true);
  assert.equal(t.cancelada, true);
  assert.equal(estado.db.actions.find((a) => a.taskId === t.id)?.tipo, 'reunion-cancelada');
});
