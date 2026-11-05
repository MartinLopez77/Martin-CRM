// Equipo: la página #/equipo y el formulario de cada persona.
import { YO } from './store.js';
import { ahora, esc, iniciales, uid } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db } from '../../shared/state.js';
import { app } from '../../shared/ui/dom.js';
import { campo } from '../../shared/ui/html.js';
import { ico } from '../../shared/ui/icons.js';
import { abrirModal, botonBorrarModal } from '../../shared/ui/modal.js';

export function vistaEquipo() {
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

/** Añadir una persona, o editar `u`. @param {import('./store.js').Usuario} [u] */
export function modalUsuario(u) {
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
