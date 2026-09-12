# Arquitectura Técnica y Motor de Trazo

## 1. Stack

- **Frontend:** React 19 + TypeScript + Vite. `framer-motion` para las demostraciones de trazo.
- **Backend:** ninguno en el MVP. Persistencia en `localStorage`. El backend (Node + Express + Postgres) entra recién con el panel docente (Módulo D del roadmap).
- **Contenedores:** Docker + Docker Compose.
- **Tests:** Vitest, en entorno node con stubs de DOM. El motor de evaluación es **puro y testeable sin navegador**; ese es un requisito de diseño, no una casualidad.

## 2. Idea central: un solo motor, muchos niveles

Las cinco fases pedagógicas **no** son cinco mecánicas distintas. Son la misma mecánica con parámetros distintos.

Un sendero de laberinto, una guirnalda pre-cursiva, una letra `a` y la palabra `mama` son todos lo mismo para el motor: **un camino objetivo, un ancho de canal y un conjunto de reglas**.

```
                       ┌───────────────────────┐
   LevelConfig ───────▶│   Motor de trazo      │───▶ TraceScore
   (camino + reglas)   │  (único, compartido)  │     (precisión, sentido, fluidez)
                       └───────────────────────┘
                                  ▲
        ┌─────────────┬───────────┴────────┬──────────────┐
   Sendero       Patrón             Letra            Palabra
   (Fase 1)      (Fase 2)           (Fase 3)         (Fase 4-5)
```

Esto tiene dos consecuencias buenas: una sola superficie de bugs, y agregar contenido nuevo es agregar **datos**, no código.

## 3. Normalización de coordenadas

- Espacio virtual normalizado `viewBox="0 0 <ancho> 600"`. Nada usa píxeles de pantalla.
- **La altura es fija en 600; el ancho crece.** Las proporciones verticales son pedagogía: una `l` tiene que llegar al techo de ascendentes y apoyar en la línea base, así que la pauta no se reescala nunca. El espacio horizontal no es pedagogía: es papel. Un nivel más ancho que 1000 (una palabra larga como `mama`, que mide 988 unidades) recibe una hoja más ancha —`max(1000, ceil(ancho + 2·80))`— en vez de letras más chicas. Es lo que hace un renglón de cuaderno de verdad.
- Las 80 unidades de margen por lado no son decorativas: dejan lugar para el punto verde de inicio (r=22). En `f5-mama` **no hay guía**, así que ese punto es la única instrucción que recibe el chico; si queda cortado por el borde, el nivel no funciona.
- El ancho se deriva por nivel en `buildLevelTarget` y viaja como `viewBoxWidth`. Las coordenadas de los caminos no cambian de unidades, así que la nube ideal y los puntajes no se mueven, y la normalización pantalla→lienzo tampoco necesita nada: `getScreenCTM().inverse()` lee el `viewBox` vigente.
- Conversión pantalla→lienzo **siempre** vía `svg.getScreenCTM().inverse()`. Escalar `clientX` a mano está prohibido: rompe con zoom, rotación y barras del navegador.
- **Pointer Events** (`pointerdown/move/up/cancel`) para dedo, mouse y stylus con un solo código. `pointerType` distingue `touch` de `pen` y ajusta la tolerancia.
- `touch-action: none` en el lienzo para que el scroll del navegador no se robe el trazo.
- **Banda visible: se recorta, no se reescala.** La hoja sigue midiendo 600 de alto en coordenadas; lo que cambia es *cuánta* se muestra. `TraceCanvas` acepta `viewBoxY` / `viewBoxHeight` (por defecto `0` y `600`, así que ningún llamador anterior cambia). Un nivel muestra la pauta 180–540 más 40 unidades de aire arriba y abajo — o sea `y=140`, `alto=440` — y esa banda **se ensancha sola** cuando el canal de un nivel se sale de ella: `f2-bucles` sube hasta y≈105 y `f1-ondas` baja hasta y≈544, y recortarlos a ciegas les cortaría el canal por donde el chico puede pasar. Nada se mueve: líneas, canal, guía y tinta siguen en las mismas coordenadas de hoja; sólo se corre la ventana.
- **Qué compra el recorte y qué no.** Achatar la proporción (1000×440 en vez de 1000×600) sirve cuando el límite es el **alto**: la misma altura permite una hoja mucho más ancha y por lo tanto letras más grandes. Es el caso de la tablet apaisada y de la notebook táctil, que son los dispositivos objetivo. Cuando el límite es el **ancho** —un teléfono vertical— la escala la fija el ancho y las letras **no** crecen: el recorte sólo saca papel vacío.
- **Ajuste `contain`.** `fit="contain"` hace que el `<svg>` llene su caja en los dos ejes y deja que `preserveAspectRatio="xMidYMid meet"` escale la hoja al menor de los dos límites. En ese modo el papel se pinta como un `<rect>` en coordenadas de hoja y no como fondo CSS del elemento, para que el papel visible sea exactamente la hoja y no la caja que la contiene. El valor por defecto sigue siendo `fit="width"`, con el comportamiento de siempre.

### Pauta de referencia

```
   0 ────────────────── 500 ────────────────── 1000 (X)
 0 ┌────────────────────────────────────────────┐
   │                                            │
180 ├┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┤ techo de ascendentes
   │              Zona alta                     │
300 ├┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┤ línea media (x-height)
   │              Zona media                    │
420 ├────────────────────────────────────────────┤ LÍNEA BASE
   │              Zona baja                     │
540 ├┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┤ piso de descendentes
600 └────────────────────────────────────────────┘
(Y)
```

**La pauta no siempre se dibuja.** Las coordenadas de arriba no se mueven nunca, pero las cuatro líneas son de `surface: 'ruled'` y aparecen recién en Fase 3. Fases 1 y 2 trazan sobre `surface: 'blank'`, hoja limpia: ahí se entrena control visomotor y ritmo, todavía no hay letra, y las zonas del renglón no significan nada. Cuatro líneas punteadas debajo de un laberinto son ruido visual puro contra el principio 1 de `docs/01` — le gastan al chico la atención en algo que todavía no puede usar. El eje Y sigue siendo el mismo eje Y; lo único que cambia es si se pinta.

### Cómo se dibujan las paredes del laberinto

`maze: true` pinta la hoja llena y abre el canal encima. Son **dos pintadas comunes**: un `<rect>` del color de la pared (`#e2e8f0`) y después el camino trazado por arriba **en el color del papel** (`#fdfcf7`), al ancho del canal, con puntas y uniones redondas. Un canal con `taper` es lo mismo repetido una vez por pieza de ancho variable.

Antes esto era un `<mask>` de SVG referenciado con `url(#id)`, y **los niveles de laberinto salían en blanco en el dispositivo del usuario** aunque se vieran perfectos en Chromium headless. La máscara arrastraba tres modos de falla que un render headless no muestra nunca:

- `url(#…)` se resuelve contra la **URL base del documento**: alcanza una etiqueta `<base>` en la página para que toda referencia por fragmento se rompa en silencio.
- `mask` sobre SVG en línea, combinado con el apaisado de `preserveAspectRatio` del que depende el ajuste `contain`, tiene una historia larga de errores de motor (Safari/iOS en particular).
- El id venía de `useId()` de React, que **no coincide entre el render de servidor y el de cliente**.

Cualquiera de los tres pinta una hoja **vacía**: sin paredes, sin canal, sin nada. La corrección no persigue a ningún motor en particular —no sabemos cuál era— sino que **elimina la dependencia de la función**: sin referencia no hay nada que resolver y nada que fallar. Es la corrección correcta sin importar cuál de las tres causas era la verdadera.

Regla general que queda: **la superficie de trazado no emite ninguna referencia por fragmento** — ni `mask`, ni `clipPath`, ni `filter`, ni `pattern`, ni gradientes. Está cubierto por un test que exige que el marcado no contenga `url(#`.

## 4. Modelo de datos de un nivel

Ver `08_MOTOR_DE_NIVELES.md` para el catálogo completo. La forma mínima:

```ts
interface LevelConfig {
  id: string
  phase: 1 | 2 | 3 | 4 | 5
  title: string
  hint: string                 // consigna corta y hablada en imperativo
  path: string                 // camino objetivo (SVG path 'd')
  corridorWidth: number        // ancho del canal en unidades de viewBox
  rules: {
    mustBeContinuous: boolean  // ¿se puede levantar el dedo?
    enforceOrder: boolean      // ¿importa el sentido del recorrido?
    minFluency: number         // 0 = no se evalúa ritmo
  }
  showGuide: boolean           // false = trazo de memoria (Fase 5)
  demo?: DrawDemo[]            // animación de demostración previa
}
```

Una letra de la Fase 3 no es un tipo distinto: es un `LevelConfig` cuyo `path` sale de `buildLetterConfig()` y cuyo `corridorWidth` es más chico.

## 5. Los tres pilares de la evaluación

El motor devuelve **tres números independientes**, nunca un promedio. Cada uno corresponde a un proceso neurocognitivo distinto.

### 5.1 Precisión — ¿se mantuvo dentro del camino?

Se remuestrean K=64 puntos equidistantes por longitud de arco del trazo del usuario y se mide, para cada uno, la distancia al punto más cercano de la nube ideal (una banda densa alrededor del camino):

```
escala       = clamp(anchoCanal / 80, 0.7, 2.5)
Tolerancia   = TolBase · escala
penalizado_i = max(0, dist_i − GRACIA)
Precisión    = clamp(100 − 100 · Σ penalizado_i / (K · Tolerancia), 0, 100)
```

- `GRACIA = 3` px absorbe el temblor natural del dedo.
- `TolBase` = 16 con `pen`, 26 con `touch`. **El dedo de un chico de 6 años no es un stylus.**
- `escala` normaliza contra el canal de referencia (80): un sendero de Nivel 2 (Fase 1 en el código) mide 110 y una letra 42, así que puntuar los dos con la misma tolerancia haría que los niveles anchos y perdonadores fueran **los más difíciles**.
- La escala está **acotada a `[0.7, 2.5]`**:
  - **El piso** existe porque los Niveles 5-7 (Fases 3-5 en el código) usan canales angostos (40-42) para que la **letra se vea** — un canal más ancho que el grafema lo borra. Sin piso, un canal de 40 daría `26 · 0.5 = 13` unidades al dedo, más estricto que el stylus. Eso es exactamente la frustración que prohíbe el principio 3 de `docs/01`.
  - **El techo** existe porque la tolerancia adaptativa (§6) puede llegar a un canal de 260; pasada la escala 2.5 cualquier garabato en la zona puntúa 100 y el pilar de precisión deja de significar algo.
- El remuestreo por arco es lo que hace que trazar lento o rápido no cambie la precisión.

### 5.2 Sentido — ¿el recorrido fue en el orden correcto?

Sobre el camino se generan N checkpoints ordenados con un radio de activación. Se valida que se activen estrictamente `1 → 2 → … → N`.

- Entrar en un checkpoint de orden superior al esperado **enciende la bandera `wrongDirection`** (giro invertido) y dispara el rescate visual.
- Un recorrido estricto completo apaga la bandera: la `c` y la `a` son reentrantes y pisan zonas ya visitadas, así que un latch permanente daría falsos negativos.
- Este pilar es el que detecta el error más caro de la cursiva: hacer la `a` en sentido horario. Geométricamente puede quedar perfecta; motrizmente está mal y no va a enlazar nunca.

### 5.3 Fluidez — ¿fue un movimiento o fueron muchos?

Es el aporte específico de esta app y **no existe en el motor actual**. Combina dos señales:

```
levantamientos = cantidad de trazos usados − trazos permitidos por el nivel
regularidad    = 1 − coeficiente de variación de la velocidad entre muestras
Fluidez        = clamp(100 · regularidad − 25 · levantamientos, 0, 100)
```

Un trazo con precisión 95 y fluidez 30 es un chico **dibujando** la letra a tirones. Sin esta métrica, la app lo aprobaría y estaría reforzando el problema que vino a resolver.

## 6. Tolerancia adaptativa (anti-frustración)

El `corridorWidth` declarado en el nivel es un punto de partida, no un valor fijo:

- **3 intentos fallidos seguidos** en el mismo nivel → el canal se ensancha un 25% (hasta 2 veces).
- **2 aprobaciones seguidas** → el canal vuelve a su valor nominal.
- El nivel **nunca se bloquea**. Un chico trabado siempre puede avanzar; el registro guarda que necesitó ayuda, que es información para el docente, no un castigo para el chico.

## 7. Rendimiento

Requisito duro: **el trazo no puede tener lag perceptible**.

### 7.1 Presupuesto por frame

- Los puntos del trazo viven en un `ref`, no en estado de React.
- Un loop de `requestAnimationFrame` muta el atributo `d` del path de tinta directamente. Cero `setState` por `pointermove`.
- La evaluación (O(K × |nube|) ≈ 64 × 1800) corre **una sola vez al soltar el dedo**, nunca por frame.
- El feedback en vivo (dentro/fuera del canal) usa solo la cabeza del trazo contra la nube, y está limitado a ~10 Hz.
- El riel imantado (§7.2) es la única transformación que corre por punto y no por frame: cada punto se deforma **una vez, al llegar**, y queda cacheado. Volver a deformar el buffer entero cada frame haría el loop de tinta O(n) en el largo del trazo, que es exactamente el costo que esta sección existe para evitar.

### 7.2 Canales de feedback en vivo

El principio 2 de `docs/01` pide que el chico corrija *mientras* traza. De esa única muestra de ~10 Hz cuelgan cuatro canales, y **ninguno vuelve a recorrer la nube**: agregar un segundo escaneo por canal sería gastar cuatro veces el presupuesto de arriba para responder la misma pregunta.

| Canal | Qué dice | Dónde |
| :--- | :--- | :--- |
| **Tinta atenuada** | Salirse baja la luz del trazo, nunca lo marca mal. | `TraceCanvas offPath` |
| **Tono sostenido** | Suena mientras el dedo está **adentro** y se apaga al salir. | `canvas/traceTone.ts` |
| **Háptica** | Un pulso corto **en la transición** hacia afuera. | `canvas/haptics.ts` |
| **Riel imantado** | Corre la tinta dibujada hacia el camino ideal. | `canvas/rail.ts` |
| **Volver al inicio** | Tocar una pared o un obstáculo reinicia la corrida. | `canvas/resetOnContact.ts` |

Cada canal es dato del nivel (`LevelFeedback`), no una decisión de la pantalla: un nivel que no los pide no los paga.

**Volver al inicio no es un castigo.** `LevelConfig.resetOnContact` manda la corrida de vuelta al punto verde cuando la yema toca una pared o un obstáculo con tiempo. Es una **regla**, no un reto: no se descuenta puntaje, no se registra un intento —`onAttempt` ni se llama—, nada se pone rojo y no hay sonido de error. El `docs/01` principio 2 prohíbe **retar al chico**, no que el nivel tenga consecuencias; una penalización sería exactamente un reto con aritmética encima. Lo que sí hace es que la precisión importe **momento a momento** en vez de sólo al final, que es la diferencia entre un laberinto y un garabato.

Tres decisiones sostienen que se sienta justo:

- **Rebote (debounce) de dos muestras.** La señal de contacto se muestrea a ~10 Hz sobre una yema en movimiento. Una sola muestra perdida —un dedo que rueda sobre el vidrio, un digitalizador con ruido, una esquina cortada por dos unidades— no es un chico que se salió, y reiniciar a un chico que en realidad iba bien es el único error que esta regla no se puede permitir. El contacto tiene que **sostenerse dos muestras seguidas** (~100–200 ms). Con una sola alcanzaría el ruido; con tres, un chico podría cruzar entero un obstáculo entre muestras y la regla se volvería impredecible, que es el peor final posible: una regla que un chico de seis años no puede anticipar se **siente** igual que un castigo.
- **La tinta se desvanece, no desaparece.** Medio segundo de salida en lugar de un corte seco. Desaparecer de golpe se lee como una falla técnica o como que le sacaron algo; irse se lee como "esa corrida terminó, arrancá de nuevo".
- **El dedo que sigue apoyado se ignora.** `useTraceInput.abortStroke` suelta el puntero además de vaciar los buffers. Sin eso, el siguiente `pointermove` volvería a entintar desde donde el dedo ya está —encima de la pared que acaba de tocar— y dispararía la regla otra vez en el acto.

El aviso es una línea corta y neutra («Volvé a empezar»), del mismo gris apagado que el resto del pie, y el pulso háptico es **el mismo** que ya da salirse del canal, no un tono de error.

Ambas preguntas —pared y obstáculo— cuelgan de **esa única muestra** de ~10 Hz: la pared ya está resuelta por el `out` del canal de tinta, y el obstáculo son unas pocas pruebas punto-en-círculo. Ningún canal vuelve a recorrer la nube.

### 7.3 Un solo reloj

Los obstáculos con tiempo (`LevelConfig.obstacles`, `levels/obstacles.ts`) son matemática pura: `obstacleAt(obstacle, target, timeMs)` y `hitObstacle(point, obstacles, target, timeMs)` reciben el tiempo **explícito**, nunca lo leen. El reloj es uno solo: el `performance.now()` que el loop de `requestAnimationFrame` de `TraceCanvas` lee **una vez por frame** y reparte a la tinta, a las posiciones dibujadas, al throttle del overlay y al `onFrame` de la pantalla.

No es prolijidad: si el dibujo y la prueba de choque leyeran el reloj por separado podrían diferir un frame, y **un obstáculo que golpea donde no está dibujado hace el nivel injugable**. Los círculos se mueven mutando `cx`/`cy` directamente, igual que el `d` de la tinta — ni un segundo loop ni estado de React a 60fps.

**Por qué el tono no contradice al principio 1.** `docs/01` prohíbe "música mientras el chico traza" y `docs/04` corta el sonido en "un tono suave de aprobación". El tono del canal no es ninguna de las dos cosas: no es fondo, no es decorativo y no premia nada. Es la linterna del principio 2 hecha audible — existe sólo mientras el dedo está sobre el vidrio y sólo mientras el chico va bien. **El silencio es el mensaje**, y no hay sonido de "afuera": eso sería el sonido de error que `docs/03` §7 prohíbe. El metrónomo de Fase 2 es el otro caso, y es un pulso para acompasar el patrón (`docs/01` Fase 2: "planificación motora, ritmo"), no un acompañamiento; va con un latido visual porque la tablet del aula suele estar muteada.

Todo lo audible es **best-effort**: un `AudioContext` compartido (`canvas/audio.ts`, los navegadores limitan cuántos abre una página), creado recién en el primer gesto del chico por la política de autoplay, con la ganancia **rampeada** y nunca escalonada — un escalón de ganancia *chasquea*, y a 10 Hz eso sería un traqueteo cada vez que el chico roza el borde del canal. Un dispositivo sin Web Audio no rompe ningún nivel. La háptica corre igual: `navigator.vibrate` no existe en escritorio ni en iOS Safari, y se detecta antes de usarse.

**El riel dibuja, no puntúa.** Los puntos que se imantan son sólo los que se **renderizan**; `evaluateLevel` recibe siempre los crudos. Es la separación que mantiene honesto al principio 5 de `docs/01` y está desarrollada en `docs/03` §6.1.

## 8. Estructura de carpetas

```
client/src/
  canvas/       superficie de trazado, entrada de puntero, remuestreo, tinta
    validation/ score, checkpoints, continuidad, fluidez   ← puro, sin DOM
  letters/      SVG → LetterConfig, registro, composición de palabras
  levels/       LevelConfig, catálogo de niveles, generadores de caminos
  game/         flujo de juego: sesión, avance, tolerancia adaptativa
  progress/     persistencia
  screen/       pantallas
```
