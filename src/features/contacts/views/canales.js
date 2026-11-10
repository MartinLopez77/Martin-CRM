// Ficha del contacto: pestaña «Canales» (WhatsApp y correo). Muestra lo registrado como acciones y
// «Enviar» abre WhatsApp Web o el programa de correo con el mensaje y lo registra como acción.
import { contacto, tocar } from '../store.js';
import { accionesDe } from '../../activity/store.js';
import { fmtFecha, horaActual, hoy } from '../../../shared/lib/dates.js';
import { ahora, esc, iniciales, uid } from '../../../shared/lib/text.js';
import { guardar } from '../../../shared/persistence.js';
import { render, rutaActual } from '../../../shared/router.js';
import { db, ui } from '../../../shared/state.js';
import { app } from '../../../shared/ui/dom.js';
import { ico } from '../../../shared/ui/icons.js';
import { avisar } from '../../../shared/ui/toast.js';

/** @typedef {import('../schema.js').Contacto} Contacto */

const CANALES = [
  { id: 'whatsapp', label: 'WhatsApp', icono: 'chat' },
  { id: 'correo', label: 'Correo', icono: 'correo' },
];

/** La pestaña Canales: un selector WhatsApp / Correo y el canal elegido. @param {Contacto} c */
export function panelCanales(c) {
  const canal = ui.canal === 'correo' ? 'correo' : 'whatsapp';
  const cuenta = { whatsapp: accionesDe(c.id).filter((a) => a.tipo === 'whatsapp').length, correo: accionesDe(c.id).filter((a) => a.tipo === 'email').length };
  return `
    <div class="canales-selector" role="tablist">
      ${CANALES.map((x) => `
        <button type="button" role="tab" class="${x.id === canal ? 'active' : ''}" aria-selected="${x.id === canal}" data-action="ficha-canal" data-canal="${x.id}">
          ${ico(x.icono)} ${x.label}${cuenta[/** @type {'whatsapp' | 'correo'} */ (x.id)] ? ` <span class="count">${cuenta[/** @type {'whatsapp' | 'correo'} */ (x.id)]}</span>` : ''}
        </button>`).join('')}
    </div>
    ${canal === 'correo' ? panelCorreo(c) : panelWhatsapp(c)}`;
}

// Los WhatsApp registrados como acciones, en forma de chat.
/** @param {Contacto} c */
function panelWhatsapp(c) {
  const tel = (c.telefono || '').replace(/\D/g, '');
  const mensajes = accionesDe(c.id).filter((a) => a.tipo === 'whatsapp').reverse();
  return `
    <div class="card chat">
      <div class="chat-cabecera">
        <span class="avatar sm">${esc(iniciales(c.nombre))}</span>
        <div class="grow"><strong>${esc(c.nombre)}</strong><div class="muted small">${esc(c.telefono) || 'Sin teléfono'}</div></div>
      </div>
      <div class="chat-cuerpo">
        ${mensajes.map((a) => `
          <div class="burbuja mia">
            <div>${esc(a.resumen) || '<span class="muted">(sin texto)</span>'}</div>
            <time>${fmtFecha(a.fecha)}${a.hora ? ` · ${a.hora}` : ''} ✓✓</time>
          </div>`).join('') || '<p class="muted small chat-vacio">Todavía no hay WhatsApp con este contacto.</p>'}
      </div>
      <form class="chat-escribir" data-form="whatsapp">
        <textarea name="texto" rows="2" placeholder="${tel ? `Escribe un WhatsApp a ${esc(c.nombre.split(/\s+/)[0])}…` : 'Añade un teléfono al contacto para poder escribirle'}" ${tel ? '' : 'disabled'}></textarea>
        <button class="btn primary" ${tel ? '' : 'disabled'}>${ico('chat')} Enviar</button>
      </form>
    </div>`;
}

// Los emails registrados como acciones, como una bandeja, y un formulario para escribir.
/** @param {Contacto} c */
function panelCorreo(c) {
  const correos = accionesDe(c.id).filter((a) => a.tipo === 'email');
  return `
    <form class="card pad correo-escribir" data-form="correo">
      <div class="correo-fila"><span class="muted">Para</span> ${c.email ? esc(c.email) : '<span class="txt-danger">Este contacto no tiene email</span>'}</div>
      <input name="asunto" placeholder="Asunto" ${c.email ? '' : 'disabled'}>
      <textarea name="cuerpo" rows="5" placeholder="Escribe el correo…" ${c.email ? '' : 'disabled'}></textarea>
      <div class="row between"><span class="muted small">Se registrará como acción «Email».</span><button class="btn primary" ${c.email ? '' : 'disabled'}>${ico('correo')} Enviar</button></div>
    </form>
    <div class="card correo-lista">
      ${correos.map((a) => `
        <div class="correo-item" data-action="editar-accion" data-id="${a.id}">
          <span class="tl-punto">${ico('correo')}</span>
          <div class="grow"><strong>${esc(a.resumen) || '(sin asunto)'}</strong><div class="muted small">Enviado a ${esc(c.email || c.nombre)}</div></div>
          <time class="muted small">${fmtFecha(a.fecha)}</time>
        </div>`).join('') || '<p class="muted small chat-vacio">Todavía no hay correos con este contacto.</p>'}
    </div>`;
}

// Enviar: se abre WhatsApp / el correo y queda registrado como acción.
app.addEventListener('submit', (e) => {
  const f = /** @type {HTMLFormElement} */ (e.target);
  const tipo = f.dataset.form;
  if (tipo !== 'whatsapp' && tipo !== 'correo') return;
  e.preventDefault();
  const c = contacto(rutaActual().id);
  if (!c) return;
  let resumen;
  if (tipo === 'whatsapp') {
    const texto = f.texto.value.trim();
    if (!texto) return;
    window.open(`https://wa.me/${/** @type {string} */ (c.telefono).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    resumen = texto.length > 300 ? texto.slice(0, 300) + '…' : texto;
  } else {
    const asunto = f.asunto.value.trim();
    const cuerpo = f.cuerpo.value.trim();
    if (!asunto && !cuerpo) return;
    location.href = `mailto:${c.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    resumen = asunto || cuerpo.split('\n')[0].slice(0, 120);
  }
  const ac = { id: uid(), contactId: c.id, tipo: tipo === 'whatsapp' ? 'whatsapp' : 'email', fecha: hoy(), hora: horaActual(), resumen, noteId: null, taskId: null, creado: ahora() };
  db.actions.push(ac);
  tocar(c.id);
  guardar();
  render();
  avisar(tipo === 'whatsapp' ? 'WhatsApp registrado' : 'Email registrado', () => {
    db.actions = db.actions.filter((x) => x.id !== ac.id);
    guardar();
    render();
  });
});
