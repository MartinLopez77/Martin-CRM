// Contactos: botones (data-action) y desplegables de estado y propietario.
import { ESTADOS } from './schema.js';
import { cambiarContacto, cargarVista, contactoExistente, seleccionados, vistaActual } from './store.js';
import { modalMasivo, modalVista, renderTablaContactos } from './views/list.js';
import { modalContacto } from './views/modal.js';
import { modalInscribir, opcionesUsuarios, YO } from '../../legacy.js';
import { registrarAcciones } from '../../shared/actions.js';
import { ahora } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db, ui } from '../../shared/state.js';
import { $, app } from '../../shared/ui/dom.js';
import { campo, opciones } from '../../shared/ui/html.js';
import { avisar } from '../../shared/ui/toast.js';

app.addEventListener('change', (e) => {
  const sel = /** @type {HTMLSelectElement} */ (e.target);
  if (!sel.matches('.estado-select, .propietario-select')) return;
  const c = contactoExistente(sel.dataset.id);
  cambiarContacto(c, () => {
    if (sel.matches('.estado-select')) c.estado = sel.value;
    else c.ownerId = sel.value || null;
  });
  c.actualizado = ahora();
  guardar();
  render();
});

registrarAcciones({
  'nuevo-contacto': () => modalContacto(),
  'editar-contacto': (el) => modalContacto(contactoExistente(el.dataset.id)),
  'abrir-contacto': (el) => { location.hash = '#/contacto/' + el.dataset.id; },
  'borrar-contacto': (el) => {
    const c = contactoExistente(el.dataset.id);
    const nNotas = db.notes.filter((n) => n.contactId === c.id).length;
    const nTareas = db.tasks.filter((t) => t.contactId === c.id).length;
    const nAcciones = db.actions.filter((a) => a.contactId === c.id).length;
    if (!confirm(`¿Eliminar a ${c.nombre}?\n\nSe borrarán también sus ${nNotas} notas, ${nTareas} tareas y ${nAcciones} acciones. No se puede deshacer.`)) return;
    db.contacts = db.contacts.filter((x) => x.id !== c.id);
    db.notes = db.notes.filter((n) => n.contactId !== c.id);
    db.tasks = db.tasks.filter((t) => t.contactId !== c.id);
    db.actions = db.actions.filter((a) => a.contactId !== c.id);
    db.enrollments = db.enrollments.filter((e) => e.contactId !== c.id);
    guardar();
    location.hash = '#/';
  },
  // Tabla de contactos: vistas, orden y acciones masivas
  'vista-contactos': (el) => { cargarVista(/** @type {string} */ (el.dataset.id)); render(); },
  'nueva-vista': (el) => modalVista(null, !!el.dataset.conFiltros),
  'renombrar-vista': () => modalVista(vistaActual()),
  'guardar-vista': () => {
    Object.assign(vistaActual(), { filtros: { ...ui.filtros }, orden: { ...ui.orden } });
    guardar();
    render();
    avisar('Vista guardada');
  },
  'restablecer-vista': () => { cargarVista(ui.vistaId); render(); },
  'borrar-vista': () => {
    const v = vistaActual();
    if (!confirm(`¿Eliminar la vista «${v.nombre}»? Los contactos no se tocan.`)) return;
    db.views = db.views.filter((x) => x.id !== v.id);
    cargarVista('todos');
    guardar();
    render();
  },
  'ordenar': (el) => {
    const campo = el.dataset.campo;
    ui.orden = { campo: /** @type {string} */ (campo), dir: ui.orden.campo === campo && ui.orden.dir === 'asc' ? 'desc' : 'asc' };
    renderTablaContactos();
  },
  'quitar-seleccion': () => { ui.seleccion.clear(); renderTablaContactos(); },
  'masivo-propietario': () => modalMasivo('Asignar propietario', campo('Propietario', `<select name="ownerId">${opcionesUsuarios(YO)}</select>`), (c, d) => (c.ownerId = d.ownerId || null)),
  'masivo-estado': () => modalMasivo('Cambiar estado', campo('Estado', `<select name="estado">${opciones(ESTADOS, 'contactado')}</select>`), (c, d) => (c.estado = d.estado)),
  'masivo-secuencia': () => modalInscribir(seleccionados(), () => ui.seleccion.clear()),
  'masivo-borrar': () => {
    const lista = seleccionados();
    if (!confirm(`¿Eliminar ${lista.length} contacto${lista.length === 1 ? '' : 's'} con todas sus notas, tareas y acciones? No se puede deshacer.`)) return;
    /** @type {Set<string | null | undefined>} */
    const ids = new Set(lista.map((c) => c.id));
    db.contacts = db.contacts.filter((c) => !ids.has(c.id));
    db.notes = db.notes.filter((n) => !ids.has(n.contactId));
    db.tasks = db.tasks.filter((t) => !ids.has(t.contactId));
    db.actions = db.actions.filter((a) => !ids.has(a.contactId));
    db.enrollments = db.enrollments.filter((e) => !ids.has(e.contactId));
    ui.seleccion.clear();
    guardar();
    render();
  },
  'mandar-email': () => {
    ui.fichaTab = 'correo';
    render();
    $('.correo-escribir [name=asunto]', app)?.focus();
  },
  'ficha-tab': (el) => { ui.fichaTab = /** @type {string} */ (el.dataset.tab); ui.editor = null; render(); },
});
