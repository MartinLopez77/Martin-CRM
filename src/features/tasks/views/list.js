// Tareas: la página #/tareas (vistas fijas y propias, grupos por día) y cada tarea.
import { tipoAccionDe, TIPOS_ACCION } from '../../activity/schema.js';
import { ESTADOS_LEAD } from '../../companies/schema.js';
import { empresaDe, estadoLeadDe } from '../../companies/store.js';
import { estadoDe, ESTADOS } from '../../contacts/schema.js';
import { contacto } from '../../contacts/store.js';
import { nota } from '../../notes/store.js';
import { activarTareas, anadirTareaHTML, editorTareaHTML, ICONO_CAL } from '../editor.js';
import { CUANDO_TAREA, FILTROS_TAREA_VACIOS, prioridadDe, PRIORIDADES, REUNIONES, VISTAS_TAREAS } from '../schema.js';
import {
  coincideTarea, cumpleFiltroTarea, diaCompletada, listasDeTareas, ordenTareas, vistaTareaPropia,
} from '../store.js';
import { inscripcion, secuencia } from '../../sequences/store.js';
import { conLocal } from '../../settings/horas.js';
import { nombreUsuario } from '../../team/store.js';
import { urlGoogleCalendar } from '../../../shared/lib/calendario.js';
import { claseFecha, fmtCuando, hoy, sumarDias, tituloDia } from '../../../shared/lib/dates.js';
import { ahora, esc, uid } from '../../../shared/lib/text.js';
import { guardar } from '../../../shared/persistence.js';
import { render } from '../../../shared/router.js';
import { db, ui } from '../../../shared/state.js';
import { $, app } from '../../../shared/ui/dom.js';
import { activarEditores } from '../../../shared/ui/editor-md.js';
import { campo, opcion, opciones } from '../../../shared/ui/html.js';
import { ico } from '../../../shared/ui/icons.js';
import { abrirModal, botonBorrarModal } from '../../../shared/ui/modal.js';

/** @typedef {import('../schema.js').Tarea} Tarea */

// "Llamadas · Prioridad 1 · Contactos en Negociación…" para recordar qué filtra la vista.
/** @param {import('../schema.js').FiltrosTarea} f */
function resumenFiltrosTarea(f) {
  /** @param {{ id: string, label: string }[]} lista @param {string} id */
  const s = (lista, id) => lista.find((x) => x.id === id)?.label;
  return [
    f.cuando && s(CUANDO_TAREA, f.cuando),
    f.accion && (f.accion === 'interna' ? 'Tareas internas' : tipoAccionDe(f.accion).label),
    f.prioridad && s(PRIORIDADES, f.prioridad),
    f.contacto && (f.contacto === 'con' ? 'Con contacto' : 'Sin contacto'),
    f.estado && `Contacto: ${estadoDe(f.estado).label}`,
    f.estadoLead && `Empresa: ${estadoLeadDe(f.estadoLead)?.label || f.estadoLead}`,
    f.ownerId && `Propietario: ${f.ownerId === 'ninguno' ? 'sin propietario' : nombreUsuario(f.ownerId)}`,
    f.secuencia && (f.secuencia === 'alguna' ? 'De una secuencia' : f.secuencia === 'ninguna' ? 'Fuera de secuencias' : `Secuencia «${secuencia(f.secuencia)?.nombre || '?'}»`),
    f.lista && `Lista #${f.lista}`,
    f.q && `«${f.q}»`,
  ].filter(Boolean).map(esc).join(' · ') || 'Sin filtros: todas las tareas pendientes';
}

/** Crear una vista propia de tareas, o editar `v`. @param {import('../schema.js').VistaTareas} [v] */
export function modalVistaTareas(v) {
  const f = { ...FILTROS_TAREA_VACIOS, ...v?.filtros };
  /** @param {string} nombre @param {string} label @param {string} opcionesHTML */
  const sel = (nombre, label, opcionesHTML) => campo(label, `<select name="${nombre}">${opcionesHTML}</select>`);
  abrirModal(v ? 'Editar vista de tareas' : 'Nueva vista de tareas', `
    ${campo('Nombre de la vista *', `<input name="nombre" required value="${esc(v?.nombre)}" placeholder="Ej. Llamadas a clínicas en negociación">`)}
    <p class="muted small">Elige solo los filtros que quieras; los que dejes en «todas» no filtran.</p>
    <div class="row2">
      ${sel('cuando', 'Fecha', opciones(CUANDO_TAREA, f.cuando))}
      ${sel('accion', 'Tipo', opcion('', 'Todos', f.accion) + opcion('interna', 'Tarea interna', f.accion) + opciones(TIPOS_ACCION, f.accion))}
      ${sel('prioridad', 'Prioridad', opcion('', 'Todas', f.prioridad) + opciones(PRIORIDADES, f.prioridad))}
      ${sel('contacto', 'Contacto', opcion('', 'Con o sin contacto', f.contacto) + opcion('con', 'Solo con contacto', f.contacto) + opcion('sin', 'Solo sin contacto', f.contacto))}
      ${sel('estado', 'Estado del contacto', opcion('', 'Todos', f.estado) + opciones(ESTADOS, f.estado))}
      ${sel('estadoLead', 'Estado lead de la empresa', opcion('', 'Todos', f.estadoLead) + opciones(ESTADOS_LEAD, f.estadoLead))}
      ${sel('ownerId', 'Propietario del contacto', opcion('', 'Todos', f.ownerId) + opcion('ninguno', 'Sin propietario', f.ownerId) + db.users.map((u) => opcion(u.id, nombreUsuario(u.id), f.ownerId)).join(''))}
      ${sel('secuencia', 'Secuencia', opcion('', 'Todas', f.secuencia) + opcion('alguna', 'De alguna secuencia', f.secuencia) + opcion('ninguna', 'De ninguna secuencia', f.secuencia) + db.sequences.map((s) => opcion(s.id, s.nombre, f.secuencia)).join(''))}
      ${sel('lista', 'Lista (tareas sin contacto)', opcion('', 'Todas', f.lista) + ['General', ...listasDeTareas()].map((l) => opcion(l, `# ${l}`, f.lista)).join(''))}
      ${campo('Texto', `<input name="q" value="${esc(f.q)}" placeholder="En el título, contacto o empresa">`)}
    </div>
  `, (d) => {
    const nombre = d.nombre.trim();
    if (!nombre) return false;
    const filtros = Object.fromEntries(Object.keys(FILTROS_TAREA_VACIOS).map((k) => [k, String(d[k] || '').trim()]));
    if (v) Object.assign(v, { nombre, filtros });
    else {
      const nv = { id: uid(), nombre, filtros: /** @type {import('../schema.js').FiltrosTarea} */ (filtros), creado: ahora() };
      db.taskViews.push(nv);
      ui.tareasVista = nv.id;
    }
    guardar();
    render();
  });
  if (v) {
    botonBorrarModal(() => {
      if (!confirm(`¿Eliminar la vista «${v.nombre}»? Las tareas no se tocan.`)) return false;
      db.taskViews = db.taskViews.filter((x) => x.id !== v.id);
      ui.tareasVista = 'bandeja';
      guardar();
      render();
    });
  }
}

export function vistaTareas() {
  const h = hoy();
  const pend = db.tasks.filter((t) => !t.hecha);
  /** @type {Record<string, number>} */
  const cuenta = {
    bandeja: pend.length,
    hoy: pend.filter((t) => t.fecha && t.fecha <= h).length,
    proximo: pend.filter((t) => /** @type {string} */ (t.fecha) >= h && /** @type {string} */ (t.fecha) <= sumarDias(h, 6)).length,
    generales: pend.filter((t) => !t.contactId).length,
    completadas: 0,
  };
  db.taskViews.forEach((v) => (cuenta[v.id] = pend.filter((t) => cumpleFiltroTarea(t, v.filtros)).length));
  const propia = vistaTareaPropia();
  const vista = propia ? { id: propia.id, label: propia.nombre } : VISTAS_TAREAS.find((v) => v.id === ui.tareasVista) || VISTAS_TAREAS[0];
  ui.tareasVista = vista.id;
  /** @param {string} v @param {string} label @param {string} icono */
  const tab = (v, label, icono) => `
    <button class="${v === vista.id ? 'active' : ''}" data-action="vista-tareas" data-vista="${v}">
      ${ico(icono)}${esc(label)}${cuenta[v] ? ` <small>${cuenta[v]}</small>` : ''}
    </button>`;

  app.innerHTML = `
    <div class="td">
      <div class="td-barra">
        <nav class="td-vistas">
          ${VISTAS_TAREAS.map((v) => tab(v.id, v.label, v.icono)).join('')}
          ${db.taskViews.map((v) => tab(v.id, v.nombre, 'filtro')).join('')}
          <button class="td-vista-nueva" data-action="nueva-vista-tareas" title="Crear una pestaña con los filtros que quieras">+ Vista</button>
        </nav>
        <input type="search" id="t-q" class="td-buscar" placeholder="Buscar tarea o contacto…" value="${esc(ui.tareasQ)}">
      </div>
      <div class="td-cabecera">
        <h1 class="td-h1">${esc(vista.label)}${propia ? ` <button class="icon-btn" data-action="editar-vista-tareas" data-id="${propia.id}" title="Editar filtros de la vista">${ico('editar')}</button>` : ''}</h1>
        ${vista.id !== 'completadas' && cuenta[vista.id] ? `<button class="btn primary" data-action="empezar-tareas" data-origen="tareas" title="Ir haciendo estas tareas una detrás de otra">${ico('play')} Empezar tareas</button>` : ''}
      </div>
      <p class="td-sub muted small">
        ${vista.id === 'completadas'
          ? `${db.tasks.filter((t) => t.hecha).length} completadas`
          : `✓ ${cuenta[vista.id]} ${cuenta[vista.id] === 1 ? 'tarea' : 'tareas'}`}
        ${vista.id === 'generales' ? '· Tareas que no son de ningún contacto, ordenadas en listas' : ''}
        ${propia ? `· ${ico('filtro')} ${resumenFiltrosTarea(propia.filtros)}` : ''}
        <span class="td-atajo">· Pulsa <kbd>Q</kbd> para añadir una tarea</span>
      </p>
      <div id="lista-tareas"></div>
    </div>`;

  $('#t-q').addEventListener('input', (/** @type {Event} */ e) => { ui.tareasQ = /** @type {HTMLInputElement} */ (e.target).value; renderListaTareas(); });
  renderListaTareas();
}

function renderListaTareas() {
  const cont = $('#lista-tareas');
  const q = ui.tareasQ.trim().toLowerCase();
  const h = hoy();
  const tareas = db.tasks.filter((t) => coincideTarea(t, q));
  const pend = tareas.filter((t) => !t.hecha);
  /** @type {{ clave: string, titulo: string, items: Tarea[], fecha?: string, lista?: string, clase?: string, sinAnadir?: boolean }[]} */
  const grupos = [];

  if (ui.tareasVista === 'completadas') {
    const hechas = tareas.filter((t) => t.hecha).sort((a, b) => (b.completada || '').localeCompare(a.completada || ''));
    [...new Set(hechas.map(diaCompletada))].forEach((d) => grupos.push({
      clave: 'hecha-' + d, titulo: d ? tituloDia(d) : 'Sin fecha', items: hechas.filter((t) => diaCompletada(t) === d), sinAnadir: true,
    }));
    if (!grupos.length) {
      cont.innerHTML = `<div class="td-vacio"><p>${q ? 'Ninguna tarea completada coincide.' : 'Aún no has completado ninguna tarea.'}</p></div>`;
      return;
    }
  } else if (ui.tareasVista === 'generales') {
    // Tareas sin contacto, agrupadas por lista ("General" si no tienen).
    const generales = pend.filter((t) => !t.contactId);
    const listas = [...new Set([...generales.map((t) => t.lista || ''), ...ui.listasNuevas])]
      .sort((a, b) => (!a ? -1 : !b ? 1 : a.localeCompare(b, 'es')));
    if (!listas.includes('')) listas.unshift('');
    listas.forEach((l) => grupos.push({
      clave: 'lista-' + l, titulo: `<span class="td-almohadilla">#</span> ${esc(l || 'General')}`, lista: l, fecha: '',
      items: generales.filter((t) => (t.lista || '') === l).sort(ordenTareas),
    }));
  } else if (vistaTareaPropia()) {
    // Vista propia: solo las que cumplen sus filtros, por días y sin huecos (no se añaden tareas desde aquí,
    // porque una tarea nueva podría no cumplir los filtros y desaparecer).
    const filtros = /** @type {import('../schema.js').VistaTareas} */ (vistaTareaPropia()).filtros;
    const items = pend.filter((t) => cumpleFiltroTarea(t, filtros)).sort(ordenTareas);
    const vencidas = items.filter((t) => t.fecha && t.fecha < h);
    if (vencidas.length) grupos.push({ clave: 'vencidas', titulo: 'Vencidas', clase: 'vencidas', items: vencidas, sinAnadir: true });
    [.../** @type {Set<string>} */ (new Set(items.filter((t) => /** @type {string} */ (t.fecha) >= h).map((t) => t.fecha)))].forEach((d) => grupos.push({
      clave: 'dia-' + d, titulo: tituloDia(d), items: items.filter((t) => t.fecha === d), sinAnadir: true,
    }));
    const sinFecha = items.filter((t) => !t.fecha);
    if (sinFecha.length) grupos.push({ clave: 'sin-fecha', titulo: 'Sin fecha', items: sinFecha, sinAnadir: true });
    if (!grupos.length) {
      cont.innerHTML = `<div class="td-vacio"><p>Ninguna tarea pendiente cumple los filtros de esta vista.</p></div>`;
      return;
    }
  } else {
    const vencidas = pend.filter((t) => t.fecha && t.fecha < h).sort(ordenTareas);
    if (vencidas.length) grupos.push({ clave: 'vencidas', titulo: 'Vencidas', clase: 'vencidas', items: vencidas, sinAnadir: true });
    let dias;
    if (ui.tareasVista === 'hoy') dias = [h];
    else if (ui.tareasVista === 'proximo') dias = Array.from({ length: 7 }, (_, i) => sumarDias(h, i));
    else dias = [.../** @type {Set<string>} */ (new Set([h, ...pend.filter((t) => /** @type {string} */ (t.fecha) > h).map((t) => t.fecha)]))].sort();
    dias.forEach((d) => grupos.push({
      clave: 'dia-' + d, titulo: tituloDia(d), fecha: d, items: pend.filter((t) => t.fecha === d).sort(ordenTareas),
    }));
    if (ui.tareasVista === 'bandeja') {
      grupos.push({ clave: 'sin-fecha', titulo: 'Sin fecha', fecha: '', items: pend.filter((t) => !t.fecha).sort(ordenTareas) });
    }
  }

  cont.innerHTML = grupos.map((g) => `
    <section class="td-grupo ${g.clase || ''}">
      <h2 class="td-grupo-titulo">
        <span>${g.titulo}</span>
        ${g.items.length ? `<span class="td-grupo-n">${g.items.length}</span>` : ''}
        ${g.clave === 'vencidas' ? '<button class="td-reprogramar" data-action="reprogramar-vencidas">Reprogramar a hoy</button>' : ''}
      </h2>
      <div class="td-lista">${g.items.map((t) => tareaHTML(t)).join('')}</div>
      ${g.sinAnadir ? '' : ui.editor?.clave === g.clave ? editorTareaHTML({ fecha: g.fecha, lista: g.lista }) : anadirTareaHTML(g.clave, g.fecha)}
    </section>`).join('') + (ui.tareasVista === 'generales' ? '<button class="td-anadir td-nueva-lista" data-action="nueva-lista"><span class="td-mas">+</span> Nueva lista</button>' : '');
  activarEditores(cont);
  activarTareas(cont);
}

/** Una tarea de una lista. @param {Tarea} t @param {boolean} [mostrarContacto] en la ficha del contacto no hace falta */
export function tareaHTML(t, mostrarContacto = true) {
  const c = t.contactId ? contacto(t.contactId) : null;
  const n = t.noteId ? nota(t.noteId) : null;
  const p = prioridadDe(t.prioridad);
  const ta = t.accion && tipoAccionDe(t.accion);
  const seq = t.enrollmentId && secuencia(inscripcion(t.enrollmentId)?.sequenceId);

  let cuando = '';
  if (t.fecha) cuando = `<span class="td-fecha ${t.hecha ? '' : claseFecha(t.fecha)}">${ICONO_CAL}${fmtCuando(t.fecha)}${t.hora ? ` ${conLocal(t.hora, t.fecha)}` : ''}</span>`;
  else if (t.hora) cuando = `<span class="td-fecha">${ico('reloj')} ${conLocal(t.hora)}</span>`;

  // La nota de un contacto se ve en su ficha; la de una tarea sin contacto, al abrir la tarea.
  let notaLink = '';
  if (n && n.contactId && !mostrarContacto) notaLink = `<button class="link-btn" data-action="ver-nota" data-id="${n.id}">${ico('nota')} Ver nota</button>`;
  else if (n && n.contactId) notaLink = `<a href="#/contacto/${n.contactId}">${ico('nota')} Tiene nota</a>`;
  else if (n) notaLink = `<span title="Ábrela para ver la nota">${ico('nota')} Nota</span>`;

  const meta = [
    cuando,
    notaLink,
    !t.hecha && REUNIONES.includes(/** @type {string} */ (t.accion))
      ? `<button class="td-cancelar-btn" data-action="cancelar-reunion" data-id="${t.id}" title="La reunión no se hizo: queda registrada como cancelada">${ico('cancelado')} Cancelada</button>` : '',
    !t.hecha && t.fecha && REUNIONES.includes(/** @type {string} */ (t.accion))
      ? `<a class="td-cancelar-btn" href="${esc(urlGoogleCalendar({ titulo: c ? `${t.titulo} · ${c.nombre}` : t.titulo, detalle: t.detalle, fecha: t.fecha, hora: t.hora }))}" target="_blank" rel="noopener" title="Abre Google Calendar con la reunión ya rellenada">${ICONO_CAL} Añadir a Calendar</a>` : '',
    seq ? `<a class="seq-pill" href="#/secuencias/${seq.id}" title="Paso ${/** @type {number} */ (t.paso) + 1} de la secuencia «${esc(seq.nombre)}»">${ico('secuencia')} ${esc(seq.nombre)} · ${/** @type {number} */ (t.paso) + 1}/${seq.pasos.length}</a>` : '',
    mostrarContacto && c ? `<a class="td-proyecto" href="#/contacto/${c.id}">${esc(c.nombre)}${empresaDe(c) ? ` · ${esc(empresaDe(c))}` : ''} <span>#</span></a>` : '',
    !c && t.lista && ui.tareasVista !== 'generales' ? `<span class="td-proyecto">${esc(t.lista)} <span>#</span></span>` : '',
  ].filter(Boolean).join('');
  // Desde las listas de tareas, una tarea de un contacto lleva a su ficha (allí se edita).
  const irAFicha = mostrarContacto && c;

  return `
    <div class="td-tarea ${t.hecha ? 'hecha' : ''}" data-tarea="${t.id}">
      <button class="td-check p-${p.id}" data-action="toggle-tarea" data-id="${t.id}"
        title="${t.hecha ? 'Marcar como pendiente' : 'Completar'}" aria-label="${t.hecha ? 'Marcar como pendiente' : 'Completar tarea'}"></button>
      <div class="td-cuerpo" data-action="${irAFicha ? 'ir-a-tarea' : 'editar-tarea'}" data-id="${t.id}" title="${irAFicha ? `Abrir la ficha de ${esc(c.nombre)}` : 'Editar tarea'}">
        <div class="td-titulo">
          ${ta ? `<span class="td-tipo" title="${ta.label}">${ico(ta.icon)}</span>` : ''}${esc(t.titulo)}
          ${t.cancelada ? '<span class="td-etq-cancelada">Cancelada</span>' : ''}
        </div>
        ${t.detalle ? `<div class="td-desc">${esc(t.detalle)}</div>` : ''}
        ${meta ? `<div class="td-meta">${meta}</div>` : ''}
      </div>
      <div class="td-hover">
        ${irAFicha ? '' : `<button class="icon-btn" data-action="editar-tarea" data-id="${t.id}" title="Editar">${ico('editar')}</button>`}
        <button class="icon-btn" data-action="borrar-tarea" data-id="${t.id}" title="Eliminar">${ico('papelera')}</button>
      </div>
    </div>`;
}
