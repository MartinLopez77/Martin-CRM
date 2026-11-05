// El servidor guarda bien los datos: lectura, validación, escritura atómica y copia diaria al lado del archivo.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 4601;
const URL_API = `http://127.0.0.1:${PORT}/api/data`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-test-'));
const archivo = path.join(dir, 'data.json');
/** @type {import('node:child_process').ChildProcess} */
let servidor;

before(async () => {
  servidor = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT), CRM_DATA_FILE: archivo }, stdio: 'pipe' });
  await new Promise((ok, mal) => {
    servidor.stdout?.on('data', (d) => String(d).includes('en marcha') && ok(undefined));
    servidor.on('exit', (c) => mal(new Error(`el servidor terminó con código ${c}`)));
  });
});

after(() => {
  servidor.kill();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('sin data.json devuelve una base vacía', async () => {
  const r = await fetch(URL_API);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { contacts: [], notes: [], tasks: [] });
});

test('rechaza datos sin las colecciones básicas', async () => {
  const r = await fetch(URL_API, { method: 'PUT', body: JSON.stringify({ contacts: [] }) });
  assert.equal(r.status, 400);
  assert.equal(fs.existsSync(archivo), false);
});

test('guarda, vuelve a leer y hace la copia diaria junto al archivo de datos', async () => {
  const datos = { contacts: [{ id: 'x', nombre: 'Prueba' }], notes: [], tasks: [] };
  const r = await fetch(URL_API, { method: 'PUT', body: JSON.stringify(datos) });
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(fs.readFileSync(archivo, 'utf8')), datos);
  assert.deepEqual(await (await fetch(URL_API)).json(), datos);
  assert.equal(fs.existsSync(archivo + '.tmp'), false, 'no deja el temporal');

  // El segundo guardado del día copia el archivo anterior a <dir>/backups (nunca a la carpeta del proyecto)
  await fetch(URL_API, { method: 'PUT', body: JSON.stringify({ ...datos, notes: [{ id: 'n' }] }) });
  const copias = fs.readdirSync(path.join(dir, 'backups'));
  assert.equal(copias.length, 1);
  assert.match(copias[0], /^data-\d{4}-\d{2}-\d{2}\.json$/);
});

test('sirve la interfaz y sus módulos, pero nada fuera de src/ ni el código del servidor', async () => {
  const html = await fetch(`http://127.0.0.1:${PORT}/`);
  assert.equal(html.status, 200);
  assert.match(await html.text(), /<title>CRM Martín<\/title>/);
  const modulo = await fetch(`http://127.0.0.1:${PORT}/shared/lib/dates.js`);
  assert.equal(modulo.status, 200);
  assert.match(modulo.headers.get('content-type') || '', /^text\/javascript/);
  for (const ruta of ['/..%2fserver.js', '/..%2fdata.json', '/server/storage.js']) {
    const r = await fetch(`http://127.0.0.1:${PORT}${ruta}`);
    assert.equal(r.status, 403, ruta);
  }
});
