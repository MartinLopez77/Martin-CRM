// Llamadas: resultado, duración y registrar la llamada como acción (y nota).
import { pintarLlamada } from './window.js';
import { cambiarContacto, contactoExistente, tocar } from '../contacts/store.js';
import { completarEnCola, enModoCola, tareaColaActual } from '../queue/store.js';
import { completarTarea, tarea } from '../tasks/store.js';
import { horaActual, hoy } from '../../shared/lib/dates.js';
import { ahora, pad, uid } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db, ui } from '../../shared/state.js';
import { avisar } from '../../shared/ui/toast.js';

/**
 * La llamada abierta en la ventana de llamada (ui.llamada).
 * @typedef {Object} Llamada
 * @property {string} contactId
 * @property {string | null} taskId tarea de la que viene (al registrarla, se completa)
 * @property {string} telefono
 * @property {number | null} inicio cuándo empezó (ms); null si no está en curso
 * @property {number} duracion segundos ya hablados (sin la parte en curso)
 * @property {string} resultado id de RESULTADOS_LLAMADA
 * @property {string} notas
 * @property {boolean} minimizada
 */

export const RESULTADOS_LLAMADA = [
  { id: 'conectada', label: 'Conectada', accion: 'llamada' },
  { id: 'sin-respuesta', label: 'Sin respuesta', accion: 'llamada-sin-respuesta' },
  { id: 'ocupado', label: 'Ocupado', accion: 'llamada-sin-respuesta' },
  { id: 'buzon', label: 'Buzón de voz', accion: 'llamada-sin-respuesta' },
  { id: 'equivocado', label: 'Número equivocado', accion: 'llamada-sin-respuesta' },
];

/** @param {import('../tasks/schema.js').Tarea | null | undefined} t */
export const esLlamada = (t) => ['llamada', 'llamada-sin-respuesta'].includes(/** @type {string} */ (t?.accion));

// Segundos que dura la llamada (la parte en curso incluida).
/** @param {Llamada} L */
export const segundosLlamada = (L) => Math.round(L.duracion + (L.inicio ? (Date.now() - L.inicio) / 1000 : 0));
/** "03:25". @param {number} seg */
export const fmtDuracion = (seg) => `${pad(Math.floor(seg / 60))}:${pad(seg % 60)}`;

/** Abre la ventana de llamada con un contacto (y la tarea de la que viene). @param {string} contactId @param {string | null} [taskId] */
export function abrirLlamada(contactId, taskId = null) {
  if (ui.llamada?.inicio && ui.llamada.contactId !== contactId) {
    avisar('Hay una llamada en curso: cuélgala o regístrala primero');
    return;
  }
  const c = contactoExistente(contactId);
  ui.llamada = { contactId, taskId, telefono: c.telefono || '', inicio: null, duracion: 0, resultado: 'conectada', notas: '', minimizada: false };
  ui.llamadaCerrada = null;
  pintarLlamada();
}

export function cerrarLlamada() {
  ui.llamada = null;
  pintarLlamada();
}

export function colgar() {
  const L = ui.llamada;
  if (!L?.inicio) return;
  L.duracion = segundosLlamada(L);
  L.inicio = null;
}

// Guarda la llamada como acción (y nota, si hay notas). Si viene de una tarea, la completa.
export function registrarLlamada() {
  const L = ui.llamada;
  if (!L) return;
  colgar();
  const c = contactoExistente(L.contactId);
  const t = L.taskId ? tarea(L.taskId) : undefined;
  const r = /** @type {typeof RESULTADOS_LLAMADA[number]} */ (RESULTADOS_LLAMADA.find((x) => x.id === L.resultado));
  const dur = L.duracion ? ` · ${fmtDuracion(L.duracion)}` : '';
  /** @type {Partial<import('../activity/schema.js').AccionRealizada>} */
  const datos = {
    tipo: r.accion,
    hora: horaActual(),
    resumen: r.id === 'conectada' ? `${t ? t.titulo : 'Llamada'}${dur}` : `${r.label}${t ? ` · ${t.titulo}` : ''}`,
  };
  if (!c.telefono && L.telefono.trim()) cambiarContacto(c, () => (c.telefono = L.telefono.trim()));
  const notas = L.notas.trim();
  const enCola = t && tareaColaActual()?.id === t.id && enModoCola();
  cerrarLlamada();

  if (enCola && !t.hecha) {
    ui.colaNotas[t.id] = notas;
    completarEnCola(false, datos, 'Llamada registrada');
    return;
  }
  if (notas) {
    const n = { id: uid(), contactId: c.id, tipo: 'llamada', titulo: t ? t.titulo : 'Llamada', contenido: notas, fecha: hoy(), fijada: false, creado: ahora() };
    db.notes.push(n);
    datos.noteId = n.id;
  }
  if (t && !t.hecha) {
    completarTarea(t, false, datos, 'Llamada registrada');
    return;
  }
  db.actions.push(/** @type {import('../activity/schema.js').AccionRealizada} */ ({ id: uid(), contactId: c.id, fecha: hoy(), noteId: null, taskId: null, creado: ahora(), ...datos }));
  tocar(c.id);
  guardar();
  render();
  avisar('Llamada registrada');
}
