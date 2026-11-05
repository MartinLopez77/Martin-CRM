// Empresas: botones (data-action).
import { contactosDeEmpresa, empresaExistente } from './store.js';
import { modalEmpresa } from './views.js';
import { modalContacto } from '../contacts/views/modal.js';
import { registrarAcciones } from '../../shared/actions.js';
import { guardar } from '../../shared/persistence.js';
import { db } from '../../shared/state.js';

registrarAcciones({
  // Empresas
  'nueva-empresa': () => modalEmpresa(),
  'editar-empresa': (el) => modalEmpresa(empresaExistente(el.dataset.id)),
  'abrir-empresa': (el) => { location.hash = '#/empresa/' + el.dataset.id; },
  'nuevo-contacto-empresa': (el) => modalContacto(null, el.dataset.id),
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
