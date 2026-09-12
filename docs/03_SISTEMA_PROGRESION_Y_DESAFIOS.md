# Sistema de Progresión y Motor de Desafíos

## 1. Nivelación invisible

No hay test de diagnóstico ni bloqueo rígido. El sistema mide **dominio acumulado** por nivel y por letra de forma continua, y usa esa medida para decidir qué proponer.

Un chico de 5º con buena motricidad barre las Fases 1 y 2 en una sesión. Uno de 1º las recorre completas. Nadie ve una pantalla que le diga "sos principiante".

## 2. Modelo de dominio (0 a 100)

Cada nivel y cada letra guarda su dominio. Los eventos lo mueven así:

| Evento | Δ Dominio | Efecto |
| :--- | :--- | :--- |
| Aprobado con guía visible | +20 | — |
| Aprobado con guía atenuada | +30 | — |
| Aprobado sin guía (de memoria) | +40 | letra marcada como **dominada** al llegar a 100 |
| Giro invertido detectado | −15 | animación de rescate, nunca cruz roja |
| Corte de trazo donde correspondía enlace | −10 | sugiere volver a un patrón de Fase 2 |
| Fluidez < 30 con precisión > 80 | 0 | **alerta de "dibujado"**: se repite el nivel pidiendo ritmo |

La última fila es la más importante del sistema. Un chico que copia la forma sin el movimiento no está progresando aunque el trazo se vea lindo, y el dominio no debe subir por eso.

## 3. Retiro progresivo de la guía

Es el mecanismo que fuerza el paso de control consciente a memoria motora. Dentro de un mismo nivel, la guía se degrada según el dominio:

```
dominio  0–40   ▸ guía completa + demostración animada + checkpoints visibles
dominio 40–70   ▸ guía punteada, sin demostración
dominio 70–90   ▸ solo el punto de inicio y una flecha de dirección
dominio 90+     ▸ solo los renglones (trazo de memoria)
```

**Qué es "dominio", concretamente.** Es `record.bestAccuracy`: la mejor precisión que el chico logró alguna vez en ESE nivel. Es la única cantidad persistida que vive en la misma escala 0-100 que los cortes de arriba, y la precisión es justamente lo que la guía sostiene — sacarla es sacar el andamio de la forma. La alternativa era `approvals`, y está mal: es un contador chico (con 2 ya se desbloquea el nivel siguiente, `APPROVALS_TO_UNLOCK`), así que mapearlo a 40/70/90 retiraría la guía de golpe o no la retiraría nunca.

Los bordes están escritos con guiones y 40/70/90 aparecen en dos filas cada uno, así que el corte es ambiguo en el cuadro. Se resuelve **inclusivo por abajo**: llegar al umbral ya gana la guía más liviana.

`showGuide: false` en el nivel gana por encima de todo y fuerza la banda vacía, tenga el chico el dominio que tenga. Es lo que mantiene a `f5-mama` como examen real de memoria motora.

**Los "checkpoints visibles" todavía no se dibujan.** La banda completa los pide y la implementación los omite a propósito. Lo único que hay hoy para mostrarlos es el overlay de desarrollo: una docena de círculos punteados y **numerados**, cada uno tan ancho como el canal. En `f3-a` se tragan la letra entera — la falla exacta que `docs/08` nombra ("el canal no puede tragarse la letra") — y sobre un laberinto de Fase 1 tapan las paredes. Además los números no los puede leer el chico al que apunta la app: si pudiera leerlos no haría falta la flecha. La idea de mostrar los hitos ordenados sigue en pie, pero necesita un dibujo pensado para el chico antes de ganarse un lugar en la hoja.

**Dónde vive.** `guideLevelFor(record, level)` en `screen/LevelPlay.tsx`, pura y exportada, devolviendo `'full' | 'dotted' | 'minimal' | 'none'`. De ese único valor cuelgan el canal, la línea de forma nítida, la demostración, los checkpoints visibles y hasta el punto verde: en `'none'` no queda ni el marcador de inicio ni la flecha, que es exactamente lo que dice la última fila del cuadro.


**Dónde se planta la flecha.** A una distancia fija del punto de inicio (70 unidades de hoja), nunca a un porcentaje del camino. Un porcentaje viaja con el largo del nivel: el 8% de `f3-m` cae todavía en el trazo de entrada, pero el 8% de `f5-mama` cae ~290 unidades adentro, pasada la primera arcada de la m y sobre una cúspide de la línea base donde la mano vuelve sobre sí misma. El chico tiene que recibir la misma pista en el mismo lugar, sea una letra o una palabra entera.

### 3.1 El retiro se aplica desde el Nivel 5 (Fase 3 en el código), nunca antes

En los Niveles 5 a 7 (Fases 3 a 5 en el código) la guía es **andamiaje**: la silueta de la
letra está dibujada para poder sacarla cuando el movimiento ya se recuerda. Sacarla es la
lección.

En los Niveles 1 a 4 (Fases 1 y 2 en el código) el canal **es el nivel**. La consigna entera es "quedate
adentro del camino", y las bolas y la regla de volver al inicio están definidas
contra ese canal. Sacarlo no sube la dificultad: borra el ejercicio y deja una
hoja en blanco con dos marcas. No hay nada que memorizar en un laberinto, así
que no hay nada que retirar.

Esto se descubrió jugando: un chico reportó que los laberintos "no se veían".
No era un problema de renderizado — era este retiro aplicado donde no
correspondía.

### 3.2 El retiro siempre se puede deshacer

`bestAccuracy` es un máximo monótono: una sola vez que se llega a 70, la guía se
va para siempre. Por eso hay un botón **"Ver la guía"** disponible siempre que
haya algo retirado. Restaura la guía completa para esa visita y no persiste
nada, así el nivel ganado sigue donde estaba la próxima vez.

Ganarse una guía más liviana no puede significar perder el derecho a pedir
ayuda.

## 4. Tolerancia adaptativa

El ancho del canal no es fijo:

- 3 fallos seguidos → canal ×1.25 (máximo ×2 acumulado).
- 2 aprobaciones seguidas → vuelve al ancho nominal.
- 3 aprobaciones seguidas en el ancho nominal → canal ×0.85 (mínimo ×0.7).

La app **nunca bloquea**. Se registra que el nivel necesitó ayuda; eso es dato para el docente, no un castigo para el chico.

## 5. Generador de sesión adaptativa

Cada vez que se entra a jugar, se compone una tanda de 4 a 6 desafíos con esta estructura fija, que replica la lógica de sesión corta y balanceada:

```
1. CALENTAMIENTO  (1 desafío)   nivel ya dominado de la fase anterior
2. NÚCLEO         (2 desafíos)  el nivel actual, sin dominar
3. PRÁCTICA       (1-2)         nivel con dominio 40-80, el más flojo
4. CIERRE         (1)           el mejor nivel del chico, para terminar ganando
```

Terminar la sesión con un logro y no con una frustración no es adorno motivacional: es lo que hace que el chico vuelva mañana, y la automatización motora depende de la frecuencia de práctica, no de la duración.

## 6. Modos de interacción por fase

| Modo | Fase | Qué hace |
| :--- | :--- | :--- |
| **Riel asistido** | 1–2 | El camino es ancho y muy visible. Salirse atenúa el trazo, no lo corta. Con `feedback.rail`, además **imanta la tinta** hacia el camino ideal. |
| **Guiado con sombra** | 3 | Demostración animada primero, después el chico traza sobre la silueta. |
| **Autónomo** | 3–4 | Solo el punto de inicio y los renglones. Al soltar se superpone la corrección. |
| **Copia veloz** | 5 | La palabra aparece arriba escrita; el chico la reproduce abajo de corrido. |

### 6.1 El riel imantado

El canal ancho del riel asistido dice *dónde* hay que ir, pero no ayuda a *hacerlo*. El aprendizaje motor necesita un movimiento correcto que reforzar, y un chico que nunca produjo uno no tiene qué reforzar. Con `feedback.rail`, entonces, el punto que se **dibuja** se corre una fracción hacia el punto ideal más cercano: el primer contacto con la forma ya se siente como la forma.

**Se imanta sólo lo que se dibuja.** Los puntos que recibe `evaluateLevel` son siempre los crudos, tal como los capturó el dedo. Si se puntuaran los imantados, la precisión mediría la fuerza del riel y no el control del chico, y el principio 5 de `docs/01` ("medir el proceso, no el producto") sería falso en silencio: todo nivel asistido informaría un dominio que nadie tiene. La separación es explícita en `LevelPlay` — la copia deformada alimenta al canvas, la cruda alimenta al evaluador — y está anotada en `canvas/rail.ts` para que nadie la "simplifique" juntando las dos.

**El riel se muere solo.** Un riel permanente es una muleta: el chico deja de conducir y deja que la app dibuje. Se apaga por dos vías independientes, y cualquiera de las dos alcanza para anularlo:

- **Por intentos.** Full en el primero, cero a partir del cuarto (`RAIL_FADE_ATTEMPTS`), lineal en el medio. Son dos desbloqueos de margen, así que nadie pasa de fase con el riel manejando.
- **Por cercanía.** El tirón es proporcional a lo lejos que está el dedo del camino, medido contra el semiancho del canal. Justo sobre la línea el tirón es **cero**, que es lo que evita el temblor cuando el chico ya lo está haciendo bien, y lo que hace que se sienta como una canaleta y no como una mano en la muñeca.

## 7. Feedback: qué se le muestra al chico

Tres estrellas, no una nota:

```
   ★ Precisión      te quedaste dentro del camino
   ★ Sentido        lo hiciste para el lado correcto
   ★ Fluidez        fue un solo movimiento parejo
```

**Las tres estrellas no se muestran en el Nivel 1.** Es una excepción decidida, no un olvido. El Nivel 1 es exploración: el chico limpia un recinto con el brazo entero y descubre que el animal no está. Ahí no se exige precisión fina —la directiva lo dice con todas las letras—, así que puntuar la precisión sería medir algo que el nivel no está pidiendo, y la única lectura posible de una estrella apagada es "te salió mal" en la primera pantalla del juego. La recompensa del Nivel 1 es el recinto que se destapa.

**Y en el Nivel 2 tampoco se muestran, aunque por otro motivo.** Esta frase decía antes "a partir del Nivel 2 las tres estrellas vuelven", y era falsa contra el código. Conviene saber por qué, porque el motivo no es una decisión sobre las estrellas sino una consecuencia de otra.

El interruptor real no es el número de nivel: es `isDetectiveTrail`, que en `LevelPlay.tsx` vale `!!level.clue`. Un nivel que lleva una pista es un rastro de detective, y un rastro de detective monta la cáscara sin palabras: sin título, sin consigna, sin línea de coach —y sin el bloque de resultado, que es donde viven las tres estrellas. Los ocho senderos del Nivel 2, los cuatro del pato y los cuatro de la gallina, llevan pista todos, así que ninguno las muestra.

No es un descuido ni un defecto: la cáscara sin palabras es una decisión tomada y con tests que la fijan. Pero el efecto es que **las estrellas aparecen recién cuando el chico sale del mundo del caso**, y eso es información pedagógica, no un detalle de implementación. El Nivel 1 no las muestra porque no exige precisión; el Nivel 2 no las muestra porque su pantalla no tiene palabras. Son dos razones distintas que dan el mismo resultado, y sólo coinciden por ahora.

Y un solo mensaje corto en imperativo positivo. Nunca "mal", nunca rojo, nunca un sonido de error. Cuando falta un pilar, el mensaje nombra **el gesto**, no el fracaso: *"probá sin levantar el dedo"*, *"empezá desde el punto verde"*, *"un poquito más despacio y parejo"*.

## 8. Qué ve el docente (post-MVP)

El dato interesante no es el promedio de la clase. Es el **cruce precisión × fluidez**:

- precisión alta + fluidez alta → automatizado
- precisión alta + fluidez baja → está **dibujando** la letra (intervención: volver a Fase 2)
- precisión baja + fluidez alta → falta control visomotor (intervención: volver a Fase 1)
- ambas bajas → todavía no está listo para esa letra
