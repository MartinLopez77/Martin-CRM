// Los datos del CRM en disco: data.json (escritura atómica) y una copia diaria en backups/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Carpeta raíz del proyecto. */
export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// CRM_DATA_FILE permite usar otro archivo de datos (los tests usan uno ficticio); sus copias van a su lado.
const DATA_FILE = process.env.CRM_DATA_FILE ? path.resolve(process.env.CRM_DATA_FILE) : path.join(RAIZ, 'data.json');
/** Carpeta donde está el archivo de datos (sus copias y las grabaciones van a su lado). */
export const CARPETA_DATOS = path.dirname(DATA_FILE);
const BACKUP_DIR = path.join(CARPETA_DATOS, 'backups');
const MAX_BACKUPS = 30;

/** @returns {Record<string, unknown>} */
export function leerDatos() {
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

/** @param {unknown} datos */
export function guardarDatos(datos) {
  copiaDiaria();
  // Escritura atómica: si algo falla a mitad, data.json no queda corrupto.
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(datos, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}
