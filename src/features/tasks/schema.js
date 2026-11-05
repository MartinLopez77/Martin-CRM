// Tareas: qué es una tarea, prioridades, vistas fijas y filtros de las vistas propias.

/**
 * @typedef {Object} Tarea
 * @property {string} id
 * @property {string} titulo
 * @property {string} detalle
 * @property {string | null} contactId
 * @property {string | null} [lista] lista de las tareas generales (sin contacto); null = «General»
 * @property {string | null} accion tipo de acción hacia el cliente (TIPOS_ACCION); null = tarea interna
 * @property {string | null} fecha
 * @property {string | null} hora hora de España
 * @property {string} prioridad id de PRIORIDADES
 * @property {boolean} hecha
 * @property {string | null} completada cuándo se completó (ISO)
 * @property {boolean} [cancelada] reunión que no se hizo (cuenta como hecha)
 * @property {string} [noteId] nota asociada
 * @property {string} [enrollmentId] inscripción de la secuencia que la creó
 * @property {number} [paso] paso de esa secuencia
 * @property {string} [siguienteId] tarea del paso siguiente (creada al completarla)
 * @property {string} creado
 */

/** @typedef {typeof FILTROS_TAREA_VACIOS} FiltrosTarea */
/** @typedef {{ id: string, nombre: string, filtros: FiltrosTarea, creado?: string }} VistaTareas */

// Como en Todoist: P1 (roja) … P4 (sin prioridad, la de por defecto).
export const PRIORIDADES = [
  { id: 'alta', label: 'Prioridad 1' },
  { id: 'media', label: 'Prioridad 2' },
  { id: 'baja', label: 'Prioridad 3' },
  { id: 'ninguna', label: 'Prioridad 4' },
];

// Tareas de reunión: además de completarlas se pueden marcar como canceladas.
export const REUNIONES = ['reunion', 'videollamada'];
/** @param {string} id */
export const prioridadDe = (id) => PRIORIDADES.find((p) => p.id === id) || PRIORIDADES[3];

/** Atajos del desplegable de fecha del editor: [atajo, texto, icono]. @type {[string, string, string][]} */
export const OPCIONES_FECHA_TD = [
  ['hoy', 'Hoy', 'calendario'], ['manana', 'Mañana', 'sol'], ['finde', 'Este fin de semana', 'sofa'],
  ['lunes', 'Próxima semana', 'flecha'], ['sin', 'Sin fecha', 'cancelado'],
];

export const VISTAS_TAREAS = [
  { id: 'bandeja', label: 'Todas', icono: 'bandeja' },
  { id: 'hoy', label: 'Hoy', icono: 'calendario' },
  { id: 'proximo', label: 'Próximo', icono: 'flecha' },
  { id: 'generales', label: 'Generales', icono: 'lista' },
  { id: 'completadas', label: 'Completadas', icono: 'check' },
];

// Vistas propias de Tareas (db.taskViews): una pestaña más con los filtros que se quieran.
export const FILTROS_TAREA_VACIOS = { cuando: '', accion: '', prioridad: '', contacto: '', estado: '', estadoLead: '', ownerId: '', secuencia: '', lista: '', q: '' };
export const CUANDO_TAREA = [
  { id: '', label: 'Cualquier fecha' },
  { id: 'vencidas', label: 'Vencidas' },
  { id: 'hoy', label: 'Hoy y vencidas' },
  { id: 'solo-hoy', label: 'Solo hoy' },
  { id: 'manana', label: 'Mañana' },
  { id: 'semana', label: 'Próximos 7 días' },
  { id: 'futuras', label: 'A partir de mañana' },
  { id: 'con-fecha', label: 'Con fecha' },
  { id: 'sin', label: 'Sin fecha' },
];
