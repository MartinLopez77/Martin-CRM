// Acciones realizadas: botones (data-action).
import { accionExistente } from './store.js';
import { modalAccion } from './views.js';
import { modalTarea } from '../tasks/views/modal.js';
import { registrarAcciones } from '../../shared/actions.js';

registrarAcciones({
  'nueva-accion': (el) => modalAccion(el.dataset.id),
  'planear-accion': (el) => modalTarea(null, { contactId: el.dataset.id, accion: 'llamada' }),
  'editar-accion': (el) => {
    const a = accionExistente(el.dataset.id);
    modalAccion(a.contactId, a);
  },
});

// Las grabaciones del navegador (webm) no dicen cuánto duran: el reproductor no mostraría la duración
// ni dejaría saltar. Se le manda al final para que la calcule y se vuelve al principio.
document.addEventListener('loadedmetadata', (e) => {
  const audio = e.target;
  if (!(audio instanceof HTMLAudioElement) || audio.duration !== Infinity) return;
  audio.addEventListener('durationchange', () => (audio.currentTime = 0), { once: true });
  audio.currentTime = 1e101;
}, true);
