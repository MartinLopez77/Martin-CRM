// Tareas: el editor «Añadir tarea» (como Todoist), con fechas en el título y tipo de acción deducido.
import { TIPOS_ACCION } from '../activity/schema.js';
import { contacto, opcionesContactos, tocar } from '../contacts/store.js';
import { OPCIONES_FECHA_TD, PRIORIDADES } from './schema.js';
import { guardarNotaDeTarea, listasDeTareas } from './store.js';
import { claseFecha, diaSemana, fechaAtajo, fmtCuando, hoy } from '../../shared/lib/dates.js';
import { accionDeTitulo, analizarFechas, quitarRangos } from '../../shared/lib/nlp.js';
import { ahora, esc, uid } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render, rutaActual } from '../../shared/router.js';
import { db, ui } from '../../shared/state.js';
import { $ } from '../../shared/ui/dom.js';
import { activarEditores, editorHTML } from '../../shared/ui/editor-md.js';
import { opciones } from '../../shared/ui/html.js';
import { ico } from '../../shared/ui/icons.js';
import { alAbrirModal, modal } from '../../shared/ui/modal.js';
import { avisar } from '../../shared/ui/toast.js';

/** @typedef {import('../../shared/lib/nlp.js').Rango} Rango */
/** @typedef {'fecha' | 'hora'} TipoNlp */
/**
 * Lo que recuerda cada título que reconoce fechas.
 * aplicado: la fecha/hora del formulario la ha puesto el título · base: el valor que había antes ·
 * ignorar: texto que no se vuelve a aplicar porque después se cambió la fecha a mano.
 * @typedef {{ aplicado: Partial<Record<TipoNlp, boolean>>, base: Partial<Record<TipoNlp, string>>, ignorar: Partial<Record<TipoNlp, string>>, rangos: Rango[] }} EstadoNlp
 */
/** @typedef {HTMLInputElement & { _nlp?: EstadoNlp }} InputNlp */

/** El elemento de un evento (los listeners de aquí solo miran elementos). @param {Event} e */
const objetivo = (e) => /** @type {HTMLElement} */ (e.target);
/** Un control del formulario por su nombre. @param {HTMLFormElement} form @param {string} nombre */
const control = (form, nombre) => /** @type {HTMLInputElement | undefined} */ (form.elements.namedItem(nombre) ?? undefined);

export const ICONO_CAL = ico('calendario');

// Campo de título que reconoce fechas: el texto reconocido se resalta (con un "espejo" detrás del input)
// y al guardar se quita del título.
/** @param {string} valor @param {string} placeholder @param {string} [extra] atributos extra del input */
export const tituloNlp = (valor, placeholder, extra = '') => `
  <span class="nlp">
    <span class="nlp-espejo" aria-hidden="true"></span>
    <input name="titulo" data-nlp required autocomplete="off" value="${esc(valor)}" placeholder="${esc(placeholder)}" ${extra}>
  </span>`;

/** @param {ParentNode} [raiz] */
function activarNlp(raiz = document) {
  raiz.querySelectorAll('input[data-nlp]:not([data-nlp-on])').forEach((nodo) => {
    const input = /** @type {InputNlp} */ (nodo);
    input.dataset.nlpOn = '1';
    const form = /** @type {HTMLFormElement} */ (input.form);
    const espejo = /** @type {HTMLElement} */ (/** @type {HTMLElement} */ (input.parentElement).querySelector('.nlp-espejo'));
    /** @type {EstadoNlp} */
    const st = { aplicado: {}, base: {}, ignorar: {}, rangos: [] };
    input._nlp = st;

    const pintar = () => {
      const v = input.value;
      let html = '';
      let pos = 0;
      [...st.rangos].sort((a, b) => a.ini - b.ini).forEach((r) => {
        html += `${esc(v.slice(pos, r.ini))}<mark>${esc(v.slice(r.ini, r.fin))}</mark>`;
        pos = r.fin;
      });
      espejo.innerHTML = html + esc(v.slice(pos));
      espejo.scrollLeft = input.scrollLeft;
    };

    input.addEventListener('input', () => {
      const r = analizarFechas(input.value);
      st.rangos = [];
      for (const tipo of /** @type {TipoNlp[]} */ (['fecha', 'hora'])) {
        const campo = control(form, tipo);
        if (!campo) continue;
        const rango = r.rangos.find((x) => x.tipo === tipo);
        const texto = rango && input.value.slice(rango.ini, rango.fin).toLowerCase();
        if (st.ignorar[tipo] && st.ignorar[tipo] !== texto) delete st.ignorar[tipo];
        if (rango && !st.ignorar[tipo]) {
          if (!st.aplicado[tipo]) st.base[tipo] = campo.value;
          campo.value = /** @type {string} */ (r[tipo]);
          st.aplicado[tipo] = true;
          st.rangos.push(rango);
        } else if (st.aplicado[tipo]) {
          campo.value = /** @type {string} */ (st.base[tipo]); // se ha borrado la palabra: vuelve la fecha de antes
          st.aplicado[tipo] = false;
        }
      }
      pintar();
      pintarChipFecha(form);
    });
    ['scroll', 'keyup', 'click', 'select'].forEach((ev) => input.addEventListener(ev, () => (espejo.scrollLeft = input.scrollLeft)));

    // Si se cambia la fecha o la hora a mano, manda eso y la palabra se queda en el título.
    /** @type {TipoNlp[]} */ (['fecha', 'hora']).forEach((tipo) => control(form, tipo)?.addEventListener('change', () => {
      const rango = st.rangos.find((x) => x.tipo === tipo);
      if (!rango) return;
      st.ignorar[tipo] = input.value.slice(rango.ini, rango.fin).toLowerCase();
      st.aplicado[tipo] = false;
      st.rangos = st.rangos.filter((x) => x !== rango);
      pintar();
    }));
    pintar();
  });
}

// Título a guardar: sin las palabras que se han convertido en fecha u hora.
/** @param {InputNlp} input */
export function tituloLimpio(input) {
  const rangos = input._nlp?.rangos || [];
  return (rangos.length && quitarRangos(input.value, rangos)) || input.value.trim();
}

// Mientras se escribe el título, el tipo de acción lo sigue. Si se elige a mano, ya no se toca.
document.addEventListener('input', (e) => {
  const input = /** @type {HTMLInputElement} */ (e.target);
  if (!input.matches?.('input[data-nlp]')) return;
  const sel = input.form && /** @type {HTMLSelectElement | null} */ (input.form.elements.namedItem('accion'));
  if (!sel || sel.dataset.manual) return;
  if (!('base' in sel.dataset)) sel.dataset.base = sel.value;
  sel.value = accionDeTitulo(input.value) || /** @type {string} */ (sel.dataset.base);
});

document.addEventListener('change', (e) => {
  const sel = /** @type {HTMLSelectElement} */ (e.target);
  if (sel.name === 'accion' && sel.form?.querySelector('input[data-nlp]')) sel.dataset.manual = '1';
});

/** @param {string | null | undefined} fecha @param {string | null | undefined} hora */
const chipFecha = (fecha, hora) => `
  <span class="td-pop-wrap">
    <button type="button" class="td-chip td-chip-fecha" data-td-pop aria-haspopup="true"></button>
    <div class="td-pop" hidden>
      ${OPCIONES_FECHA_TD.map(([id, label, icono]) => `
        <button type="button" data-td-fecha="${id}">
          <span class="td-pop-icono">${ico(icono)}</span>${label}<small>${id === 'sin' ? '' : diaSemana(fechaAtajo(id), 'short')}</small>
        </button>`).join('')}
      <div class="td-pop-campos">
        <input type="date" name="fecha" value="${esc(fecha || '')}" aria-label="Fecha">
        <input type="time" name="hora" value="${esc(hora || '')}" title="Hora de España" aria-label="Hora (España)">
      </div>
    </div>
  </span>`;

/**
 * El editor de una tarea nueva. Con `lista` (aunque sea '') es una tarea general: en vez de contacto se elige la lista.
 * @param {{ fecha?: string, contactId?: string, fijo?: boolean, lista?: string }} [opciones] fijo: el contacto no se puede cambiar
 */
export function editorTareaHTML({ fecha = hoy(), contactId = '', fijo = false, lista } = {}) {
  const c = fijo && contacto(contactId);
  const general = lista !== undefined;
  return `
    <form class="td-editor">
      ${tituloNlp('', 'Nombre de la tarea (p. ej. Llamar a Ana mañana a las 17)', 'class="td-editor-titulo"')}
      <input name="detalle" class="td-editor-desc" placeholder="Descripción" autocomplete="off">
      <div class="td-chips">
        ${chipFecha(fecha, '')}
        <select name="prioridad" class="td-chip td-chip-prio" data-prio="ninguna" title="Prioridad">${opciones(PRIORIDADES, 'ninguna')}</select>
        <select name="accion" class="td-chip" title="Si es una acción hacia el cliente, aparecerá en sus Próximas acciones">
          <option value="">Tarea interna</option>
          ${opciones(TIPOS_ACCION, '')}
        </select>
        <button type="button" class="td-chip" data-td-nota>${ico('nota')} Nota</button>
      </div>
      <div class="td-nota" hidden>${editorHTML('nota', '', 4, 'Lo que quieras tener presente para esta tarea…')}</div>
      <div class="td-pie">
        ${general ? `<input type="hidden" name="contactId" value="">${campoLista(lista, 'td-proyecto-select')}`
          : c ? `<input type="hidden" name="contactId" value="${c.id}"><span class="td-proyecto-fijo">${ico('persona')} ${esc(c.nombre)}</span>` : `
          <select name="contactId" class="td-proyecto-select" title="Contacto">${opcionesContactos(contactId)}
          </select>`}
        <span class="grow"></span>
        <button type="button" class="btn" data-td-cancelar>Cancelar</button>
        <button class="btn td-primario">Añadir tarea</button>
      </div>
    </form>`;
}

/** Campo «lista» de las tareas sin contacto. @param {string | null | undefined} valor @param {string} [clase] */
export const campoLista = (valor, clase = '') => `
  <input name="lista" class="${clase}" list="listas-tareas" autocomplete="off" value="${esc(valor || '')}" placeholder="# General" title="Lista (para tareas sin contacto)">
  <datalist id="listas-tareas">${listasDeTareas().map((l) => `<option value="${esc(l)}">`).join('')}</datalist>`;

/** @param {string} clave grupo en el que se abre el editor @param {string} [fecha] */
export const anadirTareaHTML = (clave, fecha = '') => `
  <button class="td-anadir" data-action="abrir-editor" data-clave="${clave}" data-fecha="${fecha}"><span class="td-mas">+</span> Añadir tarea</button>`;

/** El chip de fecha del editor, con el color y el texto de la fecha elegida. @param {Element} nodo */
function pintarChipFecha(nodo) {
  const form = /** @type {HTMLFormElement} */ (nodo);
  const chip = form.querySelector('.td-chip-fecha');
  if (!chip) return;
  const f = /** @type {HTMLInputElement} */ (control(form, 'fecha')).value;
  const h = /** @type {HTMLInputElement} */ (control(form, 'hora')).value;
  chip.className = `td-chip td-chip-fecha ${f ? claseFecha(f) : ''}`;
  chip.innerHTML = f ? `${ICONO_CAL}${fmtCuando(f)}${h ? ` ${h}` : ''}` : h ? `${ico('reloj')} ${h}` : `${ICONO_CAL}Fecha`;
}

alAbrirModal(activarTareas);

/** Activa los editores de tarea (títulos con fechas y chips) que haya dentro de `raiz`. @param {ParentNode} [raiz] */
export function activarTareas(raiz = document) {
  activarNlp(raiz);
  raiz.querySelectorAll('.td-editor').forEach(pintarChipFecha);
}

/** @param {Element | null | undefined} salvo */
const cerrarPops = (salvo) => document.querySelectorAll('.td-pop:not([hidden])').forEach((p) => p !== salvo && (/** @type {HTMLElement} */ (p).hidden = true));

/** @param {HTMLFormElement} form */
function cerrarEditor(form) {
  if (form.closest('dialog')) return modal.close();
  ui.editor = null;
  render();
}

document.addEventListener('click', (e) => {
  const t = objetivo(e);
  const pop = t.closest('.td-pop');
  const abrir = t.closest('[data-td-pop]');
  cerrarPops(pop || abrir?.nextElementSibling);
  if (abrir) {
    const siguiente = /** @type {HTMLElement} */ (abrir.nextElementSibling);
    siguiente.hidden = !siguiente.hidden;
  }

  const opcion = /** @type {HTMLElement | null} */ (t.closest('[data-td-fecha]'));
  if (opcion) {
    const form = /** @type {HTMLFormElement} */ (opcion.closest('form'));
    const fecha = /** @type {HTMLInputElement} */ (control(form, 'fecha'));
    fecha.value = fechaAtajo(/** @type {string} */ (opcion.dataset.tdFecha));
    if (opcion.dataset.tdFecha === 'sin') /** @type {HTMLInputElement} */ (control(form, 'hora')).value = '';
    fecha.dispatchEvent(new Event('change', { bubbles: true }));
    /** @type {HTMLElement} */ (opcion.closest('.td-pop')).hidden = true;
  }
  if (t.closest('[data-td-nota]')) {
    const caja = /** @type {HTMLElement} */ (/** @type {HTMLFormElement} */ (t.closest('form')).querySelector('.td-nota'));
    caja.hidden = !caja.hidden;
    if (!caja.hidden) /** @type {HTMLTextAreaElement} */ (caja.querySelector('textarea')).focus();
  }
  if (t.closest('[data-td-cancelar]')) cerrarEditor(/** @type {HTMLFormElement} */ (t.closest('form')));
});

document.addEventListener('change', (e) => {
  const t = /** @type {HTMLInputElement} */ (e.target);
  const form = t.closest('.td-editor');
  if (!form) return;
  if (t.name === 'fecha' || t.name === 'hora') pintarChipFecha(form);
  if (t.name === 'prioridad') t.dataset.prio = t.value;
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const abierto = /** @type {HTMLElement | null} */ (document.querySelector('.td-pop:not([hidden])'));
  if (abierto) {
    e.preventDefault();
    abierto.hidden = true;
    return;
  }
  const t = objetivo(e);
  const form = /** @type {HTMLFormElement | null | undefined} */ (t.closest?.('.td-editor'));
  if (form && !form.closest('dialog') && !t.closest('.editor.completa')) cerrarEditor(form);
});

// Guarda la tarea del editor y lo deja abierto para la siguiente, como Todoist.
document.addEventListener('submit', (e) => {
  const f = /** @type {HTMLFormElement} */ (e.target);
  if (!f.matches('.td-editor')) return;
  e.preventDefault();
  const d = /** @type {Record<string, string>} */ (Object.fromEntries(new FormData(f)));
  const titulo = tituloLimpio(/** @type {InputNlp} */ (control(f, 'titulo')));
  if (!titulo) return;
  /** @type {import('./schema.js').Tarea} */
  const t = {
    id: uid(),
    titulo,
    detalle: d.detalle.trim(),
    contactId: d.contactId || null,
    lista: (!d.contactId && d.lista?.trim()) || null,
    accion: d.accion || null,
    fecha: d.fecha || null,
    hora: d.hora || null,
    prioridad: d.prioridad || 'ninguna',
    hecha: false,
    completada: null,
    creado: ahora(),
  };
  db.tasks.push(t);
  guardarNotaDeTarea(t, d.nota);
  tocar(t.contactId);
  guardar();
  if (f.closest('dialog')) {
    modal.close();
    avisar(`Tarea añadida${t.fecha ? ` · ${fmtCuando(t.fecha)}` : ''}`);
  } else {
    ui.enfocarTarea = true;
  }
  render();
});

// Añadir tarea rápida (botón del menú o tecla Q). En la ficha de un contacto, la tarea es suya.
export function modalRapido() {
  const { ruta, id } = rutaActual();
  const contactId = ruta === 'contacto' && contacto(id) ? id : '';
  modal.innerHTML = `<div class="td-rapido">${editorTareaHTML({ fecha: hoy(), contactId })}</div>`;
  activarEditores(modal);
  activarTareas(modal);
  modal.showModal();
  $('[name=titulo]', modal).focus();
}
