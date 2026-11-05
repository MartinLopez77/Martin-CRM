// Campos descritos por un schema. Cada entidad describe sus campos UNA vez (id, etiqueta, tipo, opciones…)
// y de ahí salen su valor, cómo se muestran, su control de formulario y cómo se lee lo escrito.
import { fmtFecha } from './lib/dates.js';
import { esc } from './lib/text.js';
import { opciones } from './ui/html.js';
import { enlaceWeb } from './ui/links.js';

/** @typedef {import('./ui/html.js').Opcion} Opcion */
/** @typedef {'texto' | 'textoLargo' | 'numero' | 'fecha' | 'url' | 'tel' | 'email' | 'opciones' | 'lista'} TipoCampo */

/**
 * @typedef {Object} Campo
 * @property {string} id nombre de la propiedad en la entidad
 * @property {string} label
 * @property {TipoCampo | string} tipo
 * @property {Opcion[]} [opciones] para tipo 'opciones'
 * @property {string} [placeholder]
 * @property {boolean} [obligatorio] no puede quedar vacío (y en los desplegables no hay opción «—»)
 * @property {boolean} [extra] el valor va en entidad.extra (propiedades propias creadas en Ajustes)
 * @property {boolean} [nurturing] empresas: solo se ve si la empresa está en nurturing
 * @property {boolean} [soloLectura] lo pone el CRM (no se edita en el formulario)
 */

/**
 * Describe los campos de una entidad (solo comprueba que no haya ids repetidos).
 * @template {Campo} T
 * @param {T[]} campos
 * @returns {T[]}
 */
export function defineCampos(campos) {
  const ids = campos.map((c) => c.id);
  const repetido = ids.find((id, i) => ids.indexOf(id) !== i);
  if (repetido) throw new Error(`Campo repetido: ${repetido}`);
  return campos;
}

/**
 * El valor de un campo en una entidad ('' si no tiene).
 * @param {Record<string, any>} e
 * @param {Campo} p
 * @returns {any}
 */
export const valorProp = (e, p) => (p.extra ? e.extra?.[p.id] : e[p.id]) ?? '';

/**
 * El valor de un campo listo para mostrar (HTML; vacío si no tiene).
 * @param {Record<string, any>} e
 * @param {Campo} p
 */
export function textoProp(e, p) {
  const v = valorProp(e, p);
  if (v === '' || v === null) return '';
  if (p.tipo === 'opciones') return esc(p.opciones?.find((o) => o.id === v)?.label || v);
  if (p.tipo === 'url') return enlaceWeb(String(v));
  if (p.tipo === 'fecha') return fmtFecha(v);
  if (p.tipo === 'tel') return `<a href="tel:${esc(v)}">${esc(v)}</a>`;
  if (p.tipo === 'textoLargo') return esc(v).replace(/\n/g, '<br>');
  if (p.tipo === 'lista') return esc(/** @type {string[]} */ (v).join(', '));
  return esc(v);
}

/**
 * El control de formulario de un campo.
 * @param {Campo} p
 * @param {any} valor
 * @param {string} [nombre] name del control (por defecto `p-<id>`)
 */
export function inputProp(p, valor, nombre = `p-${p.id}`) {
  const v = esc(p.tipo === 'lista' ? (valor || []).join(', ') : valor ?? '');
  const req = p.obligatorio ? ' required' : '';
  if (p.tipo === 'opciones') return `<select name="${nombre}"${req}>${p.obligatorio ? '' : '<option value="">—</option>'}${opciones(p.opciones || [], valor)}</select>`;
  if (p.tipo === 'textoLargo') return `<textarea name="${nombre}" rows="2">${v}</textarea>`;
  const tipo = /** @type {Record<string, string>} */ ({ fecha: 'date', numero: 'number', tel: 'tel', email: 'email' })[p.tipo] || 'text';
  return `<input type="${tipo}" name="${nombre}" value="${v}" placeholder="${esc(p.placeholder || '')}"${req}>`;
}

/**
 * Lo escrito en el control de un campo, ya limpio: texto sin espacios de más, listas separadas por comas.
 * @param {Campo} p
 * @param {unknown} crudo valor del formulario
 */
export function leerCampo(p, crudo) {
  const texto = String(crudo ?? '').trim();
  if (p.tipo === 'lista') return [...new Set(texto.split(',').map((s) => s.trim()).filter(Boolean))];
  return texto;
}
