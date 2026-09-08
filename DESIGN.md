---
name: Blackout Window Coverings
description: Sistema visual existente de interiores, luz y protección solar a medida.
colors:
  violet: "#8b67a7"
  violet-dark: "#654878"
  ink: "#171719"
  cream: "#f2efe9"
  paper: "#faf9f6"
  white: "#fff"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(58px,7vw,96px)"
    fontWeight: 500
    lineHeight: 0.86
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(44px,5vw,76px)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-.025em"
  body:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.6
  label:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: ".22em"
rounded:
  square: "0"
spacing:
  section-desktop: "130px 7vw"
  section-mobile: "90px 24px"
  button: "17px 19px"
components:
  button-primary:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.white}"
    rounded: "{rounded.square}"
    padding: "{spacing.button}"
  button-light:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "{spacing.button}"
  quote-input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0 13px"
    height: "48px"
  navigation:
    textColor: "{colors.white}"
    padding: "0 3.5vw"
    height: "86px"
  home-choice:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    padding: "36px 36px 34px 0"
---

# Design System: Blackout Window Coverings

## Overview

Blackout Window Coverings® conserva su identidad violeta, tipografía editorial y fotografías amplias de interiores. La composición alterna superficies marfil con zonas oscuras y deja espacio alrededor de títulos y controles. El tono de marca es elegante y cercano, según `PRODUCT.md`.

Esta documentación describe código existente; no propone una identidad nueva. La campaña de descanso, confort y tranquilidad está delimitada por `.impeccable/surfaces/index-html.md`; su recorrido y composición no son normas globales.

Fuentes: `styles.css`, `casa-nueva.css`, `blog/blog.css`, `blog/casa-nueva.css`, `cotizador/cotizador.css` e `index.html`. Los tokens superiores representan la base de `styles.css`; las diferencias por superficie se indican abajo.

## Colors

Primario: violeta para acciones y acentos; violeta oscuro para etiquetas sobre fondos claros. Neutros: tinta para texto, marfil para bloques alternos, papel como fondo y blanco para controles y texto invertido.

La campaña usa violeta oscuro en el botón principal, hover `#513960` y elimina su sombra. El blog tiene su propio marfil (`#f1ede7`). El proceso usa `#735582`; cotizador e invitación usan `#211a25`. Son asignaciones de superficie, no sustituciones de los tokens globales.

## Typography

Cormorant Garamond, pesos 500 y 600 e itálica 500, da forma a títulos y cifras. DM Sans, pesos 400–600, compone cuerpo, navegación y formularios. Las reglas editoriales al final de `styles.css` reemplazan las declaraciones anteriores de Manrope.

El texto destacado usa `--text-body: clamp(1rem,.35vw + .92rem,1.16rem)` e interlínea 1.7–1.75; cuerpo base y títulos están en el frontmatter. Las etiquetas de sección van en mayúsculas. La prosa del blog alcanza 72ch e interlínea 1.85.

El hero de campaña tiene tamaño `clamp(3.4rem,6.3vw,6rem)`, interlínea .99 y ancho 16ch; en móvil cambia a `clamp(2.8rem,10.7vw,4.4rem)` e interlínea 1.02. No trasladar estos ajustes a todos los titulares.

## Layout

La portada base tiene márgenes laterales fluidos de 7vw, secciones amplias y productos en tres columnas con separación de 18px. A 820px pasa a una columna, navegación desplegable y márgenes de 24px. El journal y el blog reorganizan a 900px.

La campaña usa secciones de 100px 7vw y de 64px 24px en móvil; el hero móvil entra en flujo vertical con el control de luz debajo. Sus elecciones de ambiente son dos columnas y una fila ancha, luego una columna.

El cotizador cambia a 1050px, 820px, 700px y 520px: redistribuye resumen, campos y márgenes. Los ajustes de pantalla táctil y áreas seguras pertenecen a esa superficie.

## Elevation & Depth

La profundidad combina fotografía, velos oscuros, transparencia y sombras puntuales. La navegación desplazada usa `0 8px 30px rgba(0,0,0,.06)` y desenfoque de 14px. El botón base usa `0 12px 30px rgba(91,61,112,.28)`; el control de luz, `0 18px 42px rgba(15,8,18,.22)`.

El hero conserva su capa Three.js y una persiana CSS de respaldo. Las transiciones de estado usan 140–220ms; revelado, 700ms; demostraciones de producto, 800ms. El modo de movimiento reducido desactiva animaciones decorativas y reduce transiciones; la campaña muestra el contenido revelable inmediatamente.

Procedencia de fotografías heredadas: URLs remotas Unsplash declaradas en `styles.css`, sin descarga ni imágenes nuevas. Autoría y licencia específica no están documentadas en el repositorio; estos identificadores registran la fuente existente, no una verificación de derechos:

- Hero: `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2200&q=88`.
- Ventana de cortinas: `https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85`.
- Ventana de persianas: `https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=85`.
- Terraza: `https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=85`.
- Contacto: `https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=2000&q=88`.
- Journal: `https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1400&q=86`.

## Shapes

Predominan esquinas rectas, divisores de 1px y marcos rectangulares. Inputs y botones no usan cápsulas. Los paneles de elección se distinguen por líneas y tipografía, con fondos continuos.

## Components

- Botón principal: DM Sans 13px/600, violeta y texto blanco; hover base `#75538a`, pulsación scale(.97). En campaña aplica la variante oscura descrita en Colors.
- Botón claro: misma geometría y pulsación, blanco sobre superficies oscuras; tinta para el texto. No tiene hover de color propio en la base.
- Campo del cotizador: borde `#cfc8c2`, DM Sans .88rem/500; foco violeta con halo `0 0 0 3px rgba(139,103,167,.14)`, error `#a64343`. A 520px alcanza 50px y texto de 1rem.
- Navegación: fija, transparente y blanca sobre el hero; al desplazarse se vuelve papel translúcido, tinta y 72px de alto. A 820px usa menú desplegable y altura inicial de 70px.
- Elección de ambiente: enlace completo sobre marfil, divisor `#bfb3c4`, título serif y flecha lineal. Hover oscurece el título y subraya la acción; es un componente local de campaña.

El foco base es contorno de 2px `#b48bca`, separado 4px. La campaña usa 3px `#ad83c5`, separado 5px; el artículo de campaña usa 3px de violeta oscuro, separado 4px. El sidecar incluye cinco muestras de estos componentes existentes, con sus estados y valores de respaldo.

## Do's and Don'ts

- Do conservar el nombre de marca, la familia violeta y la pareja tipográfica existente.
- Do mantener visibles texto y controles sobre fotografía mediante los velos y tratamientos de foco de su superficie.
- Do respetar las alternativas de movimiento reducido y el respaldo CSS del hero.
- Don't convertir decisiones de campaña en reglas globales del sitio.
- Don't interpretar declaraciones antiguas de Manrope como la tipografía efectiva de la portada.
