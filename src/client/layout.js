// La estructura de la app: menú lateral, reloj, contadores y atajos de teclado globales.
import { colaActiva, completarActualEnCola, enModoCola, irEnCola } from '../features/queue/store.js';
import { buscador } from '../features/search/search.js';
import { enLocal, zonaSecundaria } from '../features/settings/horas.js';
import { modalRapido } from '../features/tasks/editor.js';
import { horaActual, hoy } from '../shared/lib/dates.js';
import { guardar } from '../shared/persistence.js';
import { db } from '../shared/state.js';
import { ico } from '../shared/ui/icons.js';
import { modal } from '../shared/ui/modal.js';
import { plural } from '../shared/lib/text.js';

const menu = /** @type {HTMLElement} */ (document.getElementById('menu'));
const menuBtn = /** @type {HTMLElement} */ (document.getElementById('menu-btn'));

/** @param {boolean} abrir */
function abrirMenu(abrir) {
  document.body.classList.toggle('menu-abierto', abrir);
  menu.setAttribute('aria-hidden', String(!abrir));
  menuBtn.setAttribute('aria-expanded', String(abrir));
  if (abrir) /** @type {HTMLElement | null} */ (menu.querySelector('a.active, a'))?.focus();
}

menuBtn.addEventListener('click', () => abrirMenu(!document.body.classList.contains('menu-abierto')));
/** @type {HTMLElement} */ (document.getElementById('menu-cerrar')).addEventListener('click', () => abrirMenu(false));
/** @type {HTMLElement} */ (document.getElementById('menu-fondo')).addEventListener('click', () => abrirMenu(false));
menu.addEventListener('click', (e) => { if (/** @type {Element} */ (e.target).closest('a')) abrirMenu(false); });

// Las secciones del menú se reordenan arrastrándolas, cada una dentro de su grupo (arriba o abajo del todo).
/** @type {HTMLElement | null} */
let arrastrada = null;

/** Pone las secciones del menú en el orden guardado en los ajustes (las que no estén, al final de su grupo). */
export function ordenarMenu() {
  const orden = db.settings.ordenMenu || [];
  const pos = (/** @type {Element} */ a) => { const i = orden.indexOf(/** @type {string} */ (/** @type {HTMLElement} */ (a).dataset.ruta)); return i < 0 ? Infinity : i; };
  menu.querySelectorAll('.menu-grupo').forEach((g) => [...g.children].sort((a, b) => pos(a) - pos(b)).forEach((a) => g.append(a)));
}

menu.querySelectorAll('.menu-grupo a').forEach((a) => /** @type {HTMLElement} */ (a).setAttribute('draggable', 'true'));
menu.addEventListener('dragstart', (e) => {
  arrastrada = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest?.('.menu-grupo a'));
  if (!arrastrada || !e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', arrastrada.dataset.ruta || '');
  arrastrada.classList.add('arrastrando');
});
menu.addEventListener('dragover', (e) => {
  const sobre = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest?.('.menu-grupo a'));
  if (!arrastrada || !sobre || sobre.parentElement !== arrastrada.parentElement) return;
  e.preventDefault(); // permite soltar aquí
  if (sobre === arrastrada) return;
  const r = sobre.getBoundingClientRect();
  if (e.clientY < r.top + r.height / 2) sobre.before(arrastrada);
  else sobre.after(arrastrada);
});
menu.addEventListener('drop', (e) => { if (arrastrada) e.preventDefault(); });
menu.addEventListener('dragend', () => {
  if (!arrastrada) return;
  arrastrada.classList.remove('arrastrando');
  arrastrada = null;
  const orden = [...menu.querySelectorAll('.menu-grupo a')].map((a) => /** @type {string} */ (/** @type {HTMLElement} */ (a).dataset.ruta));
  if (JSON.stringify(orden) === JSON.stringify(db.settings.ordenMenu || [])) return;
  db.settings.ordenMenu = orden;
  guardar();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-abierto')) {
    abrirMenu(false);
    menuBtn.focus();
    return;
  }
  // Q: añadir tarea rápida (como en Todoist), si no se está escribiendo en ningún campo.
  const escribiendo = /** @type {Element} */ (e.target).closest?.('input, textarea, select, [contenteditable]');
  // /: buscar contactos en la barra de arriba.
  if (e.key === '/' && !escribiendo && !e.ctrlKey && !e.metaKey && !modal.open) {
    e.preventDefault();
    buscador.focus();
    return;
  }
  // Haciendo tareas (en #/cola o en la ficha del contacto): Ctrl+Enter completa (también escribiendo la nota)
  // y las flechas pasan de una tarea a otra.
  if (enModoCola() && !modal.open) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      completarActualEnCola();
      return;
    }
    if (!escribiendo && !e.ctrlKey && !e.metaKey && !e.altKey && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      irEnCola(colaActiva().i + (e.key === 'ArrowRight' ? 1 : -1));
      return;
    }
  }
  if (e.key.toLowerCase() === 'q' && !e.ctrlKey && !e.metaKey && !e.altKey && !escribiendo && !modal.open) {
    e.preventDefault();
    modalRapido();
  }
});

// Iconos de la página (menú) que van en el HTML con data-ico.
document.querySelectorAll('[data-ico]').forEach((el) => (el.innerHTML = ico(/** @type {string} */ (/** @type {HTMLElement} */ (el).dataset.ico))));

function actualizarReloj() {
  const z = zonaSecundaria();
  /** @type {HTMLElement} */ (document.getElementById('reloj')).innerHTML = `España <b>${horaActual()}</b> ${z ? enLocal(horaActual(z.id)) : ''}`;
}

export function actualizarBadges() {
  actualizarReloj();
  const h = hoy();
  const pend = db.tasks.filter((t) => !t.hecha);
  const paraHoy = pend.filter((t) => t.fecha && t.fecha <= h);
  const vencidas = paraHoy.filter((t) => /** @type {string} */ (t.fecha) < h).length;

  // El número de Tareas se pone en rojo si hay vencidas.
  const b = /** @type {HTMLElement} */ (document.getElementById('badge-tareas'));
  b.textContent = String(pend.length || '');
  b.classList.toggle('alerta', vencidas > 0);
  b.title = vencidas ? `${vencidas} vencida${plural(vencidas)}` : '';
}
