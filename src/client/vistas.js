// Qué vista se pinta en cada ruta.
import { actualizarBadges } from './layout.js';
import { empresa } from '../features/companies/store.js';
import { vistaEmpresa, vistaEmpresas } from '../features/companies/views.js';
import { vistaDashboard } from '../features/dashboard/views.js';
import { contacto } from '../features/contacts/store.js';
import { vistaContacto } from '../features/contacts/views/detail.js';
import { vistaContactos } from '../features/contacts/views/list.js';
import { vistaSecuencia } from '../features/queue/views.js';
import { secuencia } from '../features/sequences/store.js';
import { vistaSecuenciaDetalle, vistaSecuencias } from '../features/sequences/views.js';
import { vistaAjustes } from '../features/settings/views.js';
import { activarTareas } from '../features/tasks/editor.js';
import { vistaTareas } from '../features/tasks/views/list.js';
import { vistaEquipo } from '../features/team/views.js';
import { rutaActual } from '../shared/router.js';
import { ui } from '../shared/state.js';
import { $, app } from '../shared/ui/dom.js';
import { activarEditores, ajustarScroll } from '../shared/ui/editor-md.js';

export function pintarVista() {
  const { ruta, id } = rutaActual();
  if (ruta === 'hoy') { // la antigua página Hoy es ahora la vista "Hoy" de Tareas
    ui.tareasVista = 'hoy';
    location.replace('#/tareas');
    return;
  }
  const seccion = { cola: 'tareas', empresa: 'empresas', tarea: 'tareas' }[ruta] || (['dashboard', 'tareas', 'empresas', 'secuencias', 'equipo', 'ajustes'].includes(ruta) ? ruta : 'contactos');
  document.querySelectorAll('.menu a').forEach((a) => a.classList.toggle('active', /** @type {HTMLElement} */ (a).dataset.ruta === seccion));

  if (ruta === 'dashboard') vistaDashboard();
  else if (ruta === 'tareas') vistaTareas();
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
