// Servidor local del CRM: sirve la interfaz (carpeta src/, sin src/server/) y la API de datos.
// Sin dependencias externas: basta con tener Node instalado.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { RAIZ, leerDatos, guardarDatos } from './storage.js';
import { atenderGrabacion } from './grabaciones.js';

const PORT = Number(process.env.PORT) || 3000;
const URL_APP = `http://localhost:${PORT}`;
const ESTATICOS = path.join(RAIZ, 'src');
const MAX_BODY = 20 * 1024 * 1024;

/** @type {Record<string, string>} */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * @param {http.ServerResponse} res
 * @param {number} estado
 * @param {unknown} cuerpo
 */
function enviarJSON(res, estado, cuerpo) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(cuerpo));
}

/** @param {http.IncomingMessage} req @param {http.ServerResponse} res */
function recibirDatos(req, res) {
  let cuerpo = '';
  let tam = 0;
  req.setEncoding('utf8');
  req.on('data', (trozo) => {
    tam += trozo.length;
    if (tam > MAX_BODY) {
      enviarJSON(res, 413, { error: 'Datos demasiado grandes' });
      req.destroy();
    } else {
      cuerpo += trozo;
    }
  });
  req.on('end', () => {
    try {
      const datos = JSON.parse(cuerpo);
      if (!Array.isArray(datos.contacts) || !Array.isArray(datos.notes) || !Array.isArray(datos.tasks)) {
        throw new Error('Formato de datos no válido');
      }
      guardarDatos(datos);
      enviarJSON(res, 200, { ok: true });
    } catch (err) {
      enviarJSON(res, 400, { error: /** @type {Error} */ (err).message });
    }
  });
}

/** @param {string} pathname @param {http.ServerResponse} res */
function servirEstatico(pathname, res) {
  let relativo;
  try {
    relativo = pathname === '/' ? 'client/index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  } catch {
    res.writeHead(400);
    return res.end();
  }
  const archivo = path.join(ESTATICOS, relativo);
  // Nada fuera de src/, ni el código del servidor.
  if (!archivo.startsWith(ESTATICOS + path.sep) || archivo.startsWith(path.join(ESTATICOS, 'server') + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(archivo, (err, contenido) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(archivo)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(contenido);
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(/** @type {string} */ (req.url), URL_APP);

  if (pathname === '/api/data') {
    if (req.method === 'GET') {
      try {
        return enviarJSON(res, 200, leerDatos());
      } catch (err) {
        return enviarJSON(res, 500, { error: `No se pudo leer data.json: ${/** @type {Error} */ (err).message}` });
      }
    }
    if (req.method === 'PUT') return recibirDatos(req, res);
    return enviarJSON(res, 405, { error: 'Método no permitido' });
  }

  const grabacion = /^\/api\/grabaciones\/([^/]+)$/.exec(pathname);
  if (grabacion) return atenderGrabacion(req, res, grabacion[1]);

  if (req.method !== 'GET') {
    res.writeHead(405);
    return res.end();
  }
  servirEstatico(pathname, res);
});

/** Con --open abre el CRM en el navegador. @param {() => void} [alTerminar] */
function abrirNavegador(alTerminar = () => {}) {
  if (!process.argv.includes('--open')) return alTerminar();
  const cmd = process.platform === 'win32' ? `start "" ${URL_APP}` : `open ${URL_APP}`;
  exec(cmd, () => alTerminar());
}

export function arrancar() {
  server.on('error', (/** @type {NodeJS.ErrnoException} */ err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`El CRM ya estaba en marcha en ${URL_APP}`);
      return abrirNavegador(() => process.exit(0));
    }
    throw err;
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`CRM en marcha en ${URL_APP}`);
    console.log('Deja esta ventana abierta mientras lo uses. Para pararlo: Ctrl+C o cerrar la ventana.');
    abrirNavegador();
  });
}
