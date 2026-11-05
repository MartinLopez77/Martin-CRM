// @ts-nocheck: se tipa al moverlo a src/features/ (este archivo desaparece al terminar la refactorización).
// Código de las features que todavía no se han movido a src/features/ (se va vaciando fase a fase).
import { tipoAccionDe, TIPOS_ACCION } from './features/activity/schema.js';
import { ESTADOS_LEAD, TIPOS_PROP } from './features/companies/schema.js';
import {
  contactosDeEmpresa, empresa, empresaDe, empresaPorNombre, estadoLeadDe, propsEmpresa, propVisible,
} from './features/companies/store.js';
import { vistaEmpresa, vistaEmpresas } from './features/companies/views.js';
import { estadoDe } from './features/contacts/schema.js';
import { cargarVista, contacto, contactosOrdenados, tocar } from './features/contacts/store.js';
import { vistaContacto } from './features/contacts/views/detail.js';
import { vistaContactos } from './features/contacts/views/list.js';
import { completarActualEnCola, enModoCola, irEnCola } from './features/queue/store.js';
import { vistaSecuencia } from './features/queue/views.js';
import { activarTareas, modalRapido } from './features/tasks/editor.js';
import { PRIORIDADES } from './features/tasks/schema.js';
import { tarea } from './features/tasks/store.js';
import { vistaTareas } from './features/tasks/views/list.js';
import { acciones } from './shared/actions.js';
import { leerArchivoTexto, leerCSV } from './shared/lib/csv.js';
import { fmtFecha, fmtRelativa, horaActual, horaLocal, hoy, sumarDias } from './shared/lib/dates.js';
import { ahora, esc, iniciales, normalizar, uid } from './shared/lib/text.js';
import { guardar } from './shared/persistence.js';
import { definirRender, render, rutaActual } from './shared/router.js';
import { AJUSTES_DEFECTO, db, setDb, ui } from './shared/state.js';
import { $, app } from './shared/ui/dom.js';
import { activarEditores, ajustarScroll } from './shared/ui/editor-md.js';
import { campo, campoFecha, opciones } from './shared/ui/html.js';
import { ico } from './shared/ui/icons.js';
import { abrirModal, botonBorrarModal, modal } from './shared/ui/modal.js';
import { avisar } from './shared/ui/toast.js';

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

// Tipos de paso de una secuencia: cada paso crea una tarea de ese tipo de acción.
const TIPOS_PASO = ['llamada', 'email', 'whatsapp', 'videollamada', 'reunion', 'otra'];

// Hora secundaria entre paréntesis (nada si está desactivada en Ajustes).
const enLocal = (texto) => {
  const z = zonaSecundaria();
  return z ? `<span class="local" title="Hora de ${z.label}">(${texto} ${z.sufijo})</span>` : '';
};
export const conLocal = (hhmm, fecha) => (hhmm ? `${hhmm} ${zonaSecundaria() ? enLocal(horaLocal(hhmm, fecha, true, zonaSecundaria().id)) : ''}`.trim() : '');
export const usuario = (id) => db.users.find((u) => u.id === id);
export const nombreUsuario = (id) => (id === YO ? `${usuario(YO)?.nombre || 'Yo'} (yo)` : usuario(id)?.nombre || 'Sin propietario');
export const secuencia = (id) => db.sequences.find((s) => s.id === id);
export const inscripcion = (id) => db.enrollments.find((e) => e.id === id);
export const inscripcionActiva = (contactId) => db.enrollments.find((e) => e.contactId === contactId && e.estado === 'activa');

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

const textoEspera = (p, i) => {
  const dias = +p.espera || 0;
  const n = `${dias} día${dias === 1 ? '' : 's'}`;
  if (i === 0) return dias ? `${n} después de inscribir` : 'Al inscribir';
  return dias ? `${n} después del paso anterior` : 'Justo después del paso anterior';
};

// "Llamar a {nombre} de {empresa}" → con los datos del contacto.
const rellenarPlantilla = (texto, c) =>
  (texto || '').replace(/\{nombre\}/gi, c.nombre.split(/\s+/)[0]).replace(/\{empresa\}/gi, empresaDe(c)).replace(/\s{2,}/g, ' ').trim();

// Crea la tarea del paso `i` de una inscripción: fecha `base` + los días de espera del paso.
function crearTareaPaso(ins, i, base) {
  const p = secuencia(ins.sequenceId).pasos[i];
  const c = contacto(ins.contactId);
  const t = {
    id: uid(),
    titulo: rellenarPlantilla(p.titulo, c) || `${tipoAccionDe(p.tipo).label} · ${c.nombre}`,
    detalle: rellenarPlantilla(p.detalle, c),
    contactId: c.id,
    accion: p.tipo,
    fecha: sumarDias(base, +p.espera || 0),
    hora: null,
    prioridad: p.prioridad || 'ninguna',
    hecha: false,
    completada: null,
    creado: ahora(),
    enrollmentId: ins.id,
    paso: i,
  };
  db.tasks.push(t);
  ins.paso = i;
  ins.tareaId = t.id;
  return t;
}

// Inscribe contactos en una secuencia. Cada contacto solo puede estar en una secuencia activa a la vez.
function inscribir(s, contactos, inicio = hoy()) {
  const libres = contactos.filter((c) => !inscripcionActiva(c.id));
  libres.forEach((c) => {
    const ins = { id: uid(), sequenceId: s.id, contactId: c.id, paso: 0, estado: 'activa', tareaId: null, inicio: ahora(), fin: null };
    db.enrollments.push(ins);
    crearTareaPaso(ins, 0, inicio);
    tocar(c.id);
  });
  const n = libres.length;
  const saltados = contactos.length - n;
  avisar(`${n} contacto${n === 1 ? '' : 's'} inscrito${n === 1 ? '' : 's'} en «${s.nombre}»${saltados ? ` · ${saltados} ya estaba${saltados === 1 ? '' : 'n'} en una secuencia` : ''}`);
}

// Al completar la tarea de un paso se crea la del siguiente; tras el último, la secuencia termina.
export function avanzarSecuencia(t) {
  const ins = inscripcion(t.enrollmentId);
  const s = ins && secuencia(ins.sequenceId);
  if (!s || ins.estado !== 'activa' || ins.tareaId !== t.id) return;
  if (t.paso + 1 < s.pasos.length) t.siguienteId = crearTareaPaso(ins, t.paso + 1, hoy()).id;
  else Object.assign(ins, { estado: 'terminada', fin: ahora() });
}

// Deshacer: la tarea vuelve a estar pendiente y se quita la del paso siguiente si aún no se ha hecho.
export function retrocederSecuencia(t) {
  const ins = inscripcion(t.enrollmentId);
  if (!ins || ins.estado === 'cancelada') return;
  const sig = t.siguienteId && tarea(t.siguienteId);
  if (sig?.hecha) return;
  if (sig) db.tasks = db.tasks.filter((x) => x.id !== sig.id);
  delete t.siguienteId;
  Object.assign(ins, { estado: 'activa', paso: t.paso, tareaId: t.id, fin: null });
}

function sacarDeSecuencia(ins) {
  Object.assign(ins, { estado: 'cancelada', fin: ahora() });
  const t = tarea(ins.tareaId);
  if (t && !t.hecha) db.tasks = db.tasks.filter((x) => x.id !== t.id);
  tocar(ins.contactId);
}

export const avisoSecuencia = (t) => {
  const ins = t.enrollmentId && inscripcion(t.enrollmentId);
  return ins && ins.estado === 'activa' && ins.tareaId === t.id ? `\n\nEs el paso actual de la secuencia «${secuencia(ins.sequenceId)?.nombre}»: el contacto saldrá de ella.` : '';
};

function vistaSecuencias() {
  app.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Secuencias <span class="h1-count">${db.sequences.length}</span></h1>
        <p class="muted">Pasos (llamar, email, WhatsApp…) separados por días. Al inscribir a un contacto se crea la tarea del primer paso; al completarla, la del siguiente.</p>
      </div>
      <button class="btn primary" data-action="nueva-secuencia">+ Nueva secuencia</button>
    </div>
    ${db.sequences.length ? `
      <div class="card table-wrap">
        <table class="tabla">
          <thead><tr><th>Secuencia</th><th>Pasos</th><th>Activos</th><th>Terminados</th><th>Sacados</th></tr></thead>
          <tbody>
            ${db.sequences.map((s) => {
              const ins = db.enrollments.filter((e) => e.sequenceId === s.id);
              const n = (estado) => ins.filter((e) => e.estado === estado).length;
              const dias = s.pasos.reduce((a, p) => a + (+p.espera || 0), 0);
              return `
                <tr data-action="abrir-secuencia" data-id="${s.id}">
                  <td><strong>${esc(s.nombre)}</strong>${s.descripcion ? `<div class="muted small">${esc(s.descripcion)}</div>` : ''}</td>
                  <td class="small">${s.pasos.length} paso${s.pasos.length === 1 ? '' : 's'}${s.pasos.length ? ` <span class="muted">· ${dias + 1} día${dias ? 's' : ''}</span>` : ''}</td>
                  <td>${n('activa')}</td>
                  <td>${n('terminada')}</td>
                  <td class="muted">${n('cancelada')}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="empty card">
        <p><strong>Aún no hay secuencias.</strong></p>
        <p class="muted">Por ejemplo, «Primer contacto»: llamar el día 1, email el día 3 y WhatsApp el día 7.</p>
        <button class="btn primary" data-action="nueva-secuencia">+ Nueva secuencia</button>
      </div>`}`;
}

const ORDEN_INSCRIPCION = { activa: 0, terminada: 1, cancelada: 2 };

function vistaSecuenciaDetalle(id) {
  const s = secuencia(id);
  const ins = db.enrollments.filter((e) => e.sequenceId === id && contacto(e.contactId))
    .sort((a, b) => ORDEN_INSCRIPCION[a.estado] - ORDEN_INSCRIPCION[b.estado] || (b.inicio || '').localeCompare(a.inicio || ''));
  const activos = ins.filter((e) => e.estado === 'activa').length;
  let dia = 1;

  app.innerHTML = `
    <a href="#/secuencias" class="back">← Secuencias</a>
    <div class="page-head">
      <div>
        <h1>${esc(s.nombre)}</h1>
        ${s.descripcion ? `<p class="muted">${esc(s.descripcion)}</p>` : ''}
      </div>
      <div class="row">
        <span class="td-pop-wrap">
          <button type="button" class="icon-btn" data-td-pop aria-haspopup="true" title="Más opciones">${ico('puntos')}</button>
          <div class="td-pop pop-derecha" hidden>
            <button type="button" data-action="editar-secuencia" data-id="${s.id}">${ico('editar')} Editar nombre</button>
            <button type="button" class="pop-peligro" data-action="borrar-secuencia" data-id="${s.id}">${ico('papelera')} Eliminar secuencia</button>
          </div>
        </span>
        <button class="btn primary" data-action="inscribir-en" data-id="${s.id}" ${s.pasos.length ? '' : 'disabled title="Añade al menos un paso"'}>+ Inscribir contactos</button>
      </div>
    </div>

    <div class="seq-grid">
      <section>
        <div class="col-titulo"><h2>Pasos <span class="count">${s.pasos.length}</span></h2></div>
        <div class="seq-pasos">
          ${s.pasos.map((p, i) => {
            dia += +p.espera || 0;
            const ta = tipoAccionDe(p.tipo);
            return `
              ${i > 0 || p.espera ? `<div class="seq-espera">${ico('reloj')} ${textoEspera(p, i)}</div>` : ''}
              <div class="card seq-paso">
                <span class="tl-punto">${ico(ta.icon)}</span>
                <div class="grow seq-paso-cuerpo" data-action="editar-paso" data-id="${s.id}" data-i="${i}">
                  <div class="small muted">Paso ${i + 1} · Día ${dia} · ${ta.label}</div>
                  <strong>${esc(p.titulo) || `${ta.label} · {nombre}`}</strong>
                  ${p.detalle ? `<div class="small muted">${esc(p.detalle)}</div>` : ''}
                </div>
                <div class="seq-paso-botones">
                  <button class="icon-btn" data-action="mover-paso" data-id="${s.id}" data-i="${i}" data-d="-1" title="Subir" ${i === 0 ? 'disabled' : ''}>${ico('subir')}</button>
                  <button class="icon-btn" data-action="mover-paso" data-id="${s.id}" data-i="${i}" data-d="1" title="Bajar" ${i === s.pasos.length - 1 ? 'disabled' : ''}>${ico('bajar')}</button>
                </div>
              </div>`;
          }).join('')}
          <button class="td-anadir" data-action="nuevo-paso" data-id="${s.id}"><span class="td-mas">+</span> Añadir paso</button>
        </div>
        <p class="muted small">En el título y las instrucciones puedes escribir <b>{nombre}</b> y <b>{empresa}</b>: se cambian por los del contacto.</p>
      </section>

      <section>
        <div class="col-titulo"><h2>Inscritos <span class="count">${activos} activo${activos === 1 ? '' : 's'}</span></h2></div>
        ${ins.length ? `
          <div class="card table-wrap">
            <table class="tabla">
              <thead><tr><th>Contacto</th><th>Progreso</th><th>Tarea actual</th><th></th></tr></thead>
              <tbody>
                ${ins.map((e) => {
                  const c = contacto(e.contactId);
                  const t = e.estado === 'activa' && tarea(e.tareaId);
                  const hechos = e.estado === 'terminada' ? s.pasos.length : e.paso;
                  const progreso = e.estado === 'activa' ? `Paso ${e.paso + 1} de ${s.pasos.length}`
                    : e.estado === 'terminada' ? '<span class="txt-ok">Terminada</span>' : '<span class="muted">Sacado</span>';
                  return `
                    <tr data-action="abrir-contacto" data-id="${c.id}">
                      <td><strong>${esc(c.nombre)}</strong><div class="muted small">${esc(empresaDe(c))}</div></td>
                      <td class="small">${progreso}<div class="seq-progreso"><i style="width:${(hechos / Math.max(1, s.pasos.length)) * 100}%"></i></div></td>
                      <td class="small">${t ? `<div class="${t.fecha && t.fecha < hoy() ? 'txt-danger' : ''}">${t.fecha ? fmtRelativa(t.fecha) : 'Sin fecha'}</div><div class="muted truncate">${esc(t.titulo)}</div>` : '<span class="muted">—</span>'}</td>
                      <td>${e.estado === 'activa' ? `<button class="btn sm" data-action="sacar-secuencia" data-id="${e.id}">Sacar</button>` : ''}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty card"><p class="muted">Nadie inscrito todavía. Inscribe contactos desde aquí o seleccionándolos en la tabla de Contactos.</p></div>'}
      </section>
    </div>`;
}

function modalSecuencia(s) {
  abrirModal(s ? 'Editar secuencia' : 'Nueva secuencia', `
    ${campo('Nombre *', `<input name="nombre" required value="${esc(s?.nombre)}" placeholder="Ej. Primer contacto">`)}
    ${campo('Descripción', `<input name="descripcion" value="${esc(s?.descripcion)}" placeholder="Para qué es (opcional)">`)}
  `, (d) => {
    const nombre = d.nombre.trim();
    if (!nombre) return false;
    if (s) {
      Object.assign(s, { nombre, descripcion: d.descripcion.trim() });
      guardar();
      render();
    } else {
      const ns = { id: uid(), nombre, descripcion: d.descripcion.trim(), pasos: [], creado: ahora() };
      db.sequences.push(ns);
      guardar();
      location.hash = '#/secuencias/' + ns.id;
    }
  });
}

// Añadir un paso (i = null) o editar el paso i.
function modalPaso(s, i = null) {
  const nuevo = i === null;
  const p = nuevo ? { tipo: 'llamada', titulo: '', detalle: '', espera: s.pasos.length ? 2 : 0, prioridad: 'ninguna' } : s.pasos[i];
  const primero = (nuevo ? s.pasos.length : i) === 0;
  abrirModal(nuevo ? 'Nuevo paso' : `Paso ${i + 1}`, `
    <div class="row3">
      ${campo('Tipo', `<select name="tipo">${opciones(TIPOS_ACCION.filter((t) => TIPOS_PASO.includes(t.id)), p.tipo)}</select>`)}
      ${campo(primero ? 'Días tras inscribir' : 'Días tras el paso anterior', `<input type="number" name="espera" min="0" max="365" value="${+p.espera || 0}">`)}
      ${campo('Prioridad', `<select name="prioridad">${opciones(PRIORIDADES, p.prioridad || 'ninguna')}</select>`)}
    </div>
    ${campo('Título de la tarea', `<input name="titulo" value="${esc(p.titulo)}" placeholder="Ej. Llamar a {nombre} para presentar Diga">`)}
    ${campo('Instrucciones', `<input name="detalle" value="${esc(p.detalle)}" placeholder="Ej. Preguntar cuántas llamadas reciben al día">`)}
  `, (d) => {
    const datos = { tipo: d.tipo, espera: Math.max(0, Math.round(+d.espera || 0)), prioridad: d.prioridad, titulo: d.titulo.trim(), detalle: d.detalle.trim() };
    if (nuevo) s.pasos.push({ id: uid(), ...datos });
    else Object.assign(s.pasos[i], datos);
    guardar();
    render();
  });
  if (!nuevo) {
    botonBorrarModal(() => {
      const enUso = db.enrollments.some((e) => e.sequenceId === s.id && e.estado === 'activa' && e.paso === i);
      if (!confirm(`¿Eliminar el paso ${i + 1}?${enUso ? ' Hay contactos en este paso: su tarea actual se mantiene.' : ''}`)) return false;
      s.pasos.splice(i, 1);
      guardar();
      render();
    });
  }
}

// Elegir la secuencia en la que inscribir unos contactos (acción masiva, ficha o empresa).
export function modalInscribir(contactos, alTerminar = () => {}) {
  const conPasos = db.sequences.filter((s) => s.pasos.length);
  if (!conPasos.length) {
    avisar(db.sequences.length ? 'Añade pasos a una secuencia para poder inscribir contactos' : 'Primero crea una secuencia');
    location.hash = '#/secuencias';
    return;
  }
  const yaEn = contactos.filter((c) => inscripcionActiva(c.id)).length;
  const titulo = contactos.length === 1 ? `Inscribir a ${contactos[0].nombre}` : `Inscribir ${contactos.length} contactos`;
  abrirModal(titulo, `
    ${campo('Secuencia', `<select name="sequenceId">${conPasos.map((s) => `<option value="${s.id}">${esc(s.nombre)} · ${s.pasos.length} paso${s.pasos.length === 1 ? '' : 's'}</option>`).join('')}</select>`)}
    ${campo('Empezar', campoFecha('inicio', hoy()))}
    ${yaEn ? `<p class="muted small">${yaEn === contactos.length && yaEn === 1 ? 'Ya está' : `${yaEn} ya está${yaEn === 1 ? '' : 'n'}`} en una secuencia activa: no se inscribirá${yaEn === 1 ? '' : 'n'} otra vez.</p>` : ''}
  `, (d) => {
    const s = secuencia(d.sequenceId);
    if (!s) return false;
    inscribir(s, contactos, d.inicio || hoy());
    alTerminar();
    guardar();
    render();
  });
}

// Elegir contactos desde la página de la secuencia.
function modalElegirContactos(s) {
  const libres = contactosOrdenados().filter((c) => !inscripcionActiva(c.id));
  abrirModal(`Inscribir en «${s.nombre}»`, `
    <input type="search" class="buscar-modal" placeholder="Buscar contacto o empresa…">
    <div class="elegir-lista">
      ${libres.map((c) => `
        <label class="elegir-fila" data-texto="${esc(`${c.nombre} ${empresaDe(c)}`.toLowerCase())}">
          <input type="checkbox" name="c-${c.id}">
          <span class="grow"><strong>${esc(c.nombre)}</strong> <span class="muted small">${esc(empresaDe(c))}</span></span>
          <span class="muted small">${estadoDe(c.estado).label}</span>
        </label>`).join('') || '<p class="muted">Todos los contactos están ya en alguna secuencia activa.</p>'}
    </div>
    ${campo('Empezar', campoFecha('inicio', hoy()))}
  `, (d) => {
    const elegidos = libres.filter((c) => d[`c-${c.id}`]);
    if (!elegidos.length) return false;
    inscribir(s, elegidos, d.inicio || hoy());
    guardar();
    render();
  });
  $('.buscar-modal', modal).addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    modal.querySelectorAll('.elegir-fila').forEach((f) => (f.hidden = !!q && !f.dataset.texto.includes(q)));
  });
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

export const nombresImportaciones = () =>
  [...new Set([...db.imports.map((i) => i.nombre), ...db.contacts.map((c) => c.importacion).filter(Boolean)])];

// Campos a los que se puede llevar cada columna del CSV; `alias` sirve para adivinarlo por la cabecera.
const CAMPOS_IMPORTAR = [
  { id: 'nombre', label: 'Nombre completo', alias: ['nombre completo', 'name', 'full name', 'contacto', 'nombre y apellidos'] },
  { id: 'pila', label: 'Nombre', alias: ['nombre', 'first name', 'firstname', 'first_name'] },
  { id: 'apellidos', label: 'Apellidos', alias: ['apellidos', 'apellido', 'last name', 'lastname', 'last_name', 'surname'] },
  { id: 'email', label: 'Email', alias: ['email', 'e-mail', 'correo', 'correo electronico', 'mail', 'email address'] },
  { id: 'telefono', label: 'Teléfono', alias: ['telefono', 'phone', 'phone number', 'movil', 'mobile', 'mobile phone number', 'tel'] },
  { id: 'empresa', label: 'Empresa', alias: ['empresa', 'company', 'company name', 'compania', 'organizacion', 'nombre de la empresa'] },
  { id: 'cargo', label: 'Cargo', alias: ['cargo', 'job title', 'puesto', 'title', 'position'] },
  { id: 'ciudad', label: 'Ciudad', alias: ['ciudad', 'city', 'localidad', 'poblacion'] },
  { id: 'web', label: 'Web', alias: ['web', 'website', 'website url', 'url', 'dominio', 'domain', 'pagina web', 'company domain name'] },
  { id: 'origen', label: 'Origen', alias: ['origen', 'source', 'fuente', 'lead source'] },
  { id: 'etiquetas', label: 'Etiquetas', alias: ['etiquetas', 'tags'] },
  { id: 'estadoLead', label: 'Estado lead (empresa)', alias: ['estado lead', 'lead status', 'estado del lead'] },
];

const adivinarCampo = (cabecera) => CAMPOS_IMPORTAR.find((f) => f.alias.includes(normalizar(cabecera)))?.id || '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Separa las filas en contactos nuevos y descartadas: solo entra un contacto si su email es válido y único
// (que no exista ya en el CRM ni esté repetido dentro del propio archivo).
function analizarImportacion(filas, mapa) {
  const existentes = new Set(db.contacts.map((c) => normalizar(c.email)).filter(Boolean));
  const vistos = new Set();
  const r = { nuevos: [], duplicados: 0, repetidos: 0, sinEmail: 0 };
  filas.forEach((fila) => {
    const o = {};
    mapa.forEach((campoId, i) => { if (campoId && fila[i]?.trim()) o[campoId] = fila[i].trim(); });
    const email = normalizar(o.email);
    if (!EMAIL_RE.test(email)) r.sinEmail++;
    else if (existentes.has(email)) r.duplicados++;
    else if (vistos.has(email)) r.repetidos++;
    else {
      vistos.add(email);
      r.nuevos.push({ ...o, email });
    }
  });
  return r;
}

function modalImportar() {
  let filas = [];
  let mapa = [];
  abrirModal('Importar contactos desde CSV', `
    <p class="muted small">La primera fila del archivo tiene que ser la de los nombres de las columnas. Solo se importan contactos con un <b>email único</b>: si ya hay un contacto con ese email, o el email está repetido en el archivo, esa fila se salta.</p>
    ${campo('Archivo CSV *', '<input type="file" name="archivo" accept=".csv,text/csv,.txt" required>')}
    ${campo('Nombre de la importación *', '<input name="nombreImp" required placeholder="Ej. Clínicas Madrid noviembre">')}
    <div id="imp-mapa"></div>
    <div id="imp-resumen"></div>
  `, (d) => {
    const nombreImp = d.nombreImp.trim();
    if (!nombreImp) return false;
    if (nombresImportaciones().some((n) => normalizar(n) === normalizar(nombreImp))) {
      alert(`Ya hay una importación llamada «${nombreImp}». Ponle otro nombre para poder distinguirlas.`);
      return false;
    }
    if (!mapa.includes('email')) {
      alert('Indica qué columna es la del email.');
      return false;
    }
    const r = analizarImportacion(filas, mapa);
    if (!r.nuevos.length) {
      alert('No hay ningún contacto nuevo que importar.');
      return false;
    }
    const empresasAntes = new Set(db.companies.map((e) => e.id));
    r.nuevos.forEach((o) => {
      const e = o.empresa ? empresaPorNombre(o.empresa) : null;
      if (e && !empresasAntes.has(e.id)) {
        e.importacion = nombreImp;
        if (o.web && !e.web) e.web = o.web;
        if (o.ciudad && !e.ciudad) e.ciudad = o.ciudad;
      }
      // "Open deal", "open_deal" o "✅ Open deal": se acepta el valor interno o la etiqueta, con o sin emoji.
      const sinEmoji = (s) => normalizar(s.replace(/^\P{L}+/u, ''));
      const lead = o.estadoLead && ESTADOS_LEAD.find((x) =>
        [x.id, x.id.replace('_', ' '), x.label].map(sinEmoji).includes(sinEmoji(o.estadoLead)));
      if (e && lead && !e.estadoLead) e.estadoLead = lead.id;
      db.contacts.push({
        id: uid(),
        nombre: o.nombre || [o.pila, o.apellidos].filter(Boolean).join(' ') || o.email.split('@')[0],
        companyId: e?.id || null,
        ownerId: YO,
        cargo: o.cargo || '',
        email: o.email,
        telefono: o.telefono || '',
        web: o.web || '',
        ciudad: o.ciudad || '',
        estado: 'nuevo',
        origen: o.origen || 'Importación',
        etiquetas: (o.etiquetas || '').split(/[,;]/).map((x) => x.trim()).filter(Boolean),
        importacion: nombreImp,
        creado: ahora(),
        actualizado: ahora(),
      });
    });
    db.imports.push({ id: uid(), nombre: nombreImp, fecha: hoy(), creados: r.nuevos.length, duplicados: r.duplicados + r.repetidos, sinEmail: r.sinEmail, creado: ahora() });
    guardar();
    cargarVista('todos');
    ui.filtros.importacion = nombreImp;
    if (location.hash === '#/' || location.hash === '') render();
    else location.hash = '#/';
    avisar(`${r.nuevos.length} contacto${r.nuevos.length === 1 ? '' : 's'} importado${r.nuevos.length === 1 ? '' : 's'} en «${nombreImp}»`);
  });

  const form = $('form', modal);
  $('.modal-actions .primary', modal).textContent = 'Importar contactos';
  const pintarResumen = () => {
    if (!filas.length) return;
    const r = analizarImportacion(filas, mapa);
    $('#imp-resumen', modal).innerHTML = `
      <div class="imp-resumen ${r.nuevos.length ? '' : 'vacio'}">
        <b>${r.nuevos.length} contacto${r.nuevos.length === 1 ? '' : 's'} nuevo${r.nuevos.length === 1 ? '' : 's'}</b> de ${filas.length} fila${filas.length === 1 ? '' : 's'}
        ${r.duplicados ? `<div class="small">· ${r.duplicados} ya ${r.duplicados === 1 ? 'existe' : 'existen'} en el CRM (mismo email): no se ${r.duplicados === 1 ? 'importa' : 'importan'}</div>` : ''}
        ${r.repetidos ? `<div class="small">· ${r.repetidos} con el email repetido en el archivo: solo entra la primera fila</div>` : ''}
        ${r.sinEmail ? `<div class="small">· ${r.sinEmail} sin email válido: no se ${r.sinEmail === 1 ? 'importa' : 'importan'}</div>` : ''}
        ${mapa.includes('email') ? '' : '<div class="small txt-danger">Falta indicar la columna del email.</div>'}
      </div>`;
  };

  form.archivo.addEventListener('change', async () => {
    const archivo = form.archivo.files[0];
    if (!archivo) return;
    const todas = leerCSV(await leerArchivoTexto(archivo));
    if (todas.length < 2) {
      $('#imp-mapa', modal).innerHTML = '<p class="txt-danger small">El archivo no tiene filas de datos.</p>';
      filas = [];
      return;
    }
    const [cabeceras, ...resto] = todas;
    filas = resto;
    mapa = cabeceras.map(adivinarCampo);
    if (!form.nombreImp.value.trim()) form.nombreImp.value = `${archivo.name.replace(/\.[^.]+$/, '')} · ${fmtFecha(hoy())}`;
    $('#imp-mapa', modal).innerHTML = `
      <div class="field"><span>Columnas del archivo → datos del contacto</span>
        <div class="imp-tabla">
          ${cabeceras.map((cab, i) => `
            <div class="imp-fila">
              <span class="grow"><strong>${esc(cab) || `Columna ${i + 1}`}</strong><span class="muted small truncate">${esc(filas.find((f) => f[i]?.trim())?.[i] || '')}</span></span>
              <select data-col="${i}">
                <option value="">No importar</option>
                ${CAMPOS_IMPORTAR.map((f) => `<option value="${f.id}" ${f.id === mapa[i] ? 'selected' : ''}>${f.label}</option>`).join('')}
              </select>
            </div>`).join('')}
        </div>
      </div>`;
    pintarResumen();
  });
  $('#imp-mapa', modal).addEventListener('change', (e) => {
    if (!e.target.dataset.col) return;
    mapa[+e.target.dataset.col] = e.target.value;
    pintarResumen();
  });
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
  // Secuencias
  'nueva-secuencia': () => modalSecuencia(),
  'editar-secuencia': (el) => modalSecuencia(secuencia(el.dataset.id)),
  'abrir-secuencia': (el) => { location.hash = '#/secuencias/' + el.dataset.id; },
  'borrar-secuencia': (el) => {
    const s = secuencia(el.dataset.id);
    const activas = db.enrollments.filter((e) => e.sequenceId === s.id && e.estado === 'activa');
    if (!confirm(`¿Eliminar la secuencia «${s.nombre}»?${activas.length ? `\n\nSe sacará a ${activas.length} contacto${activas.length === 1 ? '' : 's'} y se borrará su tarea pendiente de la secuencia.` : ''}`)) return;
    activas.forEach(sacarDeSecuencia);
    db.enrollments = db.enrollments.filter((e) => e.sequenceId !== s.id);
    db.tasks.forEach((t) => { if (t.enrollmentId && !inscripcion(t.enrollmentId)) { delete t.enrollmentId; delete t.paso; delete t.siguienteId; } });
    db.sequences = db.sequences.filter((x) => x.id !== s.id);
    guardar();
    location.hash = '#/secuencias';
  },
  'nuevo-paso': (el) => modalPaso(secuencia(el.dataset.id)),
  'editar-paso': (el) => modalPaso(secuencia(el.dataset.id), +el.dataset.i),
  'mover-paso': (el) => {
    const s = secuencia(el.dataset.id);
    const i = +el.dataset.i;
    const j = i + +el.dataset.d;
    if (j < 0 || j >= s.pasos.length) return;
    [s.pasos[i], s.pasos[j]] = [s.pasos[j], s.pasos[i]];
    guardar();
    render();
  },
  'inscribir-en': (el) => modalElegirContactos(secuencia(el.dataset.id)),
  'inscribir-contacto': (el) => modalInscribir([contacto(el.dataset.id)]),
  'sacar-secuencia': (el) => {
    const ins = inscripcion(el.dataset.id);
    const c = contacto(ins.contactId);
    if (!confirm(`¿Sacar a ${c.nombre} de «${secuencia(ins.sequenceId)?.nombre}»? Se borrará su tarea pendiente de la secuencia.`)) return;
    sacarDeSecuencia(ins);
    guardar();
    render();
  },
  // Importar CSV y propiedades de empresa
  'importar-csv': () => modalImportar(),
  'ver-importacion': (el) => {
    cargarVista('todos');
    ui.filtros.importacion = el.dataset.nombre;
    if (rutaActual().ruta) location.hash = '#/';
    else render();
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
