// Clics de la interfaz: cada botón o fila lleva data-action="<nombre>" y aquí se busca su función.
// Cada feature añade las suyas con Object.assign(acciones, { ... }).
import { app } from './ui/dom.js';

/** @type {Record<string, (el: HTMLElement, e: MouseEvent) => unknown>} */
export const acciones = {};

app.addEventListener('click', (e) => {
  const objetivo = /** @type {Element} */ (e.target);
  const el = /** @type {HTMLElement | null} */ (objetivo.closest('[data-action]'));
  if (!el) return;
  // Un enlace, select o botón dentro de un elemento clicable (p. ej. una fila) hace lo suyo, no abre la fila.
  const interactivo = objetivo.closest('a, select, input, textarea, button, label');
  if (interactivo && interactivo !== el && el.contains(interactivo)) return;
  acciones[/** @type {string} */ (el.dataset.action)]?.(el, e);
});
