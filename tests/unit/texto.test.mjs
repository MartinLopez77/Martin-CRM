import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdown } from '../../src/shared/lib/markdown.js';
import { leerCSV, leerArchivoTexto } from '../../src/shared/lib/csv.js';
import { esc, normalizar, iniciales } from '../../src/shared/lib/text.js';

test('markdown de las notas: negrita, listas con sangría, numeradas y enlaces', () => {
  assert.equal(markdown('**hola** <b>'), '<p><strong>hola</strong> &lt;b&gt;</p>');
  assert.equal(markdown('- a\n  - b\n- c'), '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>');
  assert.equal(markdown('3. x\n4. y'), '<ol start="3"><li>x</li><li>y</li></ol>');
  assert.equal(markdown('[Diga](https://diga.io)'), '<p><a href="https://diga.io" target="_blank" rel="noopener">Diga</a></p>');
});

test('markdown: solo enlaces http(s), nunca javascript:', () => {
  assert.equal(
    markdown('[x](javascript:alert(1)) https://diga.io'),
    '<p>[x](javascript:alert(1)) <a href="https://diga.io" target="_blank" rel="noopener">https://diga.io</a></p>',
  );
});

test('CSV: separador detectado, comillas, comillas dobles, BOM, CRLF y filas vacías', () => {
  assert.deepEqual(leerCSV('﻿a;b\r\n1;"x;y"\r\n\r\n2;"di ""hola"""'), [['a', 'b'], ['1', 'x;y'], ['2', 'di "hola"']]);
  assert.deepEqual(leerCSV('a,b,c\n1,"2,5",3'), [['a', 'b', 'c'], ['1', '2,5', '3']]);
  assert.deepEqual(leerCSV('a\tb\n1\t2\n'), [['a', 'b'], ['1', '2']]);
});

test('CSV de Excel en Windows-1252 se lee con sus tildes', async () => {
  assert.equal(await leerArchivoTexto(new Blob([Uint8Array.from([0x43, 0x61, 0x66, 0xe9])])), 'Café');
  assert.equal(await leerArchivoTexto(new Blob(['Café'])), 'Café'); // UTF-8
});

test('texto: escapar HTML, comparar sin tildes e iniciales', () => {
  assert.equal(esc(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(esc(null), '');
  assert.equal(normalizar('  Ángel MUÑOZ '), 'angel munoz');
  assert.equal(iniciales('Ana maría ruiz'), 'AM');
  assert.equal(iniciales(''), '?');
});
