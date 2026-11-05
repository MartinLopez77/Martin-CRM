'use strict';

// ---------- Configuración ----------

// El estado se muestra discreto: texto normal con un punto pequeño de este color.
const ESTADOS = [
  { id: 'nuevo', label: 'Nuevo', color: '#cbd5e1' },
  { id: 'contactado', label: 'Contactado', color: '#93c5fd' },
  { id: 'reunion', label: 'Reunión agendada', color: '#60a5fa' },
  { id: 'propuesta', label: 'Propuesta enviada', color: '#3b82f6' },
  { id: 'negociacion', label: 'Negociación', color: '#1d4ed8' },
  { id: 'cliente', label: 'Cliente', color: '#22c55e' },
  { id: 'perdido', label: 'Perdido', color: '#94a3b8' },
];

const TIPOS_NOTA = [
  { id: 'videollamada', label: 'Videollamada', icon: 'video', color: '#6366f1',
    plantilla: '**Asistentes:**\n\n**Resumen:**\n\n**Puntos de dolor / necesidades:**\n- \n\n**Próximos pasos:**\n- ' },
  { id: 'llamada', label: 'Llamada', icon: 'telefono', color: '#0ea5e9' },
  { id: 'reunion', label: 'Reunión', icon: 'reunion', color: '#10b981' },
  { id: 'tener-en-cuenta', label: 'A tener en cuenta', icon: 'idea', color: '#f59e0b' },
  { id: 'documento', label: 'Documento / enlace', icon: 'enlace', color: '#14b8a6' },
  // Las crea el CRM solo al cambiar los datos del contacto (no se elige al escribir una nota).
  { id: 'cambio', label: 'Cambio de datos', icon: 'editar', color: '#94a3b8', auto: true },
  { id: 'general', label: 'General', icon: 'nota', color: '#64748b' },
];

// Acciones: lo que yo he hecho hacia el cliente (o tengo planeado hacer).
const TIPOS_ACCION = [
  { id: 'llamada', label: 'Llamada', icon: 'telefono', color: '#0ea5e9' },
  { id: 'llamada-sin-respuesta', label: 'Llamada sin respuesta', icon: 'telefono-x', color: '#94a3b8' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'chat', color: '#22c55e' },
  { id: 'email', label: 'Email', icon: 'correo', color: '#6366f1' },
  { id: 'videollamada', label: 'Videollamada', icon: 'video', color: '#8b5cf6' },
  { id: 'reunion', label: 'Reunión', icon: 'reunion', color: '#10b981' },
  { id: 'reunion-cancelada', label: 'Reunión cancelada', icon: 'cancelado', color: '#ef4444' },
  { id: 'propuesta', label: 'Propuesta enviada', icon: 'documento', color: '#f59e0b' },
  { id: 'otra', label: 'Otra', icon: 'pin', color: '#64748b' },
];

// Al elegir un tipo de nota se sugiere registrarla como esta acción; y al revés, al crear una nota desde una acción.
const NOTA_A_ACCION = { llamada: 'llamada', videollamada: 'videollamada', reunion: 'reunion' };
const ACCION_A_NOTA = { llamada: 'llamada', 'llamada-sin-respuesta': 'llamada', videollamada: 'videollamada', reunion: 'reunion' };

// Como en Todoist: P1 (roja) … P4 (sin prioridad, la de por defecto).
const PRIORIDADES = [
  { id: 'alta', label: 'Prioridad 1' },
  { id: 'media', label: 'Prioridad 2' },
  { id: 'baja', label: 'Prioridad 3' },
  { id: 'ninguna', label: 'Prioridad 4' },
];

// Tareas de reunión: además de completarlas se pueden marcar como canceladas.
const REUNIONES = ['reunion', 'videollamada'];

// El CRM trabaja en hora de España (la de los clientes). En Ajustes se puede añadir una hora
// secundaria (p. ej. la de Malasia), que se muestra entre paréntesis.
const ZONA = 'Europe/Madrid';
const ZONAS_SECUNDARIAS = [
  { id: 'Asia/Kuala_Lumpur', label: 'Malasia', sufijo: 'MY' },
  { id: 'Asia/Singapore', label: 'Singapur', sufijo: 'SG' },
  { id: 'Asia/Dubai', label: 'Dubái', sufijo: 'AE' },
  { id: 'Europe/London', label: 'Reino Unido', sufijo: 'UK' },
  { id: 'America/New_York', label: 'Nueva York', sufijo: 'NY' },
  { id: 'America/Mexico_City', label: 'México', sufijo: 'MX' },
  { id: 'America/Bogota', label: 'Colombia', sufijo: 'CO' },
  { id: 'America/Argentina/Buenos_Aires', label: 'Argentina', sufijo: 'AR' },
];
const AJUSTES_DEFECTO = { horaSecundaria: true, zonaSecundaria: 'Asia/Kuala_Lumpur' };
const zonaSecundaria = () => (db.settings?.horaSecundaria ? ZONAS_SECUNDARIAS.find((z) => z.id === db.settings.zonaSecundaria) : null);

const HUBSPOT_PORTAL = '148719910';
const HUBSPOT_ESTADOS = {
  new: 'New', prospecting: 'Prospecting', conversation: 'Conversation', meeting: 'Meeting',
  open_deal: 'Open deal', client: 'Client', nurturing_sdr: 'Nurturing SDR', nurturing_ae: 'Nurturing AE', lost: 'Lost',
};
const urlHubspot = (id) => `https://app.hubspot.com/contacts/${HUBSPOT_PORTAL}/record/0-1/${id}`;

// Estado lead de las empresas: las mismas opciones que la propiedad Lead Status (hs_lead_status) de HubSpot.
const ESTADOS_LEAD = [
  { id: 'new', label: '🏁 New' },
  { id: 'prospecting', label: '⏩ Prospecting' },
  { id: 'conversation', label: '💬 Conversation' },
  { id: 'meeting', label: '📆 Meeting' },
  { id: 'open_deal', label: '✅ Open deal' },
  { id: 'client', label: '🤝 Client' },
  { id: 'nurturing_sdr', label: '♻ Nurturing SDR' },
  { id: 'nurturing_ae', label: '♻️ Nurturing AE' },
  { id: 'lost', label: '😢 Lost' },
];
const esNurturing = (estadoLead) => estadoLead === 'nurturing_sdr' || estadoLead === 'nurturing_ae';

// Como «Nurturing reason SDR» de HubSpot.
const NURTURING_REASONS = [
  { id: 'sequence_finished', label: 'Sequence finished' },
  { id: 'unreachable', label: 'Unreachable' },
  { id: 'could_not_pass_gatekeeper', label: 'Could not pass the gatekeeper' },
  { id: 'contact_in_future', label: 'Contact in the future (schedule task)' },
  { id: 'could_not_get_pain', label: 'Could not get to the Pain' },
  { id: 'no_pain', label: 'Has no pain' },
  { id: 'satisfied_with_competitor', label: 'Satisfied with a competitor' },
  { id: 'not_target', label: 'Not target' },
  { id: 'double_no_show', label: 'Double no show' },
  { id: 'company_not_exist', label: 'Company does not exist' },
  { id: 'They are Anti AI', label: 'They are Anti AI' },
  { id: 'DIY', label: 'DIY' },
  { id: 'other', label: 'Other' },
];

// Propiedades de las empresas. En Ajustes se puede ocultar cualquiera y añadir otras propias
// (db.settings.propsEmpresaExtra). Las de nurturing solo se ven si el estado lead es de nurturing.
const PROPS_EMPRESA = [
  { id: 'estadoLead', label: 'Estado lead', tipo: 'opciones', opciones: ESTADOS_LEAD },
  { id: 'nurturingReason', label: 'Nurturing reason', tipo: 'opciones', opciones: NURTURING_REASONS, nurturing: true },
  { id: 'nurturingFecha', label: 'Nurturing date', tipo: 'fecha', nurturing: true },
  { id: 'nurturingComentarios', label: 'Nurturing comments', tipo: 'textoLargo', nurturing: true },
  { id: 'web', label: 'Web', tipo: 'url', placeholder: 'empresa.com' },
  { id: 'sector', label: 'Sector', tipo: 'texto', placeholder: 'Clínicas, reformas…' },
  { id: 'ciudad', label: 'Ciudad', tipo: 'texto' },
  { id: 'pais', label: 'País', tipo: 'texto' },
  { id: 'direccion', label: 'Dirección', tipo: 'texto' },
  { id: 'telefono', label: 'Teléfono', tipo: 'tel' },
  { id: 'empleados', label: 'Nº de empleados', tipo: 'numero' },
  { id: 'facturacion', label: 'Facturación anual', tipo: 'texto', placeholder: 'Ej. 1-5 M€' },
  { id: 'linkedin', label: 'LinkedIn', tipo: 'url' },
  { id: 'importacion', label: 'Importación', tipo: 'texto', soloLectura: true },
];
const TIPOS_PROP = [
  { id: 'texto', label: 'Texto' },
  { id: 'textoLargo', label: 'Texto largo' },
  { id: 'numero', label: 'Número' },
  { id: 'fecha', label: 'Fecha' },
  { id: 'url', label: 'Enlace' },
  { id: 'opciones', label: 'Desplegable (opciones)' },
];

// Usuario que usa el CRM. Cuando entre el resto del equipo, cada uno tendrá el suyo.
const YO = 'u-martin';

// Vistas de la tabla de contactos (como en HubSpot). Las propias se guardan en db.views.
const FILTROS_VACIOS = { q: '', estado: '', ownerId: '', companyId: '', tarea: '', secuencia: '', importacion: '' };
const ORDEN_DEFECTO = { campo: 'actualizado', dir: 'desc' };
const VISTAS_BASE = [
  { id: 'todos', nombre: 'Todos los contactos', filtros: { ...FILTROS_VACIOS }, orden: ORDEN_DEFECTO, fija: true },
  { id: 'mios', nombre: 'Mis contactos', filtros: { ...FILTROS_VACIOS, ownerId: YO }, orden: ORDEN_DEFECTO, fija: true },
];

// Tipos de paso de una secuencia: cada paso crea una tarea de ese tipo de acción.
const TIPOS_PASO = ['llamada', 'email', 'whatsapp', 'videollamada', 'reunion', 'otra'];

// ---------- Estado ----------

let db = { contacts: [], notes: [], tasks: [], actions: [], companies: [], users: [], views: [], taskViews: [], imports: [], sequences: [], enrollments: [], settings: { ...AJUSTES_DEFECTO } };

const ui = {
  vistaId: (() => { try { return localStorage.getItem('crm-vista') || 'todos'; } catch { return 'todos'; } })(),
  filtros: null, // filtros de la tabla de contactos (se cargan de la vista)
  orden: null,
  seleccion: new Set(), // contactos marcados en la tabla
  empresasQ: '',
  empresasEstado: '', // filtro por estado lead en la tabla de empresas
  fichaTab: 'notas', // pestaña de la columna central de la ficha: notas, tareas, whatsapp, correo
  tareasVista: 'bandeja',
  tareasQ: '',
  editor: null, // editor de tarea abierto: { clave, fecha }
  contactoActual: null,
  notaFiltro: '',
  notasContactoQ: '',
  notasAbiertas: new Set(), // notas desplegadas
  datosAbiertos: false, // desplegable "Datos" de la ficha
  enfocarTarea: false,
  cola: null, // secuencia en curso: { ids, i, origen, hechas, saltadas }
  listasNuevas: new Set(), // listas de tareas generales creadas que aún no tienen tareas
  colaNotas: {}, // nota rápida que se está escribiendo en cada tarea de la secuencia
  llamada: null, // ventana de llamada: { contactId, taskId, telefono, inicio, duracion, resultado, notas, minimizada }
  llamadaCerrada: null, // tarea cuya ventana de llamada se cerró a mano (no se vuelve a abrir sola)
  tareaDestacada: null, // tarea a resaltar al abrir la ficha del contacto desde Tareas
};

const app = document.getElementById('app');
const modal = document.getElementById('modal');
const $ = (sel, raiz = document) => raiz.querySelector(sel);

// ---------- Utilidades ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const ahora = () => new Date().toISOString();

// ---------- Iconos propios: trazo fino, siempre del mismo color ----------

const ICONOS = {
  telefono: '<path d="M5.6 2.5H3.8c-.7 0-1.3.6-1.2 1.3.5 4.8 4.3 8.6 9.1 9.1.7.1 1.3-.5 1.3-1.2v-1.8l-2.6-1-1.3 1.3A8 8 0 0 1 5.3 6.4L6.6 5z"/>',
  'telefono-x': '<path d="M5.6 2.5H3.8c-.7 0-1.3.6-1.2 1.3.5 4.8 4.3 8.6 9.1 9.1.7.1 1.3-.5 1.3-1.2v-1.8l-2.6-1-1.3 1.3A8 8 0 0 1 5.3 6.4L6.6 5z"/><path d="m10 2.5 3 3m0-3-3 3"/>',
  chat: '<path d="M3 13V5a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 13 5v3a2.5 2.5 0 0 1-2.5 2.5H6z"/>',
  correo: '<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.5 4.5 5.5 4 5.5-4"/>',
  video: '<rect x="1.5" y="4" width="9" height="8" rx="1.5"/><path d="m10.5 7 4-2v6l-4-2"/>',
  reunion: '<circle cx="6" cy="5.5" r="2.2"/><path d="M2 13c.4-2.3 2-3.5 4-3.5s3.6 1.2 4 3.5"/><circle cx="11.5" cy="6" r="1.7"/><path d="M11 9.6c1.6 0 2.8 1 3.1 2.9"/>',
  cancelado: '<circle cx="8" cy="8" r="5.5"/><path d="m4.1 4.1 7.8 7.8"/>',
  documento: '<path d="M4 1.8h5l3 3V14H4z"/><path d="M9 1.8v3h3M6 8h4M6 10.5h4"/>',
  pin: '<path d="M6 2h4l-.5 4 2 2.5h-7l2-2.5z"/><path d="M8 8.5V14"/>',
  nota: '<rect x="3" y="2" width="10" height="12" rx="1.5"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3"/>',
  editar: '<path d="M3 13h2.5L13 5.5 10.5 3 3 10.5z"/><path d="m9.5 4 2.5 2.5"/>',
  idea: '<path d="M6 12h4M6.5 14h3"/><path d="M5 9.5a4 4 0 1 1 6 0c-.6.6-1 1.2-1 2H6c0-.8-.4-1.4-1-2z"/>',
  enlace: '<path d="M7 9a2.5 2.5 0 0 0 3.5 0l2-2A2.5 2.5 0 0 0 9 3.5l-.8.8"/><path d="M9 7a2.5 2.5 0 0 0-3.5 0l-2 2A2.5 2.5 0 0 0 7 12.5l.8-.8"/>',
  reloj: '<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>',
  calendario: '<rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4"/>',
  persona: '<circle cx="8" cy="5.5" r="2.5"/><path d="M3 14c.5-3 2.5-4.5 5-4.5s4.5 1.5 5 4.5"/>',
  check: '<path d="m3 8.5 3 3 7-7"/>',
  'check-circulo': '<circle cx="8" cy="8" r="6"/><path d="m5.3 8.2 1.9 1.9 3.6-3.8"/>',
  bandeja: '<path d="M2 9h3.5l1 2h3l1-2H14"/><path d="M2 9l2-5.5h8L14 9v4.5H2z"/>',
  sol: '<circle cx="8" cy="8" r="2.8"/><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/>',
  sofa: '<path d="M2.5 7.5H4V10h8V7.5h1.5V12h-11zM4 7.5V5h8v2.5M3.5 12v1.5M12.5 12v1.5"/>',
  flecha: '<path d="M3 8h10M9 4l4 4-4 4"/>',
  lista: '<path d="M6 4.5h7M6 8h7M6 11.5h7M3 4.5h.01M3 8h.01M3 11.5h.01"/>',
  bandera: '<path d="M3.5 14V2.5M3.5 3h8L10 6l1.5 3h-8"/>',
  rayo: '<path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z"/>',
  expandir: '<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>',
  papelera: '<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.5 6.5V11M9.5 6.5V11"/>',
  cerrar: '<path d="m4 4 8 8m0-8-8 8"/>',
  puntos: '<circle cx="3.5" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.1" fill="currentColor" stroke="none"/>',
  play: '<path d="M5 3.5v9l7-4.5z"/>',
  mas: '<path d="M8 3v10M3 8h10"/>',
  empresa: '<rect x="2.5" y="2" width="7" height="12" rx="1"/><path d="M9.5 6h3a1 1 0 0 1 1 1v7h-4M5 5h2M5 8h2M5 11h2"/>',
  secuencia: '<circle cx="3.5" cy="4" r="1.5"/><circle cx="3.5" cy="12" r="1.5"/><path d="M3.5 5.5v5M7 4h6.5M7 12h6.5M7 8h4"/>',
  ajustes: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M3.6 12.4l1.2-1.2M11.2 4.8l1.2-1.2"/>',
  subir: '<path d="m4 10 4-4 4 4"/>',
  bajar: '<path d="m4 6 4 4 4-4"/>',
  buscar: '<circle cx="7" cy="7" r="4.5"/><path d="m10.4 10.4 3.3 3.3"/>',
  filtro: '<path d="M2.5 3h11L9.3 8v4.6l-2.6 1.2V8z"/>',
  importar: '<path d="M8 2v8M4.8 6.8 8 10l3.2-3.2M2.5 11v2.5h11V11"/>',
};

const ico = (nombre) => `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true">${ICONOS[nombre] || ''}</svg>`;
const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ---------- Zonas horarias ----------

function partesEn(zona, d = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  return Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
}

const hoy = () => { const p = partesEn(ZONA); return `${p.year}-${p.month}-${p.day}`; };
const horaActual = (zona = ZONA) => { const p = partesEn(zona); return `${p.hour}:${p.minute}`; };

// Minutos que la zona va por delante de UTC en ese instante (tiene en cuenta el horario de verano).
function desfase(zona, d) {
  const p = partesEn(zona, d);
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(d.getTime() / 60000) * 60000) / 60000;
}

// "18:00" en España ese día → "01:00 +1" en Malasia.
function horaLocal(hhmm, fecha = hoy(), conDia = true) {
  if (!hhmm) return '';
  const [y, m, d] = fecha.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const comoUtc = Date.UTC(y, m - 1, d, h, mi);
  const p = partesEn(zonaSecundaria().id, new Date(comoUtc - desfase(ZONA, new Date(comoUtc)) * 60000));
  const dia = `${p.year}-${p.month}-${p.day}`;
  const marca = !conDia || dia === fecha ? '' : dia > fecha ? ' +1' : ' −1';
  return `${p.hour}:${p.minute}${marca}`;
}

// Hora secundaria entre paréntesis (nada si está desactivada en Ajustes).
const enLocal = (texto) => {
  const z = zonaSecundaria();
  return z ? `<span class="local" title="Hora de ${z.label}">(${texto} ${z.sufijo})</span>` : '';
};
const conLocal = (hhmm, fecha) => (hhmm ? `${hhmm} ${zonaSecundaria() ? enLocal(horaLocal(hhmm, fecha)) : ''}`.trim() : '');

function sumarDias(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}

function fmtFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('es-ES', opts);
}

function fmtRelativa(iso) {
  if (!iso) return '';
  const h = hoy();
  if (iso === h) return 'Hoy';
  if (iso === sumarDias(h, 1)) return 'Mañana';
  if (iso === sumarDias(h, -1)) return 'Ayer';
  return fmtFecha(iso);
}

const diaSemana = (iso, weekday = 'long') => new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { weekday });
const mayuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Fecha de una tarea como en Todoist: Hoy, Mañana, el día de la semana si es esta semana, o la fecha.
function fmtCuando(iso) {
  const h = hoy();
  if (iso > sumarDias(h, 1) && iso <= sumarDias(h, 6)) return mayuscula(diaSemana(iso));
  return fmtRelativa(iso);
}

// Color de la fecha (como Todoist): vencida, hoy, mañana, esta semana o más adelante.
function claseFecha(iso) {
  const h = hoy();
  if (iso < h) return 'f-vencida';
  if (iso === h) return 'f-hoy';
  if (iso === sumarDias(h, 1)) return 'f-manana';
  return iso <= sumarDias(h, 6) ? 'f-semana' : 'f-lejos';
}

// Cabecera de cada día: "3 nov · Hoy · martes".
function tituloDia(iso) {
  const rel = fmtRelativa(iso);
  return [fmtFecha(iso), rel !== fmtFecha(iso) ? rel : '', diaSemana(iso)].filter(Boolean).join(' · ');
}

const estadoDe = (id) => ESTADOS.find((e) => e.id === id) || ESTADOS[0];
const tipoDe = (id) => TIPOS_NOTA.find((t) => t.id === id) || TIPOS_NOTA[TIPOS_NOTA.length - 1];
const tipoAccionDe = (id) => TIPOS_ACCION.find((t) => t.id === id) || TIPOS_ACCION[TIPOS_ACCION.length - 1];
const prioridadDe = (id) => PRIORIDADES.find((p) => p.id === id) || PRIORIDADES[3];
const contacto = (id) => db.contacts.find((c) => c.id === id);
const tarea = (id) => db.tasks.find((t) => t.id === id);
const nota = (id) => db.notes.find((n) => n.id === id);
const accion = (id) => db.actions.find((a) => a.id === id);
const pendientesDe = (id) => db.tasks.filter((t) => t.contactId === id && !t.hecha);
const prioridadPeso = (t) => ({ alta: 0, media: 1, baja: 2 }[t.prioridad] ?? 3);
const contactosOrdenados = () => [...db.contacts].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
const empresa = (id) => db.companies.find((e) => e.id === id);
const empresaDe = (c) => empresa(c?.companyId)?.nombre || '';
const empresasOrdenadas = () => [...db.companies].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
const contactosDeEmpresa = (id) => db.contacts.filter((c) => c.companyId === id);
const usuario = (id) => db.users.find((u) => u.id === id);
const nombreUsuario = (id) => (id === YO ? `${usuario(YO)?.nombre || 'Yo'} (yo)` : usuario(id)?.nombre || 'Sin propietario');
const secuencia = (id) => db.sequences.find((s) => s.id === id);
const inscripcion = (id) => db.enrollments.find((e) => e.id === id);
const inscripcionActiva = (contactId) => db.enrollments.find((e) => e.contactId === contactId && e.estado === 'activa');

// Busca la empresa por nombre (sin distinguir mayúsculas) y, si no existe, la crea.
function empresaPorNombre(nombre) {
  const n = nombre.trim();
  if (!n) return null;
  let e = db.companies.find((x) => x.nombre.toLowerCase() === n.toLowerCase());
  if (!e) {
    e = { id: uid(), nombre: n, web: '', sector: '', ciudad: '', notas: '', creado: ahora() };
    db.companies.push(e);
  }
  return e;
}

const avatarUsuario = (id) =>
  id ? `<span class="avatar xs" title="${esc(nombreUsuario(id))}">${esc(iniciales(usuario(id)?.nombre))}</span>` : '';
const opcionesUsuarios = (sel, vacio = 'Sin propietario') =>
  `<option value="">${vacio}</option>${db.users.map((u) => `<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${esc(nombreUsuario(u.id))}</option>`).join('')}`;

// Hora a la que toca una tarea.
const horaEfectiva = (t) => t.hora || '';

// Con fecha primero (más próxima antes); a igual fecha, por hora y luego por prioridad.
function ordenTareas(a, b) {
  if (a.fecha && b.fecha && a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
  if (!!a.fecha !== !!b.fecha) return a.fecha ? -1 : 1;
  const ha = horaEfectiva(a), hb = horaEfectiva(b);
  if (ha !== hb) {
    if (!ha || !hb) return ha ? -1 : 1;
    return ha.localeCompare(hb);
  }
  return prioridadPeso(a) - prioridadPeso(b);
}

const proximaTarea = (id) => pendientesDe(id).sort(ordenTareas)[0];

const ordenNotas = (a, b) =>
  (b.fijada ? 1 : 0) - (a.fijada ? 1 : 0) ||
  (b.fecha || '').localeCompare(a.fecha || '') ||
  (b.creado || '').localeCompare(a.creado || '');

const notasDe = (id) => db.notes.filter((n) => n.contactId === id).sort(ordenNotas);
const ultimaNota = (id) =>
  db.notes.filter((n) => n.contactId === id)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.creado || '').localeCompare(a.creado || ''))[0];

const accionesDe = (id) =>
  db.actions.filter((a) => a.contactId === id)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.hora || '').localeCompare(a.hora || '') || (b.creado || '').localeCompare(a.creado || ''));

const iniciales = (nombre) =>
  (nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

function tocar(contactId) {
  const c = contacto(contactId);
  if (c) c.actualizado = ahora();
}

// ---------- Cambios en los datos del contacto: cada cambio queda explicado en una nota ----------

const CAMPOS_HISTORIAL = [
  ['nombre', 'Nombre'],
  ['companyId', 'Empresa', (v) => empresa(v)?.nombre],
  ['cargo', 'Cargo'],
  ['email', 'Email'],
  ['telefono', 'Teléfono'],
  ['web', 'Web'],
  ['ciudad', 'Ciudad'],
  ['estado', 'Estado', (v) => estadoDe(v).label],
  ['origen', 'Origen'],
  ['ownerId', 'Propietario', (v) => (v ? nombreUsuario(v) : '')],
  ['etiquetas', 'Etiquetas', (v) => (v || []).join(', ')],
];

// Los datos del contacto tal y como se leen (nombres en vez de ids), para comparar antes y después.
const fotoContacto = (c) => Object.fromEntries(CAMPOS_HISTORIAL.map(([k, , f]) => [k, String((f ? f(c[k]) : c[k]) || '')]));

// Compara con la foto de `antes` y, si algo ha cambiado, deja una nota «Cambio de datos» en el contacto.
function notaDeCambios(c, antes) {
  const despues = fotoContacto(c);
  const lineas = CAMPOS_HISTORIAL
    .filter(([k]) => antes[k] !== despues[k])
    .map(([k, label]) => `- **${label}:** ${antes[k] || '(vacío)'} → ${despues[k] || '(vacío)'}`);
  if (!lineas.length) return null;
  const n = {
    id: uid(), contactId: c.id, tipo: 'cambio', titulo: `Cambio de datos · ${horaActual()}`,
    contenido: lineas.join('\n'), fecha: hoy(), fijada: false, creado: ahora(),
  };
  db.notes.push(n);
  return n;
}

// Aplica `cambiar(c)` y registra la nota con lo que haya cambiado.
function cambiarContacto(c, cambiar) {
  const antes = fotoContacto(c);
  cambiar(c);
  if (notaDeCambios(c, antes)) c.actualizado = ahora();
}

// ---------- Propiedades de las empresas (configurables en Ajustes) ----------

const propsEmpresa = () => [
  ...PROPS_EMPRESA,
  ...(db.settings.propsEmpresaExtra || []).map((p) => ({
    ...p, extra: true, opciones: p.tipo === 'opciones' ? (p.opciones || []).map((o) => ({ id: o, label: o })) : undefined,
  })),
];
const propVisible = (p) => !(db.settings.propsEmpresaOcultas || []).includes(p.id);
const propsVisibles = () => propsEmpresa().filter(propVisible);
const propEmpresa = (id) => propsEmpresa().find((p) => p.id === id);
const valorProp = (e, p) => (p.extra ? e.extra?.[p.id] : e[p.id]) ?? '';
const estadoLeadDe = (id) => ESTADOS_LEAD.find((x) => x.id === id);

// El valor de una propiedad listo para mostrar (vacío si no tiene).
function textoProp(e, p) {
  const v = valorProp(e, p);
  if (v === '' || v === null) return '';
  if (p.tipo === 'opciones') return esc(p.opciones.find((o) => o.id === v)?.label || v);
  if (p.tipo === 'url') return enlaceWeb(String(v));
  if (p.tipo === 'fecha') return fmtFecha(v);
  if (p.tipo === 'tel') return `<a href="tel:${esc(v)}">${esc(v)}</a>`;
  if (p.tipo === 'textoLargo') return esc(v).replace(/\n/g, '<br>');
  return esc(v);
}

function inputProp(p, valor) {
  const nombre = `p-${p.id}`;
  const v = esc(valor ?? '');
  if (p.tipo === 'opciones') return `<select name="${nombre}"><option value="">—</option>${opciones(p.opciones, valor)}</select>`;
  if (p.tipo === 'textoLargo') return `<textarea name="${nombre}" rows="2">${v}</textarea>`;
  const tipo = { fecha: 'date', numero: 'number', tel: 'tel' }[p.tipo] || 'text';
  return `<input type="${tipo}" name="${nombre}" value="${v}" placeholder="${esc(p.placeholder || '')}">`;
}

// Las propiedades de nurturing de la empresa, si está en nurturing (para la ficha del contacto).
const nurturingDe = (e) => (e && esNurturing(e.estadoLead) ? NURTURING_REASONS.find((r) => r.id === e.nurturingReason)?.label || '' : '');

const campo = (label, input, clase = '') => `<label class="field ${clase}"><span>${label}</span>${input}</label>`;
const opciones = (lista, sel) =>
  lista.map((o) => `<option value="${o.id}" ${o.id === sel ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
const selectEstado = (c) =>
  `<span class="estado" style="--c:${estadoDe(c.estado).color}"><select class="estado-select" data-id="${c.id}">${opciones(ESTADOS, c.estado)}</select></span>`;
const ICONO_CAL = ico('calendario');

// ---------- Fechas con atajos (mañana, en 3 días, la semana que viene…) ----------

const ATAJOS_FECHA = [
  ['hoy', 'Hoy'], ['manana', 'Mañana'], ['2', 'En 2 días'], ['3', 'En 3 días'], ['lunes', 'El próximo lunes'],
  ['semana', 'La semana que viene'], ['2semanas', 'En 2 semanas'], ['mes', 'En un mes'], ['sin', 'Sin fecha'],
];

// Próximo día de la semana (0 = domingo). Si hoy es ese día, el de la semana siguiente salvo con `incluirHoy`.
function proximoDia(dia, incluirHoy = false) {
  const h = hoy();
  const dif = (dia - new Date(h + 'T00:00:00').getDay() + 7) % 7;
  return sumarDias(h, dif === 0 && !incluirHoy ? 7 : dif);
}

function sumarMeses(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return isoLocal(d);
}

function fechaAtajo(id) {
  const h = hoy();
  const dias = { hoy: 0, manana: 1, 2: 2, 3: 3, semana: 7, '2semanas': 14 }[id];
  if (dias !== undefined) return sumarDias(h, dias);
  if (id === 'lunes') return proximoDia(1);
  if (id === 'finde') return proximoDia(6, true);
  if (id === 'mes') return sumarMeses(h, 1);
  return '';
}

const campoFecha = (nombre, valor, extra = '') => `
  <span class="fecha-campo">
    <input type="date" name="${nombre}" value="${esc(valor || '')}" ${extra}>
    <select class="fecha-atajos" data-fecha-atajo title="Atajos de fecha" aria-label="Atajos de fecha">
      <option value="">▾</option>
      ${ATAJOS_FECHA.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}
    </select>
  </span>`;

document.addEventListener('change', (e) => {
  if (!e.target.matches('[data-fecha-atajo]')) return;
  const sel = e.target;
  const input = sel.parentElement.querySelector('input[type=date]');
  if (sel.value) {
    input.value = fechaAtajo(sel.value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  sel.value = '';
});

// ---------- Fechas en el título, como en Todoist ("Llamar a Ana mañana a las 17") ----------

// \b no reconoce la ñ ni las tildes como letras: se usan estos límites de palabra.
const reNlp = (fuente) => new RegExp(`(?<![\\p{L}\\d])${fuente}(?![\\p{L}\\d])`, 'giu');
const DIAS_RE = ['domingo', 'lunes', 'martes', 'mi[eé]rcoles', 'jueves', 'viernes', 's[aá]bado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const NUMEROS = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };

function fechaDe(dia, mes, anio) {
  const h = hoy();
  const y = anio ? (anio.length === 2 ? 2000 + +anio : +anio) : +h.slice(0, 4);
  let iso = `${y}-${pad(mes)}-${pad(dia)}`;
  if (!anio && iso < h) iso = `${y + 1}-${pad(mes)}-${pad(dia)}`; // "15/1" en noviembre es el del año que viene
  return isoLocal(new Date(iso + 'T00:00:00')) === iso ? iso : null;
}

const horaDe = (h, m = 0) => (h <= 23 && m <= 59 ? `${pad(h)}:${pad(m)}` : null);

const PATRONES_FECHA = [
  [reNlp('pasado ma[nñ]ana'), () => sumarDias(hoy(), 2)],
  [reNlp('(?<!(?:por|de|a) la )ma[nñ]ana'), () => sumarDias(hoy(), 1)], // "por la mañana" no es una fecha
  [reNlp('hoy'), () => hoy()],
  [reNlp('(?:la )?(?:semana que viene|pr[oó]xima semana|semana pr[oó]xima)'), () => proximoDia(1)],
  [reNlp('(?:el )?(?:mes que viene|pr[oó]ximo mes)'), () => sumarMeses(hoy(), 1)],
  [reNlp('(?:este )?fin de semana'), () => proximoDia(6, true)],
  [reNlp(`(?:el )?(?:pr[oó]ximo )?(${DIAS_RE.join('|')})(?: que viene)?`),
    (m) => proximoDia(DIAS_RE.findIndex((d) => new RegExp(`^${d}$`, 'iu').test(m[1])))],
  [reNlp(`en (\\d+|${Object.keys(NUMEROS).join('|')}) (d[ií]as?|semanas?|mes(?:es)?)`), (m) => {
    const n = +m[1] || NUMEROS[m[1].toLowerCase()];
    const u = m[2].toLowerCase();
    return u.startsWith('mes') ? sumarMeses(hoy(), n) : sumarDias(hoy(), u.startsWith('sem') ? n * 7 : n);
  }],
  [reNlp('(?:el )?(\\d{1,2})/(\\d{1,2})(?:/(\\d{4}|\\d{2}))?'), (m) => fechaDe(+m[1], +m[2], m[3])],
  [reNlp(`(?:el )?(\\d{1,2}) de (${MESES.join('|')})(?: de (\\d{4}))?`), (m) => fechaDe(+m[1], MESES.indexOf(m[2].toLowerCase()) + 1, m[3])],
];

const A_LAS = '(?:a las? |sobre las? )';
const PATRONES_HORA = [
  [reNlp(`${A_LAS}?(\\d{1,2})[:.](\\d{2})(?: ?h)?`), (m) => horaDe(+m[1], +m[2])],
  [reNlp(`${A_LAS}?(\\d{1,2})(?::(\\d{2}))? ?([ap])\\.?m\\.?`), (m) => horaDe((+m[1] % 12) + (m[3].toLowerCase() === 'p' ? 12 : 0), +(m[2] || 0))],
  [reNlp(`${A_LAS}(\\d{1,2})(?: ?h)?(?: de la (ma[nñ]ana|tarde|noche))?`), (m) => {
    let h = +m[1];
    if (m[2] ? !/^ma/i.test(m[2]) && h < 12 : h >= 1 && h <= 7) h += 12; // "a las 5" → 17:00
    return horaDe(h);
  }],
  [reNlp('(\\d{1,2}) ?h'), (m) => (+m[1] >= 7 ? horaDe(+m[1]) : null)], // "17h" (no "2h", que suele ser duración)
];

// Busca una fecha y una hora en el texto. Devuelve los valores y dónde está cada trozo reconocido.
function analizarFechas(texto) {
  const res = { fecha: null, hora: null, rangos: [] };
  const libre = (ini, fin) => res.rangos.every((r) => fin <= r.ini || ini >= r.fin);
  const buscar = (patrones, tipo) => {
    for (const [patron, valor] of patrones) {
      for (const m of texto.matchAll(patron)) {
        const v = valor(m);
        const fin = m.index + m[0].length;
        if (v && libre(m.index, fin)) {
          res[tipo] = v;
          res.rangos.push({ ini: m.index, fin, tipo });
          return;
        }
      }
    }
  };
  buscar(PATRONES_HORA, 'hora');
  buscar(PATRONES_FECHA, 'fecha');
  return res;
}

function quitarRangos(texto, rangos) {
  let t = texto;
  [...rangos].sort((a, b) => b.ini - a.ini).forEach((r) => (t = t.slice(0, r.ini) + ' ' + t.slice(r.fin)));
  t = t.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').replace(/^[\s,.;:–-]+|[\s,;:–-]+$/g, '');
  return /^\p{Lu}/u.test(texto) ? mayuscula(t) : t; // "Hoy, llamar a Luis" → "Llamar a Luis"
}

// Campo de título que reconoce fechas: el texto reconocido se resalta (con un "espejo" detrás del input)
// y al guardar se quita del título.
const tituloNlp = (valor, placeholder, extra = '') => `
  <span class="nlp">
    <span class="nlp-espejo" aria-hidden="true"></span>
    <input name="titulo" data-nlp required autocomplete="off" value="${esc(valor)}" placeholder="${esc(placeholder)}" ${extra}>
  </span>`;

function activarNlp(raiz = document) {
  raiz.querySelectorAll('input[data-nlp]:not([data-nlp-on])').forEach((input) => {
    input.dataset.nlpOn = '1';
    const form = input.form;
    const espejo = input.parentElement.querySelector('.nlp-espejo');
    // aplicado: la fecha/hora del formulario la ha puesto el título · base: el valor que había antes
    // ignorar: texto que no se vuelve a aplicar porque después se cambió la fecha a mano
    const st = { aplicado: {}, base: {}, ignorar: {}, rangos: [] };
    input._nlp = st;

    const pintar = () => {
      const v = input.value;
      let html = '';
      let pos = 0;
      [...st.rangos].sort((a, b) => a.ini - b.ini).forEach((r) => {
        html += `${esc(v.slice(pos, r.ini))}<mark>${esc(v.slice(r.ini, r.fin))}</mark>`;
        pos = r.fin;
      });
      espejo.innerHTML = html + esc(v.slice(pos));
      espejo.scrollLeft = input.scrollLeft;
    };

    input.addEventListener('input', () => {
      const r = analizarFechas(input.value);
      st.rangos = [];
      for (const tipo of ['fecha', 'hora']) {
        const campo = form.elements[tipo];
        if (!campo) continue;
        const rango = r.rangos.find((x) => x.tipo === tipo);
        const texto = rango && input.value.slice(rango.ini, rango.fin).toLowerCase();
        if (st.ignorar[tipo] && st.ignorar[tipo] !== texto) delete st.ignorar[tipo];
        if (rango && !st.ignorar[tipo]) {
          if (!st.aplicado[tipo]) st.base[tipo] = campo.value;
          campo.value = r[tipo];
          st.aplicado[tipo] = true;
          st.rangos.push(rango);
        } else if (st.aplicado[tipo]) {
          campo.value = st.base[tipo]; // se ha borrado la palabra: vuelve la fecha de antes
          st.aplicado[tipo] = false;
        }
      }
      pintar();
      pintarChipFecha(form);
    });
    ['scroll', 'keyup', 'click', 'select'].forEach((ev) => input.addEventListener(ev, () => (espejo.scrollLeft = input.scrollLeft)));

    // Si se cambia la fecha o la hora a mano, manda eso y la palabra se queda en el título.
    ['fecha', 'hora'].forEach((tipo) => form.elements[tipo]?.addEventListener('change', () => {
      const rango = st.rangos.find((x) => x.tipo === tipo);
      if (!rango) return;
      st.ignorar[tipo] = input.value.slice(rango.ini, rango.fin).toLowerCase();
      st.aplicado[tipo] = false;
      st.rangos = st.rangos.filter((x) => x !== rango);
      pintar();
    }));
    pintar();
  });
}

// Título a guardar: sin las palabras que se han convertido en fecha u hora.
function tituloLimpio(input) {
  const rangos = input._nlp?.rangos || [];
  return (rangos.length && quitarRangos(input.value, rangos)) || input.value.trim();
}

// ---------- Tipo de tarea según el título ("Llamar a Ana" → llamada, "Enviar mail" → email…) ----------

const PALABRAS_ACCION = [
  ['videollamada', 'videollamad\\p{L}*|v[ií]deo ?llamad\\p{L}*|videoconferencias?|zoom|meet|teams'],
  ['llamada', 'll[aá]m\\p{L}*|telefonear'],
  ['reunion', 'reuni[oó]n|reuniones|reunir\\p{L}*|quedar con|visitar?'],
  ['email', 'correos?|e-?mails?|mails?'],
  ['whatsapp', 'whats?app|wasap|whatsap|wsp'],
  ['propuesta', 'propuestas?|presupuestos?'],
].map(([id, fuente]) => [id, new RegExp(`(?<![\\p{L}\\d])(?:${fuente})(?![\\p{L}\\d])`, 'iu')]);

// Si hay varias palabras, manda la que aparece antes ("Llamar para fijar reunión" → llamada).
function accionDeTitulo(texto) {
  let mejor = null;
  for (const [id, re] of PALABRAS_ACCION) {
    const m = texto.match(re);
    if (m && (!mejor || m.index < mejor.pos)) mejor = { id, pos: m.index };
  }
  return mejor?.id || '';
}

// Mientras se escribe el título, el tipo de acción lo sigue. Si se elige a mano, ya no se toca.
document.addEventListener('input', (e) => {
  const input = e.target;
  if (!input.matches?.('input[data-nlp]')) return;
  const sel = input.form?.elements.accion;
  if (!sel || sel.dataset.manual) return;
  if (!('base' in sel.dataset)) sel.dataset.base = sel.value;
  sel.value = accionDeTitulo(input.value) || sel.dataset.base;
});

document.addEventListener('change', (e) => {
  if (e.target.name === 'accion' && e.target.form?.querySelector('input[data-nlp]')) e.target.dataset.manual = '1';
});

// ---------- Editor de tareas (como el "Añadir tarea" de Todoist) ----------

const OPCIONES_FECHA_TD = [
  ['hoy', 'Hoy', 'calendario'], ['manana', 'Mañana', 'sol'], ['finde', 'Este fin de semana', 'sofa'],
  ['lunes', 'Próxima semana', 'flecha'], ['sin', 'Sin fecha', 'cancelado'],
];

const chipFecha = (fecha, hora) => `
  <span class="td-pop-wrap">
    <button type="button" class="td-chip td-chip-fecha" data-td-pop aria-haspopup="true"></button>
    <div class="td-pop" hidden>
      ${OPCIONES_FECHA_TD.map(([id, label, icono]) => `
        <button type="button" data-td-fecha="${id}">
          <span class="td-pop-icono">${ico(icono)}</span>${label}<small>${id === 'sin' ? '' : diaSemana(fechaAtajo(id), 'short')}</small>
        </button>`).join('')}
      <div class="td-pop-campos">
        <input type="date" name="fecha" value="${esc(fecha || '')}" aria-label="Fecha">
        <input type="time" name="hora" value="${esc(hora || '')}" title="Hora de España" aria-label="Hora (España)">
      </div>
    </div>
  </span>`;

// Con `lista` (aunque sea '') es una tarea general: en vez de contacto se elige la lista.
function editorTareaHTML({ fecha = hoy(), contactId = '', fijo = false, lista } = {}) {
  const c = fijo && contacto(contactId);
  const general = lista !== undefined;
  return `
    <form class="td-editor">
      ${tituloNlp('', 'Nombre de la tarea (p. ej. Llamar a Ana mañana a las 17)', 'class="td-editor-titulo"')}
      <input name="detalle" class="td-editor-desc" placeholder="Descripción" autocomplete="off">
      <div class="td-chips">
        ${chipFecha(fecha, '')}
        <select name="prioridad" class="td-chip td-chip-prio" data-prio="ninguna" title="Prioridad">${opciones(PRIORIDADES, 'ninguna')}</select>
        <select name="accion" class="td-chip" title="Si es una acción hacia el cliente, aparecerá en sus Próximas acciones">
          <option value="">Tarea interna</option>
          ${opciones(TIPOS_ACCION, '')}
        </select>
        <button type="button" class="td-chip" data-td-nota>${ico('nota')} Nota</button>
      </div>
      <div class="td-nota" hidden>${editorHTML('nota', '', 4, 'Lo que quieras tener presente para esta tarea…')}</div>
      <div class="td-pie">
        ${general ? `<input type="hidden" name="contactId" value="">${campoLista(lista, 'td-proyecto-select')}`
          : c ? `<input type="hidden" name="contactId" value="${c.id}"><span class="td-proyecto-fijo">${ico('persona')} ${esc(c.nombre)}</span>` : `
          <select name="contactId" class="td-proyecto-select" title="Contacto">
            <option value="">Sin contacto</option>
            ${contactosOrdenados().map((x) => `<option value="${x.id}" ${x.id === contactId ? 'selected' : ''}>${esc(x.nombre)}${empresaDe(x) ? ` · ${esc(empresaDe(x))}` : ''}</option>`).join('')}
          </select>`}
        <span class="grow"></span>
        <button type="button" class="btn" data-td-cancelar>Cancelar</button>
        <button class="btn td-primario">Añadir tarea</button>
      </div>
    </form>`;
}

const listasDeTareas = () => [...new Set([...db.tasks.map((t) => t.lista).filter(Boolean), ...ui.listasNuevas])].sort((a, b) => a.localeCompare(b, 'es'));
const campoLista = (valor, clase = '') => `
  <input name="lista" class="${clase}" list="listas-tareas" autocomplete="off" value="${esc(valor || '')}" placeholder="# General" title="Lista (para tareas sin contacto)">
  <datalist id="listas-tareas">${listasDeTareas().map((l) => `<option value="${esc(l)}">`).join('')}</datalist>`;

const anadirTareaHTML = (clave, fecha = '') => `
  <button class="td-anadir" data-action="abrir-editor" data-clave="${clave}" data-fecha="${fecha}"><span class="td-mas">+</span> Añadir tarea</button>`;

function pintarChipFecha(form) {
  const chip = form.querySelector('.td-chip-fecha');
  if (!chip) return;
  const f = form.elements.fecha.value;
  const h = form.elements.hora.value;
  chip.className = `td-chip td-chip-fecha ${f ? claseFecha(f) : ''}`;
  chip.innerHTML = f ? `${ICONO_CAL}${fmtCuando(f)}${h ? ` ${h}` : ''}` : h ? `${ico('reloj')} ${h}` : `${ICONO_CAL}Fecha`;
}

function activarTareas(raiz = document) {
  activarNlp(raiz);
  raiz.querySelectorAll('.td-editor').forEach(pintarChipFecha);
}

const cerrarPops = (salvo) => document.querySelectorAll('.td-pop:not([hidden])').forEach((p) => p !== salvo && (p.hidden = true));

function cerrarEditor(form) {
  if (form.closest('dialog')) return modal.close();
  ui.editor = null;
  render();
}

document.addEventListener('click', (e) => {
  const pop = e.target.closest('.td-pop');
  const abrir = e.target.closest('[data-td-pop]');
  cerrarPops(pop || abrir?.nextElementSibling);
  if (abrir) abrir.nextElementSibling.hidden = !abrir.nextElementSibling.hidden;

  const opcion = e.target.closest('[data-td-fecha]');
  if (opcion) {
    const form = opcion.closest('form');
    form.elements.fecha.value = fechaAtajo(opcion.dataset.tdFecha);
    if (opcion.dataset.tdFecha === 'sin') form.elements.hora.value = '';
    form.elements.fecha.dispatchEvent(new Event('change', { bubbles: true }));
    opcion.closest('.td-pop').hidden = true;
  }
  if (e.target.closest('[data-td-nota]')) {
    const caja = e.target.closest('form').querySelector('.td-nota');
    caja.hidden = !caja.hidden;
    if (!caja.hidden) caja.querySelector('textarea').focus();
  }
  if (e.target.closest('[data-td-cancelar]')) cerrarEditor(e.target.closest('form'));
});

document.addEventListener('change', (e) => {
  const form = e.target.closest('.td-editor');
  if (!form) return;
  if (e.target.name === 'fecha' || e.target.name === 'hora') pintarChipFecha(form);
  if (e.target.name === 'prioridad') e.target.dataset.prio = e.target.value;
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const abierto = document.querySelector('.td-pop:not([hidden])');
  if (abierto) {
    e.preventDefault();
    abierto.hidden = true;
    return;
  }
  const form = e.target.closest?.('.td-editor');
  if (form && !form.closest('dialog') && !e.target.closest('.editor.completa')) cerrarEditor(form);
});

// Guarda la tarea del editor y lo deja abierto para la siguiente, como Todoist.
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (!f.matches('.td-editor')) return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  const titulo = tituloLimpio(f.elements.titulo);
  if (!titulo) return;
  const t = {
    id: uid(),
    titulo,
    detalle: d.detalle.trim(),
    contactId: d.contactId || null,
    lista: (!d.contactId && d.lista?.trim()) || null,
    accion: d.accion || null,
    fecha: d.fecha || null,
    hora: d.hora || null,
    prioridad: d.prioridad || 'ninguna',
    hecha: false,
    completada: null,
    creado: ahora(),
  };
  db.tasks.push(t);
  guardarNotaDeTarea(t, d.nota);
  tocar(t.contactId);
  guardar();
  if (f.closest('dialog')) {
    modal.close();
    avisar(`Tarea añadida${t.fecha ? ` · ${fmtCuando(t.fecha)}` : ''}`);
  } else {
    ui.enfocarTarea = true;
  }
  render();
});

// Añadir tarea rápida (botón del menú o tecla Q). En la ficha de un contacto, la tarea es suya.
function modalRapido() {
  const { ruta, id } = rutaActual();
  const contactId = ruta === 'contacto' && contacto(id) ? id : '';
  modal.innerHTML = `<div class="td-rapido">${editorTareaHTML({ fecha: hoy(), contactId })}</div>`;
  activarEditores(modal);
  activarTareas(modal);
  modal.showModal();
  $('[name=titulo]', modal).focus();
}

// ---------- Avisos con "Deshacer" ----------

const aviso = document.getElementById('aviso');
let temporizadorAviso = null;

function avisar(texto, deshacer) {
  aviso.innerHTML = `<span>${esc(texto)}</span>${deshacer ? '<button type="button">Deshacer</button>' : ''}`;
  aviso.hidden = false;
  aviso.querySelector('button')?.addEventListener('click', () => {
    aviso.hidden = true;
    deshacer();
  });
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => (aviso.hidden = true), 6000);
}

// ---------- Markdown (negrita, listas con sangría y enlaces) ----------

function mdInline(s) {
  // `s` ya viene escapado: solo se añaden etiquetas propias.
  return s
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function markdown(texto) {
  const lineas = esc(texto).replace(/\t/g, '  ').split('\n');
  let html = '';
  let parrafo = [];
  const pila = []; // listas abiertas: { tipo: 'ul' | 'ol', sangria }

  const cerrarParrafo = () => {
    if (parrafo.length) html += `<p>${parrafo.map(mdInline).join('<br>')}</p>`;
    parrafo = [];
  };
  const cerrarListas = (hasta = -1) => {
    while (pila.length && pila[pila.length - 1].sangria > hasta) html += `</li></${pila.pop().tipo}>`;
  };
  const abrirLista = (tipo, sangria, num) => {
    const inicio = tipo === 'ol' && num > 1 ? ` start="${num}"` : '';
    html += `<${tipo}${inicio}><li>`;
    pila.push({ tipo, sangria });
  };

  for (const linea of lineas) {
    const m = linea.match(/^(\s*)([-*•]|(\d+)[.)])\s+(.*)$/);
    if (m) {
      cerrarParrafo();
      const sangria = m[1].length;
      const tipo = m[3] ? 'ol' : 'ul';
      const cima = pila[pila.length - 1];
      if (!cima || sangria > cima.sangria) {
        abrirLista(tipo, sangria, +m[3]);
      } else {
        cerrarListas(sangria);
        const actual = pila[pila.length - 1];
        if (!actual) abrirLista(tipo, sangria, +m[3]);
        else if (actual.tipo !== tipo && actual.sangria === sangria) {
          html += `</li></${pila.pop().tipo}>`;
          abrirLista(tipo, sangria, +m[3]);
        } else html += '</li><li>';
      }
      html += mdInline(m[4]);
    } else if (!linea.trim()) {
      cerrarParrafo();
      cerrarListas();
    } else if (pila.length && /^\s+/.test(linea)) {
      html += '<br>' + mdInline(linea.trim()); // continuación de un punto de la lista
    } else {
      cerrarListas();
      parrafo.push(linea);
    }
  }
  cerrarParrafo();
  cerrarListas();
  return html;
}

// Editor de notas: al pulsar Enter en una lista añade el siguiente guion/número; Tab y Mayús+Tab cambian la sangría.
const LISTA_RE = /^(\s*)([-*•]|(\d+)([.)]))\s(.*)$/;

function activarEditores(raiz = document) {
  raiz.querySelectorAll('textarea[data-md]:not([data-md-on])').forEach((ta) => {
    ta.dataset.mdOn = '1';
    ta.addEventListener('keydown', (e) => teclaEditor(ta, e));
  });
}

function teclaEditor(ta, e) {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && ['b', 'k'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    comandoEditor(ta, e.key.toLowerCase() === 'b' ? 'negrita' : 'enlace');
    return;
  }
  if (e.key === 'Escape' && ta.closest('.editor.completa') && !ta.closest('dialog')) {
    e.preventDefault();
    e.stopPropagation();
    comandoEditor(ta, 'pantalla');
    return;
  }
  const { selectionStart: ini, selectionEnd: fin, value } = ta;
  const inicioLinea = value.lastIndexOf('\n', ini - 1) + 1;
  const finLinea = value.indexOf('\n', ini) === -1 ? value.length : value.indexOf('\n', ini);
  const m = value.slice(inicioLinea, finLinea).match(LISTA_RE);

  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.isComposing && ini === fin && m) {
    e.preventDefault();
    if (!m[5].trim() && ini === finLinea) {
      ta.setRangeText('', inicioLinea, finLinea, 'end'); // punto vacío: se cierra la lista
    } else {
      const marca = m[3] ? `${+m[3] + 1}${m[4]}` : m[2];
      ta.setRangeText(`\n${m[1]}${marca} `, ini, fin, 'end');
    }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (e.key === 'Tab' && m) {
    e.preventDefault();
    if (e.shiftKey) {
      const quitar = Math.min(2, m[1].length);
      if (!quitar) return;
      ta.setRangeText('', inicioLinea, inicioLinea + quitar, 'preserve');
      ta.setSelectionRange(ini - quitar, fin - quitar);
    } else {
      ta.setRangeText('  ', inicioLinea, inicioLinea, 'preserve');
      ta.setSelectionRange(ini + 2, fin + 2);
    }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

const barraEditor = () => `
  <div class="md-barra">
    <button type="button" data-md-cmd="negrita" title="Negrita (Ctrl+B)"><b>B</b></button>
    <button type="button" data-md-cmd="lista" title="Lista con guiones">• Lista</button>
    <button type="button" data-md-cmd="numerada" title="Lista numerada">1. Lista</button>
    <button type="button" data-md-cmd="enlace" title="Enlace (Ctrl+K)">${ico('enlace')} Enlace</button>
    <span class="md-ayuda">Ctrl+B negrita · Ctrl+K enlace · Enter continúa la lista · Tab la sangra</span>
    <button type="button" class="md-pantalla" data-md-cmd="pantalla" title="Pantalla completa (Esc para salir)">${ico('expandir')}</button>
  </div>`;

const editorHTML = (nombre, valor, filas, placeholder) => `
  <div class="editor">
    ${barraEditor()}
    <textarea name="${nombre}" rows="${filas}" data-md placeholder="${esc(placeholder)}">${esc(valor)}</textarea>
  </div>`;

function comandoEditor(ta, cmd) {
  const editor = ta.closest('.editor');
  if (cmd === 'pantalla') {
    const completa = editor.classList.toggle('completa');
    ajustarScroll();
    const b = editor.querySelector('.md-pantalla');
    b.innerHTML = completa ? `${ico('cerrar')} Salir` : ico('expandir');
    b.title = completa ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa (Esc para salir)';
    ta.focus();
    return;
  }
  const { selectionStart: ini, selectionEnd: fin, value } = ta;
  const sel = value.slice(ini, fin);
  const inicioLinea = value.lastIndexOf('\n', ini - 1) + 1;
  if (cmd === 'negrita') {
    const yaNegrita = value.slice(ini - 2, ini) === '**' && value.slice(fin, fin + 2) === '**';
    if (yaNegrita) {
      ta.setRangeText(sel, ini - 2, fin + 2, 'select'); // segunda pulsación: quita la negrita
    } else {
      ta.setRangeText(`**${sel || 'texto'}**`, ini, fin, 'end');
      ta.setSelectionRange(ini + 2, ini + 2 + (sel || 'texto').length);
    }
  } else if (cmd === 'enlace') {
    if (/^https?:\/\/\S+$/.test(sel)) {
      // Seleccionada una URL: queda como destino y se selecciona el texto para escribirlo.
      ta.setRangeText(`[texto](${sel})`, ini, fin, 'end');
      ta.setSelectionRange(ini + 1, ini + 6);
    } else {
      ta.setRangeText(`[${sel || 'texto'}](https://)`, ini, fin, 'end');
      ta.setSelectionRange(ta.selectionEnd - 1, ta.selectionEnd - 1);
    }
  } else {
    ta.setRangeText(cmd === 'lista' ? '- ' : '1. ', inicioLinea, inicioLinea, 'end');
  }
  ta.focus();
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-md-cmd]');
  if (b) comandoEditor(b.closest('.editor').querySelector('textarea'), b.dataset.mdCmd);
});

// ---------- Guardado ----------

const estadoGuardado = document.getElementById('save-status');
let temporizadorGuardado = null;
let cambiosPendientes = false;

function setStatus(texto, tipo) {
  estadoGuardado.textContent = texto;
  estadoGuardado.dataset.tipo = tipo;
}

function guardar() {
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

// ---------- Router ----------

function rutaActual() {
  const [, ruta, id] = location.hash.replace(/^#/, '').split('/');
  return { ruta, id };
}

function render() {
  const { ruta, id } = rutaActual();
  if (ruta === 'hoy') { // la antigua página Hoy es ahora la vista "Hoy" de Tareas
    ui.tareasVista = 'hoy';
    location.replace('#/tareas');
    return;
  }
  const seccion = { cola: 'tareas', empresa: 'empresas', tarea: 'tareas' }[ruta] || (['tareas', 'empresas', 'secuencias', 'equipo', 'ajustes'].includes(ruta) ? ruta : 'contactos');
  document.querySelectorAll('.menu a').forEach((a) => a.classList.toggle('active', a.dataset.ruta === seccion));

  if (ruta === 'tareas') vistaTareas();
  else if (ruta === 'ajustes') vistaAjustes();
  else if (ruta === 'cola') vistaSecuencia();
  else if (ruta === 'empresas') vistaEmpresas();
  else if (ruta === 'empresa' && empresa(id)) vistaEmpresa(id);
  else if (ruta === 'secuencias' && id && secuencia(id)) vistaSecuenciaDetalle(id);
  else if (ruta === 'secuencias') vistaSecuencias();
  else if (ruta === 'equipo') vistaEquipo();
  else if (ruta === 'contacto' && contacto(id)) vistaContacto(id);
  else vistaContactos();

  activarEditores(app);
  activarTareas(app);
  if (ui.enfocarTarea) {
    $('.td-editor [name=titulo]', app)?.focus();
    ui.enfocarTarea = false;
  }
  ajustarScroll();
  actualizarBadges();
}

// ---------- Menú lateral ----------

const menu = document.getElementById('menu');
const menuBtn = document.getElementById('menu-btn');

function abrirMenu(abrir) {
  document.body.classList.toggle('menu-abierto', abrir);
  menu.setAttribute('aria-hidden', String(!abrir));
  menuBtn.setAttribute('aria-expanded', String(abrir));
  if (abrir) menu.querySelector('a.active, a')?.focus();
}

menuBtn.addEventListener('click', () => abrirMenu(!document.body.classList.contains('menu-abierto')));
document.getElementById('menu-cerrar').addEventListener('click', () => abrirMenu(false));
document.getElementById('menu-fondo').addEventListener('click', () => abrirMenu(false));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) abrirMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-abierto')) {
    abrirMenu(false);
    menuBtn.focus();
    return;
  }
  // Q: añadir tarea rápida (como en Todoist), si no se está escribiendo en ningún campo.
  const escribiendo = e.target.closest?.('input, textarea, select, [contenteditable]');
  // /: buscar contactos en la barra de arriba.
  if (e.key === '/' && !escribiendo && !e.ctrlKey && !e.metaKey && !modal.open) {
    e.preventDefault();
    buscador.focus();
    return;
  }
  // Haciendo tareas (en #/cola o en la ficha del contacto): Ctrl+Enter completa (también escribiendo la nota)
  // y las flechas pasan de una tarea a otra.
  if (enModoCola() && !modal.open) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      completarActualEnCola();
      return;
    }
    if (!escribiendo && !e.ctrlKey && !e.metaKey && !e.altKey && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      irEnCola(ui.cola.i + (e.key === 'ArrowRight' ? 1 : -1));
      return;
    }
  }
  if (e.key.toLowerCase() === 'q' && !e.ctrlKey && !e.metaKey && !e.altKey && !escribiendo && !modal.open) {
    e.preventDefault();
    modalRapido();
  }
});

// Iconos de la página (menú) que van en el HTML con data-ico.
document.querySelectorAll('[data-ico]').forEach((el) => (el.innerHTML = ico(el.dataset.ico)));

// ---------- Buscador de la barra superior (como el de HubSpot): contactos y empresas desde cualquier vista ----------

const buscador = document.getElementById('buscar-global');
const resultadosBusqueda = document.getElementById('buscar-resultados');
let busquedaSel = 0;

function resultadosGlobales(texto) {
  const q = normalizar(texto);
  if (!q) return [];
  const digitos = texto.replace(/\D/g, '');
  const contiene = (v) => normalizar(v).includes(q);
  // Primero los que empiezan por lo buscado, luego el resto.
  const peso = (nombre) => (normalizar(nombre).startsWith(q) ? 0 : 1);
  const contactos = db.contacts
    .filter((c) => [c.nombre, c.email, empresaDe(c), c.cargo, c.ciudad].some(contiene)
      || (digitos.length >= 3 && (c.telefono || '').replace(/\D/g, '').includes(digitos)))
    .sort((a, b) => peso(a.nombre) - peso(b.nombre) || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 8)
    .map((c) => ({
      href: '#/contacto/' + c.id, icono: esc(iniciales(c.nombre)), titulo: c.nombre,
      sub: [empresaDe(c), c.email || c.telefono].filter(Boolean).join(' · '), tipo: 'Contacto',
    }));
  const empresas = db.companies
    .filter((e) => [e.nombre, e.web].some(contiene))
    .sort((a, b) => peso(a.nombre) - peso(b.nombre) || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 4)
    .map((e) => ({
      href: '#/empresa/' + e.id, icono: ico('empresa'), cuadrado: true, titulo: e.nombre,
      sub: [estadoLeadDe(e.estadoLead)?.label, `${contactosDeEmpresa(e.id).length} contactos`].filter(Boolean).join(' · '), tipo: 'Empresa',
    }));
  return [...contactos, ...empresas];
}

function pintarBusqueda() {
  const lista = resultadosGlobales(buscador.value);
  busquedaSel = Math.min(busquedaSel, Math.max(0, lista.length - 1));
  resultadosBusqueda.hidden = !buscador.value.trim();
  resultadosBusqueda.innerHTML = lista.map((r, i) => `
    <a href="${r.href}" class="br-item ${i === busquedaSel ? 'activo' : ''}" data-i="${i}">
      <span class="avatar sm ${r.cuadrado ? 'cuadrado' : ''}">${r.icono}</span>
      <span class="grow"><strong>${esc(r.titulo)}</strong><span class="muted small">${esc(r.sub)}</span></span>
      <span class="br-tipo">${r.tipo}</span>
    </a>`).join('') || `<p class="br-vacio muted small">Ningún contacto ni empresa coincide con «${esc(buscador.value.trim())}».</p>`;
}

function cerrarBusqueda(limpiar = false) {
  resultadosBusqueda.hidden = true;
  if (limpiar) buscador.value = '';
}

buscador.addEventListener('input', () => { busquedaSel = 0; pintarBusqueda(); });
buscador.addEventListener('focus', () => { if (buscador.value.trim()) pintarBusqueda(); });
buscador.addEventListener('keydown', (e) => {
  const items = resultadosBusqueda.querySelectorAll('.br-item');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!items.length) return;
    busquedaSel = (busquedaSel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle('activo', i === busquedaSel));
    items[busquedaSel].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const el = items[busquedaSel];
    if (!el) return;
    location.hash = el.getAttribute('href');
    cerrarBusqueda(true);
    buscador.blur();
  } else if (e.key === 'Escape') {
    cerrarBusqueda(true);
    buscador.blur();
  }
});
resultadosBusqueda.addEventListener('click', (e) => { if (e.target.closest('.br-item')) cerrarBusqueda(true); });
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#buscador')) cerrarBusqueda(); });

function actualizarReloj() {
  const z = zonaSecundaria();
  document.getElementById('reloj').innerHTML = `España <b>${horaActual()}</b> ${z ? enLocal(horaActual(z.id)) : ''}`;
}

function actualizarBadges() {
  actualizarReloj();
  const h = hoy();
  const pend = db.tasks.filter((t) => !t.hecha);
  const paraHoy = pend.filter((t) => t.fecha && t.fecha <= h);
  const vencidas = paraHoy.filter((t) => t.fecha < h).length;

  // El número de Tareas se pone en rojo si hay vencidas.
  const b = document.getElementById('badge-tareas');
  b.textContent = pend.length || '';
  b.classList.toggle('alerta', vencidas > 0);
  b.title = vencidas ? `${vencidas} vencida${vencidas === 1 ? '' : 's'}` : '';
}

// ---------- Vista: contactos (tabla con vistas guardadas, como HubSpot) ----------

const todasLasVistas = () => [...VISTAS_BASE, ...db.views];
const vistaActual = () => todasLasVistas().find((v) => v.id === ui.vistaId) || VISTAS_BASE[0];

function cargarVista(id) {
  ui.vistaId = id;
  try { localStorage.setItem('crm-vista', id); } catch { /* sin almacenamiento: no pasa nada */ }
  const v = vistaActual();
  ui.filtros = { ...FILTROS_VACIOS, ...v.filtros };
  ui.orden = { ...ORDEN_DEFECTO, ...v.orden };
  ui.seleccion.clear();
}

// Hay cambios sin guardar en los filtros o el orden de la vista.
const vistaModificada = () => {
  const v = vistaActual();
  return JSON.stringify([ui.filtros, ui.orden]) !== JSON.stringify([{ ...FILTROS_VACIOS, ...v.filtros }, { ...ORDEN_DEFECTO, ...v.orden }]);
};

function filtrarContactos(f) {
  const q = f.q.trim().toLowerCase();
  const h = hoy();
  return db.contacts.filter((c) => {
    if (f.estado && c.estado !== f.estado) return false;
    if (f.ownerId && (f.ownerId === 'ninguno' ? c.ownerId : c.ownerId !== f.ownerId)) return false;
    if (f.companyId && (f.companyId === 'ninguna' ? c.companyId : c.companyId !== f.companyId)) return false;
    if (f.importacion && (c.importacion || '') !== f.importacion) return false;
    if (f.tarea) {
      const pend = pendientesDe(c.id);
      if (f.tarea === 'sin' && pend.length) return false;
      if (f.tarea === 'vencida' && !pend.some((t) => t.fecha && t.fecha < h)) return false;
      if (f.tarea === 'hoy' && !pend.some((t) => t.fecha && t.fecha <= h)) return false;
    }
    if (f.secuencia) {
      const e = inscripcionActiva(c.id);
      if (f.secuencia === 'alguna' ? !e : f.secuencia === 'ninguna' ? e : e?.sequenceId !== f.secuencia) return false;
    }
    if (q) {
      const campos = [c.nombre, empresaDe(c), c.cargo, c.email, c.telefono, c.ciudad, ...(c.etiquetas || [])];
      if (!campos.some((v) => (v || '').toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

const COLUMNAS = [
  { campo: 'nombre', label: 'Contacto' },
  { campo: 'empresa', label: 'Empresa' },
  { campo: 'propietario', label: 'Propietario' },
  { campo: 'estado', label: 'Estado' },
  { campo: 'proxima', label: 'Próxima tarea' },
  { campo: 'ultima', label: 'Última acción', clase: 'col-nota' },
];

// Valor por el que se ordena cada columna (lo vacío, al final).
function claveOrden(c, campo) {
  if (campo === 'nombre') return c.nombre.toLowerCase();
  if (campo === 'empresa') return empresaDe(c).toLowerCase() || '￿';
  if (campo === 'propietario') return c.ownerId ? nombreUsuario(c.ownerId).toLowerCase() : '￿';
  if (campo === 'estado') return String(ESTADOS.findIndex((e) => e.id === c.estado)).padStart(2, '0');
  if (campo === 'proxima') { const t = proximaTarea(c.id); return t ? (t.fecha || '9999') + (t.hora || '') : '￿'; }
  if (campo === 'ultima') return accionesDe(c.id)[0]?.fecha || '';
  return c.actualizado || '';
}

function ordenarContactos(lista, { campo, dir }) {
  const claves = new Map(lista.map((c) => [c.id, claveOrden(c, campo)]));
  return lista.sort((a, b) => claves.get(a.id).localeCompare(claves.get(b.id), 'es') * (dir === 'desc' ? -1 : 1));
}

const propietarioHTML = (c) =>
  c.ownerId ? `<span class="propietario">${avatarUsuario(c.ownerId)} ${esc(usuario(c.ownerId)?.nombre || '')}</span>` : '<span class="muted">—</span>';

function proximaTareaHTML(c) {
  const t = proximaTarea(c.id);
  if (!t) return '<span class="muted">—</span>';
  const h = hoy();
  const pend = pendientesDe(c.id).length;
  return `
    <div class="${t.fecha && t.fecha < h ? 'txt-danger' : ''}">${t.fecha ? fmtRelativa(t.fecha) : 'Sin fecha'}${t.hora ? ` · ${conLocal(t.hora, t.fecha || h)}` : ''}</div>
    <div class="muted truncate">${t.accion ? `${ico(tipoAccionDe(t.accion).icon)} ` : ''}${esc(t.titulo)}${pend > 1 ? ` <span class="muted">(+${pend - 1})</span>` : ''}</div>`;
}

function vistaContactos() {
  if (!ui.filtros || !todasLasVistas().some((v) => v.id === ui.vistaId)) cargarVista(todasLasVistas().some((v) => v.id === ui.vistaId) ? ui.vistaId : 'todos');
  const f = ui.filtros;
  const sel = (id, valor, opcionesHTML, titulo) =>
    `<select id="${id}" class="filtro ${valor ? 'on' : ''}" title="${titulo}">${opcionesHTML}</select>`;
  const opt = (v, label, actual) => `<option value="${esc(v)}" ${v === actual ? 'selected' : ''}>${esc(label)}</option>`;
  const importaciones = nombresImportaciones();

  app.innerHTML = `
    <div class="page-head">
      <h1>Contactos <span class="h1-count">${db.contacts.length}</span></h1>
      <div class="row">
        <button class="btn" data-action="importar-csv">${ico('importar')} Importar CSV</button>
        <button class="btn primary" data-action="nuevo-contacto">+ Nuevo contacto</button>
      </div>
    </div>

    <div class="vistas-tabs">
      ${todasLasVistas().map((v) => `
        <button class="vista-tab ${v.id === ui.vistaId ? 'active' : ''}" data-action="vista-contactos" data-id="${v.id}">${esc(v.nombre)}</button>`).join('')}
      <button class="vista-tab vista-nueva" data-action="nueva-vista" title="Crear una vista con sus propios filtros">+ Añadir vista</button>
    </div>

    <div class="toolbar filtros-bar">
      <input type="search" id="f-q" class="grow" placeholder="Buscar por nombre, empresa, email, teléfono o ciudad…" value="${esc(f.q)}">
      ${sel('f-owner', f.ownerId, opt('', 'Propietario: todos', f.ownerId) + opt('ninguno', 'Sin propietario', f.ownerId)
        + db.users.map((u) => opt(u.id, nombreUsuario(u.id), f.ownerId)).join(''), 'Propietario')}
      ${sel('f-estado', f.estado, opt('', 'Estado: todos', f.estado) + ESTADOS.map((e) => opt(e.id, e.label, f.estado)).join(''), 'Estado')}
      ${sel('f-empresa', f.companyId, opt('', 'Empresa: todas', f.companyId) + opt('ninguna', 'Sin empresa', f.companyId)
        + empresasOrdenadas().map((e) => opt(e.id, e.nombre, f.companyId)).join(''), 'Empresa')}
      ${sel('f-tarea', f.tarea, opt('', 'Tareas: todas', f.tarea) + opt('vencida', 'Con tareas vencidas', f.tarea)
        + opt('hoy', 'Con tareas para hoy', f.tarea) + opt('sin', 'Sin tareas pendientes', f.tarea), 'Tareas pendientes')}
      ${sel('f-secuencia', f.secuencia, opt('', 'Secuencia: todas', f.secuencia) + opt('alguna', 'En alguna secuencia', f.secuencia)
        + opt('ninguna', 'En ninguna secuencia', f.secuencia) + db.sequences.map((s) => opt(s.id, `En «${s.nombre}»`, f.secuencia)).join(''), 'Secuencia')}
      ${importaciones.length ? sel('f-importacion', f.importacion, opt('', 'Importación: todas', f.importacion)
        + importaciones.map((n) => opt(n, n, f.importacion)).join(''), 'Importación en la que entró el contacto') : ''}
    </div>

    <div id="tabla-contactos"></div>`;

  $('#f-q').addEventListener('input', (e) => { ui.filtros.q = e.target.value; renderTablaContactos(); });
  [['f-owner', 'ownerId'], ['f-estado', 'estado'], ['f-empresa', 'companyId'], ['f-tarea', 'tarea'], ['f-secuencia', 'secuencia'], ['f-importacion', 'importacion']].forEach(([id, k]) =>
    $('#' + id)?.addEventListener('change', (e) => { ui.filtros[k] = e.target.value; ui.seleccion.clear(); vistaContactos(); }));

  renderTablaContactos();
}

function renderTablaContactos() {
  const cont = $('#tabla-contactos');
  if (!db.contacts.length) {
    cont.innerHTML = `
      <div class="empty card">
        <p><strong>Aún no hay contactos.</strong></p>
        <p class="muted">Empieza añadiendo tu primer cliente o lead.</p>
        <button class="btn primary" data-action="nuevo-contacto">+ Nuevo contacto</button>
      </div>`;
    return;
  }

  const lista = ordenarContactos(filtrarContactos(ui.filtros), ui.orden);
  const visibles = new Set(lista.map((c) => c.id));
  [...ui.seleccion].forEach((id) => !visibles.has(id) && ui.seleccion.delete(id));
  const nSel = ui.seleccion.size;
  const v = vistaActual();
  const modificada = vistaModificada();

  const barra = nSel ? `
    <div class="tabla-barra seleccion">
      <b>${nSel} seleccionado${nSel === 1 ? '' : 's'}</b>
      <button class="btn sm" data-action="masivo-propietario">${ico('persona')} Asignar propietario</button>
      <button class="btn sm" data-action="masivo-secuencia">${ico('secuencia')} Inscribir en secuencia</button>
      <button class="btn sm" data-action="masivo-estado">Cambiar estado</button>
      <button class="btn sm danger-ghost" data-action="masivo-borrar">${ico('papelera')} Eliminar</button>
      <span class="grow"></span>
      <button class="link-btn" data-action="quitar-seleccion">Quitar selección</button>
    </div>` : `
    <div class="tabla-barra">
      <span class="muted">${lista.length} contacto${lista.length === 1 ? '' : 's'}</span>
      <span class="grow"></span>
      ${modificada ? `
        <button class="link-btn" data-action="restablecer-vista">Descartar cambios</button>
        ${v.fija ? '' : '<button class="btn sm primary" data-action="guardar-vista">Guardar vista</button>'}
        <button class="btn sm ${v.fija ? 'primary' : ''}" data-action="nueva-vista" data-con-filtros="1">Guardar como vista nueva</button>` : ''}
      ${v.fija ? '' : `
        <button class="link-btn" data-action="renombrar-vista">Renombrar vista</button>
        <button class="link-btn txt-peligro" data-action="borrar-vista">Eliminar vista</button>`}
    </div>`;

  if (!lista.length) {
    cont.innerHTML = `${barra}<div class="empty card"><p class="muted">Ningún contacto coincide con los filtros de esta vista.</p></div>`;
    return;
  }

  const flecha = (campo) => (ui.orden.campo === campo ? (ui.orden.dir === 'asc' ? ' ↑' : ' ↓') : '');
  const todos = lista.every((c) => ui.seleccion.has(c.id));
  cont.innerHTML = `
    ${barra}
    <div class="card table-wrap">
      <table class="tabla">
        <thead>
          <tr>
            <th class="col-check"><label class="celda-check"><input type="checkbox" class="sel-todos" ${todos ? 'checked' : ''} aria-label="Seleccionar todos"></label></th>
            ${COLUMNAS.map((col) => `<th class="${col.clase || ''}"><button class="th-orden" data-action="ordenar" data-campo="${col.campo}">${col.label}${flecha(col.campo)}</button></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${lista.map((c) => {
            const a = accionesDe(c.id)[0];
            const emp = empresa(c.companyId);
            const ins = inscripcionActiva(c.id);
            const s = ins && secuencia(ins.sequenceId);
            const marcado = ui.seleccion.has(c.id);
            return `
              <tr data-action="abrir-contacto" data-id="${c.id}" class="${marcado ? 'seleccionada' : ''}">
                <td class="col-check"><label class="celda-check"><input type="checkbox" class="sel-contacto" data-id="${c.id}" ${marcado ? 'checked' : ''} aria-label="Seleccionar ${esc(c.nombre)}"></label></td>
                <td>
                  <div class="persona">
                    <span class="avatar sm">${esc(iniciales(c.nombre))}</span>
                    <div>
                      <strong>${esc(c.nombre)}</strong>
                      <div class="muted small">${esc(c.cargo)}${s ? ` <span class="seq-pill" title="En la secuencia «${esc(s.nombre)}»">${ico('secuencia')} ${ins.paso + 1}/${s.pasos.length}</span>` : ''}</div>
                    </div>
                  </div>
                </td>
                <td class="small">${emp ? `<a href="#/empresa/${emp.id}">${esc(emp.nombre)}</a>` : '<span class="muted">—</span>'}</td>
                <td class="small">${propietarioHTML(c)}</td>
                <td>${selectEstado(c)}</td>
                <td class="small">${proximaTareaHTML(c)}</td>
                <td class="col-nota small">
                  ${a ? `<div>${ico(tipoAccionDe(a.tipo).icon)} ${tipoAccionDe(a.tipo).label} · ${fmtFecha(a.fecha)}</div><div class="muted truncate">${esc(a.resumen)}</div>` : '<span class="muted">—</span>'}
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// Marcar filas: solo se vuelve a pintar la tabla (no se pierde el scroll ni la búsqueda).
app.addEventListener('change', (e) => {
  if (e.target.matches('.sel-contacto')) {
    if (e.target.checked) ui.seleccion.add(e.target.dataset.id);
    else ui.seleccion.delete(e.target.dataset.id);
    renderTablaContactos();
  } else if (e.target.matches('.sel-todos')) {
    if (e.target.checked) filtrarContactos(ui.filtros).forEach((c) => ui.seleccion.add(c.id));
    else ui.seleccion.clear();
    renderTablaContactos();
  }
});

const seleccionados = () => [...ui.seleccion].map(contacto).filter(Boolean);

// Crea una vista (vacía, o con los filtros actuales si `conFiltros`), o renombra `v`.
function modalVista(v, conFiltros = false) {
  abrirModal(v ? 'Renombrar vista' : 'Nueva vista', `
    ${campo('Nombre de la vista *', `<input name="nombre" required value="${esc(v?.nombre)}" placeholder="Ej. Clínicas sin tareas">`)}
    ${v ? '' : `<p class="muted small">${conFiltros ? 'Se guarda con los filtros y el orden que tienes ahora.' : 'Empieza sin filtros: ponle los que quieras y pulsa «Guardar vista».'}</p>`}
  `, (d) => {
    const nombre = d.nombre.trim();
    if (!nombre) return false;
    if (v) v.nombre = nombre;
    else {
      const nv = { id: uid(), nombre, filtros: conFiltros ? { ...ui.filtros } : { ...FILTROS_VACIOS }, orden: conFiltros ? { ...ui.orden } : { ...ORDEN_DEFECTO } };
      db.views.push(nv);
      cargarVista(nv.id);
    }
    guardar();
    render();
  });
}

// ---------- Vista: empresas ----------

const urlWeb = (w) => (/^https?:\/\//.test(w) ? w : `https://${w}`);
const enlaceWeb = (w) => `<a href="${esc(urlWeb(w))}" target="_blank" rel="noopener">${esc(w.replace(/^https?:\/\//, ''))}</a>`;

function vistaEmpresas() {
  app.innerHTML = `
    <div class="page-head">
      <h1>Empresas <span class="h1-count">${db.companies.length}</span></h1>
      <button class="btn primary" data-action="nueva-empresa">+ Nueva empresa</button>
    </div>
    <div class="toolbar filtros-bar">
      <input type="search" id="e-q" class="grow" placeholder="Buscar empresa, sector o ciudad…" value="${esc(ui.empresasQ)}">
      ${propVisible(propEmpresa('estadoLead')) ? `
        <select id="e-estado" class="filtro ${ui.empresasEstado ? 'on' : ''}" title="Estado lead">
          <option value="">Estado lead: todos</option>
          <option value="ninguno" ${ui.empresasEstado === 'ninguno' ? 'selected' : ''}>Sin estado lead</option>
          ${opciones(ESTADOS_LEAD, ui.empresasEstado)}
        </select>` : ''}
    </div>
    <div id="tabla-empresas"></div>`;
  $('#e-q').addEventListener('input', (e) => { ui.empresasQ = e.target.value; renderTablaEmpresas(); });
  $('#e-estado')?.addEventListener('change', (e) => { ui.empresasEstado = e.target.value; vistaEmpresas(); });
  renderTablaEmpresas();
}

// Columnas de la tabla de empresas: solo las propiedades que están activadas en Ajustes.
const COLUMNAS_EMPRESA = ['estadoLead', 'sector', 'ciudad', 'web'];

function renderTablaEmpresas() {
  const cont = $('#tabla-empresas');
  if (!db.companies.length) {
    cont.innerHTML = `
      <div class="empty card">
        <p><strong>Aún no hay empresas.</strong></p>
        <p class="muted">Se crean solas al poner la empresa de un contacto, o puedes añadirlas aquí.</p>
        <button class="btn primary" data-action="nueva-empresa">+ Nueva empresa</button>
      </div>`;
    return;
  }
  const q = ui.empresasQ.trim().toLowerCase();
  const fe = ui.empresasEstado;
  const lista = empresasOrdenadas()
    .filter((e) => !fe || (fe === 'ninguno' ? !e.estadoLead : e.estadoLead === fe))
    .filter((e) => !q || [e.nombre, e.sector, e.ciudad, e.web].some((v) => (v || '').toLowerCase().includes(q)));
  if (!lista.length) {
    cont.innerHTML = '<div class="empty card"><p class="muted">Ninguna empresa coincide.</p></div>';
    return;
  }
  const columnas = COLUMNAS_EMPRESA.map(propEmpresa).filter(propVisible);
  cont.innerHTML = `
    <div class="card table-wrap">
      <table class="tabla">
        <thead><tr><th>Empresa</th><th>Contactos</th>${columnas.map((p) => `<th class="${p.id === 'web' ? 'col-nota' : ''}">${esc(p.label)}</th>`).join('')}</tr></thead>
        <tbody>
          ${lista.map((e) => {
            const cs = contactosDeEmpresa(e.id);
            return `
              <tr data-action="abrir-empresa" data-id="${e.id}">
                <td><div class="persona centrado"><span class="avatar sm cuadrado">${ico('empresa')}</span><strong>${esc(e.nombre)}</strong></div></td>
                <td class="small">${cs.length ? `${cs.length} <span class="muted">· ${esc(cs.slice(0, 2).map((c) => c.nombre).join(', '))}${cs.length > 2 ? '…' : ''}</span>` : '<span class="muted">0</span>'}</td>
                ${columnas.map((p) => `<td class="small ${p.id === 'web' ? 'col-nota' : ''}">${textoProp(e, p) || '<span class="muted">—</span>'}${p.id === 'estadoLead' && nurturingDe(e) ? `<div class="muted">${esc(nurturingDe(e))}</div>` : ''}</td>`).join('')}
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function vistaEmpresa(id) {
  const e = empresa(id);
  const cs = contactosDeEmpresa(id).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const dato = (label, valor) => (valor ? `<dt>${esc(label)}</dt><dd>${valor}</dd>` : '');
  const datos = [
    ...propsVisibles().filter((p) => !p.nurturing || esNurturing(e.estadoLead)).map((p) => dato(p.label, textoProp(e, p))),
    dato('Alta', fmtFecha(e.creado)),
  ].join('');
  app.innerHTML = `
    <a href="#/empresas" class="back">← Empresas</a>
    <div class="empresa-grid">
      <aside class="card tarjeta-contacto">
        <div class="tc-cabecera">
          <span class="avatar lg cuadrado">${ico('empresa')}</span>
          <div class="grow">
            <h1>${esc(e.nombre)}</h1>
            <p class="muted small">${esc([e.sector, e.ciudad].filter(Boolean).join(' · ')) || '&nbsp;'}</p>
          </div>
          <span class="td-pop-wrap">
            <button type="button" class="icon-btn" data-td-pop aria-haspopup="true" title="Más opciones">${ico('puntos')}</button>
            <div class="td-pop pop-derecha" hidden>
              <button type="button" data-action="editar-empresa" data-id="${e.id}">${ico('editar')} Editar empresa</button>
              <button type="button" class="pop-peligro" data-action="borrar-empresa" data-id="${e.id}">${ico('papelera')} Eliminar empresa</button>
            </div>
          </span>
        </div>
        ${datos ? `<dl class="tc-datos">${datos}</dl>` : ''}
        ${e.notas ? `<div class="md small empresa-notas">${markdown(e.notas)}</div>` : ''}
      </aside>

      <section class="empresa-contactos">
        <div class="col-titulo">
          <h2>Contactos <span class="count">${cs.length}</span></h2>
          <div class="row">
            <button class="btn sm primary" data-action="nuevo-contacto-empresa" data-id="${e.id}">+ Añadir contacto</button>
          </div>
        </div>
        ${cs.length ? `
          <div class="card table-wrap">
            <table class="tabla">
              <thead><tr><th>Contacto</th><th>Propietario</th><th>Estado</th><th>Próxima tarea</th></tr></thead>
              <tbody>
                ${cs.map((c) => `
                  <tr data-action="abrir-contacto" data-id="${c.id}">
                    <td><div class="persona"><span class="avatar sm">${esc(iniciales(c.nombre))}</span><div><strong>${esc(c.nombre)}</strong><div class="muted small">${esc(c.cargo)}</div></div></div></td>
                    <td class="small">${propietarioHTML(c)}</td>
                    <td>${selectEstado(c)}</td>
                    <td class="small">${proximaTareaHTML(c)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty card"><p class="muted">Esta empresa todavía no tiene contactos.</p></div>'}
      </section>
    </div>`;
}

function modalEmpresa(e) {
  const nueva = !e;
  const v = e || {};
  const editables = propsVisibles().filter((p) => !p.soloLectura);
  const campoProp = (p) => campo(esc(p.label), inputProp(p, valorProp(v, p)), p.tipo === 'textoLargo' ? 'ancho' : '');
  abrirModal(nueva ? 'Nueva empresa' : 'Editar empresa', `
    ${campo('Nombre *', `<input name="nombre" required value="${esc(v.nombre)}">`)}
    <div class="row2 props-grid">
      ${editables.filter((p) => !p.nurturing).map(campoProp).join('')}
    </div>
    ${editables.some((p) => p.nurturing) ? `
      <fieldset class="nurturing-campos" ${esNurturing(v.estadoLead) ? '' : 'hidden'}>
        <legend>♻ Nurturing</legend>
        <div class="row2 props-grid">${editables.filter((p) => p.nurturing).map(campoProp).join('')}</div>
      </fieldset>` : ''}
    <div class="field"><span>Notas</span>${editorHTML('notas', v.notas || '', 4, 'Lo que sepas de la empresa: sedes, tamaño, quién decide…')}</div>
  `, (d) => {
    const nombre = d.nombre.trim();
    if (!nombre) return false;
    const otra = db.companies.find((x) => x !== e && x.nombre.toLowerCase() === nombre.toLowerCase());
    if (otra) {
      alert(`Ya existe la empresa «${otra.nombre}».`);
      return false;
    }
    // Las propiedades ocultas en Ajustes no se tocan: conservan el valor que tuvieran.
    const datos = { nombre, notas: d.notas.trim() };
    const extra = { ...(v.extra || {}) };
    editables.forEach((p) => {
      const valor = String(d[`p-${p.id}`] ?? '').trim();
      if (p.extra) extra[p.id] = valor;
      else datos[p.id] = valor;
    });
    datos.extra = extra;
    if (nueva) {
      const ne = { id: uid(), creado: ahora(), ...datos };
      db.companies.push(ne);
      guardar();
      location.hash = '#/empresa/' + ne.id;
    } else {
      Object.assign(e, datos);
      guardar();
      render();
    }
  });
  // Las propiedades de nurturing aparecen al poner la empresa en nurturing (como en HubSpot).
  $('[name="p-estadoLead"]', modal)?.addEventListener('change', (ev) => {
    const caja = $('.nurturing-campos', modal);
    if (caja) caja.hidden = !esNurturing(ev.target.value);
  });
}

// ---------- Vista: equipo (a quién se pueden asignar contactos) ----------

function vistaEquipo() {
  app.innerHTML = `
    <div class="estrecho">
      <div class="page-head">
        <div>
          <h1>Equipo</h1>
          <p class="muted">Las personas a las que se pueden asignar contactos. De momento solo tú tienes acceso al CRM.</p>
        </div>
        <button class="btn primary" data-action="nuevo-usuario">+ Añadir persona</button>
      </div>
      <div class="card">
        ${db.users.map((u) => {
          const n = db.contacts.filter((c) => c.ownerId === u.id).length;
          return `
            <div class="equipo-fila">
              <span class="avatar sm">${esc(iniciales(u.nombre))}</span>
              <div class="grow">
                <strong>${esc(u.nombre)}</strong>${u.id === YO ? ' <span class="muted small">(tú)</span>' : ''}
                <div class="muted small">${esc(u.email) || 'Sin email'}</div>
              </div>
              <button class="link-btn small" data-action="ver-contactos-de" data-id="${u.id}">${n} contacto${n === 1 ? '' : 's'}</button>
              <button class="icon-btn" data-action="editar-usuario" data-id="${u.id}" title="Editar">${ico('editar')}</button>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function modalUsuario(u) {
  abrirModal(u ? 'Editar persona' : 'Añadir persona', `
    ${campo('Nombre *', `<input name="nombre" required value="${esc(u?.nombre)}">`)}
    ${campo('Email', `<input type="email" name="email" value="${esc(u?.email)}" placeholder="nombre@diga.io">`)}
  `, (d) => {
    const nombre = d.nombre.trim();
    if (!nombre) return false;
    if (u) Object.assign(u, { nombre, email: d.email.trim() });
    else db.users.push({ id: uid(), nombre, email: d.email.trim(), creado: ahora() });
    guardar();
    render();
  });
  if (u && u.id !== YO) {
    botonBorrarModal(() => {
      const n = db.contacts.filter((c) => c.ownerId === u.id).length;
      if (!confirm(`¿Quitar a ${u.nombre} del equipo?${n ? ` Sus ${n} contactos se quedarán sin propietario.` : ''}`)) return false;
      db.contacts.forEach((c) => { if (c.ownerId === u.id) c.ownerId = null; });
      db.users = db.users.filter((x) => x.id !== u.id);
      guardar();
      render();
    });
  }
}

// ---------- Secuencias (como las de HubSpot): pasos que se van convirtiendo en tareas ----------

const textoEspera = (p, i) => {
  const dias = +p.espera || 0;
  const n = `${dias} día${dias === 1 ? '' : 's'}`;
  if (i === 0) return dias ? `${n} después de inscribir` : 'Al inscribir';
  return dias ? `${n} después del paso anterior` : 'Justo después del paso anterior';
};

// "Llamar a {nombre} de {empresa}" → con los datos del contacto.
const rellenarPlantilla = (texto, c) =>
  (texto || '').replace(/\{nombre\}/gi, c.nombre.split(/\s+/)[0]).replace(/\{empresa\}/gi, empresaDe(c)).replace(/\s{2,}/g, ' ').trim();

// Crea la tarea del paso `i` de una inscripción: fecha `base` + los días de espera del paso.
function crearTareaPaso(ins, i, base) {
  const p = secuencia(ins.sequenceId).pasos[i];
  const c = contacto(ins.contactId);
  const t = {
    id: uid(),
    titulo: rellenarPlantilla(p.titulo, c) || `${tipoAccionDe(p.tipo).label} · ${c.nombre}`,
    detalle: rellenarPlantilla(p.detalle, c),
    contactId: c.id,
    accion: p.tipo,
    fecha: sumarDias(base, +p.espera || 0),
    hora: null,
    prioridad: p.prioridad || 'ninguna',
    hecha: false,
    completada: null,
    creado: ahora(),
    enrollmentId: ins.id,
    paso: i,
  };
  db.tasks.push(t);
  ins.paso = i;
  ins.tareaId = t.id;
  return t;
}

// Inscribe contactos en una secuencia. Cada contacto solo puede estar en una secuencia activa a la vez.
function inscribir(s, contactos, inicio = hoy()) {
  const libres = contactos.filter((c) => !inscripcionActiva(c.id));
  libres.forEach((c) => {
    const ins = { id: uid(), sequenceId: s.id, contactId: c.id, paso: 0, estado: 'activa', tareaId: null, inicio: ahora(), fin: null };
    db.enrollments.push(ins);
    crearTareaPaso(ins, 0, inicio);
    tocar(c.id);
  });
  const n = libres.length;
  const saltados = contactos.length - n;
  avisar(`${n} contacto${n === 1 ? '' : 's'} inscrito${n === 1 ? '' : 's'} en «${s.nombre}»${saltados ? ` · ${saltados} ya estaba${saltados === 1 ? '' : 'n'} en una secuencia` : ''}`);
}

// Al completar la tarea de un paso se crea la del siguiente; tras el último, la secuencia termina.
function avanzarSecuencia(t) {
  const ins = inscripcion(t.enrollmentId);
  const s = ins && secuencia(ins.sequenceId);
  if (!s || ins.estado !== 'activa' || ins.tareaId !== t.id) return;
  if (t.paso + 1 < s.pasos.length) t.siguienteId = crearTareaPaso(ins, t.paso + 1, hoy()).id;
  else Object.assign(ins, { estado: 'terminada', fin: ahora() });
}

// Deshacer: la tarea vuelve a estar pendiente y se quita la del paso siguiente si aún no se ha hecho.
function retrocederSecuencia(t) {
  const ins = inscripcion(t.enrollmentId);
  if (!ins || ins.estado === 'cancelada') return;
  const sig = t.siguienteId && tarea(t.siguienteId);
  if (sig?.hecha) return;
  if (sig) db.tasks = db.tasks.filter((x) => x.id !== sig.id);
  delete t.siguienteId;
  Object.assign(ins, { estado: 'activa', paso: t.paso, tareaId: t.id, fin: null });
}

function sacarDeSecuencia(ins) {
  Object.assign(ins, { estado: 'cancelada', fin: ahora() });
  const t = tarea(ins.tareaId);
  if (t && !t.hecha) db.tasks = db.tasks.filter((x) => x.id !== t.id);
  tocar(ins.contactId);
}

const avisoSecuencia = (t) => {
  const ins = t.enrollmentId && inscripcion(t.enrollmentId);
  return ins && ins.estado === 'activa' && ins.tareaId === t.id ? `\n\nEs el paso actual de la secuencia «${secuencia(ins.sequenceId)?.nombre}»: el contacto saldrá de ella.` : '';
};

// Borrar a mano la tarea actual de una secuencia saca al contacto de ella (si no, se quedaría atascado).
function borrarTarea(t) {
  db.tasks = db.tasks.filter((x) => x.id !== t.id);
  const ins = t.enrollmentId && inscripcion(t.enrollmentId);
  if (ins && ins.estado === 'activa' && ins.tareaId === t.id) Object.assign(ins, { estado: 'cancelada', fin: ahora() });
}

function vistaSecuencias() {
  app.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Secuencias <span class="h1-count">${db.sequences.length}</span></h1>
        <p class="muted">Pasos (llamar, email, WhatsApp…) separados por días. Al inscribir a un contacto se crea la tarea del primer paso; al completarla, la del siguiente.</p>
      </div>
      <button class="btn primary" data-action="nueva-secuencia">+ Nueva secuencia</button>
    </div>
    ${db.sequences.length ? `
      <div class="card table-wrap">
        <table class="tabla">
          <thead><tr><th>Secuencia</th><th>Pasos</th><th>Activos</th><th>Terminados</th><th>Sacados</th></tr></thead>
          <tbody>
            ${db.sequences.map((s) => {
              const ins = db.enrollments.filter((e) => e.sequenceId === s.id);
              const n = (estado) => ins.filter((e) => e.estado === estado).length;
              const dias = s.pasos.reduce((a, p) => a + (+p.espera || 0), 0);
              return `
                <tr data-action="abrir-secuencia" data-id="${s.id}">
                  <td><strong>${esc(s.nombre)}</strong>${s.descripcion ? `<div class="muted small">${esc(s.descripcion)}</div>` : ''}</td>
                  <td class="small">${s.pasos.length} paso${s.pasos.length === 1 ? '' : 's'}${s.pasos.length ? ` <span class="muted">· ${dias + 1} día${dias ? 's' : ''}</span>` : ''}</td>
                  <td>${n('activa')}</td>
                  <td>${n('terminada')}</td>
                  <td class="muted">${n('cancelada')}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="empty card">
        <p><strong>Aún no hay secuencias.</strong></p>
        <p class="muted">Por ejemplo, «Primer contacto»: llamar el día 1, email el día 3 y WhatsApp el día 7.</p>
        <button class="btn primary" data-action="nueva-secuencia">+ Nueva secuencia</button>
      </div>`}`;
}

const ORDEN_INSCRIPCION = { activa: 0, terminada: 1, cancelada: 2 };

function vistaSecuenciaDetalle(id) {
  const s = secuencia(id);
  const ins = db.enrollments.filter((e) => e.sequenceId === id && contacto(e.contactId))
    .sort((a, b) => ORDEN_INSCRIPCION[a.estado] - ORDEN_INSCRIPCION[b.estado] || (b.inicio || '').localeCompare(a.inicio || ''));
  const activos = ins.filter((e) => e.estado === 'activa').length;
  let dia = 1;

  app.innerHTML = `
    <a href="#/secuencias" class="back">← Secuencias</a>
    <div class="page-head">
      <div>
        <h1>${esc(s.nombre)}</h1>
        ${s.descripcion ? `<p class="muted">${esc(s.descripcion)}</p>` : ''}
      </div>
      <div class="row">
        <span class="td-pop-wrap">
          <button type="button" class="icon-btn" data-td-pop aria-haspopup="true" title="Más opciones">${ico('puntos')}</button>
          <div class="td-pop pop-derecha" hidden>
            <button type="button" data-action="editar-secuencia" data-id="${s.id}">${ico('editar')} Editar nombre</button>
            <button type="button" class="pop-peligro" data-action="borrar-secuencia" data-id="${s.id}">${ico('papelera')} Eliminar secuencia</button>
          </div>
        </span>
        <button class="btn primary" data-action="inscribir-en" data-id="${s.id}" ${s.pasos.length ? '' : 'disabled title="Añade al menos un paso"'}>+ Inscribir contactos</button>
      </div>
    </div>

    <div class="seq-grid">
      <section>
        <div class="col-titulo"><h2>Pasos <span class="count">${s.pasos.length}</span></h2></div>
        <div class="seq-pasos">
          ${s.pasos.map((p, i) => {
            dia += +p.espera || 0;
            const ta = tipoAccionDe(p.tipo);
            return `
              ${i > 0 || p.espera ? `<div class="seq-espera">${ico('reloj')} ${textoEspera(p, i)}</div>` : ''}
              <div class="card seq-paso">
                <span class="tl-punto">${ico(ta.icon)}</span>
                <div class="grow seq-paso-cuerpo" data-action="editar-paso" data-id="${s.id}" data-i="${i}">
                  <div class="small muted">Paso ${i + 1} · Día ${dia} · ${ta.label}</div>
                  <strong>${esc(p.titulo) || `${ta.label} · {nombre}`}</strong>
                  ${p.detalle ? `<div class="small muted">${esc(p.detalle)}</div>` : ''}
                </div>
                <div class="seq-paso-botones">
                  <button class="icon-btn" data-action="mover-paso" data-id="${s.id}" data-i="${i}" data-d="-1" title="Subir" ${i === 0 ? 'disabled' : ''}>${ico('subir')}</button>
                  <button class="icon-btn" data-action="mover-paso" data-id="${s.id}" data-i="${i}" data-d="1" title="Bajar" ${i === s.pasos.length - 1 ? 'disabled' : ''}>${ico('bajar')}</button>
                </div>
              </div>`;
          }).join('')}
          <button class="td-anadir" data-action="nuevo-paso" data-id="${s.id}"><span class="td-mas">+</span> Añadir paso</button>
        </div>
        <p class="muted small">En el título y las instrucciones puedes escribir <b>{nombre}</b> y <b>{empresa}</b>: se cambian por los del contacto.</p>
      </section>

      <section>
        <div class="col-titulo"><h2>Inscritos <span class="count">${activos} activo${activos === 1 ? '' : 's'}</span></h2></div>
        ${ins.length ? `
          <div class="card table-wrap">
            <table class="tabla">
              <thead><tr><th>Contacto</th><th>Progreso</th><th>Tarea actual</th><th></th></tr></thead>
              <tbody>
                ${ins.map((e) => {
                  const c = contacto(e.contactId);
                  const t = e.estado === 'activa' && tarea(e.tareaId);
                  const hechos = e.estado === 'terminada' ? s.pasos.length : e.paso;
                  const progreso = e.estado === 'activa' ? `Paso ${e.paso + 1} de ${s.pasos.length}`
                    : e.estado === 'terminada' ? '<span class="txt-ok">Terminada</span>' : '<span class="muted">Sacado</span>';
                  return `
                    <tr data-action="abrir-contacto" data-id="${c.id}">
                      <td><strong>${esc(c.nombre)}</strong><div class="muted small">${esc(empresaDe(c))}</div></td>
                      <td class="small">${progreso}<div class="seq-progreso"><i style="width:${(hechos / Math.max(1, s.pasos.length)) * 100}%"></i></div></td>
                      <td class="small">${t ? `<div class="${t.fecha && t.fecha < hoy() ? 'txt-danger' : ''}">${t.fecha ? fmtRelativa(t.fecha) : 'Sin fecha'}</div><div class="muted truncate">${esc(t.titulo)}</div>` : '<span class="muted">—</span>'}</td>
                      <td>${e.estado === 'activa' ? `<button class="btn sm" data-action="sacar-secuencia" data-id="${e.id}">Sacar</button>` : ''}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty card"><p class="muted">Nadie inscrito todavía. Inscribe contactos desde aquí o seleccionándolos en la tabla de Contactos.</p></div>'}
      </section>
    </div>`;
}

function modalSecuencia(s) {
  abrirModal(s ? 'Editar secuencia' : 'Nueva secuencia', `
    ${campo('Nombre *', `<input name="nombre" required value="${esc(s?.nombre)}" placeholder="Ej. Primer contacto">`)}
    ${campo('Descripción', `<input name="descripcion" value="${esc(s?.descripcion)}" placeholder="Para qué es (opcional)">`)}
  `, (d) => {
    const nombre = d.nombre.trim();
    if (!nombre) return false;
    if (s) {
      Object.assign(s, { nombre, descripcion: d.descripcion.trim() });
      guardar();
      render();
    } else {
      const ns = { id: uid(), nombre, descripcion: d.descripcion.trim(), pasos: [], creado: ahora() };
      db.sequences.push(ns);
      guardar();
      location.hash = '#/secuencias/' + ns.id;
    }
  });
}

// Añadir un paso (i = null) o editar el paso i.
function modalPaso(s, i = null) {
  const nuevo = i === null;
  const p = nuevo ? { tipo: 'llamada', titulo: '', detalle: '', espera: s.pasos.length ? 2 : 0, prioridad: 'ninguna' } : s.pasos[i];
  const primero = (nuevo ? s.pasos.length : i) === 0;
  abrirModal(nuevo ? 'Nuevo paso' : `Paso ${i + 1}`, `
    <div class="row3">
      ${campo('Tipo', `<select name="tipo">${opciones(TIPOS_ACCION.filter((t) => TIPOS_PASO.includes(t.id)), p.tipo)}</select>`)}
      ${campo(primero ? 'Días tras inscribir' : 'Días tras el paso anterior', `<input type="number" name="espera" min="0" max="365" value="${+p.espera || 0}">`)}
      ${campo('Prioridad', `<select name="prioridad">${opciones(PRIORIDADES, p.prioridad || 'ninguna')}</select>`)}
    </div>
    ${campo('Título de la tarea', `<input name="titulo" value="${esc(p.titulo)}" placeholder="Ej. Llamar a {nombre} para presentar Diga">`)}
    ${campo('Instrucciones', `<input name="detalle" value="${esc(p.detalle)}" placeholder="Ej. Preguntar cuántas llamadas reciben al día">`)}
  `, (d) => {
    const datos = { tipo: d.tipo, espera: Math.max(0, Math.round(+d.espera || 0)), prioridad: d.prioridad, titulo: d.titulo.trim(), detalle: d.detalle.trim() };
    if (nuevo) s.pasos.push({ id: uid(), ...datos });
    else Object.assign(s.pasos[i], datos);
    guardar();
    render();
  });
  if (!nuevo) {
    botonBorrarModal(() => {
      const enUso = db.enrollments.some((e) => e.sequenceId === s.id && e.estado === 'activa' && e.paso === i);
      if (!confirm(`¿Eliminar el paso ${i + 1}?${enUso ? ' Hay contactos en este paso: su tarea actual se mantiene.' : ''}`)) return false;
      s.pasos.splice(i, 1);
      guardar();
      render();
    });
  }
}

// Elegir la secuencia en la que inscribir unos contactos (acción masiva, ficha o empresa).
function modalInscribir(contactos, alTerminar = () => {}) {
  const conPasos = db.sequences.filter((s) => s.pasos.length);
  if (!conPasos.length) {
    avisar(db.sequences.length ? 'Añade pasos a una secuencia para poder inscribir contactos' : 'Primero crea una secuencia');
    location.hash = '#/secuencias';
    return;
  }
  const yaEn = contactos.filter((c) => inscripcionActiva(c.id)).length;
  const titulo = contactos.length === 1 ? `Inscribir a ${contactos[0].nombre}` : `Inscribir ${contactos.length} contactos`;
  abrirModal(titulo, `
    ${campo('Secuencia', `<select name="sequenceId">${conPasos.map((s) => `<option value="${s.id}">${esc(s.nombre)} · ${s.pasos.length} paso${s.pasos.length === 1 ? '' : 's'}</option>`).join('')}</select>`)}
    ${campo('Empezar', campoFecha('inicio', hoy()))}
    ${yaEn ? `<p class="muted small">${yaEn === contactos.length && yaEn === 1 ? 'Ya está' : `${yaEn} ya está${yaEn === 1 ? '' : 'n'}`} en una secuencia activa: no se inscribirá${yaEn === 1 ? '' : 'n'} otra vez.</p>` : ''}
  `, (d) => {
    const s = secuencia(d.sequenceId);
    if (!s) return false;
    inscribir(s, contactos, d.inicio || hoy());
    alTerminar();
    guardar();
    render();
  });
}

// Elegir contactos desde la página de la secuencia.
function modalElegirContactos(s) {
  const libres = contactosOrdenados().filter((c) => !inscripcionActiva(c.id));
  abrirModal(`Inscribir en «${s.nombre}»`, `
    <input type="search" class="buscar-modal" placeholder="Buscar contacto o empresa…">
    <div class="elegir-lista">
      ${libres.map((c) => `
        <label class="elegir-fila" data-texto="${esc(`${c.nombre} ${empresaDe(c)}`.toLowerCase())}">
          <input type="checkbox" name="c-${c.id}">
          <span class="grow"><strong>${esc(c.nombre)}</strong> <span class="muted small">${esc(empresaDe(c))}</span></span>
          <span class="muted small">${estadoDe(c.estado).label}</span>
        </label>`).join('') || '<p class="muted">Todos los contactos están ya en alguna secuencia activa.</p>'}
    </div>
    ${campo('Empezar', campoFecha('inicio', hoy()))}
  `, (d) => {
    const elegidos = libres.filter((c) => d[`c-${c.id}`]);
    if (!elegidos.length) return false;
    inscribir(s, elegidos, d.inicio || hoy());
    guardar();
    render();
  });
  $('.buscar-modal', modal).addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    modal.querySelectorAll('.elegir-fila').forEach((f) => (f.hidden = !!q && !f.dataset.texto.includes(q)));
  });
}

// Elegir un valor (propietario o estado) para todos los contactos seleccionados.
function modalMasivo(titulo, campoHTML, aplicar) {
  const lista = seleccionados();
  abrirModal(`${titulo} · ${lista.length} contacto${lista.length === 1 ? '' : 's'}`, campoHTML, (d) => {
    lista.forEach((c) => {
      cambiarContacto(c, () => aplicar(c, d));
      c.actualizado = ahora();
    });
    ui.seleccion.clear();
    guardar();
    render();
    avisar(`${lista.length} contacto${lista.length === 1 ? '' : 's'} actualizado${lista.length === 1 ? '' : 's'}`);
  });
}

// ---------- Vista: tareas (como Todoist) ----------

const VISTAS_TAREAS = [
  { id: 'bandeja', label: 'Todas', icono: 'bandeja' },
  { id: 'hoy', label: 'Hoy', icono: 'calendario' },
  { id: 'proximo', label: 'Próximo', icono: 'flecha' },
  { id: 'generales', label: 'Generales', icono: 'lista' },
  { id: 'completadas', label: 'Completadas', icono: 'check' },
];

// Vistas propias de Tareas (db.taskViews): una pestaña más con los filtros que se quieran.
const FILTROS_TAREA_VACIOS = { cuando: '', accion: '', prioridad: '', contacto: '', estado: '', estadoLead: '', ownerId: '', secuencia: '', lista: '', q: '' };
const CUANDO_TAREA = [
  { id: '', label: 'Cualquier fecha' },
  { id: 'vencidas', label: 'Vencidas' },
  { id: 'hoy', label: 'Hoy y vencidas' },
  { id: 'solo-hoy', label: 'Solo hoy' },
  { id: 'manana', label: 'Mañana' },
  { id: 'semana', label: 'Próximos 7 días' },
  { id: 'futuras', label: 'A partir de mañana' },
  { id: 'con-fecha', label: 'Con fecha' },
  { id: 'sin', label: 'Sin fecha' },
];

const vistaTareaPropia = (id = ui.tareasVista) => db.taskViews.find((v) => v.id === id);

function cumpleFiltroTarea(t, f) {
  const h = hoy();
  const c = contacto(t.contactId);
  const enRango = {
    vencidas: t.fecha && t.fecha < h,
    hoy: t.fecha && t.fecha <= h,
    'solo-hoy': t.fecha === h,
    manana: t.fecha === sumarDias(h, 1),
    semana: t.fecha && t.fecha >= h && t.fecha <= sumarDias(h, 6),
    futuras: t.fecha && t.fecha > h,
    'con-fecha': !!t.fecha,
    sin: !t.fecha,
  };
  if (f.cuando && !enRango[f.cuando]) return false;
  if (f.accion && (f.accion === 'interna' ? t.accion : t.accion !== f.accion)) return false;
  if (f.prioridad && (t.prioridad || 'ninguna') !== f.prioridad) return false;
  if (f.contacto && (f.contacto === 'con' ? !c : c)) return false;
  if (f.estado && c?.estado !== f.estado) return false;
  if (f.estadoLead && (empresa(c?.companyId)?.estadoLead || '') !== f.estadoLead) return false;
  if (f.ownerId && (f.ownerId === 'ninguno' ? c?.ownerId : c?.ownerId !== f.ownerId)) return false;
  if (f.secuencia) {
    const s = t.enrollmentId && inscripcion(t.enrollmentId)?.sequenceId;
    if (f.secuencia === 'alguna' ? !s : f.secuencia === 'ninguna' ? s : s !== f.secuencia) return false;
  }
  if (f.lista && (c || (t.lista || 'General') !== f.lista)) return false;
  if (f.q && !coincideTarea(t, f.q.trim().toLowerCase())) return false;
  return true;
}

// "Llamadas · Prioridad 1 · Contactos en Negociación…" para recordar qué filtra la vista.
function resumenFiltrosTarea(f) {
  const s = (lista, id) => lista.find((x) => x.id === id)?.label;
  return [
    f.cuando && s(CUANDO_TAREA, f.cuando),
    f.accion && (f.accion === 'interna' ? 'Tareas internas' : tipoAccionDe(f.accion).label),
    f.prioridad && s(PRIORIDADES, f.prioridad),
    f.contacto && (f.contacto === 'con' ? 'Con contacto' : 'Sin contacto'),
    f.estado && `Contacto: ${estadoDe(f.estado).label}`,
    f.estadoLead && `Empresa: ${estadoLeadDe(f.estadoLead)?.label || f.estadoLead}`,
    f.ownerId && `Propietario: ${f.ownerId === 'ninguno' ? 'sin propietario' : nombreUsuario(f.ownerId)}`,
    f.secuencia && (f.secuencia === 'alguna' ? 'De una secuencia' : f.secuencia === 'ninguna' ? 'Fuera de secuencias' : `Secuencia «${secuencia(f.secuencia)?.nombre || '?'}»`),
    f.lista && `Lista #${f.lista}`,
    f.q && `«${f.q}»`,
  ].filter(Boolean).map(esc).join(' · ') || 'Sin filtros: todas las tareas pendientes';
}

function modalVistaTareas(v) {
  const f = { ...FILTROS_TAREA_VACIOS, ...v?.filtros };
  const sel = (nombre, label, opcionesHTML) => campo(label, `<select name="${nombre}">${opcionesHTML}</select>`);
  const op = (id, label, actual) => `<option value="${esc(id)}" ${id === actual ? 'selected' : ''}>${esc(label)}</option>`;
  abrirModal(v ? 'Editar vista de tareas' : 'Nueva vista de tareas', `
    ${campo('Nombre de la vista *', `<input name="nombre" required value="${esc(v?.nombre)}" placeholder="Ej. Llamadas a clínicas en negociación">`)}
    <p class="muted small">Elige solo los filtros que quieras; los que dejes en «todas» no filtran.</p>
    <div class="row2">
      ${sel('cuando', 'Fecha', opciones(CUANDO_TAREA, f.cuando))}
      ${sel('accion', 'Tipo', op('', 'Todos', f.accion) + op('interna', 'Tarea interna', f.accion) + opciones(TIPOS_ACCION, f.accion))}
      ${sel('prioridad', 'Prioridad', op('', 'Todas', f.prioridad) + opciones(PRIORIDADES, f.prioridad))}
      ${sel('contacto', 'Contacto', op('', 'Con o sin contacto', f.contacto) + op('con', 'Solo con contacto', f.contacto) + op('sin', 'Solo sin contacto', f.contacto))}
      ${sel('estado', 'Estado del contacto', op('', 'Todos', f.estado) + opciones(ESTADOS, f.estado))}
      ${sel('estadoLead', 'Estado lead de la empresa', op('', 'Todos', f.estadoLead) + opciones(ESTADOS_LEAD, f.estadoLead))}
      ${sel('ownerId', 'Propietario del contacto', op('', 'Todos', f.ownerId) + op('ninguno', 'Sin propietario', f.ownerId) + db.users.map((u) => op(u.id, nombreUsuario(u.id), f.ownerId)).join(''))}
      ${sel('secuencia', 'Secuencia', op('', 'Todas', f.secuencia) + op('alguna', 'De alguna secuencia', f.secuencia) + op('ninguna', 'De ninguna secuencia', f.secuencia) + db.sequences.map((s) => op(s.id, s.nombre, f.secuencia)).join(''))}
      ${sel('lista', 'Lista (tareas sin contacto)', op('', 'Todas', f.lista) + ['General', ...listasDeTareas()].map((l) => op(l, `# ${l}`, f.lista)).join(''))}
      ${campo('Texto', `<input name="q" value="${esc(f.q)}" placeholder="En el título, contacto o empresa">`)}
    </div>
  `, (d) => {
    const nombre = d.nombre.trim();
    if (!nombre) return false;
    const filtros = Object.fromEntries(Object.keys(FILTROS_TAREA_VACIOS).map((k) => [k, String(d[k] || '').trim()]));
    if (v) Object.assign(v, { nombre, filtros });
    else {
      const nv = { id: uid(), nombre, filtros, creado: ahora() };
      db.taskViews.push(nv);
      ui.tareasVista = nv.id;
    }
    guardar();
    render();
  });
  if (v) {
    botonBorrarModal(() => {
      if (!confirm(`¿Eliminar la vista «${v.nombre}»? Las tareas no se tocan.`)) return false;
      db.taskViews = db.taskViews.filter((x) => x.id !== v.id);
      ui.tareasVista = 'bandeja';
      guardar();
      render();
    });
  }
}

function vistaTareas() {
  const h = hoy();
  const pend = db.tasks.filter((t) => !t.hecha);
  const cuenta = {
    bandeja: pend.length,
    hoy: pend.filter((t) => t.fecha && t.fecha <= h).length,
    proximo: pend.filter((t) => t.fecha >= h && t.fecha <= sumarDias(h, 6)).length,
    generales: pend.filter((t) => !t.contactId).length,
    completadas: 0,
  };
  db.taskViews.forEach((v) => (cuenta[v.id] = pend.filter((t) => cumpleFiltroTarea(t, v.filtros)).length));
  const propia = vistaTareaPropia();
  const vista = propia ? { id: propia.id, label: propia.nombre } : VISTAS_TAREAS.find((v) => v.id === ui.tareasVista) || VISTAS_TAREAS[0];
  ui.tareasVista = vista.id;
  const tab = (v, label, icono) => `
    <button class="${v === vista.id ? 'active' : ''}" data-action="vista-tareas" data-vista="${v}">
      ${ico(icono)}${esc(label)}${cuenta[v] ? ` <small>${cuenta[v]}</small>` : ''}
    </button>`;

  app.innerHTML = `
    <div class="td">
      <div class="td-barra">
        <nav class="td-vistas">
          ${VISTAS_TAREAS.map((v) => tab(v.id, v.label, v.icono)).join('')}
          ${db.taskViews.map((v) => tab(v.id, v.nombre, 'filtro')).join('')}
          <button class="td-vista-nueva" data-action="nueva-vista-tareas" title="Crear una pestaña con los filtros que quieras">+ Vista</button>
        </nav>
        <input type="search" id="t-q" class="td-buscar" placeholder="Buscar tarea o contacto…" value="${esc(ui.tareasQ)}">
      </div>
      <div class="td-cabecera">
        <h1 class="td-h1">${esc(vista.label)}${propia ? ` <button class="icon-btn" data-action="editar-vista-tareas" data-id="${propia.id}" title="Editar filtros de la vista">${ico('editar')}</button>` : ''}</h1>
        ${vista.id !== 'completadas' && cuenta[vista.id] ? `<button class="btn primary" data-action="empezar-tareas" data-origen="tareas" title="Ir haciendo estas tareas una detrás de otra">${ico('play')} Empezar tareas</button>` : ''}
      </div>
      <p class="td-sub muted small">
        ${vista.id === 'completadas'
          ? `${db.tasks.filter((t) => t.hecha).length} completadas`
          : `✓ ${cuenta[vista.id]} ${cuenta[vista.id] === 1 ? 'tarea' : 'tareas'}`}
        ${vista.id === 'generales' ? '· Tareas que no son de ningún contacto, ordenadas en listas' : ''}
        ${propia ? `· ${ico('filtro')} ${resumenFiltrosTarea(propia.filtros)}` : ''}
        <span class="td-atajo">· Pulsa <kbd>Q</kbd> para añadir una tarea</span>
      </p>
      <div id="lista-tareas"></div>
    </div>`;

  $('#t-q').addEventListener('input', (e) => { ui.tareasQ = e.target.value; renderListaTareas(); });
  renderListaTareas();
}

// Día (en España) en que se completó una tarea.
const diaCompletada = (t) => {
  if (!t.completada) return '';
  const p = partesEn(ZONA, new Date(t.completada));
  return `${p.year}-${p.month}-${p.day}`;
};

function coincideTarea(t, q) {
  if (!q) return true;
  const c = contacto(t.contactId);
  const n = nota(t.noteId);
  return [t.titulo, t.detalle, c?.nombre, empresaDe(c), n?.titulo].some((v) => (v || '').toLowerCase().includes(q));
}

function renderListaTareas() {
  const cont = $('#lista-tareas');
  const q = ui.tareasQ.trim().toLowerCase();
  const h = hoy();
  const tareas = db.tasks.filter((t) => coincideTarea(t, q));
  const pend = tareas.filter((t) => !t.hecha);
  const grupos = [];

  if (ui.tareasVista === 'completadas') {
    const hechas = tareas.filter((t) => t.hecha).sort((a, b) => (b.completada || '').localeCompare(a.completada || ''));
    [...new Set(hechas.map(diaCompletada))].forEach((d) => grupos.push({
      clave: 'hecha-' + d, titulo: d ? tituloDia(d) : 'Sin fecha', items: hechas.filter((t) => diaCompletada(t) === d), sinAnadir: true,
    }));
    if (!grupos.length) {
      cont.innerHTML = `<div class="td-vacio"><p>${q ? 'Ninguna tarea completada coincide.' : 'Aún no has completado ninguna tarea.'}</p></div>`;
      return;
    }
  } else if (ui.tareasVista === 'generales') {
    // Tareas sin contacto, agrupadas por lista ("General" si no tienen).
    const generales = pend.filter((t) => !t.contactId);
    const listas = [...new Set([...generales.map((t) => t.lista || ''), ...ui.listasNuevas])]
      .sort((a, b) => (!a ? -1 : !b ? 1 : a.localeCompare(b, 'es')));
    if (!listas.includes('')) listas.unshift('');
    listas.forEach((l) => grupos.push({
      clave: 'lista-' + l, titulo: `<span class="td-almohadilla">#</span> ${esc(l || 'General')}`, lista: l, fecha: '',
      items: generales.filter((t) => (t.lista || '') === l).sort(ordenTareas),
    }));
  } else if (vistaTareaPropia()) {
    // Vista propia: solo las que cumplen sus filtros, por días y sin huecos (no se añaden tareas desde aquí,
    // porque una tarea nueva podría no cumplir los filtros y desaparecer).
    const items = pend.filter((t) => cumpleFiltroTarea(t, vistaTareaPropia().filtros)).sort(ordenTareas);
    const vencidas = items.filter((t) => t.fecha && t.fecha < h);
    if (vencidas.length) grupos.push({ clave: 'vencidas', titulo: 'Vencidas', clase: 'vencidas', items: vencidas, sinAnadir: true });
    [...new Set(items.filter((t) => t.fecha >= h).map((t) => t.fecha))].forEach((d) => grupos.push({
      clave: 'dia-' + d, titulo: tituloDia(d), items: items.filter((t) => t.fecha === d), sinAnadir: true,
    }));
    const sinFecha = items.filter((t) => !t.fecha);
    if (sinFecha.length) grupos.push({ clave: 'sin-fecha', titulo: 'Sin fecha', items: sinFecha, sinAnadir: true });
    if (!grupos.length) {
      cont.innerHTML = `<div class="td-vacio"><p>Ninguna tarea pendiente cumple los filtros de esta vista.</p></div>`;
      return;
    }
  } else {
    const vencidas = pend.filter((t) => t.fecha && t.fecha < h).sort(ordenTareas);
    if (vencidas.length) grupos.push({ clave: 'vencidas', titulo: 'Vencidas', clase: 'vencidas', items: vencidas, sinAnadir: true });
    let dias;
    if (ui.tareasVista === 'hoy') dias = [h];
    else if (ui.tareasVista === 'proximo') dias = Array.from({ length: 7 }, (_, i) => sumarDias(h, i));
    else dias = [...new Set([h, ...pend.filter((t) => t.fecha > h).map((t) => t.fecha)])].sort();
    dias.forEach((d) => grupos.push({
      clave: 'dia-' + d, titulo: tituloDia(d), fecha: d, items: pend.filter((t) => t.fecha === d).sort(ordenTareas),
    }));
    if (ui.tareasVista === 'bandeja') {
      grupos.push({ clave: 'sin-fecha', titulo: 'Sin fecha', fecha: '', items: pend.filter((t) => !t.fecha).sort(ordenTareas) });
    }
  }

  cont.innerHTML = grupos.map((g) => `
    <section class="td-grupo ${g.clase || ''}">
      <h2 class="td-grupo-titulo">
        <span>${g.titulo}</span>
        ${g.items.length ? `<span class="td-grupo-n">${g.items.length}</span>` : ''}
        ${g.clave === 'vencidas' ? '<button class="td-reprogramar" data-action="reprogramar-vencidas">Reprogramar a hoy</button>' : ''}
      </h2>
      <div class="td-lista">${g.items.map((t) => tareaHTML(t)).join('')}</div>
      ${g.sinAnadir ? '' : ui.editor?.clave === g.clave ? editorTareaHTML({ fecha: g.fecha, lista: g.lista }) : anadirTareaHTML(g.clave, g.fecha)}
    </section>`).join('') + (ui.tareasVista === 'generales' ? '<button class="td-anadir td-nueva-lista" data-action="nueva-lista"><span class="td-mas">+</span> Nueva lista</button>' : '');
  activarEditores(cont);
  activarTareas(cont);
}

function tareaHTML(t, mostrarContacto = true) {
  const c = t.contactId ? contacto(t.contactId) : null;
  const n = t.noteId ? nota(t.noteId) : null;
  const p = prioridadDe(t.prioridad);
  const ta = t.accion && tipoAccionDe(t.accion);
  const seq = t.enrollmentId && secuencia(inscripcion(t.enrollmentId)?.sequenceId);

  let cuando = '';
  if (t.fecha) cuando = `<span class="td-fecha ${t.hecha ? '' : claseFecha(t.fecha)}">${ICONO_CAL}${fmtCuando(t.fecha)}${t.hora ? ` ${conLocal(t.hora, t.fecha)}` : ''}</span>`;
  else if (t.hora) cuando = `<span class="td-fecha">${ico('reloj')} ${conLocal(t.hora)}</span>`;

  // La nota de un contacto se ve en su ficha; la de una tarea sin contacto, al abrir la tarea.
  let notaLink = '';
  if (n && n.contactId && !mostrarContacto) notaLink = `<button class="link-btn" data-action="ver-nota" data-id="${n.id}">${ico('nota')} Ver nota</button>`;
  else if (n && n.contactId) notaLink = `<a href="#/contacto/${n.contactId}">${ico('nota')} Tiene nota</a>`;
  else if (n) notaLink = `<span title="Ábrela para ver la nota">${ico('nota')} Nota</span>`;

  const meta = [
    cuando,
    notaLink,
    !t.hecha && REUNIONES.includes(t.accion)
      ? `<button class="td-cancelar-btn" data-action="cancelar-reunion" data-id="${t.id}" title="La reunión no se hizo: queda registrada como cancelada">${ico('cancelado')} Cancelada</button>` : '',
    seq ? `<a class="seq-pill" href="#/secuencias/${seq.id}" title="Paso ${t.paso + 1} de la secuencia «${esc(seq.nombre)}»">${ico('secuencia')} ${esc(seq.nombre)} · ${t.paso + 1}/${seq.pasos.length}</a>` : '',
    mostrarContacto && c ? `<a class="td-proyecto" href="#/contacto/${c.id}">${esc(c.nombre)}${empresaDe(c) ? ` · ${esc(empresaDe(c))}` : ''} <span>#</span></a>` : '',
    !c && t.lista && ui.tareasVista !== 'generales' ? `<span class="td-proyecto">${esc(t.lista)} <span>#</span></span>` : '',
  ].filter(Boolean).join('');
  // Desde las listas de tareas, una tarea de un contacto lleva a su ficha (allí se edita).
  const irAFicha = mostrarContacto && c;

  return `
    <div class="td-tarea ${t.hecha ? 'hecha' : ''}" data-tarea="${t.id}">
      <button class="td-check p-${p.id}" data-action="toggle-tarea" data-id="${t.id}"
        title="${t.hecha ? 'Marcar como pendiente' : 'Completar'}" aria-label="${t.hecha ? 'Marcar como pendiente' : 'Completar tarea'}"></button>
      <div class="td-cuerpo" data-action="${irAFicha ? 'ir-a-tarea' : 'editar-tarea'}" data-id="${t.id}" title="${irAFicha ? `Abrir la ficha de ${esc(c.nombre)}` : 'Editar tarea'}">
        <div class="td-titulo">
          ${ta ? `<span class="td-tipo" title="${ta.label}">${ico(ta.icon)}</span>` : ''}${esc(t.titulo)}
          ${t.cancelada ? '<span class="td-etq-cancelada">Cancelada</span>' : ''}
        </div>
        ${t.detalle ? `<div class="td-desc">${esc(t.detalle)}</div>` : ''}
        ${meta ? `<div class="td-meta">${meta}</div>` : ''}
      </div>
      <div class="td-hover">
        ${irAFicha ? '' : `<button class="icon-btn" data-action="editar-tarea" data-id="${t.id}" title="Editar">${ico('editar')}</button>`}
        <button class="icon-btn" data-action="borrar-tarea" data-id="${t.id}" title="Eliminar">${ico('papelera')}</button>
      </div>
    </div>`;
}

// Marca una tarea como hecha/pendiente. Si es una acción planeada (llamar, WhatsApp…) queda registrada en el historial de acciones.
// Una reunión `cancelada` cuenta como hecha, pero se registra como "Reunión cancelada".
function marcarTarea(t, hecha, cancelada = false, datosAccion = {}) {
  t.hecha = hecha;
  t.completada = hecha ? ahora() : null;
  if (hecha && cancelada) t.cancelada = true;
  else delete t.cancelada;
  if (hecha && t.accion && t.contactId && !db.actions.some((a) => a.taskId === t.id)) {
    db.actions.push({
      id: uid(), contactId: t.contactId, tipo: cancelada ? 'reunion-cancelada' : t.accion, fecha: hoy(), hora: null,
      resumen: t.titulo, noteId: t.noteId || null, taskId: t.id, creado: ahora(), ...datosAccion,
    });
  }
  if (!hecha) db.actions = db.actions.filter((a) => a.taskId !== t.id);
  if (t.enrollmentId) (hecha ? avanzarSecuencia : retrocederSecuencia)(t);
  tocar(t.contactId);
}

// Completa (o cancela) con aviso para deshacer.
function completarTarea(t, cancelada = false, datosAccion = {}, mensaje = 'Tarea completada') {
  marcarTarea(t, true, cancelada, datosAccion);
  guardar();
  render();
  avisar(cancelada ? 'Reunión marcada como cancelada' : mensaje, () => {
    marcarTarea(t, false);
    guardar();
    render();
  });
}

// ---------- Secuencia: las tareas una detrás de otra (como la cola de tareas de HubSpot) ----------

const tareasParaHoy = () => db.tasks.filter((t) => !t.hecha && t.fecha && t.fecha <= hoy()).sort(ordenTareas);

// Las tareas pendientes que se ven ahora mismo en la página Tareas, en el mismo orden.
function tareasDeLaVista() {
  const h = hoy();
  const q = ui.tareasQ.trim().toLowerCase();
  const propia = vistaTareaPropia();
  return db.tasks
    .filter((t) => !t.hecha && coincideTarea(t, q))
    .filter((t) => {
      if (propia) return cumpleFiltroTarea(t, propia.filtros);
      if (ui.tareasVista === 'hoy') return t.fecha && t.fecha <= h;
      if (ui.tareasVista === 'proximo') return t.fecha && t.fecha <= sumarDias(h, 6);
      if (ui.tareasVista === 'generales') return !t.contactId;
      return true;
    })
    .sort(ordenTareas);
}

// Como la cola de tareas de HubSpot: cada tarea de un contacto se hace desde su ficha completa
// (con «Tarea 2 de 10» arriba); las tareas sin contacto y el final, en la página #/cola.
function empezarSecuencia(tareas, origen = 'hoy', i = 0) {
  if (!tareas.length) return avisar('No hay tareas pendientes');
  ui.cola = { ids: tareas.map((t) => t.id), i, origen };
  mostrarCola();
}

const tareaColaActual = () => (ui.cola && ui.cola.i < ui.cola.ids.length ? tarea(ui.cola.ids[ui.cola.i]) : null);

// Lleva a donde se hace la tarea actual de la cola.
function mostrarCola() {
  const t = tareaColaActual();
  const destino = t && contacto(t.contactId) ? '#/contacto/' + t.contactId : '#/cola';
  if (location.hash === destino) {
    render();
    window.scrollTo(0, 0);
  } else location.hash = destino;
}

// La página actual es la de la tarea en curso de la cola (la página #/cola o la ficha de su contacto).
function enModoCola() {
  const { ruta, id } = rutaActual();
  const t = tareaColaActual();
  return !!ui.cola && (ruta === 'cola' || (ruta === 'contacto' && !!t && t.contactId === id));
}

// Si se ha borrado alguna tarea mientras tanto, desaparece de la cola.
function limpiarCola() {
  const cola = ui.cola;
  if (!cola) return;
  const actual = cola.ids[cola.i];
  cola.ids = cola.ids.filter((id) => tarea(id));
  cola.i = cola.ids.includes(actual) ? cola.ids.indexOf(actual) : Math.min(cola.i, cola.ids.length);
}

function salirDeCola() {
  ui.cola = null;
  if (ui.llamada && !ui.llamada.inicio && !ui.llamada.notas.trim()) cerrarLlamada();
  location.hash = '#/tareas';
}

function irEnCola(i) {
  if (!ui.cola) return;
  ui.cola.i = Math.max(0, Math.min(i, ui.cola.ids.length));
  mostrarCola();
}

// Siguiente tarea sin hacer después de `desde` (o el final de la secuencia).
function siguientePendiente(desde) {
  const { ids } = ui.cola;
  for (let i = desde + 1; i < ids.length; i++) if (!tarea(ids[i])?.hecha) return i;
  return ids.length;
}

const saltarEnCola = () => irEnCola(siguientePendiente(ui.cola.i));

// Lo apuntado en la secuencia se guarda como nota del contacto (o en la nota de la tarea, si no tiene contacto).
function notaDeCola(t, texto) {
  const previa = !t.contactId && t.noteId && nota(t.noteId);
  if (previa) {
    previa.contenido = `${previa.contenido}\n\n${texto}`.trim();
    previa.editado = ahora();
    return null;
  }
  const n = {
    id: uid(), contactId: t.contactId, tipo: ACCION_A_NOTA[t.accion] || 'general', titulo: t.titulo,
    contenido: texto, fecha: hoy(), fijada: false, creado: ahora(),
  };
  db.notes.push(n);
  if (!t.noteId) t.noteId = n.id;
  return n;
}

function completarEnCola(cancelada = false, datosAccion = {}, mensaje = 'Tarea completada') {
  const cola = ui.cola;
  const t = cola && tarea(cola.ids[cola.i]);
  if (!t || t.hecha) return;
  const antes = cola.i;
  const texto = (ui.colaNotas[t.id] || '').trim();
  const n = texto ? notaDeCola(t, texto) : null;
  marcarTarea(t, true, cancelada, datosAccion);
  const ac = db.actions.find((a) => a.taskId === t.id);
  if (ac && n) ac.noteId = n.id;
  delete ui.colaNotas[t.id];
  cola.i = siguientePendiente(cola.i);
  guardar();
  mostrarCola();
  avisar(cancelada ? 'Reunión marcada como cancelada' : mensaje, () => {
    marcarTarea(t, false);
    if (n) {
      db.notes = db.notes.filter((x) => x.id !== n.id);
      if (t.noteId === n.id) delete t.noteId;
      ui.colaNotas[t.id] = texto;
    }
    cola.i = antes;
    guardar();
    mostrarCola();
  });
}

function posponerEnCola() {
  const cola = ui.cola;
  const t = tarea(cola.ids[cola.i]);
  const antes = { i: cola.i, fecha: t.fecha };
  t.fecha = sumarDias(hoy(), 1);
  tocar(t.contactId);
  cola.i = siguientePendiente(cola.i);
  guardar();
  mostrarCola();
  avisar('Tarea pasada a mañana', () => {
    t.fecha = antes.fecha;
    cola.i = antes.i;
    guardar();
    mostrarCola();
  });
}

// En una tarea de llamada se abre sola la ventana de llamada (salvo que se haya cerrado a mano).
// Devuelve si la tarea actual se hace con la ventana de llamada.
function prepararLlamadaCola(t, c) {
  const llamando = !t.hecha && esLlamada(t) && !!c;
  if (llamando && ui.llamada?.taskId !== t.id && !ui.llamada?.inicio && ui.llamadaCerrada !== t.id) abrirLlamada(c.id, t.id);
  if (!llamando && ui.llamada?.taskId && ui.llamada.taskId !== t.id && !ui.llamada.inicio && !ui.llamada.notas.trim()) cerrarLlamada();
  return llamando;
}

function cabeceraColaHTML() {
  const cola = ui.cola;
  const total = cola.ids.length;
  const hechas = cola.ids.filter((id) => tarea(id).hecha).length;
  return `
    <div class="sq-cabecera">
      <button class="link-btn back" data-action="sq-salir">← Salir</button>
      <div class="sq-progreso">
        <div class="small"><b>${cola.i < total ? `Tarea ${cola.i + 1} de ${total}` : 'Fin de las tareas'}</b>
          <span class="muted">· ${hechas} completada${hechas === 1 ? '' : 's'}</span></div>
        <div class="sq-barra"><i style="width:${(hechas / total) * 100}%"></i></div>
      </div>
      <div class="row">
        <button class="btn sm" data-action="sq-anterior" ${cola.i === 0 ? 'disabled' : ''} title="Anterior (←)">← Anterior</button>
        <button class="btn sm" data-action="sq-ir" data-i="${cola.i + 1}" ${cola.i >= total ? 'disabled' : ''} title="Siguiente (→)">Siguiente →</button>
      </div>
    </div>`;
}

// La tarea en curso con sus botones (completar, cancelada, pasar a mañana, saltar…).
function tareaColaHTML(t, c, llamando) {
  const ta = t.accion && tipoAccionDe(t.accion);
  const n = t.noteId && nota(t.noteId);
  const p = prioridadDe(t.prioridad);
  return `
    <div class="sq-tipo">${ta ? `${ico(ta.icon)} ${ta.label}` : `${ico('lista')} Tarea interna`}</div>
    <h1 class="sq-titulo">${esc(t.titulo)}</h1>
    <div class="sq-meta">
      ${t.fecha ? `<span class="td-fecha ${t.hecha ? '' : claseFecha(t.fecha)}">${ICONO_CAL}${fmtCuando(t.fecha)}${t.hora ? ` ${conLocal(t.hora, t.fecha)}` : ''}</span>` : '<span>Sin fecha</span>'}
      ${t.prioridad !== 'ninguna' ? `<span class="sq-prio p-${p.id}">${ico('bandera')} ${p.label}</span>` : ''}
      ${t.cancelada ? '<span class="td-etq-cancelada">Cancelada</span>' : t.hecha ? '<span class="sq-hecha">✓ Completada</span>' : ''}
    </div>
    ${t.detalle ? `<p class="sq-detalle">${esc(t.detalle)}</p>` : ''}
    ${n && n.contenido ? `<div class="sq-nota-tarea md">${markdown(n.contenido)}</div>` : ''}
    ${t.hecha ? `
      <div class="sq-botones">
        <button class="btn" data-action="sq-reabrir">Marcar como pendiente</button>
        <span class="grow"></span>
        <button class="btn primary" data-action="sq-saltar">Siguiente →</button>
      </div>` : `
      ${llamando ? `
        <div class="sq-llamada-aviso">
          ${ico('telefono')} <span class="grow">Es una llamada: apunta las notas y el resultado en la <b>ventana de llamada</b>. Al registrarla, la tarea se completa.</span>
          ${ui.llamada?.taskId === t.id ? '' : `<button class="btn sm" data-action="abrir-llamada" data-id="${c.id}" data-tarea="${t.id}">Abrir llamada</button>`}
        </div>` : `
        <div class="field sq-apuntar">
          <span>${ico('nota')} Apunta qué ha pasado (se guarda como nota${c ? ` de ${esc(c.nombre)}` : ''})</span>
          ${editorHTML('sq-nota', ui.colaNotas[t.id] || '', c ? 2 : 4, 'Ej. No contesta, volver a llamar el jueves…')}
        </div>`}
      <div class="sq-botones">
        <button class="btn primary" data-action="sq-completar" title="Ctrl+Enter">✓ ${llamando ? 'Registrar llamada y siguiente' : 'Completar y siguiente'}</button>
        ${REUNIONES.includes(t.accion) ? `<button class="btn" data-action="sq-cancelada" title="La reunión no se hizo">${ico('cancelado')} Cancelada</button>` : ''}
        <button class="btn" data-action="sq-posponer">Pasar a mañana</button>
        <span class="grow"></span>
        <button class="btn" data-action="sq-saltar">Saltar →</button>
      </div>`}
    <div class="sq-pie muted small">
      <button class="link-btn" data-action="editar-tarea" data-id="${t.id}">${ico('editar')} Editar tarea</button>
      <span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> completar · <kbd>←</kbd> <kbd>→</kbd> moverte entre tareas</span>
    </div>`;
}

const activarNotaCola = (t) =>
  $('textarea[name="sq-nota"]', app)?.addEventListener('input', (e) => { ui.colaNotas[t.id] = e.target.value; });

// Página #/cola: las tareas sin contacto y el final de la cola. Las de un contacto se hacen en su ficha.
function vistaSecuencia() {
  if (!ui.cola && tareasParaHoy().length) ui.cola = { ids: tareasParaHoy().map((t) => t.id), i: 0, origen: 'hoy' };
  limpiarCola();
  const cola = ui.cola;
  if (!cola || !cola.ids.length) {
    ui.cola = null;
    app.innerHTML = `
      <div class="empty card">
        <p><strong>No hay tareas para hoy.</strong></p>
        <p class="muted">«Empezar tareas» recorre una a una las tareas de hoy y las vencidas. También puedes empezar desde cualquier vista de Tareas.</p>
        <a class="btn" href="#/tareas">Ir a Tareas</a>
      </div>`;
    return;
  }

  const total = cola.ids.length;
  const hechas = cola.ids.filter((id) => tarea(id).hecha).length;

  if (cola.i >= total) {
    const faltan = cola.ids.findIndex((id) => !tarea(id).hecha);
    app.innerHTML = `
      ${cabeceraColaHTML()}
      <div class="sq-grid sq-grid-fin">
        <div class="empty card sq-fin">
          <p class="sq-fin-icono">${ico('check-circulo')}</p>
          <p><strong>Tareas terminadas</strong></p>
          <p class="muted">${hechas} de ${total} tareas completadas${faltan >= 0 ? ` · ${total - hechas} sin hacer` : ''}.</p>
          <div class="row sq-fin-botones">
            ${faltan >= 0 ? `<button class="btn" data-action="sq-ir" data-i="${faltan}">Volver a las que faltan</button>` : ''}
            <button class="btn primary" data-action="sq-salir">Terminar</button>
          </div>
        </div>
      </div>`;
    return;
  }

  const t = tarea(cola.ids[cola.i]);
  if (contacto(t.contactId)) {
    location.replace('#/contacto/' + t.contactId);
    return;
  }
  prepararLlamadaCola(t, null);
  app.innerHTML = `
    ${cabeceraColaHTML()}
    <div class="sq-grid sq-grid-fin">
      <section class="card sq-tarea">${tareaColaHTML(t, null, false)}</section>
    </div>`;
  activarNotaCola(t);
}


// ---------- Ventana de llamada (como la de HubSpot) ----------

const RESULTADOS_LLAMADA = [
  { id: 'conectada', label: 'Conectada', accion: 'llamada' },
  { id: 'sin-respuesta', label: 'Sin respuesta', accion: 'llamada-sin-respuesta' },
  { id: 'ocupado', label: 'Ocupado', accion: 'llamada-sin-respuesta' },
  { id: 'buzon', label: 'Buzón de voz', accion: 'llamada-sin-respuesta' },
  { id: 'equivocado', label: 'Número equivocado', accion: 'llamada-sin-respuesta' },
];

const esLlamada = (t) => ['llamada', 'llamada-sin-respuesta'].includes(t?.accion);
const ventanaLlamada = document.getElementById('llamada');

// Segundos que dura la llamada (la parte en curso incluida).
const segundosLlamada = (L) => Math.round(L.duracion + (L.inicio ? (Date.now() - L.inicio) / 1000 : 0));
const fmtDuracion = (seg) => `${pad(Math.floor(seg / 60))}:${pad(seg % 60)}`;

function abrirLlamada(contactId, taskId = null) {
  if (ui.llamada?.inicio && ui.llamada.contactId !== contactId) {
    avisar('Hay una llamada en curso: cuélgala o regístrala primero');
    return;
  }
  const c = contacto(contactId);
  ui.llamada = { contactId, taskId, telefono: c.telefono || '', inicio: null, duracion: 0, resultado: 'conectada', notas: '', minimizada: false };
  ui.llamadaCerrada = null;
  pintarLlamada();
}

function cerrarLlamada() {
  ui.llamada = null;
  pintarLlamada();
}

function colgar() {
  const L = ui.llamada;
  if (!L?.inicio) return;
  L.duracion = segundosLlamada(L);
  L.inicio = null;
}

function pintarLlamada() {
  const L = ui.llamada;
  ventanaLlamada.hidden = !L;
  if (!L) return;
  const c = contacto(L.contactId);
  const t = L.taskId && tarea(L.taskId);
  const seg = segundosLlamada(L);
  const tel = L.telefono.trim();
  ventanaLlamada.classList.toggle('minimizada', L.minimizada);
  ventanaLlamada.innerHTML = `
    <div class="ll-cabecera" data-ll="minimizar" title="Arrastra para moverla · clic para ${L.minimizada ? 'desplegar' : 'minimizar'} · doble clic para devolverla a su sitio">
      ${ico('telefono')}
      <span class="grow"><b>${L.inicio ? 'En llamada' : 'Llamada'}</b> · ${esc(c.nombre)}</span>
      ${L.inicio ? `<span class="ll-tiempo">${fmtDuracion(seg)}</span>` : ''}
      <button type="button" class="ll-btn" data-ll="minimizar" aria-label="${L.minimizada ? 'Desplegar' : 'Minimizar'}">${L.minimizada ? '▴' : '▾'}</button>
      <button type="button" class="ll-btn" data-ll="cerrar" aria-label="Cerrar">${ico('cerrar')}</button>
    </div>
    ${L.minimizada ? '' : `
      <div class="ll-cuerpo">
        <div class="persona">
          <span class="avatar sm">${esc(iniciales(c.nombre))}</span>
          <div class="grow">
            <a href="#/contacto/${c.id}"><strong>${esc(c.nombre)}</strong></a>
            <div class="muted small">${esc([c.cargo, empresaDe(c)].filter(Boolean).join(' · '))}</div>
          </div>
        </div>
        ${t ? `<div class="ll-tarea small">${ico('check-circulo')} ${esc(t.titulo)}</div>` : ''}
        <div class="ll-marcar">
          ${c.telefono ? `<span class="ll-numero">${esc(tel)}</span>` : `<input name="ll-tel" type="tel" placeholder="Número de teléfono" value="${esc(L.telefono)}">`}
          ${L.inicio
            ? `<span class="ll-tiempo grande">${fmtDuracion(seg)}</span><button type="button" class="btn ll-colgar" data-ll="colgar">Colgar</button>`
            : `<a class="btn ll-llamar ${tel ? '' : 'desactivado'}" href="${tel ? `tel:${esc(tel.replace(/[^\d+]/g, ''))}` : '#'}" data-ll="llamar">${ico('telefono')} Llamar</a>`}
        </div>
        ${!L.inicio && L.duracion ? `<p class="muted small ll-duracion">Duración: ${fmtDuracion(seg)}</p>` : ''}
        <label class="field"><span>Resultado</span>
          <select name="ll-resultado">${opciones(RESULTADOS_LLAMADA, L.resultado)}</select>
        </label>
        <div class="field"><span>Notas de la llamada</span>${editorHTML('ll-notas', L.notas, 5, 'Qué te ha dicho, próximos pasos…')}</div>
      </div>
      <div class="ll-pie">
        <button type="button" class="btn primary" data-ll="registrar">${t && !t.hecha ? 'Registrar y completar tarea' : 'Registrar llamada'}</button>
      </div>`}`;
  activarEditores(ventanaLlamada);
  colocarLlamada();
}

// Guarda la llamada como acción (y nota, si hay notas). Si viene de una tarea, la completa.
function registrarLlamada() {
  const L = ui.llamada;
  if (!L) return;
  colgar();
  const c = contacto(L.contactId);
  const t = L.taskId && tarea(L.taskId);
  const r = RESULTADOS_LLAMADA.find((x) => x.id === L.resultado);
  const dur = L.duracion ? ` · ${fmtDuracion(L.duracion)}` : '';
  const datos = {
    tipo: r.accion,
    hora: horaActual(),
    resumen: r.id === 'conectada' ? `${t ? t.titulo : 'Llamada'}${dur}` : `${r.label}${t ? ` · ${t.titulo}` : ''}`,
  };
  if (!c.telefono && L.telefono.trim()) cambiarContacto(c, () => (c.telefono = L.telefono.trim()));
  const notas = L.notas.trim();
  const enCola = t && tareaColaActual()?.id === t.id && enModoCola();
  cerrarLlamada();

  if (enCola && !t.hecha) {
    ui.colaNotas[t.id] = notas;
    completarEnCola(false, datos, 'Llamada registrada');
    return;
  }
  if (notas) {
    const n = { id: uid(), contactId: c.id, tipo: 'llamada', titulo: t ? t.titulo : 'Llamada', contenido: notas, fecha: hoy(), fijada: false, creado: ahora() };
    db.notes.push(n);
    datos.noteId = n.id;
  }
  if (t && !t.hecha) {
    completarTarea(t, false, datos, 'Llamada registrada');
    return;
  }
  db.actions.push({ id: uid(), contactId: c.id, fecha: hoy(), noteId: null, taskId: null, creado: ahora(), ...datos });
  tocar(c.id);
  guardar();
  render();
  avisar('Llamada registrada');
}

// En "Empezar tareas": si la tarea actual es una llamada abierta en la ventana, completar = registrar la llamada.
function completarActualEnCola() {
  const t = ui.cola && tarea(ui.cola.ids[ui.cola.i]);
  if (t && ui.llamada?.taskId === t.id) registrarLlamada();
  else completarEnCola();
}

// La ventana se puede arrastrar por la cabecera a cualquier sitio de la pantalla (como en HubSpot).
// La posición se recuerda en este navegador; sin posición guardada va abajo a la derecha.
let posLlamada = (() => { try { return JSON.parse(localStorage.getItem('crm-pos-llamada')); } catch { return null; } })();
let arrastreLlamada = null;
let ignorarClicLlamada = false;

// Coloca la ventana en su posición sin que se salga de la pantalla.
function colocarLlamada() {
  if (!posLlamada || ventanaLlamada.hidden) return;
  const r = ventanaLlamada.getBoundingClientRect();
  const x = Math.max(8, Math.min(posLlamada.x, innerWidth - r.width - 8));
  const y = Math.max(8, Math.min(posLlamada.y, innerHeight - r.height - 8));
  Object.assign(ventanaLlamada.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
}

ventanaLlamada.addEventListener('pointerdown', (e) => {
  const cab = e.target.closest('.ll-cabecera');
  if (!cab || e.button !== 0 || e.target.closest('button')) return;
  // Sin esto, si hay texto seleccionado en la página el navegador empieza a arrastrarlo y corta el movimiento.
  e.preventDefault();
  const r = ventanaLlamada.getBoundingClientRect();
  arrastreLlamada = { dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, movido: false };
  cab.setPointerCapture(e.pointerId);
});

ventanaLlamada.addEventListener('pointermove', (e) => {
  const a = arrastreLlamada;
  if (!a) return;
  if (!a.movido && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 4) return; // un clic no es un arrastre
  a.movido = true;
  ventanaLlamada.classList.add('arrastrando');
  posLlamada = { x: e.clientX - a.dx, y: e.clientY - a.dy };
  colocarLlamada();
});

function soltarLlamada() {
  if (!arrastreLlamada) return;
  if (arrastreLlamada.movido) {
    // Al soltar no se minimiza (el clic de la cabecera minimiza).
    ignorarClicLlamada = true;
    setTimeout(() => (ignorarClicLlamada = false));
    try { localStorage.setItem('crm-pos-llamada', JSON.stringify(posLlamada)); } catch { /* sin almacenamiento: no pasa nada */ }
  }
  arrastreLlamada = null;
  ventanaLlamada.classList.remove('arrastrando');
}

ventanaLlamada.addEventListener('pointerup', soltarLlamada);
ventanaLlamada.addEventListener('pointercancel', soltarLlamada);

// Doble clic en la cabecera: vuelve a su sitio de siempre.
ventanaLlamada.addEventListener('dblclick', (e) => {
  if (!e.target.closest('.ll-cabecera') || e.target.closest('button')) return;
  posLlamada = null;
  try { localStorage.removeItem('crm-pos-llamada'); } catch { /* sin almacenamiento */ }
  Object.assign(ventanaLlamada.style, { left: '', top: '', right: '', bottom: '' });
});

window.addEventListener('resize', colocarLlamada);

ventanaLlamada.addEventListener('click', (e) => {
  if (ignorarClicLlamada) return;
  const b = e.target.closest('[data-ll]');
  const L = ui.llamada;
  if (!b || !L) return;
  const que = b.dataset.ll;
  if (que === 'minimizar') L.minimizada = !L.minimizada;
  else if (que === 'cerrar') {
    if ((L.inicio || L.notas.trim()) && !confirm('¿Cerrar la llamada sin registrarla? Se perderán las notas.')) return;
    ui.llamadaCerrada = L.taskId;
    cerrarLlamada();
    if (enModoCola()) render();
    return;
  } else if (que === 'llamar') {
    if (!L.telefono.trim()) {
      e.preventDefault();
      avisar('Escribe el número de teléfono');
      return;
    }
    // El enlace tel: abre la app de llamadas del ordenador. Se repinta después: un enlace que
    // desaparece de la página durante el clic ya no se abre.
    L.inicio = Date.now();
    setTimeout(pintarLlamada);
    return;
  } else if (que === 'colgar') colgar();
  else if (que === 'registrar') return registrarLlamada();
  pintarLlamada();
});

ventanaLlamada.addEventListener('input', (e) => {
  const L = ui.llamada;
  if (!L) return;
  if (e.target.name === 'll-notas') L.notas = e.target.value;
  if (e.target.name === 'll-tel') {
    L.telefono = e.target.value;
    const b = $('.ll-llamar', ventanaLlamada);
    const tel = L.telefono.trim();
    b?.classList.toggle('desactivado', !tel);
    if (b) b.href = tel ? `tel:${tel.replace(/[^\d+]/g, '')}` : '#';
  }
});

ventanaLlamada.addEventListener('change', (e) => {
  if (e.target.name === 'll-resultado' && ui.llamada) ui.llamada.resultado = e.target.value;
});

// El contador de la llamada en curso.
setInterval(() => {
  if (!ui.llamada?.inicio) return;
  ventanaLlamada.querySelectorAll('.ll-tiempo').forEach((el) => (el.textContent = fmtDuracion(segundosLlamada(ui.llamada))));
}, 1000);

// ---------- Vista: ajustes ----------

function vistaAjustes() {
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
        <div class="row between">
          <h3>${ico('empresa')} Propiedades de empresa</h3>
          <button class="btn sm" data-action="nueva-prop-empresa">+ Añadir propiedad</button>
        </div>
        <p class="muted small">Las desactivadas no se muestran en el CRM (ni en la ficha, ni en la tabla, ni al editar), pero conservan lo que tuvieran. Las de nurturing solo aparecen cuando la empresa está en nurturing.</p>
        <div class="props-lista">
          ${propsEmpresa().map((p) => `
            <div class="prop-fila">
              <label class="check grow"><input type="checkbox" class="aj-prop" data-id="${esc(p.id)}" ${propVisible(p) ? 'checked' : ''}> ${esc(p.label)}</label>
              <span class="muted small">${p.extra ? 'Propia · ' : ''}${p.tipo === 'tel' ? 'Teléfono' : TIPOS_PROP.find((x) => x.id === p.tipo)?.label || 'Texto'}${p.tipo === 'opciones' ? ` · ${p.opciones.length} opciones` : ''}${p.soloLectura ? ' · la pone el importador' : ''}</span>
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
  $('#aj-secundaria').addEventListener('change', (e) => { s.horaSecundaria = e.target.checked; guardar(); render(); });
  $('#aj-zona').addEventListener('change', (e) => { s.zonaSecundaria = e.target.value; guardar(); render(); });
  app.querySelectorAll('.aj-prop').forEach((cb) => cb.addEventListener('change', () => {
    const ocultas = new Set(s.propsEmpresaOcultas);
    if (cb.checked) ocultas.delete(cb.dataset.id);
    else ocultas.add(cb.dataset.id);
    s.propsEmpresaOcultas = [...ocultas];
    guardar();
  }));
}

// Añadir (o editar) una propiedad propia de empresa.
function modalPropEmpresa(p) {
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
    const ops = [...new Set(d.opciones.split('\n').map((x) => x.trim()).filter(Boolean))];
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
  $('[name=tipo]', modal).addEventListener('change', (e) => $('#prop-opciones', modal).classList.toggle('oculto', e.target.value !== 'opciones'));
}

// ---------- Importar contactos desde un CSV ----------

const nombresImportaciones = () =>
  [...new Set([...db.imports.map((i) => i.nombre), ...db.contacts.map((c) => c.importacion).filter(Boolean)])];

// CSV con comas, punto y coma o tabuladores (se detecta solo) y comillas dobles.
function leerCSV(texto) {
  texto = texto.replace(/^﻿/, '');
  const primera = texto.split(/\r?\n/, 1)[0];
  const sep = [',', ';', '\t'].reduce((a, b) => (primera.split(b).length > primera.split(a).length ? b : a));
  const filas = [];
  let fila = [];
  let celda = '';
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch !== '"') celda += ch;
      else if (texto[i + 1] === '"') { celda += '"'; i++; }
      else comillas = false;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(celda); celda = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = '';
    } else celda += ch;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  return filas.filter((f) => f.some((v) => v.trim()));
}

// Los CSV de Excel en español suelen venir en Windows-1252, no en UTF-8.
async function leerArchivoTexto(archivo) {
  const buf = await archivo.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return new TextDecoder('windows-1252').decode(buf); }
}

const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

// Campos a los que se puede llevar cada columna del CSV; `alias` sirve para adivinarlo por la cabecera.
const CAMPOS_IMPORTAR = [
  { id: 'nombre', label: 'Nombre completo', alias: ['nombre completo', 'name', 'full name', 'contacto', 'nombre y apellidos'] },
  { id: 'pila', label: 'Nombre', alias: ['nombre', 'first name', 'firstname', 'first_name'] },
  { id: 'apellidos', label: 'Apellidos', alias: ['apellidos', 'apellido', 'last name', 'lastname', 'last_name', 'surname'] },
  { id: 'email', label: 'Email', alias: ['email', 'e-mail', 'correo', 'correo electronico', 'mail', 'email address'] },
  { id: 'telefono', label: 'Teléfono', alias: ['telefono', 'phone', 'phone number', 'movil', 'mobile', 'mobile phone number', 'tel'] },
  { id: 'empresa', label: 'Empresa', alias: ['empresa', 'company', 'company name', 'compania', 'organizacion', 'nombre de la empresa'] },
  { id: 'cargo', label: 'Cargo', alias: ['cargo', 'job title', 'puesto', 'title', 'position'] },
  { id: 'ciudad', label: 'Ciudad', alias: ['ciudad', 'city', 'localidad', 'poblacion'] },
  { id: 'web', label: 'Web', alias: ['web', 'website', 'website url', 'url', 'dominio', 'domain', 'pagina web', 'company domain name'] },
  { id: 'origen', label: 'Origen', alias: ['origen', 'source', 'fuente', 'lead source'] },
  { id: 'etiquetas', label: 'Etiquetas', alias: ['etiquetas', 'tags'] },
  { id: 'estadoLead', label: 'Estado lead (empresa)', alias: ['estado lead', 'lead status', 'estado del lead'] },
];

const adivinarCampo = (cabecera) => CAMPOS_IMPORTAR.find((f) => f.alias.includes(normalizar(cabecera)))?.id || '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Separa las filas en contactos nuevos y descartadas: solo entra un contacto si su email es válido y único
// (que no exista ya en el CRM ni esté repetido dentro del propio archivo).
function analizarImportacion(filas, mapa) {
  const existentes = new Set(db.contacts.map((c) => normalizar(c.email)).filter(Boolean));
  const vistos = new Set();
  const r = { nuevos: [], duplicados: 0, repetidos: 0, sinEmail: 0 };
  filas.forEach((fila) => {
    const o = {};
    mapa.forEach((campoId, i) => { if (campoId && fila[i]?.trim()) o[campoId] = fila[i].trim(); });
    const email = normalizar(o.email);
    if (!EMAIL_RE.test(email)) r.sinEmail++;
    else if (existentes.has(email)) r.duplicados++;
    else if (vistos.has(email)) r.repetidos++;
    else {
      vistos.add(email);
      r.nuevos.push({ ...o, email });
    }
  });
  return r;
}

function modalImportar() {
  let filas = [];
  let mapa = [];
  abrirModal('Importar contactos desde CSV', `
    <p class="muted small">La primera fila del archivo tiene que ser la de los nombres de las columnas. Solo se importan contactos con un <b>email único</b>: si ya hay un contacto con ese email, o el email está repetido en el archivo, esa fila se salta.</p>
    ${campo('Archivo CSV *', '<input type="file" name="archivo" accept=".csv,text/csv,.txt" required>')}
    ${campo('Nombre de la importación *', '<input name="nombreImp" required placeholder="Ej. Clínicas Madrid noviembre">')}
    <div id="imp-mapa"></div>
    <div id="imp-resumen"></div>
  `, (d) => {
    const nombreImp = d.nombreImp.trim();
    if (!nombreImp) return false;
    if (nombresImportaciones().some((n) => normalizar(n) === normalizar(nombreImp))) {
      alert(`Ya hay una importación llamada «${nombreImp}». Ponle otro nombre para poder distinguirlas.`);
      return false;
    }
    if (!mapa.includes('email')) {
      alert('Indica qué columna es la del email.');
      return false;
    }
    const r = analizarImportacion(filas, mapa);
    if (!r.nuevos.length) {
      alert('No hay ningún contacto nuevo que importar.');
      return false;
    }
    const empresasAntes = new Set(db.companies.map((e) => e.id));
    r.nuevos.forEach((o) => {
      const e = o.empresa ? empresaPorNombre(o.empresa) : null;
      if (e && !empresasAntes.has(e.id)) {
        e.importacion = nombreImp;
        if (o.web && !e.web) e.web = o.web;
        if (o.ciudad && !e.ciudad) e.ciudad = o.ciudad;
      }
      // "Open deal", "open_deal" o "✅ Open deal": se acepta el valor interno o la etiqueta, con o sin emoji.
      const sinEmoji = (s) => normalizar(s.replace(/^\P{L}+/u, ''));
      const lead = o.estadoLead && ESTADOS_LEAD.find((x) =>
        [x.id, x.id.replace('_', ' '), x.label].map(sinEmoji).includes(sinEmoji(o.estadoLead)));
      if (e && lead && !e.estadoLead) e.estadoLead = lead.id;
      db.contacts.push({
        id: uid(),
        nombre: o.nombre || [o.pila, o.apellidos].filter(Boolean).join(' ') || o.email.split('@')[0],
        companyId: e?.id || null,
        ownerId: YO,
        cargo: o.cargo || '',
        email: o.email,
        telefono: o.telefono || '',
        web: o.web || '',
        ciudad: o.ciudad || '',
        estado: 'nuevo',
        origen: o.origen || 'Importación',
        etiquetas: (o.etiquetas || '').split(/[,;]/).map((x) => x.trim()).filter(Boolean),
        importacion: nombreImp,
        creado: ahora(),
        actualizado: ahora(),
      });
    });
    db.imports.push({ id: uid(), nombre: nombreImp, fecha: hoy(), creados: r.nuevos.length, duplicados: r.duplicados + r.repetidos, sinEmail: r.sinEmail, creado: ahora() });
    guardar();
    cargarVista('todos');
    ui.filtros.importacion = nombreImp;
    if (location.hash === '#/' || location.hash === '') render();
    else location.hash = '#/';
    avisar(`${r.nuevos.length} contacto${r.nuevos.length === 1 ? '' : 's'} importado${r.nuevos.length === 1 ? '' : 's'} en «${nombreImp}»`);
  });

  const form = $('form', modal);
  $('.modal-actions .primary', modal).textContent = 'Importar contactos';
  const pintarResumen = () => {
    if (!filas.length) return;
    const r = analizarImportacion(filas, mapa);
    $('#imp-resumen', modal).innerHTML = `
      <div class="imp-resumen ${r.nuevos.length ? '' : 'vacio'}">
        <b>${r.nuevos.length} contacto${r.nuevos.length === 1 ? '' : 's'} nuevo${r.nuevos.length === 1 ? '' : 's'}</b> de ${filas.length} fila${filas.length === 1 ? '' : 's'}
        ${r.duplicados ? `<div class="small">· ${r.duplicados} ya ${r.duplicados === 1 ? 'existe' : 'existen'} en el CRM (mismo email): no se ${r.duplicados === 1 ? 'importa' : 'importan'}</div>` : ''}
        ${r.repetidos ? `<div class="small">· ${r.repetidos} con el email repetido en el archivo: solo entra la primera fila</div>` : ''}
        ${r.sinEmail ? `<div class="small">· ${r.sinEmail} sin email válido: no se ${r.sinEmail === 1 ? 'importa' : 'importan'}</div>` : ''}
        ${mapa.includes('email') ? '' : '<div class="small txt-danger">Falta indicar la columna del email.</div>'}
      </div>`;
  };

  form.archivo.addEventListener('change', async () => {
    const archivo = form.archivo.files[0];
    if (!archivo) return;
    const todas = leerCSV(await leerArchivoTexto(archivo));
    if (todas.length < 2) {
      $('#imp-mapa', modal).innerHTML = '<p class="txt-danger small">El archivo no tiene filas de datos.</p>';
      filas = [];
      return;
    }
    const [cabeceras, ...resto] = todas;
    filas = resto;
    mapa = cabeceras.map(adivinarCampo);
    if (!form.nombreImp.value.trim()) form.nombreImp.value = `${archivo.name.replace(/\.[^.]+$/, '')} · ${fmtFecha(hoy())}`;
    $('#imp-mapa', modal).innerHTML = `
      <div class="field"><span>Columnas del archivo → datos del contacto</span>
        <div class="imp-tabla">
          ${cabeceras.map((cab, i) => `
            <div class="imp-fila">
              <span class="grow"><strong>${esc(cab) || `Columna ${i + 1}`}</strong><span class="muted small truncate">${esc(filas.find((f) => f[i]?.trim())?.[i] || '')}</span></span>
              <select data-col="${i}">
                <option value="">No importar</option>
                ${CAMPOS_IMPORTAR.map((f) => `<option value="${f.id}" ${f.id === mapa[i] ? 'selected' : ''}>${f.label}</option>`).join('')}
              </select>
            </div>`).join('')}
        </div>
      </div>`;
    pintarResumen();
  });
  $('#imp-mapa', modal).addEventListener('change', (e) => {
    if (!e.target.dataset.col) return;
    mapa[+e.target.dataset.col] = e.target.value;
    pintarResumen();
  });
}

// ---------- Vista: ficha de contacto (tareas · notas · acciones) ----------

// Pestañas de la columna central de la ficha. WhatsApp y Correo son un primer borrador: todavía no
// están conectados, así que muestran lo registrado como acciones y abren WhatsApp o el correo para enviar.
const PESTANAS_FICHA = [
  { id: 'notas', label: 'Notas', icono: 'nota' },
  { id: 'tareas', label: 'Tareas', icono: 'check' },
  { id: 'whatsapp', label: 'WhatsApp', icono: 'chat', borrador: true },
  { id: 'correo', label: 'Correo', icono: 'correo', borrador: true },
];

function vistaContacto(id) {
  const c = contacto(id);
  if (ui.contactoActual !== id) {
    ui.contactoActual = id;
    ui.notaFiltro = '';
    ui.notasContactoQ = '';
  }
  if (ui.tareaDestacada) ui.fichaTab = 'tareas';

  // Haciendo las tareas una detrás de otra: la tarea en curso va arriba, con «Tarea 2 de 10».
  limpiarCola();
  const tCola = enModoCola() ? tareaColaActual() : null;
  const llamando = tCola ? prepararLlamadaCola(tCola, c) : false;

  const notas = notasDe(id);
  const pend = pendientesDe(id).sort(ordenTareas);
  const futuras = pend.filter((t) => t.accion);
  const realizadas = accionesDe(id);
  const emp = empresa(c.companyId);
  const pLead = propEmpresa('estadoLead');

  const dato = (label, valor) => (valor ? `<dt>${label}</dt><dd>${valor}</dd>` : '');
  const web = c.web ? (/^https?:\/\//.test(c.web) ? c.web : `https://${c.web}`) : '';
  const masDatos = [
    dato('Cargo', esc(c.cargo)),
    dato('Web', web ? `<a href="${esc(web)}" target="_blank" rel="noopener">${esc(c.web.replace(/^https?:\/\//, ''))}</a>` : ''),
    dato('Ciudad', esc(c.ciudad)),
    dato('Origen', esc(c.origen)),
    dato('Etiquetas', (c.etiquetas || []).map((e) => `<span class="tag">${esc(e)}</span>`).join(' ')),
    dato('Importación', c.importacion ? `<button class="link-btn" data-action="ver-importacion" data-nombre="${esc(c.importacion)}">${esc(c.importacion)}</button>` : ''),
    dato('HubSpot', c.hubspotId ? `<a href="${urlHubspot(c.hubspotId)}" target="_blank" rel="noopener">Ver en HubSpot ↗</a>${c.hubspotEstado ? `<br><span class="muted">${esc(HUBSPOT_ESTADOS[c.hubspotEstado] || c.hubspotEstado)}</span>` : ''}` : ''),
    dato('Alta', fmtFecha(c.creado)),
  ].join('');

  const cuenta = { notas: notas.length, tareas: pend.length };
  const tab = PESTANAS_FICHA.find((p) => p.id === ui.fichaTab) || PESTANAS_FICHA[0];

  app.innerHTML = `
    ${tCola ? `
      <div class="cola-ficha">
        ${cabeceraColaHTML()}
        <section class="card sq-tarea sq-tarea-ficha">${tareaColaHTML(tCola, c, llamando)}</section>
      </div>` : '<a href="#/" class="back">← Contactos</a>'}

    <div class="ficha-grid">
      <aside class="col-izq">
        <section class="card tarjeta-contacto">
          <div class="tc-cabecera">
            <span class="avatar lg">${esc(iniciales(c.nombre))}</span>
            <div class="grow">
              <h1>${esc(c.nombre)}</h1>
              <p class="muted small">${esc([c.cargo, empresaDe(c)].filter(Boolean).join(' · ')) || '&nbsp;'}</p>
            </div>
            <span class="td-pop-wrap">
              <button type="button" class="icon-btn" data-td-pop aria-haspopup="true" title="Más opciones">${ico('puntos')}</button>
              <div class="td-pop pop-derecha" hidden>
                <button type="button" data-action="editar-contacto" data-id="${c.id}">${ico('editar')} Editar contacto</button>
                <button type="button" class="pop-peligro" data-action="borrar-contacto" data-id="${c.id}">${ico('papelera')} Eliminar contacto</button>
              </div>
            </span>
          </div>
          <div class="tc-acciones">
            <button type="button" data-action="nueva-nota" data-id="${c.id}"><span class="tc-circulo">${ico('nota')}</span>Nota</button>
            <button type="button" data-action="mandar-email" data-id="${c.id}"><span class="tc-circulo">${ico('correo')}</span>Email</button>
            <button type="button" data-action="llamar" data-id="${c.id}"><span class="tc-circulo">${ico('telefono')}</span>Llamar</button>
          </div>
          <dl class="tc-datos">
            <dt>Email</dt>
            <dd>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '<span class="muted">—</span>'}</dd>
            <dt>Teléfono</dt>
            <dd>${c.telefono ? `<a href="tel:${esc(c.telefono)}">${esc(c.telefono)}</a>` : '<span class="muted">—</span>'}</dd>
            <dt>Empresa</dt>
            <dd>${emp ? `<a href="#/empresa/${c.companyId}">${esc(empresaDe(c))}</a>${contactosDeEmpresa(c.companyId).length > 1 ? ` <span class="muted small">· ${contactosDeEmpresa(c.companyId).length - 1} contacto${contactosDeEmpresa(c.companyId).length === 2 ? '' : 's'} más</span>` : ''}` : '<span class="muted">—</span>'}</dd>
            ${emp && propVisible(pLead) ? `
              <dt>Estado lead</dt>
              <dd>${textoProp(emp, pLead) || '<span class="muted">—</span>'}${nurturingDe(emp) ? `<div class="muted small">${esc(nurturingDe(emp))}</div>` : ''}</dd>` : ''}
            <dt>Estado</dt>
            <dd>${selectEstado(c)}</dd>
            <dt>Propietario</dt>
            <dd><select class="propietario-select" data-id="${c.id}">${opcionesUsuarios(c.ownerId)}</select></dd>
            <dt>Secuencia</dt>
            <dd>${(() => {
              const ins = inscripcionActiva(c.id);
              const s = ins && secuencia(ins.sequenceId);
              if (!s) return `<button class="link-btn" data-action="inscribir-contacto" data-id="${c.id}">${ico('secuencia')} Inscribir</button>`;
              return `<a href="#/secuencias/${s.id}">${esc(s.nombre)}</a> <span class="muted small">· paso ${ins.paso + 1}/${s.pasos.length}</span>
                <button class="link-btn small txt-peligro" data-action="sacar-secuencia" data-id="${ins.id}">Sacar</button>`;
            })()}</dd>
          </dl>
        </section>

        ${masDatos ? `
          <details class="card pad datos-card" id="datos-contacto" ${ui.datosAbiertos ? 'open' : ''}>
            <summary><h3>Más datos</h3></summary>
            <dl class="datos">${masDatos}</dl>
          </details>` : ''}
      </aside>

      <section class="col-notas">
        <div class="vistas-tabs ficha-tabs">
          ${PESTANAS_FICHA.map((p) => `
            <button class="vista-tab ${p.id === tab.id ? 'active' : ''}" data-action="ficha-tab" data-tab="${p.id}">
              ${ico(p.icono)} ${p.label}${cuenta[p.id] ? ` <span class="count">${cuenta[p.id]}</span>` : ''}${p.borrador ? ' <span class="etq-borrador">Borrador</span>' : ''}
            </button>`).join('')}
        </div>
        <div id="ficha-panel">${panelFicha(tab.id, c)}</div>
      </section>

      <aside class="col-acciones">
        <div class="col-titulo">
          <h2>Acciones</h2>
          <div class="row">
            <button class="btn sm" data-action="planear-accion" data-id="${c.id}" title="Planear una acción futura (crea una tarea)">+ Planear</button>
            <button class="btn sm" data-action="nueva-accion" data-id="${c.id}" title="Registrar algo que ya has hecho">+ Registrar</button>
          </div>
        </div>
        <div class="card pad timeline">
          <h4 class="tl-seccion">Próximas</h4>
          ${futuras.length ? futuras.map(accionFuturaHTML).join('') : '<p class="muted small tl-vacio">Nada planeado. Crea una tarea con tipo de acción (llamada, WhatsApp…) y aparecerá aquí.</p>'}
          <h4 class="tl-seccion">Realizadas <span class="count">${realizadas.length}</span></h4>
          ${realizadas.length ? realizadas.map(accionHTML).join('') : '<p class="muted small tl-vacio">Aún no hay acciones registradas.</p>'}
        </div>
      </aside>
    </div>`;

  $('#datos-contacto')?.addEventListener('toggle', (e) => { ui.datosAbiertos = e.target.open; });
  if (tCola) activarNotaCola(tCola);
  activarPanelFicha(tab.id, c);

  // Llegando desde Tareas: se resalta la tarea pulsada (desde aquí se edita).
  const fila = ui.tareaDestacada && $(`.td-ficha [data-tarea="${ui.tareaDestacada}"]`, app);
  ui.tareaDestacada = null;
  if (fila) {
    const plegada = fila.closest('details');
    if (plegada) plegada.open = true;
    setTimeout(() => fila.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    fila.classList.add('destacada');
    setTimeout(() => fila.classList.remove('destacada'), 2000);
  }
}

function panelFicha(tab, c) {
  if (tab === 'tareas') return panelTareasFicha(c);
  if (tab === 'whatsapp') return panelWhatsapp(c);
  if (tab === 'correo') return panelCorreo(c);
  const notas = notasDe(c.id);
  const conteoTipos = {};
  notas.forEach((n) => (conteoTipos[n.tipo] = (conteoTipos[n.tipo] || 0) + 1));
  return `
    <div class="col-titulo">
      <span class="muted small">${notas.length ? '' : 'Sin notas todavía'}</span>
      <button class="btn sm" data-action="nueva-nota" data-id="${c.id}">+ Nota</button>
    </div>
    ${notas.length ? `
      <div class="notas-filtros">
        <input type="search" id="nc-q" placeholder="Buscar en las notas…" value="${esc(ui.notasContactoQ)}">
        <div class="chips">
          <button class="chip ${ui.notaFiltro === '' ? 'active' : ''}" data-action="filtro-nota" data-tipo="">Todas <b>${notas.length}</b></button>
          ${TIPOS_NOTA.filter((t) => conteoTipos[t.id]).map((t) => `
            <button class="chip ${ui.notaFiltro === t.id ? 'active' : ''}" data-action="filtro-nota" data-tipo="${t.id}">
              ${ico(t.icon)} ${t.label} <b>${conteoTipos[t.id]}</b>
            </button>`).join('')}
        </div>
      </div>` : ''}
    <div id="notas-contacto" class="notas"></div>`;
}

function activarPanelFicha(tab, c) {
  if (tab === 'notas') {
    $('#nc-q')?.addEventListener('input', (e) => { ui.notasContactoQ = e.target.value; renderNotasContacto(c.id); });
    renderNotasContacto(c.id);
  }
}

function panelTareasFicha(c) {
  const pend = pendientesDe(c.id).sort(ordenTareas);
  const hechas = db.tasks
    .filter((t) => t.contactId === c.id && t.hecha)
    .sort((a, b) => (b.completada || '').localeCompare(a.completada || ''));
  return `
    <section class="card pad td-ficha">
      <div class="td-lista">${pend.map((t) => tareaHTML(t, false)).join('')}</div>
      ${!pend.length && ui.editor?.clave !== 'contacto' ? '<p class="muted small">No hay tareas pendientes con este contacto.</p>' : ''}
      ${ui.editor?.clave === 'contacto' ? editorTareaHTML({ contactId: c.id, fijo: true }) : anadirTareaHTML('contacto', hoy())}
      ${hechas.length ? `
        <details class="hechas">
          <summary>${hechas.length} completada${hechas.length === 1 ? '' : 's'}</summary>
          <div class="td-lista">${hechas.map((t) => tareaHTML(t, false)).join('')}</div>
        </details>` : ''}
    </section>`;
}

const AVISO_BORRADOR = (que) => `
  <div class="aviso-borrador small">${ico('idea')} <span><b>Borrador.</b> ${que}</span></div>`;

// Borrador de las conversaciones de WhatsApp: los WhatsApp registrados como acciones, en forma de chat.
function panelWhatsapp(c) {
  const tel = (c.telefono || '').replace(/\D/g, '');
  const mensajes = accionesDe(c.id).filter((a) => a.tipo === 'whatsapp').reverse();
  return `
    ${AVISO_BORRADOR('Aún no está conectado con WhatsApp: aquí se ven los WhatsApp registrados como acciones y «Enviar» abre WhatsApp Web con el mensaje y lo registra. Cuando se conecte, aparecerá la conversación real.')}
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

// Borrador del correo: los emails registrados como acciones, como una bandeja, y un formulario para escribir.
function panelCorreo(c) {
  const correos = accionesDe(c.id).filter((a) => a.tipo === 'email');
  return `
    ${AVISO_BORRADOR('Aún no está conectado con el correo: aquí se ven los emails registrados como acciones y «Enviar» abre tu programa de correo con el mensaje y lo registra.')}
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

// Enviar desde los borradores: se abre WhatsApp / el correo y queda registrado como acción.
app.addEventListener('submit', (e) => {
  const f = e.target;
  const tipo = f.dataset.form;
  if (tipo !== 'whatsapp' && tipo !== 'correo') return;
  e.preventDefault();
  const c = contacto(rutaActual().id);
  if (!c) return;
  let resumen;
  if (tipo === 'whatsapp') {
    const texto = f.texto.value.trim();
    if (!texto) return;
    window.open(`https://wa.me/${c.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
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


function renderNotasContacto(id) {
  const q = ui.notasContactoQ.trim().toLowerCase();
  const todas = notasDe(id);
  const lista = todas
    .filter((n) => !ui.notaFiltro || n.tipo === ui.notaFiltro)
    .filter((n) => !q || [n.titulo, n.contenido].some((v) => (v || '').toLowerCase().includes(q)));
  const msg = !todas.length ? 'Todavía no hay notas para este contacto. Añade una con el botón «Nota» de la tarjeta.' : 'Ninguna nota coincide.';
  $('#notas-contacto').innerHTML = lista.map(notaHTML).join('') || `<div class="empty card"><p class="muted">${msg}</p></div>`;
}

function notaHTML(n) {
  const t = tipoDe(n.tipo);
  const ac = db.actions.find((a) => a.noteId === n.id);
  const tAc = ac && tipoAccionDe(ac.tipo);
  const tareaPend = !ac && db.tasks.find((x) => x.noteId === n.id && !x.hecha);
  const abierta = ui.notasAbiertas.has(n.id);
  const contenido = n.contenido || '';
  const larga = contenido.length > 240 || contenido.split('\n').length > 4;
  return `
    <article class="nota card ${n.fijada ? 'fijada' : ''}" id="nota-${n.id}" style="--c:${t.color}">
      <header>
        <span class="tipo-pill">${ico(t.icon)} ${t.label}${tAc && tAc.label === t.label ? ` <span title="Registrada como acción">${ico('rayo')}</span>` : ''}</span>
        <time>${fmtFecha(n.fecha)}</time>
        ${tAc && tAc.label !== t.label ? `<span class="accion-pill" style="--c:${tAc.color}" title="Registrada como acción">${ico('rayo')} ${ico(tAc.icon)} ${tAc.label}</span>` : ''}
        ${tareaPend ? `<span class="accion-pill futura-pill" title="Nota de una tarea pendiente">${ico('reloj')} ${esc(tareaPend.titulo)}${tareaPend.fecha ? ` · ${fmtRelativa(tareaPend.fecha)}` : ''}</span>` : ''}
        <div class="nota-acciones">
          <button class="icon-btn" data-action="nota-pantalla" data-id="${n.id}" title="Abrir a pantalla completa">${ico('expandir')}</button>
          <button class="icon-btn ${n.fijada ? 'on' : ''}" data-action="fijar-nota" data-id="${n.id}" title="${n.fijada ? 'Desfijar' : 'Fijar arriba'}">${ico('pin')}</button>
          <button class="icon-btn" data-action="editar-nota" data-id="${n.id}" title="Editar">${ico('editar')}</button>
          <button class="icon-btn" data-action="borrar-nota" data-id="${n.id}" title="Eliminar">${ico('cerrar')}</button>
        </div>
      </header>
      ${n.titulo ? `<h4 class="${larga ? 'clicable' : ''}" ${larga ? `data-action="toggle-nota" data-id="${n.id}"` : ''}>${esc(n.titulo)}</h4>` : ''}
      ${contenido ? `<div class="nota-body md ${larga && !abierta ? 'colapsada' : ''}">${markdown(contenido)}</div>` : ''}
      ${larga ? `<button class="link-btn small ver-mas" data-action="toggle-nota" data-id="${n.id}">${abierta ? 'Ver menos ▴' : 'Ver más ▾'}</button>` : ''}
      ${n.telefono || n.email || n.hubspotId ? `
        <div class="nota-extra">
          ${n.telefono ? `<a href="tel:${esc(n.telefono)}">${ico('telefono')} ${esc(n.telefono)}</a>` : ''}
          ${n.email ? `<a href="mailto:${esc(n.email)}">${ico('correo')} ${esc(n.email)}</a>` : ''}
          ${n.hubspotId ? `<a href="${urlHubspot(n.hubspotId)}" target="_blank" rel="noopener">HubSpot ↗</a>${n.hubspotEstado ? ` <span class="muted">${esc(HUBSPOT_ESTADOS[n.hubspotEstado] || n.hubspotEstado)}</span>` : ''}` : ''}
        </div>` : ''}
    </article>`;
}

function accionHTML(a) {
  const t = tipoAccionDe(a.tipo);
  const n = a.noteId && nota(a.noteId);
  return `
    <div class="tl-item" style="--c:${t.color}">
      <span class="tl-punto" title="${t.label}">${ico(t.icon)}</span>
      <div class="tl-cuerpo" data-action="editar-accion" data-id="${a.id}" title="Editar acción">
        <div class="tl-cabecera">
          <strong>${t.label}</strong>
          <time>${fmtFecha(a.fecha)}${a.hora ? ` · ${conLocal(a.hora, a.fecha)}` : ''}</time>
        </div>
        ${a.resumen ? `<div class="tl-texto">${esc(a.resumen)}</div>` : ''}
        ${n ? `<button class="link-btn small" data-action="ver-nota" data-id="${n.id}">${ico('nota')} ${!n.titulo || n.titulo === a.resumen ? 'Ver nota' : esc(n.titulo)}</button>` : ''}
      </div>
    </div>`;
}

function accionFuturaHTML(t) {
  const ta = tipoAccionDe(t.accion);
  const vencida = t.fecha && t.fecha < hoy();
  return `
    <div class="tl-item futura" style="--c:${ta.color}">
      <span class="tl-punto" title="${ta.label}">${ico(ta.icon)}</span>
      <div class="tl-cuerpo" data-action="editar-tarea" data-id="${t.id}" title="Editar tarea">
        <div class="tl-cabecera">
          <strong>${esc(t.titulo)}</strong>
        </div>
        <div class="tl-texto ${vencida ? 'txt-danger' : ''}">
          ${t.fecha ? fmtRelativa(t.fecha) : 'Sin fecha'}${t.hora ? ` · ${conLocal(t.hora, t.fecha || hoy())}` : ''} · ${ta.label}
        </div>
        ${t.noteId && nota(t.noteId) ? `<button class="link-btn small" data-action="ver-nota" data-id="${t.noteId}">${ico('nota')} Ver nota</button>` : ''}
      </div>
      <div class="tl-botones">
        <button class="btn sm hecho-btn" data-action="completar-accion" data-id="${t.id}" title="Marcar como hecha y pasarla a Realizadas">✓</button>
        ${REUNIONES.includes(t.accion) ? `<button class="btn sm cancelada-btn" data-action="cancelar-reunion" data-id="${t.id}" title="La reunión no se hizo: pasa a Realizadas como «Reunión cancelada»">${ico('cancelado')}</button>` : ''}
      </div>
    </div>`;
}

// ---------- Modales ----------

function abrirModal(titulo, camposHTML, alGuardar) {
  modal.innerHTML = `
    <form class="modal-form">
      <h2>${esc(titulo)}</h2>
      ${camposHTML}
      <div class="modal-actions">
        <button type="button" class="btn danger-ghost modal-borrar" hidden>Eliminar</button>
        <span class="grow"></span>
        <button type="button" class="btn" data-cerrar>Cancelar</button>
        <button class="btn primary">Guardar</button>
      </div>
    </form>`;
  const form = $('form', modal);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(form));
    form.querySelectorAll('input[type=checkbox]').forEach((cb) => (datos[cb.name] = cb.checked));
    if (alGuardar(datos) !== false) modal.close();
  });
  $('[data-cerrar]', modal).addEventListener('click', () => modal.close());
  activarEditores(modal);
  activarTareas(modal);
  modal.showModal();
  $('input:not([type=hidden]), textarea, select', modal)?.focus();
}

// Muestra el botón "Eliminar" del modal abierto.
function botonBorrarModal(alBorrar) {
  const b = $('.modal-borrar', modal);
  b.hidden = false;
  b.addEventListener('click', () => {
    if (alBorrar() !== false) modal.close();
  });
}

modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});

// Esc con un editor a pantalla completa dentro del modal: sale de pantalla completa en vez de cerrar el modal.
modal.addEventListener('cancel', (e) => {
  const ta = $('.editor.completa textarea', modal);
  if (ta) {
    e.preventDefault();
    comandoEditor(ta, 'pantalla');
  }
});
modal.addEventListener('close', ajustarScroll);

function ajustarScroll() {
  document.body.classList.toggle('sin-scroll', !!document.querySelector('.editor.completa'));
}

// Nuevo contacto (opcionalmente ya en una empresa) o editar uno existente.
function modalContacto(c, companyId = '') {
  const nuevo = !c;
  const v = c || { estado: 'nuevo', ownerId: YO, companyId };
  abrirModal(nuevo ? 'Nuevo contacto' : 'Editar contacto', `
    ${campo('Nombre *', `<input name="nombre" required value="${esc(v.nombre)}">`)}
    <div class="row2">
      ${campo('Empresa', `<input name="empresa" list="lista-empresas" autocomplete="off" value="${esc(empresaDe(v))}" placeholder="Elige una o escribe una nueva">
        <datalist id="lista-empresas">${empresasOrdenadas().map((e) => `<option value="${esc(e.nombre)}">`).join('')}</datalist>`)}
      ${campo('Cargo', `<input name="cargo" value="${esc(v.cargo)}">`)}
    </div>
    <div class="row2">
      ${campo('Teléfono', `<input type="tel" name="telefono" value="${esc(v.telefono)}">`)}
      ${campo('Email', `<input type="email" name="email" value="${esc(v.email)}">`)}
    </div>
    <div class="row2">
      ${campo('Web', `<input name="web" value="${esc(v.web)}" placeholder="empresa.com">`)}
      ${campo('Ciudad', `<input name="ciudad" value="${esc(v.ciudad)}">`)}
    </div>
    <div class="row2">
      ${campo('Estado', `<select name="estado">${opciones(ESTADOS, v.estado)}</select>`)}
      ${campo('Origen', `<input name="origen" value="${esc(v.origen)}" placeholder="LinkedIn, referido, web…">`)}
    </div>
    <div class="row2">
      ${campo('Propietario', `<select name="ownerId">${opcionesUsuarios(v.ownerId)}</select>`)}
      ${campo('Etiquetas', `<input name="etiquetas" value="${esc((v.etiquetas || []).join(', '))}" placeholder="Separadas por comas">`)}
    </div>
  `, (d) => {
    if (!d.nombre.trim()) return false;
    // No puede haber dos contactos con el mismo email.
    const email = normalizar(d.email);
    const repetido = email && db.contacts.find((x) => x !== c && normalizar(x.email) === email);
    if (repetido) {
      alert(`Ya existe un contacto con el email ${d.email.trim()}: ${repetido.nombre}.`);
      return false;
    }
    const datos = {
      nombre: d.nombre.trim(),
      companyId: empresaPorNombre(d.empresa)?.id || null,
      ownerId: d.ownerId || null,
      cargo: d.cargo.trim(),
      email: d.email.trim(),
      telefono: d.telefono.trim(),
      web: d.web.trim(),
      ciudad: d.ciudad.trim(),
      estado: d.estado,
      origen: d.origen.trim(),
      etiquetas: [...new Set(d.etiquetas.split(',').map((s) => s.trim()).filter(Boolean))],
      actualizado: ahora(),
    };
    if (!datos.nombre) return false;
    if (!nuevo) ['horaDesde', 'horaHasta', 'horarioNotas'].forEach((k) => delete c[k]);
    if (nuevo) {
      const nc = { id: uid(), creado: ahora(), ...datos };
      db.contacts.push(nc);
      guardar();
      location.hash = '#/contacto/' + nc.id;
    } else {
      cambiarContacto(c, () => Object.assign(c, datos));
      guardar();
      render();
    }
  });
}

// Crea o actualiza la nota asociada a una tarea (la de "Nota"). Si la tarea es de un contacto, la nota se ve también en su ficha.
function guardarNotaDeTarea(t, contenido) {
  const texto = (contenido || '').trim();
  const existente = t.noteId && nota(t.noteId);
  if (existente) {
    if (existente.contenido !== texto && texto) Object.assign(existente, { contenido: texto, editado: ahora() });
    // Nota sin contacto (las antiguas "notas sueltas") de una tarea que ahora tiene contacto: pasa a ser del contacto.
    const c = !existente.contactId && contacto(t.contactId);
    if (c) {
      existente.contactId = c.id;
      cambiarContacto(c, () => {
        if (!c.telefono && existente.telefono) c.telefono = existente.telefono;
        if (!c.email && existente.email) c.email = existente.email;
      });
      if (!c.hubspotId && existente.hubspotId) Object.assign(c, { hubspotId: existente.hubspotId, hubspotEstado: existente.hubspotEstado });
    }
    return;
  }
  if (!texto) return;
  const n = {
    id: uid(), contactId: t.contactId, tipo: ACCION_A_NOTA[t.accion] || 'general', titulo: t.titulo,
    contenido: texto, fecha: hoy(), fijada: false, creado: ahora(),
  };
  db.notes.push(n);
  t.noteId = n.id;
}

// Editar una tarea, o crear una nueva (`nueva` con contactId/accion por defecto, p. ej. desde "+ Planear").
function modalTarea(t, nueva = null) {
  const creando = !t;
  const v = t || { titulo: '', detalle: '', contactId: nueva?.contactId || null, accion: nueva?.accion || null, fecha: fechaAtajo('manana'), hora: '', prioridad: 'ninguna', hecha: false };
  const n = v.noteId && nota(v.noteId);
  abrirModal(creando ? (v.accion ? 'Planear acción' : 'Nueva tarea') : 'Editar tarea', `
    ${campo('Tarea *', tituloNlp(v.titulo, v.accion ? 'Ej. Llamar el jueves a las 17 para ver qué le pareció la propuesta' : 'Puedes escribir la fecha: mañana, el lunes, a las 17…'))}
    <div class="row2">
      ${campo('Contacto', `<select name="contactId">
        <option value="">Sin contacto</option>
        ${contactosOrdenados().map((c) => `<option value="${c.id}" ${c.id === v.contactId ? 'selected' : ''}>${esc(c.nombre)}${empresaDe(c) ? ` · ${esc(empresaDe(c))}` : ''}</option>`).join('')}
      </select>`)}
      ${campo('Tipo de acción', `<select name="accion" ${creando ? '' : 'data-manual="1"'}>
        <option value="">Tarea interna</option>
        ${opciones(TIPOS_ACCION, v.accion)}
      </select>`)}
    </div>
    <div class="row3">
      ${campo('Fecha', campoFecha('fecha', v.fecha))}
      ${campo('Hora (España)', `<input type="time" name="hora" value="${esc(v.hora)}">`)}
      ${campo('Prioridad', `<select name="prioridad">${opciones(PRIORIDADES, v.prioridad)}</select>`)}
    </div>
    <div class="row2">
      ${campo('Detalle', `<input name="detalle" value="${esc(v.detalle)}" placeholder="Una línea de contexto (opcional)">`)}
      ${campo('Lista', campoLista(v.lista), `campo-lista ${v.contactId ? 'oculto' : ''}`)}
    </div>
    ${n && !n.contactId && (n.titulo || n.telefono) ? `
      <p class="muted small">${ico('nota')} ${esc(n.titulo)}${n.telefono ? ` · <a href="tel:${esc(n.telefono)}">${ico('telefono')} ${esc(n.telefono)}</a>` : ''}. Al elegirle un contacto, la nota pasa a su ficha.</p>` : ''}
    <div class="field"><span>${ico('nota')} Nota asociada ${n ? '' : '(opcional)'}</span>${editorHTML('nota', n?.contenido || '', 6, 'Lo importante para esta acción: qué preguntar, qué llevar preparado…')}</div>
    ${creando ? '' : `<label class="check"><input type="checkbox" name="hecha" ${v.hecha ? 'checked' : ''}> Completada${v.cancelada ? ' (reunión cancelada)' : ''}</label>`}
  `, (d) => {
    const titulo = tituloLimpio($('[name=titulo]', modal));
    if (!titulo) return false;
    const tt = t || { id: uid(), hecha: false, completada: null, creado: ahora() };
    const antes = tt.contactId;
    Object.assign(tt, {
      titulo,
      detalle: d.detalle.trim(),
      contactId: d.contactId || null,
      lista: (!d.contactId && d.lista?.trim()) || null,
      accion: d.accion || null,
      fecha: d.fecha || null,
      hora: d.hora || null,
      prioridad: d.prioridad,
    });
    if (creando) db.tasks.push(tt);
    guardarNotaDeTarea(tt, d.nota);
    if (!creando && d.hecha !== tt.hecha) marcarTarea(tt, d.hecha);
    tocar(antes);
    tocar(tt.contactId);
    guardar();
    render();
  });
  // La lista solo tiene sentido en las tareas sin contacto.
  $('form', modal).contactId.addEventListener('change', (e) => $('.campo-lista', modal).classList.toggle('oculto', !!e.target.value));
  if (!creando) {
    botonBorrarModal(() => {
      if (!confirm(`¿Eliminar la tarea "${t.titulo}"?${n && n.contactId ? ' Su nota se conserva.' : ''}${avisoSecuencia(t)}`)) return false;
      borrarTarea(t);
      guardar();
      render();
    });
  }
}

// Editar una nota, o crear una nueva para `contactId` (botón «Nota» de la tarjeta del contacto).
function modalNota(n, pantallaCompleta = false, contactId = null) {
  const nueva = !n;
  const v = n || { tipo: 'general', fecha: hoy(), titulo: '', contenido: '', fijada: false };
  abrirModal(nueva ? 'Nueva nota' : 'Editar nota', `
    <div class="row2">
      ${campo('Tipo', `<select name="tipo">${opciones(TIPOS_NOTA.filter((t) => !t.auto || t.id === v.tipo), v.tipo)}</select>`)}
      ${campo('Fecha', `<input type="date" name="fecha" value="${esc(v.fecha)}">`)}
    </div>
    ${campo('Título', `<input name="titulo" value="${esc(v.titulo)}" placeholder="${nueva ? 'Opcional' : ''}">`)}
    <div class="field"><span>Contenido</span>${editorHTML('contenido', v.contenido, nueva ? 8 : 14, nueva ? 'Escribe la nota… (**negrita**, - listas, 1. listas numeradas, enlaces)' : '')}</div>
    ${nueva ? `
      <div class="registrar-accion">
        <span>${ico('rayo')} Registrar también como acción</span>
        <select name="accion">
          <option value="">No</option>
          ${opciones(TIPOS_ACCION, '')}
        </select>
      </div>` : ''}
    <label class="check"><input type="checkbox" name="fijada" ${v.fijada ? 'checked' : ''}> ${ico('pin')} Fijar arriba</label>
  `, (d) => {
    const titulo = d.titulo.trim();
    const contenido = d.contenido.trim();
    if (!titulo && (!contenido || contenido === tipoDe(d.tipo).plantilla?.trim())) return false;
    const datos = { tipo: d.tipo, fecha: d.fecha || hoy(), titulo, contenido, fijada: d.fijada };
    if (nueva) {
      const nn = { id: uid(), contactId, ...datos, creado: ahora() };
      db.notes.push(nn);
      if (d.accion) {
        const primeraLinea = contenido.split('\n').find((l) => l.trim())?.replace(/[*#>-]/g, '').trim() || '';
        db.actions.push({
          id: uid(), contactId, tipo: d.accion, fecha: nn.fecha, hora: null,
          resumen: titulo || primeraLinea.slice(0, 120), noteId: nn.id, taskId: null, creado: ahora(),
        });
      }
    } else {
      Object.assign(n, datos, { editado: ahora() });
    }
    tocar(contactId || n.contactId);
    guardar();
    render();
  });
  if (nueva) {
    const form = $('form', modal);
    form.addEventListener('change', (e) => {
      if (e.target.name === 'accion') form.dataset.accionManual = '1';
      if (e.target.name !== 'tipo') return;
      // Al elegir "Videollamada" con la nota vacía, se rellena la plantilla; si se cambia de tipo sin tocarla, se quita.
      const plantilla = tipoDe(e.target.value).plantilla;
      const esPlantilla = TIPOS_NOTA.some((t) => t.plantilla && t.plantilla === form.contenido.value);
      if (!form.contenido.value.trim() || esPlantilla) form.contenido.value = plantilla || '';
      // Mientras no se haya elegido a mano, la acción sigue al tipo de nota (nota de llamada → acción "Llamada").
      if (form.dataset.accionManual !== '1') form.accion.value = NOTA_A_ACCION[e.target.value] || '';
    });
    form.titulo.focus();
  }
  if (pantallaCompleta) comandoEditor($('textarea[name=contenido]', modal), 'pantalla');
}

// Registrar una acción nueva (con una nota opcional) o editar una existente.
function modalAccion(contactId, a) {
  const nueva = !a;
  const v = a || { tipo: 'llamada', fecha: hoy(), hora: '', resumen: '' };
  const n = a?.noteId && nota(a.noteId);
  abrirModal(nueva ? 'Registrar acción' : 'Editar acción', `
    <div class="row3">
      ${campo('Tipo', `<select name="tipo">${opciones(TIPOS_ACCION, v.tipo)}</select>`)}
      ${campo('Fecha', `<input type="date" name="fecha" required value="${esc(v.fecha)}">`)}
      ${campo('Hora (España)', `<input type="time" name="hora" value="${esc(v.hora)}">`)}
    </div>
    <p class="muted small">Para algo que todavía no has hecho, usa <b>+ Planear</b>: queda como acción próxima.</p>
    ${campo('Resumen', `<input name="resumen" value="${esc(v.resumen)}" placeholder="Ej. Le he mandado la propuesta por WhatsApp">`)}
    ${n
      ? `<p class="muted small">${ico('nota')} Tiene asociada la nota «${esc(n.titulo || fmtFecha(n.fecha))}». Edítala desde la columna de notas.</p>`
      : `<div class="field"><span>Nota asociada (opcional)</span>${editorHTML('nota', '', 6, 'Se guardará como nota de este contacto, enlazada a la acción')}</div>`}
  `, (d) => {
    const datos = { tipo: d.tipo, fecha: d.fecha || hoy(), hora: d.hora || null, resumen: d.resumen.trim() };
    let ac = a;
    if (nueva) {
      ac = { id: uid(), contactId, noteId: null, taskId: null, creado: ahora(), ...datos };
      db.actions.push(ac);
    } else {
      Object.assign(ac, datos);
    }
    if (d.nota?.trim()) {
      const nn = {
        id: uid(), contactId, tipo: ACCION_A_NOTA[d.tipo] || 'general', titulo: datos.resumen,
        contenido: d.nota.trim(), fecha: datos.fecha, fijada: false, creado: ahora(),
      };
      db.notes.push(nn);
      ac.noteId = nn.id;
    }
    tocar(contactId);
    guardar();
    render();
  });
  if (!nueva) {
    botonBorrarModal(() => {
      if (!confirm('¿Eliminar esta acción? La nota asociada, si la hay, se conserva.')) return false;
      db.actions = db.actions.filter((x) => x.id !== a.id);
      guardar();
      render();
    });
  }
}

// ---------- Acciones de la interfaz ----------

const acciones = {
  'nuevo-contacto': () => modalContacto(),
  'editar-contacto': (el) => modalContacto(contacto(el.dataset.id)),
  'abrir-contacto': (el) => { location.hash = '#/contacto/' + el.dataset.id; },
  'borrar-contacto': (el) => {
    const c = contacto(el.dataset.id);
    const nNotas = db.notes.filter((n) => n.contactId === c.id).length;
    const nTareas = db.tasks.filter((t) => t.contactId === c.id).length;
    const nAcciones = db.actions.filter((a) => a.contactId === c.id).length;
    if (!confirm(`¿Eliminar a ${c.nombre}?\n\nSe borrarán también sus ${nNotas} notas, ${nTareas} tareas y ${nAcciones} acciones. No se puede deshacer.`)) return;
    db.contacts = db.contacts.filter((x) => x.id !== c.id);
    db.notes = db.notes.filter((n) => n.contactId !== c.id);
    db.tasks = db.tasks.filter((t) => t.contactId !== c.id);
    db.actions = db.actions.filter((a) => a.contactId !== c.id);
    db.enrollments = db.enrollments.filter((e) => e.contactId !== c.id);
    guardar();
    location.hash = '#/';
  },
  // Tabla de contactos: vistas, orden y acciones masivas
  'vista-contactos': (el) => { cargarVista(el.dataset.id); render(); },
  'nueva-vista': (el) => modalVista(null, !!el.dataset.conFiltros),
  'renombrar-vista': () => modalVista(vistaActual()),
  'guardar-vista': () => {
    Object.assign(vistaActual(), { filtros: { ...ui.filtros }, orden: { ...ui.orden } });
    guardar();
    render();
    avisar('Vista guardada');
  },
  'restablecer-vista': () => { cargarVista(ui.vistaId); render(); },
  'borrar-vista': () => {
    const v = vistaActual();
    if (!confirm(`¿Eliminar la vista «${v.nombre}»? Los contactos no se tocan.`)) return;
    db.views = db.views.filter((x) => x.id !== v.id);
    cargarVista('todos');
    guardar();
    render();
  },
  'ordenar': (el) => {
    const campo = el.dataset.campo;
    ui.orden = { campo, dir: ui.orden.campo === campo && ui.orden.dir === 'asc' ? 'desc' : 'asc' };
    renderTablaContactos();
  },
  'quitar-seleccion': () => { ui.seleccion.clear(); renderTablaContactos(); },
  'masivo-propietario': () => modalMasivo('Asignar propietario', campo('Propietario', `<select name="ownerId">${opcionesUsuarios(YO)}</select>`), (c, d) => (c.ownerId = d.ownerId || null)),
  'masivo-estado': () => modalMasivo('Cambiar estado', campo('Estado', `<select name="estado">${opciones(ESTADOS, 'contactado')}</select>`), (c, d) => (c.estado = d.estado)),
  'masivo-secuencia': () => modalInscribir(seleccionados(), () => ui.seleccion.clear()),
  'masivo-borrar': () => {
    const lista = seleccionados();
    if (!confirm(`¿Eliminar ${lista.length} contacto${lista.length === 1 ? '' : 's'} con todas sus notas, tareas y acciones? No se puede deshacer.`)) return;
    const ids = new Set(lista.map((c) => c.id));
    db.contacts = db.contacts.filter((c) => !ids.has(c.id));
    db.notes = db.notes.filter((n) => !ids.has(n.contactId));
    db.tasks = db.tasks.filter((t) => !ids.has(t.contactId));
    db.actions = db.actions.filter((a) => !ids.has(a.contactId));
    db.enrollments = db.enrollments.filter((e) => !ids.has(e.contactId));
    ui.seleccion.clear();
    guardar();
    render();
  },
  // Empresas
  'nueva-empresa': () => modalEmpresa(),
  'editar-empresa': (el) => modalEmpresa(empresa(el.dataset.id)),
  'abrir-empresa': (el) => { location.hash = '#/empresa/' + el.dataset.id; },
  'nuevo-contacto-empresa': (el) => modalContacto(null, el.dataset.id),
  'borrar-empresa': (el) => {
    const e = empresa(el.dataset.id);
    const n = contactosDeEmpresa(e.id).length;
    if (!confirm(`¿Eliminar la empresa «${e.nombre}»?${n ? ` Sus ${n} contactos se conservan, sin empresa.` : ''}`)) return;
    db.contacts.forEach((c) => { if (c.companyId === e.id) c.companyId = null; });
    db.companies = db.companies.filter((x) => x.id !== e.id);
    guardar();
    location.hash = '#/empresas';
  },
  // Equipo
  'nuevo-usuario': () => modalUsuario(),
  'editar-usuario': (el) => modalUsuario(usuario(el.dataset.id)),
  'ver-contactos-de': (el) => {
    cargarVista('todos');
    ui.filtros.ownerId = el.dataset.id;
    location.hash = '#/';
  },
  // Secuencias
  'nueva-secuencia': () => modalSecuencia(),
  'editar-secuencia': (el) => modalSecuencia(secuencia(el.dataset.id)),
  'abrir-secuencia': (el) => { location.hash = '#/secuencias/' + el.dataset.id; },
  'borrar-secuencia': (el) => {
    const s = secuencia(el.dataset.id);
    const activas = db.enrollments.filter((e) => e.sequenceId === s.id && e.estado === 'activa');
    if (!confirm(`¿Eliminar la secuencia «${s.nombre}»?${activas.length ? `\n\nSe sacará a ${activas.length} contacto${activas.length === 1 ? '' : 's'} y se borrará su tarea pendiente de la secuencia.` : ''}`)) return;
    activas.forEach(sacarDeSecuencia);
    db.enrollments = db.enrollments.filter((e) => e.sequenceId !== s.id);
    db.tasks.forEach((t) => { if (t.enrollmentId && !inscripcion(t.enrollmentId)) { delete t.enrollmentId; delete t.paso; delete t.siguienteId; } });
    db.sequences = db.sequences.filter((x) => x.id !== s.id);
    guardar();
    location.hash = '#/secuencias';
  },
  'nuevo-paso': (el) => modalPaso(secuencia(el.dataset.id)),
  'editar-paso': (el) => modalPaso(secuencia(el.dataset.id), +el.dataset.i),
  'mover-paso': (el) => {
    const s = secuencia(el.dataset.id);
    const i = +el.dataset.i;
    const j = i + +el.dataset.d;
    if (j < 0 || j >= s.pasos.length) return;
    [s.pasos[i], s.pasos[j]] = [s.pasos[j], s.pasos[i]];
    guardar();
    render();
  },
  'inscribir-en': (el) => modalElegirContactos(secuencia(el.dataset.id)),
  'inscribir-contacto': (el) => modalInscribir([contacto(el.dataset.id)]),
  'sacar-secuencia': (el) => {
    const ins = inscripcion(el.dataset.id);
    const c = contacto(ins.contactId);
    if (!confirm(`¿Sacar a ${c.nombre} de «${secuencia(ins.sequenceId)?.nombre}»? Se borrará su tarea pendiente de la secuencia.`)) return;
    sacarDeSecuencia(ins);
    guardar();
    render();
  },
  'vista-tareas': (el) => { ui.tareasVista = el.dataset.vista; ui.editor = null; render(); },
  'nueva-vista-tareas': () => modalVistaTareas(),
  'editar-vista-tareas': (el) => modalVistaTareas(vistaTareaPropia(el.dataset.id)),
  'empezar-tareas': (el) => empezarSecuencia(el.dataset.origen === 'tareas' ? tareasDeLaVista() : tareasParaHoy(), el.dataset.origen),
  'sq-salir': () => salirDeCola(),
  'sq-ir': (el) => irEnCola(+el.dataset.i),
  'sq-anterior': () => irEnCola(ui.cola.i - 1),
  'sq-saltar': () => saltarEnCola(),
  'sq-completar': () => completarActualEnCola(),
  'sq-cancelada': () => completarEnCola(true),
  'sq-posponer': () => posponerEnCola(),
  'sq-reabrir': () => {
    marcarTarea(tarea(ui.cola.ids[ui.cola.i]), false);
    guardar();
    render();
  },
  'sq-reiniciar': () => empezarSecuencia(tareasParaHoy(), 'hoy'),
  'toggle-tarea': (el) => {
    const t = tarea(el.dataset.id);
    const fila = el.closest('.td-tarea');
    if (t.hecha) {
      marcarTarea(t, false);
      guardar();
      render();
    } else if (!fila?.classList.contains('completando')) {
      // Como en Todoist: se ve la marca un momento antes de que la tarea desaparezca.
      fila?.classList.add('completando');
      setTimeout(() => completarTarea(t), 280);
    }
  },
  'completar-accion': (el) => completarTarea(tarea(el.dataset.id)),
  'cancelar-reunion': (el) => completarTarea(tarea(el.dataset.id), true),
  'abrir-editor': (el) => {
    ui.editor = { clave: el.dataset.clave };
    ui.enfocarTarea = true;
    render();
  },
  'reprogramar-vencidas': () => {
    const h = hoy();
    const antes = db.tasks.filter((t) => !t.hecha && t.fecha && t.fecha < h).map((t) => [t, t.fecha]);
    antes.forEach(([t]) => (t.fecha = h));
    guardar();
    render();
    avisar(`${antes.length} tarea${antes.length === 1 ? '' : 's'} movida${antes.length === 1 ? '' : 's'} a hoy`, () => {
      antes.forEach(([t, f]) => (t.fecha = f));
      guardar();
      render();
    });
  },
  'editar-tarea': (el) => modalTarea(tarea(el.dataset.id)),
  // Desde la lista de Tareas: se abre la ficha del contacto con la tarea arriba («Tarea 2 de 10»),
  // y desde ahí se puede seguir con las demás tareas de la vista.
  'ir-a-tarea': (el) => {
    const t = tarea(el.dataset.id);
    const lista = tareasDeLaVista();
    const i = lista.findIndex((x) => x.id === t.id);
    if (i >= 0) return empezarSecuencia(lista, 'tareas', i);
    ui.tareaDestacada = t.id; // completada: solo se abre la ficha
    location.hash = '#/contacto/' + t.contactId;
  },
  'nueva-lista': () => abrirModal('Nueva lista', campo('Nombre de la lista *', '<input name="nombre" required placeholder="Ej. Administración, Marketing, Producto…">'), (d) => {
    const nombre = d.nombre.trim().replace(/^#\s*/, '');
    if (!nombre) return false;
    ui.listasNuevas.add(nombre);
    ui.editor = { clave: 'lista-' + nombre };
    ui.enfocarTarea = true;
    render();
  }),
  'borrar-tarea': (el) => {
    const t = tarea(el.dataset.id);
    if (!confirm(`¿Eliminar la tarea "${t.titulo}"?${avisoSecuencia(t)}`)) return;
    borrarTarea(t);
    guardar();
    render();
  },
  'filtro-nota': (el) => { ui.notaFiltro = el.dataset.tipo; render(); },
  'toggle-nota': (el) => {
    const id = el.dataset.id;
    if (ui.notasAbiertas.has(id)) ui.notasAbiertas.delete(id);
    else ui.notasAbiertas.add(id);
    const art = document.getElementById('nota-' + id);
    if (art) art.outerHTML = notaHTML(nota(id));
  },
  'ver-nota': (el) => {
    const id = el.dataset.id;
    ui.notaFiltro = '';
    ui.notasContactoQ = '';
    ui.notasAbiertas.add(id);
    render();
    const art = document.getElementById('nota-' + id);
    if (art) {
      art.scrollIntoView({ behavior: 'smooth', block: 'center' });
      art.classList.add('destacada');
      setTimeout(() => art.classList.remove('destacada'), 1600);
    }
  },
  'fijar-nota': (el) => {
    const n = nota(el.dataset.id);
    n.fijada = !n.fijada;
    guardar();
    render();
  },
  'editar-nota': (el) => modalNota(nota(el.dataset.id)),
  'borrar-nota': (el) => {
    const id = el.dataset.id;
    const ac = db.actions.find((a) => a.noteId === id);
    if (!confirm(ac ? '¿Eliminar esta nota? La acción asociada se conserva, sin nota.' : '¿Eliminar esta nota?')) return;
    db.notes = db.notes.filter((n) => n.id !== id);
    db.actions.forEach((a) => { if (a.noteId === id) a.noteId = null; });
    guardar();
    render();
  },
  'nueva-accion': (el) => modalAccion(el.dataset.id),
  'nueva-nota': (el) => modalNota(null, false, el.dataset.id),
  'mandar-email': () => {
    ui.fichaTab = 'correo';
    render();
    $('.correo-escribir [name=asunto]', app)?.focus();
  },
  'ficha-tab': (el) => { ui.fichaTab = el.dataset.tab; ui.editor = null; render(); },
  // Importar CSV y propiedades de empresa
  'importar-csv': () => modalImportar(),
  'ver-importacion': (el) => {
    cargarVista('todos');
    ui.filtros.importacion = el.dataset.nombre;
    if (rutaActual().ruta) location.hash = '#/';
    else render();
  },
  'nueva-prop-empresa': () => modalPropEmpresa(),
  'editar-prop-empresa': (el) => modalPropEmpresa(db.settings.propsEmpresaExtra.find((p) => p.id === el.dataset.id)),
  'borrar-prop-empresa': (el) => {
    const p = db.settings.propsEmpresaExtra.find((x) => x.id === el.dataset.id);
    const n = db.companies.filter((e) => e.extra?.[p.id]).length;
    if (!confirm(`¿Eliminar la propiedad «${p.label}»?${n ? ` Se borrará su valor en ${n} empresa${n === 1 ? '' : 's'}.` : ''}\n\nSi solo quieres dejar de verla, desactívala.`)) return;
    db.settings.propsEmpresaExtra = db.settings.propsEmpresaExtra.filter((x) => x !== p);
    db.settings.propsEmpresaOcultas = db.settings.propsEmpresaOcultas.filter((id) => id !== p.id);
    db.companies.forEach((e) => { if (e.extra) delete e.extra[p.id]; });
    guardar();
    render();
  },
  'llamar': (el) => abrirLlamada(el.dataset.id),
  'abrir-llamada': (el) => { abrirLlamada(el.dataset.id, el.dataset.tarea || null); render(); },
  'planear-accion': (el) => modalTarea(null, { contactId: el.dataset.id, accion: 'llamada' }),
  'nota-pantalla': (el) => modalNota(nota(el.dataset.id), true),
  'editar-accion': (el) => {
    const a = accion(el.dataset.id);
    modalAccion(a.contactId, a);
  },
};

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  // Un enlace, select o botón dentro de un elemento clicable (p. ej. una fila) hace lo suyo, no abre la fila.
  const interactivo = e.target.closest('a, select, input, textarea, button, label');
  if (interactivo && interactivo !== el && el.contains(interactivo)) return;
  acciones[el.dataset.action]?.(el, e);
});

app.addEventListener('change', (e) => {
  if (!e.target.matches('.estado-select, .propietario-select')) return;
  const c = contacto(e.target.dataset.id);
  cambiarContacto(c, () => {
    if (e.target.matches('.estado-select')) c.estado = e.target.value;
    else c.ownerId = e.target.value || null;
  });
  c.actualizado = ahora();
  guardar();
  render();
});

// Datos de versiones anteriores: la empresa era un texto en cada contacto y no había propietarios.
function migrar() {
  let cambios = false;
  if (!db.users.some((u) => u.id === YO)) {
    db.users.unshift({ id: YO, nombre: 'Martín', email: '', creado: ahora() });
    cambios = true;
  }
  db.contacts.forEach((c) => {
    if ('empresa' in c) {
      c.companyId = empresaPorNombre(c.empresa || '')?.id || null;
      // La web y la ciudad del contacto eran en realidad las de su empresa.
      const e = empresa(c.companyId);
      if (e && !e.web && c.web) e.web = c.web;
      if (e && !e.ciudad && c.ciudad) e.ciudad = c.ciudad;
      delete c.empresa;
      cambios = true;
    }
    if (!('ownerId' in c)) {
      c.ownerId = YO;
      cambios = true;
    }
  });
  if (cambios) guardar();
}

// ---------- Arranque ----------

window.addEventListener('hashchange', () => {
  ui.editor = null;
  render();
  window.scrollTo(0, 0);
});

// Cada minuto se actualizan el reloj y los contadores del menú.
setInterval(actualizarBadges, 60 * 1000);

(async function iniciar() {
  try {
    const r = await fetch('/api/data');
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    db = await r.json();
  } catch (err) {
    app.innerHTML = `<div class="empty card"><p><strong>No se pudieron cargar los datos.</strong></p><p class="muted">${esc(err.message)}</p></div>`;
    return;
  }
  db.contacts ||= [];
  db.notes ||= [];
  db.tasks ||= [];
  db.actions ||= [];
  db.companies ||= [];
  db.users ||= [];
  db.views ||= [];
  db.taskViews ||= [];
  db.imports ||= [];
  db.sequences ||= [];
  db.enrollments ||= [];
  db.settings = { ...AJUSTES_DEFECTO, ...db.settings };
  db.settings.propsEmpresaOcultas ||= [];
  db.settings.propsEmpresaExtra ||= [];
  migrar();
  render();
})();
