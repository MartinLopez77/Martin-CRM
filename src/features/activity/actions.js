// Acciones realizadas: botones (data-action).
import { accionExistente } from './store.js';
import { modalAccion } from './views.js';
import { modalTarea } from '../../legacy.js';
import { registrarAcciones } from '../../shared/actions.js';

registrarAcciones({
  'nueva-accion': (el) => modalAccion(el.dataset.id),
  'planear-accion': (el) => modalTarea(null, { contactId: el.dataset.id, accion: 'llamada' }),
  'editar-accion': (el) => {
    const a = accionExistente(el.dataset.id);
    modalAccion(a.contactId, a);
  },
});
