// Ajustes (#/ajustes): hora secundaria, propiedades de empresa e historial de importaciones.
import { TIPOS_PROP } from '../companies/schema.js';
import { propsEmpresa, propVisible } from '../companies/store.js';
import { entradasDeAudio, esEntradaDelSistema, pedirPermisoMicro } from '../call/store.js';
import { enLocal, ZONAS_SECUNDARIAS, zonaSecundaria } from './horas.js';
import { fmtFecha, horaActual } from '../../shared/lib/dates.js';
import { esc, uid } from '../../shared/lib/text.js';
import { guardar } from '../../shared/persistence.js';
import { render } from '../../shared/router.js';
import { db } from '../../shared/state.js';
import { $, app } from '../../shared/ui/dom.js';
import { campo, opciones } from '../../shared/ui/html.js';
import { ico } from '../../shared/ui/icons.js';
import { abrirModal, modal } from '../../shared/ui/modal.js';

export function vistaAjustes() {
  const s = db.settings;
  const z = zonaSecundaria();
  app.innerHTML = `
    <div class="estrecho">
      <div class="page-head"><h1>Ajustes</h1></div>
      <section class="card pad ajustes">
        <h3>${ico('reloj')} Horas</h3>
        <p class="muted small">El CRM trabaja siempre en <b>hora de España</b> (la de los clientes): las tareas, las acciones y el reloj de arriba.</p>
        <label class="check"><input type="checkbox" id="aj-secundaria" ${s.horaSecundaria ? 'checked' : ''}> Mostrar también una hora secundaria entre paréntesis</label>
        <label class="field ${s.horaSecundaria ? '' : 'apagado'}"><span>Hora secundaria</span>
          <select id="aj-zona" ${s.horaSecundaria ? '' : 'disabled'}>
            ${ZONAS_SECUNDARIAS.map((x) => `<option value="${x.id}" ${x.id === s.zonaSecundaria ? 'selected' : ''}>${x.label} (${x.sufijo})</option>`).join('')}
          </select>
        </label>
        <p class="ajustes-ejemplo small">Así se verá: España <b>${horaActual()}</b> ${z ? enLocal(horaActual(z.id)) : '<span class="muted">(sin hora secundaria)</span>'}</p>
      </section>

      <section class="card pad ajustes">
        <h3>${ico('telefono')} Grabación de llamadas</h3>
        <p class="muted small">Todas las llamadas que se hacen desde la ventana de llamada se graban, y la grabación queda en la llamada registrada, en la ficha del contacto. Recuerda avisar de que la llamada se graba.</p>
        <label class="field"><span>Voz del otro (audio del ordenador)</span>
          <select id="aj-entrada">
            <option value="" ${!s.entradaLlamada ? 'selected' : ''}>Automático: la «Mezcla estéreo» si el ordenador la tiene</option>
            <option value="ninguna" ${s.entradaLlamada === 'ninguna' ? 'selected' : ''}>Ninguna: grabar solo mi voz</option>
          </select>
        </label>
        <p class="muted small" id="aj-entrada-estado">Buscando las entradas de audio…</p>
        <details class="small ajustes-ayuda">
          <summary>Cómo activar la «Mezcla estéreo» en Windows</summary>
          <p>La voz del otro se graba si la llamada suena por el ordenador (Enlace Móvil, Teams…) y Windows tiene activada la entrada que recoge ese sonido:</p>
          <ol>
            <li>Configuración → Sistema → Sonido → <b>Más opciones de sonido</b>.</li>
            <li>Pestaña <b>Grabar</b> → clic derecho en un hueco → <b>Mostrar dispositivos deshabilitados</b>.</li>
            <li>Clic derecho en <b>Mezcla estéreo</b> → <b>Habilitar</b>.</li>
          </ol>
          <p>Si no aparece, tu tarjeta de sonido no la trae: se puede instalar un cable virtual gratuito (VB-Cable) y elegirlo aquí.</p>
        </details>
      </section>

      <section class="card pad ajustes">
        <div class="row between">
          <h3>${ico('empresa')} Propiedades de empresa</h3>
          <button class="btn sm" data-action="nueva-prop-empresa">+ Añadir propiedad</button>
        </div>
        <p class="muted small">Las desactivadas no se muestran en el CRM (ni en la ficha, ni en la tabla, ni al editar), pero conservan lo que tuvieran. Las de nurturing solo aparecen cuando la empresa está en nurturing.</p>
        <div class="props-lista">
          ${propsEmpresa().map((p) => `
            <div class="prop-fila">
              <label class="check grow"><input type="checkbox" class="aj-prop" data-id="${esc(p.id)}" ${propVisible(p) ? 'checked' : ''}> ${esc(p.label)}</label>
              <span class="muted small">${p.extra ? 'Propia · ' : ''}${p.tipo === 'tel' ? 'Teléfono' : TIPOS_PROP.find((x) => x.id === p.tipo)?.label || 'Texto'}${p.tipo === 'opciones' ? ` · ${p.opciones?.length} opciones` : ''}${p.soloLectura ? ' · la pone el importador' : ''}</span>
              ${p.extra ? `
                <button class="icon-btn" data-action="editar-prop-empresa" data-id="${esc(p.id)}" title="Editar">${ico('editar')}</button>
                <button class="icon-btn" data-action="borrar-prop-empresa" data-id="${esc(p.id)}" title="Eliminar">${ico('papelera')}</button>` : '<span class="prop-hueco"></span>'}
            </div>`).join('')}
        </div>
      </section>

      <section class="card pad ajustes">
        <div class="row between">
          <h3>${ico('importar')} Importaciones</h3>
          <button class="btn sm" data-action="importar-csv">Importar CSV</button>
        </div>
        ${db.imports.length ? `
          <div class="props-lista">
            ${[...db.imports].reverse().map((im) => `
              <div class="prop-fila">
                <span class="grow"><strong>${esc(im.nombre)}</strong> <span class="muted small">· ${fmtFecha(im.fecha)}</span></span>
                <span class="muted small">${im.creados} creados${im.duplicados ? ` · ${im.duplicados} ya existían` : ''}${im.sinEmail ? ` · ${im.sinEmail} sin email válido` : ''}</span>
                <button class="link-btn small" data-action="ver-importacion" data-nombre="${esc(im.nombre)}">Ver contactos</button>
              </div>`).join('')}
          </div>` : '<p class="muted small">Todavía no has importado ningún CSV.</p>'}
      </section>
    </div>`;
  $('#aj-secundaria').addEventListener('change', (/** @type {Event} */ e) => { s.horaSecundaria = /** @type {HTMLInputElement} */ (e.target).checked; guardar(); render(); });
  $('#aj-entrada').addEventListener('change', (/** @type {Event} */ e) => { s.entradaLlamada = /** @type {HTMLSelectElement} */ (e.target).value; guardar(); pintarEntradas(); });
  pintarEntradas();
  $('#aj-zona').addEventListener('change', (/** @type {Event} */ e) => { s.zonaSecundaria = /** @type {HTMLSelectElement} */ (e.target).value; guardar(); render(); });
  app.querySelectorAll('.aj-prop').forEach((nodo) => {
    const cb = /** @type {HTMLInputElement & { dataset: Record<string, string> }} */ (nodo);
    cb.addEventListener('change', () => {
      const ocultas = new Set(s.propsEmpresaOcultas);
      if (cb.checked) ocultas.delete(cb.dataset.id);
      else ocultas.add(cb.dataset.id);
      s.propsEmpresaOcultas = [...ocultas];
      guardar();
    });
  });
}

// Las entradas de audio del ordenador en el desplegable de la grabación (se buscan al abrir Ajustes).
async function pintarEntradas() {
  const sel = /** @type {HTMLSelectElement | null} */ ($('#aj-entrada'));
  const estado = $('#aj-entrada-estado');
  if (!sel || !estado) return;
  const lista = await entradasDeAudio();
  const s = db.settings;
  const sinNombres = lista.some((x) => !x.label);
  sel.querySelectorAll('option[data-entrada]').forEach((o) => o.remove());
  lista.filter((x) => x.label).forEach((x) => sel.insertAdjacentHTML('beforeend', `<option data-entrada value="${esc(x.id)}" ${x.id === s.entradaLlamada ? 'selected' : ''}>${esc(x.label)}</option>`));
  const detectada = lista.find((x) => esEntradaDelSistema(x.label));
  if (sinNombres) {
    estado.innerHTML = 'Para ver las entradas, el navegador necesita permiso para el micrófono. <button type="button" class="link-btn" id="aj-permiso">Dar permiso</button>';
    $('#aj-permiso').addEventListener('click', async () => { if (await pedirPermisoMicro()) pintarEntradas(); });
  } else if (s.entradaLlamada === 'ninguna') {
    estado.textContent = 'Se graba solo tu voz.';
  } else if (s.entradaLlamada && lista.some((x) => x.id === s.entradaLlamada)) {
    estado.textContent = 'Se graba tu voz y la de esa entrada.';
  } else {
    estado.innerHTML = detectada ? `Se grabarán las dos voces: usando <b>${esc(detectada.label)}</b>.` : 'No hay ninguna «Mezcla estéreo» activada: se grabará solo tu voz. Abajo se explica cómo activarla.';
  }
}

// Añadir (o editar) una propiedad propia de empresa.
/** Añadir (o editar) una propiedad propia de empresa. @param {import('../companies/schema.js').PropiedadPropia} [p] */
export function modalPropEmpresa(p) {
  abrirModal(p ? 'Editar propiedad' : 'Nueva propiedad de empresa', `
    ${campo('Nombre *', `<input name="label" required value="${esc(p?.label)}" placeholder="Ej. CRM que usan, Nº de sedes…">`)}
    ${campo('Tipo', `<select name="tipo">${opciones(TIPOS_PROP.filter((t) => t.id !== 'url' || p?.tipo === 'url'), p?.tipo || 'texto')}</select>`)}
    <div class="field ${p?.tipo === 'opciones' ? '' : 'oculto'}" id="prop-opciones">
      <span>Opciones (una por línea)</span>
      <textarea name="opciones" rows="5" placeholder="Opción 1&#10;Opción 2">${esc((p?.opciones || []).join('\n'))}</textarea>
    </div>
  `, (d) => {
    const label = d.label.trim();
    if (!label) return false;
    const ops = [...new Set(d.opciones.split('\n').map((/** @type {string} */ x) => x.trim()).filter(Boolean))];
    if (d.tipo === 'opciones' && !ops.length) {
      alert('Escribe al menos una opción.');
      return false;
    }
    const datos = { label, tipo: d.tipo, opciones: d.tipo === 'opciones' ? ops : [] };
    if (p) Object.assign(p, datos);
    else db.settings.propsEmpresaExtra.push({ id: 'x' + uid(), ...datos });
    guardar();
    render();
  });
  $('[name=tipo]', modal).addEventListener('change', (/** @type {Event} */ e) => $('#prop-opciones', modal).classList.toggle('oculto', /** @type {HTMLSelectElement} */ (e.target).value !== 'opciones'));
}
