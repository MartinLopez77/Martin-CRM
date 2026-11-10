// Empresas: botones (data-action).
import { campoEmpresa, contactosDeEmpresa, empresaExistente } from './store.js';
import { modalEmpresa } from './views.js';
import { modalContacto } from '../contacts/views/modal.js';
import { registrarAcciones } from '../../shared/actions.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { valorProp } from '../../shared/schema.js';
import { db } from '../../shared/state.js';
import { editarDato } from '../../shared/ui/editar-dato.js';

registrarAcciones({
  // Empresas
  'nueva-empresa': () => modalEmpresa(),
  'editar-empresa': (el) => modalEmpresa(empresaExistente(el.dataset.id)),
  'abrir-empresa': (el) => { location.hash = '#/empresa/' + el.dataset.id; },
  'nuevo-contacto-empresa': (el) => modalContacto(null, el.dataset.id),
  // Un dato de la ficha, pulsándolo: se edita en un recuadro.
  'editar-campo-empresa': (el) => {
    const e = empresaExistente(el.dataset.id);
    const p = campoEmpresa(el.dataset.campo);
    if (!p || p.soloLectura) return;
    editarDato(el, p, valorProp(e, p), (valor) => {
      if (p.obligatorio && !valor) return false;
      if (p.id === 'nombre') {
        const otra = db.companies.find((x) => x !== e && x.nombre.toLowerCase() === String(valor).toLowerCase());
        if (otra) {
          alert(`Ya existe la empresa «${otra.nombre}».`);
          return false;
        }
      }
      if (p.extra) e.extra = { ...e.extra, [p.id]: valor };
      else /** @type {Record<string, unknown>} */ (e)[p.id] = valor;
      guardar();
      render();
    });
  },
  'borrar-empresa': (el) => {
    const e = empresaExistente(el.dataset.id);
    const n = contactosDeEmpresa(e.id).length;
    if (!confirm(`¿Eliminar la empresa «${e.nombre}»?${n ? ` Sus ${n} contactos se conservan, sin empresa.` : ''}`)) return;
    db.contacts.forEach((c) => { if (c.companyId === e.id) c.companyId = null; });
    db.companies = db.companies.filter((x) => x.id !== e.id);
    guardar();
    location.hash = '#/empresas';
  },
});
