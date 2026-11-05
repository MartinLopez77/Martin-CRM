// Contactos: qué es un contacto (sus campos, estados, campos con historial, vistas y columnas de la tabla).
// Para añadir un campo: el typedef Contacto, CAMPOS_CONTACTO (formulario) y, si sus cambios deben
// quedar en una nota, CAMPOS_HISTORIAL.
import { defineCampos } from '../../shared/schema.js';
import { empresa } from '../companies/store.js';
import { nombreUsuario, YO } from '../../legacy.js';

/**
 * @typedef {Object} Contacto
 * @property {string} id
 * @property {string} nombre
 * @property {string} [cargo]
 * @property {string} [email] único entre todos los contactos (si tiene)
 * @property {string} [telefono]
 * @property {string} [web]
 * @property {string} [ciudad]
 * @property {string} estado id de ESTADOS
 * @property {string} [origen]
 * @property {string[]} [etiquetas]
 * @property {string | null} [companyId]
 * @property {string | null} [ownerId] usuario propietario
 * @property {string} [importacion] nombre de la importación CSV en la que entró
 * @property {string} [hubspotId]
 * @property {string} [hubspotEstado]
 * @property {string} [creado]
 * @property {string} [actualizado]
 */

/** @typedef {{ q: string, estado: string, ownerId: string, companyId: string, tarea: string, secuencia: string, importacion: string }} FiltrosContactos */
/** @typedef {{ campo: string, dir: 'asc' | 'desc' }} Orden */
/** @typedef {{ id: string, nombre: string, filtros: Partial<FiltrosContactos>, orden: Partial<Orden>, fija?: boolean }} VistaContactos */

// El estado se muestra discreto: texto normal con un punto pequeño de este color.
export const ESTADOS = [
  { id: 'nuevo', label: 'Nuevo', color: '#cbd5e1' },
  { id: 'contactado', label: 'Contactado', color: '#93c5fd' },
  { id: 'reunion', label: 'Reunión agendada', color: '#60a5fa' },
  { id: 'propuesta', label: 'Propuesta enviada', color: '#3b82f6' },
  { id: 'negociacion', label: 'Negociación', color: '#1d4ed8' },
  { id: 'cliente', label: 'Cliente', color: '#22c55e' },
  { id: 'perdido', label: 'Perdido', color: '#94a3b8' },
];

/** @param {string | undefined} id */
export const estadoDe = (id) => ESTADOS.find((e) => e.id === id) || ESTADOS[0];

// Campos del formulario de contacto, en su orden. `empresa` y `ownerId` tienen control propio (ver views/modal.js).
export const CAMPOS_CONTACTO = defineCampos([
  { id: 'nombre', label: 'Nombre', tipo: 'texto', obligatorio: true },
  { id: 'empresa', label: 'Empresa', tipo: 'empresa', placeholder: 'Elige una o escribe una nueva' },
  { id: 'cargo', label: 'Cargo', tipo: 'texto' },
  { id: 'telefono', label: 'Teléfono', tipo: 'tel' },
  { id: 'email', label: 'Email', tipo: 'email' },
  { id: 'web', label: 'Web', tipo: 'url', placeholder: 'empresa.com' },
  { id: 'ciudad', label: 'Ciudad', tipo: 'texto' },
  { id: 'estado', label: 'Estado', tipo: 'opciones', opciones: ESTADOS, obligatorio: true },
  { id: 'origen', label: 'Origen', tipo: 'texto', placeholder: 'LinkedIn, referido, web…' },
  { id: 'ownerId', label: 'Propietario', tipo: 'usuario' },
  { id: 'etiquetas', label: 'Etiquetas', tipo: 'lista', placeholder: 'Separadas por comas' },
]);

const HUBSPOT_PORTAL = '148719910';
/** @type {Record<string, string>} */
export const HUBSPOT_ESTADOS = {
  new: 'New', prospecting: 'Prospecting', conversation: 'Conversation', meeting: 'Meeting',
  open_deal: 'Open deal', client: 'Client', nurturing_sdr: 'Nurturing SDR', nurturing_ae: 'Nurturing AE', lost: 'Lost',
};
/** @param {string} id */
export const urlHubspot = (id) => `https://app.hubspot.com/contacts/${HUBSPOT_PORTAL}/record/0-1/${id}`;

// Vistas de la tabla de contactos (como en HubSpot). Las propias se guardan en db.views.
/** @type {FiltrosContactos} */
export const FILTROS_VACIOS = { q: '', estado: '', ownerId: '', companyId: '', tarea: '', secuencia: '', importacion: '' };
/** @type {Orden} */
export const ORDEN_DEFECTO = { campo: 'actualizado', dir: 'desc' };
/** @type {VistaContactos[]} */
export const VISTAS_BASE = [
  { id: 'todos', nombre: 'Todos los contactos', filtros: { ...FILTROS_VACIOS }, orden: ORDEN_DEFECTO, fija: true },
  { id: 'mios', nombre: 'Mis contactos', filtros: { ...FILTROS_VACIOS, ownerId: YO }, orden: ORDEN_DEFECTO, fija: true },
];

/**
 * Campos cuyos cambios quedan explicados en una nota «Cambio de datos»: [propiedad, etiqueta, cómo se lee].
 * @type {[keyof Contacto, string, ((v: any) => string | undefined)?][]}
 */
export const CAMPOS_HISTORIAL = [
  ['nombre', 'Nombre'],
  ['companyId', 'Empresa', (v) => empresa(v)?.nombre],
  ['cargo', 'Cargo'],
  ['email', 'Email'],
  ['telefono', 'Teléfono'],
  ['web', 'Web'],
  ['ciudad', 'Ciudad'],
  ['estado', 'Estado', (v) => estadoDe(v).label],
  ['origen', 'Origen'],
  ['ownerId', 'Propietario', (v) => (v ? nombreUsuario(v) : '')],
  ['etiquetas', 'Etiquetas', (v) => (v || []).join(', ')],
];

/** @type {{ campo: string, label: string, clase?: string }[]} */
export const COLUMNAS = [
  { campo: 'nombre', label: 'Contacto' },
  { campo: 'empresa', label: 'Empresa' },
  { campo: 'propietario', label: 'Propietario' },
  { campo: 'estado', label: 'Estado' },
  { campo: 'proxima', label: 'Próxima tarea' },
  { campo: 'ultima', label: 'Última acción', clase: 'col-nota' },
];
