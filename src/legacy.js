// @ts-nocheck: se tipa al moverlo a src/features/ (este archivo desaparece al terminar la refactorización).
// Código de las features que todavía no se han movido a src/features/ (se va vaciando fase a fase).
import { TIPOS_PROP } from './features/companies/schema.js';
import {
  contactosDeEmpresa, empresa, empresaDe, empresaPorNombre, estadoLeadDe, propsEmpresa, propVisible,
} from './features/companies/store.js';
import { vistaEmpresa, vistaEmpresas } from './features/companies/views.js';
import { cargarVista, contacto } from './features/contacts/store.js';
import { vistaContacto } from './features/contacts/views/detail.js';
import { vistaContactos } from './features/contacts/views/list.js';
import { completarActualEnCola, enModoCola, irEnCola } from './features/queue/store.js';
import { vistaSecuencia } from './features/queue/views.js';
import { secuencia } from './features/sequences/store.js';
import { vistaSecuenciaDetalle, vistaSecuencias } from './features/sequences/views.js';
import { activarTareas, modalRapido } from './features/tasks/editor.js';
import { vistaTareas } from './features/tasks/views/list.js';
import { acciones } from './shared/actions.js';
import { fmtFecha, horaActual, horaLocal, hoy } from './shared/lib/dates.js';
import { ahora, esc, iniciales, normalizar, uid } from './shared/lib/text.js';
import { guardar } from './shared/persistence.js';
import { definirRender, render, rutaActual } from './shared/router.js';
import { AJUSTES_DEFECTO, db, setDb, ui } from './shared/state.js';
import { $, app } from './shared/ui/dom.js';
import { activarEditores, ajustarScroll } from './shared/ui/editor-md.js';
import { campo, opciones } from './shared/ui/html.js';
import { ico } from './shared/ui/icons.js';
import { abrirModal, botonBorrarModal, modal } from './shared/ui/modal.js';

// El CRM trabaja en hora de España (la de los clientes). En Ajustes se puede añadir una hora
// secundaria (p. ej. la de Malasia), que se muestra entre paréntesis.
const ZONAS_SECUNDARIAS = [
  { id: 'Asia/Kuala_Lumpur', label: 'Malasia', sufijo: 'MY' },
  { id: 'Asia/Singapore', label: 'Singapur', sufijo: 'SG' },
  { id: 'Asia/Dubai', label: 'Dubái', sufijo: 'AE' },
  { id: 'Europe/London', label: 'Reino Unido', sufijo: 'UK' },
  { id: 'America/New_York', label: 'Nueva York', sufijo: 'NY' },
  { id: 'America/Mexico_City', label: 'México', sufijo: 'MX' },
  { id: 'America/Bogota', label: 'Colombia', sufijo: 'CO' },
  { id: 'America/Argentina/Buenos_Aires', label: 'Argentina', sufijo: 'AR' },
];
const zonaSecundaria = () => (db.settings?.horaSecundaria ? ZONAS_SECUNDARIAS.find((z) => z.id === db.settings.zonaSecundaria) : null);

// Usuario que usa el CRM. Cuando entre el resto del equipo, cada uno tendrá el suyo.
export const YO = 'u-martin';

// Hora secundaria entre paréntesis (nada si está desactivada en Ajustes).
const enLocal = (texto) => {
  const z = zonaSecundaria();
  return z ? `<span class="local" title="Hora de ${z.label}">(${texto} ${z.sufijo})</span>` : '';
};
export const conLocal = (hhmm, fecha) => (hhmm ? `${hhmm} ${zonaSecundaria() ? enLocal(horaLocal(hhmm, fecha, true, zonaSecundaria().id)) : ''}`.trim() : '');
export const usuario = (id) => db.users.find((u) => u.id === id);
export const nombreUsuario = (id) => (id === YO ? `${usuario(YO)?.nombre || 'Yo'} (yo)` : usuario(id)?.nombre || 'Sin propietario');

export const avatarUsuario = (id) =>
  id ? `<span class="avatar xs" title="${esc(nombreUsuario(id))}">${esc(iniciales(usuario(id)?.nombre))}</span>` : '';
export const opcionesUsuarios = (sel, vacio = 'Sin propietario') =>
  `<option value="">${vacio}</option>${db.users.map((u) => `<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${esc(nombreUsuario(u.id))}</option>`).join('')}`;

function pintarVista() {
  const { ruta, id } = rutaActual();
  if (ruta === 'hoy') { // la antigua página Hoy es ahora la vista "Hoy" de Tareas
    ui.tareasVista = 'hoy';
    location.replace('#/tareas');
    return;
  }
  const seccion = { cola: 'tareas', empresa: 'empresas', tarea: 'tareas' }[ruta] || (['tareas', 'empresas', 'secuencias', 'equipo', 'ajustes'].includes(ruta) ? ruta : 'contactos');
  document.querySelectorAll('.menu a').forEach((a) => a.classList.toggle('active', a.dataset.ruta === seccion));

  if (ruta === 'tareas') vistaTareas();
  else if (ruta === 'ajustes') vistaAjustes();
  else if (ruta === 'cola') vistaSecuencia();
  else if (ruta === 'empresas') vistaEmpresas();
  else if (ruta === 'empresa' && empresa(id)) vistaEmpresa(id);
  else if (ruta === 'secuencias' && id && secuencia(id)) vistaSecuenciaDetalle(id);
  else if (ruta === 'secuencias') vistaSecuencias();
  else if (ruta === 'equipo') vistaEquipo();
  else if (ruta === 'contacto' && contacto(id)) vistaContacto(id);
  else vistaContactos();

  activarEditores(app);
  activarTareas(app);
  if (ui.enfocarTarea) {
    $('.td-editor [name=titulo]', app)?.focus();
    ui.enfocarTarea = false;
  }
  ajustarScroll();
  actualizarBadges();
}

const menu = document.getElementById('menu');
const menuBtn = document.getElementById('menu-btn');

function abrirMenu(abrir) {
  document.body.classList.toggle('menu-abierto', abrir);
  menu.setAttribute('aria-hidden', String(!abrir));
  menuBtn.setAttribute('aria-expanded', String(abrir));
  if (abrir) menu.querySelector('a.active, a')?.focus();
}

menuBtn.addEventListener('click', () => abrirMenu(!document.body.classList.contains('menu-abierto')));
document.getElementById('menu-cerrar').addEventListener('click', () => abrirMenu(false));
document.getElementById('menu-fondo').addEventListener('click', () => abrirMenu(false));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) abrirMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-abierto')) {
    abrirMenu(false);
    menuBtn.focus();
    return;
  }
  // Q: añadir tarea rápida (como en Todoist), si no se está escribiendo en ningún campo.
  const escribiendo = e.target.closest?.('input, textarea, select, [contenteditable]');
  // /: buscar contactos en la barra de arriba.
  if (e.key === '/' && !escribiendo && !e.ctrlKey && !e.metaKey && !modal.open) {
    e.preventDefault();
    buscador.focus();
    return;
  }
  // Haciendo tareas (en #/cola o en la ficha del contacto): Ctrl+Enter completa (también escribiendo la nota)
  // y las flechas pasan de una tarea a otra.
  if (enModoCola() && !modal.open) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      completarActualEnCola();
      return;
    }
    if (!escribiendo && !e.ctrlKey && !e.metaKey && !e.altKey && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      irEnCola(ui.cola.i + (e.key === 'ArrowRight' ? 1 : -1));
      return;
    }
  }
  if (e.key.toLowerCase() === 'q' && !e.ctrlKey && !e.metaKey && !e.altKey && !escribiendo && !modal.open) {
    e.preventDefault();
    modalRapido();
  }
});

// Iconos de la página (menú) que van en el HTML con data-ico.
document.querySelectorAll('[data-ico]').forEach((el) => (el.innerHTML = ico(el.dataset.ico)));

const buscador = document.getElementById('buscar-global');
const resultadosBusqueda = document.getElementById('buscar-resultados');
let busquedaSel = 0;

function resultadosGlobales(texto) {
  const q = normalizar(texto);
  if (!q) return [];
  const digitos = texto.replace(/\D/g, '');
  const contiene = (v) => normalizar(v).includes(q);
  // Primero los que empiezan por lo buscado, luego el resto.
  const peso = (nombre) => (normalizar(nombre).startsWith(q) ? 0 : 1);
  const contactos = db.contacts
    .filter((c) => [c.nombre, c.email, empresaDe(c), c.cargo, c.ciudad].some(contiene)
      || (digitos.length >= 3 && (c.telefono || '').replace(/\D/g, '').includes(digitos)))
    .sort((a, b) => peso(a.nombre) - peso(b.nombre) || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 8)
    .map((c) => ({
      href: '#/contacto/' + c.id, icono: esc(iniciales(c.nombre)), titulo: c.nombre,
      sub: [empresaDe(c), c.email || c.telefono].filter(Boolean).join(' · '), tipo: 'Contacto',
    }));
  const empresas = db.companies
    .filter((e) => [e.nombre, e.web].some(contiene))
    .sort((a, b) => peso(a.nombre) - peso(b.nombre) || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 4)
    .map((e) => ({
      href: '#/empresa/' + e.id, icono: ico('empresa'), cuadrado: true, titulo: e.nombre,
      sub: [estadoLeadDe(e.estadoLead)?.label, `${contactosDeEmpresa(e.id).length} contactos`].filter(Boolean).join(' · '), tipo: 'Empresa',
    }));
  return [...contactos, ...empresas];
}

function pintarBusqueda() {
  const lista = resultadosGlobales(buscador.value);
  busquedaSel = Math.min(busquedaSel, Math.max(0, lista.length - 1));
  resultadosBusqueda.hidden = !buscador.value.trim();
  resultadosBusqueda.innerHTML = lista.map((r, i) => `
    <a href="${r.href}" class="br-item ${i === busquedaSel ? 'activo' : ''}" data-i="${i}">
      <span class="avatar sm ${r.cuadrado ? 'cuadrado' : ''}">${r.icono}</span>
      <span class="grow"><strong>${esc(r.titulo)}</strong><span class="muted small">${esc(r.sub)}</span></span>
      <span class="br-tipo">${r.tipo}</span>
    </a>`).join('') || `<p class="br-vacio muted small">Ningún contacto ni empresa coincide con «${esc(buscador.value.trim())}».</p>`;
}

function cerrarBusqueda(limpiar = false) {
  resultadosBusqueda.hidden = true;
  if (limpiar) buscador.value = '';
}

buscador.addEventListener('input', () => { busquedaSel = 0; pintarBusqueda(); });
buscador.addEventListener('focus', () => { if (buscador.value.trim()) pintarBusqueda(); });
buscador.addEventListener('keydown', (e) => {
  const items = resultadosBusqueda.querySelectorAll('.br-item');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!items.length) return;
    busquedaSel = (busquedaSel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle('activo', i === busquedaSel));
    items[busquedaSel].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const el = items[busquedaSel];
    if (!el) return;
    location.hash = el.getAttribute('href');
    cerrarBusqueda(true);
    buscador.blur();
  } else if (e.key === 'Escape') {
    cerrarBusqueda(true);
    buscador.blur();
  }
});
resultadosBusqueda.addEventListener('click', (e) => { if (e.target.closest('.br-item')) cerrarBusqueda(true); });
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#buscador')) cerrarBusqueda(); });

function actualizarReloj() {
  const z = zonaSecundaria();
  document.getElementById('reloj').innerHTML = `España <b>${horaActual()}</b> ${z ? enLocal(horaActual(z.id)) : ''}`;
}

function actualizarBadges() {
  actualizarReloj();
  const h = hoy();
  const pend = db.tasks.filter((t) => !t.hecha);
  const paraHoy = pend.filter((t) => t.fecha && t.fecha <= h);
  const vencidas = paraHoy.filter((t) => t.fecha < h).length;

  // El número de Tareas se pone en rojo si hay vencidas.
  const b = document.getElementById('badge-tareas');
  b.textContent = pend.length || '';
  b.classList.toggle('alerta', vencidas > 0);
  b.title = vencidas ? `${vencidas} vencida${vencidas === 1 ? '' : 's'}` : '';
}

function vistaEquipo() {
  app.innerHTML = `
    <div class="estrecho">
      <div class="page-head">
        <div>
          <h1>Equipo</h1>
          <p class="muted">Las personas a las que se pueden asignar contactos. De momento solo tú tienes acceso al CRM.</p>
        </div>
        <button class="btn primary" data-action="nuevo-usuario">+ Añadir persona</button>
      </div>
      <div class="card">
        ${db.users.map((u) => {
          const n = db.contacts.filter((c) => c.ownerId === u.id).length;
          return `
            <div class="equipo-fila">
              <span class="avatar sm">${esc(iniciales(u.nombre))}</span>
              <div class="grow">
                <strong>${esc(u.nombre)}</strong>${u.id === YO ? ' <span class="muted small">(tú)</span>' : ''}
                <div class="muted small">${esc(u.email) || 'Sin email'}</div>
              </div>
              <button class="link-btn small" data-action="ver-contactos-de" data-id="${u.id}">${n} contacto${n === 1 ? '' : 's'}</button>
              <button class="icon-btn" data-action="editar-usuario" data-id="${u.id}" title="Editar">${ico('editar')}</button>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function modalUsuario(u) {
  abrirModal(u ? 'Editar persona' : 'Añadir persona', `
    ${campo('Nombre *', `<input name="nombre" required value="${esc(u?.nombre)}">`)}
    ${campo('Email', `<input type="email" name="email" value="${esc(u?.email)}" placeholder="nombre@diga.io">`)}
  `, (d) => {
    const nombre = d.nombre.trim();
    if (!nombre) return false;
    if (u) Object.assign(u, { nombre, email: d.email.trim() });
    else db.users.push({ id: uid(), nombre, email: d.email.trim(), creado: ahora() });
    guardar();
    render();
  });
  if (u && u.id !== YO) {
    botonBorrarModal(() => {
      const n = db.contacts.filter((c) => c.ownerId === u.id).length;
      if (!confirm(`¿Quitar a ${u.nombre} del equipo?${n ? ` Sus ${n} contactos se quedarán sin propietario.` : ''}`)) return false;
      db.contacts.forEach((c) => { if (c.ownerId === u.id) c.ownerId = null; });
      db.users = db.users.filter((x) => x.id !== u.id);
      guardar();
      render();
    });
  }
}

function vistaAjustes() {
  const s = db.settings;
  const z = zonaSecundaria();
  app.innerHTML = `
    <div class="estrecho">
      <div class="page-head"><h1>Ajustes</h1></div>
      <section class="card pad ajustes">
        <h3>${ico('reloj')} Horas</h3>
        <p class="muted small">El CRM trabaja siempre en <b>hora de España</b> (la de los clientes): las tareas, las acciones y el reloj de arriba.</p>
        <label class="check"><input type="checkbox" id="aj-secundaria" ${s.horaSecundaria ? 'checked' : ''}> Mostrar también una hora secundaria entre paréntesis</label>
        <label class="field ${s.horaSecundaria ? '' : 'apagado'}"><span>Hora secundaria</span>
          <select id="aj-zona" ${s.horaSecundaria ? '' : 'disabled'}>
            ${ZONAS_SECUNDARIAS.map((x) => `<option value="${x.id}" ${x.id === s.zonaSecundaria ? 'selected' : ''}>${x.label} (${x.sufijo})</option>`).join('')}
          </select>
        </label>
        <p class="ajustes-ejemplo small">Así se verá: España <b>${horaActual()}</b> ${z ? enLocal(horaActual(z.id)) : '<span class="muted">(sin hora secundaria)</span>'}</p>
      </section>

      <section class="card pad ajustes">
        <div class="row between">
          <h3>${ico('empresa')} Propiedades de empresa</h3>
          <button class="btn sm" data-action="nueva-prop-empresa">+ Añadir propiedad</button>
        </div>
        <p class="muted small">Las desactivadas no se muestran en el CRM (ni en la ficha, ni en la tabla, ni al editar), pero conservan lo que tuvieran. Las de nurturing solo aparecen cuando la empresa está en nurturing.</p>
        <div class="props-lista">
          ${propsEmpresa().map((p) => `
            <div class="prop-fila">
              <label class="check grow"><input type="checkbox" class="aj-prop" data-id="${esc(p.id)}" ${propVisible(p) ? 'checked' : ''}> ${esc(p.label)}</label>
              <span class="muted small">${p.extra ? 'Propia · ' : ''}${p.tipo === 'tel' ? 'Teléfono' : TIPOS_PROP.find((x) => x.id === p.tipo)?.label || 'Texto'}${p.tipo === 'opciones' ? ` · ${p.opciones.length} opciones` : ''}${p.soloLectura ? ' · la pone el importador' : ''}</span>
              ${p.extra ? `
                <button class="icon-btn" data-action="editar-prop-empresa" data-id="${esc(p.id)}" title="Editar">${ico('editar')}</button>
                <button class="icon-btn" data-action="borrar-prop-empresa" data-id="${esc(p.id)}" title="Eliminar">${ico('papelera')}</button>` : '<span class="prop-hueco"></span>'}
            </div>`).join('')}
        </div>
      </section>

      <section class="card pad ajustes">
        <div class="row between">
          <h3>${ico('importar')} Importaciones</h3>
          <button class="btn sm" data-action="importar-csv">Importar CSV</button>
        </div>
        ${db.imports.length ? `
          <div class="props-lista">
            ${[...db.imports].reverse().map((im) => `
              <div class="prop-fila">
                <span class="grow"><strong>${esc(im.nombre)}</strong> <span class="muted small">· ${fmtFecha(im.fecha)}</span></span>
                <span class="muted small">${im.creados} creados${im.duplicados ? ` · ${im.duplicados} ya existían` : ''}${im.sinEmail ? ` · ${im.sinEmail} sin email válido` : ''}</span>
                <button class="link-btn small" data-action="ver-importacion" data-nombre="${esc(im.nombre)}">Ver contactos</button>
              </div>`).join('')}
          </div>` : '<p class="muted small">Todavía no has importado ningún CSV.</p>'}
      </section>
    </div>`;
  $('#aj-secundaria').addEventListener('change', (e) => { s.horaSecundaria = e.target.checked; guardar(); render(); });
  $('#aj-zona').addEventListener('change', (e) => { s.zonaSecundaria = e.target.value; guardar(); render(); });
  app.querySelectorAll('.aj-prop').forEach((cb) => cb.addEventListener('change', () => {
    const ocultas = new Set(s.propsEmpresaOcultas);
    if (cb.checked) ocultas.delete(cb.dataset.id);
    else ocultas.add(cb.dataset.id);
    s.propsEmpresaOcultas = [...ocultas];
    guardar();
  }));
}

// Añadir (o editar) una propiedad propia de empresa.
function modalPropEmpresa(p) {
  abrirModal(p ? 'Editar propiedad' : 'Nueva propiedad de empresa', `
    ${campo('Nombre *', `<input name="label" required value="${esc(p?.label)}" placeholder="Ej. CRM que usan, Nº de sedes…">`)}
    ${campo('Tipo', `<select name="tipo">${opciones(TIPOS_PROP.filter((t) => t.id !== 'url' || p?.tipo === 'url'), p?.tipo || 'texto')}</select>`)}
    <div class="field ${p?.tipo === 'opciones' ? '' : 'oculto'}" id="prop-opciones">
      <span>Opciones (una por línea)</span>
      <textarea name="opciones" rows="5" placeholder="Opción 1&#10;Opción 2">${esc((p?.opciones || []).join('\n'))}</textarea>
    </div>
  `, (d) => {
    const label = d.label.trim();
    if (!label) return false;
    const ops = [...new Set(d.opciones.split('\n').map((x) => x.trim()).filter(Boolean))];
    if (d.tipo === 'opciones' && !ops.length) {
      alert('Escribe al menos una opción.');
      return false;
    }
    const datos = { label, tipo: d.tipo, opciones: d.tipo === 'opciones' ? ops : [] };
    if (p) Object.assign(p, datos);
    else db.settings.propsEmpresaExtra.push({ id: 'x' + uid(), ...datos });
    guardar();
    render();
  });
  $('[name=tipo]', modal).addEventListener('change', (e) => $('#prop-opciones', modal).classList.toggle('oculto', e.target.value !== 'opciones'));
}

// Datos de versiones anteriores: la empresa era un texto en cada contacto y no había propietarios.
function migrar() {
  let cambios = false;
  if (!db.users.some((u) => u.id === YO)) {
    db.users.unshift({ id: YO, nombre: 'Martín', email: '', creado: ahora() });
    cambios = true;
  }
  db.contacts.forEach((c) => {
    if ('empresa' in c) {
      c.companyId = empresaPorNombre(c.empresa || '')?.id || null;
      // La web y la ciudad del contacto eran en realidad las de su empresa.
      const e = empresa(c.companyId);
      if (e && !e.web && c.web) e.web = c.web;
      if (e && !e.ciudad && c.ciudad) e.ciudad = c.ciudad;
      delete c.empresa;
      cambios = true;
    }
    if (!('ownerId' in c)) {
      c.ownerId = YO;
      cambios = true;
    }
  });
  if (cambios) guardar();
}

definirRender(pintarVista);

window.addEventListener('hashchange', () => {
  ui.editor = null;
  render();
  window.scrollTo(0, 0);
});

// Cada minuto se actualizan el reloj y los contadores del menú.
setInterval(actualizarBadges, 60 * 1000);

// Carga los datos del servidor, completa lo que falte (datos de versiones anteriores) y pinta.
export async function iniciar() {
  try {
    const r = await fetch('/api/data');
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    setDb(await r.json());
  } catch (err) {
    app.innerHTML = `<div class="empty card"><p><strong>No se pudieron cargar los datos.</strong></p><p class="muted">${esc(err.message)}</p></div>`;
    return;
  }
  db.contacts ||= [];
  db.notes ||= [];
  db.tasks ||= [];
  db.actions ||= [];
  db.companies ||= [];
  db.users ||= [];
  db.views ||= [];
  db.taskViews ||= [];
  db.imports ||= [];
  db.sequences ||= [];
  db.enrollments ||= [];
  db.settings = { ...AJUSTES_DEFECTO, ...db.settings };
  db.settings.propsEmpresaOcultas ||= [];
  db.settings.propsEmpresaExtra ||= [];
  migrar();
  render();
}

Object.assign(acciones, {
  // Equipo
  'nuevo-usuario': () => modalUsuario(),
  'editar-usuario': (el) => modalUsuario(usuario(el.dataset.id)),
  'ver-contactos-de': (el) => {
    cargarVista('todos');
    ui.filtros.ownerId = el.dataset.id;
    location.hash = '#/';
  },
  'nueva-prop-empresa': () => modalPropEmpresa(),
  'editar-prop-empresa': (el) => modalPropEmpresa(db.settings.propsEmpresaExtra.find((p) => p.id === el.dataset.id)),
  'borrar-prop-empresa': (el) => {
    const p = db.settings.propsEmpresaExtra.find((x) => x.id === el.dataset.id);
    const n = db.companies.filter((e) => e.extra?.[p.id]).length;
    if (!confirm(`¿Eliminar la propiedad «${p.label}»?${n ? ` Se borrará su valor en ${n} empresa${n === 1 ? '' : 's'}.` : ''}\n\nSi solo quieres dejar de verla, desactívala.`)) return;
    db.settings.propsEmpresaExtra = db.settings.propsEmpresaExtra.filter((x) => x !== p);
    db.settings.propsEmpresaOcultas = db.settings.propsEmpresaOcultas.filter((id) => id !== p.id);
    db.companies.forEach((e) => { if (e.extra) delete e.extra[p.id]; });
    guardar();
    render();
  },
});
