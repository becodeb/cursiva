# 20 — Pedidos de arte, tanda 3

Escrito el 2026-09-26, junto con `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md`.
Sigue el formato de `docs/17` y de `docs/18` §6: cada pedido está listo para
pegar en ChatGPT. Los prompts van en inglés; lo demás, en castellano.

Reemplaza la lista de `docs/18` §6 para lo que toca: A2, A3, A4, A5 y A6 se
vuelven a pedir acá con las reglas de composición nuevas (ver la tabla de
equivalencias en §1). **A1 (las huellas del mapa) no está acá**: lo resuelve
otra sesión, en la rama `exp/svg-art`.

Tres cosas para leer primero:

1. **Qué se pide y en qué orden** → §1.
2. **Cómo se piden los fondos** (lo nuevo de esta tanda) → §2.
3. **Qué NO hay que pedir**, porque sale por código → §7.

---

## 1. En 30 segundos

Diecisiete pedidos en ocho hojas. **Una hoja = una conversación o una imagen
con ChatGPT**: un personaje pedido en la misma imagen sale igual en todas sus
poses; pedido en dos veces, sale distinto (`docs/17` §3).

| ID | Qué | Hoja | Prioridad | Lo necesita | Reemplaza a |
|---|---|---|---|---|---|
| B1 | Fondo de la laguna | Fondos de día | **alta** | pato, peces, delfines (12 niveles) | — |
| B2 | Fondo de la ladera | Fondos de día | **alta** | ovejas | — |
| B3 | Fondo de la cordillera | Fondos de día | **alta** | llamas | — |
| B4 | Fondo del bosque | Fondos de día | **alta** | abeja, monos | — |
| B5 | Fondo de la noche del erizo | Fondos de noche | **alta** | erizo | — |
| B6 | Fondo de la pecera | Fondos de día | media | recinto de los peces (prólogo) | A2 |
| B7 | Fondo del sendero, con huellas | Fondos de día | **alta** | sendero (prólogo) | A3 |
| ~~B8~~ | ~~Globo con la cola abajo al centro~~ | — | — | **ya no hace falta** (T16 ubica el globo existente por la punta medida de su cola, ver §4) | — |
| B9 | Globo con la cola abajo a la izquierda | Globos | baja | el Pulpito sobre la escena, pantallas bajas | — |
| B10 | El mono | Mono | **alta** | monos (hoy es un bloque gris con la palabra MONO) | A6 |
| B11 | Pistas del pato: semillas y gotas | Pistas | media | caso del pato | A4 (parte) |
| B12 | Las cosas del erizo: manzana, hongo | Pistas | media | caso de la noche | A5 |
| B13 | Pistas del mono: cáscara de banana, banana | Pistas | baja | caso de los monos | A4 (parte) |
| B14 | El erizo con espinas | Erizo | media | el mapa y el rescate del erizo | — |
| B15 | El Pulpito detective: señalar, pensar, festejar | Pulpito | baja | el Pulpito sobre la escena | — |
| B16 | Los patitos | Patitos | baja | juntar la familia del pato | — |
| B17 | Piel mudada de víbora | Pistas | baja | la entrada de las víboras | A4 (parte) |

**Por dónde empezar:** B1, B4 y B10. La laguna y el bosque son los fondos que
más niveles cubren, y el mono es el único placeholder que el chico ve hoy
(la porción 2 de `docs/19`, el Pulpito sobre la escena, ya se resolvió sin
`B8` — T18/T16).

---

## 2. Cómo se piden los fondos

### 2.1 Por qué no se usa la variante de fondos de `docs/09` §9

Esa variante pide "entre los bordes, el suelo es UN solo color, sin nada".
ChatGPT la cumplió al pie de la letra, y eso es justo lo que la autora ve feo:
**dos tiras de decoración y un rectángulo liso en el medio** (laguna, ladera,
cordillera, bosque, noche del erizo). Los cuatro fondos que funcionan (arena,
noche con linterna, recinto de los monos, pasillo de vidrio) se pidieron de
otra manera: **adjuntando uno ya aprobado como referencia de estilo**, como
dicen `docs/18` §6 (A2) y `docs/19` §8 decisión 7. Esta tanda sigue ese camino
para todos los fondos.

La regla de `docs/09` §9 "nunca uses un asset existente como referencia de
contorno" sigue valiendo para **recortes** (personajes, objetos). Para fondos
completos, la referencia adjunta es un fondo entero y aprobado, no un recorte
que pueda haber derivado.

### 2.2 La composición, que ahora importa más que el detalle

El juego ocupa la pantalla entera de una tablet (de 4:3 a 16:10) o de un
escritorio ancho (hasta 2.1:1). El camino se dibuja en el medio. Cuanto más
ancha la pantalla a la misma altura, menos se ve del dibujo: una imagen 3:2 en
una pantalla de 4:3 pierde cerca del 11 % del ancho (con los botones, hasta el
15 %), pero esa misma imagen 3:2 en un escritorio de 2.1:1 (por ejemplo,
1920x911) pierde cerca del **29 % del alto**, recortado arriba y abajo — así se
descubrió esta regla (`odd/tasks/prewriting-stage-completion.md`, T22).

**Por eso, de acá en más, los fondos se piden en 2:1 (2048x1024) en vez de
3:2 (1536x1024).** La idea: dibujarlos más anchos y dejar que las pantallas más
cuadradas recorten solo los costados, nunca arriba ni abajo. Los fondos ya
hechos (arena, noche del zoológico, recinto de los monos) siguen siendo 3:2 y
funcionan sin cambios — el código soporta cualquier proporción, leída por
imagen, con 3:2 como valor por defecto para el arte que ya existe.

| Zona (fondo 2:1, 2048x1024) | Qué va ahí |
|---|---|
| Los costados (el 16.7 % de la izquierda y el de la derecha — 341 px cada uno) | Decoración: se recorta en las pantallas más cuadradas (4:3), se ve entera en un escritorio ancho |
| La **zona central de seguridad**, 4:3 de proporción — los 1365 px del medio del ancho, alto completo | Lo importante: el camino, los animales, cualquier cosa que el chico tenga que ver siempre, en cualquier pantalla |
| Adentro de la zona central, la franja horizontal (el alto exacto cambia por fondo, está en cada pedido) | Tranquila: un color suave con, a lo sumo, manchas grandes y muy suaves. Sin objetos, sin contornos negros, sin brillos |
| Arriba, abajo y las cuatro esquinas | El detalle interesante, repartido para que ningún lado quede vacío |

**Por qué 1365 px y no otro número:** es exactamente el ancho de una pantalla
4:3 dentro de una imagen 2:1 (`4/3 ÷ 2 × 2048 ≈ 1365`) — la pantalla más
cuadrada que el juego soporta en horizontal (una pantalla vertical usa el
cartel de "girá la tablet", no este recorte). Ninguna pantalla soportada puede
recortar más adentro que eso: `TraceCanvas.tsx`'s `backdropSafeZoneCoversAt`
lo prueba como propiedad, no como observación (T22).

**Por qué la franja tiene límite de claridad y no solo "tranquila":** el
camino es de papel (`#fdfcf7`) y `backdrops.test.ts` exige 55 puntos de luma
entre el papel y el píxel más claro de **todas las filas** de la franja, de
punta a punta (`docs/09` §4). Un brillo blanco en el agua, una flor blanca o
una nube dentro de esas filas rompen la ley, aunque estén en el costado. Por
eso cada pedido dice qué filas y qué tono máximo.

### 2.3 El encabezado (va al principio de CADA pedido de fondo)

```
Match the drawing style, line weight and colour palette of the attached
reference image exactly. Landscape 2:1 (2048x1024), full-bleed, FULLY
OPAQUE: every single pixel painted, no transparency anywhere, not even
at the corners. No animals, no characters, no people, no text.
```

Y al final de cada pedido, este bloque de composición, con los números de
cada fondo:

```
Composition rules. They matter more than any detail:
- This is the backdrop of a finger-tracing game for young children. The
  game draws a path ON TOP of the middle of this picture.
- This image is WIDER than the screens it will be shown on. Up to 16.7%
  of the width (the outer ~340px on each side) may be cropped on the
  LEFT edge and the same on the RIGHT edge, depending on the device.
  Keep EVERYTHING important — the path, any object the child must
  notice — inside the CENTRAL 1365px of the 2048px width (the middle
  two thirds), a safe zone with a 4:3 shape. Treat the outer strips on
  both sides as decorative extension only.
- The MIDDLE BAND, from {TOP}% to {BOTTOM}% of the image height and
  across the WHOLE width (including the outer strips), is calm: {GROUND},
  one soft even colour close to {HEX}, with at most a few very large,
  very soft patches of a slightly different shade. Inside that band: no
  objects, no black outlines, no highlights, no sparkles, no white,
  nothing lighter than {HEX}, no small repeated marks.
- Put the interesting detail above and below that band and in the four
  corners, spread around the whole frame so no side looks empty.
```

**Qué referencia adjuntar:** de día, `art-source/fondo recinto monos.png` (el
mejor de los renovados); de noche, `art-source/fondo noche zoo.png`.

### 2.4 Al volver

1. **Opacidad**: `emit_opaque_canvas` rechaza la lámina entera si encuentra un
   solo píxel no opaco (`docs/17` Pedido 3). El alpha fantasma de `docs/17`
   §3 bis es un problema de recortes, no de fondos; si el fondo pasa la
   opacidad, no hace falta medirlo.
2. Guardarlo en `art-source/` con **el mismo nombre** del que reemplaza (la
   tabla de §3) y a 2048×1024 exactos (los fondos que todavía no se piden de
   nuevo se quedan en 1536×1024; las dos medidas conviven — `build_art.py`
   valida el tamaño de cada fuente por su propia fila en `PASSTHROUGHS`, no
   por una única constante). Correr `python3 scripts/art/build_art.py`.
3. El script vuelve a medir la franja (`sample_corridor_band`, que recorre el
   ancho REAL de la imagen, sea 1536 o 2048) y escribe `quiet`, `brightest` y
   el `w`/`h` reales en `client/public/art/manifest.json`. **Copiarlos a la
   fila del fondo en `client/src/zoo/backdrops.ts`**: se leen del manifest, no
   se estiman. Las filas de la franja (`top`/`bottom`) no cambian entre 1536 y
   2048: dependen solo del ALTO, que sigue siendo 1024.
4. `npm test`. Si falla la ley de 55 en `backdrops.test.ts`, hay tres salidas,
   en este orden: pedirlo de nuevo con la franja más apagada; pasar ese fondo a
   un canal oscuro con tinta clara, como ya hacen las víboras y las tortugas
   sobre la arena (`SAND_HOLLOW` + `TORCH_CHALK`); o achicar las filas medidas
   a las que el camino usa de verdad (la fila de `PASSTHROUGHS` en
   `build_art.py`), midiendo, no adivinando. Nunca bajar la ley.
5. Mirar la captura a 1024×768 y a 1180×820 antes de aprobarlo:
   `bash scripts/shot.sh '<url>' capturas/x.png 1024 768`.

---

## 3. Los fondos de nivel que están en uso

Mirados uno por uno el 2026-09-26. Las filas del medio son las del camino
(`corridorRows` en `zoo/backdrops.ts`), pasadas a porcentaje del alto.

| Fuente en `art-source/` | Aventuras que lo usan | Qué tiene de malo | Prioridad | Pedido |
|---|---|---|---|---|
| `fondo laguna.png` | pato, peces, delfines | Estilo viejo de tiras: juncos arriba, juncos abajo y dos tercios de la imagen en celeste grisáceo liso. No se lee como agua: sin orilla, sin reflejo, sin profundidad. El color apagado se ve sucio | **alta** | B1 |
| `fondo ladera.png` | ovejas | Una cordillera chiquita arriba, una cerca abajo y el 60 % de gris verdoso liso. No se lee como pasto ni como ladera | **alta** | B2 |
| `fondo cordillera.png` | llamas | Picos arriba, rocas abajo y un cielo gris liso en el medio que parece una pared | **alta** | B3 |
| `fondo bosque.png` | abeja, monos | Copas cortadas arriba, matas abajo y el 70 % de verde liso. Sin profundidad; las flores se sacaron a propósito (`docs/13` §4, decisión 8) y no volvieron en otra forma | **alta** | B4 |
| `fondo nocturno.png` | erizo | El más pobre: óvalos oscuros casi sin relleno, pasto dibujado como letras "M", una franja azul pizarra lisa. Parece un placeholder. Y no es el mismo lugar que la noche de la linterna, cuando en `docs/19` §3.2 el erizo se encuentra ahí mismo | **alta** | B5 |
| `fondo entrada vidrio.png` | recinto de los peces (prólogo) | Renovado y lindo, pero es un invernadero con piso brillante, no una pecera: el cierre dice "las algas, el cofre, las piedras" y no hay ninguno (D16 de `docs/18`) | media | B6 |
| `fondo sendero.png` | sendero (prólogo) | Plano, y el cielo es del mismo beige que el suelo: arriba se lee como una pared. Al limpiar el barro no aparece ninguna huella, que es el momento del prólogo (`docs/16` §2, beat 4) | **alta** | B7 |
| `fondo arena.png` | tortugas (prólogo), víboras, tortugas | Renovado, funciona: centro de arena tranquilo y detalle en las esquinas. La cascada roza el borde izquierdo que se recorta, sin consecuencias | conservar | — |
| `fondo noche zoo.png` | noche (linterna) | Renovado, funciona; casi siempre se ve a oscuras | conservar | — |
| `fondo recinto monos.png` | recinto de los monos (prólogo) | Renovado, el mejor de todos. Es la referencia de estilo de esta tanda | conservar | — |

Fuera de esta tabla: `art-source/fondo pecera.png` existe pero **no lo usa
nadie** (el recinto de los peces sale de `fondo entrada vidrio.png`; la tabla de
`docs/17` §1 quedó vieja en ese punto). El mapa del zoológico no es un fondo de
nivel y no entra en esta tanda.

### Hoja "Fondos de día": B1–B4, B6, B7

Pedir los seis **en la misma conversación**, con la misma referencia adjunta,
uno por mensaje. Así comparten paleta y trazo.

#### B1 — La laguna (alta)

Sale en `art-source/fondo laguna.png`. Franja: filas 135–889 → **13 % a 87 %**.
Tono máximo en la franja: `#b4c5d0` (luma 193; el papel exige ≤ 197).

```
<encabezado de §2.3>

A calm zoo duck pond seen from its grassy bank, in daylight. Reeds,
cattails, lily pads and round stones along the far shore at the top and
along the near shore at the bottom; a small wooden jetty in one bottom
corner and a low wooden fence in one top corner. The open water in the
middle is a soft, even blue-grey.

<bloque de composición de §2.3 con: TOP=13, BOTTOM=87,
GROUND="open pond water", HEX=#b4c5d0>
```

Los delfines usan este fondo fijado a la ventana (`docs/13` §4, decisión 9):
la orilla de arriba y la de abajo se ven siempre. Si los delfines caen sobre
la orilla, es la cuestión abierta de esa decisión, no de este pedido.

#### B2 — La ladera de las ovejas (alta)

Sale en `art-source/fondo ladera.png`. Franja: filas 220–866 → **21 % a 85 %**.
Este fondo usa canal de piedra (`CHANNEL_STONE`, luma 100), así que la regla
es al revés: **nada más oscuro que `#9da396`** en la franja.

```
<encabezado de §2.3>

A gentle green mountain pasture in daylight: far mountains with a
little snow and a few clouds along the top, a wooden sheep pen and a
small shepherd's hut in the top corners, a low stone wall and tufts of
grass along the bottom. The grassy slope in the middle is a soft, even
sage green.

<bloque de composición de §2.3 con: TOP=21, BOTTOM=85,
GROUND="the grassy slope", HEX=#9da396,
and "nothing darker than" instead of "nothing lighter than">
```

En B2 y B3 el bloque de composición dice **"nothing darker than {HEX}"** en
vez de "nothing lighter than": acá el camino es oscuro, y lo que tiene que
quedar lejos de él es lo oscuro.

#### B3 — La cordillera de las llamas (alta)

Sale en `art-source/fondo cordillera.png`. Franja: filas 166–858 → **16 % a
84 %**. Canal de piedra, igual que B2: **nada más oscuro que `#c8d3d8`**.

```
<encabezado de §2.3>

High Andean mountains in daylight: sharp snowy peaks along the top, big
grey rocks, cactus and a colourful woven blanket hanging on a fence
post in the bottom corners. The middle is pale open sky and distant
mist, one soft even pale grey-blue.

<bloque de composición de §2.3 con: TOP=16, BOTTOM=84,
GROUND="the pale open sky and mist", HEX=#c8d3d8,
and "nothing darker than" instead of "nothing lighter than">
```

#### B4 — El bosque (alta)

Sale en `art-source/fondo bosque.png`. Franja: filas 191–926 → **19 % a 90 %**.
Tono máximo: `#86a678`. Lo usan la abeja (flores y panal encima) y los monos
(bucles encima): **nada de flores pintadas en la franja**, porque le ganan a la
flor que hay que juntar (`docs/13` §4, decisión 8).

```
<encabezado de §2.3>

A leafy zoo forest clearing in daylight: tall tree trunks and big
rounded canopies along the top, hanging vines in the two top corners,
ferns, mossy logs and a few mushrooms along the bottom. The clearing in
the middle is soft, even green grass. No flowers anywhere in the middle
band.

<bloque de composición de §2.3 con: TOP=19, BOTTOM=90,
GROUND="the grassy clearing", HEX=#86a678>
```

#### B6 — La pecera (media)

Sale en `art-source/fondo entrada vidrio.png` (**ese** nombre: es el que usa el
pipeline, no `fondo pecera.png`). Es un fondo de revelado: queda detrás del
vaho y no lleva camino, así que no tiene límite de claridad. Sí lleva la regla
de los costados, porque el Pulpito va a hablar encima (`docs/19` §4).

```
<encabezado de §2.3>

The inside of a big zoo aquarium seen from the front: water fills the
scene, tall green algae along the bottom, grey rounded stones, one
small closed wooden treasure chest half buried in the sand, a few
bubbles rising. No fish.

This image is WIDER than the screens it will be shown on. Up to 16.7%
of the width may be cropped on the LEFT edge and the same on the
RIGHT, depending on the device. Keep the chest and the algae inside
the central 1365px of the 2048px width (the middle two thirds). Leave
the upper middle of the water calm and open.
```

Si no se pide, la otra salida (`docs/18` §6, A2) es cambiar la frase del cierre
de los peces para que no nombre ni cofre ni algas.

#### B7 — El sendero, con huellas (alta)

Sale en `art-source/fondo sendero.png`. Fondo de revelado: es lo que aparece
al limpiar el barro, **y ahí tienen que aparecer las huellas** de los animales
que se escaparon (`docs/16` §2, beat 4). Es un solo fondo: no hace falta una
versión sin huellas, porque el barro las tapa hasta que el chico limpia.

```
<encabezado de §2.3>

A packed-earth footpath through a small zoo, in daylight, seen from
the front: low wooden fences, bushes and a couple of trees along the
top, a blank wooden signpost in one top corner, grass tufts and stones
along the bottom. The sky, if any shows, is light blue, clearly
different from the brown path.

On the path, a trail of animal FOOTPRINTS crosses the picture from
left to right: webbed duck prints, small two-toed hoof prints and
round paw prints, mixed together, all heading to the right, as if
many animals had walked out together. The prints are dark brown and
clearly readable.

This image is WIDER than the screens it will be shown on. Up to 16.7%
of the width may be cropped on the LEFT edge and the same on the
RIGHT, depending on the device. Keep the fences, trees and signpost
inside the central 1365px of the 2048px width (the middle two
thirds); the footprints may run into the outer strips or off the
right edge.
```

### Hoja "Fondos de noche": B5

#### B5 — La noche del erizo (alta)

Sale en `art-source/fondo nocturno.png`. **Adjuntar `art-source/fondo noche
zoo.png` como referencia**: es el mismo lugar, un rato después. En `docs/19`
§3.2 el erizo se encuentra ahí, así que su nivel tiene que verse como la misma
noche.

La tinta del erizo es clara (`TORCH_CHALK`, luma 239), así que la franja tiene
que quedar **oscura**: nada más claro que `#526083` (luma 96; la ley exige
≤ 184, esto deja margen). La luna, las estrellas, el farol y las ventanas
encendidas van **fuera de la franja**.

```
<encabezado de §2.3>

The same zoo path as in the attached reference, later at night: dark
trees and bushes, a crescent moon and a few stars in the top band, the
lit lantern and the glowing dome windows only in the top corners,
round stepping stones and dark grass along the bottom. The ground in
the middle is soft, even dark slate blue.

<bloque de composición de §2.3 con: TOP=20, BOTTOM=85,
GROUND="the dark ground", HEX=#2a3346,
and "nothing lighter than #526083" for the band>
```

**Ojo al volver:** hoy el erizo mide las filas 51–973 (casi toda la imagen). Con
la luna y el farol arriba, esa medición va a fallar. Hay que achicar la fila del
erizo en `PASSTHROUGHS` a la franja 20 %–85 % (filas 205–870), y confirmar con
una captura que las espinas de los cuatro niveles caen adentro. Es el tercer
camino del punto 4 de §2.4, y acá es el primero que hay que probar.

---

## 4. Hoja "Globos": B9 (B8 ya no hace falta)

**B8 (la cola abajo al centro) ya no se pide.** `T16`
(`odd/tasks/prewriting-stage-completion.md`, Batch 2.6) resolvió el problema
que motivaba este pedido —el globo apuntando a un lugar vacío en vez de al
Pulpito— sin arte nuevo: `screen/bubblePlacement.ts` ubica el globo existente
(cola abajo a la izquierda) por la punta MEDIDA de su propia cola, nunca por el
centro de su caja, así que una variante con la cola centrada no agrega nada.

El globo actual es `art-source/bocadillo.png` (1024×1024, relleno blanco,
contorno oscuro, cola abajo a la izquierda) → `zoo-speech-bubble.png`. B9 pide
una variante nueva del mismo diseño (cola abajo a la izquierda, como el
actual), para pantallas bajas.

**Adjuntar `art-source/bocadillo.png`** como referencia de forma. El bloque de
estilo termina en "fondo blanco", que con un globo blanco no se puede recortar:
se reemplaza su último párrafo por el fondo transparente.

```
<bloque de estilo de docs/09 §9, SIN su último párrafo>

One image, 1024x1024, TRANSPARENT background outside the bubble. One
empty speech bubble, same outline weight, same wobbly marker line,
same proportions as the attached reference: a wide rounded oval about
1.3 times wider than tall, with the tail at the BOTTOM LEFT, pointing
down and to the left, like the attached reference. The inside of the
bubble is solid opaque white #ffffff. Nothing is written inside.
```

**Después de recibirla:** un PNG de 1024×1024, transparente afuera:
`bocadillo izquierda.png` (B9). No reemplazar `bocadillo.png` hasta verlo en
pantalla: el mapa usa el actual hoy. Medir el alpha fantasma (`docs/17` §3 bis)
y pasar el checklist de cinco segundos (`docs/09` §9). Entrar al pipeline es
código: una fila nueva en `build_art.py`, igual a la de `bocadillo.png`
(`'contour'`), y su entrada en
`AUTHORED_SOURCE_SIZES`.

---

## 5. Personajes

### Hoja "Mono": B10 (alta)

Es A6 de `docs/18` §6, sin cambios de fondo. Hoy `art-source/mono.png` es un
bloque gris con la palabra MONO, y se ve así en la barra de camino, en el
rescate y en el mapa. **Adjuntar `art-source/pez.png` y
`art-source/tortuga.png`** como referencia de tamaño y de personaje (no de
contorno).

```
<bloque de estilo de docs/09 §9>

A single small cartoon monkey, whole body seen from the side, standing
on its feet, one arm raised as if about to grab a vine, long curled
tail. Brown fur fill #8a5a3c, lighter face and belly #e8c39e. Same
size and level of detail as the attached fish and turtle.
```

Guardar como `art-source/mono.png` (reemplaza al placeholder), correr
`build_art.py`, medir el alpha fantasma y **copiar el `w`/`h` nuevo** del
manifest a `PROMISED_ANIMAL_ART.mono` en `detective/assets.ts` (hoy dice
320×320 porque el placeholder es cuadrado).

### Hoja "Erizo": B14 (media)

El erizo que queda en el mapa y el del rescate no tienen espinas: los dos PNG
que existen son sin espinas a propósito, para que el chico las dibuje
(`docs/13` §7). Falta el erizo **terminado**. **Adjuntar
`art-source/erizo.png` y `art-source/erizo enroscado.png`**: tiene que ser el
mismo animal.

```
<bloque de estilo de docs/09 §9>

One image, 1536x1024, transparent background, two separate poses of
THE SAME small cartoon hedgehog as the attached references, side by
side, not touching:
Pose 1 (left): standing, seen from the side, with a full coat of
short, thick, pointed spines along its back. Spine fill #6b4f3a,
face and belly #e0c49a.
Pose 2 (right): the same hedgehog uncurling, head peeking out, spines
pointing outwards all around.
```

Recortar a `erizo con espinas.png` y `erizo desenroscando.png`, 1024×1024
cada uno. La pose 2 sirve para el paso de bola a perfil de `docs/19` §3.3; si
no sale bien, alcanza con la 1.

### Hoja "Pulpito": B15 (baja)

Para el Pulpito sobre la escena (`docs/19` §4). Hoy hay tres figuras (con
mochila, con lupa, cuidador) y ninguna señala ni piensa. **Adjuntar
`art-source/pulpo con lupa.png` como referencia de personaje**, nunca de
contorno: ese archivo tiene el contorno azul (`docs/09` §9, "nunca uses un
asset existente como referencia de contorno").

```
<bloque de estilo de docs/09 §9>

One image, 1536x1024, transparent background, THREE separate full-body
poses of THE SAME friendly cartoon octopus detective with eight arms,
holding a magnifying glass, side by side, evenly spaced, not touching.
Same body colour, same eyes, same proportions in all three.
Pose 1 (left): pointing to the RIGHT with one arm, excited.
Pose 2 (centre): thinking, one arm touching his chin, looking up.
Pose 3 (right): celebrating, several arms raised.
```

Recortar a `pulpo senala.png`, `pulpo piensa.png`, `pulpo festeja.png`. El
señalar hacia la izquierda sale espejando la pose 1.

### Hoja "Patitos": B16 (baja)

Para juntar la familia del pato (`docs/19` §3). Mientras no estén, se usa el
pato que ya existe, más chico. **Adjuntar `art-source/pato.png`.**

```
<bloque de estilo de docs/09 §9>

One image, 1536x1024, transparent background, three separate small
yellow ducklings, the babies of the attached duck, side by side, not
touching, each standing on its feet, seen from the side, in slightly
different poses (walking, looking back, flapping). Fill #f2c94c, beak
and feet #e8893a.
```

---

## 6. Hoja "Pistas": B11, B12, B13, B17

Reglas de `docs/09` §9 que se pegan con cada una: **apuntan hacia ARRIBA**,
se piden **dos veces** (a color y en `#838383` apagado) y tienen que
entenderse a 24 px. Cada hoja es una imagen: arriba la fila a color, abajo la
misma fila en gris. Recortar cada objeto a 1024×1024 transparente.

**Adjuntar `art-source/pluma verde.png` y `art-source/huella palmeada.png`** a
todas: son las pistas que ya funcionan, y lo nuevo tiene que sentarse al lado.

#### B11 — Las semillas y las gotas del pato (media)

La autora contó que no se ven "las gotas" ni "las semillas". Este pedido
asume que son `miga de pan.png`/`grano de maiz.png` (semillas) y
`burbuja.png`/`gota de agua.png` (gotas). **Confirmar con la autora cuáles son
antes de pedirlo.**

```
<bloque de estilo de docs/09 §9>

One image, 1536x1024, transparent background. TOP ROW, in colour, two
separate small objects, each pointing UP, evenly spaced:
(1) a small pile of three fat seeds, fill #d9a441;
(2) three big round water drops in a little splash, fill #4f9fd6.
BOTTOM ROW: the exact same two shapes again, all filled flat grey
#838383, same outline.
```

#### B12 — Las cosas del erizo (media)

La hoja ya existe (`sector-leaf.png`); faltan la manzana y el hongo.

```
<bloque de estilo de docs/09 §9>

One image, 1536x1024, transparent background. TOP ROW, in colour, two
separate small objects, each pointing UP, evenly spaced:
(1) a red apple with one small bite taken out and one leaf, fill
#d94436;
(2) a round brown forest mushroom, cap #c9a27e, stem #f0e2c8.
BOTTOM ROW: the exact same two shapes again, all filled flat grey
#838383, same outline.
```

#### B13 — Las pistas del mono (baja)

```
<bloque de estilo de docs/09 §9>

One image, 1536x1024, transparent background. TOP ROW, in colour, two
separate small objects, each pointing UP, evenly spaced:
(1) an empty banana peel, fill #f2d24b;
(2) a whole banana, fill #f2d24b with a brown tip.
BOTTOM ROW: the exact same two shapes again, all filled flat grey
#838383, same outline.
```

#### B17 — La piel mudada de la víbora (baja)

Para la entrada de las víboras, no como pista de camino: con `docs/19` §3.1
las víboras no tienen caso.

```
<bloque de estilo de docs/09 §9>

One image, 1536x1024, transparent background. TOP ROW: a shed snake
skin lying in a loose S curve, pointing UP, fill #c9c1a3. BOTTOM ROW:
the same shape, filled flat grey #838383, same outline.
```

---

## 7. Lo que NO hay que pedir

Sale por código, sin arte nuevo.

| Qué | Cómo se hace | Por qué no se pide |
|---|---|---|
| Las víboras en gris | `build_art.py` pasa cada píxel de las tres víboras a su luma | Desaturar conserva la luma: la ley de 55 medida sobre el cuerpo sigue valiendo igual. Un filtro de SVG en tiempo de ejecución está vedado en este repo |
| El color de la víbora que avanza con el dedo | La imagen a color dentro de un `<svg>` anidado que crece (recorta sin `clipPath`); o franjas cortadas en `build_art.py` | Es geometría, no dibujo |
| Las siluetas de la deducción y de la libreta | `build_art.py` pinta cada animal de un color plano oscuro, como ya hace con las pistas apagadas | Salen idénticas al animal por construcción |
| El globo con la cola a la derecha | El de la izquierda (B9) espejado con CSS | No tiene texto adentro |
| La espina dibujada del erizo | Un triángulo de `M`/`L` con relleno y contorno de marcador | Tiene que seguir el ángulo del trazo del chico |
| La transición de la lupa | Un path oscuro con un agujero circular (`evenodd`), como el velo de la linterna | Es una forma simple que se anima |
| Las páginas de la libreta | CSS en el estilo de marcador (papel, contorno grueso), como los botones del mapa | Hasta que se decida el estilo final (`docs/00` §4) |
| Las huellas del mapa (A1) | La otra sesión, en `exp/svg-art` | No es de esta tanda |
