// Tareas: editar una tarea (o planear una acción) en un modal.
import { TIPOS_ACCION } from '../../activity/schema.js';
import { opcionesContactos, tocar } from '../../contacts/store.js';
import { nota } from '../../notes/store.js';
import { campoLista, tituloLimpio, tituloNlp } from '../editor.js';
import { PRIORIDADES } from '../schema.js';
import { borrarTarea, guardarNotaDeTarea, marcarTarea } from '../store.js';
import { avisoSecuencia } from '../../sequences/store.js';
import { fechaAtajo } from '../../../shared/lib/dates.js';
import { ahora, esc, uid } from '../../../shared/lib/text.js';
import { guardar } from '../../../shared/persistence.js';
import { render } from '../../../shared/router.js';
import { db } from '../../../shared/state.js';
import { $ } from '../../../shared/ui/dom.js';
import { editorHTML } from '../../../shared/ui/editor-md.js';
import { campo, campoFecha, opciones } from '../../../shared/ui/html.js';
import { ico } from '../../../shared/ui/icons.js';
import { abrirModal, botonBorrarModal, modal } from '../../../shared/ui/modal.js';

// Editar una tarea, o crear una nueva (`nueva` con contactId/accion por defecto, p. ej. desde "+ Planear").
/**
 * @param {import('../schema.js').Tarea | null | undefined} t
 * @param {{ contactId?: string, accion?: string } | null} [nueva] valores por defecto de una tarea nueva
 */
export function modalTarea(t, nueva = null) {
  const creando = !t;
  /** @type {Partial<import('../schema.js').Tarea>} */
  const v = t || { titulo: '', detalle: '', contactId: nueva?.contactId || null, accion: nueva?.accion || null, fecha: fechaAtajo('manana'), hora: '', prioridad: 'ninguna', hecha: false };
  const n = v.noteId ? nota(v.noteId) : undefined;
  abrirModal(creando ? (v.accion ? 'Planear acción' : 'Nueva tarea') : 'Editar tarea', `
    ${campo('Tarea *', tituloNlp(/** @type {string} */ (v.titulo), v.accion ? 'Ej. Llamar el jueves a las 17 para ver qué le pareció la propuesta' : 'Puedes escribir la fecha: mañana, el lunes, a las 17…'))}
    <div class="row2">
      ${campo('Contacto', `<select name="contactId">${opcionesContactos(v.contactId)}
      </select>`)}
      ${campo('Tipo de acción', `<select name="accion" ${creando ? '' : 'data-manual="1"'}>
        <option value="">Tarea interna</option>
        ${opciones(TIPOS_ACCION, v.accion)}
      </select>`)}
    </div>
    <div class="row3">
      ${campo('Fecha', campoFecha('fecha', v.fecha))}
      ${campo('Hora (España)', `<input type="time" name="hora" value="${esc(v.hora)}">`)}
      ${campo('Prioridad', `<select name="prioridad">${opciones(PRIORIDADES, v.prioridad)}</select>`)}
    </div>
    <div class="row2">
      ${campo('Detalle', `<input name="detalle" value="${esc(v.detalle)}" placeholder="Una línea de contexto (opcional)">`)}
      ${campo('Lista', campoLista(v.lista), `campo-lista ${v.contactId ? 'oculto' : ''}`)}
    </div>
    ${n && !n.contactId && (n.titulo || n.telefono) ? `
      <p class="muted small">${ico('nota')} ${esc(n.titulo)}${n.telefono ? ` · <a href="tel:${esc(n.telefono)}">${ico('telefono')} ${esc(n.telefono)}</a>` : ''}. Al elegirle un contacto, la nota pasa a su ficha.</p>` : ''}
    <div class="field"><span>${ico('nota')} Nota asociada ${n ? '' : '(opcional)'}</span>${editorHTML('nota', n?.contenido || '', 6, 'Lo importante para esta acción: qué preguntar, qué llevar preparado…')}</div>
    ${creando ? '' : `<label class="check"><input type="checkbox" name="hecha" ${v.hecha ? 'checked' : ''}> Completada${v.cancelada ? ' (reunión cancelada)' : ''}</label>`}
  `, (d) => {
    const titulo = tituloLimpio($('[name=titulo]', modal));
    if (!titulo) return false;
    const tt = t || /** @type {import('../schema.js').Tarea} */ ({ id: uid(), hecha: false, completada: null, creado: ahora() });
    const antes = tt.contactId;
    Object.assign(tt, {
      titulo,
      detalle: d.detalle.trim(),
      contactId: d.contactId || null,
      lista: (!d.contactId && d.lista?.trim()) || null,
      accion: d.accion || null,
      fecha: d.fecha || null,
      hora: d.hora || null,
      prioridad: d.prioridad,
    });
    if (creando) db.tasks.push(tt);
    guardarNotaDeTarea(tt, d.nota);
    if (!creando && d.hecha !== tt.hecha) marcarTarea(tt, d.hecha);
    tocar(antes);
    tocar(tt.contactId);
    guardar();
    render();
  });
  // La lista solo tiene sentido en las tareas sin contacto.
  $('form', modal).contactId.addEventListener('change', (/** @type {Event} */ e) => $('.campo-lista', modal).classList.toggle('oculto', !!/** @type {HTMLSelectElement} */ (e.target).value));
  if (!creando) {
    botonBorrarModal(() => {
      if (!confirm(`¿Eliminar la tarea "${t.titulo}"?${n && n.contactId ? ' Su nota se conserva.' : ''}${avisoSecuencia(t)}`)) return false;
      borrarTarea(t);
      guardar();
      render();
    });
  }
}
