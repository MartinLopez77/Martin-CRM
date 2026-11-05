// Markdown sencillo de las notas: negrita, listas (con sangría y numeradas) y enlaces.
import { esc } from './text.js';

/** @param {string} s ya escapado: solo se añaden etiquetas propias */
function mdInline(s) {
  return s
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/**
 * Convierte el texto de una nota en HTML (escapado).
 * @param {string} texto
 */
export function markdown(texto) {
  const lineas = esc(texto).replace(/\t/g, '  ').split('\n');
  let html = '';
  /** @type {string[]} */
  let parrafo = [];
  /** @type {{ tipo: 'ul' | 'ol', sangria: number }[]} listas abiertas */
  const pila = [];

  const cerrarParrafo = () => {
    if (parrafo.length) html += `<p>${parrafo.map(mdInline).join('<br>')}</p>`;
    parrafo = [];
  };
  const cerrarListas = (hasta = -1) => {
    while (pila.length && pila[pila.length - 1].sangria > hasta) html += `</li></${/** @type {{ tipo: string }} */ (pila.pop()).tipo}>`;
  };
  /** @param {'ul' | 'ol'} tipo @param {number} sangria @param {number} num */
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
          html += `</li></${/** @type {{ tipo: string }} */ (pila.pop()).tipo}>`;
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
