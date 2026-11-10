// Dashboard (#/dashboard): una primera versión con las cifras del periodo, las llamadas por día,
// los resultados de las llamadas y el embudo de contactos.
import { estadisticas, PERIODOS, rangoDe } from './store.js';
import { fmtDuracion } from '../call/store.js';
import { fmtFecha } from '../../shared/lib/dates.js';
import { esc } from '../../shared/lib/text.js';
import { render } from '../../shared/router.js';
import { ui } from '../../shared/state.js';
import { $, app } from '../../shared/ui/dom.js';
import { ico } from '../../shared/ui/icons.js';

const fmtNum = (/** @type {number} */ n) => n.toLocaleString('es-ES');

/**
 * Una cifra destacada.
 * @param {string} label
 * @param {string} valor
 * @param {string} [detalle]
 */
const cifra = (label, valor, detalle = '') => `
  <div class="card db-cifra">
    <span class="db-cifra-label">${label}</span>
    <strong class="db-cifra-valor">${valor}</strong>
    ${detalle ? `<span class="db-cifra-detalle">${detalle}</span>` : '<span class="db-cifra-detalle">&nbsp;</span>'}
  </div>`;

/**
 * Barras horizontales (una sola serie, un solo color): etiqueta, barra y número.
 * @param {{ label: string, n: number }[]} filas
 */
function barrasHorizontales(filas) {
  const max = Math.max(1, ...filas.map((f) => f.n));
  return `
    <div class="db-hbarras">
      ${filas.map((f) => `
        <div class="db-hfila" title="${esc(f.label)}: ${f.n}">
          <span class="db-hlabel">${esc(f.label)}</span>
          <span class="db-hpista"><span class="db-hbarra" style="width:${f.n ? Math.max(2, (f.n / max) * 100) : 0}%"></span></span>
          <span class="db-hvalor">${fmtNum(f.n)}</span>
        </div>`).join('')}
    </div>`;
}

/**
 * Llamadas por día (o por semana si el periodo es largo), en columnas, con el detalle al pasar el ratón.
 * @param {{ dia: string, llamadas: number, conectadas: number }[]} porDia
 */
function graficoLlamadas(porDia) {
  // Más de dos meses: se agrupan por semanas para que las columnas no queden como hilos.
  const porSemana = porDia.length > 62;
  /** @type {{ desde: string, hasta: string, llamadas: number, conectadas: number }[]} */
  const grupos = [];
  porDia.forEach((d, i) => {
    if (!porSemana || i % 7 === 0) grupos.push({ desde: d.dia, hasta: d.dia, llamadas: 0, conectadas: 0 });
    const g = grupos[grupos.length - 1];
    g.hasta = d.dia;
    g.llamadas += d.llamadas;
    g.conectadas += d.conectadas;
  });
  const max = Math.max(1, ...grupos.map((g) => g.llamadas));
  const nombre = (/** @type {typeof grupos[number]} */ g) => (porSemana ? `Semana del ${fmtFecha(g.desde)}` : fmtFecha(g.desde));
  return `
    <div class="db-columnas" style="--n:${grupos.length}" role="img" aria-label="Llamadas ${porSemana ? 'por semana' : 'por día'}: máximo ${max}">
      <span class="db-eje-max">${max}</span>
      ${grupos.map((g) => `
        <div class="db-col" tabindex="0">
          <span class="db-barra" style="height:${g.llamadas ? Math.max(2, (g.llamadas / max) * 100) : 0}%"></span>
          <span class="db-tip"><b>${nombre(g)}</b>${fmtNum(g.llamadas)} llamada${g.llamadas === 1 ? '' : 's'} · ${fmtNum(g.conectadas)} conectada${g.conectadas === 1 ? '' : 's'}</span>
        </div>`).join('')}
    </div>
    <div class="db-eje-x"><span>${fmtFecha(grupos[0].desde)}</span><span>${fmtFecha(grupos[grupos.length - 1].hasta)}</span></div>
    <details class="db-tabla small">
      <summary>Ver como tabla</summary>
      <table class="tabla">
        <thead><tr><th>${porSemana ? 'Semana' : 'Día'}</th><th>Llamadas</th><th>Conectadas</th></tr></thead>
        <tbody>${grupos.filter((g) => g.llamadas).map((g) => `<tr><td>${nombre(g)}</td><td>${g.llamadas}</td><td>${g.conectadas}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Sin llamadas en el periodo.</td></tr>'}</tbody>
      </table>
    </details>`;
}

export function vistaDashboard() {
  const periodo = PERIODOS.some((p) => p.id === ui.dashboardPeriodo) ? ui.dashboardPeriodo : '30';
  const { desde, hasta } = rangoDe(periodo);
  const e = estadisticas(desde, hasta);
  const pct = e.tasaConexion === null ? '—' : `${Math.round(e.tasaConexion * 100)} %`;
  app.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Dashboard</h1>
        <p class="muted small">${fmtFecha(desde)} – ${fmtFecha(hasta)}</p>
      </div>
      <select id="db-periodo" aria-label="Periodo">
        ${PERIODOS.map((p) => `<option value="${p.id}" ${p.id === periodo ? 'selected' : ''}>${p.label}</option>`).join('')}
      </select>
    </div>

    <div class="db-cifras">
      ${cifra(`${ico('telefono')} Llamadas`, fmtNum(e.llamadas), `${fmtNum(e.conectadas)} conectadas · ${pct}`)}
      ${cifra(`${ico('reloj')} Tiempo hablado`, e.minutos ? `${fmtNum(e.minutos)} min` : '—', e.conectadas ? `${fmtDuracion(Math.round((e.minutos * 60) / Math.max(1, e.conectadas)))} de media` : '')}
      ${cifra(`${ico('reunion')} Reuniones agendadas`, fmtNum(e.reunionesAgendadas), `${fmtNum(e.reunionesHechas)} hechas${e.reunionesCanceladas ? ` · ${fmtNum(e.reunionesCanceladas)} canceladas` : ''}`)}
      ${cifra(`${ico('chat')} WhatsApp y emails`, fmtNum(e.whatsapp + e.emails), `${fmtNum(e.whatsapp)} WhatsApp · ${fmtNum(e.emails)} emails`)}
      ${cifra(`${ico('persona')} Contactos nuevos`, fmtNum(e.contactosNuevos), e.propuestas ? `${fmtNum(e.propuestas)} propuestas enviadas` : '')}
      ${cifra(`${ico('check')} Tareas completadas`, fmtNum(e.tareasCompletadas))}
    </div>

    <section class="card pad db-panel">
      <h3>Llamadas ${e.porDia.length > 62 ? 'por semana' : 'por día'}</h3>
      ${graficoLlamadas(e.porDia)}
    </section>

    <div class="db-dos">
      <section class="card pad db-panel">
        <h3>Resultado de las llamadas</h3>
        ${e.llamadas ? barrasHorizontales(e.resultados) : '<p class="muted small">Sin llamadas en el periodo.</p>'}
      </section>
      <section class="card pad db-panel">
        <h3>Contactos por estado <span class="muted small">· ahora</span></h3>
        ${barrasHorizontales(e.embudo)}
      </section>
    </div>`;
  $('#db-periodo').addEventListener('change', (/** @type {Event} */ ev) => {
    ui.dashboardPeriodo = /** @type {HTMLSelectElement} */ (ev.target).value;
    render();
  });
}

