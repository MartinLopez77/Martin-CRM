// Tareas: botones (data-action).
import { borrarTarea, completarTarea, marcarTarea, tareaExistente, tareasDeLaVista, vistaTareaPropia } from './store.js';
import { modalVistaTareas } from './views/list.js';
import { modalTarea } from './views/modal.js';
import { empezarSecuencia } from '../queue/store.js';
import { avisoSecuencia } from '../sequences/store.js';
import { registrarAcciones } from '../../shared/actions.js';
import { hoy } from '../../shared/lib/dates.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db, ui } from '../../shared/state.js';
import { campo } from '../../shared/ui/html.js';
import { abrirModal } from '../../shared/ui/modal.js';
import { avisar } from '../../shared/ui/toast.js';

registrarAcciones({
  'vista-tareas': (el) => { ui.tareasVista = el.dataset.vista; ui.editor = null; render(); },
  'nueva-vista-tareas': () => modalVistaTareas(),
  'editar-vista-tareas': (el) => modalVistaTareas(vistaTareaPropia(el.dataset.id)),
  'toggle-tarea': (el) => {
    const t = tareaExistente(el.dataset.id);
    const fila = el.closest('.td-tarea');
    if (t.hecha) {
      marcarTarea(t, false);
      guardar();
      render();
    } else if (!fila?.classList.contains('completando')) {
      // Como en Todoist: se ve la marca un momento antes de que la tarea desaparezca.
      fila?.classList.add('completando');
      setTimeout(() => completarTarea(t), 280);
    }
  },
  'completar-accion': (el) => completarTarea(tareaExistente(el.dataset.id)),
  'cancelar-reunion': (el) => completarTarea(tareaExistente(el.dataset.id), true),
  'abrir-editor': (el) => {
    ui.editor = { clave: el.dataset.clave };
    ui.enfocarTarea = true;
    render();
  },
  'reprogramar-vencidas': () => {
    const h = hoy();
    /** @type {[import('./schema.js').Tarea, string | null][]} */
    const antes = db.tasks.filter((t) => !t.hecha && t.fecha && t.fecha < h).map((t) => [t, t.fecha]);
    antes.forEach(([t]) => (t.fecha = h));
    guardar();
    render();
    avisar(`${antes.length} tarea${antes.length === 1 ? '' : 's'} movida${antes.length === 1 ? '' : 's'} a hoy`, () => {
      antes.forEach(([t, f]) => (t.fecha = f));
      guardar();
      render();
    });
  },
  'editar-tarea': (el) => modalTarea(tareaExistente(el.dataset.id)),
  // Desde la lista de Tareas: se abre la ficha del contacto con la tarea arriba («Tarea 2 de 10»),
  // y desde ahí se puede seguir con las demás tareas de la vista.
  'ir-a-tarea': (el) => {
    const t = tareaExistente(el.dataset.id);
    const lista = tareasDeLaVista();
    const i = lista.findIndex((x) => x.id === t.id);
    if (i >= 0) return empezarSecuencia(lista, 'tareas', i);
    ui.tareaDestacada = t.id; // completada: solo se abre la ficha
    location.hash = '#/contacto/' + t.contactId;
  },
  'nueva-lista': () => abrirModal('Nueva lista', campo('Nombre de la lista *', '<input name="nombre" required placeholder="Ej. Administración, Marketing, Producto…">'), (d) => {
    const nombre = d.nombre.trim().replace(/^#\s*/, '');
    if (!nombre) return false;
    ui.listasNuevas.add(nombre);
    ui.editor = { clave: 'lista-' + nombre };
    ui.enfocarTarea = true;
    render();
  }),
  'borrar-tarea': (el) => {
    const t = tareaExistente(el.dataset.id);
    if (!confirm(`¿Eliminar la tarea "${t.titulo}"?${avisoSecuencia(t)}`)) return;
    borrarTarea(t);
    guardar();
    render();
  },
});
