// Acciones realizadas: consultas sobre db.actions.
import { db } from '../../shared/state.js';

/** @param {string | null | undefined} id */
const accion = (id) => db.actions.find((a) => a.id === id);

/**
 * La acción `id`, que tiene que existir (si no, es un error del programa).
 * @param {string | null | undefined} id
 */
export function accionExistente(id) {
  const x = accion(id);
  if (!x) throw new Error(`No existe la acción ${id}`);
  return x;
}

/** URL de la grabación de una llamada (el audio lo guarda el servidor en grabaciones/). @param {string} id */
export const urlGrabacion = (id) => `/api/grabaciones/${encodeURIComponent(id)}`;

/** Grabaciones que aún se están subiendo al servidor: su reproductor no pide el audio hasta que estén. */
export const grabacionesSubiendo = new Set();

/** Borra del servidor la grabación `id` (al borrar su acción o su contacto). @param {string | null | undefined} id */
export function borrarGrabacion(id) {
  if (id) fetch(urlGrabacion(id), { method: 'DELETE' }).catch(() => { /* sin servidor: se queda el archivo */ });
}

/** Las acciones realizadas con un contacto, de la más reciente a la más antigua. @param {string} id */
export const accionesDe = (id) =>
  db.actions.filter((a) => a.contactId === id)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.hora || '').localeCompare(a.hora || '') || (b.creado || '').localeCompare(a.creado || ''));
