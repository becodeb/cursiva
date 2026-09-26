# 19 — Propuesta: el Pulpito detective, pista por pista

Escrito el 2026-09-26, después de que la autora probó la app en una tablet
(tandas 1 y 2 de `odd/tasks/prewriting-stage-completion.md`). **Es una
propuesta para decidir, no una especificación.** No se implementa nada hasta
que la autora la apruebe. Las decisiones que solo ella puede tomar están
juntas en la §8.

Si se aprueba, reemplaza a `docs/18` §4.3–§4.7 en el bucle de cada aventura,
qué es una pista y cómo se recupera un animal. Los pedidos de arte que
necesita están en `docs/20_PEDIDOS_DE_ARTE_TANDA_3.md` (los ids `B…`).

Tres cosas para leer primero:

1. **La historia en 30 segundos** → §1.
2. **La regla que ordena cada aventura** → §2.
3. **Qué hay que decidir** → §8.

---

## 1. En 30 segundos

> Una noche alguien dejó las puertas abiertas y los animales del zoológico se
> escaparon. El Pulpito, que los cuida, se pone la lupa y sale a buscarlos.
> En cada lugar encuentra **cosas que un animal dejó al pasar**: huellas,
> plumas, semillas, gotas. El chico las junta siguiendo el camino con el dedo.
> Con las pistas en la mano, el Pulpito pregunta: **"¿Quién dejó todo esto?"**,
> y el chico elige entre tres siluetas.
> Ya sabiendo a quién busca, lo encuentra y **lo junta**: las ovejas en los
> picos, los patitos en las ondas, las víboras que recuperan el color.
> Cada animal rescatado **vuela a su lugar del mapa** y se pega en la libreta
> del detective. Cuando están todos, termina la historia.

Qué cambia respecto de lo que hay hoy:

| Hoy | Propuesta |
|---|---|
| Las pistas se prenden solas a lo largo del camino y la barra ya muestra al animal | Las pistas **se juntan** con el dedo y el animal se **deduce** |
| Salirse del camino puede obligar a rehacer el tramo (el pato lleva `resetOnContact`) | Lo juntado queda juntado; se sigue desde ahí |
| Entrada y cierre en una pantalla de color plano | El Pulpito habla **encima de la escena del nivel** |
| Estrellas por nivel | **Desbloqueos**: el animal vuelve, una figurita en la libreta, una herramienta |
| Fundido entre pantallas | El animal vuela al mapa; la lupa abre y cierra la escena |

**Lo que no cambia**: el patrón motor de cada animal (`docs/13` §2, `docs/18`
§4.4), el prólogo de limpieza, el orden del recorrido (`zoo/journey.ts`), el
final, y los ids de nivel (son claves guardadas: se cambia su contenido, nunca
se borran).

---

## 2. El bucle de cada aventura

### 2.1 La regla

| # | Momento | Qué hace el chico | Qué ve y escucha | Pieza |
|---|---|---|---|---|
| 1 | **Entrada** | Escucha | El recinto vacío y el Pulpito en una esquina: "¡El pato no está! Pero dejó cosas. ¿Las juntamos?" | `AdventureIntro.tsx`, rehecho sobre la escena (§4) |
| 2 | **Pistas** (1–2 niveles) | Traza el camino; al pasar por encima de cada objeto, lo junta | La pista salta y vuela a la barra de arriba. "¡Una pluma! Pasó por acá." | Mecánica nueva: juntar a lo largo del camino (§2.2) |
| 3 | **Deducción** | Toca una de tres siluetas | "¿Quién dejó estas pistas?" Las pistas de la barra bajan al centro. Al acertar, la silueta se pinta y el animal se asoma | `screen/Deduction.tsx`, hoy huérfana, generalizada |
| 4 | **Juntar** (1–2 niveles) | Traza el camino; ahora lo que junta es **el animal** | Los patitos en las ondas, las ovejas en los picos. La barra muestra cuántos faltan | La misma mecánica de §2.2 |
| 5 | **Rescate** | Mira | El animal grande salta, el Pulpito festeja, y el animal **vuela a su lugar del mapa** | `AdventureClosing.tsx` sobre la escena + vuelo (§6) |

La barra de camino (`detective/TrailProgressBar.tsx`) deja de mostrar la
silueta del animal durante las pistas: si ya lo muestra, no hay nada que
deducir. Después de la deducción sí la muestra, porque ahí la pregunta pasa a
ser "cuántos faltan".

### 2.2 Juntar a lo largo del camino

Es la mecánica que sostiene todo lo demás, y no necesita arte nuevo.

1. Sobre la línea hay de 3 a 5 objetos. **El último está al final del camino.**
2. Un objeto se junta cuando el dedo pasa por encima, dentro del corredor.
   Se juntan en orden (el motor ya tiene puntos de control a lo largo de la
   ruta).
3. **Lo juntado queda juntado**, aunque el dedo se salga de la línea. El chico
   sigue desde el último objeto que juntó; no vuelve al principio.
4. El nivel termina cuando se junta el último. Como está al final, el camino
   se recorre entero.
5. La precisión, la continuidad y el ritmo se siguen midiendo por dentro
   (`docs/01` §6), pero no deciden si el nivel "pasa": lo decide juntar todo.

### 2.3 Cómo no se vuelve repetitivo en once aventuras

Si las once aventuras hacen los cinco pasos iguales, el chico se aburre a la
tercera. La propuesta usa **cuatro recetas** que comparten piezas:

| Receta | Pasos | Cuándo se usa |
|---|---|---|
| **A. Caso completo** | pistas → deducción → juntar → rescate | No se sabe de antemano quién fue |
| **B. Rescate directo** | juntar → rescate | El lugar ya dice quién es |
| **C. Devolverle algo** | restaurar → rescate | El animal está, pero le falta algo (el color, las espinas) |
| **D. Llevarlo a casa** | guiar → rescate | El animal está perdido y hay que acompañarlo |

Y cuatro palancas más:

- **Pistas distintas en cada caso.** Nunca el mismo objeto en dos casos.
- **Tres formas de deducir**: siluetas de animales nuevos (pato); siluetas que
  incluyen animales **ya rescatados**, que se descartan solos ("¿El pato? No:
  el pato ya está en su laguna", en la noche); y los **carteles de los
  recintos vacíos del prólogo** (peces: "¿De qué recinto se escaparon?").
- **Nunca dos deducciones seguidas** en el recorrido (ver la columna de abajo).
- **Lo que se junta cambia de forma**: objetos, animales, color, espinas, polen.

El recorrido completo, en el orden de `zoo/journey.ts`:

| # | Aventura | Receta | Deducción | Qué se junta o se restaura |
|---|---|---|---|---|
| 1 | Pato | A | Siluetas: pato, gallina, gato | Pistas; después la familia de patos |
| 2 | Ovejas | B | — | Una oveja por pico |
| 3 | Llamas | B | — | Las llamas en los picos altos, con el gorro de pastor |
| 4 | Noche | A (pistas) | Siluetas: erizo, pato, oveja (dos ya rescatados) | Las cosas del erizo; al final, el erizo |
| 5 | Erizo | C | — | Sus espinas |
| 6 | Víboras | C | — | Su color |
| 7 | Abeja | D | — | El polen de cada flor, y al panal |
| 8 | Peces | A | Carteles: PECES, TORTUGAS, MONOS | Pistas; después los peces |
| 9 | Delfines | B | — | Cada delfín que pasás se suma a la fila |
| 10 | Tortugas | B | — | Cada vuelta hace asomar una tortuga |
| 11 | Monos | A | Siluetas: mono, erizo, abeja | Pistas; después los monos |

Cuatro casos completos en once aventuras, ninguno pegado a otro. La noche y
el erizo son **un solo caso repartido en dos aventuras**: la noche junta las
pistas y encuentra al erizo; el erizo es el rescate.

En una aventura A de cuatro niveles: niveles 1–2 pistas, deducción, niveles
3–4 juntar. La deducción no es un nivel: se guarda como resuelta con la clave
que ya existe para eso (`caseSolvedId` en `detective/cases.ts`,
`<caso>-deduce`).

---

## 3. Sector por sector

Las pistas son objetos que un chico de 6 años reconoce. ✓ = el arte ya existe
(`CLUE_ART` y `SECTOR_ADVENTURE_ART` en `detective/assets.ts`); `B…` = pedido en
`docs/20`.

| Sector | Animal | Receta | Pistas | Patrón que entrena | Qué se junta | Momento de historia |
|---|---|---|---|---|---|---|
| Entrada | (prólogo) | limpieza | — | exploración libre | — | Cuatro recintos vacíos; en el sendero, bajo el barro, **huellas de animales** (B7) |
| Estanque | Pato | A | huella palmeada ✓, pluma ✓, semillas ✓ (redibujo B11), gotas ✓ (redibujo B11) | ondas suaves, continuidad | la familia de patos en las ondas | "El pato salió del agua chorreando: ¡mirá las gotas!" |
| Estanque | Peces | A | burbuja ✓, gota ✓ | guirnaldas en U | un pez en el fondo de cada U | "Burbujas en la laguna… ¿de qué recinto se escaparon?" |
| Estanque | Delfines | B | — | zigzag sostenido | cada delfín que pasás salpica y se suma | "Los delfines no quieren volver: ¡juguemos a pasar entre ellos!" |
| Montañas | Ovejas | B | — | montañitas cortas | una oveja por pico, y una al final | "Las ovejas se subieron a las lomas y no saben bajar." |
| Montañas | Llamas | B | — | picos altos | las llamas de los picos altos | "Me pongo el gorro de pastor. ¡Vamos a las cumbres!" |
| Nocturna | Noche | A | hoja ✓, manzana (B12), hongo (B12) | exploración con linterna | las cosas del erizo; en `night4`, el erizo enroscado ✓ | "De noche salen los que duermen de día." |
| Nocturna | Erizo | C | — | trazos radiales sueltos | sus espinas | "Del susto se hizo bolita. Si le acomodamos las espinas, se anima a salir." |
| Arena | Víboras | C | rastro en la arena (en la entrada, no como pista) | onda sostenida | su color | "Tienen frío y se quedaron grises. Si las acariciamos, se calientan." |
| Arena | Tortugas | B | — | óvalos antihorarios | cada vuelta, una tortuga asoma la cabeza | "Se escondieron en su caparazón. Demos la vuelta a cada una." |
| Bosque | Abeja | D | — | trazo libre con puntos de paso | el polen de cada flor ✓, y al panal ✓ | "La abeja se perdió. Juntemos polen para llevarle a su panal." |
| Bosque | Monos | A | cáscara de banana (B13), banana (B13) | bucles que suben | un mono colgado arriba de cada bucle (B10) | "¡Cáscaras de banana colgando de las lianas!" |

### 3.1 Víboras: el color vuelve al acariciarlas

**Qué pasa hoy.** No hay respuesta de si cada víbora salió bien; el nivel de
arrastrarlas a su lugar no tiene dificultad ni sentido, y no hay historia.

**La historia.** Las víboras tienen la sangre fría (es cierto, y a los chicos
les encanta saberlo). De noche se enfriaron, se quedaron quietitas y **grises**.
"Si las acariciamos de la cabeza a la cola, se calientan y les vuelve el color."

**La mecánica.**

1. Las tres víboras empiezan en gris.
2. Mientras el dedo recorre el cuerpo, **el color avanza con el dedo**: lo que
   ya se acarició está a color, lo que falta sigue gris. Es la mejor respuesta
   posible: el chico ve exactamente por dónde pasó.
3. Si el dedo se sale, **esa** víbora vuelve a gris despacio (un segundo, no de
   golpe). Las que ya están despiertas no se tocan: nada ganado se pierde.
4. Al completar una víbora, se estira (una ondulación) y queda a color.
5. **La seriación sin arrastre**: se despiertan de la más chica a la más
   grande. El Pulpito señala cuál sigue y esa víbora late suave. La
   comparación de tamaños que pedía `docs/13` §2 se conserva; el arrastre se va.

**Qué pasa con cada nivel.** `snake2`, `snake3` y `snake4` pierden el paso de
ordenar (`arrange`); las víboras arrancan en su lugar final. La progresión de
`docs/13` queda: acostadas (`snake1`), tamaños en otro orden (`snake2`: hay que
encontrar la más chica), paradas (`snake3`), camino angosto (`snake4`).

**Cómo se hace sin arte ni filtros.** La versión gris se genera en
`scripts/art/build_art.py` a partir de las tres víboras que ya existen: cada
píxel pasa a su luma (la misma fórmula 601 del repo). Como desaturar conserva
la luma, **la ley de 55 medida sobre el cuerpo sigue valiendo igual**, sin
volver a medir. El color que avanza: la imagen a color encima de la gris,
dentro de un `<svg>` anidado cuyo ancho crece con el avance; un `<svg>` anidado
recorta su contenido por defecto, sin `clipPath` ni `url(#…)`. Si eso no
alcanza, la salida es cortar cada víbora en franjas en `build_art.py`. Los
filtros de SVG están vedados en este repo, así que el gris nunca se hace en
tiempo de ejecución.

### 3.2 La noche: por qué está oscuro y qué se busca

**Qué pasa hoy.** La linterna ya funciona, pero se buscan cofres y piedras que
no tienen que ver con nadie (D25 de `docs/18`).

**La historia.** "De noche salen los animales que duermen de día. Alguien
anduvo por acá…" Lo que se busca con la linterna son **las cosas que dejó el
erizo**:

| Nivel | Qué se encuentra | Arte |
|---|---|---|
| `night1` | una hoja | ✓ `sector-leaf` |
| `night2` | una manzana mordida y otra hoja | B12 |
| `night3` | un hongo y una manzana | B12 |
| — | **Deducción**: "¿Quién come hojas, manzanas y hongos de noche?" Siluetas: erizo, pato, oveja. El pato y la oveja se descartan solos: "¡No! La oveja ya está en su ladera." | siluetas derivadas |
| `night4` | **el erizo, hecho bolita** | ✓ `hedgehog-curled` |

Cada cosa encontrada vuela a la barra, como en los caminos. Mientras no llegue
B12, la manzana y el hongo se reemplazan por la hoja y la piedra que ya hay;
la historia se entiende igual con una hoja.

### 3.3 El erizo: espinas cortas que se ven como espinas

**Qué pasa hoy.** Los trazos no parecen espinas: en `hedgehog1` cada espina
mide lo mismo que el erizo entero (razón 0,98, `docs/13` §4 decisión 10), y la
línea del chico es fina y tiembla. No es intuitivo.

**La propuesta**, en cuatro cambios:

1. **Más espinas y más cortas**: de 8 a 12 por nivel, de 60 a 130 unidades de
   largo (hoy `hedgehog1` pide de 220 a 290).
2. **El trazo se convierte en espina.** Cuando una espina se acepta, la línea
   del chico se reemplaza por una espina dibujada: un triángulo largo, base
   ancha, punta fina, relleno oscuro y contorno de marcador. Se ve como espina
   aunque el trazo haya temblado. Es un path de `M`/`L`, sin arte nuevo.
3. **Las marcas de inicio son espinitas dormidas**: pequeños muñones sobre el
   lomo, no puntos. El chico entiende que tiene que "levantarlas".
4. **Se enrosca y se desenrosca.** `hedgehog1`–`hedgehog2`: el erizo es una bola
   (`hedgehog-curled`, ya existe) y cada espina lo hace moverse un poco.
   Después se asoma: `hedgehog3`–`hedgehog4` son de perfil (`hedgehog-profile`),
   con espinas más cortas y cambios de ritmo a lo largo del lomo. Al terminar,
   camina hasta su lugar: el rescate.

**Lo que choca.** El primer nivel de cada familia está atado a la regla de
amplitud de la fase 1 (`catalog.test.ts`), que obliga a espinas de al menos
180 unidades en `hedgehog1`. Espinas cortas desde el primer nivel piden eximir
a esta familia de esa regla, por escrito. Es la decisión 5 de la §8.

El orden bola → perfil invierte el de hoy. La razón: sobre una bola, todas
las direcciones son iguales, y es el radial más fácil; sobre el lomo, cada
espina tiene su propio ángulo.

### 3.4 Las ovejas: una por pico

Las ovejas ya están paradas en los picos (`vertexArt`). Con §2.2:

1. Al pasar el dedo por cada pico, esa oveja **salta y se junta** (baja a la
   barra, o se pone en fila detrás del Pulpito).
2. Hay una oveja más al final del camino: es la última, y cierra el nivel.
3. Salirse de la línea no hace perder ovejas.

Las llamas usan exactamente lo mismo en los picos altos. Lo que las distingue
es la historia: el Pulpito se pone el **gorro de pastor** antes de subir (§5).

---

## 4. El Pulpito sobre la escena

**Qué pasa hoy.** Después de limpiar o de terminar un camino se salta a una
pantalla de color plano (`AdventureClosing.tsx` pinta `backdrop.quiet` de
fondo) con el pulpo abajo al centro y un globo cuya cola apunta abajo a la
izquierda, no a él.

### 4.1 La regla

1. **Siempre sobre la escena del nivel**: el fondo a pantalla completa, con lo
   que el chico acaba de hacer todavía a la vista. Nunca una pantalla de color
   plano.
2. **En una esquina de abajo.** Arriba están los botones.
3. **Del lado contrario a lo que nombra**, mirando hacia eso. Si dice "este
   lugar está vacío", se para a un costado y el globo queda sobre el recinto.
   Si dice "¡mirá, huellas!", se para lejos de las huellas y las señala.
4. **Nunca tapa** el inicio del camino, la meta ni un objeto por juntar. Se
   eligen igual que el globo del mapa: se prueban las esquinas y gana la
   primera libre (`bubblePlacement` en `zoo/adventures.ts` ya hace esto).
5. **El globo, centrado arriba del pulpo, con la cola abajo al centro** (B8)
   cuando hay alto. En pantallas bajas (menos de ~500 px de alto, como un
   celular acostado), el globo va al costado, hacia el centro, con la cola
   abajo a la izquierda o a la derecha (el globo actual, o su espejo).
6. **Quieto mientras el chico traza.** Dice su frase, se achica a su esquina y
   no se mueve hasta que el nivel termina (`docs/01` §5: nada se mueve
   mientras se traza).

| Qué dice | Dónde se para | Globo |
|---|---|---|
| Entrada ("¡El pato no está!") | La esquina de abajo más lejana al inicio del camino | Arriba de él, sobre el recinto |
| Una pista ("¡Una pluma!") | Donde estaba; la pista vuela a la barra | Chico, al lado |
| Deducción ("¿Quién fue?") | Esquina de abajo, pose pensativa (B15, opcional) | Arriba de él; las tres siluetas al centro |
| Error amable ("El gato no tiene plumas") | Igual | Igual, con la pista que descarta |
| Rescate ("¡Encontramos al pato!") | Al lado del animal | Arriba de los dos |

### 4.2 Qué pantallas cambian

| Pantalla | Hoy | Propuesta |
|---|---|---|
| `screen/AdventureIntro.tsx` | Fondo plano, pulpo al centro, globo arriba | Escena del primer nivel, pulpo en una esquina, globo que lo señala |
| `screen/AdventureClosing.tsx` (todos los cierres, también los del prólogo) | Fondo plano | La escena terminada del último nivel; en el prólogo, el recinto recién limpio con su cartel |
| `screen/Deduction.tsx` | Pantalla aparte, en blanco, con los animales de granja | Sobre la escena del último nivel de pistas, con siluetas del zoológico |
| `screen/ZooMap.tsx` | Globo con la cola abajo a la izquierda | Solo cambia el arte del globo (B8/B9) |
| `screen/PrologueOpening.tsx` | Tres láminas | Sin cambios por ahora |

---

## 5. Recompensas: desbloqueos en vez de estrellas

### 5.1 Qué se desbloquea

| Cuándo | Qué | Existe hoy |
|---|---|---|
| Cada rescate | **El animal vuelve a su recinto** en el mapa, volando (§6) | Sí, sin vuelo |
| Cada rescate | **Una figurita en la libreta del detective**: el animal a color y, al lado, las pistas de su caso. Los que faltan, en silueta con "?" | No (es P2 de `docs/18`) |
| Antes de la aventura que la usa | **Una herramienta del Pulpito**: la lupa (fin del prólogo), el gorro de pastor (fin de las ovejas, se usa en las llamas), la linterna (al entrar a la noche) | Sí, pero se ganan **después** de usarlas |
| Cada rescate | **Un pedazo del mapa**: se levanta la niebla del próximo sector | Sí |

Las herramientas se entregan **antes** de la aventura que las usa, no como
premio al final: hoy la linterna se gana al terminar la noche (`night4`) y el
gorro al terminar las llamas (`llama-peak4`), o sea, cuando ya no sirven.

### 5.2 Las estrellas

En esta etapa **no se muestran**. Se siguen calculando y guardando por nivel,
así que no se pierde nada: la etapa de las letras cursivas (`docs/15`) tiene
menos historia, y ahí juntar estrellas para comprar algo (un sombrero para el
Pulpito, un adorno para el recinto) tiene sentido. De paso se va la segunda
estrella que pedía repetir el nivel sin decir por qué (D29, P7 de `docs/18`).

### 5.3 Los botones del mapa

| Botón | Hoy | Propuesta |
|---|---|---|
| Mochila | Muestra íconos, no hace nada | **Abre la libreta del detective**: primera página, las herramientas; después, una página por animal |
| Animales recuperados | Una fila de animales chiquitos | **Se va**: el mapa y la libreta ya lo dicen |
| Estrellas | Un contador | **Se oculta** en esta etapa |
| Silenciar | Silencia la voz | Queda igual |

### 5.4 Nada castiga (`docs/01` §5)

| Situación | Qué pasa |
|---|---|
| El dedo se sale del camino | No se pierde nada de lo juntado; se sigue desde el último objeto |
| Elige la silueta equivocada | La silueta da un pasito atrás y el Pulpito dice por qué, con la pista que la descarta: "El gato no tiene plumas". Se vuelve a elegir, sin límite |
| Una víbora queda a medias | Esa víbora vuelve a gris despacio; las despiertas quedan despiertas |
| Cualquier caso | Nunca rojo, nunca un sonido de error, nunca "perdiste" |

---

## 6. Transiciones

**Qué pasa hoy.** Un fundido de 200 ms entre todas las pantallas
(`screen/ScreenTransition.tsx`). No dice nada y no tiene que ver con el
zoológico.

| Cambio | Propuesta | Cómo |
|---|---|---|
| Aventura → mapa (rescate) | **El animal vuela**: salta en la escena, se achica y viaja en arco hasta su lugar del mapa, donde cae con un saltito | El mapa se monta con el animal en la posición de pantalla que tenía en el cierre y lo anima hasta su lugar (técnica FLIP). Se anima una imagen HTML encima, no el nodo SVG (el `transform` de CSS pisa al atributo) |
| Mapa → aventura | **La lupa**: el mapa se acerca al sector destacado y un círculo se abre sobre la escena | Un path oscuro a pantalla completa con un agujero circular que crece (`evenodd`, la misma técnica del velo de la linterna; sin `clipPath` ni `mask`) |
| Nivel → nivel, misma aventura | **Sin cambio de pantalla**: la escena queda, la tinta se borra, lo juntado ya está en la barra y el camino nuevo se dibuja solo (la demo) | Mismo fondo en toda la aventura (`zoo/backdrops.ts` ya es por aventura) |
| Pistas → deducción | Las pistas de la barra bajan al centro y se ponen en fila; aparecen las tres siluetas | En la misma escena |
| Entrada del recinto → nivel | El Pulpito se achica a su esquina y empieza la demo | En la misma escena |

Con `prefers-reduced-motion`, todo esto se reduce a cortes directos.

---

## 7. Porciones de implementación

Ordenadas. "Sin arte" = se puede empezar hoy con lo que hay.

| # | Porción | Tamaño | Arte (`docs/20`) | Depende de | ¿Sin arte? |
|---|---|---|---|---|---|
| 1 | **Juntar a lo largo del camino** (§2.2) en el motor, y las ovejas y las llamas en los picos | M | ninguno | — | **Sí** |
| 2 | **El Pulpito sobre la escena** (§4): entrada y cierre sobre el fondo del nivel, regla de esquinas, globo que lo señala | M | B8 (hasta entonces, el globo actual y su espejo) | — | **Sí** |
| 3 | **Deducción en el flujo**: `Deduction.tsx` generalizado a los animales del zoológico, siluetas derivadas en `build_art.py`, barra sin silueta durante las pistas; el caso del pato completo | M | ninguno para el pato (todo existe); B11 mejora las semillas y las gotas | 1, 2 | **Sí** |
| 4 | **Víboras** (§3.1): gris derivado, color que avanza, sin arrastre, orden de chica a grande, historia | M | ninguno | 1 | **Sí** |
| 5 | **Erizo** (§3.3): espinas cortas, trazo que se vuelve espina, bola → perfil | M | B14 opcional (el erizo con espinas para el mapa) | — | **Sí** |
| 6 | **Libreta y botones del mapa** (§5): estrellas ocultas, sin fila de animales, la mochila abre la libreta, herramientas antes de usarlas | M | ninguno (las siluetas salen de `build_art.py`) | 3 | **Sí** |
| 7 | **Transiciones** (§6): el vuelo al mapa, la lupa, sin fundido entre niveles | M | ninguno | 2 | **Sí** |
| 8 | **El caso de la noche** (§3.2): las cosas del erizo, el erizo en `night4`, la deducción con descarte | S | B12 (hasta entonces, hoja y piedra) | 3, 5 | Parcial |
| 9 | **El resto de las recetas**: peces (carteles), delfines, tortugas, abeja, monos. Una por sector, no todo junto | L | B10 (mono), B13 (pistas del mono) | 1, 3 | Parcial |
| 10 | **Entrada del arte**: fondos, globos, pistas. Cada lámina es un cambio de archivo más una nueva medición (`docs/20` §2.4) | S c/u | B1–B7, B8–B9, B11–B13 | — | No (es el arte) |

Las porciones 1, 2, 4 y 5 no dependen entre sí y pueden ir en paralelo (con el
límite de tres escritores a la vez que dejó la tanda 1).

---

## 8. Decisiones para la autora

Solo las que tienen dos caminos de verdad. Las demás van como están arriba,
salvo que digas otra cosa.

1. **Víboras: cómo vuelve el color.**
   - (a) El color avanza con el dedo mientras se acaricia.
   - (b) La víbora se pinta entera de golpe al completarla.
   - **Recomiendo (a)**: muestra por dónde pasó el dedo, que es la respuesta que
     faltaba. (b) es más barata y se puede hacer primero.
2. **Estrellas en esta etapa.**
   - (a) Ocultarlas; se siguen guardando para las letras.
   - (b) Dejarlas visibles, chiquitas.
   - **Recomiendo (a)**: compiten con la libreta y hoy no sirven para nada.
3. **Cuántas aventuras llevan deducción.**
   - (a) Cuatro casos (pato, noche, peces, monos), como en §2.3.
   - (b) Todas.
   - **Recomiendo (a)**: con once deducciones iguales, a la cuarta ya no
     es un misterio.
4. **El nivel de arrastrar víboras.**
   - (a) Sacarlo; la comparación de tamaños pasa al orden en que se despiertan.
   - (b) Reemplazarlo por otra actividad de ordenar.
   - **Recomiendo (a)**: arrastrar no entrena el trazo, y el orden de
     despertarlas conserva la seriación.
5. **Erizo: el trazo largo del primer nivel.**
   - (a) Espinas cortas desde el primer nivel; se exime a esta familia de la
     regla de amplitud del primer nivel.
   - (b) Mantener un primer nivel de trazos largos, de brazo entero.
   - **Recomiendo (a)**: la amplitud ya la trabajan el pato y las víboras, y una
     espina larga nunca va a parecer espina.
6. **Herramientas: antes o después.**
   - (a) Se entregan antes de la aventura que las usa (linterna, gorro).
   - (b) Se ganan al final, como hoy.
   - **Recomiendo (a)**: una herramienta que se gana cuando ya no sirve no es
     un premio.
7. **El estilo de los fondos nuevos.**
   - (a) El "renovado" de la arena, la noche y el recinto de los monos: escena
     con profundidad, color pleno.
   - (b) El marcador plano de `docs/09`, como la laguna o el bosque de hoy.
   - **Recomiendo (a)** para los fondos, y seguir con el marcador para
     personajes y objetos. Cuatro fondos renovados ya están en uso y conviven
     bien; los que te parecen feos son los planos. `docs/20` está escrito
     para (a); si elegís (b), cambia el encabezado de cada pedido.
