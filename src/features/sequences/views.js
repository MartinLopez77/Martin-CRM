// Secuencias: la lista (#/secuencias), el detalle con pasos e inscritos y sus formularios.
import { tipoAccionDe, TIPOS_ACCION } from '../activity/schema.js';
import { empresaDe } from '../companies/store.js';
import { estadoDe } from '../contacts/schema.js';
import { contacto, contactosOrdenados } from '../contacts/store.js';
import { ORDEN_INSCRIPCION, TIPOS_PASO } from './schema.js';
import { inscribir, inscripcionActiva, secuencia, secuenciaExistente, textoEspera } from './store.js';
import { PRIORIDADES } from '../tasks/schema.js';
import { tarea } from '../tasks/store.js';
import { fmtRelativa, hoy } from '../../shared/lib/dates.js';
import { ahora, esc, plural, uid } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db } from '../../shared/state.js';
import { $, app } from '../../shared/ui/dom.js';
import { campo, campoFecha, opciones } from '../../shared/ui/html.js';
import { ico } from '../../shared/ui/icons.js';
import { abrirModal, botonBorrarModal, modal } from '../../shared/ui/modal.js';
import { avisar } from '../../shared/ui/toast.js';

export function vistaSecuencias() {
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
              /** @param {string} estado */
              const n = (estado) => ins.filter((e) => e.estado === estado).length;
              const dias = s.pasos.reduce((/** @type {number} */ a, p) => a + (+p.espera || 0), 0);
              return `
                <tr data-action="abrir-secuencia" data-id="${s.id}">
                  <td><strong>${esc(s.nombre)}</strong>${s.descripcion ? `<div class="muted small">${esc(s.descripcion)}</div>` : ''}</td>
                  <td class="small">${s.pasos.length} paso${plural(s.pasos.length)}${s.pasos.length ? ` <span class="muted">· ${dias + 1} día${dias ? 's' : ''}</span>` : ''}</td>
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

/** El detalle de una secuencia (solo se pinta si existe). @param {string} id */
export function vistaSecuenciaDetalle(id) {
  const s = secuenciaExistente(id);
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
        <div class="col-titulo"><h2>Inscritos <span class="count">${activos} activo${plural(activos)}</span></h2></div>
        ${ins.length ? `
          <div class="card table-wrap">
            <table class="tabla">
              <thead><tr><th>Contacto</th><th>Progreso</th><th>Tarea actual</th><th></th></tr></thead>
              <tbody>
                ${ins.map((e) => {
                  // `ins` solo tiene inscripciones de contactos que existen
                  const c = /** @type {import('../contacts/schema.js').Contacto} */ (contacto(e.contactId));
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

/** Nueva secuencia, o editar el nombre de `s`. @param {import('./schema.js').Secuencia} [s] */
export function modalSecuencia(s) {
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
/** @param {import('./schema.js').Secuencia} s @param {number | null} [i] */
export function modalPaso(s, i = null) {
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
/** @param {import('../contacts/schema.js').Contacto[]} contactos @param {() => void} [alTerminar] */
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
    ${campo('Secuencia', `<select name="sequenceId">${conPasos.map((s) => `<option value="${s.id}">${esc(s.nombre)} · ${s.pasos.length} paso${plural(s.pasos.length)}</option>`).join('')}</select>`)}
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
/** @param {import('./schema.js').Secuencia} s */
export function modalElegirContactos(s) {
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
  $('.buscar-modal', modal).addEventListener('input', (/** @type {Event} */ e) => {
    const q = /** @type {HTMLInputElement} */ (e.target).value.trim().toLowerCase();
    modal.querySelectorAll('.elegir-fila').forEach((nodo) => {
      const f = /** @type {HTMLElement} */ (nodo);
      f.hidden = !!q && !/** @type {string} */ (f.dataset.texto).includes(q);
    });
  });
}
