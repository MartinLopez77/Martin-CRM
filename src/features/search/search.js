// Buscador de la barra superior (como el de HubSpot): contactos y empresas desde cualquier vista.
import { contactosDeEmpresa, empresaDe, estadoLeadDe } from '../companies/store.js';
import { esc, iniciales, normalizar } from '../../shared/lib/text.js';
import { db } from '../../shared/state.js';
import { ico } from '../../shared/ui/icons.js';

export const buscador = /** @type {HTMLInputElement} */ (document.getElementById('buscar-global'));
const resultadosBusqueda = /** @type {HTMLElement} */ (document.getElementById('buscar-resultados'));
let busquedaSel = 0;

/** @typedef {{ href: string, icono: string, titulo: string, sub: string, tipo: string, cuadrado?: boolean }} Resultado */

/** @param {string} texto @returns {Resultado[]} */
function resultadosGlobales(texto) {
  const q = normalizar(texto);
  if (!q) return [];
  const digitos = texto.replace(/\D/g, '');
  /** @param {string | undefined} v */
  const contiene = (v) => normalizar(v).includes(q);
  // Primero los que empiezan por lo buscado, luego el resto.
  /** @param {string} nombre */
  const peso = (nombre) => (normalizar(nombre).startsWith(q) ? 0 : 1);
  const contactos = db.contacts
    .filter((c) => [c.nombre, c.email, empresaDe(c), c.cargo, c.ciudad].some(contiene)
      || (digitos.length >= 3 && (c.telefono || '').replace(/\D/g, '').includes(digitos)))
    .sort((a, b) => peso(a.nombre) - peso(b.nombre) || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 8)
    .map((c) => ({
      href: '#/contacto/' + c.id, icono: esc(iniciales(c.nombre)), titulo: c.nombre,
      sub: [empresaDe(c), c.email || c.telefono].filter(Boolean).join(' · '), tipo: 'Contacto',
    }));
  const empresas = db.companies
    .filter((e) => [e.nombre, e.web].some(contiene))
    .sort((a, b) => peso(a.nombre) - peso(b.nombre) || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 4)
    .map((e) => ({
      href: '#/empresa/' + e.id, icono: ico('empresa'), cuadrado: true, titulo: e.nombre,
      sub: [estadoLeadDe(e.estadoLead)?.label, `${contactosDeEmpresa(e.id).length} contactos`].filter(Boolean).join(' · '), tipo: 'Empresa',
    }));
  return [...contactos, ...empresas];
}

function pintarBusqueda() {
  const lista = resultadosGlobales(buscador.value);
  busquedaSel = Math.min(busquedaSel, Math.max(0, lista.length - 1));
  resultadosBusqueda.hidden = !buscador.value.trim();
  resultadosBusqueda.innerHTML = lista.map((r, i) => `
    <a href="${r.href}" class="br-item ${i === busquedaSel ? 'activo' : ''}" data-i="${i}">
      <span class="avatar sm ${r.cuadrado ? 'cuadrado' : ''}">${r.icono}</span>
      <span class="grow"><strong>${esc(r.titulo)}</strong><span class="muted small">${esc(r.sub)}</span></span>
      <span class="br-tipo">${r.tipo}</span>
    </a>`).join('') || `<p class="br-vacio muted small">Ningún contacto ni empresa coincide con «${esc(buscador.value.trim())}».</p>`;
}

function cerrarBusqueda(limpiar = false) {
  resultadosBusqueda.hidden = true;
  if (limpiar) buscador.value = '';
}

buscador.addEventListener('input', () => { busquedaSel = 0; pintarBusqueda(); });
buscador.addEventListener('focus', () => { if (buscador.value.trim()) pintarBusqueda(); });
buscador.addEventListener('keydown', (e) => {
  const items = resultadosBusqueda.querySelectorAll('.br-item');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!items.length) return;
    busquedaSel = (busquedaSel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle('activo', i === busquedaSel));
    items[busquedaSel].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const el = items[busquedaSel];
    if (!el) return;
    location.hash = /** @type {string} */ (el.getAttribute('href'));
    cerrarBusqueda(true);
    buscador.blur();
  } else if (e.key === 'Escape') {
    cerrarBusqueda(true);
    buscador.blur();
  }
});
resultadosBusqueda.addEventListener('click', (e) => { if (/** @type {Element} */ (e.target).closest('.br-item')) cerrarBusqueda(true); });
document.addEventListener('pointerdown', (e) => { if (!/** @type {Element} */ (e.target).closest('#buscador')) cerrarBusqueda(); });
