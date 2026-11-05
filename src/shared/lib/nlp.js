// Fechas, horas y tipo de acción escritos en el título, como en Todoist ("Llamar a Ana mañana a las 17").
import { pad, mayuscula } from './text.js';
import { hoy, sumarDias, sumarMeses, proximoDia, isoLocal } from './dates.js';

/** @typedef {{ ini: number, fin: number, tipo: 'fecha' | 'hora' }} Rango */
/** @typedef {[RegExp, (m: RegExpExecArray) => string | null]} Patron */

// \b no reconoce la ñ ni las tildes como letras: se usan estos límites de palabra.
/** @param {string} fuente */
const reNlp = (fuente) => new RegExp(`(?<![\\p{L}\\d])${fuente}(?![\\p{L}\\d])`, 'giu');
const DIAS_RE = ['domingo', 'lunes', 'martes', 'mi[eé]rcoles', 'jueves', 'viernes', 's[aá]bado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** @type {Record<string, number>} */
const NUMEROS = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };

/**
 * @param {number} dia
 * @param {number} mes
 * @param {string} [anio]
 */
function fechaDe(dia, mes, anio) {
  const h = hoy();
  const y = anio ? (anio.length === 2 ? 2000 + +anio : +anio) : +h.slice(0, 4);
  let iso = `${y}-${pad(mes)}-${pad(dia)}`;
  if (!anio && iso < h) iso = `${y + 1}-${pad(mes)}-${pad(dia)}`; // "15/1" en noviembre es el del año que viene
  return isoLocal(new Date(iso + 'T00:00:00')) === iso ? iso : null;
}

/** @param {number} h @param {number} [m] */
const horaDe = (h, m = 0) => (h <= 23 && m <= 59 ? `${pad(h)}:${pad(m)}` : null);

/** @type {Patron[]} */
const PATRONES_FECHA = [
  [reNlp('pasado ma[nñ]ana'), () => sumarDias(hoy(), 2)],
  [reNlp('(?<!(?:por|de|a) la )ma[nñ]ana'), () => sumarDias(hoy(), 1)], // "por la mañana" no es una fecha
  [reNlp('hoy'), () => hoy()],
  [reNlp('(?:la )?(?:semana que viene|pr[oó]xima semana|semana pr[oó]xima)'), () => proximoDia(1)],
  [reNlp('(?:el )?(?:mes que viene|pr[oó]ximo mes)'), () => sumarMeses(hoy(), 1)],
  [reNlp('(?:este )?fin de semana'), () => proximoDia(6, true)],
  [reNlp(`(?:el )?(?:pr[oó]ximo )?(${DIAS_RE.join('|')})(?: que viene)?`),
    (m) => proximoDia(DIAS_RE.findIndex((d) => new RegExp(`^${d}$`, 'iu').test(m[1])))],
  [reNlp(`en (\\d+|${Object.keys(NUMEROS).join('|')}) (d[ií]as?|semanas?|mes(?:es)?)`), (m) => {
    const n = +m[1] || NUMEROS[m[1].toLowerCase()];
    const u = m[2].toLowerCase();
    return u.startsWith('mes') ? sumarMeses(hoy(), n) : sumarDias(hoy(), u.startsWith('sem') ? n * 7 : n);
  }],
  [reNlp('(?:el )?(\\d{1,2})/(\\d{1,2})(?:/(\\d{4}|\\d{2}))?'), (m) => fechaDe(+m[1], +m[2], m[3])],
  [reNlp(`(?:el )?(\\d{1,2}) de (${MESES.join('|')})(?: de (\\d{4}))?`), (m) => fechaDe(+m[1], MESES.indexOf(m[2].toLowerCase()) + 1, m[3])],
];

const A_LAS = '(?:a las? |sobre las? )';
/** @type {Patron[]} */
const PATRONES_HORA = [
  [reNlp(`${A_LAS}?(\\d{1,2})[:.](\\d{2})(?: ?h)?`), (m) => horaDe(+m[1], +m[2])],
  [reNlp(`${A_LAS}?(\\d{1,2})(?::(\\d{2}))? ?([ap])\\.?m\\.?`), (m) => horaDe((+m[1] % 12) + (m[3].toLowerCase() === 'p' ? 12 : 0), +(m[2] || 0))],
  [reNlp(`${A_LAS}(\\d{1,2})(?: ?h)?(?: de la (ma[nñ]ana|tarde|noche))?`), (m) => {
    let h = +m[1];
    if (m[2] ? !/^ma/i.test(m[2]) && h < 12 : h >= 1 && h <= 7) h += 12; // "a las 5" → 17:00
    return horaDe(h);
  }],
  [reNlp('(\\d{1,2}) ?h'), (m) => (+m[1] >= 7 ? horaDe(+m[1]) : null)], // "17h" (no "2h", que suele ser duración)
];

/**
 * Busca una fecha y una hora en el texto. Devuelve los valores y dónde está cada trozo reconocido.
 * @param {string} texto
 */
export function analizarFechas(texto) {
  /** @type {{ fecha: string | null, hora: string | null, rangos: Rango[] }} */
  const res = { fecha: null, hora: null, rangos: [] };
  /** @param {number} ini @param {number} fin */
  const libre = (ini, fin) => res.rangos.every((r) => fin <= r.ini || ini >= r.fin);
  /** @param {Patron[]} patrones @param {'fecha' | 'hora'} tipo */
  const buscar = (patrones, tipo) => {
    for (const [patron, valor] of patrones) {
      for (const m of texto.matchAll(patron)) {
        const v = valor(m);
        const fin = m.index + m[0].length;
        if (v && libre(m.index, fin)) {
          res[tipo] = v;
          res.rangos.push({ ini: m.index, fin, tipo });
          return;
        }
      }
    }
  };
  buscar(PATRONES_HORA, 'hora');
  buscar(PATRONES_FECHA, 'fecha');
  return res;
}

/**
 * El texto sin los trozos reconocidos como fecha u hora.
 * @param {string} texto
 * @param {Rango[]} rangos
 */
export function quitarRangos(texto, rangos) {
  let t = texto;
  [...rangos].sort((a, b) => b.ini - a.ini).forEach((r) => (t = t.slice(0, r.ini) + ' ' + t.slice(r.fin)));
  t = t.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').replace(/^[\s,.;:–-]+|[\s,;:–-]+$/g, '');
  return /^\p{Lu}/u.test(texto) ? mayuscula(t) : t; // "Hoy, llamar a Luis" → "Llamar a Luis"
}

// ---------- Tipo de tarea según el título ("Llamar a Ana" → llamada, "Enviar mail" → email…) ----------

/** @type {[string, RegExp][]} */
const PALABRAS_ACCION = /** @type {[string, string][]} */ ([
  ['videollamada', 'videollamad\\p{L}*|v[ií]deo ?llamad\\p{L}*|videoconferencias?|zoom|meet|teams'],
  ['llamada', 'll[aá]m\\p{L}*|telefonear'],
  ['reunion', 'reuni[oó]n|reuniones|reunir\\p{L}*|quedar con|visitar?'],
  ['email', 'correos?|e-?mails?|mails?'],
  ['whatsapp', 'whats?app|wasap|whatsap|wsp'],
  ['propuesta', 'propuestas?|presupuestos?'],
]).map(([id, fuente]) => [id, new RegExp(`(?<![\\p{L}\\d])(?:${fuente})(?![\\p{L}\\d])`, 'iu')]);

/**
 * Si hay varias palabras, manda la que aparece antes ("Llamar para fijar reunión" → llamada).
 * @param {string} texto
 */
export function accionDeTitulo(texto) {
  /** @type {{ id: string, pos: number } | null} */
  let mejor = null;
  for (const [id, re] of PALABRAS_ACCION) {
    const m = texto.match(re);
    if (m && (!mejor || /** @type {number} */ (m.index) < mejor.pos)) mejor = { id, pos: /** @type {number} */ (m.index) };
  }
  return mejor?.id || '';
}
