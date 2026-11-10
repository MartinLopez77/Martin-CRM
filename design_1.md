# Diga — Style Reference
> Índigo profundo sobre lienzo casi blanco con velos lavanda. Un panel de control europeo — texto en azul marino en vez de negro, superficies que se elevan hacia el blanco, y una chispa naranja que marca lo activo.

**Theme:** light

Diga (webapp / dashboard de agentes de voz con IA) se construye sobre un minimalismo frío: un lienzo casi blanco (#fdfdfd) con tinte azulado sostiene texto en azul marino profundo (#040b53) — nunca negro puro — y superficies que se separan del fondo *elevándose hacia el blanco* (#ffffff) con bordes lavanda hairline, no oscureciéndose ni con sombras pesadas. Dos familias tipográficas se reparten el trabajo: Geist (geométrica, técnica) para toda la jerarquía de títulos con tracking -2% en tamaños grandes, y Sora (humanista, redonda) para todo el body. El índigo #343e96 es el color de marca y de acción; el naranja #ff9966–#ff6314 es el acento funcional que señala estados activos y momentos de atención (tabs activos, highlights), nunca el color primario de CTA. Los radios son contenidos (6–12px, sin pills), las sombras casi invisibles con base rgba(10,13,18), y los botones llevan una firma skeuomórfica sutil: inset inferior + highlight ring blanco al 12% en el primario. El sistema hereda la disciplina de Untitled UI pero con temperatura propia: frío, ordenado, europeo.

## Tokens — Colors

### Primitivas

| Escala | Rol | Valores |
|--------|-----|---------|
| **BrandPrimary** (índigo) | Color de marca y acción | 50 `#6772ca` · 100 `#5863c5` · 200 `#4955c0` · 300 `#3f4bb6` · 400 `#3a45a7` · **500 `#343e96`** · 600 `#2f3888` · 700 `#2a3279` · 800 `#252c6a` · 900 `#20265b` |
| **Brandadditional** (azul marino) | Texto principal y estados de énfasis máximo | 50 `#0918b4` · 100 `#0815a0` · 200 `#07138d` · 300 `#06107a` · 400 `#050e66` · **500 `#040b53`** · 600 `#03083f` · 700 `#02062c` · 800 `#010318` |
| **Accentcolor** (naranja) | Acento funcional — estados activos, atención | 50 `#ffddcc` · 100 `#ffcfb8` · 200 `#ffc2a3` · 300 `#ffb48f` · 400 `#ffa77a` · **500 `#ff9966`** · 600 `#ff8b52` · 700 `#ff7e3d` · 800 `#ff7029` · 900 `#ff6314` |
| **Neutralcolors** (grises azulados) | Texto secundario, placeholders, disabled | 50 `#fdfdfd` · 100 `#f6f6f9` · 200 `#e7e8ef` · 300 `#d7dae5` · 400 `#b6bace` · 500 `#949ab8` · 600 `#868cac` · 700 `#767da3` · 800 `#565d7b` · 900 `#454859` |
| **Tertiary** (lavanda) | Superficies y bordes suaves de marca | 200 `#fcfcfc` · 300 `#f5f5ff` · 400 `#ebecff` · 500 `#d7daff` · 600 `#c2c6ff` · 700 `#adb3ff` |
| **Quaternary** (melocotón pálido) | Superficies de acento suaves | 300 `#fffcfa` · 400 `#fff5f0` · 500 `#ffefe7` · 600 `#ffe7db` · 700 `#ffe0d1` |
| **Base** | Blanco y negro puros | White `#ffffff` · Black `#000000` |
| **Success** (menta/teal) | Estados de éxito | 50 `#f7fdfc` · 100 `#cdf4eb` · 200 `#acecdd` · 300 `#97e8d5` · 400 `#82e3cd` · 500 `#58dabb` · 600 `#2fd0ab` · 700 `#26a689` · 800 `#1c7d67` · 900 `#135445` |
| **Warning** (ámbar) | Estados de aviso | 50 `#fffcf5` · 100 `#ffebc2` · 200 `#ffda8f` · 300 `#ffcc66` · 400 `#ffc34d` · 500 `#ffbb33` · 600 `#e59900` · 700 `#cc8800` · 800 `#996500` · 900 `#805400` |
| **Error** (rojo coral) | Estados de error | 50 `#fef7f6` · 100 `#f9d5d2` · 200 `#f7c0bb` · 300 `#f4aba4` · 400 `#ee8177` · 500 `#e8584a` · 600 `#e32f1c` · 700 `#bf2717` · 800 `#9f2014` · 900 `#71170e` |

### Semánticas — Texto

| Token | Alias | Valor | Rol |
|-------|-------|-------|-----|
| `text/primary` | Brandadditional/500 | `#040b53` | Texto principal — azul marino profundo, nunca negro puro |
| `text/secondary` | Neutralcolors/900 | `#454859` | Texto secundario fuerte |
| `text/tertiary` | Neutralcolors/700 | `#767da3` | Descripciones, texto de apoyo |
| `text/quaternary` | Neutralcolors/600 | `#868cac` | Texto más suave |
| `text/brand-primary` | BrandPrimary/500 | `#343e96` | Texto de marca, links |
| `text/brand-secondary` | BrandPrimary/50 | `#6772ca` | Texto de marca suave; hover → `#343e96` |
| `text/white` | Base/White | `#ffffff` | Texto sobre fondos de marca sólidos |
| `text/placeholder` | Neutralcolors/500 | `#949ab8` | Placeholders de inputs |
| `text/disabled` | Neutralcolors/400 | `#b6bace` | Texto deshabilitado |
| `text/error-primary` | Error/800 | `#9f2014` | Texto de error |
| `text/warning-primary` | Warning/700 | `#cc8800` | Texto de aviso |
| `text/success-primary` | Success/800 | `#1c7d67` | Texto de éxito |
| `text/accent-primary` | Accentcolor/900 | `#ff6314` | Texto de acento (uso puntual) |
| `text/primary_on-brand` | Neutralcolors/100 | `#f6f6f9` | Texto primario sobre fondo de marca |

### Semánticas — Fondos

| Token | Alias | Valor | Rol |
|-------|-------|-------|-----|
| `bg/primary` | Neutralcolors/50 | `#fdfdfd` | Canvas de página |
| `bg/primary_hover` | Neutralcolors/100 | `#f6f6f9` | Hover sobre canvas |
| `bg/secondary` | Tertiary/200 | `#fcfcfc` | Superficie secundaria |
| `bg/secondary_hover` | Tertiary/300 | `#f5f5ff` | Hover secundario (tinte lavanda) |
| `bg/secondary_subtle` | Neutralcolors/200 | `#e7e8ef` | Fondo sutil de contraste |
| `bg/tertiary` | Tertiary/300 | `#f5f5ff` | Superficie lavanda |
| `bg/quaternary` | Tertiary/400 | `#ebecff` | Superficie lavanda más marcada |
| `bg/brand-section` | Base/White | `#ffffff` | **Cards y paneles — blanco puro por encima del canvas** |
| `bg/brand-solid` | BrandPrimary/500 | `#343e96` | Fondos de marca sólidos, botón primario |
| `bg/brand-solid_hover` | Brandadditional/500 | `#040b53` | Hover del sólido de marca |
| `bg/brand-secondary` | Tertiary/400 | `#ebecff` | Fondo de marca suave |
| `bg/active` | Tertiary/400 | `#ebecff` | Estado activo/seleccionado (lavanda) |
| `bg/accent-primary` | Accentcolor/100 | `#ffcfb8` | Fondo de acento |
| `bg/accent-secondary` | Quaternary/400 | `#fff5f0` | Fondo de acento sutil — tab activo |
| `bg/error-primary` | Error/400 | `#ee8177` | Fondo de error |
| `bg/error-secondary` | Error/50 | `#fef7f6` | Fondo de error sutil |
| `bg/error-solid` | Error/700 | `#bf2717` | Sólido de error; hover → `#9f2014` |
| `bg/warning-primary` | Warning/200 | `#ffda8f` | Fondo de aviso |
| `bg/warning-secondary` | Warning/50 | `#fffcf5` | Fondo de aviso sutil |
| `bg/warning-solid` | Warning/700 | `#cc8800` | Sólido de aviso |
| `bg/success-primary` | Success/500 | `#58dabb` | Fondo de éxito |
| `bg/success-secondary` | Success/50 | `#f7fdfc` | Fondo de éxito sutil |
| `bg/success-solid` | Success/700 | `#26a689` | Sólido de éxito |
| `bg/disabled` | Neutralcolors/100 | `#f6f6f9` | Fondos deshabilitados |
| `bg/overlay` | Base/White | `#ffffff` | Overlays y modales |

### Semánticas — Bordes

| Token | Alias | Valor | Rol |
|-------|-------|-------|-----|
| `border/primary` | Tertiary/500 | `#d7daff` | **Borde por defecto — lavanda, no gris** |
| `border/secondary` | Neutralcolors/400 | `#b6bace` | Borde de contraste medio |
| `border/secondary_alt` | Neutralcolors/300 | `#d7dae5` | Borde gris suave (cards, tabs) |
| `border/tertiary` | Tertiary/300 | `#f5f5ff` | Borde casi invisible |
| `border/brand` | BrandPrimary/500 | `#343e96` | Borde de marca — botón secundario |
| `border/accent` | Accentcolor/600 | `#ff8b52` | Borde de acento |
| `border/accent_subtle` | Accentcolor/300 | `#ffb48f` | Borde de acento sutil — tab activo |
| `border/error` | Error/700 | `#bf2717` | Borde de error |
| `border/error_subtle` | Error/300 | `#f4aba4` | Borde de error sutil |
| `border/disabled` | Neutralcolors/300 | `#d7dae5` | Bordes deshabilitados |

## Tokens — Typography

### Geist — Solo headings. Seis niveles de 24 a 72px. Geométrica y técnica, aporta precisión a la jerarquía. Tracking -2% en 36px+ (Titles, H1, H2, H3) y 0% en 24–30px (H4, H5) — el apretado solo donde el tamaño lo pide. Substitute: Inter o system-ui. · `--font-geist`
- **Substitute:** Inter, system-ui
- **Weights:** 400 (Regular), 600 (Semibold), 700 (Bold)
- **Sizes:** 24px, 30px, 36px, 48px, 60px, 72px
- **Line height:** 1.1 (48px+), 1.15 (30–36px), 1.2 (24px)
- **Letter spacing:** -2% (-0.02em) en 36px y superiores; 0 en 24–30px
- **Role:** Toda la jerarquía de títulos. Los estilos "Medium" existen en Figma pero NO forman parte del sistema — usar solo Regular/Semibold/Bold.

### Sora — Todo el body: párrafos, labels, botones, inputs, captions. Humanista y redonda, contrasta con la geometría de Geist. Cinco tamaños de 12 a 20px, tracking neutro. Substitute: Inter o system-ui. · `--font-sora`
- **Substitute:** Inter, system-ui
- **Weights:** 400 (Regular), 600 (Semibold), 700 (Bold)
- **Sizes:** 12px, 14px, 16px, 18px, 20px
- **Line height:** 1.5 (12–16px), 1.55 (18–20px)
- **Letter spacing:** 0
- **Role:** Todo el texto no-heading. Los estilos "Medium" son alias accidentales de Regular — no usarlos; el peso intermedio del sistema es Semibold 600.

### Type Scale

| Role | Family | Size | Line Height | Letter Spacing | Token |
|------|--------|------|-------------|----------------|-------|
| body-xs | Sora | 12px | 1.5 | 0 | `--text-body-xs` |
| body-s | Sora | 14px | 1.5 | 0 | `--text-body-s` |
| body-m | Sora | 16px | 1.5 | 0 | `--text-body-m` |
| body-l | Sora | 18px | 1.55 | 0 | `--text-body-l` |
| body-xl | Sora | 20px | 1.55 | 0 | `--text-body-xl` |
| header-5 | Geist | 24px | 1.2 | 0 | `--text-h5` |
| header-4 | Geist | 30px | 1.15 | 0 | `--text-h4` |
| header-3 | Geist | 36px | 1.15 | -0.02em | `--text-h3` |
| header-2 | Geist | 48px | 1.1 | -0.02em | `--text-h2` |
| header-1 | Geist | 60px | 1.1 | -0.02em | `--text-h1` |
| title | Geist | 72px | 1.05 | -0.02em | `--text-title` |

En la webapp, los tamaños dominantes son H4/H5 para títulos de sección y Body S/M para contenido; Titles y H1–H2 quedan para landing y momentos hero.

## Tokens — Spacing & Shapes

**Base unit:** 4px

**Density:** comfortable-compact (dashboard)

### Spacing Scale

| Name | Value | Token | Uso típico |
|------|-------|-------|-----------|
| 2 | 2px | `--spacing-2` | Gaps mínimos (label + valor) |
| 4 | 4px | `--spacing-4` | Padding de contenedores de tabs, gaps de iconos |
| 8 | 8px | `--spacing-8` | Gaps internos de botones y tabs |
| **12** | 12px | `--spacing-12` | **Padding horizontal de tabs, gaps estándar** |
| **16** | 16px | `--spacing-16` | **Padding de botones, gaps entre elementos** |
| 20 | 20px | `--spacing-20` | Padding de cards |
| **24** | 24px | `--spacing-24` | **Separación entre bloques, padding de paneles** |
| 32 | 32px | `--spacing-32` | Separación de secciones dentro de vista |
| 48 | 48px | `--spacing-48` | Separación mayor |
| 64 | 64px | `--spacing-64` | Márgenes de página |

Los valores de trabajo habituales son **12, 16 y 24**; el resto de la escala existe para casos puntuales.

### Border Radius

| Element | Value |
|---------|-------|
| elementos internos (tab items, chips) | 6px |
| botones | 8px |
| contenedores de tabs, inputs | 10px |
| cards y paneles | 12px |

Sin pills (9999px) y sin esquinas vivas: la escala 6–12px es la firma. El radio crece con el tamaño del contenedor.

### Shadows

| Name | Value | Token | Uso |
|------|-------|-------|-----|
| shadow-xs | `0 1px 2px 0 rgba(10, 13, 18, 0.05)` | `--shadow-xs` | Cards y paneles |
| shadow-xs-skeuomorphic | `0 -2px 0 0 rgba(10, 13, 18, 0.05) inset, 0 1px 2px 0 rgba(10, 13, 18, 0.05)` | `--shadow-xs-skeuomorphic` | Botones (el inset inferior da tactilidad) |
| shadow-sm | `0 1px 3px 0 rgba(10, 13, 18, 0.10), 0 1px 2px -1px rgba(10, 13, 18, 0.10)` | `--shadow-sm` | Tab activo, elementos flotantes ligeros |

Base de sombra: `rgba(10, 13, 18, …)` — un negro azulado, nunca negro puro. Opacidades máximas del 10%.

### Layout

- **Page max-width:** ~1430px (canvas de dashboard)
- **Column width:** paneles laterales ~380–500px
- **Section gap:** 24–32px dentro de vista
- **Card padding:** 20px
- **Element gap:** 12–16px
- **Grid:** columnas flex con `align-items: flex-start`; cards con `align-self: stretch`

## Components

### Botón Primario
**Role:** Acción principal

Fondo `bg/brand-solid` #343e96, texto blanco, radio 8px, **borde 2px `rgba(255, 255, 255, 0.12)`** (highlight ring interior), shadow-xs-skeuomorphic. Padding 10px 16px, gap 6px, Sora 14px/600. Hover: fondo → `bg/brand-solid_hover` #040b53. El ring blanco + inset inferior dan profundidad sin gradientes.

### Botón Secundario
**Role:** Acción secundaria

Fondo `bg/secondary_alt` #f6f6f9, texto índigo #343e96, radio 8px, borde 1px `border/brand` #343e96, shadow-xs-skeuomorphic. Padding 10px 16px, gap 6px, Sora 14px/600. Misma sombra skeuomórfica que el primario — la firma compartida de lo interactivo.

### Tab Bar
**Role:** Navegación entre vistas de un panel

Contenedor: padding 4px, radio 10px, borde 1px `border/secondary_alt` #d7dae5, fondo `bg/primary` #fdfdfd, gap 4px. Tab item: altura 36px, padding 8px 12px, radio 6px, gap 8px, `flex: 1`. **Tab activo:** borde 1px `border/accent_subtle` #ffb48f + fondo `bg/accent-secondary` #fff5f0 + shadow-sm — el naranja marca el estado activo. Tabs inactivos: transparentes, sin borde.

### Card / Panel
**Role:** Contenedor de contenido

Fondo `bg/brand-section` #ffffff (blanco puro, por encima del canvas), radio 12px, padding 20px, gap interno 20px, shadow-xs. Borde 1px en dos variantes según contexto: `border/primary` #d7daff (lavanda, de marca) o `border/secondary_alt` #d7dae5 (gris neutro). Flex column, `align-items: flex-start`.

### Input
**Role:** Campos de formulario

Fondo #ffffff, radio 10px, borde 1px `border/primary` #d7daff, texto `text/primary` #040b53, placeholder `text/placeholder` #949ab8, Sora 14px/400. Focus: borde `border/brand` #343e96. Error: borde `border/error_subtle` #f4aba4 con mensaje en `text/error-primary` #9f2014. Disabled: fondo `bg/disabled` #f6f6f9, borde #d7dae5, texto #b6bace.

### Badge
**Role:** Etiquetas de estado

Radio 6px, Sora 12px/600, padding compacto. Variantes semánticas: success (fondo #f7fdfc, borde #26a689 o #82e3cd, texto #1c7d67), warning (fondo #fffcf5, borde #e59900, texto #cc8800), error (fondo #fef7f6, borde #f4aba4, texto #9f2014), brand (fondo #ebecff, borde #adb3ff, texto #343e96), accent (fondo #fff5f0, borde #ffefe7, texto #ff6314).

### Estado activo / seleccionado
**Role:** Selección en listas, navegación lateral

Fondo `bg/active` #ebecff (lavanda). Para estados activos con más énfasis (tab principal), el patrón naranja del Tab Bar. Regla mental: lavanda = seleccionado/en contexto; naranja = activo/foco de atención.

## Do's and Don'ts

### Do
- Usar `text/primary` #040b53 (azul marino) para todo el texto principal — nunca #000000; el marino es la temperatura del sistema.
- Elevar las superficies hacia el blanco: canvas #fdfdfd → card #ffffff, separadas por borde hairline + shadow-xs. La jerarquía de superficie se construye con luz, no con oscuridad.
- Usar bordes lavanda `border/primary` #d7daff como borde por defecto; el gris #d7dae5 es la variante neutra para tabs y cards de contenido denso.
- Mantener la escala de radios 6/8/10/12px: 6 para elementos internos, 8 para botones, 10 para inputs y contenedores de tabs, 12 para cards.
- Aplicar shadow-xs-skeuomorphic a todos los botones y el ring blanco 12% al primario — es la firma táctil de lo interactivo.
- Reservar el naranja Accentcolor para estados activos y momentos de atención (tab activo, badges de acento); el índigo #343e96 es siempre el color de acción.
- Respetar el reparto tipográfico: Geist solo en headings (24px+), Sora en todo lo demás. Tracking -2% únicamente en Geist 36px+.
- Trabajar con los espaciados 12/16/24 como valores por defecto; 4 y 8 para micro-gaps, 20 para padding de cards.
- Usar los tonos oscuros de las escalas semánticas para texto (Error/800, Warning/700, Success/800) y los tonos 50 para fondos sutiles — contraste accesible por construcción.

### Don't
- No usar negro puro #000000 para texto ni sombras; el texto es #040b53 y las sombras parten de rgba(10,13,18).
- No usar pills (9999px) ni esquinas vivas (<6px) en componentes; la escala de radios es 6–12px.
- No usar los estilos "Medium" de Figma — existen por plantilla pero no forman parte del sistema; los pesos son 400/600/700.
- No usar el naranja como color de CTA principal ni de links; es acento de estado, no de acción.
- No oscurecer las cards respecto al canvas ni usar sombras con blur alto u opacidad >10%; la elevación es hacia el blanco con sombras whisper.
- No usar Geist por debajo de 24px ni Sora por encima de 20px; el corte entre familias es estricto.
- No introducir grises cálidos ni beiges; todos los neutros del sistema tienen tinte azulado frío.
- No aplicar tracking negativo a Sora ni a Geist en 24–30px.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Canvas | `#fdfdfd` | Fondo de página — casi blanco con tinte frío |
| 1 | Card / Panel | `#ffffff` | Cards y secciones — blanco puro, un paso *por encima* del canvas |
| 1-alt | Superficie suave | `#f6f6f9` | Fondos de botón secundario, estados disabled |
| 2 | Lavanda | `#f5f5ff` | Superficies con tinte de marca, hovers |
| 3 | Lavanda activa | `#ebecff` | Estados seleccionados, fondos de marca suaves |

## Elevation

- **Cards y paneles:** `0 1px 2px 0 rgba(10, 13, 18, 0.05)` + borde 1px
- **Botones:** `0 -2px 0 0 rgba(10, 13, 18, 0.05) inset, 0 1px 2px 0 rgba(10, 13, 18, 0.05)`
- **Elementos flotantes ligeros (tab activo):** `0 1px 3px 0 rgba(10, 13, 18, 0.10), 0 1px 2px -1px rgba(10, 13, 18, 0.10)`

La elevación siempre combina borde + sombra whisper; nunca sombra sola con blur alto.

## Layout

Dashboard de columnas flex sobre canvas #fdfdfd a ~1430px. Paneles laterales de 380–500px con columnas centradas o alineadas arriba; las cards estiran al ancho del contenedor (`align-self: stretch`). Contenido organizado en cards blancas de radio 12px con padding 20px, separadas por gaps de 16–24px. La navegación interna de cada vista usa tab bars contenidas (no tabs de línea). El ritmo es compacto pero respirado: 12/16/24 como pulso de espaciado, sin secciones de 96px+ propias de landing.

## Agent Prompt Guide

**Quick Color Reference**
- text: #040b53 (primary), #454859 (secondary), #767da3 (tertiary), #949ab8 (placeholder)
- background: #fdfdfd (canvas), #ffffff (cards), #f5f5ff / #ebecff (lavanda)
- border: #d7daff (default lavanda), #d7dae5 (neutro), #343e96 (brand)
- brand action: #343e96 (fill primario, hover #040b53)
- accent: #ff9966–#ff6314 (naranja — solo estados activos y atención)
- semantic: success #26a689 · warning #e59900 · error #bf2717

## Quick Start — CSS Custom Properties


```css
:root {
  /* Colors — Primitivas clave */
  --brand-primary-50: #6772ca;
  --brand-primary-500: #343e96;
  --brand-primary-700: #2a3279;
  --brand-additional-500: #040b53;
  --brand-additional-700: #02062c;
  --accent-300: #ffb48f;
  --accent-500: #ff9966;
  --accent-900: #ff6314;
  --neutral-50: #fdfdfd;
  --neutral-100: #f6f6f9;
  --neutral-300: #d7dae5;
  --neutral-400: #b6bace;
  --neutral-500: #949ab8;
  --neutral-700: #767da3;
  --neutral-900: #454859;
  --tertiary-300: #f5f5ff;
  --tertiary-400: #ebecff;
  --tertiary-500: #d7daff;
  --quaternary-400: #fff5f0;
  --success-500: #58dabb;
  --success-700: #26a689;
  --success-800: #1c7d67;
  --warning-500: #ffbb33;
  --warning-600: #e59900;
  --warning-700: #cc8800;
  --error-400: #ee8177;
  --error-500: #e8584a;
  --error-700: #bf2717;
  --error-800: #9f2014;

  /* Colors — Semánticas */
  --text-primary: var(--brand-additional-500);
  --text-secondary: var(--neutral-900);
  --text-tertiary: var(--neutral-700);
  --text-placeholder: var(--neutral-500);
  --text-disabled: var(--neutral-400);
  --text-brand-primary: var(--brand-primary-500);
  --text-error-primary: var(--error-800);
  --text-warning-primary: var(--warning-700);
  --text-success-primary: var(--success-800);
  --bg-primary: var(--neutral-50);
  --bg-primary-hover: var(--neutral-100);
  --bg-brand-section: #ffffff;
  --bg-brand-solid: var(--brand-primary-500);
  --bg-brand-solid-hover: var(--brand-additional-500);
  --bg-tertiary: var(--tertiary-300);
  --bg-active: var(--tertiary-400);
  --bg-accent-secondary: var(--quaternary-400);
  --bg-error-primary: var(--error-400);
  --border-primary: var(--tertiary-500);
  --border-secondary-alt: var(--neutral-300);
  --border-brand: var(--brand-primary-500);
  --border-accent-subtle: var(--accent-300);

  /* Typography */
  --font-geist: 'Geist', 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-sora: 'Sora', 'Inter', ui-sans-serif, system-ui, sans-serif;

  --text-body-xs: 12px;
  --text-body-s: 14px;
  --text-body-m: 16px;
  --text-body-l: 18px;
  --text-body-xl: 20px;
  --text-h5: 24px;
  --text-h4: 30px;
  --text-h3: 36px;
  --text-h2: 48px;
  --text-h1: 60px;
  --text-title: 72px;

  --leading-body: 1.5;
  --leading-body-lg: 1.55;
  --leading-h5: 1.2;
  --leading-h4: 1.15;
  --leading-h3: 1.15;
  --leading-display: 1.1;
  --tracking-display: -0.02em; /* solo Geist 36px+ */

  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-2: 2px;
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-48: 48px;
  --spacing-64: 64px;

  /* Border Radius */
  --radius-sm: 6px;   /* elementos internos */
  --radius-md: 8px;   /* botones */
  --radius-lg: 10px;  /* inputs, contenedores de tabs */
  --radius-xl: 12px;  /* cards */

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgba(10, 13, 18, 0.05);
  --shadow-xs-skeuomorphic: 0 -2px 0 0 rgba(10, 13, 18, 0.05) inset, 0 1px 2px 0 rgba(10, 13, 18, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(10, 13, 18, 0.10), 0 1px 2px -1px rgba(10, 13, 18, 0.10);

  /* Layout */
  --page-max-width: 1430px;
  --card-padding: 20px;
}
```

