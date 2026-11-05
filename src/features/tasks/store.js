// Tareas: consultas, orden, filtros y completar (que registra la acción y avanza la secuencia).
import { empresa, empresaDe } from '../companies/store.js';
import { cambiarContacto, contacto, tocar } from '../contacts/store.js';
import { ACCION_A_NOTA } from '../notes/schema.js';
import { nota } from '../notes/store.js';
import { avanzarSecuencia, inscripcion, retrocederSecuencia } from '../sequences/store.js';
import { hoy, partesEn, sumarDias, ZONA } from '../../shared/lib/dates.js';
import { ahora, uid } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db, ui } from '../../shared/state.js';
import { avisar } from '../../shared/ui/toast.js';

/** @typedef {import('./schema.js').Tarea} Tarea */
/** @typedef {import('./schema.js').FiltrosTarea} FiltrosTarea */

/** @param {string | null | undefined} id */
export const tarea = (id) => db.tasks.find((t) => t.id === id);
/**
 * La tarea `id`, que tiene que existir (si no, es un error del programa).
 * @param {string | null | undefined} id
 */
export function tareaExistente(id) {
  const t = tarea(id);
  if (!t) throw new Error(`No existe la tarea ${id}`);
  return t;
}

/** Las tareas pendientes de un contacto. @param {string} id */
export const pendientesDe = (id) => db.tasks.filter((t) => t.contactId === id && !t.hecha);
/** @param {Tarea} t */
const prioridadPeso = (t) => /** @type {Record<string, number>} */ ({ alta: 0, media: 1, baja: 2 })[t.prioridad] ?? 3;

// Hora a la que toca una tarea.
/** @param {Tarea} t */
const horaEfectiva = (t) => t.hora || '';

// Con fecha primero (más próxima antes); a igual fecha, por hora y luego por prioridad.
/** @param {Tarea} a @param {Tarea} b */
export function ordenTareas(a, b) {
  if (a.fecha && b.fecha && a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
  if (!!a.fecha !== !!b.fecha) return a.fecha ? -1 : 1;
  const ha = horaEfectiva(a), hb = horaEfectiva(b);
  if (ha !== hb) {
    if (!ha || !hb) return ha ? -1 : 1;
    return ha.localeCompare(hb);
  }
  return prioridadPeso(a) - prioridadPeso(b);
}

/** @param {string} id */
export const proximaTarea = (id) => pendientesDe(id).sort(ordenTareas)[0];

/** Los nombres de las listas de tareas generales. */
export const listasDeTareas = () => [...new Set([.../** @type {string[]} */ (db.tasks.map((t) => t.lista).filter(Boolean)), ...ui.listasNuevas])].sort((a, b) => a.localeCompare(b, 'es'));

// Borrar a mano la tarea actual de una secuencia saca al contacto de ella (si no, se quedaría atascado).
/** @param {Tarea} t */
export function borrarTarea(t) {
  db.tasks = db.tasks.filter((x) => x.id !== t.id);
  const ins = t.enrollmentId && inscripcion(t.enrollmentId);
  if (ins && ins.estado === 'activa' && ins.tareaId === t.id) Object.assign(ins, { estado: 'cancelada', fin: ahora() });
}

/** La vista propia de tareas `id` (por defecto, la abierta). */
export const vistaTareaPropia = (id = ui.tareasVista) => db.taskViews.find((v) => v.id === id);

/** @param {Tarea} t @param {FiltrosTarea} f */
export function cumpleFiltroTarea(t, f) {
  const h = hoy();
  const c = contacto(t.contactId);
  /** @type {Record<string, unknown>} */
  const enRango = {
    vencidas: t.fecha && t.fecha < h,
    hoy: t.fecha && t.fecha <= h,
    'solo-hoy': t.fecha === h,
    manana: t.fecha === sumarDias(h, 1),
    semana: t.fecha && t.fecha >= h && t.fecha <= sumarDias(h, 6),
    futuras: t.fecha && t.fecha > h,
    'con-fecha': !!t.fecha,
    sin: !t.fecha,
  };
  if (f.cuando && !enRango[f.cuando]) return false;
  if (f.accion && (f.accion === 'interna' ? t.accion : t.accion !== f.accion)) return false;
  if (f.prioridad && (t.prioridad || 'ninguna') !== f.prioridad) return false;
  if (f.contacto && (f.contacto === 'con' ? !c : c)) return false;
  if (f.estado && c?.estado !== f.estado) return false;
  if (f.estadoLead && (empresa(c?.companyId)?.estadoLead || '') !== f.estadoLead) return false;
  if (f.ownerId && (f.ownerId === 'ninguno' ? c?.ownerId : c?.ownerId !== f.ownerId)) return false;
  if (f.secuencia) {
    const s = t.enrollmentId && inscripcion(t.enrollmentId)?.sequenceId;
    if (f.secuencia === 'alguna' ? !s : f.secuencia === 'ninguna' ? s : s !== f.secuencia) return false;
  }
  if (f.lista && (c || (t.lista || 'General') !== f.lista)) return false;
  if (f.q && !coincideTarea(t, f.q.trim().toLowerCase())) return false;
  return true;
}

// Día (en España) en que se completó una tarea.
/** @param {Tarea} t */
export const diaCompletada = (t) => {
  if (!t.completada) return '';
  const p = partesEn(ZONA, new Date(t.completada));
  return `${p.year}-${p.month}-${p.day}`;
};

/** @param {Tarea} t @param {string} q en minúsculas */
export function coincideTarea(t, q) {
  if (!q) return true;
  const c = contacto(t.contactId);
  const n = nota(t.noteId);
  return [t.titulo, t.detalle, c?.nombre, empresaDe(c), n?.titulo].some((v) => (v || '').toLowerCase().includes(q));
}

// Marca una tarea como hecha/pendiente. Si es una acción planeada (llamar, WhatsApp…) queda registrada en el historial de acciones.
// Una reunión `cancelada` cuenta como hecha, pero se registra como "Reunión cancelada".
/**
 * @param {Tarea} t
 * @param {boolean} hecha
 * @param {boolean} [cancelada]
 * @param {Partial<import('../activity/schema.js').AccionRealizada>} [datosAccion] lo que se guarda en la acción (p. ej. de una llamada)
 */
export function marcarTarea(t, hecha, cancelada = false, datosAccion = {}) {
  t.hecha = hecha;
  t.completada = hecha ? ahora() : null;
  if (hecha && cancelada) t.cancelada = true;
  else delete t.cancelada;
  if (hecha && t.accion && t.contactId && !db.actions.some((a) => a.taskId === t.id)) {
    db.actions.push({
      id: uid(), contactId: t.contactId, tipo: cancelada ? 'reunion-cancelada' : /** @type {string} */ (t.accion), fecha: hoy(), hora: null,
      resumen: t.titulo, noteId: t.noteId || null, taskId: t.id, creado: ahora(), ...datosAccion,
    });
  }
  if (!hecha) db.actions = db.actions.filter((a) => a.taskId !== t.id);
  if (t.enrollmentId) (hecha ? avanzarSecuencia : retrocederSecuencia)(t);
  tocar(t.contactId);
}

// Completa (o cancela) con aviso para deshacer.
/**
 * Completa (o cancela) con aviso para deshacer.
 * @param {Tarea} t
 * @param {boolean} [cancelada]
 * @param {Partial<import('../activity/schema.js').AccionRealizada>} [datosAccion]
 * @param {string} [mensaje]
 */
export function completarTarea(t, cancelada = false, datosAccion = {}, mensaje = 'Tarea completada') {
  marcarTarea(t, true, cancelada, datosAccion);
  guardar();
  render();
  avisar(cancelada ? 'Reunión marcada como cancelada' : mensaje, () => {
    marcarTarea(t, false);
    guardar();
    render();
  });
}

export const tareasParaHoy = () => db.tasks.filter((t) => !t.hecha && t.fecha && t.fecha <= hoy()).sort(ordenTareas);

// Las tareas pendientes que se ven ahora mismo en la página Tareas, en el mismo orden.
export function tareasDeLaVista() {
  const h = hoy();
  const q = ui.tareasQ.trim().toLowerCase();
  const propia = vistaTareaPropia();
  return db.tasks
    .filter((t) => !t.hecha && coincideTarea(t, q))
    .filter((t) => {
      if (propia) return cumpleFiltroTarea(t, propia.filtros);
      if (ui.tareasVista === 'hoy') return t.fecha && t.fecha <= h;
      if (ui.tareasVista === 'proximo') return t.fecha && t.fecha <= sumarDias(h, 6);
      if (ui.tareasVista === 'generales') return !t.contactId;
      return true;
    })
    .sort(ordenTareas);
}

// Crea o actualiza la nota asociada a una tarea (la de "Nota"). Si la tarea es de un contacto, la nota se ve también en su ficha.
/** @param {Tarea} t @param {string | undefined} contenido */
export function guardarNotaDeTarea(t, contenido) {
  const texto = (contenido || '').trim();
  const existente = t.noteId && nota(t.noteId);
  if (existente) {
    if (existente.contenido !== texto && texto) Object.assign(existente, { contenido: texto, editado: ahora() });
    // Nota sin contacto (las antiguas "notas sueltas") de una tarea que ahora tiene contacto: pasa a ser del contacto.
    const c = !existente.contactId && contacto(t.contactId);
    if (c) {
      existente.contactId = c.id;
      cambiarContacto(c, () => {
        if (!c.telefono && existente.telefono) c.telefono = existente.telefono;
        if (!c.email && existente.email) c.email = existente.email;
      });
      if (!c.hubspotId && existente.hubspotId) Object.assign(c, { hubspotId: existente.hubspotId, hubspotEstado: existente.hubspotEstado });
    }
    return;
  }
  if (!texto) return;
  const n = {
    id: uid(), contactId: t.contactId, tipo: ACCION_A_NOTA[/** @type {string} */ (t.accion)] || 'general', titulo: t.titulo,
    contenido: texto, fecha: hoy(), fijada: false, creado: ahora(),
  };
  db.notes.push(n);
  t.noteId = n.id;
}
