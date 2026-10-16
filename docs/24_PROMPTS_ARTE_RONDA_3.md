# 24 — Prompts de arte, ronda 3

Escrito el 2026-10-16. Sigue el formato de `docs/23`: cada pedido trae un
prompt completo, listo para pegar en ChatGPT. **Los prompts van en inglés; el
resto, en castellano.** Los ids de esta ronda son `E1`–`E12`. Los de
`docs/20` (`B…`), `docs/22` (`C…`) y `docs/23` (`D…`) siguen valiendo.

El pedido de la autora:

> Un solo documento para darle a ChatGPT y que genere todo lo pendiente y
> todo lo que necesita lo que viene, más la intro animada de la historia.

Esta ronda junta tres cosas:

1. **Lo que quedó pendiente de `docs/23`** (D38–D46). No se reescribe: la
   tabla de la §1 dice en qué momento hacerlo y remite al prompt de
   `docs/23`.
2. **El arte de la intro animada** (`docs/26`): escenas en capas, el Pulpito
   cuidador en las poses que pide el guion, el cielo y la reja que se abre.
3. **El arte que piden las propuestas de `docs/25` §7**: la libreta de las
   letras, el lápiz, los sellos por familia, la cerca de palos cruzados y,
   si se aprueba, la lámina para imprimir.

Para leer primero:

1. **Para ChatGPT** → §0 y §1, y después solo las §4, §5 y §6.
2. **Qué se reusa y no hay que pedir** → §2.
3. **Notas para la sesión que integra** (no son para ChatGPT) → §7.

---

## 0. Instrucciones para ChatGPT

1. **Qué pedir primero.** Seguir este orden, que es el de la tabla de la §1:
   1. **D38, D39, D40** (prioridad alta de `docs/23`): con el prompt de
      `docs/23` §6 bis y §6 ter.
   2. **D42 y después D41** (`docs/23` §6 ter). **D42 va antes que E1, E2 y
      E7**: el Pulpito cuidador de D42 es la referencia de personaje de las
      poses de la intro. Si D42 queda `descartado`, no hacer E1, E2 ni E7:
      parar y avisar.
   3. **E1–E6**, la intro (prioridad alta), en el orden de los números.
   4. **D43, D44, D45, D46** (prioridad media de `docs/23`).
   5. **E7–E11** (prioridad media).
   6. **E12** (prioridad baja).

   E11 y E12 se hacen solo si la tabla dice `pendiente`; si dice `en
   espera`, se saltean.
2. **Una imagen por mensaje, todas en la misma conversación**, así comparten
   el grosor de línea y la paleta. Los pedidos que traen varios archivos
   (E3, E5, E8) van en mensajes seguidos, en el orden en que están escritos.
3. **Pegar cada prompt completo, tal cual**, y adjuntar las referencias que
   dice el pedido (están en `art-source/`). Una referencia sirve para la
   forma, el personaje y el color; **nunca para el contorno**, que lo define
   el bloque de estilo (`docs/09` §9).
4. **Guardar cada imagen en `art-source/` con el nombre exacto** del pedido.
   Todos los nombres son nuevos: **nunca pisar un archivo que ya exista**. Si
   el nombre ya existe, no guardar y avisar.
5. **Tamaños.** Cada pedido dice el lienzo exacto. Los recortes y las
   láminas, con fondo transparente de verdad. Las capas "fondo" de las
   escenas, totalmente opacas. Las capas "medio" y "frente", transparentes
   salvo lo que se pide dibujar.
6. **El fondo transparente tiene que ser transparente de verdad (el "alpha
   fantasma").** Ya pasó dos veces: el generador devolvió un fondo que se ve
   transparente en la miniatura pero que en realidad es un velo casi
   invisible (alpha 8 en vez de 0), o un halo de color pegado al contorno.
   En el juego eso aparece como un **rectángulo gris detrás de la figura**
   (`docs/17` §3 bis) o como un **brillo naranja alrededor del Pulpito**
   (D6 y D7). Antes de guardar, **abrir la imagen sobre un fondo negro**: si
   alrededor de la figura se ve un rectángulo, un velo, un damero pintado o
   un resplandor, se rechaza y se pide de nuevo.
7. **Las láminas se guardan enteras.** Los pedidos que dicen "lámina" traen
   varias poses u objetos en una imagen; no recortarla: los recortes los hace
   la sesión que la integra (§7).
8. **Pasar el checklist del pedido y el común (§3.4)** antes de guardar. Si
   falla un punto, pedirla de nuevo; no guardar "casi bien". Si después de
   tres intentos sigue fallando, poner `descartado: <motivo en una línea>` en
   el Estado y seguir con el próximo pedido.
9. **No modificar código ni otros documentos.** Nada en `client/`,
   `scripts/`, `server/`, `client/public/art/` ni en otro `.md`. El único
   cambio permitido en el repo, además de los PNG nuevos, es la columna
   "Estado" de la §1 de este archivo (`pendiente` → `hecho`, o `2 de 3`
   mientras tanto). Los D38–D46 se marcan **en la tabla de `docs/23` §6
   ter**, como dice ese documento, y además en la §1 de acá.

---

## 1. Estado

ChatGPT: cambiar solo la columna "Estado" (§0, punto 9). Las filas están en
el orden en que se hacen.

| Orden | ID | Archivo(s) en `art-source/` | Qué | Dónde se usa | Prioridad | Estado | Prompt |
|---|---|---|---|---|---|---|---|
| 1 | D38 | `pista pelo de gato v2.png` | Pelo de gato atigrado gris | deducción de las ovejas | **alta** | pendiente | usar el prompt de `docs/23` D38 |
| 2 | D39 | `erizo con espinas v2.png` | El erizo con espinas, entero | erizo terminado | **alta** | pendiente | usar el prompt de `docs/23` D39 |
| 3 | D40 | `pista escamas de pez v2.png` | Escamas, variación 1 | peces: `f2-agua2` | **alta** | pendiente | usar el prompt de `docs/23` D40 |
| 4 | D42 | `pulpo mochila y cuidador lamina.png` | El Pulpito con mochila y el Pulpito cuidador, iguales a D6 | mapa, cierres, prólogo; **referencia de E1, E2 y E7** | **alta** (sube de media: la intro depende de él) | pendiente | usar el prompt de `docs/23` D42 |
| 5 | D41 | `pulpo poses lamina v2.png` | El Pulpito señala, piensa y festeja, igual a D6 | entrada, deducción, rescate | media | pendiente | usar el prompt de `docs/23` D41 |
| 6 | E1 | `pulpo cuidador poses lamina.png` | El cuidador empuja el carrito y bosteza | intro: tomas 3, 4 y 5 | **alta** | pendiente | §4, E1 |
| 7 | E2 | `pulpo cuidador poses lamina 2.png` | El cuidador sorprendido, mira alrededor e invita | intro: tomas 7 y 8 | **alta** | pendiente | §4, E2 |
| 8 | E3 | `intro dia fondo.png`, `intro dia medio.png`, `intro dia frente.png` | La plaza del zoológico de día, en tres capas | intro: tomas 1–5 y 7–8 | **alta** | pendiente | §4, E3 |
| 9 | E4 | `intro reja lamina.png` | Las dos hojas de la reja de la entrada | intro: toma 6 | **alta** | pendiente | §4, E4 |
| 10 | E5 | `intro noche fondo.png`, `intro noche medio.png`, `intro noche frente.png` | La misma plaza de noche, en tres capas | intro: tomas 5–6 | **alta** | pendiente | §4, E5 |
| 11 | E6 | `intro cielo lamina.png` | Sol, luna, estrellas y nubes sueltos | intro: tomas 1, 5, 6, 7 | **alta** | pendiente | §4, E6 |
| 12 | D43 | ocho `… 2 v2.png` / `… 3 v2.png` de huellas | Variaciones de huellas | pato, monos, noche, tortugas | media | pendiente | usar el prompt de `docs/23` D43 |
| 13 | D44 | `fondo arena v3.png` | Arena a 2:1 | tortugas, víboras, prólogo | media | pendiente | usar el prompt de `docs/23` D44 |
| 14 | D45 | `fondo noche zoo v3.png` | Noche del zoológico a 2:1 | noche | media | pendiente | usar el prompt de `docs/23` D45 |
| 15 | D46 | `fondo recinto monos v3.png` | Recinto de los monos a 2:1 | prólogo: monos | media | pendiente | usar el prompt de `docs/23` D46 |
| 16 | E7 | `pulpo cuidador con lupa lamina.png` | El cuidador encuentra la lupa | intro, parte B (nace el detective) | media | pendiente | §5, E7 |
| 17 | E8 | `libreta tapa.png`, `libreta pagina.png` | La libreta del detective: tapa y página en blanco | etapa de letras | media | pendiente | §5, E8 |
| 18 | E9 | `lapiz v2.png` | El lápiz que sigue al dedo en las letras | etapa de letras | media | pendiente | §5, E9 |
| 19 | E10 | `sellos lamina.png` | Cuatro sellos del detective, uno por familia de letras | etapa de letras | media | pendiente | §5, E10 |
| 20 | E11 | `cerca palos cruzados lamina.png` | Las piezas de la cerca de palos cruzados (`+` y `X`) | llamas (`docs/25` 3.2) | media | en espera: solo si la autora aprueba `docs/25` 3.2 | §5, E11 |
| 21 | E12 | `lamina para imprimir.png` | El Pulpito y cuatro animales en línea negra, para pintar | hojas para imprimir (`docs/25` 5.2) | baja | en espera: solo si la autora aprueba `docs/25` 5.2 | §6, E12 |

Son **21 pedidos y 33 archivos**: 9 de `docs/23` (16 archivos) y 12 nuevos
(17 archivos). Cuando la autora apruebe 3.2 o 5.2, cambiar su `en espera`
por `pendiente`.

---

## 2. Qué se reusa y no hay que pedir

| Necesidad | Se resuelve con | Por qué alcanza |
|---|---|---|
| Los animales del zoológico en la intro (se asoman sobre la cerca) | `pato.png`, `oveja v2.png`, `llama.png`, `mono v2.png`, `tortuga.png` | Ya están en el estilo, de perfil o de frente, y son los del juego. La intro es parte del prólogo: puede mostrar animales (`odd/tasks/review-batch-2.md`, regla 2) |
| El carrito del cuidador | `carrito.png`, y además va dibujado en la pose de E1 | E1 lo dibuja agarrado, así las manos calzan |
| La niebla que tapa el zoológico | `niebla 1.png`–`niebla 3.png` | Es la misma niebla del mapa: la intro termina donde empieza el mapa |
| El mapa del final | `mapa zoologico.png` | La intro desemboca en el mapa real, no en un dibujo del mapa |
| La lupa que crece entre pantallas | `lupa transicion.png` (D35) | La parte B (`docs/26`) usa la misma transición del juego |
| El Pulpito detective de la parte B | `pulpo lupa lamina.png` (D6) | Es el aspecto principal del personaje |
| Las huellas del sendero | las del juego (`huella pulpo.png`, pistas) | Ya aparecen al terminar `sand4` |
| El renglón de tres zonas de la libreta | **código**, no arte | La pauta tiene que coincidir al píxel con la letra; la libreta de hoy ya dibuja sus rayas con CSS (`screen/DetectiveNotebook.tsx`). E8 pide la página **en blanco** |
| Los marcos de las hojas para imprimir | **código** (SVG para imprimir) | El trazo de cada hoja sale de la geometría del nivel (`levels/catalog.ts`); un marco dibujado no puede saber dónde va. E12 pide solo los dibujos para pintar |
| Un ícono de pista por caso, para la entrada sin spoiler | ya existen todos | Ver la tabla de abajo |

**Íconos de pista para las entradas de los casos** (`docs/25` 2.1; la tanda
de `review-batch-2` pone la pista en el globo en lugar del animal):

| Caso | Pista que puede ir en el globo | Archivo |
|---|---|---|
| Pato | la pluma, o el charco | `pista pluma de pato.png`, `pista charco.png` |
| Ovejas | el mechón de lana | `pista lana.png` |
| Noche | la linterna (ya se usa) | `linterna.png` |
| Peces | las burbujas | `pista burbujas.png` |
| Tortugas | la huella de tortuga | `pista huella de tortuga.png` |
| Monos | la manito | `pista mano de mono.png` |

No falta ninguno: **no se pide arte para esto.**

---

## 3. Reglas comunes

### 3.1 Los nombres de archivo

Las mismas de `docs/23` §3.1:

- **`<nombre> v2.png`**: el reemplazo de un archivo que se rehace. El viejo
  no se pisa ni se borra (`lapiz v2.png` no pisa `lapiz.png`).
- **`<nombre> 2.png`**: una segunda lámina del mismo tipo (`pulpo cuidador
  poses lamina 2.png`).
- **`… lamina.png`**: una imagen con varias poses u objetos; se guarda entera
  y la recorta la sesión que la integra.
- **`intro <momento> <capa>.png`**: una capa de una escena de la intro. El
  momento es `dia` o `noche`; la capa es `fondo`, `medio` o `frente`.

### 3.2 Las escenas en capas (E3 y E5)

La intro no es un video dibujado cuadro por cuadro: es una escena armada con
**capas sueltas que el código mueve** (`docs/26` §4). Por eso cada escena se
pide en tres imágenes del mismo tamaño, **1536 × 1024**, que se apilan:

| Capa | Qué lleva | Fondo |
|---|---|---|
| `fondo` | Cielo, horizonte, árboles lejanos, el césped y el piso de la plaza. Todo lo que está más lejos que la cerca | **Opaco** |
| `medio` | El arco de la entrada (sin la reja) y la cerca de los recintos | Transparente |
| `frente` | Arbustos, flores y un tronco en los bordes de abajo y del costado | Transparente |

Entre `fondo` y `medio` el código pone a los animales (se asoman por encima
de la cerca) y entre `medio` y `frente`, al Pulpito. Al moverse a distinta
velocidad, las capas dan profundidad sin dibujar nada más.

Tres límites que pone el juego:

- **Zona segura.** Según la pantalla, se pueden recortar hasta 85 px de cada
  costado (pantalla 4:3) o 80 px de arriba y de abajo (pantalla 16:9). Lo
  importante va en el **centro de 1365 × 864**.
- **Sin sol, luna ni estrellas en el `fondo`.** Van sueltos (E6), así el
  código los hace salir y ponerse.
- **Las posiciones importan.** Cada prompt dice a qué altura va la cerca y
  dónde está el arco. Así el `medio` cae encima del `fondo` sin correrlo.
  Si una capa sale un poco corrida, el código la acomoda; si sale con otra
  composición, se rechaza.

### 3.3 El Pulpito cuidador

Desde D42 el cuidador es **el mismo Pulpito de D6 con ropa de cuidador**:
mismo cuerpo naranja `#fd6a29`, ojos blancos con pupila negra grande y un
brillo, cejas cortas y contentas, brazos enrulados con ventosas claras;
gorra crema con visera verde y una huellita verde, delantal crema con
tiradores verdes y un bolsillo verde. **Ni gorro de detective ni corbata:**
se los pone recién al final del prólogo (`docs/16` §2, beat 5).

Las poses nuevas (E1, E2, E7) siguen las reglas de lámina de D41: misma
escala, misma línea de apoyo, cada pose una sola figura, sin rayitas ni
signos sueltos alrededor.

### 3.4 Checklist común

1. **¿El fondo es transparente de verdad?** Abrirla sobre un fondo negro. Si
   aparece un rectángulo, un velo gris, un damero pintado o un resplandor
   alrededor del contorno, se rechaza (§0, punto 6). Las capas `fondo` son la
   excepción: tienen que ser **opacas en todos los píxeles**, esquinas
   incluidas.
2. **¿El contorno es negro neutro?** Si tira a azul, marrón o verde, se
   rechaza (`docs/09` §1).
3. **¿La línea tiembla y el relleno se pasa un poco en algún lado?** Si es
   una curva perfecta y el relleno calza exacto, es vector: se rechaza.
4. **¿Sin brillos, degradados ni sombras?** Un brillo blanco, un degradado
   o una sombra en el piso se rechazan (en los fondos de escena vale la
   textura suave pintada de `docs/23` §3.4, nunca un brillo).
5. **¿Sin texto?** Ninguna letra en ningún cartel, salvo que el pedido lo
   pida.
6. **¿Un chico de 6 años, sin ayuda, diría qué es?** Mostrarla sola y
   preguntarse qué contestaría. Si la respuesta honesta no es la del pedido,
   se rechaza.

---

## 4. Pedidos de prioridad alta: la intro (E1–E6)

Cada bloque de código es el prompt completo: se pega entero, en un mensaje.

### E1 — El cuidador empuja el carrito y bosteza

- **Archivo**: `art-source/pulpo cuidador poses lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/pulpo mochila y cuidador lamina.png` (D42: **el personaje que manda**, la pose de la derecha) y `art-source/carrito.png` (solo el carrito).
- **Antes**: D42 tiene que estar `hecho` (§0, punto 1).
- **Qué es y qué tiene que reconocer el chico**: en la intro, el Pulpito entra a la plaza empujando su carrito de limpieza (toma 3) y, al atardecer, bosteza antes de irse a dormir (toma 5). El chico tiene que ver **al mismo Pulpito** que lo saluda en el prólogo, trabajando y después con sueño.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow or a coloured halo around the outline, 3D
shading, bevels, texture noise, photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard; the background must be fully
transparent, not almost transparent). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1536x1024. TWO separate full-body poses of EXACTLY the
zoo-caretaker octopus on the RIGHT of the FIRST attached image. He is
the same character, detail for detail: body orange #fd6a29, big round
head, eight curly arms with pale suckers; big eyes, white #fdfbfb with
a large BLACK pupil and one small white shine dot, NO coloured iris;
two short, happy, arched eyebrows, never angry; a cream cap with a
green peak and a small dark green paw print on the front; a cream
apron with green straps and one green front pocket. NO deerstalker
hat, NO collar, NO tie, NO cape.

Pose 1 (left), pushing his cleaning cart: the octopus walks towards
the RIGHT, seen from the side and a little from the front, body leaning
forward. Two arms reach forward and hold the handle of the cleaning
cart of the SECOND attached image, which stands in front of him on the
right, drawn the same as the attachment (same shape, same colours,
bucket and broom on it). The other arms curl under him as if walking.
Happy, busy face. The cart and the octopus touch: it is ONE connected
drawing.

Pose 2 (right), yawning: standing, facing the viewer, eyes CLOSED (two
short curved #1a1a1a lines), mouth wide open in a big round yawn, one
arm tip covering the side of the mouth, one arm stretched up high, the
other arms relaxed and curled. Sleepy and sweet, never sad.

Layout rules (the game cuts this sheet into two pictures with one
rule, so these matter):
- Both at the SAME scale: the head is the same size in both, about 260
  pixels wide, and the octopus is about 650 pixels tall in both.
- Both stand on the SAME invisible ground line: the lowest arm tips of
  both poses, and the cart's wheels, touch the same height, about 100
  pixels above the bottom of the image.
- Nothing floats around them: no motion lines, no "Z" letters, no
  stars, no dust clouds, no sweat drops.
- Clear empty space between the two poses, at least 60 pixels; at
  least 80 pixels from every edge of the image.
```

- **Evitar**: otro pulpo (otro naranja, cejas de enojado, iris de color); el gorro de detective o la corbata; un carrito distinto del adjunto; letras "Z" de sueño; rayitas de movimiento; el halo naranja alrededor del contorno.
- **Checklist**: el común (§3.4), y además:
  1. Recortar la cabeza de cada pose y ponerla al lado de la del cuidador de D42: ¿mismos ojos, misma gorra con la huellita, mismo naranja?
  2. Pose 1: ¿un chico de 6 años diría "el pulpo empuja el carrito"? ¿El carrito es el de `carrito.png` y las manos lo agarran?
  3. Pose 2: ¿un chico de 6 años diría "tiene sueño" o "está bostezando"?
  4. ¿Las dos cabezas miden lo mismo y las dos apoyan en la misma línea?

### E2 — El cuidador sorprendido, mira alrededor e invita

- **Archivo**: `art-source/pulpo cuidador poses lamina 2.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/pulpo mochila y cuidador lamina.png` (D42) y `art-source/pulpo cuidador poses lamina.png` (E1: la escala y la línea de apoyo).
- **Qué es y qué tiene que reconocer el chico**: a la mañana siguiente el zoológico está vacío. El Pulpito llega, se sorprende (toma 7), busca con la mirada (toma 7) y le pide ayuda al chico, mirándolo (toma 8). Es el momento en que el chico pasa a ser su ayudante: la última pose tiene que **mirarlo y ofrecerle la mano**.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow or a coloured halo around the outline, 3D
shading, bevels, texture noise, photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard; the background must be fully
transparent, not almost transparent). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1536x1024. THREE separate full-body poses of EXACTLY the
zoo-caretaker octopus on the RIGHT of the FIRST attached image, at the
SAME scale as the octopus in the SECOND attached image. Same character
detail for detail: body orange #fd6a29, big round head, eight curly
arms with pale suckers; big eyes, white #fdfbfb with a large BLACK
pupil and one small white shine dot, NO coloured iris; short arched
eyebrows; the cream cap with green peak and green paw print; the cream
apron with green straps and green pocket. NO deerstalker hat, NO
collar, NO tie, NO cape. No cart, no broom.

Pose 1 (left), surprised: facing the viewer, eyes very wide open,
eyebrows raised high, mouth a small round "oh!", two arms raised at
the sides of his head, palms open. Surprised, not scared.
Pose 2 (centre), looking around: body turned a little to the LEFT,
looking to the left with his eyes, one arm tip scratching the side of
his cap, mouth a small puzzled line, eyebrows one up and one down.
Pose 3 (right), inviting the viewer: facing the viewer and looking
straight OUT of the picture, at the person watching. One arm reaches
forward towards the viewer, its tip open and curled up like an open
hand offering help. Big warm smile, happy eyebrows.

Layout rules (the game cuts this sheet into three pictures with one
rule, so these matter):
- All three at the SAME scale as the second attached image: the head
  is about 260 pixels wide and each octopus is about 650 pixels tall.
- All three stand on the SAME invisible ground line, about 100 pixels
  above the bottom of the image.
- Each pose is ONE connected drawing: no question marks, no
  exclamation marks, no motion lines, no stars, no sweat drops.
- Clear empty space between poses, at least 40 pixels; at least 80
  pixels from every edge of the image.
```

- **Evitar**: signos de pregunta o de exclamación dibujados; cara de miedo o de llanto; mirar hacia un costado en la pose 3 (tiene que mirar al chico); otro pulpo; el halo naranja.
- **Checklist**: el común (§3.4), y además:
  1. Al lado de E1 y de D42: ¿es el mismo pulpo, al mismo tamaño y sobre la misma línea?
  2. Pose 1: ¿un chico diría "se sorprendió"? Pose 2: ¿"está buscando algo"? Pose 3: ¿"me está hablando a mí"?
  3. ¿Ninguna pose tiene signos o rayitas sueltas?

### E3 — La plaza del zoológico de día, en tres capas

- **Qué es y qué tiene que reconocer el chico**: el lugar de toda la intro. Es **la plaza de adentro del zoológico, mirando hacia la entrada**: a la izquierda, el arco de piedra de la entrada; a la derecha, tres recintos bajos con cerca de madera; atrás, árboles y lomas. Es el mismo zoológico que el del mapa (`mapa zoologico.png`: la plaza redonda, el portón de piedra) y el de la noche (`fondo noche zoo.png`: el arco con farol). Tiene que leerse **"un zoológico lindo, a la mañana"**.
- **Orden**: primero el `fondo`; después el `medio` y el `frente`, cada uno con el `fondo` adjunto.
- **Composición común a las tres capas** (son coordenadas sobre 1536 × 1024; el código apila las tres):
  - el arco de la entrada: centro en x ≈ 430, la base de sus pilares en y ≈ 820, el hueco del arco de unos 300 px de ancho y 380 de alto;
  - la cerca de los recintos: de x ≈ 760 a x ≈ 1460, el travesaño de arriba en y ≈ 600 y la base en y ≈ 720;
  - el piso de la plaza: de y ≈ 720 hasta abajo, donde camina el Pulpito.

#### E3 · `intro dia fondo.png`

- **Archivo**: `art-source/intro dia fondo.png`. PNG 1536 × 1024, **opaco**.
- **Adjuntar**: `art-source/fondo recinto monos.png` (el estilo de los fondos aprobados) y `art-source/mapa zoologico.png` (el lugar: el zoológico visto desde arriba).

```
Match the drawing style, line weight and colour palette of the FIRST
attached image exactly: a children's book illustration with bold dark
outlines, flat colour areas with a soft painted texture inside them,
and a scene with real depth (near things big, far things small).
Landscape 3:2, exactly 1536x1024 pixels, full-bleed, FULLY OPAQUE:
every single pixel painted, no transparency anywhere, not even at the
corners. No animals, no characters, no people, no text.

This is the BACK layer of a layered scene: other layers will be placed
on top of it. Paint ONLY what is far away.

The place: the inside of a small, friendly zoo on a sunny morning,
the same zoo as the SECOND attached image (seen from above there).
From top to bottom:
- a clear light-blue morning sky, one flat soft colour with a gentle
  painted texture, two or three small white clouds, and NO sun (the
  sun is added separately);
- far away, soft green rolling hills and a few round trees;
- from y=560 to y=740, an open strip of green lawn: this is where
  animals will appear later, peeking over a fence, so keep it empty
  and calm, with no objects in it;
- from y=720 to the bottom, the round plaza of packed earth, warm sand
  colour like the paths of the second attached image, with a soft
  low-contrast texture and nothing on it.
Leave the area where the entrance arch and the fences will stand
(from x=250 to x=600 and from x=760 to x=1460, y=420 to y=740) as
simple far scenery: no arch, no fence, no gate are painted here.

Composition rules:
- Everything that says "this is a zoo in the morning" sits inside the
  central 1365x864 area; up to 85 px may be cropped on the left and
  right, and up to 80 px at the top and bottom.
- No vertical seams, no straight horizontal cut lines.
- No sun, no moon, no stars, no shadows of anything that is not here.
```

- **Evitar**: arco, reja o cerca dibujados en esta capa (van en el `medio`); el sol pintado; animales; un camino o una línea que parezca de juego.
- **Checklist**: el común (§3.4, puntos 1–3, 5 y 6), y además:
  1. ¿Mide 1536 × 1024 y es opaca en todos los píxeles?
  2. ¿La franja de césped de y 560–740 está vacía y tranquila?
  3. Al lado de `fondo recinto monos.png`: ¿es del mismo estilo?
  4. ¿Un chico diría "es de día" y "es un parque" o "un zoológico"?

#### E3 · `intro dia medio.png`

- **Archivo**: `art-source/intro dia medio.png`. PNG 1536 × 1024, fondo transparente.
- **Adjuntar**: `art-source/intro dia fondo.png` (la capa de abajo: el `medio` se apoya sobre ella) y `art-source/fondo noche zoo.png` (el arco de piedra y el farol, que tienen que ser los mismos).

```
Match the drawing style, line weight and colour palette of the FIRST
attached image exactly: bold dark #1a1a1a outlines, flat colour areas
with a soft painted texture inside them. Canvas: exactly 1536x1024
pixels, TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard, not almost transparent). No
animals, no characters, no text, no shadows on the ground.

This is the MIDDLE layer of a layered scene. It will be placed EXACTLY
on top of the first attached image, pixel for pixel. Paint ONLY these
two things, at these positions, and leave everything else fully
transparent:

1. The zoo's stone entrance arch, the same design as the arch on the
   left of the SECOND attached image but in morning daylight: two
   square sand-coloured stone pillars and a round stone arch on top,
   with an unlit iron lantern hanging from the left pillar. Centre of
   the arch at x=430. The bottoms of the pillars stand at y=820. The
   empty opening inside the arch is about 300 pixels wide and 380
   pixels tall, and it is EMPTY: no gate, no bars, no door (the gate is
   a separate picture). Through the opening, nothing is painted: it is
   transparent, so the back layer shows through.
2. A low wooden fence of three small zoo enclosures, running from x=760
   to x=1460: brown wooden posts and two horizontal rails, the top
   rail at y=600 and the bottom of the posts at y=720, with two posts
   a little taller where one enclosure ends and the next begins.
   Behind the fence and below it, NOTHING: no grass, no ground, no
   bushes. Just the fence itself.

The arch and the fence must have clean edges against the transparent
background: no grey veil, no glow, no painted floor around them.
```

- **Evitar**: piso, césped o arbustos pintados en esta capa (tapan al `fondo`); una reja adentro del arco; el farol prendido (eso es la noche); carteles con letras.
- **Checklist**: el común (§3.4), y además:
  1. Ponerla encima de `intro dia fondo.png` al 100 %: ¿el arco y la cerca caen donde estaba el lugar libre, y el resto del `fondo` se ve igual?
  2. ¿El hueco del arco es transparente (abrirla sobre negro: adentro del arco se ve negro)?
  3. ¿El arco es el mismo de `fondo noche zoo.png`, de día?

#### E3 · `intro dia frente.png`

- **Archivo**: `art-source/intro dia frente.png`. PNG 1536 × 1024, fondo transparente.
- **Adjuntar**: `art-source/intro dia fondo.png` y `art-source/intro dia medio.png`.

```
Match the drawing style, line weight and colour palette of the FIRST
attached image exactly: bold dark #1a1a1a outlines, flat colour areas
with a soft painted texture inside them. Canvas: exactly 1536x1024
pixels, TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard, not almost transparent). No
animals, no characters, no text, no shadows.

This is the FRONT layer of a layered scene, placed on top of the two
attached layers. It frames the picture, like the edge of a theatre
stage. Paint ONLY:
- in the BOTTOM-LEFT corner, a clump of big leafy bushes with a few
  small yellow and white flowers, up to about x=330 and up to about
  y=840;
- in the BOTTOM-RIGHT corner, a big mossy boulder with a fern and a
  few flowers, from about x=1250 and up to about y=860;
- on the far LEFT edge, the trunk of a big tree going off the top of
  the picture, about 110 pixels wide, with a few leaves at the top
  edge.
Everything else is fully transparent: the whole middle of the picture,
from x=330 to x=1250 and above y=760, must be empty, because the
characters walk there.
```

- **Evitar**: algo en el medio; pasto que cruza toda la parte de abajo (tapa los pies del Pulpito); sombras.
- **Checklist**: el común (§3.4), y además:
  1. Apilar las tres capas: ¿se ve una sola escena, con profundidad, y el medio de abajo queda libre para que camine el Pulpito?
  2. ¿Ningún objeto toca el centro de la escena?

### E4 — La reja de la entrada

- **Archivo**: `art-source/intro reja lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/intro dia medio.png` (el arco donde va la reja) y `art-source/fondo noche zoo.png` (la reja de hierro de la izquierda).
- **Qué es y qué tiene que reconocer el chico**: la noche del escape, la reja se abre sola, despacio (toma 6). El código la gira como una puerta de cartón: cada hoja se angosta hacia su bisagra. Por eso se pide **cada hoja suelta, de frente y plana**.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape. Chunky, generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard, not almost transparent). No text,
no frame, no ground line.

One image, 1536x1024. TWO separate halves of an iron zoo gate, the
same style of gate as the one inside the arch on the left of the
SECOND attached image, side by side with a clear gap of at least 120
pixels between them. Both seen perfectly flat from the front, no
perspective.

Each half is a tall rectangle, about 300 pixels wide and 600 pixels
tall: a dark grey #4d4d4d iron frame with seven thick vertical bars,
one horizontal bar across the middle, and small round knobs on top of
the bars. The gaps between the bars are EMPTY and transparent. Left
half (left of the image): its hinge side is its LEFT edge, a thicker
bar with two hinge rings. Right half: the mirror of the left one, its
hinge side on its RIGHT edge, and a simple round latch ring on its
LEFT edge, where the two halves meet.
```

- **Evitar**: perspectiva (la reja ya abierta en diagonal); vidrio o madera entre los barrotes; el arco dibujado; colores que no sean el gris del hierro.
- **Checklist**: el común (§3.4), y además:
  1. ¿Entre los barrotes es transparente de verdad?
  2. ¿Las dos hojas tienen el mismo tamaño y juntas forman una reja de dos hojas?
  3. ¿Un chico diría "una reja" o "una puerta"?

### E5 — La misma plaza de noche, en tres capas

- **Qué es y qué tiene que reconocer el chico**: la noche del escape. Es **exactamente la misma composición de E3**, de noche, para que el código pase de una a otra fundiendo: el arco, la cerca, los arbustos y la roca tienen que caer en el mismo lugar. Lo que cambia es la luz: cielo azul profundo, todo más oscuro y azulado, y el farol del arco **prendido**.
- **Orden**: `fondo`, `medio`, `frente`, cada una con su gemela de E3 adjunta.
- **La luz del farol**: una mancha plana de amarillo cálido `#f2d377` pintada en el piso y en el pilar, con borde suave pero sin brillo de aerógrafo, sin rayos y sin resplandor alrededor del farol. Es la regla de toda la intro: nada de brillos genéricos (`docs/26` §3).

#### E5 · `intro noche fondo.png`

- **Archivo**: `art-source/intro noche fondo.png`. PNG 1536 × 1024, **opaco**.
- **Adjuntar**: `art-source/intro dia fondo.png` (la composición, que no cambia) y `art-source/fondo noche zoo.png` (la paleta de la noche).

```
Repaint the FIRST attached image as the SAME place at NIGHT, using the
night palette and the drawing style of the SECOND attached image:
bold dark outlines, flat colour areas with a soft painted texture,
deep blue night sky. Keep EXACTLY the same composition as the first
attached image: every hill, tree, cloud, the lawn strip and the plaza
in the same place and the same size, so that the two pictures can be
cross-faded into each other.

Landscape 3:2, exactly 1536x1024 pixels, FULLY OPAQUE: every single
pixel painted, no transparency anywhere. No animals, no characters, no
text.

Changes from the first attached image, and only these:
- the sky is a deep night blue, one flat colour with a soft painted
  texture; a few small yellow stars may be painted far away, but NO
  moon (the moon is added separately);
- the clouds become dark blue-grey night clouds;
- hills, trees and lawn become their night versions: darker, bluer,
  still readable;
- the plaza ground becomes a dark night blue-grey, never black, with
  the same soft texture.
No light sources, no lantern light, no glow: the lantern light belongs
to another layer.
```

- **Evitar**: otra composición; la luna pintada; un cielo negro; brillos; la luz del farol en esta capa.
- **Checklist**: el común (§3.4, puntos 1–3, 5 y 6), y además:
  1. **La prueba de la fundida**: poner `intro dia fondo.png` y esta al 50 % una sobre otra. ¿Las lomas, los árboles y el borde del césped coinciden? Si se ven dobles, se rechaza.
  2. ¿Se lee "es de noche" sin la luna?
  3. ¿El piso no es negro (el Pulpito no camina de noche, pero la reja se tiene que ver)?

#### E5 · `intro noche medio.png`

- **Archivo**: `art-source/intro noche medio.png`. PNG 1536 × 1024, fondo transparente.
- **Adjuntar**: `art-source/intro dia medio.png` (la composición) y `art-source/fondo noche zoo.png` (el farol prendido y la paleta).

```
Repaint the FIRST attached image, the middle layer of a layered scene,
as the SAME objects at NIGHT, in the night palette and drawing style
of the SECOND attached image. Canvas: exactly 1536x1024 pixels,
TRANSPARENT background (a real alpha channel: not white, not grey,
not a painted checkerboard, not almost transparent). Keep EXACTLY the
same objects, positions and sizes as the first attached image: the
stone entrance arch centred at x=430 with its pillars standing at
y=820 and its EMPTY opening (no gate, transparent inside), and the
wooden fence from x=760 to x=1460 with its top rail at y=600.

Changes, and only these: night colours (stone and wood darker and
bluer, still readable), and the iron lantern on the left pillar is
LIT: its glass is warm yellow #f2d377, and a flat, soft-edged patch of
the same warm yellow is painted on the face of the left pillar around
it. No glow, no rays, no halo around the lantern, no light spilling
outside the pillar. Nothing else is painted.
```

- **Evitar**: piso o luz en el piso (el piso es del `fondo`); un halo; la reja; otra posición.
- **Checklist**: el común (§3.4), y además:
  1. Superponer `intro dia medio.png` al 50 %: ¿el arco y la cerca coinciden?
  2. Sobre `intro noche fondo.png`: ¿se ve una sola escena nocturna con el farol prendido?

#### E5 · `intro noche frente.png`

- **Archivo**: `art-source/intro noche frente.png`. PNG 1536 × 1024, fondo transparente.
- **Adjuntar**: `art-source/intro dia frente.png` (la composición) y `art-source/fondo noche zoo.png` (la paleta).

```
Repaint the FIRST attached image, the front layer of a layered scene,
as the SAME objects at NIGHT, in the night palette and drawing style
of the SECOND attached image. Canvas: exactly 1536x1024 pixels,
TRANSPARENT background (a real alpha channel: not white, not grey,
not a painted checkerboard, not almost transparent). Keep EXACTLY the
same objects, positions and sizes: the bushes with flowers in the
bottom-left corner, the mossy boulder with a fern in the bottom-right
corner, and the tree trunk on the far left edge. Only the colours
change: darker, bluer night versions, still readable, with the small
flowers in muted night colours. The middle of the picture stays fully
transparent. No glow, no fireflies, no sparkles.
```

- **Evitar**: luciérnagas o brillitos (`docs/26` §3); otra composición.
- **Checklist**: el común (§3.4), y además: superponer `intro dia frente.png` al 50 %: ¿coinciden?

### E6 — El cielo: sol, luna, estrellas y nubes sueltos

- **Archivo**: `art-source/intro cielo lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/fondo noche zoo.png` (la luna y las estrellas) y `art-source/lamparita prendida.png` (el amarillo).
- **Qué es y qué tiene que reconocer el chico**: el sol que sale y se pone y la luna que sale (tomas 1, 5, 6 y 7). Sueltos, el código los mueve por el cielo.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow or a halo, 3D shading, bevels, texture
noise, photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard, not almost transparent). No text, no
frame.

One image, 1536x1024. SEVEN separate sky objects, evenly spaced, none
touching, at least 60 pixels apart and 60 pixels from every edge:
Top row, left to right:
1. THE SUN: a round sunny yellow #f7c41f disc, about 260 pixels wide,
   with a small calm smile drawn in #1a1a1a, and ten short, thick,
   rounded #1a1a1a ray strokes around it, separate from the disc.
2. THE MOON: a fat crescent moon, pale warm yellow #f2d377, about 240
   pixels tall, with a small closed sleepy eye and a small smile drawn
   in #1a1a1a.
3. A CLOUD: a soft round daytime cloud, white #fdfcf7, about 300
   pixels wide.
Bottom row, left to right:
4. A SECOND CLOUD, different shape, longer and lower, white #fdfcf7.
5. A STAR, five rounded points, yellow #f2d377, about 90 pixels.
6. A SECOND STAR, a little smaller and tilted.
7. A THIRD STAR, the smallest.
```

- **Evitar**: rayos de luz difusos o resplandor; caras exageradas (el sol y la luna son tranquilos); nubes grises.
- **Checklist**: el común (§3.4), y además:
  1. ¿Un chico diría "el sol", "la luna", "una nube", "una estrella" para cada uno?
  2. ¿Ningún objeto toca a otro (se recortan por separado)?

---

## 5. Pedidos de prioridad media (E7–E11)

### E7 — El cuidador encuentra la lupa (parte B de la intro)

- **Archivo**: `art-source/pulpo cuidador con lupa lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/pulpo mochila y cuidador lamina.png` (D42: el cuidador), `art-source/pulpo cuidador poses lamina.png` (E1: la escala) y `art-source/lupa v2.png` (D8: la lupa).
- **Qué es y qué tiene que reconocer el chico**: al terminar de limpiar el sendero aparecen huellas. El Pulpito, todavía cuidador, se agacha con una lupa a mirarlas y después se la lleva al ojo: **ahí nace el detective** (`docs/16` §2, beat 5; `docs/26` §2.2). Después de esta pose, la transición de la lupa del juego lo muestra ya vestido de detective (D6).

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow or a coloured halo around the outline, 3D
shading, bevels, texture noise, photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard; the background must be fully
transparent, not almost transparent). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1536x1024. TWO separate full-body poses of EXACTLY the
zoo-caretaker octopus on the RIGHT of the FIRST attached image, at the
SAME scale as the octopus in the SECOND attached image: body orange
#fd6a29, eight curly arms with pale suckers, big white eyes with a
large black pupil and one shine dot, happy arched eyebrows, the cream
cap with green peak and green paw print, the cream apron with green
straps and pocket. NO deerstalker hat, NO collar, NO tie. He holds the
magnifying glass of the THIRD attached image, same design and colours.

Pose 1 (left), studying the ground: body bent forward and turned to
the RIGHT, head low, one arm holding the magnifying glass close to the
ground in front of him, looking down through it with a curious face.
Pose 2 (right), the glass to his eye: standing straight, facing the
viewer, one arm holds the magnifying glass in front of his RIGHT eye
(the eye on the viewer's left), so that eye is seen through the glass,
drawn BIGGER inside the lens; the other eye normal. Eyebrows raised,
an excited "aha!" smile.

Layout rules: both at the SAME scale as the second attached image
(head about 260 pixels wide); both on the same invisible ground line,
about 100 pixels above the bottom; each pose one connected drawing,
nothing floating around it; at least 60 pixels between the poses and
80 pixels from every edge.
```

- **Evitar**: el gorro de detective o la corbata (todavía no es detective); la lupa con vidrio celeste y brillo blanco (la de D8 tiene contorno negro); signos sueltos; el halo.
- **Checklist**: el común (§3.4), y además:
  1. Al lado de D42 y E1: ¿mismo pulpo, mismo tamaño?
  2. ¿La lupa es la de `lupa v2.png`?
  3. Pose 2: ¿un chico diría "mira con la lupa" y se ve el ojo agrandado adentro?

### E8 — La libreta del detective: tapa y página

- **Qué es y qué tiene que reconocer el chico**: si la autora elige que las letras se escriban **en la libreta del detective** (`docs/25` 4.3 y 4.5), la pantalla de letras es la libreta abierta. La tapa sirve para la transición (el código la abre girándola). La página va **en blanco**: el renglón de tres zonas lo dibuja el código, porque tiene que coincidir al píxel con la letra (§2).
- **Si la autora elige una pantalla aparte más sobria** (`docs/25` §8, pregunta 4), E8 no hace falta: poner `descartado: la autora eligió pantalla aparte`.

#### E8 · `libreta tapa.png`

- **Archivo**: `art-source/libreta tapa.png`. PNG 1536 × 1024, fondo transparente.
- **Adjuntar**: `art-source/botones lamina.png` (D36: el anotador del botón "libreta", que es el ícono que el chico ya conoce) y `art-source/pulpo lupa lamina.png` (el marrón y el rojo del detective).

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there. Chunky,
generous shapes with no fine detail. Every inner detail is a dark
#1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard, not almost transparent). No text, no
frame, no ground line.

One image, 1536x1024. The CLOSED cover of a detective's notebook, the
same spiral notepad as the "notebook" button of the first attached
image, seen perfectly flat from the front, landscape, filling about 85%
of the canvas, centred. A wire spiral binding runs along its TOP edge.
The cover is brown #ad6b3f like the detective's hat of the second
attached image, with a thin checked pattern drawn in darker #1a1a1a
lines, and a red #e1231d elastic band running down across the right
side. In the middle of the cover, a simple round label of cream paper
#fdfcf7 with a small orange octopus face (the detective's face of the
second attached image: orange #fd6a29, white eyes with black pupils,
the brown checked deerstalker hat). No letters, no words.
```

- **Evitar**: letras o un título; perspectiva; tapa de cuero brillante; otro pulpo.
- **Checklist**: el común (§3.4), y además: ¿un chico diría "la libreta del pulpo" o "un cuaderno"? ¿Se parece al ícono del botón "libreta"?

#### E8 · `libreta pagina.png`

- **Archivo**: `art-source/libreta pagina.png`. PNG 1536 × 1024, fondo transparente.
- **Adjuntar**: `art-source/libreta tapa.png` (la misma libreta, abierta).

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black.
The line is HUMAN, not vector: slight wobble along the stroke. Flat
fills, one flat colour per shape. No fine detail.

Do NOT produce: smooth vector lines, gradients, shadows, glow, 3D
shading, paper texture, stains, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard, not almost transparent). No text,
no frame.

One image, 1536x1024. ONE open page of the attached notebook, seen
perfectly flat from the front, landscape, filling about 92% of the
canvas, centred: a big rounded rectangle of flat warm paper colour
#fdfcf7 with the #1a1a1a marker outline, and the same wire spiral
binding along its TOP edge, its rings going through small round holes.
The page is COMPLETELY BLANK: no ruled lines, no margin line, no grid,
no drawings, no words, no texture. Only the plain paper, its outline
and the spiral.
```

- **Evitar**: renglones o cuadrícula (los dibuja el código); manchas, textura de papel o sombra; dos páginas.
- **Checklist**: el común (§3.4), y además:
  1. ¿La página es un solo color plano `#fdfcf7`? Medir un píxel del medio.
  2. ¿No tiene ninguna línea adentro?
  3. ¿Es la misma libreta que la tapa?

### E9 — El lápiz del detective

- **Archivo**: `art-source/lapiz v2.png`. PNG 1024 × 1024, fondo transparente. **No pisar** `lapiz.png`.
- **Adjuntar**: `art-source/lupa v2.png` (D8: el objeto que hoy sigue al dedo, mismo trazo y mismo peso visual).
- **Qué es y qué tiene que reconocer el chico**: en los caminos, lo que sigue al dedo es la lupa (`docs/09` §2). En la libreta se escribe, así que lo que sigue al dedo es **un lápiz**, con la punta exactamente donde está el dedo. La punta tiene que caer en un lugar fijo del lienzo para que el código la ponga sobre el dedo.

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends: a true neutral
black. The line is HUMAN, not vector: slight wobble along the stroke,
small variation in thickness. Flat fills, one flat colour per shape,
that overshoot the outline slightly here and there. Chunky shapes, no
fine detail.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, shine, texture noise,
photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard, not
almost transparent). Nothing else: no ground, no shadow, no text.

One chunky, short pencil, like a child's first pencil, drawn
DIAGONALLY: the eraser end at the TOP-RIGHT and the sharpened point at
the BOTTOM-LEFT, at 45 degrees. The body is sunny yellow #f7c41f with
two thin #1a1a1a lines along its length; a grey metal band #8c8c8c
and a pink eraser #f29bb0 at the top-right end; the sharpened wood
cone is light wood #e9c08f; the graphite tip is dark grey #4d4d4d.
The very point of the tip sits at x=170, y=854 (about one sixth of the
width from the left, one sixth of the height from the bottom), and
nothing of the drawing goes further left or lower than that point.
The pencil is about 900 pixels long from point to eraser.
```

- **Evitar**: un lápiz largo y fino (a 60 px tiene que leerse); un brillo; la punta en otro lugar; un lápiz de color con la punta de color.
- **Checklist**: el común (§3.4), y además:
  1. ¿Un chico diría "un lápiz"?
  2. ¿La punta está abajo a la izquierda, cerca de (170, 854), y es lo más bajo y lo más a la izquierda del dibujo?
  3. Achicada a 60 px: ¿se sigue leyendo lápiz y no un cohete o un crayón?

### E10 — Los sellos del detective, uno por familia de letras

- **Archivo**: `art-source/sellos lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/tortuga.png`, `art-source/mono v2.png`, `art-source/pato.png` y `art-source/pez.png` (las siluetas).
- **Qué es y qué tiene que reconocer el chico**: cuando termina una familia de letras, el Pulpito sella la página de la libreta con el sello del animal que le enseñó ese movimiento (`docs/25` 4.6): **tortuga** (`o a`), **mono** (`l e`), **pato** (`m n`), **pez** (`u`). El sello es la recompensa: tiene que leerse **"un sello con una tortuga"** y no un dibujo de tortuga. Son animales ya rescatados: no hay misterio que cuidar.

```
Style: a 2D game asset that looks like rubber-stamp impressions pressed
on paper with red ink, drawn by hand: chunky shapes, edges slightly
irregular and hand-made, never perfectly smooth. Chunky, generous
shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, ink splatter, photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard, not almost transparent). No text,
no frame.

Colour rule: every stamp is ONE solid colour, red ink #e1231d, on a
transparent background. No second colour, no black outline.

One image, 1536x1024. FOUR separate round stamp impressions in a row,
evenly spaced, not touching, each about 320 pixels wide, at least 50
pixels apart and 80 pixels from every edge. Each stamp is a thick red
ring with a thin second ring inside it, and in the middle one solid red
animal silhouette, big and clear, taken from the attached animals:
1. a TURTLE seen from the side, shell up, head out to the right;
2. a MONKEY sitting, long tail curling up;
3. a DUCK seen from the side, facing right;
4. a FISH seen from the side, facing right, with a forked tail.
Between the two rings, NO letters: only six small solid dots evenly
spaced around.
```

- **Evitar**: letras o palabras en el anillo; colores distintos por sello; animales con detalle interior que se pierde en un color; manchas de tinta.
- **Checklist**: el común (§3.4, puntos 1, 5 y 6), y además:
  1. ¿Un chico de 6 años nombra el animal de cada sello sin ayuda?
  2. ¿Los cuatro tienen el mismo tamaño, el mismo anillo y el mismo rojo?
  3. ¿Se lee "sello" (como los de la escuela) y no "dibujo"?

### E11 — La cerca de palos cruzados (solo si se aprueba `docs/25` 3.2)

- **Archivo**: `art-source/cerca palos cruzados lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/llama.png` (el animal que cuida la cerca) y `art-source/escritorio v2.png` (la madera).
- **Qué es y qué tiene que reconocer el chico**: en dos niveles de las llamas el chico traza cruces `+` y `X` (`docs/25` 3.2). Cada cruz terminada **se vuelve una pieza de la cerca** del corral de las llamas. Se piden las dos piezas terminadas; el gris de "todavía no" lo saca el pipeline, como en las pistas.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there. Chunky,
generous shapes with no fine detail. Every inner detail is a dark
#1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard, not almost transparent). No text,
no frame, no ground line, no grass.

One image, 1536x1024. TWO separate pieces of a rustic Andean fence,
side by side, at least 150 pixels apart, each about 560 pixels tall,
seen flat from the front:
1. Left: a "+" cross: one straight vertical wooden stick and one
   straight horizontal wooden stick crossing at its upper middle,
   tied together where they cross with a cream #f2e3c6 rope wrapped
   three times.
2. Right: an "X" cross: two straight wooden sticks crossing
   diagonally at their middle, tied the same way with the same rope.
The sticks are warm wood #b8743a, chunky and slightly irregular, with
two or three short #1a1a1a wood-grain lines each and rounded, a little
uneven ends. The two shapes must read clearly as "+" and "X".
```

- **Evitar**: ramas torcidas que borran la forma de la cruz; corteza con mucho detalle; pasto o piso; una cerca entera (se arma por código).
- **Checklist**: el común (§3.4), y además:
  1. En gris plano y achicada a 60 px: ¿se lee `+` y `X`?
  2. ¿Un chico diría "palos atados" o "una cerca"?

---

## 6. Pedido de prioridad baja (E12)

### E12 — Dibujos para pintar en las hojas para imprimir (solo si se aprueba `docs/25` 5.2)

- **Archivo**: `art-source/lamina para imprimir.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/pulpo lupa lamina.png` (D6), `art-source/tortuga.png`, `art-source/mono v2.png`, `art-source/pato.png`, `art-source/pez.png`.
- **Qué es y qué tiene que reconocer el chico**: la hoja para imprimir de cada familia (`docs/25` 5.2) lleva el trazo en grande, generado por código, y en una esquina el animal de esa familia y el Pulpito, **en línea negra y sin color**, para que el chico los pinte. Línea sola: imprime barato en cualquier impresora de escuela.

```
Style: a colouring-book page drawn with a thick felt-tip marker, by
hand. ONLY black outlines #1a1a1a, thick, with rounded ends, slight
human wobble. Every shape is filled with plain white #ffffff, so it
can be coloured in. Big, simple shapes with wide spaces to colour; no
tiny areas.

Do NOT produce: any colour other than #1a1a1a and white, grey areas,
shading, hatching, gradients, shadows, glow, or a background.

Canvas: TRANSPARENT background outside the drawings (a real alpha
channel: not white, not grey, not almost transparent). No text, no
frame.

One image, 1536x1024. FIVE separate drawings, evenly spaced in two
rows, none touching, at least 50 pixels apart and 60 pixels from every
edge, all with the same line weight:
Top row: 1. the octopus detective of the first attached image,
standing, waving, with his deerstalker hat, collar and tie, no
magnifying glass; 2. the turtle of the attached turtle.
Bottom row: 3. the monkey; 4. the duck; 5. the fish.
Each animal is the same character as its attachment, drawn as a
colouring outline.
```

- **Evitar**: rellenos grises o negros grandes; detalles chicos imposibles de pintar; color.
- **Checklist**: el común (§3.4, puntos 1, 5 y 6), y además: ¿cada dibujo se reconoce sin color? ¿Hay espacios grandes para pintar con crayón?

---

## 7. Notas para la implementación (no son para ChatGPT)

Lo de siempre vale igual (`docs/17` §4, `docs/23` §7): cada fuente nueva
lleva su entrada en `AUTHORED_SOURCE_SIZES`, se mide el alpha fantasma, se
copian `w`/`h` del manifiesto a `detective/assets.ts` y se mira la captura.

1. **Alpha fantasma y halo, con cada lámina.** El script de diez segundos de
   `docs/17` §3 bis (`halo` entre 0,00 % y 0,40 %, esquina `(0, 0, 0, 0)`).
   Las capas `medio` y `frente` de E3 y E5 son las de más riesgo: son
   transparentes casi enteras, y un velo de alpha 8 sobre el 90 % del lienzo
   oscurece la escena entera. Si mide mal, agregarla a `GHOST_ALPHA_SOURCES`
   por nombre. El halo naranja de D6/D7 (un borde de color fuera del
   contorno) se rechaza; no se limpia en el pipeline.
2. **Las capas de la intro no pasan por `recolour` ni por `recontour`**: son
   escena, como los fondos (`PASSTHROUGHS`). Las opacas (`fondo`) se
   validan con `emit_opaque_canvas`; las transparentes necesitan una fila
   que conserve el lienzo entero (no recortar por `alpha_bbox`: la posición
   dentro de 1536 × 1024 es lo que hace que las capas calcen). Bajarlas a
   1280 de ancho al embarcar (`docs/26` §4.5).
3. **Láminas de personaje** (E1, E2, E7): cortar con `crop_sheets.py`,
   misma regla que D41 (`pose_crops`), a `pulpo cuidador empuja.png`,
   `pulpo cuidador bosteza.png`, `pulpo cuidador sorprendido.png`,
   `pulpo cuidador busca.png`, `pulpo cuidador invita.png`, `pulpo cuidador
   mira el piso.png`, `pulpo cuidador lupa al ojo.png`. Todas con el mismo
   recuadro (`FRAMED`): la intro las cambia en el mismo lugar y cualquier
   diferencia de escala se ve como un salto.
4. **E4, la reja.** Cortar cada hoja; medir en `intro dia medio.png` el hueco
   del arco (no estimarlo) y escalar las hojas a él. La bisagra va en el
   borde de afuera de cada hoja: el `transform-origin` del giro es ese borde.
5. **E6, el cielo.** Cortar los siete objetos.
6. **E8, la página.** Medir el rectángulo útil de papel (sin el espiral) y
   llevarlo a constantes: ahí dibuja el código la pauta de tres zonas.
7. **E9, el lápiz.** Medir la punta en el PNG y llevarla a una constante,
   como el centro de la lente de la lupa (`docs/09` §2): el lápiz se centra
   en la punta, no en su caja.
8. **E10, los sellos.** Van recoloreados a un token (un color por sello),
   por `recolour`; el rojo `#e1231d` es el de la corbata del detective.
9. **E11, la cerca.** Derivar la versión apagada como una pista
   (`CLUE_DRAINED`): gris acromático, legible contra el suelo.
10. **E12.** No entra al juego: va a la carpeta de las hojas para imprimir,
    que arma el código.

---

## 8. Relación con `docs/23`

| Entrada | Qué pasa |
|---|---|
| `docs/23` D38–D46 | Siguen en `docs/23` con su prompt. Acá solo se ordenan dentro de la sesión (§1) y se marcan también en la §1 |
| `docs/23` D42 | Sube a prioridad alta: es la referencia de E1, E2 y E7 |
| `docs/16` §7, punto 10, y `docs/17` §5 (el video de la apertura) | Los reemplaza `docs/26`: la apertura es una escena animada por código con el arte de E1–E6, no un video generado |
