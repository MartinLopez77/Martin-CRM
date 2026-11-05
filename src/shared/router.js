// Rutas por hash: #/contacto/<id>, #/tareas… La función que pinta cada vista la define la app al arrancar.

/** La ruta actual: '#/contacto/abc' → { ruta: 'contacto', id: 'abc' }. */
export function rutaActual() {
  const [, ruta, id] = location.hash.replace(/^#/, '').split('/');
  return { ruta, id };
}

/** @type {() => void} */
let pintar = () => {};

/** Vuelve a pintar la vista actual. */
export const render = () => pintar();

/** @param {() => void} fn la función que pinta la vista de la ruta actual */
export function definirRender(fn) {
  pintar = fn;
}
