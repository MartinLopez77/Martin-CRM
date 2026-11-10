// Contactos: la ficha (#/contacto/<id>) con su tarjeta, pestañas (notas, tareas, canales) y acciones.
// Los datos de la tarjeta se editan pulsándolos (salvo la empresa, que relaciona el contacto con ella).
import { CAMPOS_CONTACTO, HUBSPOT_ESTADOS, urlHubspot } from '../schema.js';
import { contactoExistente } from '../store.js';
import { panelCanales } from './canales.js';
import { selectEstado } from './list.js';
import {
  contactosDeEmpresa, empresa, empresaDe, nurturingDe, propEmpresa, propVisible,
} from '../../companies/store.js';
import { accionesDe } from '../../activity/store.js';
import { accionFuturaHTML, accionHTML } from '../../activity/views.js';
import { notasDe } from '../../notes/store.js';
import { renderNotasContacto } from '../../notes/views.js';
import { anadirTareaHTML, editorTareaHTML } from '../../tasks/editor.js';
import { ordenTareas, pendientesDe } from '../../tasks/store.js';
import { tareaHTML } from '../../tasks/views/list.js';
import { enModoCola, limpiarCola, tareaColaActual } from '../../queue/store.js';
import { cabeceraColaHTML, prepararLlamadaCola } from '../../queue/views.js';
import { inscripcionActiva, secuencia } from '../../sequences/store.js';
import { opcionesUsuarios } from '../../team/store.js';
import { textoProp } from '../../../shared/schema.js';
import { fmtFecha, hoy } from '../../../shared/lib/dates.js';
import { esc, iniciales, plural } from '../../../shared/lib/text.js';
import { db, ui } from '../../../shared/state.js';
import { $, app } from '../../../shared/ui/dom.js';
import { ico } from '../../../shared/ui/icons.js';
import { dato, datoEditable } from '../../../shared/ui/html.js';
import { enlaceWeb } from '../../../shared/ui/links.js';

/** @typedef {import('../schema.js').Contacto} Contacto */

// Pestañas de la columna central de la ficha. Canales reúne WhatsApp y correo.
const PESTANAS_FICHA = [
  { id: 'notas', label: 'Notas', icono: 'nota' },
  { id: 'tareas', label: 'Tareas', icono: 'check' },
  { id: 'canales', label: 'Canales', icono: 'chat' },
];

/**
 * Un dato del contacto que se edita pulsándolo.
 * @param {Contacto} c
 * @param {string} campo id de CAMPOS_CONTACTO
 * @param {string} valor HTML que se muestra
 */
function editable(c, campo, valor) {
  const label = CAMPOS_CONTACTO.find((p) => p.id === campo)?.label || campo;
  return datoEditable(label, valor, `data-action="editar-campo-contacto" data-id="${c.id}" data-campo="${campo}"`);
}

/** La ficha del contacto (solo se pinta si existe). @param {string} id */
export function vistaContacto(id) {
  const c = contactoExistente(id);
  if (ui.contactoActual !== id) {
    ui.contactoActual = id;
    ui.notasContactoQ = '';
  }
  if (ui.tareaDestacada) ui.fichaTab = 'tareas';

  // Haciendo las tareas una detrás de otra: arriba solo la barra «Tarea 2 de 10» con la tarea en curso.
  limpiarCola();
  const tCola = enModoCola() ? tareaColaActual() : null;
  const llamando = tCola ? prepararLlamadaCola(tCola, c) : false;

  const notas = notasDe(id);
  const pend = pendientesDe(id).sort(ordenTareas);
  const futuras = pend.filter((t) => t.accion);
  const realizadas = accionesDe(id);
  const emp = empresa(c.companyId);
  const pLead = propEmpresa('estadoLead');

  const masDatos = [
    editable(c, 'cargo', esc(c.cargo)),
    editable(c, 'web', c.web ? enlaceWeb(c.web) : ''),
    editable(c, 'ciudad', esc(c.ciudad)),
    editable(c, 'origen', esc(c.origen)),
    editable(c, 'etiquetas', (c.etiquetas || []).map((e) => `<span class="tag">${esc(e)}</span>`).join(' ')),
    dato('Importación', c.importacion ? `<button class="link-btn" data-action="ver-importacion" data-nombre="${esc(c.importacion)}">${esc(c.importacion)}</button>` : ''),
    dato('HubSpot', c.hubspotId ? `<a href="${urlHubspot(c.hubspotId)}" target="_blank" rel="noopener">Ver en HubSpot ↗</a>${c.hubspotEstado ? `<br><span class="muted">${esc(HUBSPOT_ESTADOS[c.hubspotEstado] || c.hubspotEstado)}</span>` : ''}` : ''),
    dato('Alta', fmtFecha(c.creado)),
  ].join('');

  /** @type {Record<string, number>} */
  const cuenta = { notas: notas.length, tareas: pend.length };
  // Las antiguas pestañas WhatsApp y Correo son ahora Canales.
  if (ui.fichaTab === 'whatsapp' || ui.fichaTab === 'correo') { ui.canal = ui.fichaTab; ui.fichaTab = 'canales'; }
  const tab = PESTANAS_FICHA.find((p) => p.id === ui.fichaTab) || PESTANAS_FICHA[0];

  app.innerHTML = `
    ${tCola ? `<div class="cola-ficha">${cabeceraColaHTML({ t: tCola, c, llamando })}</div>` : '<a href="#/" class="back">← Contactos</a>'}

    <div class="ficha-grid">
      <aside class="col-izq">
        <section class="card tarjeta-contacto">
          <div class="tc-cabecera">
            <span class="avatar lg">${esc(iniciales(c.nombre))}</span>
            <div class="grow">
              <h1 class="editable" data-action="editar-campo-contacto" data-id="${c.id}" data-campo="nombre" title="Pulsa para editar el nombre">${esc(c.nombre)}</h1>
              <p class="muted small">${esc([c.cargo, empresaDe(c)].filter(Boolean).join(' · ')) || '&nbsp;'}</p>
            </div>
            <span class="td-pop-wrap">
              <button type="button" class="icon-btn" data-td-pop aria-haspopup="true" title="Más opciones">${ico('puntos')}</button>
              <div class="td-pop pop-derecha" hidden>
                <button type="button" data-action="editar-contacto" data-id="${c.id}">${ico('editar')} Editar contacto</button>
                <button type="button" class="pop-peligro" data-action="borrar-contacto" data-id="${c.id}">${ico('papelera')} Eliminar contacto</button>
              </div>
            </span>
          </div>
          <div class="tc-acciones">
            <button type="button" data-action="nueva-nota" data-id="${c.id}"><span class="tc-circulo">${ico('nota')}</span>Nota</button>
            <button type="button" data-action="mandar-email" data-id="${c.id}"><span class="tc-circulo">${ico('correo')}</span>Email</button>
            <button type="button" data-action="llamar" data-id="${c.id}"><span class="tc-circulo">${ico('telefono')}</span>Llamar</button>
          </div>
          <dl class="tc-datos">
            ${editable(c, 'email', c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '')}
            ${editable(c, 'telefono', c.telefono ? `<a href="tel:${esc(c.telefono)}">${esc(c.telefono)}</a>` : '')}
            <dt>Empresa</dt>
            <dd>${emp ? `<a href="#/empresa/${c.companyId}">${esc(empresaDe(c))}</a>${contactosDeEmpresa(c.companyId).length > 1 ? ` <span class="muted small">· ${contactosDeEmpresa(c.companyId).length - 1} contacto${contactosDeEmpresa(c.companyId).length === 2 ? '' : 's'} más</span>` : ''}` : '<span class="muted">—</span>'}</dd>
            ${emp && propVisible(pLead) ? `
              <dt>Estado lead</dt>
              <dd>${textoProp(emp, pLead) || '<span class="muted">—</span>'}${nurturingDe(emp) ? `<div class="muted small">${esc(nurturingDe(emp))}</div>` : ''}</dd>` : ''}
            <dt>Estado</dt>
            <dd>${selectEstado(c)}</dd>
            <dt>Propietario</dt>
            <dd><select class="propietario-select" data-id="${c.id}">${opcionesUsuarios(c.ownerId)}</select></dd>
            <dt>Secuencia</dt>
            <dd>${(() => {
              const ins = inscripcionActiva(c.id);
              const s = ins && secuencia(ins.sequenceId);
              if (!s) return `<button class="link-btn" data-action="inscribir-contacto" data-id="${c.id}">${ico('secuencia')} Inscribir</button>`;
              return `<a href="#/secuencias/${s.id}">${esc(s.nombre)}</a> <span class="muted small">· paso ${ins.paso + 1}/${s.pasos.length}</span>
                <button class="link-btn small txt-peligro" data-action="sacar-secuencia" data-id="${ins.id}">Sacar</button>`;
            })()}</dd>
          </dl>
        </section>

        ${masDatos ? `
          <details class="card pad datos-card" id="datos-contacto" ${ui.datosAbiertos ? 'open' : ''}>
            <summary><h3>Más datos</h3></summary>
            <dl class="datos">${masDatos}</dl>
          </details>` : ''}
      </aside>

      <section class="col-notas">
        <div class="vistas-tabs ficha-tabs">
          ${PESTANAS_FICHA.map((p) => `
            <button class="vista-tab ${p.id === tab.id ? 'active' : ''}" data-action="ficha-tab" data-tab="${p.id}">
              ${ico(p.icono)} ${p.label}${cuenta[p.id] ? ` <span class="count">${cuenta[p.id]}</span>` : ''}
            </button>`).join('')}
        </div>
        <div id="ficha-panel">${panelFicha(tab.id, c)}</div>
      </section>

      <aside class="col-acciones">
        <div class="col-titulo">
          <h2>Acciones</h2>
          <div class="row">
            <button class="btn sm" data-action="planear-accion" data-id="${c.id}" title="Planear una acción futura (crea una tarea)">+ Planear</button>
            <button class="btn sm" data-action="nueva-accion" data-id="${c.id}" title="Registrar algo que ya has hecho">+ Registrar</button>
          </div>
        </div>
        <div class="card pad timeline">
          <h4 class="tl-seccion">Próximas</h4>
          ${futuras.length ? futuras.map(accionFuturaHTML).join('') : '<p class="muted small tl-vacio">Nada planeado. Crea una tarea con tipo de acción (llamada, WhatsApp…) y aparecerá aquí.</p>'}
          <h4 class="tl-seccion">Realizadas <span class="count">${realizadas.length}</span></h4>
          ${realizadas.length ? realizadas.map(accionHTML).join('') : '<p class="muted small tl-vacio">Aún no hay acciones registradas.</p>'}
        </div>
      </aside>
    </div>`;

  $('#datos-contacto')?.addEventListener('toggle', (/** @type {Event} */ e) => { ui.datosAbiertos = /** @type {HTMLDetailsElement} */ (e.target).open; });
  activarPanelFicha(tab.id, c);

  // Llegando desde Tareas: se resalta la tarea pulsada (desde aquí se edita).
  const fila = ui.tareaDestacada && $(`.td-ficha [data-tarea="${ui.tareaDestacada}"]`, app);
  ui.tareaDestacada = null;
  if (fila) {
    const plegada = fila.closest('details');
    if (plegada) plegada.open = true;
    setTimeout(() => fila.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    fila.classList.add('destacada');
    setTimeout(() => fila.classList.remove('destacada'), 2000);
  }
}

/** @param {string} tab @param {Contacto} c */
function panelFicha(tab, c) {
  if (tab === 'tareas') return panelTareasFicha(c);
  if (tab === 'canales') return panelCanales(c);
  const notas = notasDe(c.id);
  return `
    <div class="col-titulo">
      <span class="muted small">${notas.length ? '' : 'Sin notas todavía'}</span>
      <button class="btn sm" data-action="nueva-nota" data-id="${c.id}">+ Nota</button>
    </div>
    ${notas.length ? `
      <div class="notas-filtros">
        <input type="search" id="nc-q" placeholder="Buscar en las notas…" value="${esc(ui.notasContactoQ)}">
      </div>` : ''}
    <div id="notas-contacto" class="notas"></div>`;
}

/** @param {string} tab @param {Contacto} c */
function activarPanelFicha(tab, c) {
  if (tab === 'notas') {
    $('#nc-q')?.addEventListener('input', (/** @type {Event} */ e) => { ui.notasContactoQ = /** @type {HTMLInputElement} */ (e.target).value; renderNotasContacto(c.id); });
    renderNotasContacto(c.id);
  }
}

/** @param {Contacto} c */
function panelTareasFicha(c) {
  const pend = pendientesDe(c.id).sort(ordenTareas);
  const hechas = db.tasks
    .filter((t) => t.contactId === c.id && t.hecha)
    .sort((a, b) => (b.completada || '').localeCompare(a.completada || ''));
  return `
    <section class="card pad td-ficha">
      <div class="td-lista">${pend.map((t) => tareaHTML(t, false)).join('')}</div>
      ${!pend.length && ui.editor?.clave !== 'contacto' ? '<p class="muted small">No hay tareas pendientes con este contacto.</p>' : ''}
      ${ui.editor?.clave === 'contacto' ? editorTareaHTML({ contactId: c.id, fijo: true }) : anadirTareaHTML('contacto', hoy())}
      ${hechas.length ? `
        <details class="hechas">
          <summary>${hechas.length} completada${plural(hechas.length)}</summary>
          <div class="td-lista">${hechas.map((t) => tareaHTML(t, false)).join('')}</div>
        </details>` : ''}
    </section>`;
}
