import './reloj.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizarFechas, quitarRangos, accionDeTitulo } from '../../src/shared/lib/nlp.js';

/** Fecha, hora y título limpio de un texto. @param {string} texto */
function leer(texto) {
  const r = analizarFechas(texto);
  return [r.fecha, r.hora, quitarRangos(texto, r.rangos)];
}

test('fecha y hora en el título, como en Todoist', () => {
  assert.deepEqual(leer('Llamar a Ana mañana a las 17'), ['2026-11-06', '17:00', 'Llamar a Ana']);
  assert.deepEqual(leer('Reunión el lunes a las 10:30'), ['2026-11-09', '10:30', 'Reunión']);
  assert.deepEqual(leer('Comer pasado mañana'), ['2026-11-07', null, 'Comer']);
  assert.deepEqual(leer('Hoy, llamar a Luis'), ['2026-11-05', null, 'Llamar a Luis']);
});

test('fechas escritas de otras formas', () => {
  assert.deepEqual(leer('Ver en 3 días'), ['2026-11-08', null, 'Ver']);
  assert.deepEqual(leer('Revisar en dos semanas'), ['2026-11-19', null, 'Revisar']);
  assert.deepEqual(leer('Enviar presupuesto el 15/1'), ['2027-01-15', null, 'Enviar presupuesto']); // enero ya pasó: el del año que viene
  assert.deepEqual(leer('Ver el 3 de diciembre de 2027'), ['2027-12-03', null, 'Ver']);
  assert.equal(analizarFechas('el próximo viernes').fecha, '2026-11-06');
});

test('horas: «a las 5» es por la tarde; «2h» es una duración, no una hora', () => {
  assert.deepEqual(leer('Llamar a las 5'), [null, '17:00', 'Llamar']);
  assert.deepEqual(leer('Llamar a las 9 de la mañana'), [null, '09:00', 'Llamar']);
  assert.deepEqual(leer('Llamar 17h'), [null, '17:00', 'Llamar']);
  assert.deepEqual(leer('Llamar 2h'), [null, null, 'Llamar 2h']);
});

test('lo que no es una fecha no se toca', () => {
  assert.deepEqual(leer('Llamar por la mañana'), [null, null, 'Llamar por la mañana']);
  assert.deepEqual(leer('Quedar el 31/2'), [null, null, 'Quedar el 31/2']); // no existe
});

test('tipo de acción según el título: manda la primera palabra reconocida', () => {
  assert.equal(accionDeTitulo('Llamar para fijar reunión'), 'llamada');
  assert.equal(accionDeTitulo('Mandar presupuesto por WhatsApp'), 'propuesta');
  assert.equal(accionDeTitulo('Videollamada con Ana'), 'videollamada');
  assert.equal(accionDeTitulo('Enviar mail'), 'email');
  assert.equal(accionDeTitulo('Revisar facturas'), '');
});
