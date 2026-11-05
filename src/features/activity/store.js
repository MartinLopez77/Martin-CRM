// Acciones realizadas: consultas sobre db.actions.
import { db } from '../../shared/state.js';

/** @param {string | null | undefined} id */
export const accion = (id) => db.actions.find((a) => a.id === id);

/**
 * La acción `id`, que tiene que existir (si no, es un error del programa).
 * @param {string | null | undefined} id
 */
export function accionExistente(id) {
  const x = accion(id);
  if (!x) throw new Error(`No existe la acción ${id}`);
  return x;
}

/** Las acciones realizadas con un contacto, de la más reciente a la más antigua. @param {string} id */
export const accionesDe = (id) =>
  db.actions.filter((a) => a.contactId === id)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.hora || '').localeCompare(a.hora || '') || (b.creado || '').localeCompare(a.creado || ''));
