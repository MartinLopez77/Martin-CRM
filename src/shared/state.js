// Estado del CRM: los datos (db, lo que se guarda en data.json) y el estado de la interfaz (ui, no se guarda).

/**
 * Los datos guardados. Cada colección se tipará con el schema de su feature al migrarla.
 * @typedef {Object} BaseDatos
 * @property {any[]} contacts
 * @property {any[]} notes
 * @property {any[]} tasks
 * @property {any[]} actions
 * @property {any[]} companies
 * @property {any[]} users
 * @property {any[]} views
 * @property {any[]} taskViews
 * @property {any[]} imports
 * @property {any[]} sequences
 * @property {any[]} enrollments
 * @property {Record<string, any>} settings
 */

export const AJUSTES_DEFECTO = { horaSecundaria: true, zonaSecundaria: 'Asia/Kuala_Lumpur' };

/** @type {BaseDatos} */
export let db = { contacts: [], notes: [], tasks: [], actions: [], companies: [], users: [], views: [], taskViews: [], imports: [], sequences: [], enrollments: [], settings: { ...AJUSTES_DEFECTO } };

/** Sustituye los datos (al cargarlos del servidor). @param {BaseDatos} datos */
export function setDb(datos) {
  db = datos;
}

// Estado de la interfaz: qué vista, filtros, editores o ventanas están abiertos.
export const ui = {
  vistaId: (() => { try { return localStorage.getItem('crm-vista') || 'todos'; } catch { return 'todos'; } })(),
  /** @type {any} filtros de la tabla de contactos (se cargan de la vista) */
  filtros: null,
  /** @type {any} */
  orden: null,
  /** @type {Set<string>} contactos marcados en la tabla */
  seleccion: new Set(),
  empresasQ: '',
  empresasEstado: '', // filtro por estado lead en la tabla de empresas
  fichaTab: 'notas', // pestaña de la columna central de la ficha: notas, tareas, whatsapp, correo
  tareasVista: 'bandeja',
  tareasQ: '',
  /** @type {any} editor de tarea abierto: { clave, fecha } */
  editor: null,
  /** @type {string | null} */
  contactoActual: null,
  notaFiltro: '',
  notasContactoQ: '',
  /** @type {Set<string>} notas desplegadas */
  notasAbiertas: new Set(),
  datosAbiertos: false, // desplegable "Datos" de la ficha
  enfocarTarea: false,
  /** @type {any} cola de tareas en curso: { ids, i, origen } */
  cola: null,
  /** @type {Set<string>} listas de tareas generales creadas que aún no tienen tareas */
  listasNuevas: new Set(),
  /** @type {Record<string, string>} nota rápida que se está escribiendo en cada tarea de la cola */
  colaNotas: {},
  /** @type {any} ventana de llamada: { contactId, taskId, telefono, inicio, duracion, resultado, notas, minimizada } */
  llamada: null,
  /** @type {string | null} tarea cuya ventana de llamada se cerró a mano (no se vuelve a abrir sola) */
  llamadaCerrada: null,
  /** @type {string | null} tarea a resaltar al abrir la ficha del contacto desde Tareas */
  tareaDestacada: null,
};
