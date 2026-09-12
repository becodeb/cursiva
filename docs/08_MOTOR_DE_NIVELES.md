# Motor de Niveles y Catálogo

## 1. Por qué un catálogo de datos

Todo el contenido jugable es **data**. Agregar un nivel es agregar un objeto a un array; nunca tocar el motor. Esto es lo que permite que un docente (o el roadmap) sume contenido sin romper el trazado.

## 2. `LevelConfig`

```ts
export type Phase = 1 | 2 | 3 | 4 | 5

export interface LevelRules {
  /** false = se puede levantar el dedo y seguir. true = un solo trazo. */
  mustBeContinuous: boolean
  /** ¿se valida el orden de los checkpoints (sentido del trazo)? */
  enforceOrder: boolean
  /** umbral mínimo de fluidez para aprobar. 0 desactiva el pilar. */
  minFluency: number
  /** umbral mínimo de precisión para aprobar. */
  minAccuracy: number
}

/** `free` = sin camino objetivo, se puntúa cobertura. `path` = todo lo demás. */
export type LevelKind = 'free' | 'path'
/** `blank` = hoja vacía (Fases 1-2). `ruled` = pauta de tres zonas (Fase 3+). */
export type Surface = 'blank' | 'ruled'

export interface Taper {
  /** multiplicador del ancho al empezar el camino. */
  from: number
  /** multiplicador al terminarlo. */
  to: number
}

/** Peligro temporizado que cruza el camino: hay que esperarlo, no correrle. */
export interface Obstacle {
  /** dónde se para sobre el camino, 0..1 por longitud de arco. */
  at: number
  /** recorrido pico a pico, perpendicular al camino, en unidades de viewBox. */
  travel: number
  /** milisegundos de un ciclo completo de ida y vuelta. */
  periodMs: number
  /** desfase del ciclo 0..1, para que dos peligros nunca vayan al unísono. */
  phase: number
  /** radio de contacto. */
  radius: number
}

export interface LevelFeedback {
  /** tono sostenido mientras el dedo va dentro del canal. */
  tone: boolean
  /** vibración al salirse. */
  haptics: boolean
  /** pulso de ritmo en bpm; 0 = apagado. Solo Fase 2. */
  metronomeBpm: number
  /** riel asistido: imanta la tinta hacia el camino (docs/03 §6). */
  rail: boolean
}

export interface LevelConfig {
  id: string
  phase: Phase
  title: string
  hint: string
  kind: LevelKind
  surface: Surface
  /** el canal se dibuja como paredes recortadas de un campo lleno. */
  maze: boolean
  /** estrechamiento opcional a lo largo del camino. */
  taper?: Taper
  /** peligros temporizados que cruzan el camino. Vacío o ausente = ninguno. */
  obstacles?: Obstacle[]
  /** tocar una pared o un peligro devuelve al chico al inicio del camino. */
  resetOnContact: boolean
  /** dibuja un personaje viajando en la yema del dedo. */
  carrier: boolean
  feedback: LevelFeedback
  /** camino objetivo. Uno o varios subtrazos (letras con punto/barra). */
  paths: string[]
  /** ancho nominal del canal, en unidades de viewBox. */
  corridorWidth: number
  rules: LevelRules
  /** false = sin guía visible; el chico traza de memoria (Fase 5). */
  showGuide: boolean
  /** letras que componen el nivel; vacío en Fases 1-2. */
  letters: string[]
}
```

De `LevelConfig` el motor **deriva** en tiempo de carga:

| Derivado | Cómo |
| :--- | :--- |
| `paths` | los `paths` del config **centrados horizontalmente** en el viewBox de 1000: se translada todo por `500 − (minX + maxX) / 2` sobre el bounding box combinado |
| `ideal` | banda densa de puntos a ±`corridorWidth/2` del camino |
| `checkpoints` | N puntos ordenados por longitud de arco, N = clamp(round(L/90), 6, 12) |
| `radius` de checkpoint | proporcional al espaciado, acotado a `[35, 60]` |

### Las marcas que dibuja la pantalla

De esos mismos caminos centrados salen las tres marcas del cromo, y las tres son **derivadas**, nunca datos del nivel:

| Marca | De dónde sale | Forma |
| :--- | :--- | :--- |
| Punto de inicio | `polyline[0]` | disco verde lleno |
| Flecha de sentido | tangente a 70 unidades del inicio (docs/03 §3) | dardo verde |
| Meta | último punto del **último** `paths` | rombo ocre hueco |

La meta lee el último `paths` y no `polyline`, porque `polyline` es sólo el camino principal (`paths[0]`): en un nivel con levantamiento de lápiz la `polyline` termina donde termina el primer segmento, que no es donde el chico deja de escribir. Hoy todos los niveles del catálogo son un único trazo continuo, así que la distinción no cambia nada — es un resguardo para el día que haya una barra de `t` o un punto de `i`.

Las tres desaparecen juntas en la última banda de retiro de guía (docs/03 §3), que es lo que mantiene a `f5-mama` como examen de memoria.

Un nivel `kind: 'free'` no tiene camino: deriva un target **vacío** (`ideal`, `checkpoints` y `polyline` en cero) sobre la hoja de 1000, y no rompe nada río abajo. No dibuja ninguna de las tres marcas, y la línea de pie tiene que decirlo (docs/04 §3.3): prometerle un punto verde a un chico que no lo tiene en pantalla es una instrucción que no puede obedecer. Y si el nivel declara `taper`, la media banda del `ideal` deja de ser constante: se multiplica por `from → to` interpolado sobre la **longitud de arco** del camino, con piso de 4px. El sendero se estrecha de verdad, no solo en el dibujo.

El centrado es **solo en X y sin reescalar**: `buildWord()` empalma las letras de izquierda a derecha desde el origen de la primera, así que una palabra se corre a la derecha y `mama` llegaba a salirse del lienzo. Las proporciones contra la pauta son pedagogía — una `l` tiene que llegar a 180 y apoyar en 420 —, así que el eje Y no se toca nunca. Todo lo demás (`polyline`, `checkpoints`, `ideal`) se deriva de los caminos ya centrados, y la pantalla dibuja esos mismos: el canal que se ve y la nube que puntúa no pueden discrepar.

## 3. Cómo se evalúa un intento

```
soltar el dedo
   │
   ├─▶ Precisión  ── nube ideal, K=64 muestras
   ├─▶ Sentido    ── orden de checkpoints + bandera de giro invertido
   └─▶ Fluidez    ── levantamientos + regularidad de velocidad
   │
   ▼
aprobado = precisión ≥ minAccuracy
         ∧ (¬enforceOrder ∨ (orden correcto ∧ ¬giro invertido))
         ∧ (¬mustBeContinuous ∨ un solo trazo)
         ∧ fluidez ≥ minFluency
```

Se muestran **tres estrellas separadas** (precisión / sentido / fluidez), no una nota. El chico ve qué le falta; el docente ve qué proceso está fallando.

### Nivel libre: la precisión es cobertura

Un nivel `kind: 'free'` no tiene camino, así que "¿se quedó adentro?" no tiene referente. Lo que el calentamiento entrena es **alcance**, entonces la precisión mide qué parte de la hoja tocó el trazo (`levels/coverage.ts`): la hoja se parte en una grilla gruesa de 12×8 y el puntaje es el porcentaje de celdas visitadas. Gruesa a propósito — una grilla fina premiaría *densidad* de tinta, y un chico que ennegrece un rincón no movió el brazo.

El pilar de sentido se aprueba por construcción (sin checkpoints no hay sentido que respetar) y la fluidez se mide igual que siempre. `aprobado = cobertura ≥ minAccuracy ∧ fluidez ≥ minFluency`.

## 4. Progresión de la sesión

```
[Mapa de niveles] ──▶ [Nivel] ──▶ ¿aprobado?
                        ▲             │ sí ──▶ +1 al dominio ──▶ ¿2 seguidos? ──▶ desbloquea siguiente
                        │             │
                        └─────────────┘ no ──▶ reintentar
                                              ¿3 fallos seguidos? ──▶ canal +25% (máx ×2)
```

- **Nunca** hay bloqueo duro. Después de la tercera falla el nivel se ensancha solo.
- El desbloqueo pide **2 aprobaciones**, no una: una sola puede ser suerte.
- El progreso se guarda por nivel en `localStorage`, con el mejor puntaje de cada pilar.

## 5. Catálogo del MVP

Los caminos de las Fases 1 y 2 se **generan** con funciones paramétricas (`levels/paths.ts`), no se escriben a mano: así se pueden retunear amplitud, ciclos y ancho sin redibujar nada.

### Fase 1 — Control visomotor (hoja libre)

**La Fase 1 no vive sobre el renglón.** Todos sus niveles usan `surface: 'blank'`: la pauta no se dibuja. Los renglones no significan nada hasta la Fase 3, así que dibujarlos antes es decoración que el chico tiene que filtrar, en contra del principio 1 de `docs/01` (carga cognitiva controlada). Y una banda de 120 unidades entrena la yema del dedo; la Fase 1 existe para construir el control de brazo y muñeca del que después dependen las letras. Los caminos, entonces, ocupan **toda la hoja**, de y≈60 a y≈540, a escalas, posiciones y orientaciones variadas.

Todos los senderos llevan `maze: true`: el canal se dibuja como paredes recortadas de un campo lleno, que es lo que un laberinto realmente es y lo que mete la percepción figura-fondo dentro de la tarea. Los patrones de la Fase 2 siguen siendo pasillos blandos.

La progresión es motora y sube **una exigencia por vez**:

```
libre       →  travesía      →  pelotas        →  paseo / pasillo  →  ondas    →  caracol
garabato       movimiento       inhibición        precisión           rotación    el giro
de brazo       grueso           (esperar)         (las paredes)       de muñeca   de la a
```

La inhibición va **antes** que la precisión a propósito. `f1-pelotas` pide quedarse quieto a tiempo mientras el camino sigue siendo perdonador (84 unidades de ancho); recién después los dos niveles de escolta piden exactitud sostenida, ya sin pelotas. Al revés serían dos lecciones en la misma pantalla, en contra del principio 1 de `docs/01`.

Sigue cumpliendo el orden que nombra `docs/01` — *"Rectos, con ángulos, con curvas amplias, con bucles"* — solo que los ángulos ahora viven **dentro** de `f1-pasillo` (su medio giro) en vez de en un camino hecho solo de esquinas.

| id | Título | Camino | Canal | Reglas |
| :--- | :--- | :--- | :--- | :--- |
| `f1-libre` | Garabato libre | **sin camino** (`kind: 'free'`) | — | continuo: no · orden: no · fluidez: 0 · cobertura ≥ 55 |
| `f1-travesia` | La travesía | barrido de esquina a esquina, (100,520) → (900,90), panza de 105 | 120 | continuo: no · orden: sí · fluidez: 0 |
| `f1-pelotas` | Las pelotas que cruzan | arco amplio **sin esquinas**, (110,470) → (890,470), panza de −330 · **2 peligros** | 84 | continuo: no · orden: sí · fluidez: 0 · `resetOnContact` |
| `f1-paseo` | El paseo | barrido casi recto, (110,480) → (890,130), panza de 45 | 68 | continuo: no · orden: sí · fluidez: 0 · `carrier` · `resetOnContact` |
| `f1-pasillo` | El pasillo angosto | pasillo que **dobla**: ida por y=130, medio giro de radio 170, vuelta por y=470 | 56 | continuo: no · orden: sí · fluidez: 0 · `carrier` · `resetOnContact` |
| `f1-ondas` | Las olas inclinadas | onda de 2 ciclos, amplitud 170, **rotada −22°** | 95 | continuo: no · orden: sí · fluidez: 0 |
| `f1-espiral` | El caracol | espiral **antihoraria**, 1.75 vueltas, radio 260 → 50, centrada en (500,300) | 70 | continuo: sí · orden: sí · fluidez: 0 |

> **`f1-libre` es lo primero que hace el chico.** Sin camino, sin canal, sin punto de inicio y sin sentido correcto: dibujar grande y donde quiera, para calentar el brazo antes de que nada le pida quedarse adentro de algo. Se puntúa por **cobertura** (§3), no por precisión. El umbral de 55 no es gusto sino medición: una línea corta da 4, un garabato denso en un rincón da 13, y todos los modelos de un chico recorriendo la hoja entera dan 60-90. La barra queda debajo de esa banda a propósito — un calentamiento libre no tiene canal que ensanchar cuando se falla (`docs/03` §4), así que una barra inalcanzable sería el bloqueo duro que el principio 3 prohíbe, y sería la primera pantalla de la app.

> **El riel asistido es de primer contacto.** `feedback.rail` está en `true` solo en `f1-travesia` (la primera ruta de la app) y en `f3-l` (la primera letra). Dejarlo puesto deja de ser una ayuda y pasa a ser el plan motor del chico (`docs/03` §6).

> **`f1-travesia` se estrecha.** Es el único nivel con `taper: { from: 1.3, to: 0.7 }`: el sendero arranca perdonador donde el chico todavía está encontrando el movimiento y se angosta donde ya viene lanzado. El estrechamiento es real, no cosmético: la banda de puntuación se interpola sobre la longitud de arco (§2).

> La espiral es antihoraria a propósito: es el mismo giro que van a necesitar para la familia de la `a`. Se entrena el movimiento antes de que tenga nombre.

> **Las paredes son el nivel.** Dos vueltas consecutivas quedan a `(260 − 50) / 1.75 = 120` unidades una de otra, y el canal se come 70: quedan ~50 unidades de pared visible entre brazos. Con más vueltas o un canal más ancho los brazos se fusionan, el caracol se dibuja como un disco lleno y no queda nada adentro de lo cual quedarse.

#### `f1-pelotas` — el nivel de tiempo

Dos pelotas cruzan el camino de arriba abajo y hay que **esperarlas**. Es la tarea de inhibición más limpia que la Fase 1 puede ofrecer: acercarse, frenar, leer el hueco, salir. Una esquina solo pide doblar; una pelota que va y viene pide **quedarse quieto a propósito**, que es lo difícil y lo que después sirve.

El camino es un arco amplio, de una sola subida y una sola bajada, **sin ninguna esquina**. Es deliberado: si la forma también hubiera que resolverla, taparía lo que el chico está aprendiendo. Acá la dificultad es el tiempo.

| Peligro | `at` | `travel` | `periodMs` | `phase` | `radius` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| primero | 0.33 | 260 | 2600 | 0 | 32 |
| segundo | 0.66 | 260 | 2200 | 0.5 | 32 |

- **`at` 0.33 y 0.66**: un tercio y dos tercios de la longitud de arco, así queda tramo para acercarse, frenar y volver a arrancar entre uno y otro.
- **`travel` 260 contra un canal de 84** es 3,1× el ancho del pasillo. El barrido cubre el canal de pared a pared, así que no hay carril seguro contra el borde; y lleva la pelota lo bastante **afuera** como para que se abra un hueco real. La pelota está limpia del canal (`|offset| > 84/2 + 32 + 12`) el **54 %** de cada ciclo: dos ventanas de unos 0,7 s, un hueco que un chico de seis años ve venir y puede aprovechar.
- **`periodMs` 2600 / 2200**: dentro de 2,2-2,8 s, un vaivén lento de leer y de planificar.
- **Períodos distintos *y* fases a medio ciclo.** Cualquiera de las dos cosas sola dejaría a las pelotas en una relación fija que el chico aprende como **un solo ritmo**. Con períodos 13:11 el par recién se repite a los ~29 s, así que hay que leer cada pelota por separado — que es la lección.

`resetOnContact: true`: tocar una pelota o una pared devuelve al inicio del camino. Sin puntaje en contra, sin marca roja, sin sonido de fracaso — la vuelta simplemente empieza de nuevo (`docs/01` principio 2 prohíbe el reto, no la consecuencia).

**Dónde está la pelota en cada instante** lo calcula `levels/obstacles.ts`, y es matemática **pura**: el centro se para en `at · length` sobre la `polyline` y se desplaza por la **perpendicular local** una distancia `travel/2 · sin(2π · (t / periodMs + phase))`. La perpendicular es local, no vertical: en un tramo inclinado una pelota que bajara en vertical se deslizaría por el pasillo en vez de cruzarlo, y no bloquearía nada. Ninguna función mira el reloj: el `timeMs` entra por parámetro, así que el dibujo y la puntuación salen del **mismo** número de un único reloj de `rAF`, y un test puede preguntar cómo está la hoja en `t = 1300 ms` sin esperar 1300 ms.

`hitObstacle` es un test de círculo contra `radius + 12`. Esas **12 unidades de tinta** no son un margen arbitrario: el trazo del chico se dibuja de ~18 unidades de ancho, o sea 9 de semiancho. Cobrar el toque solo cuando el centro matemático llega a la pelota dejaría pasar un trazo que se ve superpuesto, y en un nivel cuya regla entera es "la pelota te devuelve al inicio" eso se lee como que el juego hace trampa. 12 = el semiancho de la tinta más tres unidades de gracia.

#### `f1-paseo` y `f1-pasillo` — los niveles de escolta

`carrier: true`: un personaje viaja en la yema del dedo. La tarea deja de ser "trazá una línea" y pasa a ser "llevalo hasta el otro lado sin golpearlo contra las paredes", que es la misma exigencia motora envuelta en una intención que un chico de seis años ya tiene. Con `resetOnContact: true` la precisión importa **momento a momento** y no solo al final: rozar una pared no baja un puntaje, devuelve al inicio.

Los dos llevan **los canales más angostos de la Fase 1** (68 y 56, contra 84-120 del resto). Tiene que ser así: si las paredes no molestaran de verdad, `resetOnContact` sería una regla que el chico nunca conoce.

- **`f1-paseo` — primer contacto con la regla.** La forma no aporta dificultad a propósito: un barrido casi recto, con una panza de apenas 45. Cuando llega una regla nueva la geometría tiene que hacerse a un lado (`docs/01` principio 1). Toda la exigencia está en las 68 unidades de canal.
- **`f1-pasillo` — sostener la precisión.** Casi el doble de largo que cualquier otra ruta de la Fase 1: la exactitud hay que **mantenerla**, no encontrarla. Y suma un medio giro — frenar, invertir el sentido, no apoyar la tinta en la pared —, que es la parte de inhibición de la Fase 1 metida adentro de la tarea de precisión. El radio del giro es `(yBottom − yTop) / 2` **por construcción**, así que las dos rectas quedan a un diámetro exacto una de otra y el giro las empalma en tangente: nunca aparece una horquilla que el canal no pueda contener. Con la banda 130/470 eso da un radio de 170 contra un canal de 56, o sea 142 unidades de radio en la pared interna: una rotación de muñeca, no un pivote.
- Es el **segundo** nivel con `taper` del catálogo, y el único que se angosta hacia un giro: `{ from: 1.2, to: 0.8 }`. El pasillo perdona en la ida y se cierra en la vuelta, cuando el chico ya sabe el movimiento.

### Fase 2 — Patrón continuo (pre-cursiva)

Todos con `mustBeContinuous: true`. Acá se instala la regla de la cursiva.

La geometría **se queda en el renglón**, y eso es correcto: guirnalda, colinas, bucles y crestas *son* formas de letra, y su proporción contra la pauta es la lección de la fase. Lo que cambia es que la pauta no se **dibuja** (`surface: 'blank'`) — los renglones siguen sin significar nada para el chico hasta la Fase 3 — y que aparece el metrónomo: esta es la fase del ritmo (`docs/01` Fase 2).

Como la pauta no está a la vista para dar escala, los patrones se escalan **1.25×** alrededor del centro de su propia banda: sin renglones, un patrón exacto al renglón se lee chico y el chico achica el movimiento para igualarlo.

| Patrón | Banda original | Banda que se dibuja |
| :--- | :--- | :--- |
| guirnalda / colinas | 300-420 | 285-435 |
| bucles | 180-420 | 150-450 |
| crestas | 200-420 | 172-448 |

**Un golpe = un ciclo del patrón**, así que los bpm bajan cuando el ciclo se alarga. Todo queda entre 50 y 70 bpm, un paso que un chico puede seguir de verdad: rápido para ser un ritmo, lento para seguir siendo un movimiento y no un garabato.

Los cuatro primeros son el **Nivel 3** de la directiva (agua y medusa) y forman una microprogresión, no cuatro repeticiones: el canal se angosta de 100 a 80, los ciclos pasan de 3 largos a 4 cortos, después dejan de ser todos iguales, y el último cambia de eje por completo.

| id | Título | Camino | Canal | Ritmo | Fluidez mín. |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `f2-guirnalda` | Las olas de la medusa | arcos hacia abajo (`u u u`), 3 ciclos amplios | 100 | 54 bpm | 35 |
| `f2-agua2` | La medusa se apura | los mismos arcos, 4 ciclos más chicos y más juntos | 80 | 64 bpm | 38 |
| `f2-agua3` | Las olas cambian | arcos de ancho y hondura variables dentro del mismo camino | 80 | 68 bpm | 40 |
| `f2-agua4` | La estrella de mar | arcos amplios con una estrella que cruza el trayecto | 90 | — | — |
| `f2-colinas` | Las montañas | arcos hacia arriba (`n n n n`), 4 ciclos | 85 | 63 bpm | 40 |
| `f2-bucles` | Los rulos altos | bucles cruzados hasta la zona alta (`l l l`), 3 ciclos | 80 | 52 bpm | 45 |
| `f2-crestas` | Las olas grandes | onda amplia zona alta ↔ base, 3 ciclos | 80 | 56 bpm | 45 |

**`f2-agua4` no lleva ni metrónomo ni piso de fluidez, y no es un olvido.** Es el desafío de "frenar y continuar": la estrella de mar cruza el camino y hay que esperar a que se despeje. La fluidez se calcula como `1 − CV(velocidad)`, o sea que castiga exactamente la variación de velocidad que este nivel está pidiendo, y un metrónomo estaría marcando "seguí" mientras la estrella dice "esperá". Los dos se apagan a propósito, y `catalog.test.ts` fija que sea un único nivel el que se toma esa excepción.

### Fase 3 — Grafema aislado

Una letra por familia de movimiento, para probar que el motor sirve para las cinco.

| id | Letra | Familia | Canal | Reglas |
| :--- | :--- | :--- | :--- | :--- |
| `f3-l` | `l` | rulo | 42 | continuo: sí · orden: sí · fluidez: 40 |
| `f3-a` | `a` | ola | 42 | continuo: sí · orden: sí · fluidez: 40 |
| `f3-m` | `m` | colina | 42 | continuo: sí · orden: sí · fluidez: 45 |
| `f3-o` | `o` | ola | 42 | continuo: sí · orden: sí · fluidez: 45 |

De la Fase 3 en adelante vuelve la pauta (`surface: 'ruled'`), y con ella el sentido de la zona: acá sí, el renglón es la lección. Ningún nivel de la Fase 3 a la 5 es laberinto ni lleva metrónomo; el único con riel asistido es `f3-l`, la primera letra.

> **El canal no puede tragarse la letra.** Una letra de zona media mide 120 unidades de alto (300 → 420). Con un canal de 75 el pasillo era más ancho que los trazos del grafema y la `a` se veía como una mancha gris: un chico no puede copiar una forma que no ve. De la Fase 3 en adelante el canal baja a 40-42 y, además, se dibuja la **línea guía nítida encima** del canal blando. Los dos objetos dicen cosas distintas: el canal es *la zona tolerada*, la guía es *la forma que hay que hacer*. Achicar el canal no endurece la evaluación: la escala de tolerancia tiene piso 0.7 (`docs/02` §5.1).

### Fase 4 — Enlace

| id | Grupo | Canal | Reglas |
| :--- | :--- | :--- | :--- |
| `f4-la` | `la` | 40 | continuo: **sí** · orden: sí · fluidez: 50 |
| `f4-ma` | `ma` | 40 | continuo: **sí** · orden: sí · fluidez: 50 |

El corte del trazo entre las dos letras es el error a detectar. Por eso `mustBeContinuous` acá no es negociable.

### Fase 5 — Palabra y automatización

| id | Palabra | Canal | Guía | Reglas |
| :--- | :--- | :--- | :--- | :--- |
| `f5-ala` | `ala` | 40 | sí | continuo: sí · fluidez: 55 |
| `f5-mama` | `mama` | 40 | **no** (de memoria) | continuo: sí · fluidez: 55 |

En `f5-mama` la guía desaparece: solo quedan los renglones. Ese es el examen real de la memoria motora, y es el techo del MVP.

## 6. Fuente de las letras (Fases 3-5)

Las letras salen del pipeline ya existente: `src/letters/svg/<char>.svg` → `buildLetterConfig()` → camino normalizado a la pauta. Las palabras salen de `buildWord()`, que empalma las letras con conectores Bézier de 20px de costura. `buildWord()` compone de izquierda a derecha y no recentra: de eso se encarga el motor al derivar el nivel (§2).

Requisito para que una letra sirva en Fases 4-5: `isWordEligible()` debe dar `true`, o sea que el trazo arranque donde dice su ancla de entrada.
