// Contactos: consultas y cambios sobre db.contacts (vistas guardadas, filtros, orden y notas de cambio).
import { CAMPOS_HISTORIAL, ESTADOS, FILTROS_VACIOS, ORDEN_DEFECTO, VISTAS_BASE } from './schema.js';
import { empresaDe } from '../companies/store.js';
import { accionesDe } from '../activity/store.js';
import { pendientesDe, proximaTarea } from '../tasks/store.js';
import { inscripcionActiva, nombreUsuario } from '../../legacy.js';
import { horaActual, hoy } from '../../shared/lib/dates.js';
import { ahora, uid } from '../../shared/lib/text.js';
import { db, ui } from '../../shared/state.js';

/** @typedef {import('./schema.js').Contacto} Contacto */
/** @typedef {import('./schema.js').FiltrosContactos} FiltrosContactos */
/** @typedef {import('./schema.js').Orden} Orden */

/** @param {string | null | undefined} id */
export const contacto = (id) => db.contacts.find((c) => c.id === id);
/**
 * El contacto `id`, que tiene que existir (si no, es un error del programa).
 * @param {string | null | undefined} id
 */
export function contactoExistente(id) {
  const c = contacto(id);
  if (!c) throw new Error(`No existe el contacto ${id}`);
  return c;
}

export const contactosOrdenados = () => [...db.contacts].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

/** Marca el contacto como actualizado ahora. @param {string | null | undefined} contactId */
export function tocar(contactId) {
  const c = contacto(contactId);
  if (c) c.actualizado = ahora();
}

// Los datos del contacto tal y como se leen (nombres en vez de ids), para comparar antes y después.
/** @param {Contacto} c @returns {Record<string, string>} */
const fotoContacto = (c) => Object.fromEntries(CAMPOS_HISTORIAL.map(([k, , f]) => [k, String((f ? f(c[k]) : c[k]) || '')]));

// Compara con la foto de `antes` y, si algo ha cambiado, deja una nota «Cambio de datos» en el contacto.
/** @param {Contacto} c @param {Record<string, string>} antes */
function notaDeCambios(c, antes) {
  const despues = fotoContacto(c);
  const lineas = CAMPOS_HISTORIAL
    .filter(([k]) => antes[k] !== despues[k])
    .map(([k, label]) => `- **${label}:** ${antes[k] || '(vacío)'} → ${despues[k] || '(vacío)'}`);
  if (!lineas.length) return null;
  const n = {
    id: uid(), contactId: c.id, tipo: 'cambio', titulo: `Cambio de datos · ${horaActual()}`,
    contenido: lineas.join('\n'), fecha: hoy(), fijada: false, creado: ahora(),
  };
  db.notes.push(n);
  return n;
}

// Aplica `cambiar(c)` y registra la nota con lo que haya cambiado.
/** @param {Contacto} c @param {(c: Contacto) => unknown} cambiar */
export function cambiarContacto(c, cambiar) {
  const antes = fotoContacto(c);
  cambiar(c);
  if (notaDeCambios(c, antes)) c.actualizado = ahora();
}

export const todasLasVistas = () => [...VISTAS_BASE, ...db.views];
export const vistaActual = () => todasLasVistas().find((v) => v.id === ui.vistaId) || VISTAS_BASE[0];

/** Pone en la tabla los filtros y el orden de la vista `id`. @param {string} id */
export function cargarVista(id) {
  ui.vistaId = id;
  try { localStorage.setItem('crm-vista', id); } catch { /* sin almacenamiento: no pasa nada */ }
  const v = vistaActual();
  ui.filtros = { ...FILTROS_VACIOS, ...v.filtros };
  ui.orden = { ...ORDEN_DEFECTO, ...v.orden };
  ui.seleccion.clear();
}

// Hay cambios sin guardar en los filtros o el orden de la vista.
export const vistaModificada = () => {
  const v = vistaActual();
  return JSON.stringify([ui.filtros, ui.orden]) !== JSON.stringify([{ ...FILTROS_VACIOS, ...v.filtros }, { ...ORDEN_DEFECTO, ...v.orden }]);
};

/** @param {FiltrosContactos} f */
export function filtrarContactos(f) {
  const q = f.q.trim().toLowerCase();
  const h = hoy();
  return db.contacts.filter((c) => {
    if (f.estado && c.estado !== f.estado) return false;
    if (f.ownerId && (f.ownerId === 'ninguno' ? c.ownerId : c.ownerId !== f.ownerId)) return false;
    if (f.companyId && (f.companyId === 'ninguna' ? c.companyId : c.companyId !== f.companyId)) return false;
    if (f.importacion && (c.importacion || '') !== f.importacion) return false;
    if (f.tarea) {
      const pend = pendientesDe(c.id);
      if (f.tarea === 'sin' && pend.length) return false;
      if (f.tarea === 'vencida' && !pend.some((t) => t.fecha && t.fecha < h)) return false;
      if (f.tarea === 'hoy' && !pend.some((t) => t.fecha && t.fecha <= h)) return false;
    }
    if (f.secuencia) {
      const e = inscripcionActiva(c.id);
      if (f.secuencia === 'alguna' ? !e : f.secuencia === 'ninguna' ? e : e?.sequenceId !== f.secuencia) return false;
    }
    if (q) {
      const campos = [c.nombre, empresaDe(c), c.cargo, c.email, c.telefono, c.ciudad, ...(c.etiquetas || [])];
      if (!campos.some((v) => (v || '').toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

// Valor por el que se ordena cada columna (lo vacío, al final).
/** @param {Contacto} c @param {string} campo @returns {string} */
function claveOrden(c, campo) {
  if (campo === 'nombre') return c.nombre.toLowerCase();
  if (campo === 'empresa') return empresaDe(c).toLowerCase() || '￿';
  if (campo === 'propietario') return c.ownerId ? nombreUsuario(c.ownerId).toLowerCase() : '￿';
  if (campo === 'estado') return String(ESTADOS.findIndex((e) => e.id === c.estado)).padStart(2, '0');
  if (campo === 'proxima') { const t = proximaTarea(c.id); return t ? (t.fecha || '9999') + (t.hora || '') : '￿'; }
  if (campo === 'ultima') return accionesDe(c.id)[0]?.fecha || '';
  return c.actualizado || '';
}

/** Ordena `lista` (en el sitio) por una columna. @param {Contacto[]} lista @param {Orden} orden */
export function ordenarContactos(lista, { campo, dir }) {
  const claves = new Map(lista.map((c) => [c.id, claveOrden(c, campo)]));
  return lista.sort((a, b) => /** @type {string} */ (claves.get(a.id)).localeCompare(/** @type {string} */ (claves.get(b.id)), 'es') * (dir === 'desc' ? -1 : 1));
}

/** Los contactos marcados en la tabla. */
export const seleccionados = () => /** @type {Contacto[]} */ ([...ui.seleccion].map(contacto).filter(Boolean));
