// Ventana modal con un formulario (Guardar / Cancelar y, si hace falta, Eliminar).
import { esc } from '../lib/text.js';
import { activarEditores, comandoEditor, ajustarScroll } from './editor-md.js';

/** @typedef {Record<string, any>} DatosForm valores del formulario (texto; true/false en las casillas) */

export const modal = /** @type {HTMLDialogElement} */ (document.getElementById('modal'));

/** @type {((raiz: ParentNode) => void)[]} */
const activadores = [];

/**
 * Algo que se activa en cada modal que se abre (p. ej. el editor de tareas). Lo registran las features.
 * @param {(raiz: ParentNode) => void} fn
 */
export function alAbrirModal(fn) {
  activadores.push(fn);
}

/**
 * @param {string} titulo
 * @param {string} camposHTML
 * @param {(datos: DatosForm) => unknown} alGuardar devuelve false para no cerrar el modal
 */
export function abrirModal(titulo, camposHTML, alGuardar) {
  modal.innerHTML = `
    <form class="modal-form">
      <h2>${esc(titulo)}</h2>
      ${camposHTML}
      <div class="modal-actions">
        <button type="button" class="btn danger-ghost modal-borrar" hidden>Eliminar</button>
        <span class="grow"></span>
        <button type="button" class="btn" data-cerrar>Cancelar</button>
        <button class="btn primary">Guardar</button>
      </div>
    </form>`;
  const form = /** @type {HTMLFormElement} */ (modal.querySelector('form'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    /** @type {DatosForm} */
    const datos = Object.fromEntries(new FormData(form));
    form.querySelectorAll('input[type=checkbox]').forEach((cb) => (datos[/** @type {HTMLInputElement} */ (cb).name] = /** @type {HTMLInputElement} */ (cb).checked));
    if (alGuardar(datos) !== false) modal.close();
  });
  /** @type {HTMLElement} */ (modal.querySelector('[data-cerrar]')).addEventListener('click', () => modal.close());
  activarEditores(modal);
  activadores.forEach((fn) => fn(modal));
  modal.showModal();
  /** @type {HTMLElement | null} */ (modal.querySelector('input:not([type=hidden]), textarea, select'))?.focus();
}

/**
 * Muestra el botón "Eliminar" del modal abierto.
 * @param {() => unknown} alBorrar devuelve false para no cerrar el modal
 */
export function botonBorrarModal(alBorrar) {
  const b = /** @type {HTMLButtonElement} */ (modal.querySelector('.modal-borrar'));
  b.hidden = false;
  b.addEventListener('click', () => {
    if (alBorrar() !== false) modal.close();
  });
}

modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});

// Esc con un editor a pantalla completa dentro del modal: sale de pantalla completa en vez de cerrar el modal.
modal.addEventListener('cancel', (e) => {
  const ta = /** @type {HTMLTextAreaElement | null} */ (modal.querySelector('.editor.completa textarea'));
  if (ta) {
    e.preventDefault();
    comandoEditor(ta, 'pantalla');
  }
});
modal.addEventListener('close', ajustarScroll);
