// Utilidades de texto. Puras: se pueden usar en el navegador y en los tests de Node.

/**
 * Escapa un valor para meterlo en HTML.
 * @param {unknown} s
 */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => /** @type {Record<string, string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Identificador único corto. */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Fecha y hora actuales en ISO (UTC). */
export const ahora = () => new Date().toISOString();

/** @param {number | string} n */
export const pad = (n) => String(n).padStart(2, '0');

/** La 's' del plural: `${n} contacto${plural(n)}`. @param {number} n */
export const plural = (n) => (n === 1 ? '' : 's');

/** @param {string} s */
export const mayuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Para comparar sin tildes ni mayúsculas.
 * @param {unknown} s
 */
export const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/**
 * "Ana Ruiz" → "AR".
 * @param {string | null | undefined} nombre
 */
export const iniciales = (nombre) =>
  (nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
