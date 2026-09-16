# Pedidos de arte del prólogo

Escrito el 2026-09-16, junto con la implementación del prólogo
(`docs/16_PROLOGO_EL_CUIDADOR.md`). Reemplaza y acorta la lista de
`docs/16` §7: cuatro de los diez pedidos de ahí **ya están dibujados y
embarcados**, y no hay que volver a pedirlos.

El prólogo hoy anda con **placeholders**: bloques de color plano generados
por `scripts/art/make_placeholders.py`. No son arte, son andamios. Cada uno
se reemplaza cambiando un archivo en `art-source/` y corriendo
`python3 scripts/art/build_art.py`. Ni una línea de código se toca.

---

## 1. Lo que NO hay que pedir

| `docs/16` §7 pedía | Ya existe | Dónde se usa en el prólogo |
|---|---|---|
| `fondo pecera.png` | `art-source/fondo pecera.png` → `sector-aquarium-background.png` | Fondo del recinto `peces` |
| `fondo recinto tortugas.png` | `art-source/fondo arena.png` → `sector-sand-background.png` | Fondo del recinto `tortugas` |
| `pulpo lupa.png` | `art-source/pulpo con lupa.png` → `carrier-octopus.png` | El momento de la lupa (beat 5) |
| `carrito limpieza.png` | `art-source/carrito.png` → `zoo-cart.png` | Segunda lámina de la apertura |
| Las huellas | `huella pulpo.png`, `huella negra.png`, `huella gris.png` | El cierre del sendero y el mapa |

Además hay arte **dibujado y sin usar** en `art-source/` que conviene mirar
antes de pedir nada nuevo, porque fija el estilo y el color de los que sí
faltan: `cartel.png` (un cartel de madera), `pez.png`, `tortuga.png`,
`escoba.png`, `sombrero.png`, `pasto.png`. Ninguno lo consume hoy
`build_art.py`. **Mandale estas láminas a ChatGPT como referencia adjunta**
en los pedidos 2 y 3: es la forma más barata de que lo nuevo no desentone.

### Los íconos de entrada son prestados a propósito

Cada pantalla de entrada necesita una imagen al lado de la frase
(`captionAudit.ts` lo obliga). Hoy usan arte ya embarcado:

| Recinto | Ícono de entrada | Por qué ese |
|---|---|---|
| Peces | `sector-chest.png` (el cofre) | Está adentro de la pecera; no nombra al pez |
| Tortugas | `sector-stone.png` (la piedra) | Está en el recinto, y vuelve en la frase de cierre |
| Monos | `sector-leaf.png` (la hoja) | Es literalmente lo que hay que sacar |
| Sendero | `zoo-cart.png` (el carrito) | Dice "hay que limpiar" sin adelantar las huellas |

**Ninguno muestra el cartel ni el animal ausente, y eso no es casual.** Si
la entrada de los monos muestra el cartel MONOS, el chico ya sabe qué falta
antes de limpiar nada, y el prólogo entero existe para que lo **descubra**
(`docs/16` §1). El cartel se gasta en el cierre, que es donde revela.
Hay un test que lo sostiene (`zoo/adventures.test.ts`, "returns the row's
own icon for an animal-less row").

Si en algún momento querés íconos propios —vidrio empañado, arena, hojas,
barro— son cuatro recortes más de 1024×1024 y entran por el mismo camino de
la sección 4. No son bloqueantes.

## 2. El bloque de estilo (va al principio de CADA pedido)

Es `docs/09_GUIA_DE_ESTILO_VISUAL.md` traducido a lo que entiende un
generador. No lo edites por gusto: el ancla del estilo es la lámina aprobada,
no el razonamiento sobre ella (`docs/09` §1).

```
Children's book illustration, thick-marker style, drawn for a five-year-old.

- Bold black outlines of even, uniform weight, with rounded caps. The outline
  colour is a true neutral black (#1a1a1a): zero hue, zero saturation. Never
  a blue-black, never a green-black.
- Flat fills, one flat colour per shape. No shading, no gradients, no
  specular highlights, no volume, no depth of field, no painterly texture.
- The fill spills slightly past the outline, the way a careful child colours
  in. That overshoot is deliberate.
- Fat, generous shapes. Zero fine detail: if a feature is unreadable at
  24 pixels, leave it out.
- Paper background colour is #fdfcf7 where a background is asked for.
- No text anywhere in the image unless the prompt explicitly asks for a word.
```

## 3. Los cuatro pedidos

Son cuatro pedidos, no seis archivos: **los personajes y los carteles se
piden en láminas con varias poses en una sola imagen.** Ese es el punto —
un generador que dibuja el pulpo cuidador hoy y el pulpo detective mañana
devuelve dos pulpos distintos. Pedidos en la misma lámina, salen el mismo
pulpo.

---

### Pedido 1 — El pulpo cuidador (lámina de poses)

**Sale de acá**: `art-source/pulpo cuidador.png` (1024×1024).
**Adjuntá como referencia**: `art-source/pulpo mochila.png` y
`art-source/pulpo con lupa.png` — es el mismo personaje, tiene que ser
reconocible como el mismo.

```
[BLOQUE DE ESTILO]

One image, 1536x1024, transparent background, containing THREE separate
full-body poses of THE SAME character, side by side, evenly spaced, not
touching, no shared scenery and no ground line between them.

The character is a friendly cartoon octopus with eight arms, the same
octopus in all three poses: same body colour, same eyes, same proportions,
same outline weight. He is the keeper of a small zoo.

Pose 1 (left):  standing upright, wearing a zookeeper's cap and a work
                apron, one arm raised in a wave. Greeting the viewer.
Pose 2 (centre): the same octopus pushing a small cleaning cart with two
                arms. The cart carries a bucket and a broom.
Pose 3 (right): the same octopus holding a broom with one arm and pointing
                forward with another, inviting someone to come along.

Front-facing, symmetrical, no perspective. Nothing is cropped by the edge of
the image.
```

**Después de recibirla**: recortá cada pose y exportala en su propio PNG de
**1024×1024, fondo transparente**, con la figura centrada. El tamaño exacto
del canvas es lo único que importa — `build_art.py` recorta por bounding box
de alfa y reescala solo. Hoy el prólogo consume una sola de las tres poses
(`pulpo cuidador.png`, la pose 1); las otras dos quedan para la segunda y
tercera lámina de la apertura cuando quieras dejar de reusar `zoo-cart.png`.

---

### Pedido 2 — Los tres carteles (lámina de carteles)

**Sale de acá**: `cartel peces.png`, `cartel tortugas.png`,
`cartel monos.png` (1024×1024 cada uno).
**Adjuntá como referencia**: `art-source/cartel.png`, `art-source/pez.png`,
`art-source/tortuga.png`.

Los tres juntos porque tienen que ser **el mismo cartel** con distinto
contenido. Tres pedidos sueltos dan tres maderas distintas.

```
[BLOQUE DE ESTILO]

One image, 1536x1024, transparent background, containing THREE separate
wooden zoo signs, side by side, evenly spaced, not touching, no shared
scenery between them.

All three signs are THE SAME sign design: identical wooden plank shape,
identical wood colour, identical outline weight, identical two short posts.
Only their content differs.

Sign 1 (left):   a fish silhouette above the word "PECES"
Sign 2 (centre): a turtle silhouette above the word "TORTUGAS"
Sign 3 (right):  a monkey silhouette above the word "MONOS"

Each word is in plain, fat, uppercase block letters, black, perfectly
legible, spelled EXACTLY as written above (Spanish). The animal silhouette
is a simple flat shape, not a detailed drawing. Front-facing, no
perspective, no shadow on the ground.
```

**Ojo con la ortografía.** Los generadores de imagen escriben mal las
palabras seguido. Si vuelve "PESES" o "TORTUGA" en singular, se vuelve a
pedir: el cartel es la mitad del beat, la palabra es lo que el chico está
aprendiendo a reconocer.

**Después de recibirla**: un PNG de 1024×1024 por cartel, fondo transparente.

---

### Pedido 3 — El fondo del recinto de los monos

**Sale de acá**: `art-source/fondo recinto monos.png` (1536×1024).
**Adjuntá como referencia**: `art-source/fondo pecera.png` y
`art-source/fondo bosque.png` — son los fondos aprobados, y el nuevo tiene
que sentarse al lado sin desentonar.

```
[BLOQUE DE ESTILO]

One image, 1536x1024, FULLY OPAQUE — every single pixel must be painted,
with no transparency anywhere, not even at the corners.

A zoo monkey enclosure seen head-on, flat, like a stage backdrop. Thick
climbing ropes strung between wooden posts, a few bare branches, and several
pieces of fruit fallen on the ground (bananas, an orange). The ground is a
flat band of packed earth along the bottom.

THERE ARE NO MONKEYS IN THIS IMAGE. The enclosure is empty. Do not draw any
animal.

Light, quiet colours — this is a background that a dark drawing sits on top
of, so nothing in it should be darker than a mid tone. No sky gradient: if
there is sky, it is one flat colour.
```

**La restricción de opacidad no es capricho**: `emit_opaque_canvas`
(`scripts/art/build_art.py:234`) rechaza la lámina entera si encuentra un
solo píxel que no sea 100% opaco.

**La restricción de claridad tampoco**: el trazo del chico es `#1e293b` y hay
un test que exige 55 puntos de luma de diferencia contra el fondo
(`docs/09` §4). Un fondo oscuro no entra, lo rebota la suite.

---

### Pedido 4 — El fondo del sendero

**Sale de acá**: `art-source/fondo sendero.png` (1536×1024).
**Adjuntá como referencia**: `art-source/fondo bosque.png`.

```
[BLOQUE DE ESTILO]

One image, 1536x1024, FULLY OPAQUE — every single pixel must be painted,
with no transparency anywhere, not even at the corners.

An empty dirt path through a small zoo, seen head-on, flat, like a stage
backdrop. The path runs left to right across the middle as a wide band of
packed earth. Low bushes and a wooden fence line the far side. A zoo sign
post stands off to one edge, blank, with no writing on it.

THE PATH IS COMPLETELY EMPTY. No animals, no people, no footprints — the
footprints are drawn by the game on top of this background.

Light, quiet colours. Nothing darker than a mid tone. No sky gradient.
```

**Alternativa para destrabar sin pedir nada**: `docs/16` §7 autoriza reusar
`sector-forest-background.png` como sendero. Hoy no se hace —el sendero tiene
su propio placeholder— pero si el pedido tarda, el cambio es una línea en
`client/src/zoo/backdrops.ts`.

## 4. Cómo entra una lámina nueva

Cuatro puntos de registro, y el orden importa. Está todo en `docs/16` §8,
resumido acá:

1. Poné el PNG en `art-source/` con **el nombre exacto** de la tabla de la
   sección 3 y **el canvas exacto** (1024×1024 recortes, 1536×1024 fondos).
   `validate_authored_source_sizes()` corre primero y aborta si no coincide.
2. Corré `python3 scripts/art/build_art.py`. La fila en `build_art.py` y la
   entrada en `AUTHORED_SOURCE_SIZES` **ya están puestas** — el placeholder
   ocupa ese lugar, así que reemplazar el archivo alcanza.
3. Abrí `client/public/art/manifest.json`, leé el `w`/`h` nuevo del asset y
   copialo a su export en `client/src/detective/assets.ts`. **Se lee del
   manifest, no se estima**: es la regla que dejaron los pasos C, D y E.
4. `npm test`. `artManifest.test.ts` afirma un largo exacto: si sobra o falta
   un PNG, falla. Reemplazar no cambia el largo, así que tiene que seguir en
   verde sin tocar el número.

Y mirá la captura. `bash scripts/shot.sh '<url>' prologo/x.png 1000 600`.

## 5. El video (más adelante)

`docs/16` §4 quiere, idealmente, un video corto para la apertura. El
componente `client/src/screen/PrologueOpening.tsx` se construyó con una sola
responsabilidad justamente para eso: mostrar la apertura y avisar cuando
termina. Meter un `<video>` adentro, con caída a las láminas fijas si el
archivo no carga, no toca a ningún consumidor. El botón de saltar ya está y
es obligatorio que siga estando.
