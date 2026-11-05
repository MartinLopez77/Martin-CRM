import './reloj.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hoy, horaLocal, sumarDias, fmtFecha, fmtRelativa, fmtCuando, claseFecha, tituloDia, proximoDia, fechaAtajo,
} from '../../src/shared/lib/dates.js';

test('hoy es el día en España, sea cual sea la zona del ordenador', () => {
  assert.equal(hoy(), '2026-11-05');
});

test('sumar días, también al cambiar de mes y con el cambio de hora', () => {
  assert.equal(sumarDias('2026-11-05', 1), '2026-11-06');
  assert.equal(sumarDias('2026-11-30', 1), '2026-12-01');
  assert.equal(sumarDias('2026-03-28', 1), '2026-03-29');
  assert.equal(sumarDias('2026-11-05', -5), '2026-10-31');
});

test('fechas legibles: relativa, de tarea y cabecera del día', () => {
  assert.deepEqual(['2026-11-05', '2026-11-06', '2026-11-04'].map(fmtRelativa), ['Hoy', 'Mañana', 'Ayer']);
  assert.equal(fmtFecha('2026-11-03'), '3 nov');
  assert.equal(fmtFecha('2027-01-15'), '15 ene 2027');
  assert.equal(fmtCuando('2026-11-08'), 'Domingo'); // dentro de esta semana: el día
  assert.equal(fmtCuando('2026-11-12'), '12 nov');
  assert.equal(tituloDia('2026-11-05'), '5 nov · Hoy · jueves');
});

test('color de la fecha como en Todoist', () => {
  assert.deepEqual(
    ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-10', '2026-11-20'].map(claseFecha),
    ['f-vencida', 'f-hoy', 'f-manana', 'f-semana', 'f-lejos'],
  );
});

test('atajos de fecha', () => {
  assert.equal(proximoDia(1), '2026-11-09'); // próximo lunes
  assert.equal(proximoDia(4), '2026-11-12'); // hoy es jueves: el de la semana que viene
  assert.equal(proximoDia(4, true), '2026-11-05');
  assert.deepEqual(
    ['hoy', 'manana', '3', 'lunes', 'finde', 'semana', 'mes', 'sin'].map(fechaAtajo),
    ['2026-11-05', '2026-11-06', '2026-11-08', '2026-11-09', '2026-11-07', '2026-11-12', '2026-12-05', ''],
  );
});

test('hora secundaria: 18:00 en España en otra zona, con el día si cambia', () => {
  assert.equal(horaLocal('18:00', '2026-11-05', true, 'Asia/Kuala_Lumpur'), '01:00 +1'); // invierno: +7 h
  assert.equal(horaLocal('18:00', '2026-07-01', true, 'Asia/Kuala_Lumpur'), '00:00 +1'); // verano: +6 h
  assert.equal(horaLocal('18:00', '2026-11-05', false, 'Asia/Kuala_Lumpur'), '01:00');
  assert.equal(horaLocal('09:00', '2026-11-05', true, 'America/New_York'), '03:00');
  assert.equal(horaLocal('', '2026-11-05', true, 'Asia/Kuala_Lumpur'), '');
});
