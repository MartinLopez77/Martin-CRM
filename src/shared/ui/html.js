// Trozos de HTML de los formularios.
import { esc } from '../lib/text.js';
import { ATAJOS_FECHA, fechaAtajo } from '../lib/dates.js';

/** @typedef {{ id: string, label: string }} Opcion */

/**
 * Un campo con su etiqueta.
 * @param {string} label HTML de la etiqueta
 * @param {string} input HTML del control
 * @param {string} [clase]
 */
export const campo = (label, input, clase = '') => `<label class="field ${clase}"><span>${label}</span>${input}</label>`;

/**
 * Las <option> de una lista, con `sel` elegida.
 * @param {Opcion[]} lista
 * @param {unknown} sel
 */
export const opciones = (lista, sel) =>
  lista.map((o) => `<option value="${o.id}" ${o.id === sel ? 'selected' : ''}>${esc(o.label)}</option>`).join('');

/**
 * Una <option> suelta (para desplegables que mezclan opciones fijas y de datos).
 * @param {string} valor
 * @param {string} label
 * @param {string} actual el valor elegido
 */
export const opcion = (valor, label, actual) => `<option value="${esc(valor)}" ${valor === actual ? 'selected' : ''}>${esc(label)}</option>`;

/**
 * Una fila «etiqueta: valor» de una lista <dl> de datos (nada si no hay valor).
 * @param {string} label
 * @param {string} valor HTML
 */
export const dato = (label, valor) => (valor ? `<dt>${esc(label)}</dt><dd>${valor}</dd>` : '');

/**
 * Campo de fecha con desplegable de atajos (mañana, en 3 días, la semana que viene…).
 * @param {string} nombre
 * @param {string | null | undefined} valor
 * @param {string} [extra] atributos extra del input
 */
export const campoFecha = (nombre, valor, extra = '') => `
  <span class="fecha-campo">
    <input type="date" name="${nombre}" value="${esc(valor || '')}" ${extra}>
    <select class="fecha-atajos" data-fecha-atajo title="Atajos de fecha" aria-label="Atajos de fecha">
      <option value="">▾</option>
      ${ATAJOS_FECHA.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}
    </select>
  </span>`;

document.addEventListener('change', (e) => {
  const sel = /** @type {HTMLSelectElement} */ (e.target);
  if (!sel.matches('[data-fecha-atajo]')) return;
  const input = /** @type {HTMLInputElement} */ (/** @type {HTMLElement} */ (sel.parentElement).querySelector('input[type=date]'));
  if (sel.value) {
    input.value = fechaAtajo(sel.value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  sel.value = '';
});
