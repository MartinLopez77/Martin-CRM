# CRM Martín

CRM personal (contactos, empresas, tareas, notas, secuencias, llamadas) que se usa en local: un servidor
Node sin dependencias guarda todo en `data.json` y sirve una app de JavaScript vanilla en módulos ES.
**No se compila nada**: se edita un archivo y se recarga el navegador.

## Stack

- **Servidor:** Node (sin dependencias). `GET/PUT /api/data` lee/escribe `data.json` entero (escritura
  atómica + copia diaria en `backups/`, se guardan 30). Sirve `src/` (salvo `src/server/`).
- **Cliente:** JavaScript con módulos ES nativos del navegador, HTML en plantillas de texto,
  router por hash (`#/contacto/<id>`), delegación de eventos con `data-action`.
- **Tipos:** JSDoc comprobado por TypeScript en modo estricto (`checkJs`). No hay archivos `.ts`.
- **Tests:** `node:test` (+ jsdom) para la lógica y Playwright (con el Chrome instalado) para el navegador.
- Las devDependencies solo sirven para verificar: **usar el CRM no necesita `npm install`.**

## Comandos

| Qué | Comando |
|---|---|
| Arrancar el CRM (abre el navegador) | doble clic en `Abrir CRM.bat`, o `npm start` |
| Servidor sin abrir navegador | `node server.js` (puerto 3000; otro con `PORT=…`) |
| CRM de demostración (datos ficticios + 15 contactos, puerto 3001) | `npm run demo` (se rehace en `demo/`, no toca `data.json`) |
| Comprobar tipos | `npm run typecheck` |
| Lint | `npm run lint` |
| Tests de lógica (rápidos) | `npm run test:unit` |
| Tests en el navegador | `npm run test:e2e` (un archivo: `npx playwright test tests/e2e/ficha.spec.mjs`) |
| **Todo, antes de cada commit** | `npm run check` |

La primera vez: `npm install`. Los E2E usan el Chrome instalado (`channel: 'chrome'`), sin descargar navegadores.

## Mapa de carpetas

```
server.js                 entrada del servidor (la usa Abrir CRM.bat)
src/
  server/                 http.js (rutas, estáticos) · storage.js (data.json, escritura atómica, backups)
  client/                 index.html, styles.css (lista de @import), main.js (carga las features y arranca),
                          arranque.js (cargar datos, migrar datos antiguos), vistas.js (qué vista va en cada
                          ruta), layout.js (menú, reloj, contadores, atajos de teclado globales)
  shared/                 lo común, sin saber nada de las entidades
    state.js              db (los datos, tipados por colección) y ui (estado de la interfaz)
    persistence.js        guardar(): manda db al servidor 250 ms después del último cambio
    router.js             rutaActual(), render()
    actions.js            registrarAcciones({ 'nombre': (el, e) => … }) para los data-action
    schema.js             campos descritos por un schema: defineCampos, valor, texto, control, leer
    lib/                  puras (se prueban en Node): text, dates (hora de España), nlp (fechas en el
                          título), markdown, csv
    ui/                   dom ($, app), html (campo, opciones, opcion, dato, campoFecha), icons, modal,
                          toast (avisar), editor-md, links
    styles/               CSS común
  features/<entidad>/     una carpeta por funcionalidad, siempre con el mismo patrón:
    schema.js             typedef de la entidad + constantes (estados, tipos) + descriptor de campos
    store.js              consultas y cambios sobre db.<colección>; xExistente(id) si tiene que existir
    views.js o views/     HTML de sus pantallas y modales
    actions.js            registrarAcciones({...}) de sus botones y sus listeners
    styles/               su CSS
tests/
  unit/                   *.test.mjs (node:test). dom.mjs prepara jsdom y la fecha fija; reloj.mjs solo la fecha
  e2e/                    *.spec.mjs (Playwright). helpers.mjs: datos ficticios por test, fecha fija, sin errores JS
  fixtures/               data.json y contactos.csv FICTICIOS (los únicos datos que usan los tests)
```

Features: `contacts` (la plantilla de referencia), `companies`, `notes`, `activity` (acciones realizadas),
`tasks`, `queue` (cola «Empezar tareas»), `call` (ventana de llamada y grabación), `sequences`, `import` (CSV),
`search` (buscador de arriba), `team`, `settings`, `dashboard` (estadísticas).

Los datos de las tarjetas de contacto y empresa se editan pulsándolos: `datoEditable()` (`shared/ui/html.js`) pinta la
fila y `editarDato()` (`shared/ui/editar-dato.js`) abre el recuadro; cada feature guarda en su `actions.js`.

## Convenciones

- **Idioma:** código, comentarios, mensajes y commits en español, como el resto del proyecto.
- **Tipos:** cada función exportada lleva JSDoc; nada de `@ts-nocheck`. Las entidades se tipan con su
  typedef del `schema.js` de su feature (`/** @typedef {import('../contacts/schema.js').Contacto} Contacto */`).
  Los casts de DOM van como `/** @type {HTMLInputElement} */ (e.target)`.
- **Dependencias entre features:** una feature puede importar el `schema.js` y el `store.js` de otra, nunca
  sus vistas ni sus acciones. Lo que es de todas va a `shared/`, y `shared/` no importa nada de `features/`
  (si necesita algo de ellas, se lo registran: `registrarAcciones`, `alAbrirModal`, `definirRender`).
- **Botones:** `data-action="<nombre>"` + la función en `actions.js` de su feature. Los nombres son únicos
  (registrarAcciones avisa si se repiten). Los `data-*` del botón llegan en `el.dataset`.
- **Pintar:** las vistas escriben `app.innerHTML` con plantillas; todo texto del usuario pasa por `esc()`.
  Después de cambiar datos: `guardar()` y `render()`; para deshacer, `avisar(texto, () => {...})`.
- **Archivos pequeños:** menos de 300–400 líneas. Si crece, se parte (p. ej. `views/list.js` y `views/detail.js`).
- **CSS:** cada feature en `features/<feature>/styles/`. `src/client/styles.css` es la lista de `@import` **en
  orden de cascada**: un archivo nuevo que deba pisar reglas de otro va después de él.
- **Tema:** el de Diga, descrito en `design_1.md`. Colores, sombras y fuentes son variables de
  `shared/styles/base.css` (`--accent`, `--border`, `--naranja-fondo`…): nada de colores sueltos. Radios 6/8/10/12px,
  sin pills; pesos 400/600/700 (sin 500); naranja solo para lo activo, índigo para las acciones.
- **Fechas:** siempre hora de España (`hoy()`, `horaActual()` de `shared/lib/dates.js`), fechas como `AAAA-MM-DD`.
- **Cambios en contactos:** con `cambiarContacto(c, () => …)`, que deja la nota «Cambio de datos».

## Cómo añadir un campo a una entidad

Ejemplo: «LinkedIn» en contactos.

1. `features/contacts/schema.js`: añade la propiedad al typedef `Contacto` y una entrada en
   `CAMPOS_CONTACTO` (`{ id: 'linkedin', label: 'LinkedIn', tipo: 'url' }`). El formulario la pinta y la lee sola.
2. Si sus cambios deben quedar en la nota «Cambio de datos», añádela a `CAMPOS_HISTORIAL`.
3. Si se ve en la ficha o en la tabla: `views/detail.js` («Más datos») o `COLUMNAS` en `schema.js`.
4. Los contactos que ya existen no la tienen: el código debe tolerar que falte (`c.linkedin || ''`). Si hace
   falta rellenarla, añade una migración en `src/client/arranque.js` (`migrar()`).
5. Test: un caso en `tests/unit/contactos.test.mjs` y, si cambia una pantalla, en `tests/e2e/`.

En empresas, las propiedades fijas van en `PROPS_EMPRESA` (aparecen solas en la ficha, el formulario y
Ajustes) y las propias se crean desde Ajustes, sin tocar código.

## Cómo añadir una entidad nueva

Ejemplo: «deals».

1. `src/features/deals/schema.js`: typedef `Deal`, constantes (etapas…) y `CAMPOS_DEAL = defineCampos([...])`.
2. `src/shared/state.js`: añade `deals` a `BaseDatos` (con su tipo) y al `db` inicial;
   `src/client/arranque.js`: `db.deals ||= []` para los datos que aún no la tienen.
3. `store.js` (consultas y cambios, `dealExistente`), `views.js` (pantallas, con el formulario generado desde
   `CAMPOS_DEAL` como en `contacts/views/modal.js`) y `actions.js` (`registrarAcciones`).
4. Ruta: un caso en `src/client/vistas.js`; entrada en el menú de `src/client/index.html`.
5. Carga: `import '../features/deals/actions.js';` (y sus vistas) en `src/client/main.js`.
6. CSS en `features/deals/styles/` y su `@import` en `src/client/styles.css`.
7. Si se borra un contacto y el deal es suyo, añádelo a `borrarContactos()` en `contacts/store.js`.
8. Tests: datos de ejemplo en `tests/fixtures/data.json`, unitarios del store y un E2E de la pantalla.

## Qué NO tocar

- **`data.json` y `backups/`**: son los datos reales de los clientes. No se leen, no se editan y nunca se
  suben a git (están en `.gitignore`). Los tests usan solo `tests/fixtures/` (vía `CRM_DATA_FILE`).
- **El formato de `data.json`**: renombrar o cambiar el significado de un campo rompe los datos que ya hay.
  Si hace falta, se añade una migración en `migrar()` (`src/client/arranque.js`) que convierta los antiguos.
- **`Abrir CRM.bat`** y que `node server.js` funcione sin `npm install`: es como se usa el CRM a diario.
- **La escritura atómica y las copias de `src/server/storage.js`**: protegen los datos si algo falla.
- **`.gitignore`** de datos: los patrones van anclados a la raíz (`/data.json`) para que el fixture se suba.

## Verificar un cambio

1. `npm run check` en verde.
2. Si cambia lo que se ve: probarlo en el navegador (`node server.js` con `CRM_DATA_FILE=tests/fixtures/…`
   copiado a otro sitio, nunca con los datos reales) y, si toca una ruta crítica, un E2E.
3. Commit con mensaje en español que diga qué cambia y por qué.
