// Ajustes: botones (data-action).
import { modalPropEmpresa } from './views.js';
import { registrarAcciones } from '../../shared/actions.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db } from '../../shared/state.js';
import { plural } from '../../shared/lib/text.js';

registrarAcciones({
  'nueva-prop-empresa': () => modalPropEmpresa(),
  'editar-prop-empresa': (el) => modalPropEmpresa(db.settings.propsEmpresaExtra.find((p) => p.id === el.dataset.id)),
  'borrar-prop-empresa': (el) => {
    const p = /** @type {import('../companies/schema.js').PropiedadPropia} */ (db.settings.propsEmpresaExtra.find((x) => x.id === el.dataset.id));
    const n = db.companies.filter((e) => e.extra?.[p.id]).length;
    if (!confirm(`¿Eliminar la propiedad «${p.label}»?${n ? ` Se borrará su valor en ${n} empresa${plural(n)}.` : ''}\n\nSi solo quieres dejar de verla, desactívala.`)) return;
    db.settings.propsEmpresaExtra = db.settings.propsEmpresaExtra.filter((x) => x !== p);
    db.settings.propsEmpresaOcultas = db.settings.propsEmpresaOcultas.filter((id) => id !== p.id);
    db.companies.forEach((e) => { if (e.extra) delete e.extra[p.id]; });
    guardar();
    render();
  },
});
