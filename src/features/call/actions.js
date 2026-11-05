// Llamadas: botones (data-action).
import { abrirLlamada } from './store.js';
import { registrarAcciones } from '../../shared/actions.js';
import { render } from '../../shared/router.js';

registrarAcciones({
  'llamar': (el) => abrirLlamada(el.dataset.id),
  'abrir-llamada': (el) => { abrirLlamada(el.dataset.id, el.dataset.tarea || null); render(); },
});
