// Equipo: las personas a las que se asignan contactos (propietarios).
import { esc, iniciales } from '../../shared/lib/text.js';
import { db } from '../../shared/state.js';

/** Una persona del equipo. @typedef {{ id: string, nombre: string, email: string, creado: string }} Usuario */

// Usuario que usa el CRM. Cuando entre el resto del equipo, cada uno tendrá el suyo.
export const YO = 'u-martin';
/** @param {string | null | undefined} id */
export const usuario = (id) => db.users.find((u) => u.id === id);
/** @param {string | null | undefined} id */
export const nombreUsuario = (id) => (id === YO ? `${usuario(YO)?.nombre || 'Yo'} (yo)` : usuario(id)?.nombre || 'Sin propietario');

/** @param {string | null | undefined} id */
export const avatarUsuario = (id) =>
  id ? `<span class="avatar xs" title="${esc(nombreUsuario(id))}">${esc(iniciales(usuario(id)?.nombre))}</span>` : '';
/** Las <option> del equipo para elegir propietario. @param {string | null | undefined} sel @param {string} [vacio] texto de la opción sin propietario */
export const opcionesUsuarios = (sel, vacio = 'Sin propietario') =>
  `<option value="">${vacio}</option>${db.users.map((u) => `<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${esc(nombreUsuario(u.id))}</option>`).join('')}`;
