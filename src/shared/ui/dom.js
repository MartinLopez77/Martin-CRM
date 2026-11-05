// Elementos fijos de la página y un atajo para buscar dentro de ellos.

/** Donde se pinta cada vista. */
export const app = /** @type {HTMLElement} */ (document.getElementById('app'));

/**
 * El primer elemento que cumple `sel` (o null). Sin tipo concreto para no tener que convertirlo en cada uso.
 * @param {string} sel
 * @param {ParentNode} [raiz]
 * @returns {any}
 */
export const $ = (sel, raiz = document) => raiz.querySelector(sel);
