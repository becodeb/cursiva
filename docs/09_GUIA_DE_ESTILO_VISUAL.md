# Guía de Estilo Visual

Decidida el 2026-09-10. Rige todo lo visual del juego: assets, UI y
pantallas. Si algo nuevo no cumple esto, no entra.

---

## 1. La dirección: marcador grueso

Todo está dibujado con un marcador grueso.

- **Contorno negro parejo**, del mismo grosor en todo el dibujo, con
  puntas redondeadas. No hay línea fina ni línea que se afine.
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
| Tinta / contorno | `#1e293b` |
| Pista apagada | `#c8cdd2` |
| Gotita de agua | `#3f6f8f` |
| Grano de maíz | `#b8912f` |
| Huella | `#000000` |
| Pluma | `#2f6b5c` |
| Lamparita encendida | `#f2d377` |

**El color es la recompensa.** Una marca sólo toma color cuando el chico
la recoge. La huella es la excepción y va a negro, no a un color, porque
una huella en la tierra no tiene color propio.

**El arte se recolorea a estos valores, no se aproxima.** Lo dibujado
venía cerca pero no igual —la gota en `#3090c0` contra `POND #3f6f8f`, el
maíz en `#d89018` contra `KERNEL #b8912f`—, y no es una diferencia de
redondeo: `palette.test.ts` afirma bandas de matiz y croma contra
`GOAL_COLOR` y `HAZARD_COLOR` que los valores crudos no cumplen. El
recoloreo vive en una tabla auditable de `build_art.py`, no en un editor
de imágenes.

**Tres excepciones, y sus razones.**

1. **Los cuatro animales** conservan su color dibujado. En la pantalla de
   deducción el animal ES la respuesta; ahí el color no decora, informa.
2. **El pulpo y la lupa** conservan el suyo. Son la presencia del chico
   en el mundo, lo único vivo en pantalla, y están siempre visibles.
3. **El suelo tiene color, pero apagado.** Ver sección 7.

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

**Y una trampa que costó una iteración:** apagar sólo los rellenos no
alcanza. El contorno dibujado del pasto viene en `#19241c`, a un pelo de
la tinta `#1e293b`. Con ~130 matas contra ~35 pistas, el ojo se iba al
pasto y no al camino. Los contornos del suelo necesitan su propia
palanca, más dura que la de los rellenos — es el parámetro
`contour_lift` de `build_art.py`. Bajar la densidad en cambio deja
peladas.

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
- **La palabra "PISTAS" del riel no es tipografía y no debe serlo.** Son
  polilíneas dibujadas a mano, es una decisión tomada (D6), y hay cuatro
  tests que fijan su geometría.
