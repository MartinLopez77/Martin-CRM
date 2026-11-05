// Notas: la lista de la ficha del contacto y el formulario.
import { tipoAccionDe, TIPOS_ACCION } from '../activity/schema.js';
import { HUBSPOT_ESTADOS, urlHubspot } from '../contacts/schema.js';
import { tocar } from '../contacts/store.js';
import { NOTA_A_ACCION, tipoDe, TIPOS_NOTA } from './schema.js';
import { notasDe } from './store.js';
import { fmtFecha, fmtRelativa, hoy } from '../../shared/lib/dates.js';
import { markdown } from '../../shared/lib/markdown.js';
import { ahora, esc, uid } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db, ui } from '../../shared/state.js';
import { $ } from '../../shared/ui/dom.js';
import { comandoEditor, editorHTML } from '../../shared/ui/editor-md.js';
import { campo, opciones } from '../../shared/ui/html.js';
import { ico } from '../../shared/ui/icons.js';
import { abrirModal, modal } from '../../shared/ui/modal.js';

/** @param {string} id contacto */
export function renderNotasContacto(id) {
  const q = ui.notasContactoQ.trim().toLowerCase();
  const todas = notasDe(id);
  const lista = todas
    .filter((n) => !ui.notaFiltro || n.tipo === ui.notaFiltro)
    .filter((n) => !q || [n.titulo, n.contenido].some((v) => (v || '').toLowerCase().includes(q)));
  const msg = !todas.length ? 'Todavía no hay notas para este contacto. Añade una con el botón «Nota» de la tarjeta.' : 'Ninguna nota coincide.';
  $('#notas-contacto').innerHTML = lista.map(notaHTML).join('') || `<div class="empty card"><p class="muted">${msg}</p></div>`;
}

/** @param {import('./schema.js').Nota} n */
export function notaHTML(n) {
  const t = tipoDe(n.tipo);
  const ac = db.actions.find((a) => a.noteId === n.id);
  const tAc = ac && tipoAccionDe(ac.tipo);
  const tareaPend = !ac && db.tasks.find((x) => x.noteId === n.id && !x.hecha);
  const abierta = ui.notasAbiertas.has(n.id);
  const contenido = n.contenido || '';
  const larga = contenido.length > 240 || contenido.split('\n').length > 4;
  return `
    <article class="nota card ${n.fijada ? 'fijada' : ''}" id="nota-${n.id}" style="--c:${t.color}">
      <header>
        <span class="tipo-pill">${ico(t.icon)} ${t.label}${tAc && tAc.label === t.label ? ` <span title="Registrada como acción">${ico('rayo')}</span>` : ''}</span>
        <time>${fmtFecha(n.fecha)}</time>
        ${tAc && tAc.label !== t.label ? `<span class="accion-pill" style="--c:${tAc.color}" title="Registrada como acción">${ico('rayo')} ${ico(tAc.icon)} ${tAc.label}</span>` : ''}
        ${tareaPend ? `<span class="accion-pill futura-pill" title="Nota de una tarea pendiente">${ico('reloj')} ${esc(tareaPend.titulo)}${tareaPend.fecha ? ` · ${fmtRelativa(tareaPend.fecha)}` : ''}</span>` : ''}
        <div class="nota-acciones">
          <button class="icon-btn" data-action="nota-pantalla" data-id="${n.id}" title="Abrir a pantalla completa">${ico('expandir')}</button>
          <button class="icon-btn ${n.fijada ? 'on' : ''}" data-action="fijar-nota" data-id="${n.id}" title="${n.fijada ? 'Desfijar' : 'Fijar arriba'}">${ico('pin')}</button>
          <button class="icon-btn" data-action="editar-nota" data-id="${n.id}" title="Editar">${ico('editar')}</button>
          <button class="icon-btn" data-action="borrar-nota" data-id="${n.id}" title="Eliminar">${ico('cerrar')}</button>
        </div>
      </header>
      ${n.titulo ? `<h4 class="${larga ? 'clicable' : ''}" ${larga ? `data-action="toggle-nota" data-id="${n.id}"` : ''}>${esc(n.titulo)}</h4>` : ''}
      ${contenido ? `<div class="nota-body md ${larga && !abierta ? 'colapsada' : ''}">${markdown(contenido)}</div>` : ''}
      ${larga ? `<button class="link-btn small ver-mas" data-action="toggle-nota" data-id="${n.id}">${abierta ? 'Ver menos ▴' : 'Ver más ▾'}</button>` : ''}
      ${n.telefono || n.email || n.hubspotId ? `
        <div class="nota-extra">
          ${n.telefono ? `<a href="tel:${esc(n.telefono)}">${ico('telefono')} ${esc(n.telefono)}</a>` : ''}
          ${n.email ? `<a href="mailto:${esc(n.email)}">${ico('correo')} ${esc(n.email)}</a>` : ''}
          ${n.hubspotId ? `<a href="${urlHubspot(n.hubspotId)}" target="_blank" rel="noopener">HubSpot ↗</a>${n.hubspotEstado ? ` <span class="muted">${esc(HUBSPOT_ESTADOS[n.hubspotEstado] || n.hubspotEstado)}</span>` : ''}` : ''}
        </div>` : ''}
    </article>`;
}

// Editar una nota, o crear una nueva para `contactId` (botón «Nota» de la tarjeta del contacto).
/**
 * Editar una nota, o crear una nueva para `contactId` (botón «Nota» de la tarjeta del contacto).
 * @param {import('./schema.js').Nota | null | undefined} n
 * @param {boolean} [pantallaCompleta]
 * @param {string | null} [contactId]
 */
export function modalNota(n, pantallaCompleta = false, contactId = null) {
  const nueva = !n;
  const v = n || { tipo: 'general', fecha: hoy(), titulo: '', contenido: '', fijada: false };
  abrirModal(nueva ? 'Nueva nota' : 'Editar nota', `
    <div class="row2">
      ${campo('Tipo', `<select name="tipo">${opciones(TIPOS_NOTA.filter((t) => !t.auto || t.id === v.tipo), v.tipo)}</select>`)}
      ${campo('Fecha', `<input type="date" name="fecha" value="${esc(v.fecha)}">`)}
    </div>
    ${campo('Título', `<input name="titulo" value="${esc(v.titulo)}" placeholder="${nueva ? 'Opcional' : ''}">`)}
    <div class="field"><span>Contenido</span>${editorHTML('contenido', v.contenido, nueva ? 8 : 14, nueva ? 'Escribe la nota… (**negrita**, - listas, 1. listas numeradas, enlaces)' : '')}</div>
    ${nueva ? `
      <div class="registrar-accion">
        <span>${ico('rayo')} Registrar también como acción</span>
        <select name="accion">
          <option value="">No</option>
          ${opciones(TIPOS_ACCION, '')}
        </select>
      </div>` : ''}
    <label class="check"><input type="checkbox" name="fijada" ${v.fijada ? 'checked' : ''}> ${ico('pin')} Fijar arriba</label>
  `, (d) => {
    const titulo = d.titulo.trim();
    const contenido = d.contenido.trim();
    if (!titulo && (!contenido || contenido === tipoDe(d.tipo).plantilla?.trim())) return false;
    const datos = { tipo: d.tipo, fecha: d.fecha || hoy(), titulo, contenido, fijada: d.fijada };
    if (nueva) {
      const nn = { id: uid(), contactId, ...datos, creado: ahora() };
      db.notes.push(nn);
      if (d.accion) {
        const primeraLinea = contenido.split('\n').find((/** @type {string} */ l) => l.trim())?.replace(/[*#>-]/g, '').trim() || '';
        db.actions.push({
          id: uid(), contactId: /** @type {string} */ (contactId), tipo: d.accion, fecha: nn.fecha, hora: null,
          resumen: titulo || primeraLinea.slice(0, 120), noteId: nn.id, taskId: null, creado: ahora(),
        });
      }
    } else {
      Object.assign(/** @type {import('./schema.js').Nota} */ (n), datos, { editado: ahora() });
    }
    tocar(contactId || /** @type {import('./schema.js').Nota} */ (n).contactId);
    guardar();
    render();
  });
  if (nueva) {
    const form = $('form', modal);
    form.addEventListener('change', (/** @type {Event} */ ev) => {
      const e = { target: /** @type {HTMLSelectElement} */ (ev.target) };
      if (e.target.name === 'accion') form.dataset.accionManual = '1';
      if (e.target.name !== 'tipo') return;
      // Al elegir "Videollamada" con la nota vacía, se rellena la plantilla; si se cambia de tipo sin tocarla, se quita.
      const plantilla = tipoDe(e.target.value).plantilla;
      const esPlantilla = TIPOS_NOTA.some((t) => t.plantilla && t.plantilla === form.contenido.value);
      if (!form.contenido.value.trim() || esPlantilla) form.contenido.value = plantilla || '';
      // Mientras no se haya elegido a mano, la acción sigue al tipo de nota (nota de llamada → acción "Llamada").
      if (form.dataset.accionManual !== '1') form.accion.value = NOTA_A_ACCION[e.target.value] || '';
    });
    form.titulo.focus();
  }
  if (pantallaCompleta) comandoEditor($('textarea[name=contenido]', modal), 'pantalla');
}
