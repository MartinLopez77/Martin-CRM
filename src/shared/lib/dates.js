// Fechas y horas. El CRM trabaja en hora de España (la de los clientes); las fechas van como 'AAAA-MM-DD'.
import { pad, mayuscula } from './text.js';

export const ZONA = 'Europe/Madrid';

/** @param {Date} d */
export const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Año, mes, día, hora y minuto de `d` en la zona horaria `zona`.
 * @param {string} zona
 * @param {Date} [d]
 */
export function partesEn(zona, d = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  return Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
}

export const hoy = () => { const p = partesEn(ZONA); return `${p.year}-${p.month}-${p.day}`; };
export const horaActual = (zona = ZONA) => { const p = partesEn(zona); return `${p.hour}:${p.minute}`; };

/**
 * Minutos que la zona va por delante de UTC en ese instante (tiene en cuenta el horario de verano).
 * @param {string} zona
 * @param {Date} d
 */
function desfase(zona, d) {
  const p = partesEn(zona, d);
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(d.getTime() / 60000) * 60000) / 60000;
}

/**
 * "18:00" en España ese día → "01:00 +1" en la zona `zona` (p. ej. Malasia).
 * @param {string} hhmm
 * @param {string} [fecha]
 * @param {boolean} [conDia]
 * @param {string} [zona]
 */
export function horaLocal(hhmm, fecha = hoy(), conDia = true, zona = ZONA) {
  if (!hhmm) return '';
  const [y, m, d] = fecha.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const comoUtc = Date.UTC(y, m - 1, d, h, mi);
  const p = partesEn(zona, new Date(comoUtc - desfase(ZONA, new Date(comoUtc)) * 60000));
  const dia = `${p.year}-${p.month}-${p.day}`;
  const marca = !conDia || dia === fecha ? '' : dia > fecha ? ' +1' : ' −1';
  return `${p.hour}:${p.minute}${marca}`;
}

/** @param {string} iso @param {number} n */
export function sumarDias(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}

/** @param {string} iso @param {number} n */
export function sumarMeses(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return isoLocal(d);
}

/** "3 nov" (con el año si no es el actual). @param {string | null | undefined} iso */
export function fmtFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  /** @type {Intl.DateTimeFormatOptions} */
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('es-ES', opts);
}

/** Hoy, Mañana, Ayer o la fecha. @param {string | null | undefined} iso */
export function fmtRelativa(iso) {
  if (!iso) return '';
  const h = hoy();
  if (iso === h) return 'Hoy';
  if (iso === sumarDias(h, 1)) return 'Mañana';
  if (iso === sumarDias(h, -1)) return 'Ayer';
  return fmtFecha(iso);
}

/** @param {string} iso @param {'long' | 'short'} [weekday] */
export const diaSemana = (iso, weekday = 'long') => new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { weekday });

/** Fecha de una tarea como en Todoist: Hoy, Mañana, el día de la semana si es esta semana, o la fecha. @param {string} iso */
export function fmtCuando(iso) {
  const h = hoy();
  if (iso > sumarDias(h, 1) && iso <= sumarDias(h, 6)) return mayuscula(diaSemana(iso));
  return fmtRelativa(iso);
}

/** Color de la fecha (como Todoist): vencida, hoy, mañana, esta semana o más adelante. @param {string} iso */
export function claseFecha(iso) {
  const h = hoy();
  if (iso < h) return 'f-vencida';
  if (iso === h) return 'f-hoy';
  if (iso === sumarDias(h, 1)) return 'f-manana';
  return iso <= sumarDias(h, 6) ? 'f-semana' : 'f-lejos';
}

/** Cabecera de cada día: "3 nov · Hoy · martes". @param {string} iso */
export function tituloDia(iso) {
  const rel = fmtRelativa(iso);
  return [fmtFecha(iso), rel !== fmtFecha(iso) ? rel : '', diaSemana(iso)].filter(Boolean).join(' · ');
}

// ---------- Atajos de fecha (mañana, en 3 días, la semana que viene…) ----------

/** @type {[string, string][]} */
export const ATAJOS_FECHA = [
  ['hoy', 'Hoy'], ['manana', 'Mañana'], ['2', 'En 2 días'], ['3', 'En 3 días'], ['lunes', 'El próximo lunes'],
  ['semana', 'La semana que viene'], ['2semanas', 'En 2 semanas'], ['mes', 'En un mes'], ['sin', 'Sin fecha'],
];

/**
 * Próximo día de la semana (0 = domingo). Si hoy es ese día, el de la semana siguiente salvo con `incluirHoy`.
 * @param {number} dia
 * @param {boolean} [incluirHoy]
 */
export function proximoDia(dia, incluirHoy = false) {
  const h = hoy();
  const dif = (dia - new Date(h + 'T00:00:00').getDay() + 7) % 7;
  return sumarDias(h, dif === 0 && !incluirHoy ? 7 : dif);
}

/** La fecha de un atajo ('' para «Sin fecha»). @param {string} id */
export function fechaAtajo(id) {
  const h = hoy();
  const dias = /** @type {Record<string, number>} */ ({ hoy: 0, manana: 1, 2: 2, 3: 3, semana: 7, '2semanas': 14 })[id];
  if (dias !== undefined) return sumarDias(h, dias);
  if (id === 'lunes') return proximoDia(1);
  if (id === 'finde') return proximoDia(6, true);
  if (id === 'mes') return sumarMeses(h, 1);
  return '';
}
