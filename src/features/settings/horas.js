// Hora secundaria (Ajustes): la hora de España con, entre paréntesis, la de otra zona (p. ej. Malasia).
import { horaLocal } from '../../shared/lib/dates.js';
import { db } from '../../shared/state.js';

// El CRM trabaja en hora de España (la de los clientes). En Ajustes se puede añadir una hora
// secundaria (p. ej. la de Malasia), que se muestra entre paréntesis.
export const ZONAS_SECUNDARIAS = [
  { id: 'Asia/Kuala_Lumpur', label: 'Malasia', sufijo: 'MY' },
  { id: 'Asia/Singapore', label: 'Singapur', sufijo: 'SG' },
  { id: 'Asia/Dubai', label: 'Dubái', sufijo: 'AE' },
  { id: 'Europe/London', label: 'Reino Unido', sufijo: 'UK' },
  { id: 'America/New_York', label: 'Nueva York', sufijo: 'NY' },
  { id: 'America/Mexico_City', label: 'México', sufijo: 'MX' },
  { id: 'America/Bogota', label: 'Colombia', sufijo: 'CO' },
  { id: 'America/Argentina/Buenos_Aires', label: 'Argentina', sufijo: 'AR' },
];
export const zonaSecundaria = () => (db.settings?.horaSecundaria ? ZONAS_SECUNDARIAS.find((z) => z.id === db.settings.zonaSecundaria) : null);

// Hora secundaria entre paréntesis (nada si está desactivada en Ajustes).
/** @param {string} texto */
export const enLocal = (texto) => {
  const z = zonaSecundaria();
  return z ? `<span class="local" title="Hora de ${z.label}">(${texto} ${z.sufijo})</span>` : '';
};
/** "18:00 (01:00 +1 MY)". @param {string | null | undefined} hhmm @param {string | null | undefined} [fecha] */
export const conLocal = (hhmm, fecha) => {
  const z = zonaSecundaria();
  return hhmm ? `${hhmm} ${z ? enLocal(horaLocal(hhmm, fecha || undefined, true, z.id)) : ''}`.trim() : '';
};
