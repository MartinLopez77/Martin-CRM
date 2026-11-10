// Empresas: sus propiedades (fijas y las que se añaden en Ajustes), estado lead y nurturing como en HubSpot.
// Para añadir una propiedad fija: el typedef Empresa y PROPS_EMPRESA (sale sola en la ficha, el formulario y Ajustes).
import { defineCampos } from '../../shared/schema.js';

/**
 * @typedef {Object} Empresa
 * @property {string} id
 * @property {string} nombre único (sin distinguir mayúsculas)
 * @property {string} [notas] markdown
 * @property {string} [estadoLead] id de ESTADOS_LEAD
 * @property {string} [nurturingReason] id de NURTURING_REASONS
 * @property {string} [nurturingFecha]
 * @property {string} [nurturingComentarios]
 * @property {string} [web]
 * @property {string} [sector]
 * @property {string} [ciudad]
 * @property {string} [pais]
 * @property {string} [direccion]
 * @property {string} [telefono]
 * @property {string} [empleados]
 * @property {string} [facturacion]
 * @property {string} [linkedin]
 * @property {string} [importacion] nombre de la importación CSV en la que se creó
 * @property {Record<string, string>} [extra] valores de las propiedades propias (id → valor)
 * @property {string} [creado]
 */

/** Propiedad propia creada en Ajustes (db.settings.propsEmpresaExtra). @typedef {{ id: string, label: string, tipo: string, opciones?: string[] }} PropiedadPropia */

// Estado lead de las empresas: las mismas opciones que la propiedad Lead Status (hs_lead_status) de HubSpot.
export const ESTADOS_LEAD = [
  { id: 'new', label: '🏁 New' },
  { id: 'prospecting', label: '⏩ Prospecting' },
  { id: 'conversation', label: '💬 Conversation' },
  { id: 'meeting', label: '📆 Meeting' },
  { id: 'open_deal', label: '✅ Open deal' },
  { id: 'client', label: '🤝 Client' },
  { id: 'nurturing_sdr', label: '♻ Nurturing SDR' },
  { id: 'nurturing_ae', label: '♻️ Nurturing AE' },
  { id: 'lost', label: '😢 Lost' },
];
/** @param {string | undefined} estadoLead */
export const esNurturing = (estadoLead) => estadoLead === 'nurturing_sdr' || estadoLead === 'nurturing_ae';

// Como «Nurturing reason SDR» de HubSpot.
export const NURTURING_REASONS = [
  { id: 'sequence_finished', label: 'Sequence finished' },
  { id: 'unreachable', label: 'Unreachable' },
  { id: 'could_not_pass_gatekeeper', label: 'Could not pass the gatekeeper' },
  { id: 'contact_in_future', label: 'Contact in the future (schedule task)' },
  { id: 'could_not_get_pain', label: 'Could not get to the Pain' },
  { id: 'no_pain', label: 'Has no pain' },
  { id: 'satisfied_with_competitor', label: 'Satisfied with a competitor' },
  { id: 'not_target', label: 'Not target' },
  { id: 'double_no_show', label: 'Double no show' },
  { id: 'company_not_exist', label: 'Company does not exist' },
  { id: 'They are Anti AI', label: 'They are Anti AI' },
  { id: 'DIY', label: 'DIY' },
  { id: 'other', label: 'Other' },
];

// Propiedades de las empresas. En Ajustes se puede ocultar cualquiera y añadir otras propias
// (db.settings.propsEmpresaExtra). Las de nurturing solo se ven si el estado lead es de nurturing.
export const PROPS_EMPRESA = defineCampos([
  { id: 'estadoLead', label: 'Estado lead', tipo: 'opciones', opciones: ESTADOS_LEAD },
  { id: 'nurturingReason', label: 'Nurturing reason', tipo: 'opciones', opciones: NURTURING_REASONS, nurturing: true },
  { id: 'nurturingFecha', label: 'Nurturing date', tipo: 'fecha', nurturing: true },
  { id: 'nurturingComentarios', label: 'Nurturing comments', tipo: 'textoLargo', nurturing: true },
  { id: 'web', label: 'Web', tipo: 'url', placeholder: 'empresa.com' },
  { id: 'sector', label: 'Sector', tipo: 'texto', placeholder: 'Clínicas, reformas…' },
  { id: 'ciudad', label: 'Ciudad', tipo: 'texto' },
  { id: 'pais', label: 'País', tipo: 'texto' },
  { id: 'direccion', label: 'Dirección', tipo: 'texto' },
  { id: 'telefono', label: 'Teléfono', tipo: 'tel' },
  { id: 'empleados', label: 'Nº de empleados', tipo: 'numero' },
  { id: 'facturacion', label: 'Facturación anual', tipo: 'texto', placeholder: 'Ej. 1-5 M€' },
  { id: 'linkedin', label: 'LinkedIn', tipo: 'url' },
  { id: 'importacion', label: 'Importación', tipo: 'texto', soloLectura: true },
]);
// Nombre y notas: no son propiedades (no se ocultan en Ajustes), pero también se editan desde la ficha.
export const CAMPOS_FIJOS_EMPRESA = defineCampos([
  { id: 'nombre', label: 'Nombre', tipo: 'texto', obligatorio: true },
  { id: 'notas', label: 'Notas', tipo: 'textoLargo' },
]);

export const TIPOS_PROP = [
  { id: 'texto', label: 'Texto' },
  { id: 'textoLargo', label: 'Texto largo' },
  { id: 'numero', label: 'Número' },
  { id: 'fecha', label: 'Fecha' },
  { id: 'url', label: 'Enlace' },
  { id: 'opciones', label: 'Desplegable (opciones)' },
];

// Columnas de la tabla de empresas: solo las propiedades que están activadas en Ajustes.
export const COLUMNAS_EMPRESA = ['estadoLead', 'sector', 'ciudad', 'web'];
