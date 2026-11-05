// Equipo: botones (data-action).
import { cargarVista } from '../contacts/store.js';
import { usuario } from './store.js';
import { modalUsuario } from './views.js';
import { registrarAcciones } from '../../shared/actions.js';
import { ui } from '../../shared/state.js';

registrarAcciones({
  // Equipo
  'nuevo-usuario': () => modalUsuario(),
  'editar-usuario': (el) => modalUsuario(usuario(el.dataset.id)),
  'ver-contactos-de': (el) => {
    cargarVista('todos');
    ui.filtros.ownerId = el.dataset.id;
    location.hash = '#/';
  },
});
