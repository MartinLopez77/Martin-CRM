// Editor de notas en markdown: barra (negrita, listas, enlace, pantalla completa) y teclas.
// Enter en una lista añade el siguiente guion/número; Tab y Mayús+Tab cambian la sangría.
import { esc } from '../lib/text.js';
import { ico } from './icons.js';

const LISTA_RE = /^(\s*)([-*•]|(\d+)([.)]))\s(.*)$/;

/** Activa los editores que haya dentro de `raiz` (se puede llamar varias veces). @param {ParentNode} [raiz] */
export function activarEditores(raiz = document) {
  raiz.querySelectorAll('textarea[data-md]:not([data-md-on])').forEach((nodo) => {
    const ta = /** @type {HTMLTextAreaElement} */ (nodo);
    ta.dataset.mdOn = '1';
    ta.addEventListener('keydown', (e) => teclaEditor(ta, e));
  });
}

/** @param {HTMLTextAreaElement} ta @param {KeyboardEvent} e */
function teclaEditor(ta, e) {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && ['b', 'k'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    comandoEditor(ta, e.key.toLowerCase() === 'b' ? 'negrita' : 'enlace');
    return;
  }
  if (e.key === 'Escape' && ta.closest('.editor.completa') && !ta.closest('dialog')) {
    e.preventDefault();
    e.stopPropagation();
    comandoEditor(ta, 'pantalla');
    return;
  }
  const { selectionStart: ini, selectionEnd: fin, value } = ta;
  const inicioLinea = value.lastIndexOf('\n', ini - 1) + 1;
  const finLinea = value.indexOf('\n', ini) === -1 ? value.length : value.indexOf('\n', ini);
  const m = value.slice(inicioLinea, finLinea).match(LISTA_RE);

  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.isComposing && ini === fin && m) {
    e.preventDefault();
    if (!m[5].trim() && ini === finLinea) {
      ta.setRangeText('', inicioLinea, finLinea, 'end'); // punto vacío: se cierra la lista
    } else {
      const marca = m[3] ? `${+m[3] + 1}${m[4]}` : m[2];
      ta.setRangeText(`\n${m[1]}${marca} `, ini, fin, 'end');
    }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (e.key === 'Tab' && m) {
    e.preventDefault();
    if (e.shiftKey) {
      const quitar = Math.min(2, m[1].length);
      if (!quitar) return;
      ta.setRangeText('', inicioLinea, inicioLinea + quitar, 'preserve');
      ta.setSelectionRange(ini - quitar, fin - quitar);
    } else {
      ta.setRangeText('  ', inicioLinea, inicioLinea, 'preserve');
      ta.setSelectionRange(ini + 2, fin + 2);
    }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

const barraEditor = () => `
  <div class="md-barra">
    <button type="button" data-md-cmd="negrita" title="Negrita (Ctrl+B)"><b>B</b></button>
    <button type="button" data-md-cmd="lista" title="Lista con guiones">• Lista</button>
    <button type="button" data-md-cmd="numerada" title="Lista numerada">1. Lista</button>
    <button type="button" data-md-cmd="enlace" title="Enlace (Ctrl+K)">${ico('enlace')} Enlace</button>
    <span class="md-ayuda">Ctrl+B negrita · Ctrl+K enlace · Enter continúa la lista · Tab la sangra</span>
    <button type="button" class="md-pantalla" data-md-cmd="pantalla" title="Ampliar (Esc para volver)">${ico('expandir')}</button>
  </div>`;

/**
 * @param {string} nombre nombre del textarea en el formulario
 * @param {string} valor
 * @param {number} filas
 * @param {string} placeholder
 */
export const editorHTML = (nombre, valor, filas, placeholder) => `
  <div class="editor">
    ${barraEditor()}
    <textarea name="${nombre}" rows="${filas}" data-md placeholder="${esc(placeholder)}">${esc(valor)}</textarea>
  </div>`;

/** Sin scroll en la página mientras haya un editor a pantalla completa. */
export function ajustarScroll() {
  document.body.classList.toggle('sin-scroll', !!document.querySelector('.editor.completa'));
}

/**
 * @param {HTMLTextAreaElement} ta
 * @param {string} cmd negrita, enlace, lista, numerada o pantalla
 */
export function comandoEditor(ta, cmd) {
  const editor = /** @type {HTMLElement} */ (ta.closest('.editor'));
  if (cmd === 'pantalla') {
    // Dentro de una ventana (p. ej. la de una nota) se amplía la ventana entera; fuera, solo el editor.
    const dialogo = editor.closest('dialog');
    const completa = dialogo ? dialogo.classList.toggle('ampliado') : editor.classList.toggle('completa');
    ajustarScroll();
    const b = /** @type {HTMLElement} */ (editor.querySelector('.md-pantalla'));
    b.innerHTML = completa ? `${ico('cerrar')} Reducir` : ico('expandir');
    b.title = completa ? 'Volver al tamaño normal (Esc)' : 'Ampliar (Esc para volver)';
    ta.focus();
    return;
  }
  const { selectionStart: ini, selectionEnd: fin, value } = ta;
  const sel = value.slice(ini, fin);
  const inicioLinea = value.lastIndexOf('\n', ini - 1) + 1;
  if (cmd === 'negrita') {
    const yaNegrita = value.slice(ini - 2, ini) === '**' && value.slice(fin, fin + 2) === '**';
    if (yaNegrita) {
      ta.setRangeText(sel, ini - 2, fin + 2, 'select'); // segunda pulsación: quita la negrita
    } else {
      ta.setRangeText(`**${sel || 'texto'}**`, ini, fin, 'end');
      ta.setSelectionRange(ini + 2, ini + 2 + (sel || 'texto').length);
    }
  } else if (cmd === 'enlace') {
    if (/^https?:\/\/\S+$/.test(sel)) {
      // Seleccionada una URL: queda como destino y se selecciona el texto para escribirlo.
      ta.setRangeText(`[texto](${sel})`, ini, fin, 'end');
      ta.setSelectionRange(ini + 1, ini + 6);
    } else {
      ta.setRangeText(`[${sel || 'texto'}](https://)`, ini, fin, 'end');
      ta.setSelectionRange(ta.selectionEnd - 1, ta.selectionEnd - 1);
    }
  } else {
    ta.setRangeText(cmd === 'lista' ? '- ' : '1. ', inicioLinea, inicioLinea, 'end');
  }
  ta.focus();
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

document.addEventListener('click', (e) => {
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-md-cmd]'));
  if (b) comandoEditor(/** @type {HTMLTextAreaElement} */ (/** @type {HTMLElement} */ (b.closest('.editor')).querySelector('textarea')), /** @type {string} */ (b.dataset.mdCmd));
});
