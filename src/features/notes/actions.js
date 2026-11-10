// Notas: botones (data-action).
import { nota, notaExistente } from './store.js';
import { modalNota, notaHTML } from './views.js';
import { registrarAcciones } from '../../shared/actions.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db, ui } from '../../shared/state.js';

registrarAcciones({
  'toggle-nota': (el) => {
    const id = el.dataset.id;
    if (ui.notasAbiertas.has(id)) ui.notasAbiertas.delete(id);
    else ui.notasAbiertas.add(id);
    const art = document.getElementById('nota-' + id);
    if (art) art.outerHTML = notaHTML(notaExistente(id));
  },
  'ver-nota': (el) => {
    const id = el.dataset.id;
    ui.fichaTab = 'notas';
    ui.notasContactoQ = '';
    ui.notasAbiertas.add(id);
    render();
    const art = document.getElementById('nota-' + id);
    if (art) {
      art.scrollIntoView({ behavior: 'smooth', block: 'center' });
      art.classList.add('destacada');
      setTimeout(() => art.classList.remove('destacada'), 1600);
    }
  },
  'fijar-nota': (el) => {
    const n = notaExistente(el.dataset.id);
    n.fijada = !n.fijada;
    guardar();
    render();
  },
  'editar-nota': (el) => modalNota(nota(el.dataset.id)),
  'borrar-nota': (el) => {
    const id = el.dataset.id;
    const ac = db.actions.find((a) => a.noteId === id);
    if (!confirm(ac ? '¿Eliminar esta nota? La acción asociada se conserva, sin nota.' : '¿Eliminar esta nota?')) return;
    db.notes = db.notes.filter((n) => n.id !== id);
    db.actions.forEach((a) => { if (a.noteId === id) a.noteId = null; });
    guardar();
    render();
  },
  'nueva-nota': (el) => modalNota(null, false, el.dataset.id),
  'nota-pantalla': (el) => modalNota(nota(el.dataset.id), true),
});
