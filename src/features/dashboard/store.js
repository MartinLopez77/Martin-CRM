// Dashboard: estadísticas de un periodo (llamadas, reuniones, canales, contactos…) sacadas de db.
// Solo lee: no cambia nada.
import { ESTADOS } from '../contacts/schema.js';
import { RESULTADOS_LLAMADA } from '../call/store.js';
import { REUNIONES } from '../tasks/schema.js';
import { diaDe, hoy, sumarDias } from '../../shared/lib/dates.js';
import { db } from '../../shared/state.js';

/** @typedef {{ id: string, label: string, dias: number | null }} Periodo */

/** Periodos del selector. `dias: null` = todo. @type {Periodo[]} */
export const PERIODOS = [
  { id: '7', label: 'Últimos 7 días', dias: 7 },
  { id: '30', label: 'Últimos 30 días', dias: 30 },
  { id: '90', label: 'Últimos 90 días', dias: 90 },
  { id: 'todo', label: 'Desde el principio', dias: null },
];

const LLAMADAS = ['llamada', 'llamada-sin-respuesta'];

/**
 * Primer y último día del periodo (incluidos). En «todo», desde el primer dato que haya.
 * @param {string} periodo id de PERIODOS
 * @returns {{ desde: string, hasta: string }}
 */
export function rangoDe(periodo) {
  const hasta = hoy();
  const p = PERIODOS.find((x) => x.id === periodo) || PERIODOS[1];
  if (p.dias) return { desde: sumarDias(hasta, -(p.dias - 1)), hasta };
  const fechas = db.actions.map((a) => a.fecha).filter(Boolean).sort();
  return { desde: fechas[0] && fechas[0] < hasta ? fechas[0] : hasta, hasta };
}

/**
 * El resultado de una llamada registrada. Las antiguas no lo guardaban: se deduce del tipo.
 * @param {import('../activity/schema.js').AccionRealizada} a
 */
export const resultadoDe = (a) => a.resultado || (a.tipo === 'llamada' ? 'conectada' : 'sin-respuesta');

/**
 * Las estadísticas entre dos días (incluidos).
 * @param {string} desde
 * @param {string} hasta
 */
export function estadisticas(desde, hasta) {
  /** @param {string | null | undefined} dia */
  const dentro = (dia) => !!dia && dia >= desde && dia <= hasta;
  const acciones = db.actions.filter((a) => dentro(a.fecha));
  const deTipo = (/** @type {string[]} */ tipos) => acciones.filter((a) => tipos.includes(a.tipo));

  const llamadas = deTipo(LLAMADAS);
  const conectadas = llamadas.filter((a) => resultadoDe(a) === 'conectada');
  const segundos = llamadas.reduce((s, a) => s + (a.duracion || 0), 0);

  // Llamadas de cada día del periodo (también los días sin ninguna), para el gráfico.
  /** @type {{ dia: string, llamadas: number, conectadas: number }[]} */
  const porDia = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) {
    const delDia = llamadas.filter((a) => a.fecha === d);
    porDia.push({ dia: d, llamadas: delDia.length, conectadas: delDia.filter((a) => resultadoDe(a) === 'conectada').length });
  }

  return {
    llamadas: llamadas.length,
    conectadas: conectadas.length,
    tasaConexion: llamadas.length ? conectadas.length / llamadas.length : null,
    minutos: Math.round(segundos / 60),
    // Reuniones agendadas: tareas de reunión o videollamada creadas en el periodo.
    reunionesAgendadas: db.tasks.filter((t) => REUNIONES.includes(/** @type {string} */ (t.accion)) && dentro(t.creado && diaDe(t.creado))).length,
    reunionesHechas: deTipo(REUNIONES).length,
    reunionesCanceladas: deTipo(['reunion-cancelada']).length,
    whatsapp: deTipo(['whatsapp']).length,
    emails: deTipo(['email']).length,
    propuestas: deTipo(['propuesta']).length,
    contactosNuevos: db.contacts.filter((c) => dentro(c.creado && diaDe(c.creado))).length,
    tareasCompletadas: db.tasks.filter((t) => t.hecha && dentro(t.completada && diaDe(t.completada))).length,
    porDia,
    resultados: RESULTADOS_LLAMADA.map((r) => ({ id: r.id, label: r.label, n: llamadas.filter((a) => resultadoDe(a) === r.id).length })),
    // El embudo es el estado actual de todos los contactos (no depende del periodo).
    embudo: ESTADOS.map((e) => ({ id: e.id, label: e.label, n: db.contacts.filter((c) => (c.estado || 'nuevo') === e.id).length })),
  };
}
