// CRM de demostración: arranca el CRM con datos FICTICIOS (los de los tests + 15 contactos más) para ver cómo
// queda con más gente. No toca data.json: los datos van a demo/data.json, que se rehace cada vez que se arranca.
// Uso: npm run demo (o node demo.mjs). Va en el puerto 3001 para poder tenerlo abierto junto al CRM de verdad.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const CARPETA = path.join(RAIZ, 'demo');
const ARCHIVO = path.join(CARPETA, 'data.json');

/** Fecha AAAA-MM-DD de hoy + `dias` (hora de España). @param {number} dias */
const dia = (dias) => new Date(Date.now() + dias * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
/** Instante ISO de hace `dias` días. @param {number} dias */
const hace = (dias) => new Date(Date.now() - dias * 864e5).toISOString();

const empresas = [
  { id: 'e-sol', nombre: 'Dental Sol', sector: 'Clínicas', ciudad: 'Málaga', web: 'dentalsol.example' },
  { id: 'e-norte', nombre: 'Fisio Norte', sector: 'Clínicas', ciudad: 'Bilbao', web: 'fisionorte.example' },
  { id: 'e-rueda', nombre: 'Autos Rueda', sector: 'Talleres', ciudad: 'Zaragoza', web: '' },
  { id: 'e-casa', nombre: 'Casa Nueva Reformas', sector: 'Reformas', ciudad: 'Madrid', web: 'casanueva.example' },
  { id: 'e-verde', nombre: 'Veterinaria Verde', sector: 'Veterinarias', ciudad: 'Valencia', web: '' },
  { id: 'e-alba', nombre: 'Gestoría Alba', sector: 'Gestorías', ciudad: 'Sevilla', web: 'gestoriaalba.example' },
].map((e) => ({ ...e, notas: '', creado: hace(30) }));

// [nombre, cargo, empresa, estado, ciudad, propietario, origen, etiquetas]
/** @type {[string, string, string | null, string, string, string | null, string, string[]][]} */
const personas = [
  ['Elena Castro', 'Directora médica', 'e-sol', 'reunion', 'Málaga', 'u-martin', 'Web', ['vip']],
  ['Fernando Gil', 'Gerente', 'e-sol', 'contactado', 'Málaga', 'u-martin', 'Web', []],
  ['Gloria Pardo', 'Recepción', 'e-norte', 'nuevo', 'Bilbao', null, 'LinkedIn', []],
  ['Hugo Navarro', 'Fisioterapeuta jefe', 'e-norte', 'propuesta', 'Bilbao', 'u-lucia', 'Referido', []],
  ['Irene Soler', 'Dueña', 'e-rueda', 'negociacion', 'Zaragoza', 'u-martin', 'Feria', ['vip']],
  ['Javier Ortega', 'Jefe de taller', 'e-rueda', 'contactado', 'Zaragoza', 'u-lucia', 'Feria', []],
  ['Laura Méndez', 'Arquitecta', 'e-casa', 'cliente', 'Madrid', 'u-martin', 'Referido', ['cliente-2025']],
  ['Manuel Prieto', 'Gerente', 'e-casa', 'perdido', 'Madrid', 'u-lucia', 'Web', []],
  ['Nuria Campos', 'Veterinaria', 'e-verde', 'nuevo', 'Valencia', 'u-martin', 'LinkedIn', []],
  ['Óscar Rubio', 'Administración', 'e-verde', 'reunion', 'Valencia', null, 'Web', []],
  ['Paula Herrera', 'Socia', 'e-alba', 'propuesta', 'Sevilla', 'u-martin', 'Referido', []],
  ['Ramón Iglesias', 'Asesor fiscal', 'e-alba', 'contactado', 'Sevilla', 'u-lucia', 'Web', []],
  ['Sara Domínguez', 'Directora', 'e-luz', 'negociacion', 'Madrid', 'u-martin', 'Web', []],
  ['Tomás Vega', 'Autónomo', null, 'nuevo', 'Granada', null, 'Llamada en frío', []],
  ['Úrsula Blanco', 'Consultora', null, 'cliente', 'Barcelona', 'u-martin', 'Referido', ['vip']],
];

/** @param {string} s */
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(' ')[0];

const contactos = personas.map(([nombre, cargo, companyId, estado, ciudad, ownerId, origen, etiquetas], i) => ({
  id: `c-demo-${i + 1}`, nombre, cargo, companyId, estado, ciudad, ownerId, origen, etiquetas,
  email: `${slug(nombre)}@${(empresas.find((e) => e.id === companyId)?.web || 'correo.example')}`,
  telefono: i % 4 === 3 ? '' : `+34 6${String(10 + i).padStart(2, '0')} 200 ${String(100 + i).padStart(3, '0')}`,
  web: '', creado: hace(25 - i), actualizado: hace(10 - (i % 10)),
}));

// Tareas: unas para hoy (para probar «Empezar tareas»), alguna vencida y otras para los próximos días.
/** @type {[number, string, string, number, string | null, string][]} [contacto, título, acción, días, hora, prioridad] */
const datosTareas = [
  [0, 'Llamar a Elena para confirmar la demo', 'llamada', 0, '10:30', 'alta'],
  [1, 'WhatsApp a Fernando con el vídeo de Diga', 'whatsapp', 0, null, 'ninguna'],
  [3, 'Email a Hugo con la propuesta revisada', 'email', -1, null, 'media'],
  [4, 'Llamar a Irene para cerrar precio', 'llamada', 0, '12:00', 'alta'],
  [5, 'Llamar a Javier', 'llamada', 1, null, 'ninguna'],
  [8, 'Primer contacto con Nuria', 'llamada', 0, null, 'ninguna'],
  [9, 'Reunión con Óscar', 'reunion', 2, '16:00', 'ninguna'],
  [10, 'Seguimiento de la propuesta a Paula', 'email', 3, null, 'baja'],
  [12, 'Videollamada con Sara', 'videollamada', 1, '11:00', 'media'],
  [13, 'Llamar a Tomás', 'llamada', -2, null, 'ninguna'],
];
const tareas = datosTareas.map(([i, titulo, accion, dias, hora, prioridad], n) => ({
  id: `t-demo-${n + 1}`, titulo, detalle: '', contactId: contactos[i].id, accion,
  fecha: dia(dias), hora, prioridad, hecha: false, completada: null, creado: hace(5),
}));

// Algunas acciones ya hechas, para que la columna «Última acción» y la línea de tiempo no salgan vacías.
/** @type {[number, string, number, string][]} [contacto, tipo, hace cuántos días, resumen] */
const datosAcciones = [
  [0, 'llamada', 3, 'Le interesa: quiere ver una demo'],
  [3, 'propuesta', 4, 'Propuesta enviada por email'],
  [4, 'reunion', 2, 'Reunión en su taller'],
  [6, 'llamada', 8, 'Firmado el contrato anual'],
  [7, 'llamada-sin-respuesta', 6, 'Sin respuesta'],
  [10, 'email', 1, 'Le mando la propuesta'],
  [14, 'videollamada', 12, 'Onboarding hecho'],
];
const acciones = datosAcciones.map(([i, tipo, dias, resumen], n) => ({
  id: `a-demo-${n + 1}`, contactId: contactos[i].id, tipo, fecha: dia(-dias), hora: '10:00',
  resumen, noteId: null, taskId: null, creado: hace(dias),
}));

const base = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tests/fixtures/data.json'), 'utf8'));
base.contacts.push(...contactos);
base.companies.push(...empresas);
base.tasks.push(...tareas);
base.actions.push(...acciones);

fs.mkdirSync(CARPETA, { recursive: true });
fs.writeFileSync(ARCHIVO, JSON.stringify(base, null, 2));
console.log(`Datos de demostración: ${base.contacts.length} contactos en ${ARCHIVO}`);

process.env.CRM_DATA_FILE = ARCHIVO;
process.env.PORT ||= '3001';
if (!process.argv.includes('--no-open')) process.argv.push('--open');
const { arrancar } = await import('./src/server/http.js');
arrancar();
