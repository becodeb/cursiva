# 21 — Qué se aprende antes de la cursiva, y qué falta

Escrito el 2026-09-27, después de la prueba en tablet de las tandas 4 y 5
(`odd/tasks/prewriting-stage-completion.md`, T42). **Es una propuesta para
decidir, no una especificación.** No se implementa nada hasta que la autora
la apruebe. Las decisiones están juntas en la §6.

El pedido de la autora:

> Pensá qué otra habilidad podrían practicar antes de llegar a la cursiva,
> porque en estos juegos estamos practicando la grafía, así que pensá qué
> cosas aprenden con estos niveles y cuáles les faltaría. Incluso creo que se
> pueden terminar muy rápido estos niveles, habría que hacer un par más pero
> después los pensamos, yo creo que más de los de descubrir qué animal es
> antes de tener que atraparlo.

Tres cosas para leer primero:

1. **Lo que falta, en diez líneas** → §1.
2. **Los niveles nuevos que se proponen** → §4.
3. **Qué hay que decidir** → §6.

El arte que piden estos niveles está en
`docs/22_PROMPTS_ARTE_PISTAS.md` (los ids `C…`).

---

## 1. En diez líneas

1. Hoy el recorrido tiene 48 niveles (4 del prólogo y 11 aventuras de 4) y 4
   deducciones. Un chico que pasa cada nivel al primer intento lo termina en
   unos **30 minutos** (§5). Una aventura dura 2 o 3 minutos, no los 5 a 8
   que se buscaban en `docs/18` §3.
2. Lo que está bien cubierto: el brazo amplio, el recorrido de izquierda a
   derecha, las ondas, los picos, las guirnaldas en U, los óvalos
   antihorarios, los bucles que suben, los trazos radiales y el no levantar
   el dedo.
3. Hay **redundancia**: las ovejas y las llamas son el mismo generador
   (`peakRidge`) con picos de 320 y de 360 unidades. Son 8 niveles para una
   sola habilidad.
4. Faltan cuatro formas que la cursiva usa todo el tiempo: los **puentes**
   (∩, de la `m` y la `n`), los **bucles que bajan** (las colas de la `g`, la
   `j` y la `y`), la **espiral** y la **recta con dirección** (vertical de
   arriba abajo, horizontal, oblicuas, cruces).
5. Falta **cambiar de forma sin levantar el dedo** (bucle → guirnalda →
   bucle). Es lo más parecido al enlace de letras, y hoy cada nivel repite
   una sola forma.
6. Falta **arrancar en un punto y frenar en otro**, y seguir un trazo **sin
   corredor** (línea punteada, modelo al lado). Las dos cosas son lo que
   pide la letra.
7. Los generadores de los puentes (`hills`), de la espiral (`spiral`) y del
   zigzag (`triangularWave`) **ya existen**; los niveles que los usan
   (`f2-colinas`, `f1-espiral`) están en el catálogo pero fuera del
   recorrido.
8. Se proponen **cuatro niveles de pistas** dentro de los cuatro casos que ya
   existen (pato, noche, peces, monos), cada uno con una forma que falta.
   No cambian la estructura: más descubrir antes de atrapar.
9. Y **dos casos nuevos** (ovejas y tortugas), con una deducción de otra
   forma. Chocan con la regla de `docs/19` "nunca dos deducciones seguidas":
   es la decisión 1.
10. Con la propuesta, el recorrido pasa a unos **37 minutos**. Más niveles
    no es el objetivo: la práctica escrita de verdad (§2.3) importa más que
    alargar esta etapa.

---

## 2. Qué entrena cada nivel hoy

### 2.1 La tabla

Medido sobre `client/src/levels/catalog.ts` y `client/src/zoo/adventures.ts`
en `main` (`ba38ab2`). "Corredor" es el ancho del camino en unidades de la
hoja (1000 × 600). El orden es el de `zoo/journey.ts`.

| # | Nivel | Forma del trazo | Habilidad principal | También entrena |
|---|---|---|---|---|
| 1 | `glass1` | Borrar libre (grilla 10×6) | Movimiento amplio de brazo | Acción → consecuencia, cubrir superficie |
| 2 | `sand1` | Barrer libre (10×6) | Movimiento amplio de brazo | Barrido de un lado a otro |
| 3 | `glass3` | Borrar libre (15×9), hojas en los rincones | Búsqueda intencional | Llegar a los bordes y rincones |
| 4 | `sand3` | Barrer libre (20×12, radio chico) | Barrido ordenado y completo | Control del ritmo del barrido |
| 5 | `duck-trail1` | Una onda amplia (amplitud 170), corredor 100 | Ondulación continua de izquierda a derecha | Discriminación visual (pistas: gotas, maíz) |
| 6 | `duck-trail2` | Dos ondas, corredor 90 | Repetir la onda con ritmo | Pistas: pluma, huella palmeada |
| — | Deducción del pato | Tocar una de tres siluetas | Razonamiento por descarte | Relacionar pista y animal |
| 7 | `duck-trail3` | Ondas de amplitud variada, corredor 80 | Regular la amplitud | Juntar patos en las crestas; **inhibición**: esperar al pez (T41) |
| 8 | `duck-trail4` | Tres ondas, corredor 70 | Precisión en un espacio más chico | Juntar |
| 9 | `sheep-hill1` | Dos picos de 320, corredor 100 | Subir y bajar con cambio de dirección | Juntar ovejas en los picos |
| 10 | `sheep-hill2` | Tres picos iguales, corredor 90 | Repetición del pico | — |
| 11 | `sheep-hill3` | Alto, bajo, alto | Regular la altura | **Inhibición**: esperar a la piedra (T41) |
| 12 | `sheep-hill4` | Alto-bajo-alto-bajo, corredor 60 | Precisión | — |
| 13 | `llama-peak1` | Un pico de 360, corredor 90 | Cambio de dirección marcado | Es casi el mismo trazo que `sheep-hill1` |
| 14 | `llama-peak2` | Pico alto y pico bajo | Regular la altura | Repite `sheep-hill3` |
| 15 | `llama-peak3` | Tres picos iguales | Repetición | Repite `sheep-hill2`; **inhibición**: esperar a la piedra (T41) |
| 16 | `llama-peak4` | Cuatro picos, corredor 60 | Precisión | Repite `sheep-hill4` |
| 17 | `night1` | Linterna libre, 1 objeto | Búsqueda visual (figura-fondo) | Movimiento lento y exploratorio |
| 18 | `night2` | Linterna, 2 objetos | Barrido visual sistemático | — |
| 19 | `night3` | Linterna, 2 objetos | Barrido visual sistemático | — |
| — | Deducción de la noche | Siluetas con descarte de los ya rescatados | Razonamiento por descarte | Memoria de lo ya hecho |
| 20 | `night4` | Linterna chica | Velocidad baja sostenida | Encontrar al erizo |
| 21 | `hedgehog1` | Espinas cortas sobre la bola (8) | Trazo radial desde un punto | Levantar y reponer el dedo |
| 22 | `hedgehog2` | Más espinas sobre la bola | Arrancar en una marca | Trazos sueltos |
| 23 | `hedgehog3` | Espinas sobre el lomo, de perfil | Ángulo propio de cada trazo | — |
| 24 | `hedgehog4` | Espinas cortas y juntas | Trazo corto y preciso | Freno al final de cada espina |
| 25 | `snake1` | Tres cuerpos ondulados acostados, corredor 38 | Precisión fina en una onda | Seriación (de la más chica a la más grande) |
| 26 | `snake2` | Los mismos, en otro orden, corredor 34 | Seriación: encontrar la más chica | — |
| 27 | `snake3` | Víboras paradas, de abajo arriba, corredor 30 | Orientación vertical | Dirección de abajo arriba |
| 28 | `snake4` | Acostadas, corredor 28 | El corredor más angosto del juego | — |
| 29 | `bee1` | Camino libre hasta una flor y el panal | Planificar un recorrido | Trazo sin corredor |
| 30 | `bee2` | Tres flores | Planificar con paradas | — |
| 31 | `bee3` | Trayecto largo | Sostener un trazo libre | **Inhibición**: esperar a la hoja (T41) |
| 32 | `bee4` | Flores más chicas | Precisión de llegada | — |
| 33 | `f2-guirnalda` | Tres U (guirnalda), corredor 100 | Guirnalda sin levantar el dedo | Pistas: burbujas |
| 34 | `f2-agua2` | Cuatro U bajitas, corredor 80 | Repetir la U con ritmo | Pistas: gotas |
| — | Deducción de los peces | Carteles de los recintos | Relacionar pista y lugar | Exposición a la palabra escrita |
| 35 | `f2-agua3` | U de ancho y hondura variados, corredor 68 | Regular el tamaño de la U | Juntar peces |
| 36 | `f2-agua4` | Tres U con una estrella de mar que cruza | **Inhibición**: frenar y esperar | Juntar peces |
| 37 | `dolphin1` | Dos ondas (amplitud 160), corredor 110 | Onda sostenida | Juntar delfines |
| 38 | `dolphin2` | Tres ondas | Onda sostenida | — |
| 39 | `dolphin3` | Cinco ondas, la pantalla se desplaza | Sostener el ritmo en un trazo largo | — |
| 40 | `dolphin4` | Siete ondas | Resistencia del trazo continuo | — |
| 41 | `turtle1` | Un óvalo antihorario | Giro antihorario cerrado (familia Ola: `c a d g q o`) | Cerrar la forma |
| 42 | `turtle2` | Dos óvalos seguidos | Enlazar dos giros sin levantar | — |
| 43 | `turtle3` | Tres óvalos más angostos | Achicar el giro | **Inhibición**: esperar a dos caracoles (T41) |
| 44 | `turtle4` | Cuatro óvalos ("oooo") | Giro chico y repetido | — |
| 45 | `monkey1` | Dos bucles que suben | Bucle ascendente que se cruza (familia Rulo: `e l b h k f`) | Pistas: huellas |
| 46 | `monkey2` | Tres bucles | Repetir el bucle | Pistas: "banana" |
| — | Deducción de los monos | Siluetas con descarte | Razonamiento por descarte | — |
| 47 | `monkey3` | Cuatro bucles, corredor 80 | Achicar el bucle | Juntar monos; **inhibición**: esperar a dos hojas (T41) |
| 48 | `monkey4` | Cuatro bucles ("llll"), corredor 70 | Bucle chico y repetido | Juntar monos |

**Cosas que se ven en la tabla y no son habilidades:**

- Los delfines son **ondas** en el código (`wave`), no el zigzag que piden
  `docs/13` §2 y `docs/19` §3. Entrenan lo mismo que el pato, más largo.
- `duck-trail2` se llama "El sendero de migas" y `duck-trail3` "Las burbujas
  suben y bajan", pero el primero junta plumas y huellas y el segundo, patos.
  La consigna habla de algo que el chico no ve (T40 toca estos niveles).
- En `monkey1` la pista es una huella de **pájaro** de tres dedos, y en
  `monkey2` la consigna dice "la banana que se les cayó" pero se junta un
  grano de maíz. Ver `docs/22` §1.

### 2.2 Cobertura por habilidad

| Habilidad | Niveles | Cobertura |
|---|---|---|
| Movimiento amplio de brazo | prólogo, pato, delfines | buena |
| Izquierda → derecha | casi todos los caminos | buena |
| Onda | pato, víboras, delfines (12) | **de sobra** |
| Picos (subir y bajar con ángulo) | ovejas, llamas (8) | **de sobra**, repetida |
| Guirnalda (U) | peces (4) | buena |
| Óvalo antihorario | tortugas (4) | buena |
| Bucle ascendente | monos (4) | buena |
| Trazo radial, trazos sueltos | erizo (4) | buena |
| Búsqueda y barrido visual | noche, prólogo | buena |
| Inhibición (frenar a propósito) | `duck-trail3`, `sheep-hill3`, `llama-peak3`, `bee3`, `f2-agua4`, `turtle3`, `monkey3` (7) | buena desde T41; sin obstáculo: noche, erizo, víboras y delfines (ver T41) |
| Planificar un recorrido libre | abeja (4) | buena |
| Seriación | víboras (4) | buena |
| Puentes (∩) | ninguno | **falta** |
| Bucle que baja | ninguno | **falta** |
| Espiral | ninguno (`f1-espiral` está fuera del recorrido) | **falta** |
| Recta con dirección y cruces | ninguno | **falta** |
| Cambiar de forma en un mismo trazo | ninguno | **falta** |
| Punto de inicio y parada | erizo (en parte) | escasa |
| Seguir un trazo sin corredor | abeja (sin modelo) | **falta** |
| Achicar hacia el tamaño de la letra | ninguno | **falta** |
| Discriminar formas parecidas | ninguno (las deducciones distinguen objetos, no formas) | escasa |

---

## 3. Lo que falta, y por qué importa

Cada ítem dice qué es, dónde aparece después en la cursiva y en qué se
apoya. Las fuentes están en la §7; lo que no pude verificar va marcado.

### 3.1 Formas que la cursiva usa y el juego no

1. **Puentes (∩∩∩).** El arco que sube, gira arriba en sentido horario y
   baja. Es la familia Colina de `docs/01` §8 (`m n v w`) y el arranque de
   la `r`. La guirnalda (U) es su espejo y no la reemplaza: el giro es el
   contrario. El generador existe (`hills()`, usado en `f2-colinas`, fuera
   del recorrido).
2. **Bucles que bajan.** Las colas de la zona baja (`g j p q y`,
   `docs/01` §7). Los monos solo hacen bucles que suben. Probablemente sale de
   `loops()` espejado (`yTop` por debajo de `yBase`); hay que verificarlo con
   los tests del generador.
3. **Espiral.** Estaba en el plan (`docs/13` §2, "Caracol") y quedó sin
   consigna. Entrena achicar un giro sin cortarlo. `spiral()` y `f1-espiral`
   existen.
4. **La recta con dirección, y los cruces.** Vertical de arriba abajo,
   horizontal de izquierda a derecha, las dos oblicuas, la cruz `+` y la
   cruz `X`. La secuencia de copia de formas del test de Beery (VMI) las pone
   en ese orden, y copiar bien las nueve primeras formas se asoció con una
   mejor copia de letras en jardín de infantes (Weil y Cunningham Amundson,
   1994). En el juego, las espinas del erizo son rectas pero salen del
   centro hacia afuera en cualquier dirección; nadie pide "de arriba abajo".

### 3.2 Control que la letra pide y el juego todavía no

5. **Cambiar de forma sin levantar el dedo.** Onda → bucle → guirnalda en
   un mismo trazo. Es la anticipación del enlace, el núcleo de la Fase 4
   (`docs/01` §4). Hoy cada nivel repite una sola forma; lo máximo es variar
   la amplitud (`duck-trail3`, `f2-agua3`).
6. **Arrancar en un punto y frenar en otro.** Toda letra tiene un punto de
   inicio y un sentido (`docs/01` §5, "un trazo con la forma correcta hecho
   al revés es un error"). Lo entrena en parte el erizo; T41 suma paradas.
7. **Seguir un trazo sin corredor.** El paso intermedio entre el camino con
   paredes y la letra de memoria es la línea punteada o el modelo al lado.
   `docs/03` §3 prevé retirar la guía desde la Fase 3, pero no hay un paso
   previo. Salvo la abeja (sin modelo), todos los niveles del recorrido
   tienen corredor.
8. **Achicar hacia el tamaño de la letra.** Todos los caminos miden de 150 a
   400 unidades de alto, a propósito (`docs/01` §4, el brazo). Falta el
   puente hacia la banda de 120 unidades de la zona media, que es donde vive
   la letra.
9. **Discriminar formas parecidas.** Las deducciones distinguen objetos
   (una pluma de un grano), no formas cercanas. Distinguir una huella
   palmeada de una de tres dedos, o una forma de su espejo, prepara `b/d` y
   `p/q`.

### 3.3 Lo que la app no puede entrenar

10. **La prensión del lápiz, la presión y la postura.** El dedo sobre el
    vidrio no es el lápiz sobre el papel. Hay trabajos que encontraron
    diferencias en el trazo de los chicos chicos entre tablet y papel
    (Alamargot y Morin, 2015; Gerth y otros, 2016). `docs/01` §2 promete
    transferencia al papel, pero hoy no hay ninguna actividad en papel.
    **Propuesta mínima**: una hoja para imprimir por aventura, con la misma
    forma para hacer con lápiz. Queda fuera de este documento.
11. **Una advertencia, con evidencia.** Las revisiones de intervenciones
    en escritura encuentran que la práctica sensoriomotriz sola, sin
    escribir, transfiere poco, y que lo que funciona es la enseñanza
    explícita de la letra con práctica sostenida (Hoy, Egan y Feder, 2011;
    Santangelo y Graham, 2016). Consecuencia para el diseño: **cerrar los
    huecos de la §3.1 y la §3.2 con pocos niveles y pasar a las letras**, no
    alargar la etapa de preescritura con más de lo mismo.

---

## 4. Los niveles nuevos

### 4.1 La regla

- **Primero descubrir, después atrapar** (el pedido de la autora). Todos
  los niveles nuevos son de **pistas**: se juegan antes de la deducción de
  su aventura, y lo que se junta es una pista, no el animal.
- **Cada uno cierra un hueco de la §3**, nunca una habilidad que ya está de
  sobra. Por eso no hay ni una onda ni un pico nuevo.
- **Ids nuevos.** Los ids son claves guardadas: no se borra ni se
  reemplaza ninguno. Los de abajo son sugerencias.
- **Las mismas piezas del motor**: camino con pistas (`clue`), juntar
  (`collect`), paradas (T41), varios caminos por nivel (como las víboras) y
  la linterna. La columna "Motor" dice qué falta.

### 4.2 Nivel 1: dentro de los casos que ya existen (sin decisión de estructura)

No agregan deducciones: se suman a los niveles de pistas de los cuatro casos
de `docs/19` §2.3.

| # | Nivel (id sugerido) | Aventura y lugar | Habilidad que cierra | Forma del trazo | Pista que deja | Arte (`docs/22`) | Motor |
|---|---|---|---|---|---|---|---|
| N1 | `duck-charcos` | Pato, antes de la deducción | **Puentes ∩** (§3.1.1) | Cuatro puentes de izquierda a derecha, corredor 100. "El pato salió del agua a los saltitos, de charco en charco." | Un **charco** en el pie de cada puente | C1 charco | `hills()` existe. Juntar en los valles del puente: hay `troughs`, hay que confirmar que sirve para `hills` |
| N2 | `night-rastro` | Noche, antes de la deducción | **Seguir un trazo sin corredor** (§3.2.7) y barrido de izquierda a derecha | Una ondulación baja y larga de izquierda a derecha, **sin paredes**: la guía son huellitas que solo se ven bajo la linterna. Termina en una manzana | Una **huellita de erizo** cada tanto | C7 huellita de erizo, B12 manzana | Nuevo: la linterna sobre un nivel de camino, con el corredor invisible y las pistas como única guía. Tamaño M |
| N3 | `f2-buceo` | Peces, antes de la deducción | **Bucles que bajan** (§3.1.2) | Tres bucles hacia abajo desde una línea alta. "El pez bajó al fondo y volvió a subir." | Una **escamita** en el fondo de cada bucle | C6 escama | `loops()` espejado, a verificar. Juntar en el punto más bajo de cada bucle |
| N4 | `monkey-lianas` | Monos, antes de la deducción | **Cambiar de forma sin levantar** (§3.2.5) | Bucle, guirnalda, bucle, guirnalda, en un solo trazo (`l u l u`). "Subió a la liana, se hamacó, y subió a la otra." | Una **cáscara de banana** colgando de cada liana (`monkey1` pasa a dejar manitos, C8; `monkey2`, la banana entera, C12) | C11 cáscara de banana | Nuevo: un generador que encadene `loops` y `garland` (`garlandVaried` ya encadena tramos). Tamaño S |

Con N1–N4 cada caso pasa de 2 a 3 niveles de pistas (el pato, con T40,
puede tener más).

### 4.3 Nivel 2: dos casos nuevos (necesita la decisión 1)

| # | Nivel (id sugerido) | Aventura y lugar | Habilidad que cierra | Forma del trazo | Pista que deja | Deducción | Arte (`docs/22`) | Motor |
|---|---|---|---|---|---|---|---|---|
| N5 | `sheep-lana` | Ovejas, antes de `sheep-hill1` | **Recta vertical de arriba abajo, arranque y parada** (§3.1.4, §3.2.6) | Cinco postes del alambrado, cada uno un trazo de arriba abajo; se arranca en un punto y se frena en otro; entre poste y poste se levanta el dedo | Un **mechón de lana** enganchado en cada poste | "¿Quién deja lana?" Siluetas: oveja, gato y pato (el pato ya rescatado se descarta solo) | C9 lana | Varios caminos por nivel (existe, víboras) con pista por camino. Tamaño M |
| N6 | `turtle-huellas` | Tortugas, antes de `turtle1` | **Recta horizontal y frenar** (§3.1.4, §3.2.6) y **discriminar formas** (§3.2.9) | Una recta de izquierda a derecha (el surco de la cola), con tres paradas en el camino | Una **huella de tortuga** a cada lado del surco | Forma nueva: "¿De quién es esta huella?" Tres huellas para comparar: tortuga, pato (palmeada) y gallina (tres dedos) | C10 huella de tortuga, C3 huella de pato, `huella negra.png` (existe) | Paradas (T41). Deducción con huellas en vez de siluetas: `optionArt` ya existe en `detective/cases.ts` (los peces lo usan con carteles). Tamaño M |

N5 le da a las ovejas un trabajo propio y quita parte de la redundancia con
las llamas. N6 estrena una **cuarta forma de deducir** (comparar huellas), que
además entrena la discriminación visual de formas parecidas.

### 4.4 Para pensar después

La autora dijo "después los pensamos". Quedan anotados, sin diseñar:

- **La espiral del caracol** (§3.1.3). `f1-espiral` existe; falta la consigna
  (`docs/13` §2) y el lugar en el mapa.
- **Los cruces `+` y `X`** (§3.1.4). Una idea: la cerca de palos cruzados de
  la cordillera, en las llamas, que hoy repiten a las ovejas.
- **El puente al renglón** (§3.2.8): un último nivel por familia, más chico,
  con la pauta de tres zonas asomando. Es la entrada natural a las letras
  (`f3-*`).
- **El zigzag real de los delfines** (`triangularWave`, ángulos marcados),
  como pedían `docs/13` y `docs/19`. Entrena la `v` y la `w`, y le quita a los
  delfines la repetición de la onda del pato.

---

## 5. Tiempo de juego, hoy y con la propuesta

**Es una estimación, no una medición.** El juego no guarda cuánto tarda cada
nivel. Supone un chico que pasa cada nivel al primer intento; con reintentos,
sumar entre un 30 y un 50 %. Incluye la demo, la frase del Pulpito y la
transición (unos 10 s por nivel).

| Tramo | Niveles | Por nivel | Hoy | Con la propuesta |
|---|---|---|---|---|
| Prólogo (láminas, 4 recintos, cierre) | 4 | 30–40 s | 3 min | 3 min |
| Caminos de Fase 1 (pato, ovejas, llamas, delfines 1–2) | 14 | 20–30 s | 6 min | 6 min |
| Delfines 3–4 (pantalla que se desplaza) | 2 | 35–45 s | 1,5 min | 1,5 min |
| Noche (linterna) | 4 | 25–40 s | 2 min | 2 min |
| Erizo (8 a 12 espinas) | 4 | 40–60 s | 3,5 min | 3,5 min |
| Víboras (3 por nivel) | 4 | 35–45 s | 2,5 min | 2,5 min |
| Abeja | 4 | 25–40 s | 2 min | 2 min |
| Fase 2 (peces, tortugas, monos) | 12 | 25–40 s | 6,5 min | 6,5 min |
| Entradas y cierres de aventura | 22 | 8–10 s | 3,5 min | 3,5 min |
| Deducciones | 4 → 6 | 15–20 s | 1 min | 2 min |
| Niveles nuevos N1–N6 | 0 → 6 | 30–45 s | — | 4 min |
| **Total** | **48 → 54** | | **≈ 31 min** | **≈ 37 min** |

En sesiones de 10 a 15 minutos (`docs/18` §3), hoy son **2 o 3 sesiones**;
con la propuesta, 3. Para dejar de estimar: guardar la duración de cada
intento junto con la precisión y la fluidez (`game/types.ts`), y mirar el
dato después de una semana en el aula.

---

## 6. Decisiones para la autora

> **Decidido el 2026-10-02:** decisión 1 → **(a)**. Se hacen N5 y N6 y la regla de `docs/19` §2.3 pasa a "nunca la misma forma de deducir dos veces seguidas". C9 y C10 (`docs/22`) dejan de estar bloqueadas.

1. **Los casos nuevos de ovejas y tortugas (N5, N6).**
   - (a) Hacerlos, y cambiar la regla de `docs/19` §2.3 de "nunca dos
     deducciones seguidas" a "nunca **la misma forma** de deducir dos veces
     seguidas". El orden quedaría: pato (siluetas nuevas) → ovejas (siluetas
     con descarte) → … → peces (carteles) → delfines → tortugas (huellas) →
     monos (siluetas con descarte).
   - (b) Hacer solo N1–N4, sin deducciones nuevas.
   - **Recomiendo (a)**: la regla existía para que no se volviera
     repetitivo, y con cuatro formas de deducir ya no lo es. Pediste más de
     descubrir; (b) suma pistas pero no misterios.
2. **La pista de `f2-agua2`.** Hoy son gotas, que los peces no dejan fuera
   del agua.
   - (a) Escamitas naranjas (C6), del color del pez del cartel.
   - (b) Burbujas otra vez, como en `f2-guirnalda`.
   - **Recomiendo (a)**, con una duda: una escama suelta es menos conocida
     para un chico de 6 años que una burbuja. Si al verla no se entiende,
     (b).
3. **Por dónde empezar.** Recomiendo N4 (monos) y N1 (pato): cierran los dos
   huecos más cercanos a la letra (el enlace y el puente) y el motor casi no
   cambia. Después N3, N2, y N5–N6 si se aprueba la decisión 1.

---

## 7. Fuentes

Referencias que conozco y cito de memoria; no incluyo enlaces para no
inventarlos. Lo marcado con (a verificar) es algo de lo que no estoy seguro
en el detalle.

1. Beery, K. E. *The Beery-Buktenica Developmental Test of Visual-Motor
   Integration (VMI)*. Pearson. La secuencia de formas (vertical,
   horizontal, círculo, cruz, oblicuas, cuadrado, cruz oblicua, triángulo) y
   sus edades aproximadas salen del manual (edición a verificar).
2. Weil, M. J. y Cunningham Amundson, S. J. (1994). Relationship between
   visuomotor and handwriting skills of children in kindergarten. *American
   Journal of Occupational Therapy*, 48(11), 982–988.
3. Feder, K. P. y Majnemer, A. (2007). Handwriting development, competency,
   and intervention. *Developmental Medicine & Child Neurology*, 49(4),
   312–317.
4. Cornhill, H. y Case-Smith, J. (1996). Factors that relate to good and
   poor handwriting. *American Journal of Occupational Therapy*, 50(9),
   732–739.
5. Hoy, M. M. P., Egan, M. Y. y Feder, K. P. (2011). A systematic review of
   interventions to improve handwriting. *Canadian Journal of Occupational
   Therapy*, 78(1), 13–25.
6. Santangelo, T. y Graham, S. (2016). A comprehensive meta-analysis of
   handwriting instruction. *Educational Psychology Review*, 28(2), 225–265.
7. Rosenblum, S., Weiss, P. L. y Parush, S. (2003). Product and process
   evaluation of handwriting difficulties. *Educational Psychology Review*,
   15(1), 41–81. Sobre medir el proceso (pausas, tiempo en el aire), no solo
   el resultado.
8. Alamargot, D. y Morin, M.-F. (2015). Does handwriting on a tablet screen
   affect students' graphomotor execution? A comparison between Grades Two
   and Nine. *Human Movement Science*, 44, 32–41.
9. Gerth, S., Klassert, A., Dolk, T., Fliesser, M., Fischer, M. H., Nottbusch,
   G. y Festman, J. (2016). Is handwriting performance affected by the
   writing surface? *Frontiers in Psychology*, 7, 1308 (lista de autores a
   verificar).
10. Ajuriaguerra, J. de y otros (1964). *L'écriture de l'enfant*. En
    castellano, *La escritura del niño* (Laia). Las etapas precaligráfica y
    caligráfica, y los ejercicios de reeducación grafomotriz (edición a
    verificar).
11. Lurçat, L. (1974). *Études de l'acte graphique*. Mouton. Sobre la
    dirección y el sentido de giro en el trazo infantil (a verificar).
