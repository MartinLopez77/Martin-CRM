// Cola de tareas: la tarea en curso («Tarea 2 de 10») en la ficha del contacto o en #/cola.
import { tipoAccionDe } from '../activity/schema.js';
import { abrirLlamada, cerrarLlamada, esLlamada } from '../call/store.js';
import { contacto } from '../contacts/store.js';
import { nota } from '../notes/store.js';
import { colaActiva, limpiarCola } from './store.js';
import { ICONO_CAL } from '../tasks/editor.js';
import { prioridadDe, REUNIONES } from '../tasks/schema.js';
import { tareaExistente, tareasParaHoy } from '../tasks/store.js';
import { conLocal } from '../settings/horas.js';
import { claseFecha, fmtCuando } from '../../shared/lib/dates.js';
import { markdown } from '../../shared/lib/markdown.js';
import { esc, plural } from '../../shared/lib/text.js';
import { ui } from '../../shared/state.js';
import { $, app } from '../../shared/ui/dom.js';
import { editorHTML } from '../../shared/ui/editor-md.js';
import { ico } from '../../shared/ui/icons.js';

// En una tarea de llamada se abre sola la ventana de llamada (salvo que se haya cerrado a mano).
// Devuelve si la tarea actual se hace con la ventana de llamada.
/** @param {import('../tasks/schema.js').Tarea} t @param {import('../contacts/schema.js').Contacto | null} c */
export function prepararLlamadaCola(t, c) {
  const llamando = !t.hecha && esLlamada(t) && !!c;
  if (llamando && ui.llamada?.taskId !== t.id && !ui.llamada?.inicio && ui.llamadaCerrada !== t.id) abrirLlamada(/** @type {import('../contacts/schema.js').Contacto} */ (c).id, t.id);
  if (!llamando && ui.llamada?.taskId && ui.llamada.taskId !== t.id && !ui.llamada.inicio && !ui.llamada.notas.trim()) cerrarLlamada();
  return llamando;
}

export function cabeceraColaHTML() {
  const cola = colaActiva();
  const total = cola.ids.length;
  const hechas = cola.ids.filter((id) => tareaExistente(id).hecha).length;
  return `
    <div class="sq-cabecera">
      <button class="link-btn back" data-action="sq-salir">← Salir</button>
      <div class="sq-progreso">
        <div class="small"><b>${cola.i < total ? `Tarea ${cola.i + 1} de ${total}` : 'Fin de las tareas'}</b>
          <span class="muted">· ${hechas} completada${plural(hechas)}</span></div>
        <div class="sq-barra"><i style="width:${(hechas / total) * 100}%"></i></div>
      </div>
      <div class="row">
        <button class="btn sm" data-action="sq-anterior" ${cola.i === 0 ? 'disabled' : ''} title="Anterior (←)">← Anterior</button>
        <button class="btn sm" data-action="sq-ir" data-i="${cola.i + 1}" ${cola.i >= total ? 'disabled' : ''} title="Siguiente (→)">Siguiente →</button>
      </div>
    </div>`;
}

// La tarea en curso con sus botones (completar, cancelada, pasar a mañana, saltar…).
/** @param {import('../tasks/schema.js').Tarea} t @param {import('../contacts/schema.js').Contacto | null} c @param {boolean} llamando la tarea se hace con la ventana de llamada */
export function tareaColaHTML(t, c, llamando) {
  const ta = t.accion && tipoAccionDe(t.accion);
  const n = t.noteId && nota(t.noteId);
  const p = prioridadDe(t.prioridad);
  return `
    <div class="sq-tipo">${ta ? `${ico(ta.icon)} ${ta.label}` : `${ico('lista')} Tarea interna`}</div>
    <h1 class="sq-titulo">${esc(t.titulo)}</h1>
    <div class="sq-meta">
      ${t.fecha ? `<span class="td-fecha ${t.hecha ? '' : claseFecha(t.fecha)}">${ICONO_CAL}${fmtCuando(t.fecha)}${t.hora ? ` ${conLocal(t.hora, t.fecha)}` : ''}</span>` : '<span>Sin fecha</span>'}
      ${t.prioridad !== 'ninguna' ? `<span class="sq-prio p-${p.id}">${ico('bandera')} ${p.label}</span>` : ''}
      ${t.cancelada ? '<span class="td-etq-cancelada">Cancelada</span>' : t.hecha ? '<span class="sq-hecha">✓ Completada</span>' : ''}
    </div>
    ${t.detalle ? `<p class="sq-detalle">${esc(t.detalle)}</p>` : ''}
    ${n && n.contenido ? `<div class="sq-nota-tarea md">${markdown(n.contenido)}</div>` : ''}
    ${t.hecha ? `
      <div class="sq-botones">
        <button class="btn" data-action="sq-reabrir">Marcar como pendiente</button>
        <span class="grow"></span>
        <button class="btn primary" data-action="sq-saltar">Siguiente →</button>
      </div>` : `
      ${llamando ? `
        <div class="sq-llamada-aviso">
          ${ico('telefono')} <span class="grow">Es una llamada: apunta las notas y el resultado en la <b>ventana de llamada</b>. Al registrarla, la tarea se completa.</span>
          ${ui.llamada?.taskId === t.id ? '' : `<button class="btn sm" data-action="abrir-llamada" data-id="${/** @type {import('../contacts/schema.js').Contacto} */ (c).id}" data-tarea="${t.id}">Abrir llamada</button>`}
        </div>` : `
        <div class="field sq-apuntar">
          <span>${ico('nota')} Apunta qué ha pasado (se guarda como nota${c ? ` de ${esc(c.nombre)}` : ''})</span>
          ${editorHTML('sq-nota', ui.colaNotas[t.id] || '', c ? 2 : 4, 'Ej. No contesta, volver a llamar el jueves…')}
        </div>`}
      <div class="sq-botones">
        <button class="btn primary" data-action="sq-completar" title="Ctrl+Enter">✓ ${llamando ? 'Registrar llamada y siguiente' : 'Completar y siguiente'}</button>
        ${REUNIONES.includes(/** @type {string} */ (t.accion)) ? `<button class="btn" data-action="sq-cancelada" title="La reunión no se hizo">${ico('cancelado')} Cancelada</button>` : ''}
        <button class="btn" data-action="sq-posponer">Pasar a mañana</button>
        <span class="grow"></span>
        <button class="btn" data-action="sq-saltar">Saltar →</button>
      </div>`}
    <div class="sq-pie muted small">
      <button class="link-btn" data-action="editar-tarea" data-id="${t.id}">${ico('editar')} Editar tarea</button>
      <span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> completar · <kbd>←</kbd> <kbd>→</kbd> moverte entre tareas</span>
    </div>`;
}

/** @param {import('../tasks/schema.js').Tarea} t */
export const activarNotaCola = (t) =>
  $('textarea[name="sq-nota"]', app)?.addEventListener('input', (/** @type {Event} */ e) => { ui.colaNotas[t.id] = /** @type {HTMLTextAreaElement} */ (e.target).value; });

// Página #/cola: las tareas sin contacto y el final de la cola. Las de un contacto se hacen en su ficha.
export function vistaSecuencia() {
  if (!ui.cola && tareasParaHoy().length) ui.cola = { ids: tareasParaHoy().map((t) => t.id), i: 0, origen: 'hoy' };
  limpiarCola();
  const cola = ui.cola;
  if (!cola || !cola.ids.length) {
    ui.cola = null;
    app.innerHTML = `
      <div class="empty card">
        <p><strong>No hay tareas para hoy.</strong></p>
        <p class="muted">«Empezar tareas» recorre una a una las tareas de hoy y las vencidas. También puedes empezar desde cualquier vista de Tareas.</p>
        <a class="btn" href="#/tareas">Ir a Tareas</a>
      </div>`;
    return;
  }

  const total = cola.ids.length;
  const hechas = cola.ids.filter((id) => tareaExistente(id).hecha).length;

  if (cola.i >= total) {
    const faltan = cola.ids.findIndex((id) => !tareaExistente(id).hecha);
    app.innerHTML = `
      ${cabeceraColaHTML()}
      <div class="sq-grid sq-grid-fin">
        <div class="empty card sq-fin">
          <p class="sq-fin-icono">${ico('check-circulo')}</p>
          <p><strong>Tareas terminadas</strong></p>
          <p class="muted">${hechas} de ${total} tareas completadas${faltan >= 0 ? ` · ${total - hechas} sin hacer` : ''}.</p>
          <div class="row sq-fin-botones">
            ${faltan >= 0 ? `<button class="btn" data-action="sq-ir" data-i="${faltan}">Volver a las que faltan</button>` : ''}
            <button class="btn primary" data-action="sq-salir">Terminar</button>
          </div>
        </div>
      </div>`;
    return;
  }

  const t = tareaExistente(cola.ids[cola.i]);
  if (contacto(t.contactId)) {
    location.replace('#/contacto/' + t.contactId);
    return;
  }
  prepararLlamadaCola(t, null);
  app.innerHTML = `
    ${cabeceraColaHTML()}
    <div class="sq-grid sq-grid-fin">
      <section class="card sq-tarea">${tareaColaHTML(t, null, false)}</section>
    </div>`;
  activarNotaCola(t);
}
