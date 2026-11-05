// Lectura de archivos CSV (los exportados por Excel o HubSpot).

/**
 * Filas de un CSV con comas, punto y coma o tabuladores (se detecta solo) y comillas dobles.
 * Se descartan las filas vacías.
 * @param {string} texto
 * @returns {string[][]}
 */
export function leerCSV(texto) {
  texto = texto.replace(/^\uFEFF/, '');
  const primera = texto.split(/\r?\n/, 1)[0];
  const sep = [',', ';', '\t'].reduce((a, b) => (primera.split(b).length > primera.split(a).length ? b : a));
  /** @type {string[][]} */
  const filas = [];
  /** @type {string[]} */
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

/**
 * Texto de un archivo. Los CSV de Excel en español suelen venir en Windows-1252, no en UTF-8.
 * @param {Blob} archivo
 */
export async function leerArchivoTexto(archivo) {
  const buf = await archivo.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return new TextDecoder('windows-1252').decode(buf); }
}
