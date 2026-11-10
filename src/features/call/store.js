// Llamadas: resultado, duración y registrar la llamada como acción (y nota).
import { pintarLlamada } from './window.js';
import { descartarGrabacion, empezarGrabacion, pararGrabacion, subirGrabacion } from './grabadora.js';
// Para Ajustes (elegir la entrada del audio del ordenador).
export { entradasDeAudio, esEntradaDelSistema, pedirPermisoMicro } from './grabadora.js';
import { grabacionesSubiendo, urlGrabacion } from '../activity/store.js';
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
 * @property {boolean} terminada ya se llamó y se colgó: no se puede volver a llamar desde esta ventana
 * @property {string} resultado id de RESULTADOS_LLAMADA; '' = sin completar (obligatorio para registrarla)
 * @property {string} notas
 * @property {boolean} minimizada
 * @property {string | null} grabacion id de la grabación de esta llamada, si se está grabando o ya se grabó
 * @property {boolean} grabaSistema si la grabación lleva también el audio del ordenador (la voz del otro)
 */

/** Hay una llamada hecha (o en curso) que aún no se ha registrado. @param {Llamada | null | undefined} L */
export const llamadaPendiente = (L) => !!L && (!!L.inicio || L.terminada);

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
  // Una llamada hecha no se pierde: hasta registrarla, la ventana es suya.
  if (llamadaPendiente(ui.llamada)) {
    const L = /** @type {Llamada} */ (ui.llamada);
    L.minimizada = false;
    pintarLlamada();
    if (L.contactId !== contactId) avisar(L.inicio ? 'Hay una llamada en curso: cuélgala y regístrala primero' : 'Elige el resultado de la llamada anterior y regístrala primero');
    return;
  }
  const c = contactoExistente(contactId);
  descartarGrabacion();
  ui.llamada = {
    contactId, taskId, telefono: c.telefono || '', inicio: null, duracion: 0, terminada: false, resultado: '', notas: '', minimizada: false,
    grabacion: null, grabaSistema: false,
  };
  ui.llamadaCerrada = null;
  pintarLlamada();
}

export function cerrarLlamada() {
  descartarGrabacion();
  ui.llamada = null;
  pintarLlamada();
}

/** Empieza a grabar la llamada `L` (todas las llamadas se graban). @param {Llamada} L */
export function grabarLlamada(L) {
  empezarGrabacion(db.settings.entradaLlamada || '').then((g) => {
    // Mientras se daba el permiso se pudo colgar o cerrar la llamada.
    if (ui.llamada !== L || !L.inicio) return descartarGrabacion();
    if (!g) return avisar('No se graba: el navegador no tiene permiso para usar el micrófono');
    L.grabacion = g.id;
    L.grabaSistema = g.sistema;
    pintarLlamada();
  });
}

export function colgar() {
  const L = ui.llamada;
  if (!L?.inicio) return;
  L.duracion = segundosLlamada(L);
  L.inicio = null;
  L.terminada = true;
  pararGrabacion();
}

// Sube la grabación de una llamada ya registrada. Si no se puede guardar, la acción se queda sin ella.
/** @param {string} id */
function guardarGrabacion(id) {
  grabacionesSubiendo.add(id);
  subirGrabacion().then((ok) => {
    grabacionesSubiendo.delete(id);
    if (ok) {
      // El reproductor que ya esté en pantalla puede cargar el audio ahora.
      document.querySelectorAll(`audio[src="${urlGrabacion(id)}"]`).forEach((el) => {
        const audio = /** @type {HTMLAudioElement} */ (el);
        audio.preload = 'metadata';
        audio.load();
      });
      return;
    }
    const a = db.actions.find((x) => x.grabacion === id);
    if (a) {
      delete a.grabacion;
      guardar();
      render();
    }
    avisar('No se ha podido guardar la grabación de la llamada');
  });
}

// Guarda la llamada como acción (y nota, si hay notas). Si viene de una tarea, la completa.
export function registrarLlamada() {
  const L = ui.llamada;
  if (!L) return;
  if (!L.resultado) {
    avisar('Elige el resultado de la llamada');
    return;
  }
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
  datos.resultado = r.id;
  if (L.duracion) datos.duracion = L.duracion;
  if (L.grabacion) {
    datos.grabacion = L.grabacion;
    guardarGrabacion(L.grabacion); // antes de cerrar la ventana, que descarta lo que no se haya guardado
  }
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
