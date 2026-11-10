// Acciones realizadas hacia el cliente (llamada, WhatsApp, email…): sus tipos.

/**
 * @typedef {Object} AccionRealizada
 * @property {string} id
 * @property {string} contactId
 * @property {string} tipo id de TIPOS_ACCION
 * @property {string} fecha
 * @property {string | null} hora hora de España
 * @property {string} resumen
 * @property {string | null} noteId nota asociada
 * @property {string | null} taskId tarea de la que viene (al completarla)
 * @property {string} creado
 * @property {string} [grabacion] id de la grabación de la llamada (archivo en grabaciones/ del servidor)
 * @property {number} [duracion] segundos que duró la llamada (las registradas desde la ventana de llamada)
 * @property {string} [resultado] resultado de la llamada (id de RESULTADOS_LLAMADA, en call/store.js)
 */

// Acciones: lo que yo he hecho hacia el cliente (o tengo planeado hacer).
export const TIPOS_ACCION = [
  { id: 'llamada', label: 'Llamada', icon: 'telefono', color: '#0ea5e9' },
  { id: 'llamada-sin-respuesta', label: 'Llamada sin respuesta', icon: 'telefono-x', color: '#94a3b8' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'chat', color: '#22c55e' },
  { id: 'email', label: 'Email', icon: 'correo', color: '#6366f1' },
  { id: 'videollamada', label: 'Videollamada', icon: 'video', color: '#8b5cf6' },
  { id: 'reunion', label: 'Reunión', icon: 'reunion', color: '#10b981' },
  { id: 'reunion-cancelada', label: 'Reunión cancelada', icon: 'cancelado', color: '#ef4444' },
  { id: 'propuesta', label: 'Propuesta enviada', icon: 'documento', color: '#f59e0b' },
  { id: 'otra', label: 'Otra', icon: 'pin', color: '#64748b' },
];
/** @param {string | null | undefined} id */
export const tipoAccionDe = (id) => TIPOS_ACCION.find((t) => t.id === id) || TIPOS_ACCION[TIPOS_ACCION.length - 1];
