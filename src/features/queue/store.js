// Cola de tareas («Empezar tareas», como la de HubSpot): en qué tarea se está y cómo avanzar.
import { cerrarLlamada, registrarLlamada } from '../call/store.js';
import { contacto, tocar } from '../contacts/store.js';
import { ACCION_A_NOTA } from '../notes/schema.js';
import { nota } from '../notes/store.js';
import { marcarTarea, tarea, tareaExistente } from '../tasks/store.js';
import { hoy, sumarDias } from '../../shared/lib/dates.js';
import { ahora, uid } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render, rutaActual } from '../../shared/router.js';
import { db, ui } from '../../shared/state.js';
import { avisar } from '../../shared/ui/toast.js';

// Como la cola de tareas de HubSpot: cada tarea de un contacto se hace desde su ficha completa
// (con «Tarea 2 de 10» arriba); las tareas sin contacto y el final, en la página #/cola.
/**
 * La cola de tareas en curso (ui.cola): las tareas por hacer y en cuál se está.
 * @typedef {{ ids: string[], i: number, origen: string }} Cola
 */

/**
 * Empieza a hacer `tareas` una detrás de otra, desde la `i`.
 * @param {import('../tasks/schema.js').Tarea[]} tareas
 * @param {string} [origen] de dónde se empezó (hoy, tareas…)
 * @param {number} [i]
 */
export function empezarSecuencia(tareas, origen = 'hoy', i = 0) {
  if (!tareas.length) return avisar('No hay tareas pendientes');
  ui.cola = { ids: tareas.map((t) => t.id), i, origen };
  mostrarCola();
}

/** La cola en curso, que tiene que existir (si no, es un error del programa). */
export function colaActiva() {
  if (!ui.cola) throw new Error('No hay ninguna cola de tareas en curso');
  return ui.cola;
}

/** La tarea en curso de la cola (null si no hay cola o se ha llegado al final). */
export const tareaColaActual = () => (ui.cola && ui.cola.i < ui.cola.ids.length ? tarea(ui.cola.ids[ui.cola.i]) : null);

// Lleva a donde se hace la tarea actual de la cola.
function mostrarCola() {
  const t = tareaColaActual();
  const destino = t && contacto(t.contactId) ? '#/contacto/' + t.contactId : '#/cola';
  if (location.hash === destino) {
    render();
    window.scrollTo(0, 0);
  } else location.hash = destino;
}

// La página actual es la de la tarea en curso de la cola (la página #/cola o la ficha de su contacto).
export function enModoCola() {
  const { ruta, id } = rutaActual();
  const t = tareaColaActual();
  return !!ui.cola && (ruta === 'cola' || (ruta === 'contacto' && !!t && t.contactId === id));
}

// Si se ha borrado alguna tarea mientras tanto, desaparece de la cola.
export function limpiarCola() {
  const cola = ui.cola;
  if (!cola) return;
  const actual = cola.ids[cola.i];
  cola.ids = cola.ids.filter((id) => tarea(id));
  cola.i = cola.ids.includes(actual) ? cola.ids.indexOf(actual) : Math.min(cola.i, cola.ids.length);
}

export function salirDeCola() {
  ui.cola = null;
  if (ui.llamada && !ui.llamada.inicio && !ui.llamada.notas.trim()) cerrarLlamada();
  location.hash = '#/tareas';
}

/** @param {number} i */
export function irEnCola(i) {
  if (!ui.cola) return;
  ui.cola.i = Math.max(0, Math.min(i, ui.cola.ids.length));
  mostrarCola();
}

// Siguiente tarea sin hacer después de `desde` (o el final de la secuencia).
/** Siguiente tarea sin hacer después de `desde` (o el final de la cola). @param {number} desde */
function siguientePendiente(desde) {
  const { ids } = colaActiva();
  for (let i = desde + 1; i < ids.length; i++) if (!tarea(ids[i])?.hecha) return i;
  return ids.length;
}

export const saltarEnCola = () => irEnCola(siguientePendiente(colaActiva().i));

// Lo apuntado en la secuencia se guarda como nota del contacto (o en la nota de la tarea, si no tiene contacto).
/** @param {import('../tasks/schema.js').Tarea} t @param {string} texto */
function notaDeCola(t, texto) {
  const previa = !t.contactId && t.noteId && nota(t.noteId);
  if (previa) {
    previa.contenido = `${previa.contenido}\n\n${texto}`.trim();
    previa.editado = ahora();
    return null;
  }
  const n = {
    id: uid(), contactId: t.contactId, tipo: ACCION_A_NOTA[/** @type {string} */ (t.accion)] || 'general', titulo: t.titulo,
    contenido: texto, fecha: hoy(), fijada: false, creado: ahora(),
  };
  db.notes.push(n);
  if (!t.noteId) t.noteId = n.id;
  return n;
}

export function completarEnCola(cancelada = false, datosAccion = {}, mensaje = 'Tarea completada') {
  const cola = ui.cola;
  const t = cola && tarea(cola.ids[cola.i]);
  if (!t || t.hecha) return;
  const antes = cola.i;
  const texto = (ui.colaNotas[t.id] || '').trim();
  const n = texto ? notaDeCola(t, texto) : null;
  marcarTarea(t, true, cancelada, datosAccion);
  const ac = db.actions.find((a) => a.taskId === t.id);
  if (ac && n) ac.noteId = n.id;
  delete ui.colaNotas[t.id];
  cola.i = siguientePendiente(cola.i);
  guardar();
  mostrarCola();
  avisar(cancelada ? 'Reunión marcada como cancelada' : mensaje, () => {
    marcarTarea(t, false);
    if (n) {
      db.notes = db.notes.filter((x) => x.id !== n.id);
      if (t.noteId === n.id) delete t.noteId;
      ui.colaNotas[t.id] = texto;
    }
    cola.i = antes;
    guardar();
    mostrarCola();
  });
}

export function posponerEnCola() {
  const cola = colaActiva();
  const t = tareaExistente(cola.ids[cola.i]);
  const antes = { i: cola.i, fecha: t.fecha };
  t.fecha = sumarDias(hoy(), 1);
  tocar(t.contactId);
  cola.i = siguientePendiente(cola.i);
  guardar();
  mostrarCola();
  avisar('Tarea pasada a mañana', () => {
    t.fecha = antes.fecha;
    cola.i = antes.i;
    guardar();
    mostrarCola();
  });
}

// En "Empezar tareas": si la tarea actual es una llamada abierta en la ventana, completar = registrar la llamada.
export function completarActualEnCola() {
  const t = ui.cola && tarea(ui.cola.ids[ui.cola.i]);
  if (t && ui.llamada?.taskId === t.id) registrarLlamada();
  else completarEnCola();
}
