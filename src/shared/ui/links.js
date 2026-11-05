// Enlaces a webs escritas sin protocolo ("empresa.com").
import { esc } from '../lib/text.js';

/** @param {string} w */
const urlWeb = (w) => (/^https?:\/\//.test(w) ? w : `https://${w}`);

/** Enlace que se abre en otra pestaña, mostrando la web sin "https://". @param {string} w */
export const enlaceWeb = (w) => `<a href="${esc(urlWeb(w))}" target="_blank" rel="noopener">${esc(w.replace(/^https?:\/\//, ''))}</a>`;
