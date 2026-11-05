// Importar contactos de un CSV: el formulario con el mapeo de columnas y el resumen.
import { ESTADOS_LEAD } from '../companies/schema.js';
import { empresaPorNombre } from '../companies/store.js';
import { cargarVista } from '../contacts/store.js';
import { adivinarCampo, analizarImportacion, CAMPOS_IMPORTAR, nombresImportaciones } from './store.js';
import { YO } from '../team/store.js';
import { leerArchivoTexto, leerCSV } from '../../shared/lib/csv.js';
import { fmtFecha, hoy } from '../../shared/lib/dates.js';
import { ahora, esc, normalizar, uid } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db, ui } from '../../shared/state.js';
import { $ } from '../../shared/ui/dom.js';
import { campo } from '../../shared/ui/html.js';
import { abrirModal, modal } from '../../shared/ui/modal.js';
import { avisar } from '../../shared/ui/toast.js';

export function modalImportar() {
  /** @type {string[][]} */
  let filas = [];
  /** @type {string[]} */
  let mapa = [];
  abrirModal('Importar contactos desde CSV', `
    <p class="muted small">La primera fila del archivo tiene que ser la de los nombres de las columnas. Solo se importan contactos con un <b>email único</b>: si ya hay un contacto con ese email, o el email está repetido en el archivo, esa fila se salta.</p>
    ${campo('Archivo CSV *', '<input type="file" name="archivo" accept=".csv,text/csv,.txt" required>')}
    ${campo('Nombre de la importación *', '<input name="nombreImp" required placeholder="Ej. Clínicas Madrid noviembre">')}
    <div id="imp-mapa"></div>
    <div id="imp-resumen"></div>
  `, (d) => {
    const nombreImp = d.nombreImp.trim();
    if (!nombreImp) return false;
    if (nombresImportaciones().some((n) => normalizar(n) === normalizar(nombreImp))) {
      alert(`Ya hay una importación llamada «${nombreImp}». Ponle otro nombre para poder distinguirlas.`);
      return false;
    }
    if (!mapa.includes('email')) {
      alert('Indica qué columna es la del email.');
      return false;
    }
    const r = analizarImportacion(filas, mapa);
    if (!r.nuevos.length) {
      alert('No hay ningún contacto nuevo que importar.');
      return false;
    }
    const empresasAntes = new Set(db.companies.map((e) => e.id));
    r.nuevos.forEach((o) => {
      const e = o.empresa ? empresaPorNombre(o.empresa) : null;
      if (e && !empresasAntes.has(e.id)) {
        e.importacion = nombreImp;
        if (o.web && !e.web) e.web = o.web;
        if (o.ciudad && !e.ciudad) e.ciudad = o.ciudad;
      }
      // "Open deal", "open_deal" o "✅ Open deal": se acepta el valor interno o la etiqueta, con o sin emoji.
      /** @param {string} s */
      const sinEmoji = (s) => normalizar(s.replace(/^\P{L}+/u, ''));
      const lead = o.estadoLead && ESTADOS_LEAD.find((x) =>
        [x.id, x.id.replace('_', ' '), x.label].map(sinEmoji).includes(sinEmoji(/** @type {string} */ (o.estadoLead))));
      if (e && lead && !e.estadoLead) e.estadoLead = lead.id;
      db.contacts.push({
        id: uid(),
        nombre: o.nombre || [o.pila, o.apellidos].filter(Boolean).join(' ') || o.email.split('@')[0],
        companyId: e?.id || null,
        ownerId: YO,
        cargo: o.cargo || '',
        email: o.email,
        telefono: o.telefono || '',
        web: o.web || '',
        ciudad: o.ciudad || '',
        estado: 'nuevo',
        origen: o.origen || 'Importación',
        etiquetas: (o.etiquetas || '').split(/[,;]/).map((/** @type {string} */ x) => x.trim()).filter(Boolean),
        importacion: nombreImp,
        creado: ahora(),
        actualizado: ahora(),
      });
    });
    db.imports.push({ id: uid(), nombre: nombreImp, fecha: hoy(), creados: r.nuevos.length, duplicados: r.duplicados + r.repetidos, sinEmail: r.sinEmail, creado: ahora() });
    guardar();
    cargarVista('todos');
    ui.filtros.importacion = nombreImp;
    if (location.hash === '#/' || location.hash === '') render();
    else location.hash = '#/';
    avisar(`${r.nuevos.length} contacto${r.nuevos.length === 1 ? '' : 's'} importado${r.nuevos.length === 1 ? '' : 's'} en «${nombreImp}»`);
  });

  const form = $('form', modal);
  $('.modal-actions .primary', modal).textContent = 'Importar contactos';
  const pintarResumen = () => {
    if (!filas.length) return;
    const r = analizarImportacion(filas, mapa);
    $('#imp-resumen', modal).innerHTML = `
      <div class="imp-resumen ${r.nuevos.length ? '' : 'vacio'}">
        <b>${r.nuevos.length} contacto${r.nuevos.length === 1 ? '' : 's'} nuevo${r.nuevos.length === 1 ? '' : 's'}</b> de ${filas.length} fila${filas.length === 1 ? '' : 's'}
        ${r.duplicados ? `<div class="small">· ${r.duplicados} ya ${r.duplicados === 1 ? 'existe' : 'existen'} en el CRM (mismo email): no se ${r.duplicados === 1 ? 'importa' : 'importan'}</div>` : ''}
        ${r.repetidos ? `<div class="small">· ${r.repetidos} con el email repetido en el archivo: solo entra la primera fila</div>` : ''}
        ${r.sinEmail ? `<div class="small">· ${r.sinEmail} sin email válido: no se ${r.sinEmail === 1 ? 'importa' : 'importan'}</div>` : ''}
        ${mapa.includes('email') ? '' : '<div class="small txt-danger">Falta indicar la columna del email.</div>'}
      </div>`;
  };

  form.archivo.addEventListener('change', async () => {
    const archivo = form.archivo.files[0];
    if (!archivo) return;
    const todas = leerCSV(await leerArchivoTexto(archivo));
    if (todas.length < 2) {
      $('#imp-mapa', modal).innerHTML = '<p class="txt-danger small">El archivo no tiene filas de datos.</p>';
      filas = [];
      return;
    }
    const [cabeceras, ...resto] = todas;
    filas = resto;
    mapa = cabeceras.map(adivinarCampo);
    if (!form.nombreImp.value.trim()) form.nombreImp.value = `${archivo.name.replace(/\.[^.]+$/, '')} · ${fmtFecha(hoy())}`;
    $('#imp-mapa', modal).innerHTML = `
      <div class="field"><span>Columnas del archivo → datos del contacto</span>
        <div class="imp-tabla">
          ${cabeceras.map((cab, i) => `
            <div class="imp-fila">
              <span class="grow"><strong>${esc(cab) || `Columna ${i + 1}`}</strong><span class="muted small truncate">${esc(filas.find((f) => f[i]?.trim())?.[i] || '')}</span></span>
              <select data-col="${i}">
                <option value="">No importar</option>
                ${CAMPOS_IMPORTAR.map((f) => `<option value="${f.id}" ${f.id === mapa[i] ? 'selected' : ''}>${f.label}</option>`).join('')}
              </select>
            </div>`).join('')}
        </div>
      </div>`;
    pintarResumen();
  });
  $('#imp-mapa', modal).addEventListener('change', (/** @type {Event} */ e) => {
    const sel = /** @type {HTMLSelectElement} */ (e.target);
    if (!sel.dataset.col) return;
    mapa[+sel.dataset.col] = sel.value;
    pintarResumen();
  });
}
