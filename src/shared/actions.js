// Clics de la interfaz: cada botón o fila lleva data-action="<nombre>" y aquí se busca su función.
// Cada feature añade las suyas con Object.assign(acciones, { ... }).
import { app } from './ui/dom.js';

/** @typedef {(el: HTMLElement, e: MouseEvent) => unknown} Accion */

/** @type {Record<string, Accion>} */
export const acciones = {};

/**
 * Añade las acciones de una feature. Cada nombre solo puede estar una vez.
 * @param {Record<string, Accion>} nuevas
 */
export function registrarAcciones(nuevas) {
  for (const nombre of Object.keys(nuevas)) if (nombre in acciones) throw new Error(`Acción repetida: ${nombre}`);
  Object.assign(acciones, nuevas);
}

app.addEventListener('click', (e) => {
  const objetivo = /** @type {Element} */ (e.target);
  const el = /** @type {HTMLElement | null} */ (objetivo.closest('[data-action]'));
  if (!el) return;
  // Un enlace, select o botón dentro de un elemento clicable (p. ej. una fila) hace lo suyo, no abre la fila.
  const interactivo = objetivo.closest('a, select, input, textarea, button, label');
  if (interactivo && interactivo !== el && el.contains(interactivo)) return;
  acciones[/** @type {string} */ (el.dataset.action)]?.(el, e);
});
