// Arranque: cargar los datos, completar los de versiones anteriores, pintar y mantener la vista al día.
import { actualizarBadges, ordenarMenu } from './layout.js';
import { pintarVista } from './vistas.js';
import { empresa, empresaPorNombre } from '../features/companies/store.js';
import { YO } from '../features/team/store.js';
import { ahora, esc } from '../shared/lib/text.js';
import { guardar } from '../shared/persistence.js';
import { definirRender, render } from '../shared/router.js';
import { AJUSTES_DEFECTO, db, setDb, ui } from '../shared/state.js';
import { app } from '../shared/ui/dom.js';

// Datos de versiones anteriores: la empresa era un texto en cada contacto y no había propietarios.
function migrar() {
  let cambios = false;
  if (!db.users.some((u) => u.id === YO)) {
    db.users.unshift({ id: YO, nombre: 'Martín', email: '', creado: ahora() });
    cambios = true;
  }
  db.contacts.forEach((c) => {
    if ('empresa' in c) {
      c.companyId = empresaPorNombre(/** @type {string} */ (c.empresa) || '')?.id || null;
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
    app.innerHTML = `<div class="empty card"><p><strong>No se pudieron cargar los datos.</strong></p><p class="muted">${esc(/** @type {Error} */ (err).message)}</p></div>`;
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
  ordenarMenu();
  render();
}
