// Cola de tareas: botones (data-action).
import { colaActiva, completarActualEnCola, completarEnCola, empezarSecuencia, irEnCola, posponerEnCola, salirDeCola, saltarEnCola } from './store.js';
import { marcarTarea, tareaExistente, tareasDeLaVista, tareasParaHoy } from '../tasks/store.js';
import { registrarAcciones } from '../../shared/actions.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';

registrarAcciones({
  'empezar-tareas': (el) => empezarSecuencia(el.dataset.origen === 'tareas' ? tareasDeLaVista() : tareasParaHoy(), el.dataset.origen),
  'sq-salir': () => salirDeCola(),
  'sq-ir': (el) => irEnCola(+el.dataset.i),
  'sq-anterior': () => irEnCola(colaActiva().i - 1),
  'sq-saltar': () => saltarEnCola(),
  'sq-completar': () => completarActualEnCola(),
  'sq-cancelada': () => completarEnCola(true),
  'sq-posponer': () => posponerEnCola(),
  'sq-reabrir': () => {
    const cola = colaActiva();
    marcarTarea(tareaExistente(cola.ids[cola.i]), false);
    guardar();
    render();
  },
});
