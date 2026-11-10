// Grabaciones de llamadas: un archivo de audio por llamada en grabaciones/, junto al archivo de datos.
// Como data.json, son datos de clientes: se quedan en este ordenador y no se suben a git.
//   PUT    /api/grabaciones/<id>  guarda el audio (escritura atómica)
//   GET    /api/grabaciones/<id>  lo sirve (con Range, para poder saltar a cualquier punto)
//   DELETE /api/grabaciones/<id>  lo borra
import fs from 'node:fs';
import path from 'node:path';
import { CARPETA_DATOS } from './storage.js';

export const CARPETA_GRABACIONES = path.join(CARPETA_DATOS, 'grabaciones');
const MAX_GRABACION = 300 * 1024 * 1024; // unas 10 horas de audio
const ID_VALIDO = /^[a-z0-9]{4,40}$/i;

/** @param {string} id */
const archivoDe = (id) => path.join(CARPETA_GRABACIONES, `${id}.webm`);

/** @param {import('node:http').ServerResponse} res @param {number} estado @param {string} [texto] */
function responder(res, estado, texto = '') {
  res.writeHead(estado, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(texto);
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res @param {string} id */
function guardar(req, res, id) {
  fs.mkdirSync(CARPETA_GRABACIONES, { recursive: true });
  const destino = archivoDe(id);
  const tmp = `${destino}.tmp`;
  const salida = fs.createWriteStream(tmp);
  let tam = 0;
  let cortado = false;
  req.on('data', (trozo) => {
    tam += trozo.length;
    if (tam > MAX_GRABACION && !cortado) {
      cortado = true;
      req.unpipe(salida);
      salida.destroy();
      fs.rm(tmp, { force: true }, () => responder(res, 413, 'Grabación demasiado grande'));
      req.resume();
    }
  });
  req.pipe(salida);
  salida.on('finish', () => {
    if (cortado) return;
    if (!tam) {
      fs.rm(tmp, { force: true }, () => responder(res, 400, 'Grabación vacía'));
      return;
    }
    fs.rename(tmp, destino, (err) => (err ? responder(res, 500, err.message) : responder(res, 200, 'ok')));
  });
  salida.on('error', (err) => !cortado && responder(res, 500, err.message));
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res @param {string} id */
function servir(req, res, id) {
  const archivo = archivoDe(id);
  fs.stat(archivo, (err, info) => {
    if (err) return responder(res, 404, 'No existe esa grabación');
    const cabeceras = { 'Content-Type': 'audio/webm', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (!rango || (!rango[1] && !rango[2])) {
      res.writeHead(200, { ...cabeceras, 'Content-Length': info.size });
      return fs.createReadStream(archivo).pipe(res);
    }
    // bytes=500-  ·  bytes=500-999  ·  bytes=-500 (los últimos 500)
    const inicio = rango[1] ? Number(rango[1]) : Math.max(0, info.size - Number(rango[2]));
    const fin =rango[1] && rango[2] ? Math.min(Number(rango[2]), info.size - 1) : info.size - 1;
    if (inicio >= info.size || inicio > fin) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      return res.end();
    }
    res.writeHead(206, { ...cabeceras, 'Content-Length': fin - inicio + 1, 'Content-Range': `bytes ${inicio}-${fin}/${info.size}` });
    fs.createReadStream(archivo, { start: inicio, end: fin }).pipe(res);
  });
}

/**
 * Atiende /api/grabaciones/<id>.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string} id
 */
export function atenderGrabacion(req, res, id) {
  if (!ID_VALIDO.test(id)) return responder(res, 400, 'Identificador de grabación no válido');
  if (req.method === 'PUT') return guardar(req, res, id);
  if (req.method === 'GET' || req.method === 'HEAD') return servir(req, res, id);
  if (req.method === 'DELETE') return fs.rm(archivoDe(id), { force: true }, (err) => (err ? responder(res, 500, err.message) : responder(res, 200, 'ok')));
  responder(res, 405, 'Método no permitido');
}
