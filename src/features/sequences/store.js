// Secuencias (como las de HubSpot): pasos que se van convirtiendo en tareas al inscribir y al completar.
import { tipoAccionDe } from '../activity/schema.js';
import { empresaDe } from '../companies/store.js';
import { contactoExistente, tocar } from '../contacts/store.js';
import { tarea } from '../tasks/store.js';
import { hoy, sumarDias } from '../../shared/lib/dates.js';
import { ahora, plural, uid } from '../../shared/lib/text.js';
import { db } from '../../shared/state.js';
import { avisar } from '../../shared/ui/toast.js';

/** @typedef {import('./schema.js').Inscripcion} Inscripcion */
/** @typedef {import('./schema.js').Secuencia} Secuencia */

/** @param {string | null | undefined} id */
export const secuencia = (id) => db.sequences.find((s) => s.id === id);
/** @param {string | null | undefined} id */
export const inscripcion = (id) => db.enrollments.find((e) => e.id === id);
/** La secuencia en la que está ahora un contacto (si está en alguna). @param {string} contactId */
export const inscripcionActiva = (contactId) => db.enrollments.find((e) => e.contactId === contactId && e.estado === 'activa');

/**
 * La secuencia `id`, que tiene que existir (si no, es un error del programa).
 * @param {string | null | undefined} id
 */
export function secuenciaExistente(id) {
  const s = secuencia(id);
  if (!s) throw new Error(`No existe la secuencia ${id}`);
  return s;
}

/** @param {string | null | undefined} id */
export function inscripcionExistente(id) {
  const e = inscripcion(id);
  if (!e) throw new Error(`No existe la inscripción ${id}`);
  return e;
}

/** "2 días después del paso anterior". @param {import('./schema.js').Paso} p @param {number} i */
export const textoEspera = (p, i) => {
  const dias = +p.espera || 0;
  const n = `${dias} día${plural(dias)}`;
  if (i === 0) return dias ? `${n} después de inscribir` : 'Al inscribir';
  return dias ? `${n} después del paso anterior` : 'Justo después del paso anterior';
};

// "Llamar a {nombre} de {empresa}" → con los datos del contacto.
/** @param {string} texto @param {import('../contacts/schema.js').Contacto} c */
const rellenarPlantilla = (texto, c) =>
  (texto || '').replace(/\{nombre\}/gi, c.nombre.split(/\s+/)[0]).replace(/\{empresa\}/gi, empresaDe(c)).replace(/\s{2,}/g, ' ').trim();

// Crea la tarea del paso `i` de una inscripción: fecha `base` + los días de espera del paso.
/** @param {Inscripcion} ins @param {number} i @param {string} base fecha desde la que se cuentan los días */
function crearTareaPaso(ins, i, base) {
  const p = secuenciaExistente(ins.sequenceId).pasos[i];
  const c = contactoExistente(ins.contactId);
  /** @type {import('../tasks/schema.js').Tarea} */
  const t = {
    id: uid(),
    titulo: rellenarPlantilla(p.titulo, c) || `${tipoAccionDe(p.tipo).label} · ${c.nombre}`,
    detalle: rellenarPlantilla(p.detalle, c),
    contactId: c.id,
    accion: p.tipo,
    fecha: sumarDias(base, +p.espera || 0),
    hora: null,
    prioridad: p.prioridad || 'ninguna',
    hecha: false,
    completada: null,
    creado: ahora(),
    enrollmentId: ins.id,
    paso: i,
  };
  db.tasks.push(t);
  ins.paso = i;
  ins.tareaId = t.id;
  return t;
}

// Inscribe contactos en una secuencia. Cada contacto solo puede estar en una secuencia activa a la vez.
/** @param {Secuencia} s @param {import('../contacts/schema.js').Contacto[]} contactos @param {string} [inicio] */
export function inscribir(s, contactos, inicio = hoy()) {
  const libres = contactos.filter((c) => !inscripcionActiva(c.id));
  libres.forEach((c) => {
    /** @type {Inscripcion} */
    const ins = { id: uid(), sequenceId: s.id, contactId: c.id, paso: 0, estado: 'activa', tareaId: null, inicio: ahora(), fin: null };
    db.enrollments.push(ins);
    crearTareaPaso(ins, 0, inicio);
    tocar(c.id);
  });
  const n = libres.length;
  const saltados = contactos.length - n;
  avisar(`${n} contacto${plural(n)} inscrito${plural(n)} en «${s.nombre}»${saltados ? ` · ${saltados} ya estaba${saltados === 1 ? '' : 'n'} en una secuencia` : ''}`);
}

// Al completar la tarea de un paso se crea la del siguiente; tras el último, la secuencia termina.
/** @param {import('../tasks/schema.js').Tarea} t */
export function avanzarSecuencia(t) {
  const ins = inscripcion(t.enrollmentId);
  const s = ins && secuencia(ins.sequenceId);
  if (!s || !ins || ins.estado !== 'activa' || ins.tareaId !== t.id) return;
  const paso = /** @type {number} */ (t.paso);
  if (paso + 1 < s.pasos.length) t.siguienteId = crearTareaPaso(ins, paso + 1, hoy()).id;
  else Object.assign(ins, { estado: 'terminada', fin: ahora() });
}

// Deshacer: la tarea vuelve a estar pendiente y se quita la del paso siguiente si aún no se ha hecho.
/** @param {import('../tasks/schema.js').Tarea} t */
export function retrocederSecuencia(t) {
  const ins = inscripcion(t.enrollmentId);
  if (!ins || ins.estado === 'cancelada') return;
  const sig = t.siguienteId ? tarea(t.siguienteId) : undefined;
  if (sig?.hecha) return;
  if (sig) db.tasks = db.tasks.filter((x) => x.id !== sig.id);
  delete t.siguienteId;
  Object.assign(ins, { estado: 'activa', paso: t.paso, tareaId: t.id, fin: null });
}

/** @param {Inscripcion} ins */
export function sacarDeSecuencia(ins) {
  Object.assign(ins, { estado: 'cancelada', fin: ahora() });
  const t = tarea(ins.tareaId);
  if (t && !t.hecha) db.tasks = db.tasks.filter((x) => x.id !== t.id);
  tocar(ins.contactId);
}

/** Lo que se añade a la confirmación al borrar una tarea que es el paso actual de una secuencia. @param {import('../tasks/schema.js').Tarea} t */
export const avisoSecuencia = (t) => {
  const ins = t.enrollmentId && inscripcion(t.enrollmentId);
  return ins && ins.estado === 'activa' && ins.tareaId === t.id ? `\n\nEs el paso actual de la secuencia «${secuencia(ins.sequenceId)?.nombre}»: el contacto saldrá de ella.` : '';
};
