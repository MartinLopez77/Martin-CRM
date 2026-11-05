// Importar CSV: botones (data-action).
import { cargarVista } from '../contacts/store.js';
import { modalImportar } from './views.js';
import { registrarAcciones } from '../../shared/actions.js';
import { render, rutaActual } from '../../shared/router.js';
import { ui } from '../../shared/state.js';

registrarAcciones({
  // Importar CSV y propiedades de empresa
  'importar-csv': () => modalImportar(),
  'ver-importacion': (el) => {
    cargarVista('todos');
    ui.filtros.importacion = el.dataset.nombre;
    if (rutaActual().ruta) location.hash = '#/';
    else render();
  },
});
