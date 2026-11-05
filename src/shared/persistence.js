// Guardado: cada cambio se manda entero al servidor (PUT /api/data) 250 ms después del último.
import { db } from './state.js';

const estadoGuardado = /** @type {HTMLElement} */ (document.getElementById('save-status'));
/** @type {ReturnType<typeof setTimeout> | undefined} */
let temporizadorGuardado;
let cambiosPendientes = false;

/** @param {string} texto @param {string} tipo */
function setStatus(texto, tipo) {
  estadoGuardado.textContent = texto;
  estadoGuardado.dataset.tipo = tipo;
}

/** Guarda los datos (con un pequeño retardo, para agrupar varios cambios seguidos). */
export function guardar() {
  cambiosPendientes = true;
  setStatus('Guardando…', 'saving');
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = setTimeout(enviar, 250);
}

async function enviar() {
  try {
    const r = await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db),
    });
    if (!r.ok) throw new Error(r.statusText);
    cambiosPendientes = false;
    setStatus('Guardado', 'ok');
  } catch {
    setStatus('Error al guardar. ¿Está abierta la ventana del servidor?', 'error');
  }
}

window.addEventListener('beforeunload', (e) => {
  if (cambiosPendientes) {
    e.preventDefault();
    e.returnValue = '';
  }
});
