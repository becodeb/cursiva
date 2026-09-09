# Especificación del MVP — Prueba de Mecánicas

## 1. Qué se está validando

**Esta versión no valida el producto. Valida la mecánica.**

Preguntas concretas que este MVP tiene que responder jugándolo:

1. ¿La progresión sendero → patrón → letra → enlace → palabra se siente natural, o hay un salto brusco entre fases?
2. ¿El ancho del canal está bien calibrado para un dedo de chico de 6 años?
3. ¿La métrica de **fluidez** distingue de verdad "trazar" de "dibujar", o rechaza trazos que están bien?
4. ¿La validación de sentido genera falsos negativos en letras reentrantes como la `a`?
5. ¿El feedback de tres estrellas se entiende sin leer, o es demasiado abstracto?

## 2. Fuera de alcance — deliberadamente

- **Sin temática, sin personajes, sin ilustraciones, sin narrativa.** Ni detective, ni libro pop-up, ni mundo que florece.
- Sin backend, sin cuentas, sin panel docente.
- Sin sonido más allá de un tono suave de aprobación.
- Sin el abecedario completo: solo las letras necesarias para probar las fases.

Todo eso entra **después** de que la mecánica esté validada. Ponerle un personaje a una mecánica que no funciona solo hace más caro descubrir que no funciona.

## 3. Alcance funcional

### 3.1 Contenido

19 niveles, suficientes para recorrer la progresión completa de punta a punta:

- **Fase 1** (7): garabato libre · travesía · pelotas (tiempo) · paseo y pasillo (escolta) · ondas · espiral
- **Fase 2** (4): guirnalda · colinas · bucles · crestas
- **Fase 3** (4): `l` · `a` · `m` · `o` — una por familia de movimiento
- **Fase 4** (2): `la` · `ma`
- **Fase 5** (2): `ala` · `mama` (esta última **sin guía**)

Catálogo detallado en `08_MOTOR_DE_NIVELES.md`.

### 3.2 Debe tener (must-have)

- [x] **Lienzo con pauta de 3 zonas**, `viewBox 0 0 1000 600`, responsivo, táctil, sin lag.
- [x] **Motor de nivel único** que corre las 5 fases desde datos.
- [x] **Canal visible** de ancho configurable por nivel, con feedback en vivo de dentro/fuera.
- [x] **Evaluación de tres pilares**: precisión, sentido, fluidez — mostrados por separado.
- [x] **Regla de trazo continuo** activable por nivel, contando levantamientos reales.
- [x] **Demostración animada** del trazo antes del intento, en los niveles que la piden.
- [x] **Mapa de niveles** con fases, estado (bloqueado / disponible / aprobado) y progreso.
- [x] **Avance por dominio**: 2 aprobaciones desbloquean el siguiente nivel.
- [x] **Tolerancia adaptativa**: 3 fallos ensanchan el canal. Nunca se bloquea.
- [x] **Persistencia local** por nivel (mejor puntaje de cada pilar, intentos, aprobaciones).
- [x] **Juego completo de punta a punta**: del primer sendero a `mama` sin guía.
- [x] **Reinicio de progreso** accesible, para probar el recorrido completo de nuevo.
- [x] **Docker Compose** sirviendo el build en un puerto de la LAN.

### 3.3 Interfaz mínima

Un nivel ocupa **exactamente un viewport y no scrollea nunca**. No es una preferencia estética: el lienzo declara `touch-action: none` para que un trazo no se lo lleve el scroll, así que si la página necesitara scrollear, los botones de abajo quedarían fuera de alcance. La salida es que no haga falta scrollear.

```
┌──────────────────────────────────────────────────┐  ← 100dvh (100vh de respaldo),
│  ‹ volver          Fase 2 · Las hamacas          │    overflow hidden, flex column
├──────────────────────────────────────────────────┤
│  "Hacé las hamacas sin levantar el dedo"         │  filas de tamaño fijo
│   (Girá el dispositivo para dibujar más grande.) │  sólo en vertical y angosto
│   ╭──────────────────────────────────────────╮   │
│   │   ●→ ~~~~~~~~ canal ~~~~~~~~~ ◈          │   │  flex: 1 · min-height: 0
│   │   ↑inicio                    ↑meta       │   │  centrado, ajuste "contain"
│   ╰──────────────────────────────────────────╯   │
│   "Del punto verde hasta la meta"                │  línea de pie, derivada
│   ★ Precisión 84    ★ Sentido ✓    ★ Fluidez 41  │
│   [ Borrar ]   [ Ver de nuevo ]   [ Siguiente ]  │  filas de tamaño fijo
└──────────────────────────────────────────────────┘
```

- **Las dos puntas del camino.** El punto verde lleno dice dónde EMPEZAR; el rombo hueco ocre dice dónde TERMINA. Un laberinto sin destino visible no es un laberinto, es un garabato: saber a dónde se va es la mitad de lo que convierte el recorrido en una tarea de planificación y no de calcado. Se distinguen por **forma** además de por color — un chico que los confundiera trazaría el nivel al revés y perdería el pilar de Sentido por culpa nuestra, y el color solo no alcanza para un chico daltónico. El rombo va **hueco** y se dibuja debajo del punto verde, así que si alguna vez un camino terminara donde empieza, las dos marcas se anidan en lugar de taparse.
- **Obstáculos con tiempo.** Un círculo lleno de color apagado (ciruela) que cruza el canal de lado a lado. Se distingue por **color y por forma** del punto verde de inicio y del rombo ocre de meta, y es apagado a propósito: tiene que leerse como obstáculo sin volverse lo más brillante de la pantalla (`docs/01` principio 1). Se dibuja **encima** de la tinta, porque el chico necesita ver venir la pelota aunque su propio trazo ya esté debajo.
- **El personaje que se lleva.** Con `carrier: true` una figurita —cabeza y cuerpo redondeado, un solo color apagado con contorno del color del papel— viaja en la yema mientras el chico dibuja, y espera en el arranque del camino antes de empezar. Es lo más alto del dibujo, así que nunca queda enterrada bajo la tinta sobre la que viaja. Sin tema y sin ilustración: el tema está fuera de alcance (§2), y una forma que se lee como *alguien a quien están llevando* alcanza para cambiar la tarea de "trazar una línea" a "cruzar a alguien sin golpearlo".
- **La línea de pie también avisa el reinicio.** Cuando `resetOnContact` manda la corrida al principio, la línea de pie dice «Volvé a empezar» por un momento y después vuelve la de siempre. Mismo gris apagado que el resto del pie: no cambia de tamaño, no se pone roja y no suena nada. Es la regla del nivel dicha en voz baja, no un reto (`docs/02` §7.2).
- **La línea de pie se deriva, no se escribe fija.** Dice lo que hay en pantalla y nada más. Un nivel `kind: 'free'` no tiene camino ni punto verde, y la última banda de retiro de guía (docs/03 §3) no deja ninguna marca: prometer "Empezá desde el punto verde" en cualquiera de esos casos es una instrucción que el chico no puede obedecer ni discutir. Sale de `standingHintFor(level, guideLevel, demo)`.

- **Contenedor.** `height: 100dvh` con `100vh` de respaldo para motores viejos, `overflow: hidden`, `display: flex`, `flex-direction: column`.
- **El lienzo es el único que crece.** `flex: 1` y `min-height: 0`; sin `min-height: 0` un hijo flex no baja de su tamaño de contenido y la columna se desborda igual. Encabezado, pista, resultado y botonera son filas de tamaño fijo.
- **Ajuste "contain".** El lienzo se escala al mayor tamaño que entre **a la vez** en el ancho y en el alto disponibles, y queda centrado (`TraceCanvas fit="contain"`, docs/02 §3). Antes lo definía sólo el ancho, así que en cuanto el alto era el límite la página se desbordaba.
- **Banda recortada.** El nivel muestra la banda útil de la hoja en vez de las 600 unidades completas (docs/02 §3). Achatar la proporción es lo que le da al lienzo el ancho extra cuando el alto es el límite.

#### Cromo compacto en pantallas bajas

Con menos de 820 px de alto —tablet apaisada, notebook táctil— y otra vez con menos de 520 —teléfono apaisado— el cromo devuelve espacio al lienzo: tipografía más chica, menos padding, la pista en una sola línea con puntos suspensivos si hace falta, y los tres pilares en una única fila junto al mensaje del entrenador en vez de apilados.

Abajo de 520 px además **cuatro filas se vuelven dos**: el encabezado y la pista comparten una fila, y el resultado comparte fila con la botonera. Los envoltorios `.cv-top` y `.cv-foot` son `display: contents` mientras la pantalla es alta, así que el layout alto sigue siendo exactamente la columna plana de siempre y no hace falta duplicar el marcado. En un teléfono apaisado de 390 px de alto cada fila recuperada va entera al lienzo: son 108 px de cromo contra 390 de viewport.

Los botones bajan hasta 44 px de alto y **no menos**: son para la mano de un chico, no para una barra de herramientas. Ese piso es también el techo de lo que se puede recuperar — en 390 px de alto, un lienzo más ancho que ~660 px exigiría menos de 44 px para la botonera.

#### Teléfono vertical

Vertical y angosto (menos de 560 px de ancho) está limitado por el **ancho**, así que ahí las letras no se agrandan. La respuesta honesta es una línea discreta arriba del lienzo, «Girá el dispositivo para dibujar más grande.». No bloquea el nivel, no tapa la pantalla y no fuerza la orientación.

Sin colores saturados. Fondo hueso, tinta oscura, canal gris claro, paredes gris cálido, meta ocre apagado, obstáculos ciruela apagado y personaje verde salvia. Seis significados, seis tonos distintos, ninguno brillante. Toda la decoración vive fuera del renglón.

## 4. Criterios de éxito

1. Un chico recorre las 16 pantallas sin ayuda de un adulto para entender qué hacer.
2. El trazo sigue al dedo a 60 fps en una tablet, sin retraso perceptible.
3. Ningún nivel produce frustración de trabarse: la tolerancia adaptativa siempre destraba.
4. La fluidez baja cuando el trazo se corta a propósito, y **no** baja cuando el trazo es lento pero parejo.
5. La `a` trazada en sentido horario se rechaza; trazada en antihorario se aprueba a la primera.

## 5. Después de esto

Recién con estas cinco respuestas se decide qué se conserva. Después vienen la temática, los personajes, el mundo que florece y todo lo del roadmap. En ese orden.
