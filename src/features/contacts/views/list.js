// Contactos: la tabla (#/) con vistas guardadas, filtros, orden y selección masiva, como en HubSpot.
import { COLUMNAS, estadoDe, ESTADOS, FILTROS_VACIOS, ORDEN_DEFECTO } from '../schema.js';
import {
  cambiarContacto, cargarVista, filtrarContactos, ordenarContactos, seleccionados, todasLasVistas,
  vistaActual, vistaModificada
} from '../store.js';
import {
  accionesDe, avatarUsuario, conLocal, empresa, empresasOrdenadas, inscripcionActiva,
  nombresImportaciones, nombreUsuario, pendientesDe, proximaTarea, secuencia, tipoAccionDe, usuario,
} from '../../../legacy.js';
import { fmtFecha, fmtRelativa, hoy } from '../../../shared/lib/dates.js';
import { ahora, esc, iniciales, uid } from '../../../shared/lib/text.js';
import { guardar } from '../../../shared/persistence.js';
import { render } from '../../../shared/router.js';
import { db, ui } from '../../../shared/state.js';
import { $, app } from '../../../shared/ui/dom.js';
import { campo, opciones } from '../../../shared/ui/html.js';
import { ico } from '../../../shared/ui/icons.js';
import { abrirModal } from '../../../shared/ui/modal.js';
import { avisar } from '../../../shared/ui/toast.js';

/** @typedef {import('../schema.js').Contacto} Contacto */
/** @typedef {import('../schema.js').VistaContactos} VistaContactos */

/** Desplegable de estado (cambiarlo crea una nota de cambio). @param {Contacto} c */
export const selectEstado = (c) =>
  `<span class="estado" style="--c:${estadoDe(c.estado).color}"><select class="estado-select" data-id="${c.id}">${opciones(ESTADOS, c.estado)}</select></span>`;

/** @param {Contacto} c */
export const propietarioHTML = (c) =>
  c.ownerId ? `<span class="propietario">${avatarUsuario(c.ownerId)} ${esc(usuario(c.ownerId)?.nombre || '')}</span>` : '<span class="muted">—</span>';

/** @param {Contacto} c */
export function proximaTareaHTML(c) {
  const t = proximaTarea(c.id);
  if (!t) return '<span class="muted">—</span>';
  const h = hoy();
  const pend = pendientesDe(c.id).length;
  return `
    <div class="${t.fecha && t.fecha < h ? 'txt-danger' : ''}">${t.fecha ? fmtRelativa(t.fecha) : 'Sin fecha'}${t.hora ? ` · ${conLocal(t.hora, t.fecha || h)}` : ''}</div>
    <div class="muted truncate">${t.accion ? `${ico(tipoAccionDe(t.accion).icon)} ` : ''}${esc(t.titulo)}${pend > 1 ? ` <span class="muted">(+${pend - 1})</span>` : ''}</div>`;
}

export function vistaContactos() {
  if (!ui.filtros || !todasLasVistas().some((v) => v.id === ui.vistaId)) cargarVista(todasLasVistas().some((v) => v.id === ui.vistaId) ? ui.vistaId : 'todos');
  const f = ui.filtros;
  /** @param {string} id @param {string} valor @param {string} opcionesHTML @param {string} titulo */
  const sel = (id, valor, opcionesHTML, titulo) =>
    `<select id="${id}" class="filtro ${valor ? 'on' : ''}" title="${titulo}">${opcionesHTML}</select>`;
  /** @param {string} v @param {string} label @param {string} actual */
  const opt = (v, label, actual) => `<option value="${esc(v)}" ${v === actual ? 'selected' : ''}>${esc(label)}</option>`;
  const importaciones = nombresImportaciones();

  app.innerHTML = `
    <div class="page-head">
      <h1>Contactos <span class="h1-count">${db.contacts.length}</span></h1>
      <div class="row">
        <button class="btn" data-action="importar-csv">${ico('importar')} Importar CSV</button>
        <button class="btn primary" data-action="nuevo-contacto">+ Nuevo contacto</button>
      </div>
    </div>

    <div class="vistas-tabs">
      ${todasLasVistas().map((v) => `
        <button class="vista-tab ${v.id === ui.vistaId ? 'active' : ''}" data-action="vista-contactos" data-id="${v.id}">${esc(v.nombre)}</button>`).join('')}
      <button class="vista-tab vista-nueva" data-action="nueva-vista" title="Crear una vista con sus propios filtros">+ Añadir vista</button>
    </div>

    <div class="toolbar filtros-bar">
      <input type="search" id="f-q" class="grow" placeholder="Buscar por nombre, empresa, email, teléfono o ciudad…" value="${esc(f.q)}">
      ${sel('f-owner', f.ownerId, opt('', 'Propietario: todos', f.ownerId) + opt('ninguno', 'Sin propietario', f.ownerId)
        + db.users.map((u) => opt(u.id, nombreUsuario(u.id), f.ownerId)).join(''), 'Propietario')}
      ${sel('f-estado', f.estado, opt('', 'Estado: todos', f.estado) + ESTADOS.map((e) => opt(e.id, e.label, f.estado)).join(''), 'Estado')}
      ${sel('f-empresa', f.companyId, opt('', 'Empresa: todas', f.companyId) + opt('ninguna', 'Sin empresa', f.companyId)
        + empresasOrdenadas().map((e) => opt(e.id, e.nombre, f.companyId)).join(''), 'Empresa')}
      ${sel('f-tarea', f.tarea, opt('', 'Tareas: todas', f.tarea) + opt('vencida', 'Con tareas vencidas', f.tarea)
        + opt('hoy', 'Con tareas para hoy', f.tarea) + opt('sin', 'Sin tareas pendientes', f.tarea), 'Tareas pendientes')}
      ${sel('f-secuencia', f.secuencia, opt('', 'Secuencia: todas', f.secuencia) + opt('alguna', 'En alguna secuencia', f.secuencia)
        + opt('ninguna', 'En ninguna secuencia', f.secuencia) + db.sequences.map((s) => opt(s.id, `En «${s.nombre}»`, f.secuencia)).join(''), 'Secuencia')}
      ${importaciones.length ? sel('f-importacion', f.importacion, opt('', 'Importación: todas', f.importacion)
        + importaciones.map((n) => opt(n, n, f.importacion)).join(''), 'Importación en la que entró el contacto') : ''}
    </div>

    <div id="tabla-contactos"></div>`;

  $('#f-q').addEventListener('input', (/** @type {Event} */ e) => { ui.filtros.q = /** @type {HTMLInputElement} */ (e.target).value; renderTablaContactos(); });
  /** @type {[string, keyof import('../schema.js').FiltrosContactos][]} */
  const selects = [['f-owner', 'ownerId'], ['f-estado', 'estado'], ['f-empresa', 'companyId'], ['f-tarea', 'tarea'], ['f-secuencia', 'secuencia'], ['f-importacion', 'importacion']];
  selects.forEach(([id, k]) =>
    $('#' + id)?.addEventListener('change', (/** @type {Event} */ e) => { ui.filtros[k] = /** @type {HTMLSelectElement} */ (e.target).value; ui.seleccion.clear(); vistaContactos(); }));

  renderTablaContactos();
}

export function renderTablaContactos() {
  const cont = $('#tabla-contactos');
  if (!db.contacts.length) {
    cont.innerHTML = `
      <div class="empty card">
        <p><strong>Aún no hay contactos.</strong></p>
        <p class="muted">Empieza añadiendo tu primer cliente o lead.</p>
        <button class="btn primary" data-action="nuevo-contacto">+ Nuevo contacto</button>
      </div>`;
    return;
  }

  const lista = ordenarContactos(filtrarContactos(ui.filtros), ui.orden);
  const visibles = new Set(lista.map((c) => c.id));
  [...ui.seleccion].forEach((id) => !visibles.has(id) && ui.seleccion.delete(id));
  const nSel = ui.seleccion.size;
  const v = vistaActual();
  const modificada = vistaModificada();

  const barra = nSel ? `
    <div class="tabla-barra seleccion">
      <b>${nSel} seleccionado${nSel === 1 ? '' : 's'}</b>
      <button class="btn sm" data-action="masivo-propietario">${ico('persona')} Asignar propietario</button>
      <button class="btn sm" data-action="masivo-secuencia">${ico('secuencia')} Inscribir en secuencia</button>
      <button class="btn sm" data-action="masivo-estado">Cambiar estado</button>
      <button class="btn sm danger-ghost" data-action="masivo-borrar">${ico('papelera')} Eliminar</button>
      <span class="grow"></span>
      <button class="link-btn" data-action="quitar-seleccion">Quitar selección</button>
    </div>` : `
    <div class="tabla-barra">
      <span class="muted">${lista.length} contacto${lista.length === 1 ? '' : 's'}</span>
      <span class="grow"></span>
      ${modificada ? `
        <button class="link-btn" data-action="restablecer-vista">Descartar cambios</button>
        ${v.fija ? '' : '<button class="btn sm primary" data-action="guardar-vista">Guardar vista</button>'}
        <button class="btn sm ${v.fija ? 'primary' : ''}" data-action="nueva-vista" data-con-filtros="1">Guardar como vista nueva</button>` : ''}
      ${v.fija ? '' : `
        <button class="link-btn" data-action="renombrar-vista">Renombrar vista</button>
        <button class="link-btn txt-peligro" data-action="borrar-vista">Eliminar vista</button>`}
    </div>`;

  if (!lista.length) {
    cont.innerHTML = `${barra}<div class="empty card"><p class="muted">Ningún contacto coincide con los filtros de esta vista.</p></div>`;
    return;
  }

  /** @param {string} campo */
  const flecha = (campo) => (ui.orden.campo === campo ? (ui.orden.dir === 'asc' ? ' ↑' : ' ↓') : '');
  const todos = lista.every((c) => ui.seleccion.has(c.id));
  cont.innerHTML = `
    ${barra}
    <div class="card table-wrap">
      <table class="tabla">
        <thead>
          <tr>
            <th class="col-check"><label class="celda-check"><input type="checkbox" class="sel-todos" ${todos ? 'checked' : ''} aria-label="Seleccionar todos"></label></th>
            ${COLUMNAS.map((col) => `<th class="${col.clase || ''}"><button class="th-orden" data-action="ordenar" data-campo="${col.campo}">${col.label}${flecha(col.campo)}</button></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${lista.map((c) => {
            const a = accionesDe(c.id)[0];
            const emp = empresa(c.companyId);
            const ins = inscripcionActiva(c.id);
            const s = ins && secuencia(ins.sequenceId);
            const marcado = ui.seleccion.has(c.id);
            return `
              <tr data-action="abrir-contacto" data-id="${c.id}" class="${marcado ? 'seleccionada' : ''}">
                <td class="col-check"><label class="celda-check"><input type="checkbox" class="sel-contacto" data-id="${c.id}" ${marcado ? 'checked' : ''} aria-label="Seleccionar ${esc(c.nombre)}"></label></td>
                <td>
                  <div class="persona">
                    <span class="avatar sm">${esc(iniciales(c.nombre))}</span>
                    <div>
                      <strong>${esc(c.nombre)}</strong>
                      <div class="muted small">${esc(c.cargo)}${s ? ` <span class="seq-pill" title="En la secuencia «${esc(s.nombre)}»">${ico('secuencia')} ${ins.paso + 1}/${s.pasos.length}</span>` : ''}</div>
                    </div>
                  </div>
                </td>
                <td class="small">${emp ? `<a href="#/empresa/${emp.id}">${esc(emp.nombre)}</a>` : '<span class="muted">—</span>'}</td>
                <td class="small">${propietarioHTML(c)}</td>
                <td>${selectEstado(c)}</td>
                <td class="small">${proximaTareaHTML(c)}</td>
                <td class="col-nota small">
                  ${a ? `<div>${ico(tipoAccionDe(a.tipo).icon)} ${tipoAccionDe(a.tipo).label} · ${fmtFecha(a.fecha)}</div><div class="muted truncate">${esc(a.resumen)}</div>` : '<span class="muted">—</span>'}
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// Marcar filas: solo se vuelve a pintar la tabla (no se pierde el scroll ni la búsqueda).
app.addEventListener('change', (e) => {
  const cb = /** @type {HTMLInputElement} */ (e.target);
  if (cb.matches('.sel-contacto')) {
    if (cb.checked) ui.seleccion.add(/** @type {string} */ (cb.dataset.id));
    else ui.seleccion.delete(/** @type {string} */ (cb.dataset.id));
    renderTablaContactos();
  } else if (cb.matches('.sel-todos')) {
    if (cb.checked) filtrarContactos(ui.filtros).forEach((c) => ui.seleccion.add(c.id));
    else ui.seleccion.clear();
    renderTablaContactos();
  }
});

// Crea una vista (vacía, o con los filtros actuales si `conFiltros`), o renombra `v`.
/** @param {VistaContactos | null} v @param {boolean} [conFiltros] */
export function modalVista(v, conFiltros = false) {
  abrirModal(v ? 'Renombrar vista' : 'Nueva vista', `
    ${campo('Nombre de la vista *', `<input name="nombre" required value="${esc(v?.nombre)}" placeholder="Ej. Clínicas sin tareas">`)}
    ${v ? '' : `<p class="muted small">${conFiltros ? 'Se guarda con los filtros y el orden que tienes ahora.' : 'Empieza sin filtros: ponle los que quieras y pulsa «Guardar vista».'}</p>`}
  `, (d) => {
    const nombre = d.nombre.trim();
    if (!nombre) return false;
    if (v) v.nombre = nombre;
    else {
      const nv = { id: uid(), nombre, filtros: conFiltros ? { ...ui.filtros } : { ...FILTROS_VACIOS }, orden: conFiltros ? { ...ui.orden } : { ...ORDEN_DEFECTO } };
      db.views.push(nv);
      cargarVista(nv.id);
    }
    guardar();
    render();
  });
}

// Elegir un valor (propietario o estado) para todos los contactos seleccionados.
/**
 * @param {string} titulo
 * @param {string} campoHTML
 * @param {(c: Contacto, datos: import('../../../shared/ui/modal.js').DatosForm) => unknown} aplicar
 */
export function modalMasivo(titulo, campoHTML, aplicar) {
  const lista = seleccionados();
  abrirModal(`${titulo} · ${lista.length} contacto${lista.length === 1 ? '' : 's'}`, campoHTML, (d) => {
    lista.forEach((c) => {
      cambiarContacto(c, () => aplicar(c, d));
      c.actualizado = ahora();
    });
    ui.seleccion.clear();
    guardar();
    render();
    avisar(`${lista.length} contacto${lista.length === 1 ? '' : 's'} actualizado${lista.length === 1 ? '' : 's'}`);
  });
}
