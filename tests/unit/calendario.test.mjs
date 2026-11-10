import './reloj.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { urlGoogleCalendar } from '../../src/shared/lib/calendario.js';

const params = (/** @type {string} */ url) => new URL(url).searchParams;

test('reunión con hora: evento de 1 h en hora de España', () => {
  const p = params(urlGoogleCalendar({ titulo: 'Demo · Ana', detalle: 'Llevar precios', fecha: '2026-11-10', hora: '16:30' }));
  assert.equal(p.get('text'), 'Demo · Ana');
  assert.equal(p.get('details'), 'Llevar precios');
  assert.equal(p.get('dates'), '20261110T163000/20261110T173000');
  assert.equal(p.get('ctz'), 'Europe/Madrid');
});

test('reunión que acaba pasada la medianoche termina al día siguiente', () => {
  const p = params(urlGoogleCalendar({ titulo: 'x', fecha: '2026-11-30', hora: '23:30' }));
  assert.equal(p.get('dates'), '20261130T233000/20261201T003000');
});

test('sin hora: evento de todo el día', () => {
  const p = params(urlGoogleCalendar({ titulo: 'x', fecha: '2026-11-10', hora: null }));
  assert.equal(p.get('dates'), '20261110/20261111');
});
