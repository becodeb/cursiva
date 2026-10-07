# 25 — Revisión psicopedagógica del recorrido de preescritura

Escrito el 2026-10-07 (tarea R3 de `odd/tasks/psychopedagogical-review.md`).
**Es una revisión y una propuesta, no una especificación.** No se cambia
código, guion ni arte hasta que la autora apruebe cada punto de la §7.

Las capturas citadas están en `capturas/2026-10-07-revision/` (fuera de git,
solo en la máquina donde se sacaron). El registro paso a paso es
`capturas/2026-10-07-revision/LOG.md`; "LOG:123" es su línea 123.

---

## 1. Resumen

**Veredicto.** El recorrido de preescritura está bien pensado para un niño de
6 años que no lee: cada trazo tiene un motivo dentro de la historia, la
consigna se escucha, nada castiga y las formas siguen el orden de la cursiva
(arcos, ondas, guirnaldas, óvalos, bucles), siempre de izquierda a derecha y
con giros coherentes. Lo que todavía no hace es **llevar al niño hasta la
letra**: el recorrido termina en el zoológico y la etapa de letras existe
aparte, sin historia, con texto y con un puntaje que no distingue bien un
trazo de un garabato.

**Los cinco hallazgos más importantes:**

1. **P1** — La pantalla de letras (`f3-*`) no sirve todavía para un niño que no
   lee, y su puntaje premia con dos estrellas un trazo en zigzag (§5.1).
2. **P1** — No hay puente entre el zoológico y la letra: `f3-*` solo se abre
   con un enlace de desarrollo y ningún nivel usa el renglón (§5.1).
3. **P2** — Las correcciones no se escuchan y, en el mundo del detective, el
   reinicio por tocar el borde es mudo: el trazo desaparece sin explicación (§5.2).
4. **P2** — Cinco de las seis entradas de los casos nombran o muestran al
   animal antes de la deducción, que pierde el misterio (§5.2).
5. **P2** — El recorrido es largo y repetitivo para la edad: 55 niveles,
   13 de ondas y 8 de picos, unos 38 minutos al primer intento (§5.2).

**Siguiente paso recomendado.** Aprobar la tanda 1 de la §7 (arreglos
evidentes, sin arte) y contestar las preguntas de la §8; con esas respuestas
se diseña el puente a la letra (tanda 4) antes de sumar niveles nuevos.

---

## 2. Cómo se hizo y límites

### 2.1 Método

| Paso | Qué se hizo |
|---|---|
| Captura (R1) | Chromium del sistema con Playwright, en 1024×768 y 768×1024, entrando a cada pantalla con los enlaces de desarrollo del juego (`?dev&nivel=…`). 103 pasos: 59 niveles y 44 pantallas de historia o mapa (LOG:6-29). |
| Trazos | Arrastres reales del puntero sobre el camino dibujado; en limpieza y linterna, un barrido en zigzag sobre toda la hoja (LOG:16-22). |
| Esta revisión (R3) | Lectura completa del LOG; revisión visual de las 23 hojas de contacto (`_sheets/before-*`, `imperfect-*`, `portrait-*`) y de capturas sueltas; lectura del código de puntaje y de voz; lectura de `docs/01`, `docs/18`, `docs/19`, `docs/21` y del historial T1–T51. |
| Evidencia externa (R2) | `odd/psychopedagogical-review/research-r2.md`. Solo se citan sus URL. |

### 2.2 Lo que no se pudo ver o medir

- **Erizo, víboras y abeja** (`hedgehog*`, `snake*`, `bee*`): el final se
  sembró con los `?debug=` del propio proyecto; solo se hizo un trazo corto
  real (LOG:36-47). Las tareas T30 y T39 sí los jugaron con arrastres reales.
- **`night-rastro`**: solo hay captura inicial; el arnés no encontró una ruta
  que seguir (LOG:35).
- **Tiempos**: el LOG no mide cuánto tarda cada nivel. Los minutos de esta
  revisión son la estimación de `docs/21` §5, actualizada al número de niveles
  de hoy.
- **Ningún niño jugó**. Sigue pendiente la prueba en tablet con niños
  (`docs/18` §7, P12).
- **La lista de control de la autora** (artefacto HTML) no se pudo leer desde
  esta sesión.
- **Fuentes externas**: R2 trabajó con fragmentos de búsqueda, no con los
  documentos completos. No se llegó al Diseño Curricular de CABA ni a los NAP,
  y **no hay fuente verificada** para la regla del giro antihorario, el trazo de
  entrada, las letras de salida alta ni el cuaderno de doble pauta en Argentina
  (research-r2 §Gaps y §Follow-up).

### 2.3 Tres errores del arnés que cambian la lectura del LOG

Encontrados al mirar las capturas. No son defectos del juego.

1. **El juego avanza solo y el arnés no lo nota.** En los niveles de juntar, el
   primer trazo limpio completaba el nivel y el juego pasaba al siguiente antes
   del intento "imperfecto". Ejemplos: `12-sheep-hill1-1024x768-d-imperfect.png`
   muestra las tres lomas de `sheep-hill2`, y `47-turtle1-1024x768-d-imperfect.png`
   muestra los dos óvalos de `turtle2`. Por eso **13 de los 18 niveles que el LOG
   da como "no aprobados"** (LOG:34) en realidad se completaron: su captura
   "imperfecta" ya muestra el nivel siguiente, la deducción o el cierre. Solo
   quedaron sin completar `sheep-lana` y `turtle-huellas` (piden levantar el dedo
   en cada parada), `llama-peak3` (la piedra que rueda), `dolphin4` (cámara que
   se desplaza) y `night-rastro` (sin ruta). Consecuencia: las capturas `d-` y `e-`
   de los niveles de juntar no describen el nivel de su nombre, y **ninguna
   conclusión sobre dificultad sale de esos "no aprobados"**.
2. **Dos letras figuran como aprobadas sin estarlo.** El arnés da por aprobado
   cualquier resultado que contenga "✓" (`_harness/review-capture.cjs:545`), y
   "Sentido ✓" lo contiene. `f3-l` y `f3-o` en apaisado mostraron "Vas bien.
   Probá más parejo, sin frenar." (LOG:1779, LOG:1857): no aprobaron.
3. **La fluidez depende del equipo.** El mismo trazo limpio sacó Fluidez 32 a 47
   en apaisado y 81 a 97 en vertical (LOG:1779 contra LOG:1783, y así en las
   cuatro letras). La diferencia viene del ritmo de eventos de la Raspberry, no
   del trazo (§5.1, P1-1).

---

## 3. Criterios

Cada pantalla se miró con estos criterios. La columna "Fuente" dice en qué se
apoya; "inferencia" significa que no hay fuente verificada.

| # | Criterio | Qué se mira | Fuente |
|---|---|---|---|
| C1 | Qué aprende | La habilidad de trazo que entrena, en el vocabulario de `docs/21` §2 | `docs/01` §4, `docs/21` §2 |
| C2 | Se entiende sin leer | Ningún significado vive solo en texto; los íconos sugieren el gesto | https://atendesigngroup.com/blog/young-audiences (secundaria); `docs/18` §3 |
| C3 | Consigna hablada y mostrada | La consigna se oye y hay demostración antes del intento. Descripción verbal más demostración rindió más que la demostración sola | https://link.springer.com/article/10.1007/s00221-018-5319-y |
| C4 | Dirección | Arriba→abajo e izquierda→derecha por defecto; cada familia curva gira siempre igual | https://www.dynseo.com/en/graphics-and-writing-supporting-the-child-in-difficulty-occupational-therapy/ ; https://www.aulapt.org/wp-content/uploads/2016/01/manual-basico-de-ejercicios-de-grafomotricidad.pdf |
| C5 | Punto de arranque y parada | Se marcan o se dicen antes del intento. Calcar dio puntos de inicio más consistentes que copiar | https://link.springer.com/article/10.1007/s00221-018-5319-y |
| C6 | Continuidad | Se pide no levantar el dedo donde la cursiva no lo levanta | `docs/01` §4, Fase 2 |
| C7 | Progresión | Formas nuevas en orden de desarrollo (vertical → horizontal → círculo → cruz → oblicuas) | https://www.growinghandsonkids.com/free-typical-pre-writing-line-development-handout (secundaria, no el manual de Beery) |
| C8 | Calcar → copiar → memoria | La guía se retira de a poco. En primer grado, calcar y después copiar fue la secuencia más eficaz | https://link.springer.com/article/10.1007/s00221-018-5319-y ; https://lead.ube.fr/wp-content/uploads/2023/09/000425-effects-of-different-types-of-learning-on-handwriting-movements-in-young-children.pdf |
| C9 | Frustración | Corrección neutral; nada que frene el avance; primero aprendizaje guiado y sin error | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6435728/ ; `docs/01` §5 |
| C10 | Ritmo | Pasos cortos; repetición con variación, no idéntica | inferencia; `docs/01` §5, `docs/18` §3 |
| C11 | Recompensa y motivación intrínseca | El premio es el trazo mismo o su efecto en la historia, no una estrella aparte | https://www.de.ed.ac.uk/node/435 ; https://giving.kqed.org/mindshift/20765/whats-the-secret-sauce-to-a-great-educational-game |
| C12 | Duración de la sesión | 12 a 18 minutos de tarea dirigida a los 6 años; 30 como techo; paradas naturales | https://www.earlyyears.tv/attention-span-development/ (guía general, no validada para juegos táctiles) |
| C13 | Letras por familia | Se enseñan por trazo compartido, no por abecedario | https://www.theottoolbox.com/cursive-letter-families/ ; https://mycursive.com/best-order-to-teach-cursive-letters/ |
| C14 | Enlaces de salida alta | `b o v w` salen arriba y necesitan una señal propia | https://studysites.uk.sagepub.com/sassoon/files/pupilpages/exit%20but%20not%20entry%20strokes.pdf ; https://oak.quizalize.com/programmes/english-primary-ks1/units/the-four-joins-489 |
| C15 | Transferencia al papel | El dedo en el vidrio transfiere para calcar formas; no está verificado para letras cursivas | https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01800/full ; https://pmc.ncbi.nlm.nih.gov/articles/PMC5067481 |

---

## 4. Recorrido pantalla por pantalla

**Leyenda.** ✓ cumple · ~ en parte · ✗ no cumple · — no aplica.
"Sin leer" y "Hablada" valen para la consigna; las correcciones se tratan en
P2-1. Las capturas son `NN-id-1024x768-a-before.png` salvo que se diga otra
cosa. Las consignas citadas son las del juego (LOG).

### 4.1 Prólogo, limpieza y mapa

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Láminas 0–2 (`01-03-prologue-*`) | — (historia) | ✓ dibujo y globo | ~ la lámina 0 no se oye sola | — | 3 toques | — | P2-5; botón "Ir al mapa" apretado (V1) |
| `glass1` (`01-glass1`) | Brazo amplio, cubrir superficie | ✓ | ✓ | — libre | Grilla 10×6; no puede fallar | Aparece la pecera vacía | Corrección escrita, muda (P2-1) |
| `sand1` (`02-sand1`) | Barrido de lado a lado | ✓ | ✓ | — | 10×6 | Recinto de tortugas | Ídem |
| `glass3` (`03-glass3`) | Búsqueda intencional, llegar a los rincones | ✓ | ✓ | — | 15×9 | Recinto de monos | Ídem |
| `sand3` (`04-sand3`) | Barrido ordenado y completo | ✓ | ✓ | — | 20×12 | Huellas bajo el barro (`26-closing-sendero-0`) | Ídem |
| Cierres y mapa (`23-27-closing-*`, `05-map-*`) | — | ✓ cartel con dibujo | ✓ | — | 1 toque | El misterio: "¡Se fueron todos los animales!" | — |

La limpieza es calentamiento libre, como pide `docs/01` §4. El aumento de
celdas (60 → 60 → 135 → 240, LOG:102-229) es la rampa de `docs/21` §2.1, no un
defecto. Abrir en el prólogo la primera vez es lo previsto (`App.tsx:124-133`,
`docs/16`).

### 4.2 Pato (`duck`)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Entrada (`12-intro-duck`) | — | ✓ | ✓ | — | — | — | Nombra al pato antes de deducir (P2-2) |
| `duck-trail1` (`05-duck-trail1`) | Puentes ∩, precursor de `m n` | ✓ | ✓ "Hacé los puentes del pato…" | ✓ izq→der, sube desde abajo; demo azul | Reinicio al tocar el borde | Charcos en cada pie | Bien elegido como primer camino guiado |
| `duck-trail5` (`06-duck-trail5`) | Onda continua | ✓ | ✓ | ✓ izq→der | Reinicio al borde | Semillas | — |
| `duck-trail2` (`07-duck-trail2`) | Onda repetida | ✓ | ✓ | ✓ | Reinicio al borde | Plumas | Repite la anterior con otra pista |
| `duck-trail6` (`08-duck-trail6`) | Onda "ola por ola" | ✓ | ✓ | ✓ | Reinicio al borde | Huellas palmeadas | Tercera onda seguida (P2-3) |
| Deducción (`39-deduccion-duck`) | Relacionar pista y animal | ✓ tarjetas con dibujo | ✓ | — | Error sin castigo | El pato se asoma | Respuesta ya dicha en la entrada (P2-2) |
| `duck-trail3` (`09-duck-trail3`) | Onda de amplitud variable; inhibición (pez) | ✓ | ✓ "Esperá que pase…" | ✓ | Obstáculo reinicia el tramo | Patitos | — |
| `duck-trail4` (`10-duck-trail4`) | Precisión en corredor que se angosta | ✓ | ✓ | ✓ | Reinicio al borde; corredor 70 | Últimos patitos y cierre | Sexto nivel; cinco son ondas |

### 4.3 Ovejas (`sheep`)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Entrada (`13-intro-sheep`) | — | ✓ | ✓ | — | — | — | El globo muestra la oveja antes de "¿Quién deja lana?" (P2-2) |
| `sheep-lana` (`11-sheep-lana`) | Recta vertical arriba→abajo con arranque y parada | ✓ punto verde arriba, rombo abajo | ✓ "Bajá por cada poste, de arriba abajo, y frená al final." | ✓ el mejor ejemplo del juego: dice y marca inicio, sentido y freno | Cinco trazos sueltos | Lana en cada poste | Modelo a imitar en otras consignas |
| Deducción (`40-deduccion-sheep`) | Comparar muestras (lana, pluma, pelo) | ✓ | ✓ | — | Sin castigo | — | Discriminación visual: buena |
| `sheep-hill1`–`4` (`12-15-sheep-hill*`) | Picos: subir y bajar con cambio de ángulo; regular altura; inhibición (piedra, `hill3`); precisión (`hill4`, corredor 60) | ✓ | ✓ | ✓ izq→der, arranque abajo a la izquierda | Reinicio al tocar el borde en los cuatro | Una oveja por pico | Igual generador que las llamas (P2-3) |

### 4.4 Llamas (`llama`)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Entrada (`14-intro-llama`) | — | ✓ | ✓ | — | — | Gorro de pastor antes de usarlo | — |
| `llama-peak1`–`4` (`16-19-llama-peak*`) | Los mismos picos que las ovejas, más altos | ✓ | ✓ | ✓ | Reinicio al borde; piedra en `peak3`; corredor 60 en `peak4` | Llamas en las cumbres | Ocho niveles de picos en total para una sola habilidad (P2-3; `docs/21` §2.1) |

### 4.5 Noche (`night`)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Entrada (`15-intro-night`) | — | ✓ linterna en el globo | ✓ | — | — | Linterna antes de usarla | — |
| `night1` (`20-night1`) | Barrido visual, movimiento lento | ✓ mano de demostración | ✓ | — no es un trazo | Pista suave a los ~15 s (T33) | Lo encontrado se ilumina | — |
| `night2`, `night3` (`21`, `22-night*`) | Barrido visual sistemático | ~ pantalla negra, sin demo | ✓ | — | "Encontraste 0 de 2…" solo escrito | Ídem | P2-6; P2-1 |
| `night-rastro` (`23-night-rastro`) | Seguir un trazo sin corredor, guiado por huellas | ✓ | ✓ | ✓ izq→der hasta la manzana | No se pudo jugar (§2.2) | Huellitas del erizo | Buen paso hacia "sin corredor" (C8) |
| Deducción (`41-deduccion-night`) | Descarte de animales ya rescatados | ✓ | ✓ | — | Sin castigo | — | — |
| `night4` (`24-night4`) | Movimiento lento sostenido (luz chica) | ~ pantalla negra | ✓ | — | — | El erizo hecho bolita | P2-6 |

La linterna entrena exploración y figura-fondo (`docs/21` §2.1), no un trazo
con inicio, sentido y freno. Está bien como pausa motora; no hace falta
alargarla.

### 4.6 Erizo (`hedgehog`)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Entrada (`16-intro-hedgehog`) | — | ✓ | ✓ | — | — | — | — |
| `hedgehog1`–`4` (`25-28-hedgehog*`) | Trazo radial corto desde una marca; freno al final | ✓ marcas en el lomo | ✓ "Empezá en cada marca y tirá para afuera." | ~ arranque marcado; la dirección es "hacia afuera" en todos los sentidos, incluso hacia arriba y hacia la izquierda | 8 a 11 espinas por nivel; final sembrado (§2.2) | El trazo se vuelve espina; el erizo se desenrosca | P3-1 |

### 4.7 Víboras (`snake`)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Entrada (`17-intro-snake`) | — | ✓ | ✓ | — | — | — | — |
| `snake1`, `snake2`, `snake4` (`29`, `30`, `32-snake*`) | Onda fina (corredor 38 → 28); seriación por tamaño | ✓ la que sigue late | ✓ "de la cabeza a la cola" | ✓ cabeza a la izquierda: izq→der | Gris que vuelve despacio si se sale; lo ganado queda | El color avanza con el dedo | Muy buena respuesta inmediata (C11) |
| `snake3` (`31-snake3`) | Onda vertical | ✓ | ✓ "de abajo arriba" | ✗ cabezas abajo: el único trazo vertical largo del juego va de abajo hacia arriba | Ídem | Ídem | P2-4 |

### 4.8 Abeja (`bee`)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Entrada (`18-intro-bee`) | — | ✓ | ✓ | — | — | — | — |
| `bee1`–`4` (`33-36-bee*`) | Planificar un recorrido libre con paradas; inhibición (hoja, `bee3`) | ~ sin demo (`docs/18` P5) | ✓ | ✓ izq→der, de la abeja al panal | Flores abiertas quedan abiertas | Polen y panal | P2-6; único trazo sin corredor y sin modelo |

### 4.9 Peces (`fish`)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Entrada (`19-intro-fish`) | — | ✓ | ✓ | — | — | — | Dice "Los peces se escaparon…" antes de preguntar de qué recinto (P2-2) |
| `f2-guirnalda` (`37-f2-guirnalda`) | Guirnalda U sin levantar, precursor de `u w` | ✓ | ✓ "bajá, hacé la curva y subí, sin levantar el dedo" | ✓ dice la dirección | Paredes que perdonan | Burbujas | Consigna modelo (C3, C5) |
| `f2-agua2` (`38-f2-agua2`) | U bajitas con ritmo | ✓ | ✓ "como una U" | ✓ | Ídem | Escamas | — |
| `f2-buceo` (`39-f2-buceo`, `-c-midtrace`) | Bucles que bajan, precursor de las colas `g j y` | ✓ | ✓ "Bajá… girá y volvé a subir" | ✓ baja por la derecha y gira a la izquierda abajo, como la cola cursiva | Ídem | Algas | Giro coherente con la cola de la letra |
| Deducción (`44-deduccion-fish`) | Carteles de recintos | ✓ cartel con dibujo | ✓ | — | Sin castigo | — | Respuesta dicha en la entrada (P2-2) |
| `f2-agua3`, `f2-agua4` (`40`, `41-f2-agua*`) | Regular el tamaño de la U; inhibición (estrella de mar) | ✓ | ✓ | ✓ | Obstáculo reinicia el tramo | Peces en cada U | — |

### 4.10 Delfines (`dolphin`)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Entrada (`20-intro-dolphin`) | — | ✓ | ✓ | — | — | — | — |
| `dolphin1`–`2` (`42`, `43-dolphin*`) | Onda sostenida (2 y 3 ondas) | ✓ | ✓ | ✓ | — | Cada delfín se suma a la fila | La misma onda del pato (P2-3) |
| `dolphin3`–`4` (`44`, `45-dolphin*`) | Resistencia: 5 y 7 ondas, la pantalla se desplaza | ~ el final no se ve | ✓ "El camino sigue más allá de lo que ves." | ✓ | Barra de 10 a 16 casilleros | Ídem | Ejercicio largo y uniforme (P2-3); barra cortada en vertical (V3) |

### 4.11 Tortugas (`turtles`)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Entrada (`21-intro-turtles`) | — | ✓ | ✓ | — | — | — | Muestra la tortuga antes de "¿De quién es esta huella?" (P2-2); globo mal cortado (V2) |
| `turtle-huellas` (`46-turtle-huellas`) | Recta horizontal izq→der con tres paradas | ✓ punto y rombo por tramo | ✓ "frená en cada marca" | ✓ arranque, sentido y freno marcados | Tres trazos sueltos | Huellas a los costados | Única recta horizontal del juego |
| Deducción (`42-deduccion-turtles`, `-b-aftertap`) | Discriminar huellas parecidas | ✓ | ✓ | — | Sin castigo | La tortuga aparece en su tarjeta | Prepara la discriminación de formas (`docs/21` §3.2.9) |
| `turtle1`–`4` (`47-50-turtle*`, `50-turtle4-…-c-midtrace`) | Óvalo antihorario cerrado; enlace arriba entre óvalos ("oooo") | ✓ | ✓ "Empezá arriba, andá para la izquierda y dá toda la vuelta" | ✓ arranque arriba, giro antihorario, enlace por arriba | Caracoles en `turtle3` | Una tortuga se asoma por vuelta | El enlace por arriba anticipa la `o` de salida alta (C14) |

### 4.12 Monos (`monkeys`)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| Entrada (`22-intro-monkeys`) | — | ✓ | ✓ | — | — | — | Dice "Los monos se escaparon…" antes de deducir (P2-2) |
| `monkey1`, `monkey2` (`51`, `52-monkey*`, `51-monkey1-…-c-midtrace`) | Bucle que sube y se cruza, precursor de `l e` | ✓ | ✓ "Subí como el mono…" | ✓ sube por la derecha, gira a la izquierda arriba, baja y cruza | Paredes que perdonan | Manitos, bananas | Giro coherente con la `l` cursiva |
| `monkey-lianas` (`53-monkey-lianas`) | Cambiar de forma sin levantar (bucle, guirnalda, bucle) | ✓ | ✓ | ✓ | — | Cáscaras | El paso más cercano al enlace de letras |
| Deducción (`43-deduccion-monkeys`) | Descarte | ✓ | ✓ | — | Sin castigo | — | Respuesta dicha en la entrada (P2-2) |
| `monkey3`, `monkey4` (`54`, `55-monkey*`) | Achicar el bucle ("llll"); inhibición (hojas) | ✓ | ✓ | ✓ | Hojas en `monkey3` | Monos en cada bucle | — |

### 4.13 Final y libreta

`06-map-finale` y `07-notebook-*`: el mapa se llena de animales y la libreta
guarda una página por caso. Es la meta visible del recorrido y no depende de
estrellas (`docs/19` §5). Después del final **no hay nada más**: ninguna puerta
lleva a las letras (P1-2).

### 4.14 Letras `f3-*` (fuera del recorrido)

| Paso (captura) | Qué entrena | Sin leer | Hablada | Dirección / arranque / parada | Frustración / ritmo | Recompensa | Hallazgo |
|---|---|---|---|---|---|---|---|
| `f3-l` (`56-f3-l`) | Bucle alto de la `l` con trazo de entrada, en el renglón | ✗ hoja blanca, botones con texto, "Mirá cómo se hace" escrito | ✓ la consigna sí se oye (`LevelPlay.tsx:2752`) | ✓ punto verde, flecha, rombo final | Resultado con números y estrellas, solo escrito | Ninguna en la historia | P1-1 |
| `f3-a` (`57-f3-a`) | Óvalo antihorario de la `a` | ✗ | ✓ "Girá para este lado…" (depende de ver la demo) | ✓ | Ídem | Ídem | P1-1; P3-2 |
| `f3-m` (`58-f3-m`) | Puentes de la `m` | ✗ | ✓ | ✓ | Ídem | Ídem | P1-1 |
| `f3-o` (`59-f3-o`) | Óvalo de la `o` con salida arriba | ✗ | ✓ "cerrá la o arriba" | ✓ salida alta marcada | Ídem | Ídem | P1-1 |

---

## 5. Hallazgos priorizados

**P1** frena el aprendizaje o enseña mal un trazo · **P2** perjudica la
comprensión o la motivación · **P3** pulido. Esfuerzo: **S** horas, **M** uno o
dos días, **L** más.

### 5.1 P1 — pedagógicos

**P1-1. La pantalla de letras no está lista para un niño que no lee, y su
puntaje premia un trazo en zigzag.**

- *Qué.* En `f3-*` todo lo que no es la consigna está escrito: botones "Borrar",
  "Ver de nuevo", "Siguiente", el resultado "Precisión 52 · Sentido ✓ · Fluidez 85"
  y el consejo "Quedate adentro del camino, despacito.". El consejo no se dice
  en voz alta. Un trazo que recorre la letra en orden pero con un zigzag lateral
  de hasta 55 píxeles a cada lado obtuvo **dos estrellas** (Sentido y Fluidez) en las cuatro
  letras; solo la Precisión lo frenó.
- *Evidencia.* `56-59-f3-*-1024x768-d-imperfect.png`; LOG:1778, 1804, 1830, 1856.
  Código:
  - Sentido: una zona se activa cuando la punta del dedo cae dentro de un
    círculo y en orden (`canvas/validation/checkpoints.ts:74-98`); el radio de
    cada círculo es de 35 a 60 unidades (`letters/svgLetter.ts:702-704`), y en
    estas cuatro letras queda entre 53 y 57. Un zigzag que avanza en orden las toca todas.
  - Fluidez: mide solo la regularidad de la **velocidad**
    (`canvas/validation/fluency.ts:64-85`). Un zigzag a velocidad pareja puntúa
    alto; un trazo limpio con eventos irregulares puntúa bajo. Eso explica
    Fluidez 32 a 47 en apaisado y 81 a 97 en vertical para el mismo trazo
    limpio (LOG:1779 y 1783).
  - El consejo nunca se habla: `resultSpeechLine` devuelve `null` en estos
    niveles (`screen/LevelPlay.tsx:480-489`).
- *Por qué importa.* `docs/01` §6 define la Fluidez como lo que separa escribir
  de dibujar; tal como está medida, no lo separa. En la etapa de letras el
  sentido y la continuidad son la lección (C4, C5, C6), y una estrella sobre un
  trazo que no es la letra refuerza justo lo que la app quiere corregir.
  Además el resultado depende del equipo, y las tablets de una escuela no son
  todas iguales.
- *Alcance hoy.* Ningún niño llega a `f3-*` (P1-2), así que no hace daño
  todavía; bloquea construir la etapa de letras sobre este puntaje.
- *Esfuerzo.* M–L.

**P1-2. No hay puente entre el zoológico y la letra.**

- *Qué.* El recorrido termina con los monos (`zoo/journey.ts:45-72`); los
  niveles `f3-*` solo se abren con un enlace de desarrollo (LOG:1764). Ningún
  nivel del recorrido usa el renglón ni achica el trazo hacia el tamaño de la
  letra: todos los caminos miden de 150 a 400 unidades de alto (`docs/21` §3.2.8).
- *Evidencia.* `zoo/journey.ts:45-72`; `06-map-finale`; `docs/21` §4.4 ("El
  puente al renglón", sin diseñar).
- *Por qué importa.* El objetivo del proyecto es la cursiva escolar
  (`docs/01` §2). `docs/21` §3.3 ya advierte que la práctica sensoriomotriz sola
  transfiere poco y que lo que funciona es la enseñanza explícita de la letra
  (citado de memoria allí; no verificado en esta revisión). El recorrido actual
  prepara bien el gesto, pero el niño nunca ve ese gesto convertirse en letra.
- *Esfuerzo.* M–L, y depende de decisiones de historia (§7, tanda 4).

No se encontró **ningún trazo enseñado al revés** en el recorrido: las ondas,
puentes, guirnaldas y picos van de izquierda a derecha; los óvalos de las
tortugas giran en sentido antihorario y se enlazan arriba; los bucles de los
monos suben por la derecha y giran a la izquierda, como la `l`; los bucles de
`f2-buceo` bajan y giran a la izquierda, como la cola de la `g` (§4.9–§4.12).
La única excepción de dirección es P2-4.

### 5.2 P2 — pedagógicos

**P2-1. Las correcciones no se escuchan y el reinicio es mudo.**

- *Qué.* Se habla la consigna y el festejo, pero no la corrección: "Seguí
  limpiando el vidrio.", "Encontraste 0 de 2. Volvé a alumbrar las luces que
  faltan." y los consejos de las letras son solo texto. En los niveles del
  mundo del detective y en los de juntar, tocar el borde borra el trazo y
  vuelve el recorrido al inicio sin texto, sin voz y sin sonido; el aviso
  "Volvé a empezar" solo existe fuera de ese mundo.
- *Evidencia.* LOG:107, 149, 728, 753, 778; `screen/LevelPlay.tsx:480-489`
  (solo se habla el éxito), `:2862-2890` (`restartRun`), `:4674-4707` (el aviso de
  reinicio está dentro de `!drawnPlace && !collectDef`). El reinicio por borde
  está activo en los seis niveles del pato, `sheep-hill1`–`4` y
  `llama-peak1`–`4` (`levels/catalog.ts`, `resetOnContact: true`). La captura
  `12-sheep-hill1-…-d-imperfect.png` no sirve como prueba (§2.3); la prueba es
  el código.
- *Por qué importa.* C2, C3 y C9: si el niño no sabe por qué se borró su trazo,
  el reinicio se vive como un fallo arbitrario. `docs/18` §3 ("Todo se
  escucha") ya lo planteó para las consignas.
- *Esfuerzo.* S.

**P2-2. Las entradas revelan la respuesta de la deducción.**

- *Qué.* De seis casos, cinco nombran o muestran al animal antes de juntar las
  pistas: pato ("El pato se fue por la laguna"), peces ("Los peces se
  escaparon…"), monos ("Los monos se escaparon…") lo dicen; ovejas y tortugas lo
  muestran en el globo. Solo la noche guarda el misterio.
- *Evidencia.* `zoo/adventures.ts:233, 257, 453, 491, 516`; LOG:277, 449, 1187,
  1449, 1597 frente a LOG:430, 578, 1316, 1578, 1726; capturas
  `12-intro-duck`, `13-intro-sheep`, `19-intro-fish`, `21-intro-turtles`,
  `22-intro-monkeys`.
- *Por qué importa.* `docs/19` §2.1 sacó la silueta de la barra durante las
  pistas porque "si ya lo muestra, no hay nada que deducir". La entrada hace lo
  mismo. La deducción de comparar huellas sigue entrenando discriminación
  visual, pero el "¿quién fue?" deja de ser una pregunta.
- *Esfuerzo.* S. Es una decisión de guion.

**P2-3. Recorrido largo y repetitivo para la edad.**

- *Qué.* 55 niveles y 6 deducciones. Hay 13 niveles de onda (pato 5, delfines 4,
  víboras 4) y 8 de picos (ovejas y llamas, el mismo generador). `dolphin3` y
  `dolphin4` son 5 y 7 ondas con la pantalla en movimiento y una barra de 10 a
  16 casilleros.
- *Evidencia.* §4.2–§4.10; `docs/21` §2.1 y §2.2 ("de sobra", "repetida");
  `44-dolphin3`, `45-dolphin4`. Tiempo: `docs/21` §5 estimó 37 minutos para
  54 niveles; con 55, unos **38 minutos al primer intento y 49 a 57 con
  reintentos**. Es una estimación, no una medición.
- *Por qué importa.* C10 y C12: 12 a 18 minutos de tarea dirigida a los 6 años.
  El mapa después de cada aventura es una parada natural, pero el juego no
  propone parar. El cuarto nivel de la misma onda agrega poco aprendizaje
  (inferencia; la repetición con variación no tiene fuente verificada en R2).
- *Esfuerzo.* M. Hay decisiones de la autora.

**P2-4. La recta con dirección casi no aparece, y la vertical larga va al revés.**

- *Qué.* Solo `sheep-lana` (cinco postes, arriba→abajo) y `turtle-huellas`
  (horizontal) piden una recta con dirección. `snake3` es la única vertical
  larga y va de abajo hacia arriba, porque las cabezas están abajo. No hay
  cruces ni oblicuas.
- *Evidencia.* LOG:459, 1023, 1459; `31-snake3`; `docs/21` §3.1.4.
- *Por qué importa.* C4 y C7: por defecto los trazos van de arriba hacia abajo,
  y las rectas y la cruz son de las primeras formas del desarrollo (fuente
  secundaria). A los 6 años la mayoría ya las copia, así que el orden pesa más
  para los niños con dificultad.
- *Esfuerzo.* S para `snake3`; M para los cruces.

**P2-5. La primera frase del juego no se oye.**

- *Qué.* La lámina 0 del prólogo ("¡Hola! Soy el Pulpito…") aparece antes de
  cualquier toque, y el navegador no deja hablar sin un toque previo. Solo se
  oye si el niño toca el parlante.
- *Evidencia.* `screen/PrologueOpening.tsx:166-172`; `voice/narrator.ts:176-180`;
  `01-prologue-0`.
- *Por qué importa.* C2: es la presentación del personaje y del mundo.
- *Esfuerzo.* S.

**P2-6. La noche y la abeja empiezan sin mostrar el gesto.**

- *Qué.* `night2`, `night3` y `night4` abren en negro, sin la mano de
  demostración que tiene `night1`. La abeja no tiene demo.
- *Evidencia.* `21-night2`, `22-night3`, `24-night4` frente a `20-night1`;
  `33-36-bee*`; pendiente en `docs/18` §7, P5.
- *Por qué importa.* C3: mostrar antes de pedir. La consigna se oye y hay una
  pista a los ~15 s (T33), pero una pantalla negra y en silencio después de la
  voz es el momento de más duda del recorrido.
- *Esfuerzo.* S–M.

### 5.3 P3 — pedagógicos

- **P3-1. Espinas en todas las direcciones.** El erizo pide trazos radiales
  "hacia afuera", incluso hacia arriba y hacia la izquierda. Está bien como
  arranque y freno; no entrena una dirección de letra. No cambiar nada por
  ahora. Esfuerzo: —.
- **P3-2. "Girá para este lado".** La consigna de `f3-a` (LOG:1796) solo se
  entiende mirando la demo. Mejor nombrar el lado: "girá para atrás, como la
  tortuga", que conecta con `turtle1`. Esfuerzo S.
- **P3-3. La precisión no se ve en ningún lado.** En los niveles de juntar la
  precisión se mide pero no decide (`docs/19` §2.2, regla 5), y no hay una
  vista para la docente. Es coherente con el aprendizaje sin error (C9); se
  anota para cuando lleguen las cuentas. Esfuerzo M, más adelante.

### 5.4 Defectos visuales y de interfaz

| ID | Qué | Evidencia | Prioridad | Esfuerzo |
|---|---|---|---|---|
| V1 | El ícono del botón "Ir al mapa" del prólogo pisa la "I" | `01-03-prologue-*-1024x768-a-before.png` | P3 | S |
| V2 | Globo de entrada de las tortugas: "seguimos?" queda solo, debajo del dibujo | `21-intro-turtles-1024x768-a-before.png` | P3 | S |
| V3 | Barra de `dolphin4` con ~16 casilleros, cortada en los dos bordes en vertical | `45-dolphin4-768x1024-a-before.png` | P3 | S |
| V4 | En vertical, el 40 % de abajo queda vacío en muchos niveles | `46-turtle-huellas-768x1024-a-before.png`, `33-bee1-768x1024-a-before.png`, `32-snake4-768x1024-a-before.png` | P3 | M |
| V5 | Texto pequeño en el globo de las deducciones (se oye, así que pesa poco) | `39-44-deduccion-*-1024x768-a-before.png` | P3 | S |
| V6 | La pantalla de letras es otro juego: hoja blanca, botones de texto, sin Pulpito | `56-59-f3-*-1024x768-a-before.png` | parte de P1-1 | — |

---

## 6. Comparación con buenas prácticas

### 6.1 Lo que el juego ya hace bien

| Práctica | Evidencia en el juego | Fuente |
|---|---|---|
| La consigna se oye en cada nivel, entrada, cierre y deducción | `LevelPlay.tsx:2752`; `useNarration` en `AdventureIntro`, `AdventureClosing`, `Deduction` | C2, C3 |
| Se muestra antes de pedir: demo en casi todos los caminos | Líneas azules o blancas en `05-duck-trail1`, `47-turtle1`, `51-monkey1` | C3 |
| Consignas que dicen arranque, sentido y freno | `sheep-lana`, `f2-guirnalda`, `turtle1` (LOG:459, 1197, 1483) | C3, C5 |
| Izquierda→derecha en todo camino; giros coherentes por familia | §4.2–§4.12 | C4 |
| Formas en el orden de la cursiva: puentes, ondas, guirnaldas, óvalos, bucles, cambio de forma | `docs/21` §2.2; `monkey-lianas` | C13 |
| Nada castiga: sin rojo, sin sonido de error, lo juntado queda | `docs/01` §5; `docs/19` §5.4; T35 | C9 |
| El corredor se ensancha solo tras tres fallos | `game/adaptiveTolerance.ts:13, 64-67` | C9 |
| Ayuda al niño trabado: aviso suave a los ~6 s sin tocar | T33 | C9 |
| Inhibición: frenar a propósito antes de un obstáculo | T41, siete niveles | `docs/01` §4 |
| La recompensa es el efecto del trazo en la historia | Víboras que recuperan el color, tortugas que se asoman, el animal que vuelve al mapa, la libreta | C11 |
| Estrellas ocultas en esta etapa | `STARS_VISIBLE_IN_HUD = false` (`zoo/stars.ts:28`) | C11 |
| Pasos hacia "sin corredor" | `night-rastro` (corredor invisible), abeja | C8 |
| Discriminación de formas parecidas | Deducción de huellas (`42-deduccion-turtles-…-b-aftertap.png`) | `docs/21` §3.2.9 |

### 6.2 Dónde se aparta

| Práctica | Qué pasa hoy | Hallazgo |
|---|---|---|
| Toda corrección se oye (C2) | Las correcciones son texto; el reinicio es mudo | P2-1 |
| Calcar, después copiar, después de memoria (C8) | Todo el recorrido es calcar con corredor completo; no hay modelo al lado ni memoria | P1-2 |
| Las formas nuevas siguen el orden de desarrollo (C7) | El primer camino guiado es un puente; las rectas llegan tarde y no hay cruces | P2-4 |
| Arriba→abajo por defecto (C4) | `snake3` de abajo hacia arriba | P2-4 |
| Sesión de 15 a 30 minutos con paradas (C12) | Unos 38 minutos al primer intento; el juego no propone parar | P2-3 |
| Repetición con variación (C10) | Cuatro ondas seguidas en el pato; delfines repiten la onda | P2-3 |
| La historia le da sentido al trazo (C11) | Se cumple, salvo que el misterio se revela antes | P2-2 |
| Feedback que distingue escribir de dibujar (`docs/01` §6) | La Fluidez mide velocidad, no forma | P1-1 |
| Transferencia al papel (C15) | No hay ninguna actividad en papel (`docs/21` §3.3) | Tanda 5 |

### 6.3 Qué afirmaciones no tienen fuente verificada

- **Giro antihorario de los óvalos.** `docs/01` §8 lo establece y el juego lo
  respeta, pero R2 no encontró una fuente que lo diga (research-r2 §1). Es la
  convención habitual de la cursiva, no un dato verificado aquí.
- **Orden de Beery.** Viene de folletos de terapia ocupacional, no del manual.
- **Repetición con variación** y **dificultad adaptativa en juegos de trazo**:
  sin evidencia encontrada; son inferencias de diseño.
- **Trazo de entrada desde el renglón** (`f3-l`, `f3-o`) y **cuaderno de doble
  pauta**: sin fuente argentina; depende de cómo enseñe la escuela (pregunta 1).
- **Fuentes de `docs/21` §7** (Santangelo y Graham, Hoy y otros): citadas de
  memoria en ese documento; esta revisión no las verificó.

---

## 7. Propuesta concreta

Cada ítem se aprueba o se rechaza solo. **[Arreglo]** = evidente, no cambia la
historia. **[Autora]** = decisión de guion, historia o arte. Ningún ítem pide
arte nuevo salvo donde se indica; los pedidos de arte, si se aprueban, van en un
`docs/24_…` aparte.

### Tanda 1 — Arreglos evidentes, sin arte

| # | Cambio | Niveles | Efecto esperado | Esfuerzo | Tipo |
|---|---|---|---|---|---|
| 1.1 | Decir en voz alta las correcciones que hoy son texto | Limpieza, noche, `f3-*` | El niño entiende qué falta sin leer (P2-1) | S | [Arreglo] |
| 1.2 | Al reiniciar por el borde: un sonido suave y el aviso de dónde volver a empezar (el mismo del aviso de inactividad, T33) | Los seis del pato; `sheep-hill1`–`4`; `llama-peak1`–`4` | El reinicio deja de parecer arbitrario (P2-1). La frase, si hay, la aprueba la autora | S | [Arreglo] |
| 1.3 | Un toque de inicio grande antes de la lámina 0, para que se oiga | Prólogo | La presentación se escucha (P2-5) | S | [Arreglo] |
| 1.4 | Mostrar la mano de demostración en `night2`–`4` y una demo en la abeja | Noche, abeja | Menos duda en pantalla negra (P2-6; `docs/18` P5) | S–M | [Arreglo] |
| 1.5 | Corregir V1, V2, V3 y V5 | Prólogo, entrada tortugas, `dolphin4`, deducciones | Pulido | S | [Arreglo] |
| 1.6 | Guardar la duración de cada intento (`docs/21` §5) | Todos | Medir sesiones reales en vez de estimar | S | [Arreglo] |

### Tanda 2 — Guion, sin arte nuevo

| # | Cambio | Niveles | Efecto esperado | Esfuerzo | Tipo |
|---|---|---|---|---|---|
| 2.1 | Entradas que no nombren ni muestren al animal: el globo muestra la pista (lana, huella, burbuja) y la frase habla de "alguien" | Pato, ovejas, peces, tortugas, monos | La deducción vuelve a ser un misterio (P2-2). El arte de las pistas ya existe | S | [Autora] |
| 2.2 | `snake3` con las cabezas arriba: acariciar de arriba hacia abajo | `snake3` | La vertical larga va en la dirección de la letra (P2-4). Verificar que el dibujo rotado se lea bien | S–M | [Autora] |
| 2.3 | Una parada propuesta: después de dos o tres aventuras, el Pulpito dice que sigue mañana y el mapa queda guardado | Recorrido | Sesiones de 12 a 18 minutos (P2-3, C12). Alternativa: que lo decida la docente | M | [Autora] |

### Tanda 3 — Menos repetición, las formas que faltan

Reemplaza niveles, no suma: la duración total no crece. Las tres ideas ya están
anotadas en `docs/21` §4.4; esta revisión recomienda hacerlas antes de sumar
otros niveles.

| # | Cambio | Niveles | Efecto esperado | Esfuerzo | Tipo |
|---|---|---|---|---|---|
| 3.1 | Delfines con zigzag real (`triangularWave` existe), y `dolphin4` más corto | `dolphin1`–`4` | Entrenan `v w` y dejan de repetir la onda del pato (P2-3) | M | [Autora] |
| 3.2 | Dos niveles de llamas con cruces `+` y `X` (cerca de palos cruzados) | `llama-peak2`, `llama-peak3` | Aparecen la cruz y las oblicuas (P2-4, C7) | M; **arte nuevo**: la cerca de palos cruzados | [Autora] |
| 3.3 | Un pato con menos ondas: dejar cuatro niveles en vez de seis | `duck-trail2`, `duck-trail6` | Menos repetición; la pista de cada uno pasa a otro nivel | S | [Autora] |

### Tanda 4 — El puente a la letra (recomendación central)

Primero se arregla la medición; después se construye encima.

| # | Cambio | Niveles | Efecto esperado | Esfuerzo | Tipo |
|---|---|---|---|---|---|
| 4.1 | Revisar el puntaje antes de usarlo: Sentido con zonas más chicas que la letra y detección de idas y vueltas; Fluidez que mire también los cambios bruscos de dirección, no solo la velocidad; calibrar en dos o tres tablets reales | `f3-*`, y lo que venga | Una estrella vuelve a significar lo que dice (P1-1) | M–L | [Arreglo] |
| 4.2 | Un nivel puente al final de cada familia: la misma forma más chica, con la pauta de tres zonas asomando en la escena (`docs/21` §4.4) | Tortugas (`o`), monos (`l`), pato (`m`), peces (`u`) | El gesto conocido se apoya en el renglón (P1-2) | M | [Autora] |
| 4.3 | La pantalla de letras dentro del mundo: sin números ni texto, botones con íconos, el Pulpito reacciona y la corrección se oye; estrellas ocultas como en la preescritura | `f3-*` | Un niño que no lee puede usarla (P1-1, C2, C11) | M; **arte nuevo**: una página de libreta con renglón, si se elige 4.5 | [Autora] |
| 4.4 | Para cada letra, una secuencia corta: ver la demo con la descripción hablada → calcar con corredor → calcar sobre línea punteada → copiar con el modelo al lado → de memoria | `f3-*` y siguientes | Sigue la evidencia de calcar y después copiar (C8). El retiro de la guía ya existe (`guideLevelFor`, `LevelPlay.tsx:1813`) | M | [Arreglo] |
| 4.5 | Que las letras se escriban en la libreta del detective: los cierres ya dicen "¡Lo anoté en mi libreta!" | Etapa de letras | El niño escribe lo que el Pulpito anota: la escritura tiene un motivo dentro de la historia (C11) | M | [Autora] |
| 4.6 | Orden de letras por familia, empezando por las que el recorrido ya entrenó: `o a` (tortugas), `l e` (monos), `m n` (pato), `u` (peces). Las de salida alta (`o b v w`) con una señal propia para el enlace | Etapa de letras | Aprovecha lo ya practicado (C13, C14) | S de decidir | [Autora] |

**Qué no se recomienda:** sumar más niveles de preescritura antes del puente.
`docs/21` §3.3 ya llegó a la misma conclusión.

### Tanda 5 — Fuera de la pantalla

| # | Cambio | Efecto esperado | Esfuerzo | Tipo |
|---|---|---|---|---|
| 5.1 | Probar con 3 a 5 niños de primer grado, con la duración de la tanda 1.6 (`docs/18` P12) | Reemplaza las estimaciones de esta revisión por datos | M | [Autora] |
| 5.2 | Una hoja para imprimir por aventura con la misma forma, para lápiz (`docs/21` §3.3) | Empieza la transferencia al papel (C15) | M; **arte nuevo**: una lámina por familia | [Autora] |

---

## 8. Preguntas para la autora

1. ¿La escuela enseña la cursiva con trazo de entrada desde el renglón (como
   `f3-l` y `f3-o`) o arrancando directo en la letra?
2. ¿Cuánto dura una sesión real en el aula, y quién decide cuándo parar: la
   docente o el juego?
3. En los casos, ¿el animal debe ser un misterio hasta la deducción, o el niño
   puede confirmar lo que ya le dijeron?
4. ¿La etapa de letras sigue dentro de la historia del zoológico (la libreta del
   detective) o puede ser una pantalla aparte más sobria?
5. ¿Los niños usan en paralelo un cuaderno, y de qué tipo (renglón simple o
   doble pauta)?
