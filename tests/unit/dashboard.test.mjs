// El dashboard cuenta bien llamadas, reuniones, canales y contactos del periodo (hoy es el 5 de noviembre de 2026).
import { datosDePrueba } from './dom.mjs';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const estado = await import('../../src/shared/state.js');
const { estadisticas, rangoDe, resultadoDe } = await import('../../src/features/dashboard/store.js');

beforeEach(() => estado.setDb(datosDePrueba()));

/**
 * Una acción de prueba.
 * @param {Partial<import('../../src/features/activity/schema.js').AccionRealizada>} datos
 * @returns {import('../../src/features/activity/schema.js').AccionRealizada}
 */
const accion = (datos) => ({ id: String(Math.random()), contactId: 'c-ana', tipo: 'otra', fecha: '2026-11-04', hora: null, resumen: '', noteId: null, taskId: null, creado: '2026-11-04T10:00:00.000Z', ...datos });

test('periodos: los últimos N días acaban hoy; «todo» empieza en el primer dato', () => {
  assert.deepEqual(rangoDe('7'), { desde: '2026-10-30', hasta: '2026-11-05' });
  assert.deepEqual(rangoDe('30'), { desde: '2026-10-07', hasta: '2026-11-05' });
  assert.deepEqual(rangoDe('todo'), { desde: '2026-11-03', hasta: '2026-11-05' });
});

test('llamadas: total, conectadas, tasa, minutos y una barra por día', () => {
  estado.db.actions.push(
    accion({ tipo: 'llamada-sin-respuesta', fecha: '2026-11-04', resultado: 'buzon' }),
    accion({ tipo: 'llamada', fecha: '2026-11-05', resultado: 'conectada', duracion: 150 }),
    accion({ tipo: 'llamada', fecha: '2026-10-01' }), // fuera del periodo
  );
  const e = estadisticas('2026-10-30', '2026-11-05');
  assert.equal(e.llamadas, 3);
  assert.equal(e.conectadas, 2); // la antigua del fixture no guardaba resultado: «llamada» cuenta como conectada
  assert.equal(e.tasaConexion, 2 / 3);
  assert.equal(e.minutos, 3);
  assert.equal(e.porDia.length, 7);
  assert.deepEqual(e.porDia.find((d) => d.dia === '2026-11-04'), { dia: '2026-11-04', llamadas: 1, conectadas: 0 });
  assert.equal(e.resultados.find((r) => r.id === 'buzon')?.n, 1);
  assert.equal(resultadoDe(accion({ tipo: 'llamada-sin-respuesta' })), 'sin-respuesta');
});

test('reuniones, canales, contactos nuevos, tareas completadas y embudo', () => {
  estado.db.actions.push(
    accion({ tipo: 'reunion', fecha: '2026-11-04' }),
    accion({ tipo: 'reunion-cancelada', fecha: '2026-11-04' }),
    accion({ tipo: 'whatsapp', fecha: '2026-11-05' }),
    accion({ tipo: 'email', fecha: '2026-11-05' }),
    accion({ tipo: 'email', fecha: '2026-11-02' }),
  );
  const e = estadisticas('2026-10-30', '2026-11-05');
  assert.equal(e.reunionesAgendadas, 1); // la tarea de reunión con Bruno, creada el 1 de noviembre
  assert.equal(e.reunionesHechas, 1);
  assert.equal(e.reunionesCanceladas, 1);
  assert.equal(e.whatsapp, 1);
  assert.equal(e.emails, 2);
  assert.equal(e.contactosNuevos, 0); // los del fixture son de octubre, antes del periodo
  assert.equal(estadisticas('2026-10-01', '2026-11-05').contactosNuevos, 4);
  assert.equal(e.tareasCompletadas, 1);
  assert.equal(e.embudo.find((x) => x.id === 'negociacion')?.n, 1);
  assert.equal(e.embudo.reduce((s, x) => s + x.n, 0), estado.db.contacts.length);
});
