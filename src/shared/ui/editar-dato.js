// Editar un dato de una tarjeta pulsándolo: se abre un recuadro pequeño bajo el dato con su control
// (texto, selector, fecha… según el tipo del campo) y Guardar / Cancelar. Enter guarda y Esc cancela.
// No sabe nada de las entidades: quien lo abre decide qué hacer con el valor (alGuardar).
import { esc } from '../lib/text.js';
import { inputProp, leerCampo } from '../schema.js';

/** @type {HTMLFormElement | null} */
let abierto = null;

export function cerrarEditorDato() {
  abierto?.remove();
  abierto = null;
}

/**
 * Abre el editor de un campo junto a `ancla`.
 * @param {HTMLElement} ancla el dato pulsado
 * @param {import('../schema.js').Campo} campo
 * @param {unknown} valor el valor actual
 * @param {(valor: any) => unknown} alGuardar recibe el valor ya limpio (leerCampo); devuelve false para no cerrar
 */
export function editarDato(ancla, campo, valor, alGuardar) {
  cerrarEditorDato();
  const pop = document.createElement('form');
  pop.className = 'dato-pop';
  pop.setAttribute('aria-label', `Editar ${campo.label}`);
  pop.innerHTML = `
    <label class="field"><span>${esc(campo.label)}</span>${inputProp(campo, valor, 'valor')}</label>
    ${campo.tipo === 'textoLargo' ? '<span class="muted small">Ctrl+Enter para guardar</span>' : ''}
    <div class="dato-pop-botones">
      <button type="button" class="btn sm" data-cancelar>Cancelar</button>
      <button class="btn sm primary">Guardar</button>
    </div>`;
  document.body.append(pop);
  abierto = pop;

  // Debajo del dato, sin salirse de la pantalla.
  const r = ancla.getBoundingClientRect();
  const ancho = Math.max(280, Math.min(r.width, 420));
  pop.style.width = `${ancho}px`;
  pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - ancho - 8)) + scrollX}px`;
  const debajo = r.bottom + 6;
  const alto = pop.offsetHeight;
  pop.style.top = `${(debajo + alto > innerHeight - 8 ? Math.max(8, r.top - alto - 6) : debajo) + scrollY}px`;

  const control = /** @type {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} */ (pop.querySelector('[name=valor]'));
  control.focus();
  if (control instanceof HTMLInputElement && control.type === 'text') control.select();

  pop.addEventListener('submit', (e) => {
    e.preventDefault();
    if (alGuardar(leerCampo(campo, control.value)) !== false) cerrarEditorDato();
  });
  /** @type {HTMLElement} */ (pop.querySelector('[data-cancelar]')).addEventListener('click', cerrarEditorDato);
  pop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cerrarEditorDato();
    } else if (e.key === 'Enter' && control instanceof HTMLTextAreaElement && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      pop.requestSubmit();
    }
  });
  // Un selector guarda en cuanto se elige.
  if (control instanceof HTMLSelectElement) control.addEventListener('change', () => pop.requestSubmit());
}

// Pulsar fuera o cambiar de página lo cierra sin guardar.
document.addEventListener('mousedown', (e) => {
  if (abierto && !abierto.contains(/** @type {Node} */ (e.target))) cerrarEditorDato();
}, true);
window.addEventListener('hashchange', cerrarEditorDato);
