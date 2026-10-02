# 22 — Prompts de arte: las pistas

Escrito el 2026-09-27 (T42 de `odd/tasks/prewriting-stage-completion.md`).
Sigue el formato de `docs/17` y `docs/20`: cada pedido está listo para pegar
en ChatGPT. **Los prompts van en inglés; lo demás, en castellano.**

Cubre **todas las imágenes de pistas**: las que hoy no se entienden, y las que
piden los niveles nuevos de `docs/21_HABILIDADES_PREESCRITURA.md`. Los ids son
`C1`–`C12`. Los fondos, personajes y globos siguen en `docs/20` (ids `B…`).

El pedido de la autora:

> Las burbujas son un simple círculo azul así que ni se entiende, además la
> del pato deberían ser charcos, o por ejemplo las plumas son verdes por
> alguna razón. Revisá un poco las imágenes y hacé en los md prompts de cómo
> deben ser para mantener el estilo visual y adaptarse exactamente a lo que
> necesitamos.

Tres cosas para leer primero:

1. **Si sos ChatGPT** → §0, y después solo la §4.
2. **Qué se ve hoy y qué se rehace** → §1.
3. **Por qué la burbuja salió un círculo y la pluma verde** → §3.2.

---

## 0. Instrucciones para ChatGPT

1. **Hacé cada imagen que figure como `pendiente`** en la tabla de la §2, en
   el orden de la tabla (primero las de prioridad alta). Los prompts están en
   la §4. Cada uno se pega **completo, tal cual**, en un mensaje.
2. **Una imagen por mensaje, todas en la misma conversación.** Así comparten
   el grosor de línea y la paleta.
3. **Adjuntá las referencias** que dice cada pedido (están en `art-source/`).
   Sirven para el tamaño de las formas, el nivel de detalle y, cuando se
   dice, el color. **Nunca como referencia de contorno**: el contorno lo
   define el bloque de estilo de cada prompt (`docs/09` §9).
4. **Guardá cada imagen en `art-source/` con el nombre exacto** que dice su
   pedido: PNG, 1024 × 1024, fondo transparente. Todos los nombres son
   nuevos; **no pises ningún archivo que ya exista** en `art-source/`.
5. **Pasá el checklist** del pedido y el común (§3.4) antes de guardarla. Si
   falla un punto, pedila de nuevo; no la guardes "casi bien".
6. **No modifiques código.** Nada en `client/`, `scripts/`, `server/`,
   `client/public/art/` ni ningún otro documento. El único cambio permitido
   en el repo, además de los PNG, es poner `hecho` en la columna "Estado" de
   la §2 de este archivo. Meter las imágenes en el juego lo hace otra sesión
   después (§5).
7. De `docs/20` también está pendiente **B12** (la manzana y el hongo de la
   noche). Hacelo desde allá, con la aclaración de la §6 de este documento.
   Los fondos, globos y personajes de `docs/20` no son pistas y no están en
   este pedido.

---

## 1. Qué se ve hoy

Miré cada imagen embarcada en `client/public/art/` y su fuente en
`art-source/`. Así se ve en el juego:

| Imagen embarcada | Fuente | Dónde aparece | Veredicto | Por qué |
|---|---|---|---|---|
| `clue-bubble-*` | `burbuja.png` | `f2-guirnalda` (peces) | **rehacer → C4** | Un disco celeste con borde negro. El brillo blanco de la fuente se pierde al recolorear (§3.2) y queda un círculo que no dice nada |
| `clue-feather-*` | `pluma verde.png`, `pluma gris.png` | `duck-trail2` (pato) | **rehacer → C2** | Verde oscuro y con forma de hoja: lóbulos parejos, punta aguda, vena central. El pato del juego es amarillo. El verde viene del caso viejo de la gallina (§3.2) |
| `clue-droplet-*` | `gota de agua.png` | `duck-trail1` (pato), `f2-agua2` (peces) | **rehacer → C1 en el pato, C6 en los peces** | Se entiende como gota, pero es vector liso: sin temblor ni desborde (falla los puntos 2 y 3 del checklist de `docs/09` §9). La autora pidió charcos para el pato, y los peces no dejan gotas fuera del agua |
| `clue-corn-*` | `grano de maiz.png` | `duck-trail1` (pato), `monkey2` (monos) | **rehacer → C5 en el pato, C12 en los monos** | A 28 px es una papa ocre, sin nada que la haga grano. En `monkey2` la consigna dice "la banana que se les cayó" y se junta esto |
| `clue-webfoot-*` | `huella palmeada.png` | `duck-trail2` (pato) | **rehacer → C3** | Se lee como una corona: tres bolitas sobre un triángulo. No tiene dedos largos ni membrana |
| `clue-footprint-*` | `huella negra.png`, `huella gris.png` | `monkey1` (monos); `trail3` (fuera del recorrido) | **conservar el archivo; en los monos → C8** | Es una buena huella de pájaro de tres dedos, pero en el caso de los monos dice lo contrario de lo que es. Sirve como opción "gallina" de la deducción por huellas (`docs/21` N6) |
| `clue-breadcrumb-*` | `miga de pan.png` | ninguno desde T21 | conservar, sin uso | Se lee como pan mordido. Ningún nivel la usa |
| `sector-leaf` | `hoja.png` | `night1`–`night3` | **conservar** | Se entiende, el estilo es el correcto. Es la mejor ancla de estilo entre los objetos chicos |
| `sector-stone` | `piedra.png` | `night3` | **reemplazar por B12** | Un óvalo gris no dice nada del erizo (`docs/19` §3.2) |
| `hedgehog-curled` | `erizo enroscado.png` | `night4` | conservar | Es el hallazgo, no una pista |
| `sign-fish`, `sign-turtles`, `sign-monkeys` | carteles | la deducción de los peces | conservar | Funcionan |
| `sector-flower*`, `sector-honeycomb` | `flor.png`, `panal.png` | abeja (paradas) | conservar | No son pistas |

Y las pistas que todavía no existen:

| Pista | Para qué | Pedido |
|---|---|---|
| Huellita de erizo | `night-rastro` (`docs/21` N2) | C7 |
| Manito de mono | `monkey1` | C8 |
| Mechón de lana | `sheep-lana` (`docs/21` N5, decisión 1) | C9 |
| Huella de tortuga | `turtle-huellas` (`docs/21` N6, decisión 1) | C10 |
| Cáscara de banana | `monkey-lianas` (`docs/21` N4) | C11 (reemplaza la mitad de B13) |
| Banana | `monkey2` | C12 (reemplaza la otra mitad de B13) |
| Manzana, hongo | `night2`, `night3` | B12, en `docs/20` |

---

## 2. Estado

ChatGPT: cambiá solo la columna "Estado", de `pendiente` a `hecho`, cuando la
imagen esté guardada y pase su checklist.

| ID | Archivo en `art-source/` | Qué | Dónde se usa | Prioridad | Estado | Reemplaza a |
|---|---|---|---|---|---|---|
| C4 | `pista burbujas.png` | Tres burbujas que suben | peces: `f2-guirnalda` | **alta** | hecho (T43: en el juego) | `burbuja.png` |
| C2 | `pista pluma de pato.png` | Pluma amarilla de pato | pato | **alta** | hecho (T43: en el juego) | `pluma verde.png`, `pluma gris.png` |
| C1 | `pista charco.png` | Charco de agua | pato: la pista de las gotas y `duck-charcos` | **alta** | hecho (T43: en el juego) | `gota de agua.png` (en el pato) |
| C8 | `pista mano de mono.png` | Manito de mono | monos: `monkey1` | **alta** | hecho (T43: en el juego) | `huella negra.png` (en los monos) |
| C12 | `pista banana.png` | Banana entera | monos: `monkey2` | **alta** | hecho (T43: en el juego) | `grano de maiz.png` (en los monos); B13 |
| C3 | `pista huella de pato.png` | Huella palmeada | pato; deducción por huellas | media | hecho (T43: en el juego) | `huella palmeada.png` |
| C5 | `pista semillas.png` | Tres semillas | pato | media | hecho (T43: en el juego) | `grano de maiz.png` (en el pato); B11 |
| C6 | `pista escama.png` | Escamitas de pez | peces: `f2-agua2`, `f2-buceo` | media | hecho (T43: en el juego) | `gota de agua.png` (en los peces) |
| C11 | `pista cascara de banana.png` | Cáscara de banana vacía | monos: `monkey-lianas` | media | hecho (T43: registrada; `monkey-lianas` no existe todavía) | B13 |
| C7 | `pista huellita de erizo.png` | Huellita de erizo | noche: `night-rastro` | media | hecho (T43: registrada; `night-rastro` no existe todavía) | — |
| B12 | ver `docs/20` §6 | Manzana y hongo | noche: `night2`, `night3` | media | hecho (T43: en el juego) | `piedra.png` (en la noche) |
| C9 | `pista lana.png` | Mechón de lana | ovejas: `sheep-lana` | media (decisión 1 aprobada 2026-10-02) | pendiente | — |
| C10 | `pista huella de tortuga.png` | Huella de tortuga | tortugas: `turtle-huellas` | media (decisión 1 aprobada 2026-10-02) | pendiente | — |

---

## 3. El estilo, y la regla que impone el juego

### 3.1 Cómo se ve el arte que funciona

Mirado sobre `carrier-octopus.png` (el Pulpito), `animal-pato.png`,
`animal-pez.png`, `sector-leaf.png`, `sector-flower.png` y `sign-fish.png`.
Los colores son medidos, redondeados.

- **Contorno casi negro y neutro** (≈ `#101010` en todos), grueso, de
  puntas redondeadas. En una lámina de 1024 px, entre 30 y 45 px.
- **La línea tiene mano**: tiembla un poco, el grosor varía, las curvas no
  cierran perfecto. La gota y la burbuja de hoy no la tienen, y por eso se
  ven de otro juego.
- **Relleno plano, un color por forma**, que a veces se pasa un poco del
  contorno. Nada de sombra, brillo ni degradé.
- **El detalle interior es línea oscura, nunca otro color**: el ala del
  pato, la nervadura de la hoja, la sonrisa y las aletas del pez.
- **Formas gordas.** Si un rasgo no se entiende a 24 px, no va.
- **Colores de la paleta de personajes**: Pulpito ≈ `#f25a24`, pato ≈
  `#f5d10a` con pico ≈ `#f2780a`, pez ≈ `#f5780a`, tortuga ≈ `#86d236`, hoja
  ≈ `#66d236`, flor ≈ `#c893b4`, oveja casi blanca, llama ≈ `#e4d6c6`.
  Saturados y alegres, no apagados.
- **Los fondos son otra cosa**: ilustración con profundidad y textura (el
  "renovado" de `docs/19` §8, decisión 7). Una pista nunca toma ese estilo.

### 3.2 Lo que hace el juego con cada pista (y por qué salió un círculo)

`scripts/art/build_art.py` no usa la pista tal cual:

1. **Recolorea el relleno a un solo color**, el de la pista en
   `client/src/detective/palette.ts`. Todo píxel oscuro (luma menor que 90)
   queda como contorno; **todo lo demás pasa al color de la pista**. Por eso
   el brillo blanco de `burbuja.png` se volvió celeste y quedó un disco liso.
   Y por eso la pluma es verde: su color es `PLUME = #2f6b5c`, "la
   iridiscencia de una pluma de gallina", del caso viejo.
2. **Hace la versión apagada** (gris `#838383`) a partir del mismo dibujo:
   así se ve la pista antes de que el dedo pase.
3. **Las huellas son un solo bloque negro**: todo el dibujo pasa a negro, sin
   contorno aparte ni líneas adentro.
4. La pista se dibuja a **28 unidades** (unos 28 px en una tablet),
   **repetida muchas veces** a lo largo del camino, y **rotada** para seguir
   la dirección del trazo: lo que en el dibujo apunta hacia arriba, en el
   juego apunta hacia adelante.

Consecuencia, que va dentro de cada prompt: **dos colores, contorno y un
relleno; todo detalle, con línea oscura; el frente, hacia arriba.**

### 3.3 Dos cosas que se piden distinto que en `docs/09` §9 y `docs/20` §6

- **No se pide la versión gris aparte.** El pipeline la saca del mismo
  dibujo (ya lo hace con la gota, el grano, la miga y la burbuja). La prueba
  de "funciona en gris" pasa al checklist (§3.4, punto 6).
- **Las huellas se piden una sola**, no en par. La del otro pie es el mismo
  dibujo espejado por código, que sale idéntico; dos dibujadas por separado
  salen distintas.

### 3.4 Checklist común (vale para todos los pedidos)

1. **¿El fondo es transparente de verdad?** Abrila sobre un fondo oscuro. Si
   aparece un blanco, un gris o un damero pintado, se rechaza.
2. **¿El contorno es negro neutro?** Si tira a azul, marrón o verde, se
   rechaza (el error que más se repitió, `docs/09` §1).
3. **¿La línea tiembla y el relleno se pasa un poco en algún lado?** Si es
   una curva perfecta y el relleno calza exacto, es vector: se rechaza.
4. **¿Hay solo dos colores?** Contorno y un relleno (en las huellas, uno
   solo: negro). Un brillo blanco o una sombra se rechazan.
5. **¿Se entiende a 28 px?** Achicala y mirala de lejos. Tiene que decir qué
   es sin la frase del Pulpito.
6. **¿Se entiende en gris?** Pasala a gris plano: la forma sola tiene que
   seguir diciendo qué es.
7. **¿Aguanta repetida?** Pegala unas treinta veces a lo largo de una curva.
   Si se vuelve una mancha, se rechaza (`docs/09` §5).
8. **¿El frente apunta hacia arriba?**

---

## 4. Los pedidos

Cada bloque de código es el prompt completo: se pega entero.

### C4 — Las burbujas de los peces (alta)

- **Archivo**: `art-source/pista burbujas.png`. PNG 1024 × 1024, fondo
  transparente.
- **Adjuntar**: `art-source/hoja.png` (tamaño de formas y nivel de detalle).
- **Qué es y por qué**: la estela que dejaron los peces al escaparse por la
  laguna. El chico tiene que pensar "burbujas, algo respira bajo el agua"
  para elegir el cartel de PECES en la deducción. Un círculo solo es una
  pelota; **tres de distinto tamaño en columna** son burbujas que suben.

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: three round water bubbles rising in a short column, as
if a fish breathed them out underwater. The BIGGEST bubble is at the
bottom, a medium one above it and slightly to one side, a small one at
the top. Small clear gaps between them: they do not touch. Each bubble
is a round outline with ONE short curved #1a1a1a line inside it, close
to its upper-left edge, as the shine. Fill light cyan #4fb3d9.
```

- **Evitar**: un solo círculo; brillos blancos; burbujas pegadas en un
  racimo (a 28 px se vuelven una mancha); peces u ondas de agua alrededor.
- **Checklist**: el común (§3.4), y además:
  1. ¿Son tres, de tres tamaños distintos, la más grande abajo?
  2. ¿El brillo es una rayita oscura adentro, no una mancha blanca?
  3. A 28 px, ¿se ven como burbujas y no como un semáforo o tres pelotas?

### C2 — La pluma del pato (alta)

- **Archivo**: `art-source/pista pluma de pato.png`. PNG 1024 × 1024, fondo
  transparente.
- **Adjuntar**: `art-source/pato.png` (el color: la pluma es de ese pato) y
  `art-source/hoja.png` (para que se vea que **no** tiene que parecerse a
  eso).
- **Qué es y por qué**: una pluma que se le cayó al pato. En la deducción el
  Pulpito dice "La vaca no tiene plumas". Tiene que ser **del color del pato**
  para que el chico la relacione con él, y **no puede parecer una hoja**: la
  de hoy tiene lóbulos parejos, punta aguda y vena, que es una hoja.

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one soft, fluffy duck feather, tip pointing UP, the kind
that falls off a yellow cartoon duckling. A gently curved central
quill drawn as a thick #1a1a1a line, which sticks out below the vane
as a short bare stem. The vane is soft and rounded, a little wider on
one side than the other, with a ROUNDED tip, not a pointed one. Two or
three small V-shaped notches are cut into its edges where the barbs
split apart. Fill warm duckling yellow #f2c94c, the same yellow as the
attached duck.
```

- **Evitar**: que parezca una hoja (nervaduras que salen de la vena, punta
  aguda, lóbulos simétricos, verde); una pluma de escribir; plumas de
  colores.
- **Checklist**: el común (§3.4), y además:
  1. Al lado de `hoja.png`, ¿se distinguen al instante?
  2. ¿Es amarilla como el pato, no verde ni blanca?
  3. ¿Tiene el tallito pelado abajo y las muescas en el borde?

### C1 — El charco del pato (alta)

- **Archivo**: `art-source/pista charco.png`. PNG 1024 × 1024, fondo
  transparente.
- **Adjuntar**: `art-source/hoja.png` (tamaño de formas y nivel de detalle).
- **Qué es y por qué**: el pato salió de la laguna chorreando y fue dejando
  charquitos. Reemplaza a las gotas, a pedido de la autora. En la deducción
  el Pulpito dice "El gato no vino mojado". En `duck-charcos`
  (`docs/21` N1) el pato salta de charco en charco.

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: a small puddle of water on the ground, seen from above,
as if a wet duck had just stepped out of it. One flat, rounded,
irregular blob, about 1.3 times taller than wide, with a wavy, uneven
edge like a real puddle (never a perfect oval). Inside it, TWO short
curved #1a1a1a lines, like little ripple rings on the water. Just
above its top edge, two small separate drops splashing up, each drop
at least one eighth of the puddle's width. Fill clear water blue
#5aa6d6.
```

- **Evitar**: una gota con forma de lágrima (es lo que se reemplaza); un
  óvalo perfecto; reflejos blancos; barro marrón; una huella adentro (la
  huella es otra pista, C3).
- **Checklist**: el común (§3.4), y además:
  1. ¿Se lee como charco (una mancha de agua en el piso) y no como gota ni
     como piedra azul?
  2. ¿El borde es irregular?

### C8 — La manito del mono (alta)

- **Archivo**: `art-source/pista mano de mono.png`. PNG 1024 × 1024, fondo
  transparente.
- **Adjuntar**: `art-source/huella negra.png` (el grosor y el negro de una
  huella que ya funciona; no su forma).
- **Qué es y por qué**: las manos que dejó el mono al trepar la liana
  (`monkey1`: "juntá las huellas en la liana"). Hoy esa pista es una huella
  de pájaro. Una manito se reconoce sin explicación, y en la deducción
  descarta a la abeja: "La abeja no deja huellas".

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid shape filled with #1a1a1a.
No outline of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one monkey handprint, fingers pointing UP. A rounded
palm; on top of it four long, slightly curved fingers side by side,
with small clear gaps between them so each finger shows; and a thumb
set lower down on one side, sticking out and apart from the fingers.
Like a small child's hand, but with longer fingers.
```

- **Evitar**: una mano humana de adulto; un guante; dedos pegados (a 28 px
  se vuelven un mitón); garras.
- **Checklist**: el común (§3.4), y además:
  1. A 28 px, ¿se cuentan los dedos y se ve el pulgar separado?
  2. Al lado de `huella negra.png`, ¿nadie las confunde?

### C12 — La banana (alta; reemplaza la mitad de B13)

- **Archivo**: `art-source/pista banana.png`. PNG 1024 × 1024, fondo
  transparente.
- **Adjuntar**: `art-source/hoja.png` (tamaño de formas y nivel de detalle).
- **Qué es y por qué**: la banana que se les cayó a los monos (`monkey2`,
  que hoy dice "banana" y muestra un grano de maíz). En la deducción: "El
  erizo no come bananas".

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one whole, unpeeled ripe banana standing on end, stem
pointing UP, curved like a gentle crescent. The short stem at the top
and the small tip at the bottom are drawn solid #1a1a1a. One curved
#1a1a1a line runs along its length, like the ridge of the peel. Fill
banana yellow #f2d24b.
```

- **Evitar**: un racimo; una banana pelada; manchas marrones (se vuelven
  amarillas o negras al recolorear); que parezca una luna.
- **Checklist**: el común (§3.4), y además: 1. A 28 px, ¿es una banana y no
  una luna o una sonrisa?

### C3 — La huella del pato (media)

- **Archivo**: `art-source/pista huella de pato.png`. PNG 1024 × 1024, fondo
  transparente.
- **Adjuntar**: `art-source/pato.png` (las patas del pato: tres dedos con
  membrana) y `art-source/huella negra.png` (la huella de gallina, para que
  sea **distinta**).
- **Qué es y por qué**: la huella que dejó el pato en el barro de la orilla.
  Hoy se lee como una corona. Además es una de las tres opciones de la
  deducción por huellas de las tortugas (`docs/21` N6), al lado de la de
  gallina: las dos tienen que distinguirse de un vistazo.

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid shape filled with #1a1a1a.
No outline of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one webbed duck footprint pressed into mud, toes pointing
UP. Three long, rounded toes spread like an open fan (left, centre,
right), each ending in a rounded tip. The toes are joined by webbing:
between each pair of toe tips the front edge of the web curves INWARD,
making a scalloped edge. Below the toes, a small rounded heel. The
whole print is wider at the top than at the bottom, like a triangle
standing on its point.
```

- **Evitar**: tres bolitas sobre un triángulo (la de hoy); dedos finos como
  palitos o un dedo hacia atrás (eso es la gallina); forma de corona.
- **Checklist**: el común (§3.4), y además:
  1. ¿Se ven los tres dedos largos y la membrana entre ellos?
  2. Al lado de `huella negra.png`, ¿son claramente dos animales distintos?

### C5 — Las semillas (media; reemplaza las semillas de B11)

- **Archivo**: `art-source/pista semillas.png`. PNG 1024 × 1024, fondo
  transparente.
- **Adjuntar**: `art-source/hoja.png` (tamaño de formas y nivel de detalle).
- **Qué es y por qué**: las semillas que picoteó el pato. Hoy es un grano
  suelto que a 28 px parece una papa. **Tres, con rayas**, se leen como
  semillas de girasol, las que se les tiran a los patos y las palomas.

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: three fat sunflower seeds, the kind people throw to
ducks, fanned out and slightly overlapping, all pointing UP. Each seed
is a plump teardrop with a pointed top and a rounded bottom, with two
thick #1a1a1a stripes running along its length. Fill warm grain
yellow-brown #d9a441.
```

- **Evitar**: un solo grano; una pila de puntitos; maíz en mazorca;
  semillas sin rayas (se vuelven piedritas).
- **Checklist**: el común (§3.4), y además: 1. A 28 px, ¿se lee como
  semillas y no como piedras ni como papas?

### C6 — Las escamitas del pez (media)

- **Archivo**: `art-source/pista escama.png`. PNG 1024 × 1024, fondo
  transparente.
- **Adjuntar**: `art-source/pez.png` (el color: las escamas son de ese pez).
- **Qué es y por qué**: escamitas naranjas que brillan en el fondo de la
  laguna (`f2-agua2` y `f2-buceo`, `docs/21` N3). Son del color del pez del
  cartel, y eso ayuda a elegir PECES en la deducción. **Es la pista más
  dudosa del pedido** (`docs/21` decisión 2): una escama suelta es menos
  conocida que una burbuja. Por eso se pide un grupito, que se lee como "la
  piel del pez".

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: a tiny patch of three fish scales that fell off a
goldfish, overlapping like roof tiles: two scales side by side at the
bottom and one on top, centred between them. Each scale is a rounded
half-disc with its round edge pointing UP, outlined in #1a1a1a. Fill
bright goldfish orange #f28a1e, the same orange as the attached fish.
```

- **Evitar**: una concha de mar; una sola escama; brillos; un pez entero.
- **Checklist**: el común (§3.4), y además: 1. Al lado de `pez.png`, ¿se
  entiende que es un pedacito de ese pez y no una concha?

### C11 — La cáscara de banana (media; reemplaza la otra mitad de B13)

- **Archivo**: `art-source/pista cascara de banana.png`. PNG 1024 × 1024,
  fondo transparente.
- **Adjuntar**: `art-source/hoja.png` (tamaño de formas y nivel de detalle).
  Si C12 ya está hecha, adjuntarla también: tiene que ser la misma banana.
- **Qué es y por qué**: "¡Cáscaras de banana colgando de las lianas!"
  (`docs/19` §3). Es la pista de `monkey-lianas` (`docs/21` N4). Tiene que
  distinguirse de la banana entera (C12) **por la silueta**, porque las dos
  tienen el mismo amarillo.

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: an empty banana peel, the classic cartoon one, hanging
with its short stem pointing UP. Below the stem, three long peel flaps
open outwards and droop down, splayed apart like the petals of an
upside-down flower, with nothing inside. Each flap has one #1a1a1a
line along its middle. The stem is solid #1a1a1a. Fill banana yellow
#f2d24b.
```

- **Evitar**: la fruta asomando adentro de la cáscara; que parezca un
  pulpo o una flor; manchas marrones.
- **Checklist**: el común (§3.4), y además: 1. Al lado de C12, ¿se ve de
  un vistazo cuál es la banana y cuál la cáscara?

### C7 — La huellita del erizo (media)

- **Archivo**: `art-source/pista huellita de erizo.png`. PNG 1024 × 1024,
  fondo transparente.
- **Adjuntar**: `art-source/huella negra.png` (el grosor y el negro de una
  huella que ya funciona; no su forma).
- **Qué es y por qué**: en `night-rastro` (`docs/21` N2) no hay paredes:
  estas huellitas, que solo se ven bajo la linterna, **son** el camino. El
  chico no necesita saber que son de erizo (la deducción descarta a los ya
  rescatados), pero tienen que verse chiquitas y de un animal de patitas.

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid colour, #1a1a1a. No outline
of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one small hedgehog footprint, toes pointing UP. A rounded
palm pad at the bottom and FIVE small round toe pads in an arc above
it, like a tiny star-shaped hand. The toe pads are separate from the
palm and from each other, with clear gaps at least as wide as a thick
marker line.
```

- **Evitar**: una pata de gato o de perro (cuatro dedos y un pad en forma
  de corazón); dedos largos (eso es el mono); uñas.
- **Checklist**: el común (§3.4), y además: 1. A 28 px, ¿los dedos siguen
  separados y no se funden en una mancha? 2. Al lado de C8, ¿nadie las
  confunde?

### C9 — El mechón de lana (media)

- **Archivo**: `art-source/pista lana.png`. PNG 1024 × 1024, fondo
  transparente.
- **Adjuntar**: `art-source/oveja.png` (el color y la textura de la lana:
  tiene que ser de esa oveja).
- **Qué es y por qué**: lana enganchada en los postes del alambrado
  (`sheep-lana`, `docs/21` N5). En la deducción: "¿Quién deja lana?".
  Va sobre el canal de piedra oscuro de la ladera, así que el crema claro se
  ve bien.

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one fluffy tuft of sheep's wool, the same wool as the
attached sheep, a little taller than wide. Its outline is made of many
small round bumps, like a small cloud. Inside, three or four small
tight curls drawn as short #1a1a1a spirals. Fill warm cream #f3ecd9.
```

- **Evitar**: una nube con cielo; algodón de azúcar rosa; un ovillo con
  hilo suelto; una oveja entera.
- **Checklist**: el común (§3.4), y además: 1. Al lado de `oveja.png`, ¿se
  entiende que es un pedacito de su lana y no una nube?

### C10 — La huella de la tortuga (media)

- **Archivo**: `art-source/pista huella de tortuga.png`. PNG 1024 × 1024,
  fondo transparente.
- **Adjuntar**: `art-source/tortuga.png` (las patas de la tortuga) y C7 si
  ya está hecha (tiene que distinguirse de ella).
- **Qué es y por qué**: en `turtle-huellas` (`docs/21` N6) la tortuga dejó
  huellas a los dos lados del surco de la cola. La deducción pone esta
  huella al lado de la del pato (C3) y la de la gallina (`huella
  negra.png`): el chico elige cuál es igual a la que juntó. Las tres
  siluetas tienen que ser **muy distintas**.

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid colour, #1a1a1a. No outline
of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one turtle footprint in the sand, front pointing UP. A
wide, rounded, oval pad, wider than tall. Its top edge is bumpy, made
of four short, blunt, stubby toes that are JOINED to the pad (no gaps
between toes and pad). In front of the toes, three short, thick claw
scratches, separate from the pad.
```

- **Evitar**: dedos separados en puntitos (eso es el erizo, C7); dedos
  largos; un caparazón.
- **Checklist**: el común (§3.4), y además: 1. Puesta al lado de C3 y de
  `huella negra.png`, ¿un chico las distingue sin dudar?

---

## 5. Notas para la implementación (no son para ChatGPT)

Para la sesión que meta las imágenes en el juego.

1. **Pipeline.** Cada pista coloreada lleva dos filas en `SINGLES`
   (`build_art.py`), las dos desde la misma fuente, como `miga de pan.png`:
   `(fuente, 'clue-<kind>-earned.png', 256, TOKEN, True)` y la misma con
   `CLUE_DRAINED`. Las huellas (C3, C7, C8, C10) van con `keep_ink=False`,
   como `huella palmeada.png`. Cada fuente nueva necesita su entrada
   `(1024, 1024)` en `AUTHORED_SOURCE_SIZES`, y medir el alpha fantasma
   (`docs/17` §3 bis).
2. **Colores (`detective/palette.ts`).** Sin esto, el arte nuevo sale igual
   de mal: `PLUME` pasa de `#2f6b5c` a un amarillo de pato. Hacen falta
   tokens para el charco (`POND` es pizarra oscuro, `#3f6f8f`: probar uno más
   claro), la escama (naranja), la lana (crema) y la banana (amarillo).
   `palette.test.ts` exige contraste contra el corredor y colores distintos
   dentro de cada caso: **la pluma amarilla y las semillas ocre están en el
   mismo caso** y pueden chocar; si chocan, bajar las semillas hacia un
   marrón.
3. **Tipos de pista (`ClueKind`).** No se guardan en el progreso (se
   revisó `progress/`), así que agregar tipos nuevos es seguro. En el caso
   de los monos, `MONKEY_CLUE_VERDICT` (`detective/cases.ts`) usa `corn` y
   `footprint`: pasa a banana y manito.
4. **Huellas en par.** La del otro pie es la misma imagen espejada al
   dibujar (§3.3); la alternancia está en `docs/09` §5.
5. **Textos que no coinciden con lo que se ve** (T40 toca varios):
   `duck-trail2` "El sendero de migas", `duck-trail3` "Las burbujas suben y
   bajan", `monkey2` "la banana" con un grano de maíz.
6. **Hecho en T43 (2026-10-02).** Las pistas de color no se recolorean:
   van por el modo `contour` (conservan el relleno dibujado, el contorno
   pasa a `ART_OUTLINE`), porque los dibujos nuevos ya son de dos tonos y
   el recoloreo plano era la causa de la §3.2. El token de cada pista es el
   relleno medido (`build_art.py` lo escribe como `fill` en el manifiesto y
   `artManifest.test.ts` lo exige igual). Tipos nuevos: `puddle`, `seeds`,
   `duckFeather`, `scale`, `handprint`, `banana` (en el juego) y
   `hedgehogPrint`, `bananaPeel` (registrados, sin nivel). `webfoot` y
   `bubble` cambiaron de dibujo sin cambiar de tipo.
7. **No borrar** `gota de agua.png`, `grano de maiz.png` ni `pluma
   verde.png`: `trail1`, `trail2` y `trail4` (fuera del recorrido) todavía
   usan la gota, el grano y la pluma. Si esos niveles viejos no se tocan,
   conviene darle a cada pista nueva su propio tipo en vez de cambiarle el
   dibujo a uno existente.

---

## 6. Qué cambia de `docs/20`

| Pedido de `docs/20` | Qué pasa | Por qué |
|---|---|---|
| §6, "adjuntar `pluma verde.png` y `huella palmeada.png` a todas" | **Ya no.** Adjuntar `hoja.png` | Son dos de las pistas que se rehacen: anclar a ellas copia sus defectos |
| §6, "se piden dos veces (a color y en `#838383`)" | **No hace falta la fila gris** | El pipeline la saca del mismo dibujo (§3.3) |
| B11, semillas y gotas del pato | **Reemplazado** por C5 (semillas) y C1 (charco) | La autora pidió charcos, no gotas. Y B11 no decía nada del relleno único (§3.2) |
| B12, manzana y hongo | **Sigue en `docs/20`**, sin cambios de fondo | Son objetos de la noche, no marcas de camino: el pipeline les conserva los colores (modo `contour`, como `hoja.png`), así que la manzana roja con hoja verde funciona. Solo cambia la referencia: adjuntar `hoja.png` en vez de las dos de arriba |
| B13, pistas del mono | **Reemplazado** por C11 (cáscara) y C12 (banana) | Son marcas de camino: se recolorean a un solo color, y "banana con la punta marrón" pierde la punta. Además cada una va a un nivel distinto |
| B17, piel mudada de víbora | Sigue en `docs/20` | No es pista de camino |
