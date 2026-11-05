// Acciones realizadas y próximas: la línea de tiempo de la ficha y el formulario.
import { tipoAccionDe, TIPOS_ACCION } from './schema.js';
import { tocar } from '../contacts/store.js';
import { ACCION_A_NOTA } from '../notes/schema.js';
import { nota } from '../notes/store.js';
import { REUNIONES } from '../tasks/schema.js';
import { conLocal } from '../settings/horas.js';
import { fmtFecha, fmtRelativa, hoy } from '../../shared/lib/dates.js';
import { ahora, esc, uid } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db } from '../../shared/state.js';
import { editorHTML } from '../../shared/ui/editor-md.js';
import { campo, opciones } from '../../shared/ui/html.js';
import { ico } from '../../shared/ui/icons.js';
import { abrirModal, botonBorrarModal } from '../../shared/ui/modal.js';

/** Una acción realizada en la línea de tiempo. @param {import('./schema.js').AccionRealizada} a */
export function accionHTML(a) {
  const t = tipoAccionDe(a.tipo);
  const n = a.noteId && nota(a.noteId);
  return `
    <div class="tl-item" style="--c:${t.color}">
      <span class="tl-punto" title="${t.label}">${ico(t.icon)}</span>
      <div class="tl-cuerpo" data-action="editar-accion" data-id="${a.id}" title="Editar acción">
        <div class="tl-cabecera">
          <strong>${t.label}</strong>
          <time>${fmtFecha(a.fecha)}${a.hora ? ` · ${conLocal(a.hora, a.fecha)}` : ''}</time>
        </div>
        ${a.resumen ? `<div class="tl-texto">${esc(a.resumen)}</div>` : ''}
        ${n ? `<button class="link-btn small" data-action="ver-nota" data-id="${n.id}">${ico('nota')} ${!n.titulo || n.titulo === a.resumen ? 'Ver nota' : esc(n.titulo)}</button>` : ''}
      </div>
    </div>`;
}

/** Una tarea con tipo de acción, en «Próximas». @param {import('../tasks/schema.js').Tarea} t */
export function accionFuturaHTML(t) {
  const ta = tipoAccionDe(t.accion);
  const vencida = t.fecha && t.fecha < hoy();
  return `
    <div class="tl-item futura" style="--c:${ta.color}">
      <span class="tl-punto" title="${ta.label}">${ico(ta.icon)}</span>
      <div class="tl-cuerpo" data-action="editar-tarea" data-id="${t.id}" title="Editar tarea">
        <div class="tl-cabecera">
          <strong>${esc(t.titulo)}</strong>
        </div>
        <div class="tl-texto ${vencida ? 'txt-danger' : ''}">
          ${t.fecha ? fmtRelativa(t.fecha) : 'Sin fecha'}${t.hora ? ` · ${conLocal(t.hora, t.fecha || hoy())}` : ''} · ${ta.label}
        </div>
        ${t.noteId && nota(t.noteId) ? `<button class="link-btn small" data-action="ver-nota" data-id="${t.noteId}">${ico('nota')} Ver nota</button>` : ''}
      </div>
      <div class="tl-botones">
        <button class="btn sm hecho-btn" data-action="completar-accion" data-id="${t.id}" title="Marcar como hecha y pasarla a Realizadas">✓</button>
        ${REUNIONES.includes(/** @type {string} */ (t.accion)) ? `<button class="btn sm cancelada-btn" data-action="cancelar-reunion" data-id="${t.id}" title="La reunión no se hizo: pasa a Realizadas como «Reunión cancelada»">${ico('cancelado')}</button>` : ''}
      </div>
    </div>`;
}

// Registrar una acción nueva (con una nota opcional) o editar una existente.
/** Registrar una acción nueva o editar `a`. @param {string} contactId @param {import('./schema.js').AccionRealizada} [a] */
export function modalAccion(contactId, a) {
  const nueva = !a;
  const v = a || { tipo: 'llamada', fecha: hoy(), hora: '', resumen: '' };
  const n = a?.noteId && nota(a.noteId);
  abrirModal(nueva ? 'Registrar acción' : 'Editar acción', `
    <div class="row3">
      ${campo('Tipo', `<select name="tipo">${opciones(TIPOS_ACCION, v.tipo)}</select>`)}
      ${campo('Fecha', `<input type="date" name="fecha" required value="${esc(v.fecha)}">`)}
      ${campo('Hora (España)', `<input type="time" name="hora" value="${esc(v.hora)}">`)}
    </div>
    <p class="muted small">Para algo que todavía no has hecho, usa <b>+ Planear</b>: queda como acción próxima.</p>
    ${campo('Resumen', `<input name="resumen" value="${esc(v.resumen)}" placeholder="Ej. Le he mandado la propuesta por WhatsApp">`)}
    ${n
      ? `<p class="muted small">${ico('nota')} Tiene asociada la nota «${esc(n.titulo || fmtFecha(n.fecha))}». Edítala desde la columna de notas.</p>`
      : `<div class="field"><span>Nota asociada (opcional)</span>${editorHTML('nota', '', 6, 'Se guardará como nota de este contacto, enlazada a la acción')}</div>`}
  `, (d) => {
    const datos = { tipo: d.tipo, fecha: d.fecha || hoy(), hora: d.hora || null, resumen: d.resumen.trim() };
    let ac = /** @type {import('./schema.js').AccionRealizada} */ (a);
    if (nueva) {
      ac = { id: uid(), contactId, noteId: null, taskId: null, creado: ahora(), ...datos };
      db.actions.push(ac);
    } else {
      Object.assign(ac, datos);
    }
    if (d.nota?.trim()) {
      const nn = {
        id: uid(), contactId, tipo: ACCION_A_NOTA[d.tipo] || 'general', titulo: datos.resumen,
        contenido: d.nota.trim(), fecha: datos.fecha, fijada: false, creado: ahora(),
      };
      db.notes.push(nn);
      ac.noteId = nn.id;
    }
    tocar(contactId);
    guardar();
    render();
  });
  if (!nueva) {
    botonBorrarModal(() => {
      if (!confirm('¿Eliminar esta acción? La nota asociada, si la hay, se conserva.')) return false;
      db.actions = db.actions.filter((x) => x.id !== a.id);
      guardar();
      render();
    });
  }
}
