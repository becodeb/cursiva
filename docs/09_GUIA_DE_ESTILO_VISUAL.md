# Guía de Estilo Visual

Decidida el 2026-09-10. Rige todo lo visual del juego: assets, UI y
pantallas. Si algo nuevo no cumple esto, no entra.

---

## 1. La dirección: marcador grueso

Todo está dibujado con un marcador grueso.

- **Contorno oscuro y grueso, con puntas redondeadas**, de grosor
  parecido en todo el dibujo pero **no idéntico**. *Esta viñeta decía
  "contorno negro parejo, del mismo grosor". Estaba mal y produjo el
  problema que arregló el 2026-09-12:* pedir una línea pareja y uniforme
  empuja al generador hacia el vector limpio, que es exactamente lo que
  no queremos. Un marcador lo maneja una mano: la línea tiene temblor
  chico, las curvas no cierran perfecto, el grosor varía un poco a lo
  largo del trazo. Esa irregularidad es el estilo, no un defecto a
  corregir.
- **El contorno es ACROMÁTICO: su tono es cero.** Ver sección 4. Esto ya
  falló dos veces —contornos a tono 217 (azul) y a tono 136 (verde)— y
  por eso ahora es una regla con nombre y con test.
- **Relleno plano que se pasa un poco del contorno**, como un dibujo de
  chico hecho prolijo. Ese desborde es deliberado: es lo que separa este
  estilo de un vector genérico.
- **Formas gordas y generosas.** Cero detalle fino: si un rasgo no se
  entiende a 24 píxeles, no va.
- **Un color plano por forma.** Nada de sombreado, ni volumen, ni brillo.

Se eligió sobre tres alternativas (cuaderno a mano, papel recortado,
sellos de tinta) por ser la más legible para un chico de cinco años y la
más difícil de saturar.

## 2. El personaje: un pulpo, y la lupa

El personaje es un **pulpo**. Por qué un pulpo y no una mano con lupa:
ocho brazos resuelven de una que el personaje pueda **mirar y recoger al
mismo tiempo**.

**Corregido el 2026-09-11.** El pulpo NO sigue la yema del dedo. Se queda
**parado en el inicio del recorrido**, y lo que sigue al dedo es la
**lupa** que sostiene. El chico arranca el arrastre desde donde está el
pulpo, "agarra" la lupa y recorre el camino con ella.

El motivo es de lectura, no de gusto: un pulpo de 96 unidades encima de
la yema tapa el corredor por el que hay que pasar, y tapa también las
pistas que se están encendiendo. La lupa es chica, es transparente en el
centro y es —literalmente— el objeto con el que uno mira. Separarlos
además le da un lugar propio a cada uno: el pulpo marca **de dónde
saliste**, la lamparita marca **adónde vas**.

Consecuencia práctica: la lupa se centra en **la lente**, no en su
bounding box. El mango tira el centro geométrico un cuarto de ancho
fuera del cristal, y el cristal es lo que tiene que quedar sobre el dedo.
Lo resuelve `build_art.py` con padding, no el renderer con un offset
mágico.

## 3. Restricciones técnicas (no son gusto, son el motor)

Un asset que no las cumpla hay que rehacerlo.

- **PNG ráster, vía `<image href="/art/...">`.** *Esta regla decía "SVG,
  un `path` por forma, nada de PNG". Se enmendó el 2026-09-11, y conviene
  saber por qué antes de volver atrás.* El arte que se dibujó es
  multicolor y tiene brillos especulares —el cristal de la lupa y el de
  la lamparita leen como vidrio justamente por eso—, y no hay en esta
  máquina potrace, Pillow ni ImageMagick. Ninguna herramienta disponible
  podía vectorizarlo sin tirar a la basura lo que lo hace funcionar. El
  motivo original de la regla era el escalado en tablets, y los fuentes
  vienen a 1254px contra marcas que se dibujan a 20-30 unidades: sobra
  resolución por un factor de cuarenta. La regla se enmienda, no se
  finge.
- **El arte no se embarca como se dibuja.** `scripts/art/build_art.py`
  deriva todo lo de `client/public/art/` desde `art-source/`: recorta,
  escala, recolorea a la paleta y corta los tapices de suelo en marcas
  sueltas. 9,0 MB de fuentes → 850 KB embarcados. Un asset nuevo entra
  por ahí, nunca a mano.
- **Prohibido `url(#...)`**: sin degradados, sin filtros, sin máscaras,
  sin `clipPath`, **sin `pattern`**. En este repo eso **hidrata en blanco
  en dispositivos reales** — está documentado en
  `client/src/canvas/TraceCanvas.tsx:63-84` con la cicatriz
  correspondiente. `<image href>` sobrevive esta prohibición: no necesita
  `defs` ni un id que resolver contra la URL base del documento.
  Una `url('/fonts/...')` de CSS tampoco es lo prohibido: la veda es
  sobre la forma con `#`, la referencia a un fragmento.
- **Esta prohibición es la que decide cómo se textura el suelo.** No hay
  forma de rellenar el corredor con una textura: teselar pide `pattern`,
  y confinar la textura a la forma irregular del corredor pide
  `clipPath`. Por eso el suelo se **dispersa como marcas sueltas**
  posicionadas contra el eje del corredor, que es el mismo idioma que ya
  usan las pistas. Ver `client/src/canvas/groundScatter.ts`.
- **Centradas en el origen**: el `(0,0)` es el centro visual de la marca,
  porque el motor la rota para seguir la tangente del camino. Excepción:
  los animales llevan el origen en las patas, así se paran sobre la línea
  del suelo.
- **Un color por forma.** Cada marca tiene dos estados —apagada y
  ganada— y el cambio es un swap de `fill`. Una forma con seis colores
  internos rompe eso.
- **Tamaños** sobre el lienzo de `1000×600`: marcas de pista ~20-30 de
  alto, pulpo ~60, animales ~140.

## 4. Paleta

Son los valores que ya están en `client/src/detective/palette.ts`. El
arte generado tiene que usar estos, no aproximaciones.

| Uso | Hex |
|---|---|
| Papel / fondo | `#fdfcf7` |
| Contorno del arte | `#1a1a1a` |
| Trazo del chico (`INK_COLOR`) | `#1e293b` |
| Pista apagada | `#838383` |
| Gotita de agua | `#3f6f8f` |
| Grano de maíz | `#b8912f` |
| Huella | `#000000` |
| Pluma | `#2f6b5c` |
| Lamparita encendida | `#f2d377` |

**El contorno del arte y el trazo del chico NO son el mismo color, y
confundirlos fue un error real.** Hasta el 2026-09-12 esta tabla tenía una
sola fila, `Tinta / contorno: #1e293b`, y `build_art.py` mandaba todo píxel
de contorno a ese valor. `#1e293b` tiene **tono 217° y saturación 0,33: es
azul pizarra.** Medido sobre el arte embarcado, era el segundo color más
frecuente de cada marca, entre el 25% y el 30% de sus píxeles opacos — y una
marca se dibuja unas 35 veces por nivel, así que el azul era el color más
repetido de la pantalla.

`INK_COLOR #1e293b` es el lápiz del chico y está bien que sea un gris
azulado: es su trazo, tiene que distinguirse del mundo. `ART_OUTLINE
#1a1a1a` es la línea de marcador del mundo dibujado. **Su tono debe ser
cero**, y `palette.test.ts` lo afirma, porque esto ya falló dos veces: azul
en las pistas y verde (`#19241c`, tono 136°) en las matas de pasto.

**El color es la recompensa.** Una marca sólo toma color cuando el chico
la recoge. La huella es la excepción y va a negro, no a un color, porque
una huella en la tierra no tiene color propio.

**La recompensa es el TONO, no el contraste. Confundirlos costó el defecto
del 2026-09-12 y esta guía tiene parte de la culpa por no decirlo.** "Pista
apagada" quería decir *sin color*, y se implementó como *casi invisible*:
`CLUE_DRAINED` era `#c8cdd2`, elegido cuando el corredor era papel casi
blanco (`#fdfcf7`, luma 252), contra el que separaba 48. Cuando la hoja
ganó suelo (sección 7) el corredor pasó a `CORRIDOR_EARTH #d9c3ae`, luma
199, y ese mismo gris quedó a 5 de su fondo. Nadie lo revisó porque nada
estaba mal escrito: un valor correcto en su contexto se volvió incorrecto
cuando el contexto se movió abajo suyo. Medido sobre el arte embarcado,
una mata de pasto separaba 79 de SU fondo y se dibujaba hasta 1,9 veces
más grande que una pista. Al chico se le pedía buscar lo menos visible de
la pantalla.

Entonces la regla, dicha entera:

- Una pista apagada es **acromática** —saturación cero, sin excepción— y
  **legible**: separa al menos 55 de luma del suelo que tiene abajo.
  `#838383` separa 68 de la tierra y 76 del campo.
- Ganar una pista es **ganar tono**. `PRINT #000000` es la única que no
  tiene tono para ganar, y paga en luma: 131 de salto contra el gris
  apagado.
- Consecuencia aceptada a sabiendas: una pista apagada ahora tiene MÁS
  contraste de luma contra la tierra que `BUBBLE` o `KERNEL` ganadas. No
  es un problema de lectura —esas dos son saturadas contra arcilla de
  croma bajo, y las lleva el tono—, pero significa que en esta paleta la
  luma ya no se puede leer como señal de recompensa.

**Y la jerarquía es una regla, no una cuestión de gusto.** Una pista
apagada tiene que separarse de su suelo **más** que cualquier marca
decorativa del suelo se separa del suyo, y no puede dibujarse **más
chica** que ella. Lo afirma `client/src/detective/artHierarchy.test.ts`
sobre los PNG embarcados —no sobre el arte fuente, porque el `mute()` del
pipeline es el que decide la mitad decorativa de la comparación.

**El arte se recolorea a estos valores, no se aproxima.** Lo dibujado
venía cerca pero no igual —la gota en `#3090c0` contra `POND #3f6f8f`, el
maíz en `#d89018` contra `KERNEL #b8912f`—, y no es una diferencia de
redondeo: `palette.test.ts` afirma bandas de matiz y croma contra
`GOAL_COLOR` y `HAZARD_COLOR` que los valores crudos no cumplen. El
recoloreo vive en una tabla auditable de `build_art.py`, no en un editor
de imágenes.

**Cuatro excepciones, y sus razones.**

1. **Los cuatro animales** conservan su color dibujado. En la pantalla de
   deducción el animal ES la respuesta; ahí el color no decora, informa.
2. **El pulpo y la lupa** conservan el suyo. Son la presencia del chico
   en el mundo, lo único vivo en pantalla, y están siempre visibles.
3. **El suelo tiene color, pero apagado.** Ver sección 7.
4. **Las criaturas del Nivel 3 (la medusa y la estrella de mar) conservan
   su relleno**, con la misma razón que el punto 1: son seres vivos en el
   mundo, no una pista, y ninguna de las dos aparece nunca al lado de una
   marca de pista.

   Acá la regla necesitó una tercera vía, y se descubrió por las malas la
   tercera vez en este mismo cambio: `medusa.png` y `estrella de mar.png`
   traían un contorno azul marino (croma ≈118 y ≈122 sobre 255) contra el
   `ART_OUTLINE` acromático de todo el resto del mundo dibujado — diez
   veces más saturado que el defecto del pasto (`#19241c`, croma 11) que
   ya está documentado más abajo. `build_art.py` distingue ahora tres
   clases de arte, no dos:
   - **Recoloreado a un token de la paleta** (las pistas, la lamparita):
     pasa por `recolour()`, un color plano por marca.
   - **Relleno dibujado, contorno del mundo** (las props del mundo
     dibujado paradas sobre la hoja, como la medusa y la estrella de
     mar): pasa por el tercer modo del pipeline, `recontour`, que manda
     sólo los píxeles del CONTORNO a `INK` y no toca ningún relleno. No
     inventa un color nuevo: `ART_OUTLINE` ya existía.
   - **Todo tal como se dibujó** (los cuatro animales de deducción):
     nunca pasa ni por `recolour` ni por `recontour`, porque nunca están
     parados al lado de una pista — están solos en la fila de deducción.

   Los dos archivos miden hoy `#1a1a1a` en el 95% de su contorno; el 3-4%
   restante es el fleco del recorte donde el contorno se funde con un
   relleno saturado. `client/src/detective/artHierarchy.test.ts` lo
   guarda con un test que junta por prefijo (`goal-*`, `hazard-*` — así
   una prop futura entra sola, sin que nadie tenga que acordarse) y exige
   que como máximo el 25% del contorno de una prop cargue color.

   **Dicho con toda honestidad, no escondido:** `carrier-octopus.png`
   mide 97% de su contorno con color, el peor caso de todos, y se dejó
   así a propósito. La sección 2 de esta guía hace de esa línea azul
   parte de la cara del personaje, así que tocarla es una decisión de
   dirección de arte y no del pipeline. El pulpo queda fuera del glob
   `goal-*`/`hazard-*` porque no es una prop, así que el test nuevo no lo
   está exceptuando por nombre: simplemente no lo alcanza.

## 5. La regla que decide todo: la marca repetida

**La huella se dibuja unas 40 veces por nivel.** Es el elemento más
repetido del juego y el que decide si el rastro se lee como un camino o
como suciedad.

Un asset puede quedar hermoso en una lámina y arruinarse al repetirse.
Antes de aceptar cualquier marca de pista, hay que verla **repetida a lo
largo de una curva**, no sola. Y las huellas **alternan izquierda y
derecha**: la alternancia es lo que hace que una huella lea como "alguien
caminó por acá"; la forma sola no alcanza.

## 6. Dónde entran los assets

Todo el arte vive detrás de un registro tipado en
`client/src/detective/assets.ts` (`CLUE_ART`, `ANIMAL_ART`, `GLASS_ART`).
Reemplazar un placeholder por arte real es editar el string `d` de esa
entrada y nada más. La costura está hecha justamente para esto.

## 7. La hoja es un lugar (deuda saldada el 2026-09-11)

Decía: *"la hoja parece un diagrama en vez de un lugar"*. Eran tres
causas distintas, y hubo que arreglar las tres:

1. **El rectángulo gris con `rx=12`.** La esquina redondeada es la mitad
   de lo que hacía leer la hoja como una **tarjeta apoyada sobre una
   página**. Ya no hay `rx`.
2. **Un tercer blanco roto.** El `preserveAspectRatio="xMidYMid meet"`
   deja franjas de letterboxing, y esas franjas mostraban el `#faf8f5`
   de la página — distinto del papel `#fdfcf7` y distinto de la pared.
   Ese desajuste era lo que dibujaba el borde de la tarjeta. Ahora la
   página continúa el mundo.
3. **La pauta recortaba la hoja.** `drawingBand()` limitaba la banda a
   ~440 de las 600 unidades por los renglones, en niveles
   `surface: 'blank'` donde no se dibuja ni un renglón. En blanco, la
   hoja va entera.

**El suelo.** Campo de pasto afuera, tierra pisada en el corredor, y
marcas de pasto y de barro dispersas encima.

Los dos tonos base son `GROUND_FIELD #c9d7bd` y `CORRIDOR_EARTH #d9c3ae`,
y son deliberadamente de croma bajo. **Se probaron los dos tratamientos
contra un render antes de elegir.** A saturación plena el campo verde se
come la regla de la sección 4 —pasa a haber color decorativo en la
superficie más grande de la pantalla— y además choca de frente con
`PLUME #2f6b5c`, que es el color *ganado* del rastro de plumas: la
recompensa terminaría pareciendo decorado.

**Cómo se pide un asset de suelo.** No pidas un tapiz que se repita:
el pipeline recorta matas sueltas igual, y en un tapiz denso las matas se
tocan y cada recorte se lleva pedazos de las vecinas. Pedí **una lámina
de matas separadas, con aire alrededor de cada una**. Y pedí variación de
**forma**, no de tamaño: anchas y bajas, altas y angostas, inclinadas por
el viento, ralas y desprolijas. Ocho abanicos simétricos del mismo dibujo
a distinta escala se leen como un sello a las treinta repeticiones.

Dos reglas que salieron de equivocarse:

- **Una hoja suelta no es una mata.** Recortada y esparcida sola lee como
  un poroto. Por eso hay un piso de área, y es **por fuente**: en el
  pasto descarta hojas sueltas, en el barro tiene que ser casi cero
  porque ahí una mancha chica es una piedrita, que es justamente de lo
  que el barro tiene que estar hecho.
- **Un bounding box no es una forma.** Recortar por caja se lleva las
  esquinas de las vecinas, y se veían como astillas oscuras flotando al
  lado de cada mata. Hay que quedarse con el blob conectado, no con la
  caja.

El pasto lleva **12 variantes y el barro 8**, a propósito: el pasto cubre
todo el campo a tamaño completo, donde una silueta repetida canta; el
barro va chico, adentro del corredor y medio tapado por el propio rastro
del chico.

**El suelo se dibuja más chico que una pista, y eso también es regla.** El
pasto iba a 30-52 unidades contra pistas de 28 —la decoración era hasta
1,9 veces el tamaño de lo que hay que juntar—, y el 2026-09-12 bajó a
18-26. El paso de la grilla bajó con él, de 76 a 58: la cobertura va como
`tamaño² / paso²`, así que achicar las matas sin cerrar la grilla deja el
campo pelado, que es justamente lo que el `contour_lift` se había
inventado para evitar. Los dos se mueven juntos o ninguno.

**Y una trampa que costó una iteración:** apagar sólo los rellenos no
alcanza. El contorno dibujado del pasto viene en `#19241c`, a un pelo de
la tinta `#1e293b`. Con ~130 matas contra ~35 pistas, el ojo se iba al
pasto y no al camino. Los contornos del suelo necesitan su propia
palanca, más dura que la de los rellenos — es el parámetro
`contour_lift` de `build_art.py`. Bajar la densidad en cambio deja
peladas.

**Y la misma lección una vuelta más, el 2026-09-12.** La palanca de los
rellenos pesaba por luma (`toward * luma/255`), o sea que mezclaba más
fuerte los rellenos CLAROS. Sobre un suelo claro eso está al revés: un
relleno claro ya casi no tiene contraste que entregar, y los oscuros —los
que cargan todo el contraste— eran justo los que la palanca no tocaba.
Medido: subir `toward` de 0,42 a 0,78 movía el barro más ruidoso de 85 a
71, casi nada. Ahora los rellenos mezclan con un `toward` plano y el
mismo barro cae a 19-39.

**Y esto no es sólo de los casos.** El split `isCaseTrail`/`inDetectiveWorld`
(`docs/03` §7, `client/src/levels/world.ts`) hizo que el suelo, la tinta de
barro y el pulpo pasaran a depender de estar EN el mundo, no de llevar una
pista — así que Nivel 3 (`docs/11`) pisa el mismo campo y el mismo corredor
de tierra sin ser un caso: sin pista, sin riel, sin deducción, la medusa es
sencillamente la meta.

Ahí salió un problema nuevo, porque los cuatro desafíos del agua son los
primeros niveles con suelo y sin laberinto a la vez — hasta entonces las dos
cosas siempre habían venido juntas. El corredor de tierra sólo se pintaba
adentro de `{corridor && mazeOn}`, así que el canal les salía en
`CORRIDOR_FILL`, el gris azulado pensado para una hoja sin suelo, y lo único
que marcaba el camino era la ausencia de pasto encima — en un nivel cuya
regla entera es quedarse adentro del canal. El arreglo corre ese bloque a
`mazeOn || ground` y deja el rectángulo sólido sólo para el laberinto: un
nivel con suelo y sin laberinto también recibe `CORRIDOR_EARTH`, la misma
tierra pisada de los rastros, y conserva su línea de forma.

## 8. Tipografía: Nunito

Hasta el 2026-09-11 la app **no declaraba ninguna tipografía**. Ni una
`font-family` en todo el repo, ni un `@font-face`, nada en el
`index.html`. Todo el texto salía con la fuente por defecto del
navegador, o sea Times New Roman en buena parte de los dispositivos, y
una cara distinta en cada uno.

Va **Nunito**, y la razón sale de la sección 1: la dirección pide
*"puntas redondeadas"* en todo el trazo, y Nunito tiene terminaciones
redondeadas. Es la misma regla aplicada a la letra.

- Archivo local en `client/public/fonts/nunito.woff2`. Variable, 35 KB,
  un solo archivo cubre de peso 400 a 900. Sin CDN, sin pedido de red,
  funciona offline.
- Se declara en `client/index.html`, no en `LAYOUT_CSS`. `LevelMap` y
  `MainScreen` usan estilos inline y nunca ven `LAYOUT_CSS`; la raíz del
  documento es el único lugar que las alcanza a todas.
- **La palabra "PISTAS" del riel es texto tipografiado real, no una imagen**
  (D6 enmendada por `case-registry-and-captions`; la decisión original — seis
  polilíneas dibujadas a mano, cuatro tests fijando su geometría — quedó
  obsoleta en cuanto la app declaró Nunito en la raíz del documento, §8 más
  arriba). Lo que D6 protege ahora no es "nunca texto": es que **ningún texto
  aparezca solo**. `PISTAS` puede ser un `<div className="pistas-word">`
  porque el propio riel (`pistas-bar`) siempre trae también las imágenes del
  farol y de cada pista rasterizada al lado — la palabra nunca es la única
  portadora de sentido en ese contenedor. Esa regla es código, no
  convención: `client/src/detective/captionAudit.ts` la audita
  (`CAPTION_CONTAINERS`, `auditCaptions`) y `client/src/detective/
  CaptionedArt.tsx` es el único componente que puede crear un par
  imagen+palabra fuera del riel, con `label: string` obligatorio a nivel de
  tipo. Ver `client/src/detective/PistasRail.tsx`'s propio comentario de
  módulo para el detalle de la transición.

---

## 9. El bloque de estilo (pegar TAL CUAL en el generador)

*Esta sección faltaba y esa ausencia fue un error con consecuencias. Entre
el 2026-09-10 y el 2026-09-12 el estilo sólo existía descrito en prosa
acá arriba, así que cada vez que se generaba un asset había que
reconstruir el prompt de memoria — y derivaba. La prosa es para entender
por qué; **esto es lo que se pega**. Si cambia el estilo, cambia acá.*

Va en inglés a propósito: los modelos de imagen rinden bastante mejor.

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

Plain white background, object centred and isolated, nothing else in
the image.
```

Después del bloque va **una sola línea** describiendo el objeto y su
color de relleno en hex. Ejemplo completo:

```
<bloque de estilo>

A single feather, seen from the side, pointing UP. Fill #2f6b5c.
```

### Reglas que se pegan junto al objeto

- **Las marcas de pista apuntan hacia ARRIBA.** El motor las rota para
  seguir la tangente del camino y asume que el "adelante" del dibujo es
  hacia arriba. Si vienen acostadas, salen todas torcidas.
- **Las huellas se piden en par**, izquierda y derecha espejada. La
  alternancia es lo que hace que un rastro se lea como "alguien caminó
  por acá"; la forma sola no alcanza (sección 5).
- **Cada pista se pide dos veces**, una con su color ganado y otra en
  `#838383`. El pipeline recolorea igual, pero la forma tiene que
  funcionar en los dos estados.
- Los animales llevan **el origen en las patas** y todos la misma
  altura, así se paran sobre la misma línea de suelo.

### Checklist para rechazar en cinco segundos

Antes de meter un asset al pipeline, mirá sólo esto:

1. **¿El contorno es gris/negro neutro?** Si tira a azul o a verde, se
   rechaza. Es el error que más veces se repitió.
2. **¿La línea tiembla?** Si es una curva perfectamente lisa, es vector,
   no marcador.
3. **¿El relleno se pasa de la línea en algún lado?** Si calza perfecto,
   es vector.
4. **¿Se entiende a 24 píxeles?** Achicalo y miralo. Las marcas se
   dibujan a 20-30 unidades, no al tamaño de la lámina.
5. **¿Aguanta repetido?** Pegalo unas treinta veces en fila. Es la
   prueba que más assets reprueba (sección 5).
