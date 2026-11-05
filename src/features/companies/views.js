// Empresas: la tabla (#/empresas), la ficha (#/empresa/<id>) y el formulario.
import { COLUMNAS_EMPRESA, esNurturing, ESTADOS_LEAD } from './schema.js';
import { contactosDeEmpresa, empresaExistente, empresasOrdenadas, nurturingDe, propEmpresa, propsVisibles, propVisible } from './store.js';
import { propietarioHTML, proximaTareaHTML, selectEstado } from '../contacts/views/list.js';
import { fmtFecha } from '../../shared/lib/dates.js';
import { markdown } from '../../shared/lib/markdown.js';
import { ahora, esc, iniciales, uid } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { inputProp, textoProp, valorProp } from '../../shared/schema.js';
import { db, ui } from '../../shared/state.js';
import { $, app } from '../../shared/ui/dom.js';
import { editorHTML } from '../../shared/ui/editor-md.js';
import { campo, opciones } from '../../shared/ui/html.js';
import { ico } from '../../shared/ui/icons.js';
import { abrirModal, modal } from '../../shared/ui/modal.js';

/** @typedef {import('./schema.js').Empresa} Empresa */

export function vistaEmpresas() {
  app.innerHTML = `
    <div class="page-head">
      <h1>Empresas <span class="h1-count">${db.companies.length}</span></h1>
      <button class="btn primary" data-action="nueva-empresa">+ Nueva empresa</button>
    </div>
    <div class="toolbar filtros-bar">
      <input type="search" id="e-q" class="grow" placeholder="Buscar empresa, sector o ciudad…" value="${esc(ui.empresasQ)}">
      ${propVisible(propEmpresa('estadoLead')) ? `
        <select id="e-estado" class="filtro ${ui.empresasEstado ? 'on' : ''}" title="Estado lead">
          <option value="">Estado lead: todos</option>
          <option value="ninguno" ${ui.empresasEstado === 'ninguno' ? 'selected' : ''}>Sin estado lead</option>
          ${opciones(ESTADOS_LEAD, ui.empresasEstado)}
        </select>` : ''}
    </div>
    <div id="tabla-empresas"></div>`;
  $('#e-q').addEventListener('input', (/** @type {Event} */ e) => { ui.empresasQ = /** @type {HTMLInputElement} */ (e.target).value; renderTablaEmpresas(); });
  $('#e-estado')?.addEventListener('change', (/** @type {Event} */ e) => { ui.empresasEstado = /** @type {HTMLSelectElement} */ (e.target).value; vistaEmpresas(); });
  renderTablaEmpresas();
}

function renderTablaEmpresas() {
  const cont = $('#tabla-empresas');
  if (!db.companies.length) {
    cont.innerHTML = `
      <div class="empty card">
        <p><strong>Aún no hay empresas.</strong></p>
        <p class="muted">Se crean solas al poner la empresa de un contacto, o puedes añadirlas aquí.</p>
        <button class="btn primary" data-action="nueva-empresa">+ Nueva empresa</button>
      </div>`;
    return;
  }
  const q = ui.empresasQ.trim().toLowerCase();
  const fe = ui.empresasEstado;
  const lista = empresasOrdenadas()
    .filter((e) => !fe || (fe === 'ninguno' ? !e.estadoLead : e.estadoLead === fe))
    .filter((e) => !q || [e.nombre, e.sector, e.ciudad, e.web].some((v) => (v || '').toLowerCase().includes(q)));
  if (!lista.length) {
    cont.innerHTML = '<div class="empty card"><p class="muted">Ninguna empresa coincide.</p></div>';
    return;
  }
  const columnas = COLUMNAS_EMPRESA.map(propEmpresa).filter(propVisible);
  cont.innerHTML = `
    <div class="card table-wrap">
      <table class="tabla">
        <thead><tr><th>Empresa</th><th>Contactos</th>${columnas.map((p) => `<th class="${p.id === 'web' ? 'col-nota' : ''}">${esc(p.label)}</th>`).join('')}</tr></thead>
        <tbody>
          ${lista.map((e) => {
            const cs = contactosDeEmpresa(e.id);
            return `
              <tr data-action="abrir-empresa" data-id="${e.id}">
                <td><div class="persona centrado"><span class="avatar sm cuadrado">${ico('empresa')}</span><strong>${esc(e.nombre)}</strong></div></td>
                <td class="small">${cs.length ? `${cs.length} <span class="muted">· ${esc(cs.slice(0, 2).map((c) => c.nombre).join(', '))}${cs.length > 2 ? '…' : ''}</span>` : '<span class="muted">0</span>'}</td>
                ${columnas.map((p) => `<td class="small ${p.id === 'web' ? 'col-nota' : ''}">${textoProp(e, p) || '<span class="muted">—</span>'}${p.id === 'estadoLead' && nurturingDe(e) ? `<div class="muted">${esc(nurturingDe(e))}</div>` : ''}</td>`).join('')}
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

/** La ficha de la empresa (solo se pinta si existe). @param {string} id */
export function vistaEmpresa(id) {
  const e = empresaExistente(id);
  const cs = contactosDeEmpresa(id).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  /** @param {string} label @param {string} valor HTML */
  const dato = (label, valor) => (valor ? `<dt>${esc(label)}</dt><dd>${valor}</dd>` : '');
  const datos = [
    ...propsVisibles().filter((p) => !p.nurturing || esNurturing(e.estadoLead)).map((p) => dato(p.label, textoProp(e, p))),
    dato('Alta', fmtFecha(e.creado)),
  ].join('');
  app.innerHTML = `
    <a href="#/empresas" class="back">← Empresas</a>
    <div class="empresa-grid">
      <aside class="card tarjeta-contacto">
        <div class="tc-cabecera">
          <span class="avatar lg cuadrado">${ico('empresa')}</span>
          <div class="grow">
            <h1>${esc(e.nombre)}</h1>
            <p class="muted small">${esc([e.sector, e.ciudad].filter(Boolean).join(' · ')) || '&nbsp;'}</p>
          </div>
          <span class="td-pop-wrap">
            <button type="button" class="icon-btn" data-td-pop aria-haspopup="true" title="Más opciones">${ico('puntos')}</button>
            <div class="td-pop pop-derecha" hidden>
              <button type="button" data-action="editar-empresa" data-id="${e.id}">${ico('editar')} Editar empresa</button>
              <button type="button" class="pop-peligro" data-action="borrar-empresa" data-id="${e.id}">${ico('papelera')} Eliminar empresa</button>
            </div>
          </span>
        </div>
        ${datos ? `<dl class="tc-datos">${datos}</dl>` : ''}
        ${e.notas ? `<div class="md small empresa-notas">${markdown(e.notas)}</div>` : ''}
      </aside>

      <section class="empresa-contactos">
        <div class="col-titulo">
          <h2>Contactos <span class="count">${cs.length}</span></h2>
          <div class="row">
            <button class="btn sm primary" data-action="nuevo-contacto-empresa" data-id="${e.id}">+ Añadir contacto</button>
          </div>
        </div>
        ${cs.length ? `
          <div class="card table-wrap">
            <table class="tabla">
              <thead><tr><th>Contacto</th><th>Propietario</th><th>Estado</th><th>Próxima tarea</th></tr></thead>
              <tbody>
                ${cs.map((c) => `
                  <tr data-action="abrir-contacto" data-id="${c.id}">
                    <td><div class="persona"><span class="avatar sm">${esc(iniciales(c.nombre))}</span><div><strong>${esc(c.nombre)}</strong><div class="muted small">${esc(c.cargo)}</div></div></div></td>
                    <td class="small">${propietarioHTML(c)}</td>
                    <td>${selectEstado(c)}</td>
                    <td class="small">${proximaTareaHTML(c)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty card"><p class="muted">Esta empresa todavía no tiene contactos.</p></div>'}
      </section>
    </div>`;
}

/** Nueva empresa (sin `e`) o editar `e`. @param {Empresa | null} [e] */
export function modalEmpresa(e) {
  const nueva = !e;
  /** @type {Partial<Empresa>} */
  const v = e || {};
  const editables = propsVisibles().filter((p) => !p.soloLectura);
  /** @param {import('../../shared/schema.js').Campo} p */
  const campoProp = (p) => campo(esc(p.label), inputProp(p, valorProp(v, p)), p.tipo === 'textoLargo' ? 'ancho' : '');
  abrirModal(nueva ? 'Nueva empresa' : 'Editar empresa', `
    ${campo('Nombre *', `<input name="nombre" required value="${esc(v.nombre)}">`)}
    <div class="row2 props-grid">
      ${editables.filter((p) => !p.nurturing).map(campoProp).join('')}
    </div>
    ${editables.some((p) => p.nurturing) ? `
      <fieldset class="nurturing-campos" ${esNurturing(v.estadoLead) ? '' : 'hidden'}>
        <legend>♻ Nurturing</legend>
        <div class="row2 props-grid">${editables.filter((p) => p.nurturing).map(campoProp).join('')}</div>
      </fieldset>` : ''}
    <div class="field"><span>Notas</span>${editorHTML('notas', v.notas || '', 4, 'Lo que sepas de la empresa: sedes, tamaño, quién decide…')}</div>
  `, (d) => {
    const nombre = d.nombre.trim();
    if (!nombre) return false;
    const otra = db.companies.find((x) => x !== e && x.nombre.toLowerCase() === nombre.toLowerCase());
    if (otra) {
      alert(`Ya existe la empresa «${otra.nombre}».`);
      return false;
    }
    // Las propiedades ocultas en Ajustes no se tocan: conservan el valor que tuvieran.
    /** @type {Record<string, any>} */
    const datos = { nombre, notas: d.notas.trim() };
    /** @type {Record<string, string>} */
    const extra = { ...(v.extra || {}) };
    editables.forEach((p) => {
      const valor = String(d[`p-${p.id}`] ?? '').trim();
      if (p.extra) extra[p.id] = valor;
      else datos[p.id] = valor;
    });
    datos.extra = extra;
    if (nueva) {
      const ne = /** @type {Empresa} */ ({ id: uid(), creado: ahora(), ...datos });
      db.companies.push(ne);
      guardar();
      location.hash = '#/empresa/' + ne.id;
    } else {
      Object.assign(e, datos);
      guardar();
      render();
    }
  });
  // Las propiedades de nurturing aparecen al poner la empresa en nurturing (como en HubSpot).
  $('[name="p-estadoLead"]', modal)?.addEventListener('change', (/** @type {Event} */ ev) => {
    const caja = $('.nurturing-campos', modal);
    if (caja) caja.hidden = !esNurturing(/** @type {HTMLSelectElement} */ (ev.target).value);
  });
}
