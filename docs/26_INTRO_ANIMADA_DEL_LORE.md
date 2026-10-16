# 26 — La intro animada de la historia

Escrito el 2026-10-16. Es un plan para aprobar: el guion cuadro por cuadro,
la dirección de arte, cómo se construye y en qué orden. El arte que necesita
se pide en `docs/24` (E1–E7).

El pedido de la autora:

> Una intro de la historia, hecha con código, que se vea muy atractiva para
> los chicos y profesional. Que no sea AI slop.

## En 30 segundos

- **Qué cuenta**: el Pulpito cuida un zoológico lleno de animales; una noche
  alguien deja la reja abierta; a la mañana el zoológico está en silencio, y
  el Pulpito le pide ayuda al chico. Termina en el mapa, donde empieza el
  juego. Es la frase de `docs/19` §1 contada en imágenes: "Una noche alguien
  dejó las puertas abiertas y los animales del zoológico se escaparon".
- **Cuánto dura**: **9 tomas, 64 s**. Se puede saltar siempre.
- **Cómo se hace**: una escena del propio juego, con capas de dibujo que se
  mueven con `framer-motion` (ya instalado), y la voz grabada de la autora
  (o la voz del navegador mientras tanto). **No es un video**: no hay
  `ffmpeg` en esta máquina, pesaría más, y no se podría cambiar una frase sin
  volver a exportar.
- **Qué reemplaza**: las tres láminas fijas de hoy (`screen/PrologueOpening.tsx`)
  y la idea del "video generado por IA" de `docs/16` §4. El contrato del
  componente no cambia (`{ from, onDone }`).
- **Qué se necesita de la autora**: aprobar el guion (§2), decidir cuatro
  cosas (§7) y generar el arte de `docs/24`.

---

## 1. Lo que la intro tiene que respetar

| Regla | De dónde sale | Qué implica acá |
|---|---|---|
| El chico **descubre** qué animal falta limpiando | `docs/16` §1 | La noche del escape se **oye**, no se ve: no se muestra qué animal sale ni hacia dónde. Las huellas quedan para el sendero (`sand4`) |
| El prólogo puede mostrar animales; un caso, no antes de su deducción | `odd/tasks/review-batch-2.md`, reglas 1 y 2 | De día se asoman los animales del zoológico (es el prólogo). Ninguno aparece yéndose |
| Nada castiga, nada asusta | `docs/01` §5 | La noche es misteriosa, no de miedo: luna con cara dormida, sin truenos, sin sombras que persiguen. Nadie es culpable: "alguien" dejó la reja abierta, nunca el Pulpito |
| Ningún texto solo | `docs/12` §3, `detective/captionAudit.ts` | La frase aparece en el globo del Pulpito solo cuando él está en pantalla. En las tomas sin él, solo voz |
| Nunca obligatoria | `docs/16` §4, punto 3 | El botón "Ir al mapa" está siempre, desde el primer cuadro |
| Termina donde empieza el juego | `docs/16` §2, beat 6 | La última toma se funde con el mapa real (`ZooMap`), con su niebla |
| Una sola voz | `voice/narrator.ts` | Todo lo dice el Pulpito en primera persona, como en el resto del juego. No hay narrador aparte |

---

## 2. El guion

### 2.1 Parte A: la apertura (antes del mapa, primera visita)

Las duraciones incluyen las pausas. "Capas" se refiere a la escena de `docs/24`
E3 (día) y E5 (noche): `fondo`, `medio`, `frente`. La cámara es un único
recuadro que se mueve sobre las capas apiladas.

| # | Dura | Qué se ve | Cámara | Qué dice el Pulpito | Sonido | Arte |
|---|---|---|---|---|---|---|
| 1 | 5 s | La plaza vacía, todavía con luz de madrugada. El sol sale despacio por detrás de las lomas | Quieta 1 s; después baja apenas, como si se despertara, 4 % en 4 s | — (silencio, 1,5 s; después la música entra suave) | Un pájaro, una vez | E3 día, E6 sol |
| 2 | 8 s | Los animales se asoman sobre la cerca, uno por vez, con medio segundo entre uno y otro: pato, oveja, llama, mono, tortuga | Paneo lento a la derecha, hacia la cerca | "Este es mi zoológico. Acá viven un montón de animales." | Un "pop" suave por cada animal | E3; animales que ya existen (`docs/24` §2) |
| 3 | 8 s | El Pulpito entra por la izquierda empujando el carrito, frena en el centro, suelta el carrito y saluda mirando al chico | Lo acompaña un poco y se queda quieta cuando él frena | "¡Hola! Soy el Pulpito y cuido este zoológico." (frase de hoy) | Ruedita del carrito; al frenar, silencio | E1 empuja, D42 cuidador |
| 4 | 7 s | El Pulpito cruza frente a la cerca con el carrito; cada animal que pasa se mueve un poquito (un salto chico, uno solo) | Quieta. Corte limpio desde la toma 3 | "Todas las mañanas limpio los recintos." (frase de hoy) | Ruedita | E1 empuja |
| 5 | 8 s | El cielo pasa a atardecer y a noche; el sol baja, los animales bajan detrás de la cerca (se van a dormir), el Pulpito bosteza y sale por la derecha con el carrito. Sale la luna | Se abre un poco (aleja 5 %) | "Y a la noche, todos a dormir." | Grillos que entran de a poco | E1 bosteza, E6 sol y luna, fundido E3 → E5 |
| 6 | 10 s | Noche quieta, el farol prendido. Pausa larga. Después, la reja se abre sola, despacio, una hoja y después la otra | Quieta 3 s; después se acerca a la reja, 8 % en 6 s | "Pero esa noche… alguien dejó la reja abierta." (dicha cuando la reja ya está abierta, no antes) | Grillos; un chirrido largo y suave; después, pasitos chiquitos que cruzan de un parlante al otro, un chapoteo, hojas | E5 noche, E4 reja |
| 7 | 8 s | Entra la niebla del mapa desde los costados y tapa la noche. Cuando se va, es de día: la plaza, sin ningún animal. El Pulpito entra, frena, se sorprende y mira para los costados | Fundido a través de la niebla; después quieta | "¡Qué silencio! ¿Dónde están todos?" | Los grillos se apagan; de día, nada: ni pájaro. El silencio es la toma | `niebla 1–3`, E3 día, E2 sorprendido y busca |
| 8 | 6 s | El Pulpito se da vuelta hacia el chico y le ofrece la mano | Se acerca a él, 6 % en 2 s, y se queda | "Vamos a empezar por limpiar los recintos. ¿Me ayudás?" | La música vuelve | E2 invita |
| 9 | 4 s | La escena se achica y se funde en el mapa real, con su niebla y la plaza; el globo del mapa toma la posta | Se aleja hasta que la plaza de la escena coincide con la plaza del mapa | — | Un acorde corto que cierra | `mapa zoologico.png` (el `ZooMap` real) |

**Total: 64 s.** La toma 1 empieza con el toque de inicio que ya existe
(`docs/25` P2-5): ese toque habilita el audio.

Las frases nuevas son cinco, cortas y en voseo: "Este es mi zoológico. Acá
viven un montón de animales.", "Y a la noche, todos a dormir.", "Pero esa
noche… alguien dejó la reja abierta.", "¡Qué silencio! ¿Dónde están todos?" y
la primera mitad de "Vamos a empezar por limpiar los recintos. ¿Me
ayudás?". Las otras dos son las de `zoo/prologue.ts`, sin tocar.

### 2.2 Parte B: nace el detective (al final del sendero)

Es el beat 5 de `docs/16`: hoy es una línea de texto en el cierre del
sendero. Usa el mismo motor y dura **15 s**. Reemplaza la segunda pantalla
del cierre de `sendero` ("¡Se fueron todos los animales!…"); la primera
("¡Mirá! ¿Y esto? ¡Son huellas!") queda como está.

| # | Dura | Qué se ve | Cámara | Qué dice | Sonido | Arte |
|---|---|---|---|---|---|---|
| B1 | 4 s | El sendero limpio con las huellas. El Pulpito cuidador entra, se agacha y las mira con una lupa | Quieta | — | Pasos del Pulpito; un "hmm" musical | `fondo sendero v2.png`, huellas del juego, E7 mira el piso |
| B2 | 4 s | Se endereza y se lleva la lupa al ojo; el ojo se ve grande | Se acerca a la lupa, 10 % en 1,5 s | "¡Ajá!" | Una nota que sube | E7 lupa al ojo |
| B3 | 2 s | La lupa del juego crece y llena la pantalla | — | — | El sonido de la transición de siempre | `lupa transicion.png` (D35) |
| B4 | 5 s | Al abrirse, el Pulpito ya es detective: gorro, cuello y corbata, la lupa en la mano | Quieta | "¡Se fueron todos los animales! Agarrá la lupa: los vamos a buscar." (frase de hoy) | La música del detective, corta | D6 `pulpo con lupa v2.png` |

Después, el mapa, como hoy. El cambio de ropa no se anima: lo tapa la lupa,
que es la transición que el chico ya conoce. Es el truco de las películas de
recortes: no mostrar lo que es caro de mostrar.

---

## 3. Dirección de arte: qué la hace profesional

Lo que separa una animación cuidada de una genérica no es la cantidad de
movimiento, sino **cuánto se elige no mover**.

### 3.1 Lo que se hace

- **Una idea por toma.** Cada toma tiene un solo cambio importante (sale el
  sol, se asoman, se abre la reja). Si dos cosas pasan a la vez, una espera.
- **Pausas.** Toda acción termina con una quietud de al menos 0,8 s antes de
  la próxima. La toma 6 empieza con 3 s de noche quieta: es la que más
  importa y la que más tiempo pide.
- **Curvas de movimiento con peso.** Nada se mueve en línea recta a velocidad
  pareja. Entradas con *ease-out* (frenan al llegar), salidas con *ease-in*,
  y un rebote chico (*spring* con poco rebote: `stiffness` ≈ 220, `damping` ≈
  18) solo en lo que salta: los animales al asomarse. La cámara usa siempre
  la misma curva lenta (`[0.45, 0, 0.2, 1]`), así se siente una sola
  cámara.
- **Movimientos de cámara chicos.** Ningún acercamiento pasa del 10 %. Las
  capas se desplazan a distinta velocidad (fondo 0,3; medio 0,6; frente 1):
  esa diferencia da la profundidad.
- **Animación de recortes, sin cuadros dibujados.** El Pulpito cambia de pose
  por corte, nunca por un fundido entre dos dibujos (eso se ve borroso). Para
  la vida entre poses alcanza con lo que ya hace el juego: respirar (escala
  1,02) y parpadear (`cv-octopus-breathe`, `cv-octopus-blink`). No hay
  labios que sincronizar: habla el globo.
- **La paleta del juego.** Solo los colores de `docs/09` §4 y los del arte
  ya aprobado. El atardecer es un fundido de capas dibujadas, no un
  degradado de CSS encima.
- **Siluetas legibles.** Cada cosa que importa se separa de lo que tiene
  atrás: el Pulpito naranja sobre el piso arena; la reja gris oscura contra
  el farol amarillo.
- **El sonido cuenta la mitad.** El escape se oye y no se ve. Los efectos
  van uno por vez, con silencio alrededor. El silencio de la toma 7 es un
  efecto en sí.
- **La voz manda el ritmo.** Cada toma espera a que termine su frase más una
  pausa (§4.3); la animación no corre contra la voz.

### 3.2 Lo que no se hace

- Brillitos, estrellitas o partículas "mágicas" en cualquier momento.
- Resplandores (*glow*), halos, viñetas oscuras, desenfoque de profundidad.
- Texto animado letra por letra, títulos que vuelan, logos que giran.
- Zoom rápido, sacudón de cámara, rotaciones de cámara.
- Rebote en todo: solo rebotan los animales al asomarse.
- Personajes que flotan o se mueven sin parar (el "baile" de las mascotas de
  aplicación). En reposo, el Pulpito solo respira.
- Música durante las frases a volumen alto: baja a la mitad mientras habla.
- Un arte distinto del juego: ni 3D, ni otra línea, ni otra cara del Pulpito.

---

## 4. Cómo se construye

### 4.1 Las dos opciones

| | **Escena en el juego** (recomendada) | **Archivo de video** |
|---|---|---|
| Cómo | Un componente React con las capas PNG, movidas con `framer-motion`, y la voz por audio grabado o por el navegador | Un `.mp4`/`.webm` reproducido con `<video>` |
| Herramientas | Todo está: React 19, `framer-motion` 13, el pipeline de arte | No hay `ffmpeg` en esta máquina. Opciones: instalarlo; o grabar la escena en Chromium con `MediaRecorder` a `.webm`; o un servicio externo |
| Peso | Las capas (~2,5 MB, §4.5); la voz grabada, ~0,4 MB | 60 s a 720p: 4–8 MB |
| Nitidez | Nítida en cualquier pantalla: son los PNG del juego | Fija a la resolución exportada |
| Cambiar una frase | Se cambia un texto o un audio | Se vuelve a exportar todo |
| Movimiento reducido | Se arma otra versión con los mismos datos (§4.4) | Haría falta un segundo video |
| Riesgo | Rendimiento en tablets viejas (se mide, §4.5) | Formatos: Safari viejo y `.webm`; el autoplay con sonido igual pide un toque |

**Recomendación: escena en el juego.** Es más liviana, más nítida y más fácil
de corregir, y usa solo lo que ya está instalado. El video queda como
subproducto: si algún día hace falta para compartir (una presentación, un
mensaje a las familias), se graba la misma escena en Chromium con
`MediaRecorder`, sin tocar el juego.

### 4.2 Dónde vive

- `zoo/loreIntro.ts`: el guion como **datos puros** (tomas, capas, posiciones
  de cámara, frases, duraciones mínimas, sonidos), sin React, con tests,
  igual que `zoo/prologue.ts` hoy.
- `screen/LoreIntro.tsx`: lo dibuja. Queda **adentro** de
  `PrologueOpening.tsx`, que conserva su contrato (`{ from, onDone }`): `from`
  pasa a ser el número de toma. Nadie que lo llame se entera del cambio,
  como prometía el comentario del propio componente.
- La parte B, en `AdventureClosing.tsx`, como una pantalla de cierre de otro
  tipo para la segunda línea del sendero, con el mismo `LoreIntro` y otro
  guion.
- Sin `url(#…)`: las capas son `<img>` posicionadas con CSS
  (`docs/09` §3). Los fundidos son opacidad; los giros de la reja,
  `scaleX` con el `transform-origin` en la bisagra.

### 4.3 La voz

| Opción | A favor | En contra |
|---|---|---|
| **Grabada por la autora** (recomendada) | Cálida, rioplatense, con la intención justa; el tiempo de cada frase es fijo y la animación calza exacta | Hay que grabar siete frases (y las dos de la parte B); ~0,4 MB |
| Voz del navegador (`speechSynthesis`, ya en el juego) | Ya funciona, cero peso | Suena a robot en muchos equipos, y cada equipo tarda distinto: la toma tiene que esperar el `onend` de la frase |

El motor sirve para las dos: cada toma dura **lo que dure su frase más la
pausa**, nunca menos que su duración mínima. Si la voz falla o está apagada,
la toma dura su mínima y el globo muestra la frase.

### 4.4 Reglas para el aula

- **Cuándo se ve.** Sola, solo la primera vez, después del toque de inicio.
  Se guarda que ya se vio (o que se saltó) en el progreso del chico.
- **Saltar.** El botón "Ir al mapa" de hoy, arriba a la izquierda, desde el
  primer cuadro. Tocar la escena **no** adelanta ni saltea (los chicos tocan
  todo): solo el botón.
- **Volver a verla.** Un botón con el triángulo de "ver de nuevo" (el de
  `botones lamina.png`) en el mapa, al lado de la mochila. La docente la
  puede mostrar a toda la clase sin borrar el progreso.
- **Sonido.** Respeta el silencio del parlante del juego. Sin sonido, la
  intro igual se entiende: los globos dicen las frases cuando el Pulpito está.
- **Movimiento reducido** (`prefers-reduced-motion`): sin cámara ni
  paralaje; cada toma es una imagen quieta compuesta con las mismas capas, y
  se pasa de una a otra con un fundido de 0,4 s, con la misma voz y el mismo
  tiempo. La reja aparece abierta en lugar de abrirse.
- **Si un dibujo no carga**: se cae a las tres láminas fijas de hoy. La
  intro nunca deja al chico en una pantalla vacía.

### 4.5 Presupuestos

| Qué | Límite | Cómo se cumple |
|---|---|---|
| Duración, parte A | 60–70 s | 64 s; si una frase grabada sale larga, se acorta la pausa, no la frase |
| Duración, parte B | ≤ 15 s | 15 s |
| Peso de la intro | ≤ 3 MB | Capas a 1280 px de ancho al embarcar; recortes al tamaño en que se ven. Medido después de `build_art.py`. Si pasa, las capas opacas se convierten a WebP con Chromium (el pipeline no tiene codificador) |
| Carga | Nada se ve hasta que está todo | Se precarga durante el toque de inicio; si tarda más de 4 s, se muestran las láminas fijas |
| Fluidez | 60 cuadros en la tablet más vieja de la escuela, o 30 sin saltos | Solo se animan `transform` y `opacity`, nunca tamaño ni posición; no más de 12 imágenes en pantalla a la vez |

---

## 5. Tareas

En orden. Cada una es chica y se prueba sola.

| # | Tarea | Depende de |
|---|---|---|
| 1 | El guion como datos (`zoo/loreIntro.ts`) y sus tests: duraciones, que cada frase exista, que la última toma termine en el mapa, que ninguna toma muestre un animal yéndose | — |
| 2 | **Animática con el arte de hoy**: la escena completa con `mapa zoologico.png`, `fondo noche zoo.png`, `pulpo cuidador.png`, `carrito.png`, `niebla`, los animales. Sirve para ajustar tiempos y que la autora la apruebe antes de que llegue el arte | 1 |
| 3 | El motor: capas, cámara, paralaje, cortes de pose, fundidos, `scaleX` de la reja, espera de la voz | 2 |
| 4 | Saltar, volver a ver, guardar "ya vista", movimiento reducido, caída a las láminas | 3 |
| 5 | Meter el arte de `docs/24` E1–E6 por el pipeline (`docs/24` §7) | arte E1–E6 |
| 6 | La voz: las frases grabadas, o la del navegador con espera de `onend` | decisión 3 (§7) |
| 7 | Sonidos y música | decisión 4 (§7) |
| 8 | Medir peso y fluidez en una tablet real; capturas a 1024 × 768 y 768 × 1024 | 5 |
| 9 | Parte B en el cierre del sendero, con E7 | 3, arte E7 |

La animática (tarea 2) es la más importante: decide los tiempos con el arte
que ya hay, y evita pedir dibujos para tomas que después se cortan.

---

## 6. Lo que se necesita de la autora

1. Aprobar el guion de la §2 (tomas y frases), o marcar qué cambia.
2. Generar en ChatGPT el arte de `docs/24` E1–E7 (después de D42).
3. Si elige voz grabada: grabar nueve frases cortas en un lugar sin eco
   (el celular alcanza), una por archivo.
4. Mirar la animática (tarea 2) en la tablet de la escuela antes de la
   versión final.

## 7. Decisiones para la autora

1. **La noche del escape: ¿se oye o se ve?** Recomendado: se oye (pasitos,
   chapoteo, hojas), y no se ve qué animal sale. Así cada recinto vacío del
   prólogo sigue siendo un descubrimiento. La otra opción es mostrar sombras
   que cruzan la reja: más cine, pero adelanta lo que el chico descubre
   limpiando.
2. **¿Va la parte B (nace el detective)?** Recomendado: sí; es el momento que
   hoy es solo una frase. Sin ella, la parte A alcanza sola.
3. **La voz**: ¿la graba la autora, otra persona, o queda la del navegador?
4. **Música**: ¿una melodía corta de fondo (un archivo de unos 300 KB, de
   licencia libre o compuesta para el juego) o solo efectos sintetizados como
   el resto del juego (`audio/sfx.ts`)? Recomendado: una melodía muy suave;
   los efectos solos dejan la intro seca.
