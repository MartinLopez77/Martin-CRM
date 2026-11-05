// Aviso abajo a la izquierda (con «Deshacer» si se le pasa qué hacer). Se oculta solo a los 6 segundos.
import { esc } from '../lib/text.js';

const aviso = /** @type {HTMLElement} */ (document.getElementById('aviso'));
/** @type {ReturnType<typeof setTimeout> | undefined} */
let temporizadorAviso;

/**
 * @param {string} texto
 * @param {() => void} [deshacer]
 */
export function avisar(texto, deshacer) {
  aviso.innerHTML = `<span>${esc(texto)}</span>${deshacer ? '<button type="button">Deshacer</button>' : ''}`;
  aviso.hidden = false;
  aviso.querySelector('button')?.addEventListener('click', () => {
    aviso.hidden = true;
    deshacer?.();
  });
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => (aviso.hidden = true), 6000);
}
