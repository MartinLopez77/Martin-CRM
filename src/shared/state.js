// Estado del CRM: los datos (db, lo que se guarda en data.json) y el estado de la interfaz (ui, no se guarda).

/**
 * Los datos guardados. Cada colección tiene el tipo de su feature (las que siguen en any, aún sin migrar).
 * @typedef {Object} BaseDatos
 * @property {import('../features/contacts/schema.js').Contacto[]} contacts
 * @property {import('../features/notes/schema.js').Nota[]} notes
 * @property {import('../features/tasks/schema.js').Tarea[]} tasks
 * @property {import('../features/activity/schema.js').AccionRealizada[]} actions
 * @property {import('../features/companies/schema.js').Empresa[]} companies
 * @property {import('../features/team/store.js').Usuario[]} users
 * @property {import('../features/contacts/schema.js').VistaContactos[]} views
 * @property {import('../features/tasks/schema.js').VistaTareas[]} taskViews
 * @property {any[]} imports
 * @property {import('../features/sequences/schema.js').Secuencia[]} sequences
 * @property {import('../features/sequences/schema.js').Inscripcion[]} enrollments
 * @property {Ajustes} settings
 */

/**
 * Ajustes (#/ajustes).
 * @typedef {Object} Ajustes
 * @property {boolean} horaSecundaria mostrar también la hora de otra zona entre paréntesis
 * @property {string} zonaSecundaria
 * @property {string[]} propsEmpresaOcultas propiedades de empresa desactivadas
 * @property {import('../features/companies/schema.js').PropiedadPropia[]} propsEmpresaExtra propiedades de empresa propias
 * @property {string} [entradaLlamada] entrada de audio con la voz del otro al grabar llamadas: '' automático
 *   (la «Mezcla estéreo»), 'ninguna' (solo el micrófono) o el id de la entrada
 */

/** @type {Pick<Ajustes, 'horaSecundaria' | 'zonaSecundaria'>} */
export const AJUSTES_DEFECTO = { horaSecundaria: true, zonaSecundaria: 'Asia/Kuala_Lumpur' };

/** @type {BaseDatos} */
export let db = { contacts: [], notes: [], tasks: [], actions: [], companies: [], users: [], views: [], taskViews: [], imports: [], sequences: [], enrollments: [], settings: { ...AJUSTES_DEFECTO, propsEmpresaOcultas: [], propsEmpresaExtra: [] } };

/** Sustituye los datos (al cargarlos del servidor). @param {BaseDatos} datos */
export function setDb(datos) {
  db = datos;
}

// Estado de la interfaz: qué vista, filtros, editores o ventanas están abiertos.
export const ui = {
  vistaId: (() => { try { return localStorage.getItem('crm-vista') || 'todos'; } catch { return 'todos'; } })(),
  /** filtros de la tabla de contactos (null hasta que se carga la primera vista) */
  filtros: /** @type {import('../features/contacts/schema.js').FiltrosContactos} */ (/** @type {unknown} */ (null)),
  orden: /** @type {import('../features/contacts/schema.js').Orden} */ (/** @type {unknown} */ (null)),
  /** @type {Set<string>} contactos marcados en la tabla */
  seleccion: new Set(),
  empresasQ: '',
  empresasEstado: '', // filtro por estado lead en la tabla de empresas
  fichaTab: 'notas', // pestaña de la columna central de la ficha: notas, tareas, canales
  canal: 'whatsapp', // canal elegido en la pestaña Canales: whatsapp o correo
  dashboardPeriodo: '30', // periodo del dashboard (id de PERIODOS en features/dashboard/store.js)
  tareasVista: 'bandeja',
  tareasQ: '',
  /** @type {{ clave: string, fecha?: string } | null} editor «Añadir tarea» abierto (clave: el grupo en el que está) */
  editor: null,
  /** @type {string | null} */
  contactoActual: null,
  notasContactoQ: '',
  /** @type {Set<string>} notas desplegadas */
  notasAbiertas: new Set(),
  datosAbiertos: false, // desplegable "Datos" de la ficha
  enfocarTarea: false,
  /** @type {import('../features/queue/store.js').Cola | null} cola de tareas en curso */
  cola: null,
  /** @type {Set<string>} listas de tareas generales creadas que aún no tienen tareas */
  listasNuevas: new Set(),
  /** @type {Record<string, string>} nota rápida que se está escribiendo en cada tarea de la cola */
  colaNotas: {},
  /** @type {import('../features/call/store.js').Llamada | null} la llamada de la ventana de llamada */
  llamada: null,
  /** @type {string | null} tarea cuya ventana de llamada se cerró a mano (no se vuelve a abrir sola) */
  llamadaCerrada: null,
  /** @type {string | null} tarea a resaltar al abrir la ficha del contacto desde Tareas */
  tareaDestacada: null,
};
