// Graba la llamada desde el navegador, sin pedir compartir la pantalla: el micrófono (tu voz) y, si el
// ordenador la tiene, una entrada de audio que recoge lo que suena en él (la voz del otro cuando llamas con
// Enlace Móvil u otra app del PC): la «Mezcla estéreo» de Windows o un cable virtual. Las dos se mezclan en
// un solo audio (webm/opus) que se sube al servidor al registrar la llamada.
import { urlGrabacion } from '../activity/store.js';
import { uid } from '../../shared/lib/text.js';

/**
 * @typedef {Object} Grabacion
 * @property {string} id
 * @property {boolean} sistema si se graba también el audio del ordenador
 * @property {MediaRecorder} recorder
 * @property {MediaStreamTrack[]} pistas micrófono y entrada del ordenador (se apagan al terminar)
 * @property {AudioContext} contexto
 * @property {Promise<Blob>} audio se resuelve al parar la grabación
 */

/** @type {Grabacion | null} */
let actual = null;

// Nombres con los que suelen aparecer las entradas que recogen el audio del ordenador.
const ENTRADA_SISTEMA = /stereo mix|mezcla est[eé]reo|loopback|what u hear|lo que (se )?oye|cable output|voicemeeter/i;
/** Si una entrada parece de las que recogen el audio del ordenador. @param {string} label */
export const esEntradaDelSistema = (label) => ENTRADA_SISTEMA.test(label);

/**
 * Las entradas de audio del ordenador (micrófonos, «Mezcla estéreo»…). Sin permiso del micrófono el
 * navegador no da sus nombres.
 * @returns {Promise<{ id: string, label: string }[]>}
 */
export async function entradasDeAudio() {
  try {
    const todas = await navigator.mediaDevices.enumerateDevices();
    return todas
      .filter((d) => d.kind === 'audioinput' && d.deviceId && !['default', 'communications'].includes(d.deviceId))
      .map((d) => ({ id: d.deviceId, label: d.label }));
  } catch {
    return [];
  }
}

/** Pide permiso para el micrófono (y lo suelta enseguida). Devuelve si se ha dado. */
export async function pedirPermisoMicro() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * La entrada que trae el audio del ordenador: la elegida en Ajustes o, en automático, la que se llame
 * como una «Mezcla estéreo». null si no hay o si en Ajustes se ha elegido «ninguna».
 * @param {string} preferida id de la entrada, '' (automático) o 'ninguna'
 */
async function entradaDelSistema(preferida) {
  if (preferida === 'ninguna') return null;
  const lista = await entradasDeAudio();
  return (preferida && lista.find((x) => x.id === preferida)) || lista.find((x) => esEntradaDelSistema(x.label)) || null;
}

/** @param {string} id @returns {Promise<MediaStream | null>} */
async function abrirEntradaSistema(id) {
  try {
    // Sin cancelar eco ni ruido: es audio ya limpio que sale del ordenador.
    return await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: id }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch {
    return null;
  }
}

/**
 * Empieza a grabar. Devuelve null si no hay permiso para el micrófono.
 * @param {string} entrada la entrada del audio del ordenador elegida en Ajustes ('' automático, 'ninguna')
 * @returns {Promise<{ id: string, sistema: boolean } | null>}
 */
export async function empezarGrabacion(entrada) {
  descartarGrabacion();
  /** @type {MediaStream} */
  let micro;
  try {
    micro = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    return null;
  }
  // Después del micrófono: con su permiso ya se ven los nombres de las entradas.
  const sistema = await entradaDelSistema(entrada);
  const ordenador = sistema ? await abrirEntradaSistema(sistema.id) : null;
  const contexto = new AudioContext();
  const mezcla = contexto.createMediaStreamDestination();
  for (const fuente of [micro, ordenador]) {
    if (fuente?.getAudioTracks().length) contexto.createMediaStreamSource(new MediaStream(fuente.getAudioTracks())).connect(mezcla);
  }
  const tipo = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
  const recorder = new MediaRecorder(mezcla.stream, tipo ? { mimeType: tipo } : {});
  /** @type {Blob[]} */
  const trozos = [];
  recorder.addEventListener('dataavailable', (e) => e.data.size && trozos.push(e.data));
  const audio = new Promise((ok) => recorder.addEventListener('stop', () => ok(new Blob(trozos, { type: 'audio/webm' }))));
  recorder.start(1000); // un trozo por segundo: si algo falla, se pierde poco
  actual = {
    id: uid(), sistema: !!ordenador, recorder, contexto, audio: /** @type {Promise<Blob>} */ (audio),
    pistas: [...micro.getTracks(), ...(ordenador?.getTracks() || [])],
  };
  return { id: actual.id, sistema: actual.sistema };
}

/** @param {Grabacion} g */
function apagar(g) {
  if (g.recorder.state !== 'inactive') g.recorder.stop();
  g.pistas.forEach((t) => t.stop());
  g.contexto.close().catch(() => {});
}

/** Para la grabación (al colgar). El audio se queda esperando a que se registre la llamada. */
export function pararGrabacion() {
  if (actual) apagar(actual);
}

/** Tira la grabación en curso, si la hay (al cerrar la llamada sin registrarla). */
export function descartarGrabacion() {
  if (actual) apagar(actual);
  actual = null;
}

/**
 * Para la grabación y la sube al servidor. Devuelve false si no se pudo guardar.
 * @returns {Promise<boolean>}
 */
export async function subirGrabacion() {
  const g = actual;
  actual = null;
  if (!g) return false;
  apagar(g);
  try {
    const audio = await g.audio;
    if (!audio.size) return false;
    const r = await fetch(urlGrabacion(g.id), { method: 'PUT', headers: { 'Content-Type': 'audio/webm' }, body: audio });
    return r.ok;
  } catch {
    return false;
  }
}
