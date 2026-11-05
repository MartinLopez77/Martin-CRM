// Secuencias: botones (data-action).
import { contactoExistente } from '../contacts/store.js';
import { inscripcion, inscripcionExistente, sacarDeSecuencia, secuencia, secuenciaExistente } from './store.js';
import { modalElegirContactos, modalInscribir, modalPaso, modalSecuencia } from './views.js';
import { registrarAcciones } from '../../shared/actions.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db } from '../../shared/state.js';
import { plural } from '../../shared/lib/text.js';

registrarAcciones({
  // Secuencias
  'nueva-secuencia': () => modalSecuencia(),
  'editar-secuencia': (el) => modalSecuencia(secuenciaExistente(el.dataset.id)),
  'abrir-secuencia': (el) => { location.hash = '#/secuencias/' + el.dataset.id; },
  'borrar-secuencia': (el) => {
    const s = secuenciaExistente(el.dataset.id);
    const activas = db.enrollments.filter((e) => e.sequenceId === s.id && e.estado === 'activa');
    if (!confirm(`¿Eliminar la secuencia «${s.nombre}»?${activas.length ? `\n\nSe sacará a ${activas.length} contacto${plural(activas.length)} y se borrará su tarea pendiente de la secuencia.` : ''}`)) return;
    activas.forEach(sacarDeSecuencia);
    db.enrollments = db.enrollments.filter((e) => e.sequenceId !== s.id);
    db.tasks.forEach((t) => { if (t.enrollmentId && !inscripcion(t.enrollmentId)) { delete t.enrollmentId; delete t.paso; delete t.siguienteId; } });
    db.sequences = db.sequences.filter((x) => x.id !== s.id);
    guardar();
    location.hash = '#/secuencias';
  },
  'nuevo-paso': (el) => modalPaso(secuenciaExistente(el.dataset.id)),
  'editar-paso': (el) => modalPaso(secuenciaExistente(el.dataset.id), +el.dataset.i),
  'mover-paso': (el) => {
    const s = secuenciaExistente(el.dataset.id);
    const i = +el.dataset.i;
    const j = i + +el.dataset.d;
    if (j < 0 || j >= s.pasos.length) return;
    [s.pasos[i], s.pasos[j]] = [s.pasos[j], s.pasos[i]];
    guardar();
    render();
  },
  'inscribir-en': (el) => modalElegirContactos(secuenciaExistente(el.dataset.id)),
  'inscribir-contacto': (el) => modalInscribir([contactoExistente(el.dataset.id)]),
  'sacar-secuencia': (el) => {
    const ins = inscripcionExistente(el.dataset.id);
    const c = contactoExistente(ins.contactId);
    if (!confirm(`¿Sacar a ${c.nombre} de «${secuencia(ins.sequenceId)?.nombre}»? Se borrará su tarea pendiente de la secuencia.`)) return;
    sacarDeSecuencia(ins);
    guardar();
    render();
  },
});
