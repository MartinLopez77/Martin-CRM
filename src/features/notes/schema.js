// Notas: sus tipos (y la acción que sugiere cada uno).

/**
 * @typedef {Object} Nota
 * @property {string} id
 * @property {string | null} contactId null en las antiguas notas sueltas de una tarea sin contacto
 * @property {string} tipo id de TIPOS_NOTA
 * @property {string} titulo
 * @property {string} contenido markdown
 * @property {string} fecha
 * @property {boolean} fijada
 * @property {string} creado
 * @property {string} [editado]
 * @property {string} [telefono] notas sueltas importadas: datos que pasan al contacto al asociarla
 * @property {string} [email]
 * @property {string} [hubspotId]
 * @property {string} [hubspotEstado]
 */

export const TIPOS_NOTA = [
  { id: 'videollamada', label: 'Videollamada', icon: 'video', color: '#6366f1',
    plantilla: '**Asistentes:**\n\n**Resumen:**\n\n**Puntos de dolor / necesidades:**\n- \n\n**Próximos pasos:**\n- ' },
  { id: 'llamada', label: 'Llamada', icon: 'telefono', color: '#0ea5e9' },
  { id: 'reunion', label: 'Reunión', icon: 'reunion', color: '#10b981' },
  { id: 'tener-en-cuenta', label: 'A tener en cuenta', icon: 'idea', color: '#f59e0b' },
  { id: 'documento', label: 'Documento / enlace', icon: 'enlace', color: '#14b8a6' },
  // Las crea el CRM solo al cambiar los datos del contacto (no se elige al escribir una nota).
  { id: 'cambio', label: 'Cambio de datos', icon: 'editar', color: '#94a3b8', auto: true },
  { id: 'general', label: 'General', icon: 'nota', color: '#64748b' },
];

// Al elegir un tipo de nota se sugiere registrarla como esta acción; y al revés, al crear una nota desde una acción.
/** @type {Record<string, string>} */
export const NOTA_A_ACCION = { llamada: 'llamada', videollamada: 'videollamada', reunion: 'reunion' };
/** @type {Record<string, string>} */
export const ACCION_A_NOTA = { llamada: 'llamada', 'llamada-sin-respuesta': 'llamada', videollamada: 'videollamada', reunion: 'reunion' };
/** @param {string} id */
export const tipoDe = (id) => TIPOS_NOTA.find((t) => t.id === id) || TIPOS_NOTA[TIPOS_NOTA.length - 1];
