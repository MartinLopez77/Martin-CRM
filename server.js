'use strict';

// Servidor local del CRM: sirve la interfaz (carpeta public/) y guarda los datos en data.json.
// Sin dependencias externas: basta con tener Node instalado.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = Number(process.env.PORT) || 3000;
const URL_APP = `http://localhost:${PORT}`;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data.json');
const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 30;
const MAX_BODY = 20 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function leerDatos() {
  if (!fs.existsSync(DATA_FILE)) return { contacts: [], notes: [], tasks: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Antes del primer guardado de cada día se copia data.json a backups/ (se conservan los últimos 30).
function copiaDiaria() {
  if (!fs.existsSync(DATA_FILE)) return;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const destino = path.join(BACKUP_DIR, `data-${new Date().toISOString().slice(0, 10)}.json`);
  if (fs.existsSync(destino)) return;
  fs.copyFileSync(DATA_FILE, destino);
  const copias = fs.readdirSync(BACKUP_DIR).filter((f) => /^data-.*\.json$/.test(f)).sort();
  copias.slice(0, Math.max(0, copias.length - MAX_BACKUPS)).forEach((f) => fs.unlinkSync(path.join(BACKUP_DIR, f)));
}

function guardarDatos(datos) {
  copiaDiaria();
  // Escritura atómica: si algo falla a mitad, data.json no queda corrupto.
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(datos, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function enviarJSON(res, estado, cuerpo) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(cuerpo));
}

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
      enviarJSON(res, 400, { error: err.message });
    }
  });
}

function servirEstatico(pathname, res) {
  let relativo;
  try {
    relativo = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  } catch {
    res.writeHead(400);
    return res.end();
  }
  const archivo = path.join(PUBLIC_DIR, relativo);
  if (!archivo.startsWith(PUBLIC_DIR + path.sep)) {
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
  const { pathname } = new URL(req.url, URL_APP);

  if (pathname === '/api/data') {
    if (req.method === 'GET') {
      try {
        return enviarJSON(res, 200, leerDatos());
      } catch (err) {
        return enviarJSON(res, 500, { error: `No se pudo leer data.json: ${err.message}` });
      }
    }
    if (req.method === 'PUT') return recibirDatos(req, res);
    return enviarJSON(res, 405, { error: 'Método no permitido' });
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    return res.end();
  }
  servirEstatico(pathname, res);
});

function abrirNavegador(alTerminar = () => {}) {
  if (!process.argv.includes('--open')) return alTerminar();
  const cmd = process.platform === 'win32' ? `start "" ${URL_APP}` : `open ${URL_APP}`;
  exec(cmd, () => alTerminar());
}

server.on('error', (err) => {
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
