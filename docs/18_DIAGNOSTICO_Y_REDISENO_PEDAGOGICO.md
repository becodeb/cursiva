# 18 — Diagnóstico jugando como un chico de primer grado, y el rediseño que sale de ahí

Escrito el 2026-09-22 después de jugar la app entera desde cero (almacenamiento
vacío) en Chromium real, con gestos de puntero, a 1280×720, 1024×768 y 844×390.
**Este documento manda sobre `12`, `13` y `16` en lo que los contradiga**: el
flujo entre niveles, el orden de la entrada, qué es una pista y cómo se recupera
un animal.

Tres cosas para leer primero:

1. **Qué está roto y qué se arregla en código** → §1 (tabla) y §5 (estado).
2. **La historia propuesta** → §4. Es una propuesta: el guion es de la autora.
3. **Qué hay que pedirle a ChatGPT** → §6. Cada pedido está listo para pegar.

Evidencia: `capturas/2026-09-22-diagnostico/` (antes) y
`capturas/2026-09-22-despues/` (después). Las tareas de implementación y sus
commits: `odd/tasks/adventure-flow-and-map-guidance.md`.

---

## 1. En 30 segundos

Un chico de 6 años hoy **no entiende la historia, no sabe a dónde ir, repite
niveles y vuelve al mapa todo el tiempo**. Cinco causas explican casi todo:

| # | Qué vive el chico | Causa | Qué se hace |
|---|---|---|---|
| 1 | Termina un nivel y vuelve al mapa, toca el mismo lugar, juega el siguiente, vuelve al mapa… | `resolveNextAction` sale al mapa después de **cualquier** nivel de un sector | La aventura se juega de corrido; el mapa aparece al final (T2) |
| 2 | Limpia el mismo vidrio dos veces, barre la misma arena dos veces | La entrada son 4 recintos × 2 niveles con el mismo dibujo y el mismo gesto | Un nivel por recinto (T1) |
| 3 | No sabe a dónde ir en el mapa; el globo tapa cosas | Nada destaca el destino; el globo está fijo arriba y en celular se corta | Foco sobre el destino, lo demás en penumbra; globo que no tapa el destino y se cierra (T4) |
| 4 | "PISTAS" y una lamparita no le dicen nada; los animales "no se juntan" | La pista no lleva a nada visible; el animal aparece callado en el mapa 4 niveles después | La barra pasa a ser "cuánto falta para encontrar al animal"; cierre con el rescate (T6, T8) |
| 5 | No lee: se pierde todo lo que dice el Pulpito | Todo el relato es texto | Voz del narrador en cada bocadillo (T7) |

Más los defectos de pantalla que marcaste: la hoja que se achica al terminar
(de 592 a 522 px de alto a 1280×720, medido), y el cartel del recinto flotando
sobre el dibujo.

---

## 2. Diagnóstico completo

Severidad: **alta** = rompe la comprensión o el flujo; **media** = molesta o
confunde; **baja** = prolijidad. La columna "Va en" dice qué tarea lo arregla o
si es arte/guion.

### Prólogo y pantallas de diálogo

| ID | Qué pasa | Sev. | Va en |
|---|---|---|---|
| D1 | Todo el relato es texto. Un chico de primer grado no lee con fluidez: sin voz no se entera de la historia ni de la consigna | alta | T7 ✅ |
| D2 | Prólogo y entradas conservan el margen de 8 px del navegador: marco blanco y la página scrollea 16 px (`antes-01`) | baja | T3 ✅ |
| D3 | El Pulpito aparece dos veces en la primera lámina (chiquito adentro del globo y grande abajo) | baja | arte/decisión (pendiente) |

### Mapa

| ID | Qué pasa | Sev. | Va en |
|---|---|---|---|
| D4 | El globo ocupa la parte de arriba del mapa; a 844×390 queda cortado (su borde superior a −33 px, `antes-10`); dice siempre lo mismo | alta | T4 ✅ |
| D5 | Nada marca el lugar al que hay que ir: el sector es un botón invisible y las huellas son chicas | alta | T4 ✅ |
| D6 | Las huellas del Pulpito (`huella pulpo.png`) se leen como un semáforo, no como pisadas | media | arte A1 |
| D7 | A 1024×768 el mapa queda pegado arriba y abajo sobra una franja verde vacía de 148 px (`antes-12`) | media | T4 ✅ |
| D8 | El botón "Reiniciar progreso (dev)" pisa el contador de estrellas (solo en modo dev) | baja | T4 ✅ |
| D9 | Arriba al centro asoma un pico nevado entre dos nubes de niebla y parece un pedazo suelto del globo | baja | registro de niebla |
| D10 | Tocar un sector terminado vuelve a jugar su **último** nivel: en la entrada, el barro + huellas + lupa otra vez | media | T4 ✅ |

### Entrada (los cuatro recintos)

| ID | Qué pasa | Sev. | Va en |
|---|---|---|---|
| D11 | Cada recinto se juega dos veces seguidas con el mismo dibujo: 8 niveles que son 4 gestos repetidos | alta | T1 ✅ |
| D12 | Después de cada nivel se vuelve al mapa | alta | T2 ✅ |
| D13 | Al aparecer "¡Vidrio limpio!" la hoja se achica 70 px (`antes-03` vs `antes-04`) | alta | T3 ✅ |
| D14 | El cartel del recinto flota arriba a la izquierda sobre el dibujo y tapa niebla que hay que limpiar (`antes-13`) | media | T5 ✅ |
| D15 | El barro del sendero es un rectángulo marrón plano (`antes-05`) y al terminar dice "¡Vidrio limpio!" | media | T3 ✅ (frase) · P13 (dibujo, pendiente) |
| D16 | El fondo renovado de la pecera es un hall de vidrio sin algas ni cofre, pero el cierre dice "¡Las algas, el cofre, las piedras…!" y la entrada muestra un cofre | media | arte A2 |
| D17 | El fondo del sendero conserva el estilo viejo y una franja vacía en el medio | media | arte A3 |
| D18 | La promesa del prólogo no se cumple: faltan peces, tortugas y monos, pero después se busca un pato, ovejas, llamas… y a los primeros nunca se los encuentra | alta | guion §4.5 |

### Niveles de trazo

| ID | Qué pasa | Sev. | Va en |
|---|---|---|---|
| D19 | "PISTAS" es una palabra (no la lee) y la lamparita significa "idea", no "animal". Solo existe en los patos | alta | T6 ✅ |
| D20 | La meta de ovejas, llamas, delfines y víboras es un rombo abstracto (`antes-07`) | media | T6 ✅ |
| D21 | Al terminar un tramo no hay festejo: solo cambia de color un botón chico abajo | media | T3 + T6 ✅ |
| D22 | A 844×390 la barra de PISTAS se come el alto y la hoja queda en 383×230 (`antes-11`) | media | T6 ✅ (la barra pasó a la fila de arriba) |
| D23 | En `snake1` el Pulpito tapa la cabeza de la primera víbora | baja | pendiente |
| D24 | Abeja: sin demo ni consigna; flor gris; no se entiende qué hacer | media | T7 ✅ (consigna hablada) · P5 (demo, pendiente) |
| D25 | Noche: lo que se encuentra son cofres, sin relación con los animales ni con el erizo | media | guion §4.6 + arte A5 |
| D26 | Erizo: puntos grises alrededor del cuerpo, sin consigna | media | T7 ✅ |

### Cierres y animales

| ID | Qué pasa | Sev. | Va en |
|---|---|---|---|
| D27 | Recuperar un animal no tiene momento: vuelve al mapa y el animal ya está ahí, sin que nadie lo diga | alta | T8 ✅ |
| D28 | Al volver, el mapa no cuenta qué cambió (animal nuevo, sector nuevo) | media | T4 + T8 ✅ |
| D29 | La segunda estrella de cada nivel pide repetirlo (2 aprobaciones) sin que el chico sepa por qué | baja | pendiente P7 |

---

## 3. Qué hacen las apps que pagan los colegios (y qué implica acá)

No es una auditoría de esas apps: son los patrones públicos de diseño que
explican por qué funcionan con chicos que todavía no leen.

| Principio | Cómo lo resuelven | Qué implica para cursiva |
|---|---|---|
| **Todo se escucha** | Matific: todo diálogo tiene audio para que el que no lee escuche la consigna; de K a 2º grado se reproduce solo, de 3º en adelante al tocar [1] | Narrador en cada bocadillo, con botón para repetir (T7). Más adelante, voz grabada |
| **La app decide lo que sigue** | Matific (Isla de la Aventura) asigna la próxima actividad según el desempeño [2]. Glifing entrena en sesiones cortas y sistemáticas, 10–20 min por chico en la escuela [3] | El mapa muestra **un** lugar; la aventura se juega de corrido (T2, T4). Una aventura ≈ 4 tramos ≈ 5–8 min: una sesión natural |
| **Una sola acción obvia** | El nodo actual rebota; lo demás se ve pero no compite | Foco sobre el destino, penumbra en el resto, botón de "jugar" encima (T4) |
| **Mostrar antes de pedir** | En apps de caligrafía (LetterSchool, por ejemplo) la letra se anima antes de que el chico la trace | La demo ya existe en los caminos; falta en abeja y noche (P5) |
| **Cada trazo tiene un porqué** | El trazo termina en algo que el chico quiere: completar una figura, rescatar a alguien | Seguir las huellas **del animal** para encontrarlo (§4) |
| **Pistas que se juntan hacia algo** | En *Blue's Clues* los chicos juntan tres pistas y después deducen; el formato funciona desde preescolar | La barra de pistas muestra al animal que se está buscando y se llena hasta encontrarlo (T6) |
| **Colección visible** | Figuritas, stickers, el mundo que se llena | El animal vuelve a su recinto; álbum de animales con siluetas de los que faltan (P2) |
| **Repetición variada, nunca idéntica** | El mismo patrón motor en otro dibujo, otro personaje | Nunca el mismo dibujo dos veces seguidas (T1) |
| **El error no castiga** | Volver a empezar sin penalidad | Ya está (`docs/01` §5). Se mantiene |

---

## 4. La historia propuesta

### 4.1 En una frase

> Los animales del zoológico se escaparon de noche. El Pulpito, que los cuida,
> sigue sus huellas con la lupa —y con tu dedo— para encontrarlos uno por uno
> y traerlos de vuelta a casa.

Todo lo que el chico traza es **el camino que hizo un animal**. Por eso traza:
no "seguí la línea porque sí", sino "seguí al pato, que se fue por acá".

### 4.2 Por qué la de hoy no se entiende a los 6 años

1. La consigna llega por escrito (D1).
2. La pista es una palabra y una lamparita (D19): no dice *de quién* ni *para qué*.
3. Al final de un camino no pasa nada que se vea: se prende una lamparita.
4. La entrada del pato ya dice "El pato se fue por la laguna": no hay nada que
   deducir, así que las pistas no pueden servir para deducir. **Tienen que
   servir para acercarse.**
5. El prólogo promete peces, tortugas y monos, y nunca aparecen (D18).

### 4.3 El bucle de cada aventura (la regla que ordena todo)

| Momento | Qué ve y escucha el chico | Estado |
|---|---|---|
| **Entrada** | El recinto vacío y el Pulpito: "¡El pato no está! Mirá: dejó huellas. ¿Las seguimos?" | hecho (texto y voz) |
| **Demo** | La línea recorre el camino. "Mirá cómo va… ¡ahora vos!" | existe; la consigna se escucha (T7) |
| **Tramos 1…N−1** | Cada nivel es un pedazo del camino del animal. Al final hay una **pista** (pluma, miga, burbuja…). Al llegar, la pista vuela a la barra de arriba. "¡Una pluma! Pasó por acá. ¡Sigamos!" — y el tramo siguiente arranca sin pasar por el mapa | hecho (T2, T6) |
| **Encuentro** | El último tramo termina en el animal | hecho: silueta en la barra y el animal como meta del último tramo (T6) |
| **Cierre** | Festejo corto con el animal grande: "¡Encontramos al pato! Ya está en su laguna." | hecho (T8) |
| **Mapa** | El pato está en su laguna, se levanta la niebla del próximo sector y el foco apunta ahí | foco hecho (T4); falta la animación de llegada (P6) |

### 4.4 Qué es una pista

**Para el chico: "algo que el animal dejó al pasar".** Se junta al final de
cada tramo. Cuantas más juntás, más cerca estás. La barra de arriba muestra las
pistas juntadas y, al final, **la silueta del animal que estamos buscando**.
Cuando se llena, lo encontrás.

Deja de ser una palabra ("PISTAS") y una lamparita. Pasa a ser una barra de
progreso que el chico lee sin leer.

| Animal | Patrón que entrena | Pistas propuestas (una por tramo) | Arte |
|---|---|---|---|
| Pato | ondas, continuidad | huella palmeada, miga de pan, burbuja, pluma | existe |
| Ovejas | montañitas (subir y bajar corto) | mechón de lana, cencerro, huella de pezuña | pedir (A4) |
| Llama | picos altos | borla de colores, huella, pasto mordido | pedir (A4) |
| Víboras | onda sostenida | piel mudada, rastro en la arena | pedir (A4) |
| Abeja | trazo libre con puntos de paso | gota de miel, polen, pétalo | pedir (A4) |
| Delfines | zigzag con cámara | salpicadura, pelota, burbuja | parcial |
| Erizo | trazos radiales sueltos | manzana, hoja, hongo | parcial (hoja) |

Mientras no haya arte, la barra usa una estrella por tramo: se entiende igual
("uno hecho, faltan tres") y la silueta del animal al final da el sentido.

### 4.5 Cumplir la promesa del prólogo: peces, tortugas y monos

El prólogo muestra tres recintos vacíos con cartel. Un chico de 6 años se acuerda
de eso y va a preguntar por ellos. Propuesta: que esos tres sean aventuras
futuras que **además cubren patrones que la cursiva necesita y hoy faltan**:

| Animal | Dónde | Patrón | La letra que prepara | Contenido que ya existe |
|---|---|---|---|---|
| **Peces** | estanque | guirnaldas en U | `u`, `w`, las uniones entre letras | los cuatro niveles de medusa (`f2-guirnalda`, `f2-agua2..4`) ya están en el estanque **sin aventura ni historia**; hay `pez.png` |
| **Monos** | bosque | bucles (rulos) que suben | familia Rulo: `e`, `l`, `b`, `h`, `k`, `f` (`docs/01` §8) | `f2-bucles` existe en el catálogo sin usar |
| **Tortugas** | arena | óvalos antihorarios | familia Ola: `c`, `a`, `d`, `g`, `q`, `o` | hay `tortuga.png`; faltan niveles |

Los bucles son el hueco más importante: sin ellos no hay `l` ni `e`. Y los monos
colgados de lianas **son** bucles; no hace falta explicar nada.

### 4.6 La noche

Hoy la linterna encuentra cofres (D25). Propuesta: de noche se buscan **las
cosas del erizo** (manzana, hoja, hongo), y la última linterna lo encuentra a
él hecho bolita. Así la noche prepara la aventura del erizo en vez de ser un
juego suelto. Requiere arte (A5).

### 4.7 Recuperar un animal se tiene que ver

1. **Cierre con el rescate** (T8): el animal grande en el bocadillo y su frase
   de cierre, que ya existía en el registro pero solo aparecía a veces en el
   mapa.
2. **Llegada en el mapa** (P6): el animal entra a su recinto con un saltito la
   primera vez que se lo ve.
3. **Álbum de animales** (P2): una página tipo álbum de figuritas con todos los
   animales del zoológico —los encontrados a color, los que faltan en silueta
   con "¿Dónde estará?"— incluidos peces, tortugas y monos. Se abre desde la
   mochila. Es la meta larga que hoy no existe: el chico ve cuánto le falta.

Las estrellas siguen siendo el puntaje de cada nivel, separadas de los animales
(`docs/12` §1).

### 4.8 Arco opcional: ¿quién abrió las puertas?

Un misterio que atraviese todo el juego engancha (es lo que hace que un chico
quiera "el próximo capítulo"). Idea: en cada rescate aparece, además, una pista
de quién dejó las puertas abiertas; al final, la pantalla de deducción que ya
existe (`screen/Deduction.tsx`) pregunta "¿Quién fue?" entre tres sospechosos, y
resulta ser alguien simpático que quería jugar con todos. **Recomendación:
diferirlo** hasta probar el bucle básico con chicos reales. Es más guion, no más
mecánica.

---

## 5. Qué se implementa en esta rama

Rama `feat/adventure-flow-and-map-guidance`. El detalle de cada tarea, sus
criterios y sus commits está en `odd/tasks/adventure-flow-and-map-guidance.md`.

| Tarea | Arregla | Commit | Estado |
|---|---|---|---|
| T1 — Un nivel por recinto en la entrada (`glass1`, `sand1`, `glass3`, `sand3`; los otros cuatro ids quedan en el catálogo) | D11 | `99dd8ad` | hecho |
| T2 — La aventura se juega de corrido; el mapa al final. Una aventura sin animal encadena con la siguiente de su sector (el prólogo entero sin mapa; noche → erizo) | D12, 1 | `99dd8ad`, `a2caf27` | hecho |
| T3 — La hoja no se achica (el resultado es un cartelito encima de la hoja); sin margen de 8 px; "¡Sendero limpio!" en el barro; "Siguiente" verde que late | D2, D13, D15 (frase), D21 | `caa1b00`, `308f516` | hecho |
| T4 — Mapa: foco sobre el próximo lugar (el resto en penumbra, anillo y botón de jugar), globo que no lo tapa, se cierra solo o al tocarlo y vuelve tocando al Pulpito; escenario 5:3 centrado; HUD en píldoras; un sector terminado se rejuega desde el principio | D4, D5, D7, D8, D10 | `c4296a2` | hecho |
| T5 — El cartel del recinto sale del dibujo: va en la fila del botón de volver | D14 | `caa1b00` | hecho |
| T6 — La barra de pistas pasa a ser "cuánto falta para el animal": un casillero por tramo y la silueta del animal; cada camino termina en su pista, una estrella o el animal | D19, D20, D22 | `68663c6` | hecho |
| T7 — Narrador con voz en todas las pantallas, botón "Escuchar" y silenciador persistente | D1, D24 (consigna), D26 | `83a9250` | hecho |
| T8 — Cierre con rescate para cada animal (y la linterna para la noche); el globo del mapa deja de repetir rescates viejos | D27, D28 | `3a25097` | hecho |
| Extra — `lang="es-AR"` y favicon del Pulpito (el 404 de cada carga) | — | `7fcd395` | hecho |

### Resultado, medido

| Qué | Antes | Después |
|---|---|---|
| Veces que se vuelve al mapa en el prólogo | 8 | 0 (el mapa vuelve al final) |
| Niveles por visita al mapa (recorrido real desde cero) | `[0,1,1,1,1,1,1,1,1…]` | `[0,4,4,4,4]` |
| Hoja de `glass1` a 1280×720 al terminar | 1252×592 → 1252×522 | 1252×592 → 1252×592 |
| Hoja del pato a 1280×720 | 1252×508 (la barra de PISTAS ocupaba una fila) | 1252×592 |
| Borde superior del globo del mapa a 844×390 | −33 px (cortado) | dentro de pantalla en los 10 estados probados |
| Tests | 82 archivos / 1939 | 86 archivos / 2065; e2e 33/33 |

Las capturas de a pares están en `capturas/2026-09-22-diagnostico/antes-*` y
`capturas/2026-09-22-despues/despues-*` (mismo número = mismo estado).

**Qué se contradice con los documentos anteriores** (y manda este):

- `docs/12` §3 "Volver de un nivel cae en el mapa" → ahora se vuelve al mapa al
  terminar la **aventura**.
- `docs/16` §9 y la spec `zoo-map` ("entrada's Level Ids… Play in Narrative
  Order", 8 ids) → la entrada juega 4 ids. Los otros 4 siguen en el catálogo
  (son claves guardadas) y se alcanzan solo por `?nivel=`.
- `docs/16`: el estanque abría con `sand4` → ahora con `sand3` (o `sand4`, para
  no cerrarle el estanque a quien ya lo tenía abierto).
- Las specs de OpenSpec no se tocaron (su reparación es U15.1, diferida): quedan
  desactualizadas en estos tres puntos.

---

## 6. Pedidos de arte para ChatGPT

Cómo pedir: igual que `docs/17`. **Cada pedido empieza con el bloque de estilo
literal de `docs/09` §9** (para fondos, la variante de fondos), y después va la
línea del objeto. Recortes: 1024×1024 con fondo transparente. Fondos: 1536×1024,
opacos. Al volver, medir el "alpha fantasma" (`docs/17` §3 bis) antes de meterlo
al pipeline, y pasar el checklist de cinco segundos (`docs/09` §9).

| Pedido | Archivo en `art-source/` | Arregla | Prioridad |
|---|---|---|---|
| A1 | `huella pulpo.png` (reemplazo) | D6 | alta |
| A2 | `fondo pecera.png` (versión renovada) | D16 | alta |
| A3 | `fondo sendero.png` (versión renovada) | D17 | media |
| A4 | pistas por animal (lámina) | §4.4 | media |
| A5 | cosas del erizo para la noche (lámina) | D25, §4.6 | baja |

### A1 — Huella del Pulpito (el rastro del mapa)

Hoy es un poroto negro con tres agujeros: parece un semáforo. Tiene que leerse
como "alguien caminó por acá" a 36 unidades de alto, repetida 8–10 veces.

```
<bloque de estilo de docs/09 §9>

A pair of footprints left by a small cartoon octopus walking on sand:
each print is a round blob made of three suction-cup circles in a
curved row, like a tiny paw. Draw the LEFT print and, separated, the
same print MIRRORED as the RIGHT one, both pointing UP. Fill #3a2a22.
```

Se recorta en dos archivos (`huella pulpo.png` izquierda y su espejo). Probarla
repetida sobre el mapa antes de aprobarla (`docs/09` §5).

### A2 — Fondo de la pecera, en el estilo renovado

El guion (`docs/16` §4) dice que detrás del vidrio aparecen **algas, un cofre y
piedras**, y la entrada del recinto muestra el cofre. El fondo actual
(`fondo entrada vidrio.png`) es un hall de vidrio sin nada de eso. O se pide
esta lámina, o se cambia la frase de cierre; recomiendo la lámina.

**Ojo con el formato:** A2 y A3 son fondos *de revelado* (la escena completa
que queda detrás del vidrio o del barro), como los cuatro renovados del
2026-09-20. No llevan la franja de suelo plano de la "variante para fondos" de
`docs/09` §9 (esa es para los caminos). Se piden igual que se pidieron esos
cuatro: **adjuntando uno de ellos como referencia de estilo** (por ejemplo
`art-source/fondo recinto monos.png`), 1536×1024, opaco.

```
Match the drawing style, line weight and colour palette of the attached
reference image exactly. Landscape 3:2 (1536x1024), full-bleed, opaque.

The inside of a big aquarium seen from the front: water fills the
scene, green algae along the bottom, grey rounded stones, one small
closed wooden treasure chest half buried in the sand, a few bubbles.
No fish, no animals, no characters, no text.
```

### A3 — Fondo del sendero, en el estilo renovado

Mismo formato que A2 (fondo de revelado, con referencia adjunta).

```
Match the drawing style, line weight and colour palette of the attached
reference image exactly. Landscape 3:2 (1536x1024), full-bleed, opaque.

A zoo footpath between low wooden fences, trees and bushes, seen from
the front, in daylight. The path itself is clean packed earth. No mud,
no footprints, no animals, no people, no text.
```

### A4 — Pistas por animal (una lámina por animal)

Reglas de `docs/09` §9: cada pista apunta **hacia arriba**, se pide dos veces
(color ganado y `#838383` apagado), y tiene que entenderse a 24 px.

```
<bloque de estilo de docs/09 §9>

Three separate small objects in a row, each pointing UP, evenly spaced:
(1) a tuft of white sheep wool, fill #f4f1e8; (2) a small round cow
bell with a strap, fill #d9a441; (3) a sheep hoof print (two ovals),
fill #3a2a22.
```

Repetir con: llama (borla de colores `#d6455d`, huella de dos óvalos, mata de
pasto mordida `#6b8f3a`); víbora (piel mudada enrollada `#c9c1a3`, rastro
ondulado en la arena `#b08a5a`); abeja (gota de miel `#e8a317`, bolita de polen
`#f2d24b`, pétalo `#f29ab5`); delfín (salpicadura `#7fc3e8`, pelota a rayas
`#e84a3c`); erizo (manzana `#d94436`, hongo `#c9a27e`).

### A5 — Las cosas del erizo (noche)

```
<bloque de estilo de docs/09 §9>

Three separate small objects in a row: a red apple with one leaf, a
brown mushroom, and a small hedgehog curled into a ball seen from the
side. Fills #d94436, #c9a27e, #9c7a5b.
```

---

## 7. Lo que queda para seguir (en orden)

Actualizado al cerrar la rama (2026-09-23). Lo que dice "hecho" arriba no se
repite acá.

| ID | Qué | Por qué importa | Tipo |
|---|---|---|---|
| P1 | Decidir el guion de §4 (sobre todo §4.4 y §4.5) | Todo lo demás cuelga de eso | autora |
| P10 | Arte A1–A5 (§6). El más visible es A1: las huellas del mapa siguen pareciendo semáforos | El foco ya guía; las huellas todavía no se leen como pisadas | arte |
| P2 | Álbum de animales (§4.7.3): la página con todos los animales, en silueta los que faltan (incluidos peces, tortugas y monos) | La meta larga; hace visible "juntar animales" | código + arte |
| P9 | Aventuras de peces (reusar los niveles de medusa), monos (bucles) y tortugas (óvalos) — §4.5 | Cumple la promesa del prólogo y cubre los patrones que faltan para la cursiva | guion + código + arte |
| P5 | Demo animada en abeja y noche (D24). La consigna ya se escucha; falta que se vea | Mostrar antes de pedir | código |
| P6 | Llegada del animal al mapa con un saltito, la primera vez | "Recuperar" se ve también en el mapa, no solo en el cierre | código |
| P8 | Voz grabada: `client/src/voice/narrator.ts` ya busca primero un clip por frase (`VOICE_CLIPS`); falta grabar y registrar los archivos | La voz del navegador es genérica y cambia según el dispositivo | audio |
| P13 | Barro dibujado por código, como la arena y las hojas (`canvas/RevealLayer.tsx`), en vez de un rectángulo plano. No se pide como imagen: una textura necesitaría `<pattern>` + `url(#…)`, prohibido en este repo | D15 | código |
| P7 | Explicar o sacar la segunda estrella (D29) | Hoy pide repetir sin decir por qué | decisión |
| P11 | Actualizar las specs de OpenSpec (entrada de 4 ids, flujo por aventura, cierres de rescate, mapa con foco) | Hoy contradicen el código | U15.1 |
| P12 | Probar en tablet real con chicos | Nadie lo hizo todavía (`docs/00` §3) | prueba |

**Encontrado durante la implementación, sin arreglar todavía:**

| ID | Qué | Tipo |
|---|---|---|
| N1 | El globo del mapa esquiva el lugar destacado, pero puede tapar un animal ya rescatado de otro sector (por ejemplo el pato, cuando el foco está en el bosque). Se cierra solo a los 10 s o al tocarlo | diseño |
| N2 | En el mapa, el erizo rescatado se dibuja muy grande sobre la zona nocturna (tamaño 90 en `zoo/sectors.ts`) | registro |
| N3 | En `snake1` el Pulpito de inicio tapa la cabeza de la primera víbora (D23) | código |
| N4 | El botón verde de jugar del mapa queda encima del pato cuando el foco está en la laguna | registro |
| N5 | La silueta de las víboras en la barra de camino es muy ancha (el dibujo de la víbora es 4:1) | arte/código |
| N6 | En desarrollo cada frase se dice dos veces seguidas: es el modo estricto de React montando los efectos dos veces; el `cancel()` corta la primera. En producción pasa una sola vez | ninguno |
| N7 | La suite e2e (`npm run test:e2e -w client`) asume el Chromium de Playwright, que en esta Raspberry (ARM) no existe. Para correrla acá hace falta una config local con `executablePath: '/usr/bin/chromium'` (no está commiteada) | entorno |

## 8. Cómo mirar

```bash
npm test && npm run build
npm run dev -w client -- --host 0.0.0.0 --port 5178 --strictPort
```

Se puede jugar desde otra compu de la red en `http://<ip-de-la-raspberry>:5178/`.
Para empezar de cero, borrar `cursiva.levels.v1` del localStorage (o el botón
"Reiniciar progreso" con `?dev`).

Las capturas de esta revisión se sacaron con Playwright manejando el Chromium
del sistema (`executablePath: /usr/bin/chromium`); los scripts de prueba son
descartables y no viven en el repo.

---

## Fuentes

1. Matific Help — *Autoplay dialogues*:
   https://help.matific.com/hc/en-us/articles/16659133944593-Autoplay-dialogues
2. Matific — *How Matific AI Delivers Personalised Learning on Adventure Island*:
   https://www.matific.com/nz/en-nz/home/blog/2025/12/12/how-matific-ai-delivers-personalised-learning-on-adventure-island/
3. Glifing — *Preguntas frecuentes escuelas*: https://glifing.com/preguntas-frecuentes-escuelas/ ;
   Faros (Hospital Sant Joan de Déu) — *Cómo aprender a leer mejor utilizando el método Glifing*:
   https://faros.hsjdbcn.org/es/articulo/como-aprender-leer-mejor-utilizando-metodo-glifing
