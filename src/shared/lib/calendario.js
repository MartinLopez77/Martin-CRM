// Enlaces para añadir un evento a Google Calendar (pura, sin red ni cuentas).
import { sumarDias } from './dates.js';

const DURACION_MIN = 60;

/** @param {string} iso AAAA-MM-DD */
const sinGuiones = (iso) => iso.replace(/-/g, '');

/**
 * Enlace que abre Google Calendar con el evento ya rellenado (solo falta pulsar «Guardar»).
 * Con hora: evento de 1 h en hora de España; sin hora: de todo el día.
 * @param {{ titulo: string, detalle?: string, fecha: string, hora?: string | null }} evento
 */
export function urlGoogleCalendar({ titulo, detalle = '', fecha, hora }) {
  let fechas;
  if (hora) {
    const [h, m] = hora.split(':').map(Number);
    const fin = h * 60 + m + DURACION_MIN;
    const finDia = fin >= 24 * 60 ? sumarDias(fecha, 1) : fecha;
    const finHora = String(Math.floor((fin % (24 * 60)) / 60)).padStart(2, '0') + String(fin % 60).padStart(2, '0');
    fechas = `${sinGuiones(fecha)}T${hora.replace(':', '')}00/${sinGuiones(finDia)}T${finHora}00`;
  } else {
    fechas = `${sinGuiones(fecha)}/${sinGuiones(sumarDias(fecha, 1))}`;
  }
  const p = new URLSearchParams({ action: 'TEMPLATE', text: titulo, details: detalle, dates: fechas, ctz: 'Europe/Madrid' });
  return `https://calendar.google.com/calendar/render?${p}`;
}
