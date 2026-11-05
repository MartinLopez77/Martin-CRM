// Importar contactos de un CSV: columnas reconocidas y qué filas entran (solo emails válidos y únicos).
import { normalizar } from '../../shared/lib/text.js';
import { db } from '../../shared/state.js';

export const nombresImportaciones = () =>
  [...new Set([...db.imports.map((i) => i.nombre), ...db.contacts.map((c) => c.importacion).filter(Boolean)])];

// Campos a los que se puede llevar cada columna del CSV; `alias` sirve para adivinarlo por la cabecera.
export const CAMPOS_IMPORTAR = [
  { id: 'nombre', label: 'Nombre completo', alias: ['nombre completo', 'name', 'full name', 'contacto', 'nombre y apellidos'] },
  { id: 'pila', label: 'Nombre', alias: ['nombre', 'first name', 'firstname', 'first_name'] },
  { id: 'apellidos', label: 'Apellidos', alias: ['apellidos', 'apellido', 'last name', 'lastname', 'last_name', 'surname'] },
  { id: 'email', label: 'Email', alias: ['email', 'e-mail', 'correo', 'correo electronico', 'mail', 'email address'] },
  { id: 'telefono', label: 'Teléfono', alias: ['telefono', 'phone', 'phone number', 'movil', 'mobile', 'mobile phone number', 'tel'] },
  { id: 'empresa', label: 'Empresa', alias: ['empresa', 'company', 'company name', 'compania', 'organizacion', 'nombre de la empresa'] },
  { id: 'cargo', label: 'Cargo', alias: ['cargo', 'job title', 'puesto', 'title', 'position'] },
  { id: 'ciudad', label: 'Ciudad', alias: ['ciudad', 'city', 'localidad', 'poblacion'] },
  { id: 'web', label: 'Web', alias: ['web', 'website', 'website url', 'url', 'dominio', 'domain', 'pagina web', 'company domain name'] },
  { id: 'origen', label: 'Origen', alias: ['origen', 'source', 'fuente', 'lead source'] },
  { id: 'etiquetas', label: 'Etiquetas', alias: ['etiquetas', 'tags'] },
  { id: 'estadoLead', label: 'Estado lead (empresa)', alias: ['estado lead', 'lead status', 'estado del lead'] },
];

/**
 * Una fila del CSV con sus valores ya repartidos por campo (id de CAMPOS_IMPORTAR → texto). El email, normalizado.
 * @typedef {Partial<Record<string, string>> & { email: string }} FilaImportada
 */

/** El campo que parece ser una columna, por su cabecera ('' si ninguno). @param {string} cabecera */
export const adivinarCampo = (cabecera) => CAMPOS_IMPORTAR.find((f) => f.alias.includes(normalizar(cabecera)))?.id || '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Separa las filas en contactos nuevos y descartadas: solo entra un contacto si su email es válido y único
// (que no exista ya en el CRM ni esté repetido dentro del propio archivo).
/**
 * @param {string[][]} filas sin la de cabeceras
 * @param {string[]} mapa campo al que va cada columna ('' = no importar)
 */
export function analizarImportacion(filas, mapa) {
  const existentes = new Set(db.contacts.map((c) => normalizar(c.email)).filter(Boolean));
  const vistos = new Set();
  /** @type {{ nuevos: FilaImportada[], duplicados: number, repetidos: number, sinEmail: number }} */
  const r = { nuevos: [], duplicados: 0, repetidos: 0, sinEmail: 0 };
  filas.forEach((fila) => {
    /** @type {Record<string, string>} */
    const o = {};
    mapa.forEach((campoId, i) => { if (campoId && fila[i]?.trim()) o[campoId] = fila[i].trim(); });
    const email = normalizar(o.email);
    if (!EMAIL_RE.test(email)) r.sinEmail++;
    else if (existentes.has(email)) r.duplicados++;
    else if (vistos.has(email)) r.repetidos++;
    else {
      vistos.add(email);
      r.nuevos.push({ ...o, email });
    }
  });
  return r;
}
