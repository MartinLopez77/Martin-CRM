// Contactos: la ficha (#/contacto/<id>) con su tarjeta, pestañas (notas, tareas, WhatsApp, correo) y acciones.
import { HUBSPOT_ESTADOS, urlHubspot } from '../schema.js';
import { contacto, contactoExistente, tocar } from '../store.js';
import { selectEstado } from './list.js';
import {
  contactosDeEmpresa, empresa, empresaDe, nurturingDe, propEmpresa, propVisible,
} from '../../companies/store.js';
import {
  accionesDe, accionFuturaHTML, accionHTML, activarNotaCola, anadirTareaHTML, cabeceraColaHTML,
  editorTareaHTML, enModoCola, inscripcionActiva, limpiarCola, notasDe, opcionesUsuarios, ordenTareas,
  pendientesDe, prepararLlamadaCola, renderNotasContacto, secuencia, tareaColaActual, tareaColaHTML,
  tareaHTML, TIPOS_NOTA,
} from '../../../legacy.js';
import { textoProp } from '../../../shared/schema.js';
import { fmtFecha, horaActual, hoy } from '../../../shared/lib/dates.js';
import { ahora, esc, iniciales, uid } from '../../../shared/lib/text.js';
import { guardar } from '../../../shared/persistence.js';
import { render, rutaActual } from '../../../shared/router.js';
import { db, ui } from '../../../shared/state.js';
import { $, app } from '../../../shared/ui/dom.js';
import { ico } from '../../../shared/ui/icons.js';
import { avisar } from '../../../shared/ui/toast.js';

/** @typedef {import('../schema.js').Contacto} Contacto */

// Pestañas de la columna central de la ficha. WhatsApp y Correo son un primer borrador: todavía no
// están conectados, así que muestran lo registrado como acciones y abren WhatsApp o el correo para enviar.
const PESTANAS_FICHA = [
  { id: 'notas', label: 'Notas', icono: 'nota' },
  { id: 'tareas', label: 'Tareas', icono: 'check' },
  { id: 'whatsapp', label: 'WhatsApp', icono: 'chat', borrador: true },
  { id: 'correo', label: 'Correo', icono: 'correo', borrador: true },
];

/** La ficha del contacto (solo se pinta si existe). @param {string} id */
export function vistaContacto(id) {
  const c = contactoExistente(id);
  if (ui.contactoActual !== id) {
    ui.contactoActual = id;
    ui.notaFiltro = '';
    ui.notasContactoQ = '';
  }
  if (ui.tareaDestacada) ui.fichaTab = 'tareas';

  // Haciendo las tareas una detrás de otra: la tarea en curso va arriba, con «Tarea 2 de 10».
  limpiarCola();
  const tCola = enModoCola() ? tareaColaActual() : null;
  const llamando = tCola ? prepararLlamadaCola(tCola, c) : false;

  const notas = notasDe(id);
  const pend = pendientesDe(id).sort(ordenTareas);
  const futuras = pend.filter((t) => t.accion);
  const realizadas = accionesDe(id);
  const emp = empresa(c.companyId);
  const pLead = propEmpresa('estadoLead');

  /** @param {string} label @param {string} valor HTML */
  const dato = (label, valor) => (valor ? `<dt>${label}</dt><dd>${valor}</dd>` : '');
  const web = c.web ? (/^https?:\/\//.test(c.web) ? c.web : `https://${c.web}`) : '';
  const masDatos = [
    dato('Cargo', esc(c.cargo)),
    dato('Web', web ? `<a href="${esc(web)}" target="_blank" rel="noopener">${esc(/** @type {string} */ (c.web).replace(/^https?:\/\//, ''))}</a>` : ''),
    dato('Ciudad', esc(c.ciudad)),
    dato('Origen', esc(c.origen)),
    dato('Etiquetas', (c.etiquetas || []).map((e) => `<span class="tag">${esc(e)}</span>`).join(' ')),
    dato('Importación', c.importacion ? `<button class="link-btn" data-action="ver-importacion" data-nombre="${esc(c.importacion)}">${esc(c.importacion)}</button>` : ''),
    dato('HubSpot', c.hubspotId ? `<a href="${urlHubspot(c.hubspotId)}" target="_blank" rel="noopener">Ver en HubSpot ↗</a>${c.hubspotEstado ? `<br><span class="muted">${esc(HUBSPOT_ESTADOS[c.hubspotEstado] || c.hubspotEstado)}</span>` : ''}` : ''),
    dato('Alta', fmtFecha(c.creado)),
  ].join('');

  /** @type {Record<string, number>} */
  const cuenta = { notas: notas.length, tareas: pend.length };
  const tab = PESTANAS_FICHA.find((p) => p.id === ui.fichaTab) || PESTANAS_FICHA[0];

  app.innerHTML = `
    ${tCola ? `
      <div class="cola-ficha">
        ${cabeceraColaHTML()}
        <section class="card sq-tarea sq-tarea-ficha">${tareaColaHTML(tCola, c, llamando)}</section>
      </div>` : '<a href="#/" class="back">← Contactos</a>'}

    <div class="ficha-grid">
      <aside class="col-izq">
        <section class="card tarjeta-contacto">
          <div class="tc-cabecera">
            <span class="avatar lg">${esc(iniciales(c.nombre))}</span>
            <div class="grow">
              <h1>${esc(c.nombre)}</h1>
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
            <dt>Email</dt>
            <dd>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '<span class="muted">—</span>'}</dd>
            <dt>Teléfono</dt>
            <dd>${c.telefono ? `<a href="tel:${esc(c.telefono)}">${esc(c.telefono)}</a>` : '<span class="muted">—</span>'}</dd>
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
              ${ico(p.icono)} ${p.label}${cuenta[p.id] ? ` <span class="count">${cuenta[p.id]}</span>` : ''}${p.borrador ? ' <span class="etq-borrador">Borrador</span>' : ''}
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
  if (tCola) activarNotaCola(tCola);
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
  if (tab === 'whatsapp') return panelWhatsapp(c);
  if (tab === 'correo') return panelCorreo(c);
  const notas = notasDe(c.id);
  /** @type {Record<string, number>} */
  const conteoTipos = {};
  notas.forEach((n) => (conteoTipos[n.tipo] = (conteoTipos[n.tipo] || 0) + 1));
  return `
    <div class="col-titulo">
      <span class="muted small">${notas.length ? '' : 'Sin notas todavía'}</span>
      <button class="btn sm" data-action="nueva-nota" data-id="${c.id}">+ Nota</button>
    </div>
    ${notas.length ? `
      <div class="notas-filtros">
        <input type="search" id="nc-q" placeholder="Buscar en las notas…" value="${esc(ui.notasContactoQ)}">
        <div class="chips">
          <button class="chip ${ui.notaFiltro === '' ? 'active' : ''}" data-action="filtro-nota" data-tipo="">Todas <b>${notas.length}</b></button>
          ${TIPOS_NOTA.filter((t) => conteoTipos[t.id]).map((t) => `
            <button class="chip ${ui.notaFiltro === t.id ? 'active' : ''}" data-action="filtro-nota" data-tipo="${t.id}">
              ${ico(t.icon)} ${t.label} <b>${conteoTipos[t.id]}</b>
            </button>`).join('')}
        </div>
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
          <summary>${hechas.length} completada${hechas.length === 1 ? '' : 's'}</summary>
          <div class="td-lista">${hechas.map((t) => tareaHTML(t, false)).join('')}</div>
        </details>` : ''}
    </section>`;
}

/** @param {string} que */
const AVISO_BORRADOR = (que) => `
  <div class="aviso-borrador small">${ico('idea')} <span><b>Borrador.</b> ${que}</span></div>`;

// Borrador de las conversaciones de WhatsApp: los WhatsApp registrados como acciones, en forma de chat.
/** @param {Contacto} c */
function panelWhatsapp(c) {
  const tel = (c.telefono || '').replace(/\D/g, '');
  const mensajes = accionesDe(c.id).filter((a) => a.tipo === 'whatsapp').reverse();
  return `
    ${AVISO_BORRADOR('Aún no está conectado con WhatsApp: aquí se ven los WhatsApp registrados como acciones y «Enviar» abre WhatsApp Web con el mensaje y lo registra. Cuando se conecte, aparecerá la conversación real.')}
    <div class="card chat">
      <div class="chat-cabecera">
        <span class="avatar sm">${esc(iniciales(c.nombre))}</span>
        <div class="grow"><strong>${esc(c.nombre)}</strong><div class="muted small">${esc(c.telefono) || 'Sin teléfono'}</div></div>
      </div>
      <div class="chat-cuerpo">
        ${mensajes.map((a) => `
          <div class="burbuja mia">
            <div>${esc(a.resumen) || '<span class="muted">(sin texto)</span>'}</div>
            <time>${fmtFecha(a.fecha)}${a.hora ? ` · ${a.hora}` : ''} ✓✓</time>
          </div>`).join('') || '<p class="muted small chat-vacio">Todavía no hay WhatsApp con este contacto.</p>'}
      </div>
      <form class="chat-escribir" data-form="whatsapp">
        <textarea name="texto" rows="2" placeholder="${tel ? `Escribe un WhatsApp a ${esc(c.nombre.split(/\s+/)[0])}…` : 'Añade un teléfono al contacto para poder escribirle'}" ${tel ? '' : 'disabled'}></textarea>
        <button class="btn primary" ${tel ? '' : 'disabled'}>${ico('chat')} Enviar</button>
      </form>
    </div>`;
}

// Borrador del correo: los emails registrados como acciones, como una bandeja, y un formulario para escribir.
/** @param {Contacto} c */
function panelCorreo(c) {
  const correos = accionesDe(c.id).filter((a) => a.tipo === 'email');
  return `
    ${AVISO_BORRADOR('Aún no está conectado con el correo: aquí se ven los emails registrados como acciones y «Enviar» abre tu programa de correo con el mensaje y lo registra.')}
    <form class="card pad correo-escribir" data-form="correo">
      <div class="correo-fila"><span class="muted">Para</span> ${c.email ? esc(c.email) : '<span class="txt-danger">Este contacto no tiene email</span>'}</div>
      <input name="asunto" placeholder="Asunto" ${c.email ? '' : 'disabled'}>
      <textarea name="cuerpo" rows="5" placeholder="Escribe el correo…" ${c.email ? '' : 'disabled'}></textarea>
      <div class="row between"><span class="muted small">Se registrará como acción «Email».</span><button class="btn primary" ${c.email ? '' : 'disabled'}>${ico('correo')} Enviar</button></div>
    </form>
    <div class="card correo-lista">
      ${correos.map((a) => `
        <div class="correo-item" data-action="editar-accion" data-id="${a.id}">
          <span class="tl-punto">${ico('correo')}</span>
          <div class="grow"><strong>${esc(a.resumen) || '(sin asunto)'}</strong><div class="muted small">Enviado a ${esc(c.email || c.nombre)}</div></div>
          <time class="muted small">${fmtFecha(a.fecha)}</time>
        </div>`).join('') || '<p class="muted small chat-vacio">Todavía no hay correos con este contacto.</p>'}
    </div>`;
}

// Enviar desde los borradores: se abre WhatsApp / el correo y queda registrado como acción.
app.addEventListener('submit', (e) => {
  const f = /** @type {HTMLFormElement} */ (e.target);
  const tipo = f.dataset.form;
  if (tipo !== 'whatsapp' && tipo !== 'correo') return;
  e.preventDefault();
  const c = contacto(rutaActual().id);
  if (!c) return;
  let resumen;
  if (tipo === 'whatsapp') {
    const texto = f.texto.value.trim();
    if (!texto) return;
    window.open(`https://wa.me/${/** @type {string} */ (c.telefono).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    resumen = texto.length > 300 ? texto.slice(0, 300) + '…' : texto;
  } else {
    const asunto = f.asunto.value.trim();
    const cuerpo = f.cuerpo.value.trim();
    if (!asunto && !cuerpo) return;
    location.href = `mailto:${c.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    resumen = asunto || cuerpo.split('\n')[0].slice(0, 120);
  }
  const ac = { id: uid(), contactId: c.id, tipo: tipo === 'whatsapp' ? 'whatsapp' : 'email', fecha: hoy(), hora: horaActual(), resumen, noteId: null, taskId: null, creado: ahora() };
  db.actions.push(ac);
  tocar(c.id);
  guardar();
  render();
  avisar(tipo === 'whatsapp' ? 'WhatsApp registrado' : 'Email registrado', () => {
    db.actions = db.actions.filter((x) => x.id !== ac.id);
    guardar();
    render();
  });
});
