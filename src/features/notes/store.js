// Notas: consultas sobre db.notes.
import { db } from '../../shared/state.js';

/** @typedef {import('./schema.js').Nota} Nota */

/** @param {string | null | undefined} id */
export const nota = (id) => db.notes.find((n) => n.id === id);

/**
 * La nota `id`, que tiene que existir (si no, es un error del programa).
 * @param {string | null | undefined} id
 */
export function notaExistente(id) {
  const x = nota(id);
  if (!x) throw new Error(`No existe la nota ${id}`);
  return x;
}

// Fijadas primero; luego, las más recientes.
/** @param {Nota} a @param {Nota} b */
const ordenNotas = (a, b) =>
  (b.fijada ? 1 : 0) - (a.fijada ? 1 : 0) ||
  (b.fecha || '').localeCompare(a.fecha || '') ||
  (b.creado || '').localeCompare(a.creado || '');

/** Las notas de un contacto, en el orden en que se ven. @param {string} id */
export const notasDe = (id) => db.notes.filter((n) => n.contactId === id).sort(ordenNotas);
