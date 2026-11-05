// Contactos: crear y editar un contacto. Los campos salen de CAMPOS_CONTACTO (schema.js).
import { CAMPOS_CONTACTO } from '../schema.js';
import { cambiarContacto } from '../store.js';
import { empresaDe, empresaPorNombre, empresasOrdenadas } from '../../companies/store.js';
import { opcionesUsuarios, YO } from '../../../legacy.js';
import { ahora, esc, normalizar, uid } from '../../../shared/lib/text.js';
import { guardar } from '../../../shared/persistence.js';
import { render } from '../../../shared/router.js';
import { inputProp, leerCampo } from '../../../shared/schema.js';
import { db } from '../../../shared/state.js';
import { campo } from '../../../shared/ui/html.js';
import { abrirModal } from '../../../shared/ui/modal.js';

/** @typedef {import('../schema.js').Contacto} Contacto */

/**
 * El control de cada campo: los normales salen del schema; la empresa y el propietario tienen el suyo.
 * @param {import('../../../shared/schema.js').Campo} p
 * @param {Partial<Contacto>} v
 */
function control(p, v) {
  if (p.tipo === 'empresa') {
    return `<input name="empresa" list="lista-empresas" autocomplete="off" value="${esc(empresaDe(v))}" placeholder="${esc(p.placeholder)}">
        <datalist id="lista-empresas">${empresasOrdenadas().map((e) => `<option value="${esc(e.nombre)}">`).join('')}</datalist>`;
  }
  if (p.tipo === 'usuario') return `<select name="${p.id}">${opcionesUsuarios(v.ownerId)}</select>`;
  return inputProp(p, /** @type {Record<string, unknown>} */ (v)[p.id], p.id);
}

// Nuevo contacto (opcionalmente ya en una empresa) o editar uno existente.
/** @param {Contacto | null} [c] @param {string} [companyId] */
export function modalContacto(c, companyId = '') {
  const nuevo = !c;
  /** @type {Partial<Contacto>} */
  const v = c || { estado: 'nuevo', ownerId: YO, companyId };
  const campos = CAMPOS_CONTACTO.map((p) => campo(`${p.label}${p.obligatorio && p.tipo !== 'opciones' ? ' *' : ''}`, control(p, v)));
  // El nombre, solo; el resto, de dos en dos.
  const [nombre, ...resto] = campos;
  const filas = [];
  for (let i = 0; i < resto.length; i += 2) filas.push(`<div class="row2">${resto.slice(i, i + 2).join('')}</div>`);

  abrirModal(nuevo ? 'Nuevo contacto' : 'Editar contacto', nombre + filas.join(''), (d) => {
    if (!d.nombre.trim()) return false;
    // No puede haber dos contactos con el mismo email.
    const email = normalizar(d.email);
    const repetido = email && db.contacts.find((x) => x !== c && normalizar(x.email) === email);
    if (repetido) {
      alert(`Ya existe un contacto con el email ${d.email.trim()}: ${repetido.nombre}.`);
      return false;
    }
    /** @type {Record<string, any>} */
    const datos = {};
    for (const p of CAMPOS_CONTACTO) {
      if (p.tipo === 'empresa') datos.companyId = empresaPorNombre(d.empresa)?.id || null;
      else if (p.tipo === 'usuario') datos[p.id] = d[p.id] || null;
      else datos[p.id] = leerCampo(p, d[p.id]);
    }
    datos.actualizado = ahora();
    if (!datos.nombre) return false;
    if (c) {
      ['horaDesde', 'horaHasta', 'horarioNotas'].forEach((k) => delete /** @type {Record<string, unknown>} */ (c)[k]);
      cambiarContacto(c, () => Object.assign(c, datos));
      guardar();
      render();
    } else {
      const nc = /** @type {Contacto} */ ({ id: uid(), creado: ahora(), ...datos });
      db.contacts.push(nc);
      guardar();
      location.hash = '#/contacto/' + nc.id;
    }
  });
}
