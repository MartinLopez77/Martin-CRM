// Secuencias: qué es una secuencia (sus pasos) y una inscripción, tipos de paso y orden de los inscritos.

/**
 * Un paso: crea una tarea de ese tipo `espera` días después de inscribir (el primero) o del paso anterior.
 * En el título y el detalle, {nombre} y {empresa} se cambian por los del contacto.
 * @typedef {{ id: string, tipo: string, espera: number, prioridad: string, titulo: string, detalle: string }} Paso
 */
/** @typedef {{ id: string, nombre: string, descripcion: string, pasos: Paso[], creado: string }} Secuencia */
/**
 * Un contacto en una secuencia. Solo puede estar en una activa a la vez.
 * @typedef {Object} Inscripcion
 * @property {string} id
 * @property {string} sequenceId
 * @property {string} contactId
 * @property {number} paso el paso en el que está
 * @property {'activa' | 'terminada' | 'cancelada'} estado
 * @property {string | null} tareaId la tarea del paso actual
 * @property {string} inicio
 * @property {string | null} fin
 */

// Tipos de paso de una secuencia: cada paso crea una tarea de ese tipo de acción.
export const TIPOS_PASO = ['llamada', 'email', 'whatsapp', 'videollamada', 'reunion', 'otra'];

/** @type {Record<string, number>} */
export const ORDEN_INSCRIPCION = { activa: 0, terminada: 1, cancelada: 2 };
