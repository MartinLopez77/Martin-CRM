// Empresas: consultas sobre db.companies y sus propiedades visibles.
import { esNurturing, ESTADOS_LEAD, NURTURING_REASONS, PROPS_EMPRESA } from './schema.js';
import { ahora, uid } from '../../shared/lib/text.js';
import { db } from '../../shared/state.js';

/** @typedef {import('./schema.js').Empresa} Empresa */
/** @typedef {import('../../shared/schema.js').Campo} Campo */

/** @param {string | null | undefined} id */
export const empresa = (id) => db.companies.find((e) => e.id === id);
/**
 * La empresa `id`, que tiene que existir (si no, es un error del programa).
 * @param {string | null | undefined} id
 */
export function empresaExistente(id) {
  const e = empresa(id);
  if (!e) throw new Error(`No existe la empresa ${id}`);
  return e;
}

/** Nombre de la empresa de un contacto ('' si no tiene). @param {{ companyId?: string | null } | null | undefined} c */
export const empresaDe = (c) => empresa(c?.companyId)?.nombre || '';
export const empresasOrdenadas = () => [...db.companies].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
/** @param {string | null | undefined} id */
export const contactosDeEmpresa = (id) => db.contacts.filter((c) => c.companyId === id);

// Busca la empresa por nombre (sin distinguir mayúsculas) y, si no existe, la crea.
/** @param {string} nombre @returns {Empresa | null} */
export function empresaPorNombre(nombre) {
  const n = nombre.trim();
  if (!n) return null;
  let e = db.companies.find((x) => x.nombre.toLowerCase() === n.toLowerCase());
  if (!e) {
    e = { id: uid(), nombre: n, web: '', sector: '', ciudad: '', notas: '', creado: ahora() };
    db.companies.push(e);
  }
  return e;
}

/** Todas las propiedades: las fijas y las propias de Ajustes. @returns {Campo[]} */
export const propsEmpresa = () => [
  ...PROPS_EMPRESA,
  ...(db.settings.propsEmpresaExtra || []).map((/** @type {import('./schema.js').PropiedadPropia} */ p) => ({
    ...p, extra: true, opciones: p.tipo === 'opciones' ? (p.opciones || []).map((o) => ({ id: o, label: o })) : undefined,
  })),
];
/** @param {Campo} p */
export const propVisible = (p) => !(db.settings.propsEmpresaOcultas || []).includes(p.id);
export const propsVisibles = () => propsEmpresa().filter(propVisible);
/** Una propiedad por su id (las fijas siempre existen). @param {string} id */
export const propEmpresa = (id) => /** @type {Campo} */ (propsEmpresa().find((p) => p.id === id));
/** @param {string | undefined} id */
export const estadoLeadDe = (id) => ESTADOS_LEAD.find((x) => x.id === id);

// Las propiedades de nurturing de la empresa, si está en nurturing (para la ficha del contacto).
/** @param {Empresa | null | undefined} e */
export const nurturingDe = (e) => (e && esNurturing(e.estadoLead) ? NURTURING_REASONS.find((r) => r.id === e.nurturingReason)?.label || '' : '');
