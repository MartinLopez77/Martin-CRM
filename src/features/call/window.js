// Ventana de llamada (como la de HubSpot): se puede arrastrar, minimizar y lleva el cronómetro.
import { cerrarLlamada, colgar, fmtDuracion, registrarLlamada, RESULTADOS_LLAMADA, segundosLlamada } from './store.js';
import { empresaDe } from '../companies/store.js';
import { contactoExistente } from '../contacts/store.js';
import { enModoCola } from '../queue/store.js';
import { tarea } from '../tasks/store.js';
import { esc, iniciales } from '../../shared/lib/text.js';
import { render } from '../../shared/router.js';
import { ui } from '../../shared/state.js';
import { $ } from '../../shared/ui/dom.js';
import { activarEditores, editorHTML } from '../../shared/ui/editor-md.js';
import { opciones } from '../../shared/ui/html.js';
import { ico } from '../../shared/ui/icons.js';
import { avisar } from '../../shared/ui/toast.js';

const ventanaLlamada = /** @type {HTMLElement} */ (document.getElementById('llamada'));

export function pintarLlamada() {
  const L = ui.llamada;
  ventanaLlamada.hidden = !L;
  if (!L) return;
  const c = contactoExistente(L.contactId);
  const t = L.taskId ? tarea(L.taskId) : undefined;
  const seg = segundosLlamada(L);
  const tel = L.telefono.trim();
  ventanaLlamada.classList.toggle('minimizada', L.minimizada);
  ventanaLlamada.innerHTML = `
    <div class="ll-cabecera" data-ll="minimizar" title="Arrastra para moverla · clic para ${L.minimizada ? 'desplegar' : 'minimizar'} · doble clic para devolverla a su sitio">
      ${ico('telefono')}
      <span class="grow"><b>${L.inicio ? 'En llamada' : 'Llamada'}</b> · ${esc(c.nombre)}</span>
      ${L.inicio ? `<span class="ll-tiempo">${fmtDuracion(seg)}</span>` : ''}
      <button type="button" class="ll-btn" data-ll="minimizar" aria-label="${L.minimizada ? 'Desplegar' : 'Minimizar'}">${L.minimizada ? '▴' : '▾'}</button>
      <button type="button" class="ll-btn" data-ll="cerrar" aria-label="Cerrar">${ico('cerrar')}</button>
    </div>
    ${L.minimizada ? '' : `
      <div class="ll-cuerpo">
        <div class="persona">
          <span class="avatar sm">${esc(iniciales(c.nombre))}</span>
          <div class="grow">
            <a href="#/contacto/${c.id}"><strong>${esc(c.nombre)}</strong></a>
            <div class="muted small">${esc([c.cargo, empresaDe(c)].filter(Boolean).join(' · '))}</div>
          </div>
        </div>
        ${t ? `<div class="ll-tarea small">${ico('check-circulo')} ${esc(t.titulo)}</div>` : ''}
        <div class="ll-marcar">
          ${c.telefono ? `<span class="ll-numero">${esc(tel)}</span>` : `<input name="ll-tel" type="tel" placeholder="Número de teléfono" value="${esc(L.telefono)}">`}
          ${L.inicio
            ? `<span class="ll-tiempo grande">${fmtDuracion(seg)}</span><button type="button" class="btn ll-colgar" data-ll="colgar">Colgar</button>`
            : `<a class="btn ll-llamar ${tel ? '' : 'desactivado'}" href="${tel ? `tel:${esc(tel.replace(/[^\d+]/g, ''))}` : '#'}" data-ll="llamar">${ico('telefono')} Llamar</a>`}
        </div>
        ${!L.inicio && L.duracion ? `<p class="muted small ll-duracion">Duración: ${fmtDuracion(seg)}</p>` : ''}
        <label class="field"><span>Resultado</span>
          <select name="ll-resultado">${opciones(RESULTADOS_LLAMADA, L.resultado)}</select>
        </label>
        <div class="field"><span>Notas de la llamada</span>${editorHTML('ll-notas', L.notas, 5, 'Qué te ha dicho, próximos pasos…')}</div>
      </div>
      <div class="ll-pie">
        <button type="button" class="btn primary" data-ll="registrar">${t && !t.hecha ? 'Registrar y completar tarea' : 'Registrar llamada'}</button>
      </div>`}`;
  activarEditores(ventanaLlamada);
  colocarLlamada();
}

// La ventana se puede arrastrar por la cabecera a cualquier sitio de la pantalla (como en HubSpot).
// La posición se recuerda en este navegador; sin posición guardada va abajo a la derecha.
/** @type {{ x: number, y: number } | null} */
let posLlamada = (() => { try { return JSON.parse(/** @type {string} */ (localStorage.getItem('crm-pos-llamada'))); } catch { return null; } })();
/** @type {{ dx: number, dy: number, x0: number, y0: number, movido: boolean } | null} */
let arrastreLlamada = null;
let ignorarClicLlamada = false;

// Coloca la ventana en su posición sin que se salga de la pantalla.
function colocarLlamada() {
  if (!posLlamada || ventanaLlamada.hidden) return;
  const r = ventanaLlamada.getBoundingClientRect();
  const x = Math.max(8, Math.min(posLlamada.x, innerWidth - r.width - 8));
  const y = Math.max(8, Math.min(posLlamada.y, innerHeight - r.height - 8));
  Object.assign(ventanaLlamada.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
}

ventanaLlamada.addEventListener('pointerdown', (e) => {
  const t = /** @type {Element} */ (e.target);
  const cab = t.closest('.ll-cabecera');
  if (!cab || e.button !== 0 || t.closest('button')) return;
  // Sin esto, si hay texto seleccionado en la página el navegador empieza a arrastrarlo y corta el movimiento.
  e.preventDefault();
  const r = ventanaLlamada.getBoundingClientRect();
  arrastreLlamada = { dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, movido: false };
  cab.setPointerCapture(e.pointerId);
});

ventanaLlamada.addEventListener('pointermove', (e) => {
  const a = arrastreLlamada;
  if (!a) return;
  if (!a.movido && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 4) return; // un clic no es un arrastre
  a.movido = true;
  ventanaLlamada.classList.add('arrastrando');
  posLlamada = { x: e.clientX - a.dx, y: e.clientY - a.dy };
  colocarLlamada();
});

function soltarLlamada() {
  if (!arrastreLlamada) return;
  if (arrastreLlamada.movido) {
    // Al soltar no se minimiza (el clic de la cabecera minimiza).
    ignorarClicLlamada = true;
    setTimeout(() => (ignorarClicLlamada = false));
    try { localStorage.setItem('crm-pos-llamada', JSON.stringify(posLlamada)); } catch { /* sin almacenamiento: no pasa nada */ }
  }
  arrastreLlamada = null;
  ventanaLlamada.classList.remove('arrastrando');
}

ventanaLlamada.addEventListener('pointerup', soltarLlamada);
ventanaLlamada.addEventListener('pointercancel', soltarLlamada);

// Doble clic en la cabecera: vuelve a su sitio de siempre.
ventanaLlamada.addEventListener('dblclick', (e) => {
  const t = /** @type {Element} */ (e.target);
  if (!t.closest('.ll-cabecera') || t.closest('button')) return;
  posLlamada = null;
  try { localStorage.removeItem('crm-pos-llamada'); } catch { /* sin almacenamiento */ }
  Object.assign(ventanaLlamada.style, { left: '', top: '', right: '', bottom: '' });
});

window.addEventListener('resize', colocarLlamada);

ventanaLlamada.addEventListener('click', (e) => {
  if (ignorarClicLlamada) return;
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-ll]'));
  const L = ui.llamada;
  if (!b || !L) return;
  const que = b.dataset.ll;
  if (que === 'minimizar') L.minimizada = !L.minimizada;
  else if (que === 'cerrar') {
    if ((L.inicio || L.notas.trim()) && !confirm('¿Cerrar la llamada sin registrarla? Se perderán las notas.')) return;
    ui.llamadaCerrada = L.taskId;
    cerrarLlamada();
    if (enModoCola()) render();
    return;
  } else if (que === 'llamar') {
    if (!L.telefono.trim()) {
      e.preventDefault();
      avisar('Escribe el número de teléfono');
      return;
    }
    // El enlace tel: abre la app de llamadas del ordenador. Se repinta después: un enlace que
    // desaparece de la página durante el clic ya no se abre.
    L.inicio = Date.now();
    setTimeout(pintarLlamada);
    return;
  } else if (que === 'colgar') colgar();
  else if (que === 'registrar') return registrarLlamada();
  pintarLlamada();
});

ventanaLlamada.addEventListener('input', (e) => {
  const L = ui.llamada;
  if (!L) return;
  const campo = /** @type {HTMLInputElement} */ (e.target);
  if (campo.name === 'll-notas') L.notas = campo.value;
  if (campo.name === 'll-tel') {
    L.telefono = campo.value;
    const b = $('.ll-llamar', ventanaLlamada);
    const tel = L.telefono.trim();
    b?.classList.toggle('desactivado', !tel);
    if (b) b.href = tel ? `tel:${tel.replace(/[^\d+]/g, '')}` : '#';
  }
});

ventanaLlamada.addEventListener('change', (e) => {
  const sel = /** @type {HTMLSelectElement} */ (e.target);
  if (sel.name === 'll-resultado' && ui.llamada) ui.llamada.resultado = sel.value;
});

// El contador de la llamada en curso.
setInterval(() => {
  if (!ui.llamada?.inicio) return;
  ventanaLlamada.querySelectorAll('.ll-tiempo').forEach((el) => (el.textContent = fmtDuracion(segundosLlamada(/** @type {import('./store.js').Llamada} */ (ui.llamada)))));
}, 1000);
