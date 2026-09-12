# El mapa del zoológico: la pantalla principal

Directiva del 2026-09-12. **Reemplaza** a la home "oficina del pulpo" de
`docs/10`. Estado: **propuesta, sin implementar**. Se rige por
`docs/09_GUIA_DE_ESTILO_VISUAL.md`; el contenido de cada sector lo define
`docs/13_AVENTURAS_POR_ANIMAL.md`.

---

## 1. La directiva

La aplicación no es una sucesión de niveles. El chico entra a un mundo, el
zoológico del Pulpito, y desde ese mundo accede a distintas experiencias.

Después de la introducción (el Pulpito trabaja como cuidador, encuentra el
vidrio empañado, el chico lo ayuda a limpiarlo y juntos descubren que los
animales desaparecieron), la cámara se aleja y aparece la vista general
del zoológico.

- El mapa tiene **sectores**: la entrada, el bosque, el estanque, las
  montañas, la zona de arena, el sendero y una zona nocturna. Al principio
  no están todos disponibles.
- Los sectores todavía inaccesibles están **cubiertos por niebla**, no por
  candados. El chico sabe que hay algo ahí, pero no sabe qué.
- En el centro está el **Pulpito con su mochila**.
- Cada sector contiene una parte de la búsqueda de los animales. No son
  botones disfrazados de lugares.
- Cuando algo se descubre, unas **huellas** van desde el Pulpito hacia el
  sector y el Pulpito dice: "¡Mirá! Las huellas van hacia allá. ¿Vamos?".
- Al completar las experiencias de un sector pasa algo en la historia:
  aparece el **animal recuperado** en el zoológico, el Pulpito tiene un
  **objeto nuevo en la mochila**, y se descubre un sector nuevo.
- Tres elementos permanentes en la pantalla: la **mochila**, los
  **animales recuperados** y las **estrellas** conseguidas.
- El mapa muestra el avance de la aventura. Las estrellas sirven para
  conseguir herramientas, objetos o pequeñas recompensas. Son dos cosas
  distintas y no se mezclan.
- El chico no tiene avatar. Está "afuera" de la pantalla, ayudando.

## 2. Cómo se ve

```
┌────────────────────────────────────────────────┐
│ [mochila]        [animales recuperados]  [★ 12]│
│   ~niebla~                 /\/\                │
│   nocturna               montañas              │
│                                                │
│  ~~~~~~~                              ~~~~~~   │
│  bosque   · · · · (PULPITO) · · · ·  estanque  │
│  ~~~~~~~            plaza      ·      ~~~~~~   │
│                                 ·   ~niebla~   │
│                    ▲▲▲            arena        │
│                  entrada                       │
└────────────────────────────────────────────────┘
```

Los puntitos son las huellas hacia el sector recién descubierto. La
niebla tapa los sectores cerrados. Los sectores abiertos se ven limpios.

## 3. Cómo se implementa, y por qué así

**La escena no se compone por código.** La oficina del pulpo quedó fea
justamente por eso: pasto disperso en franja, barro suelto, un escritorio
tapando los brazos. Para el mapa, el fondo es **una sola ilustración
dibujada entera** (`art-source/mapa zoologico.png`), y el código solo
apoya capas encima en coordenadas fijas.

- Un `<svg viewBox="0 0 1000 600">` con `<image>` del mapa a pantalla
  completa y `preserveAspectRatio="xMidYMid slice"`. El mapa viene en
  3:2 y se recorta un poco arriba y abajo; el margen del 8% que se le
  pidió al dibujo lo tolera. El fondo del documento es el color del borde
  del mapa, no un tercer blanco (guía §7).
- **Registro declarativo** `client/src/zoo/sectors.ts`, un objeto por
  sector: `id`, `hit` (rect en unidades del viewBox, mínimo 120×120),
  `fog` (lista de `{art, x, y, size, rot}` para apoyar las nieblas),
  `animalSpot {x, y}`, `adventureIds`, y `unlockedWhen(records)` como
  función pura. Las coordenadas salen primero de la grilla que se pidió
  en el dibujo y después se ajustan midiendo el PNG real.
- **Capas, en orden**: mapa; niebla por sector cerrado; animales
  recuperados en su `animalSpot`; huellas (`huella pulpo.png` repetida
  cada 40 unidades desde la plaza hasta el sector recién descubierto,
  alternando izquierda/derecha como ya hace `clueMarks`); el Pulpito con
  mochila en la plaza (~150 de alto); el bocadillo con la frase y la
  huella adentro, solo cuando hay sector recién descubierto; y el HUD.
- **HUD** como DOM con Nunito, fuera del SVG: mochila arriba a la
  izquierda, animales recuperados como fila de retratos chicos arriba al
  centro, estrella con número arriba a la derecha.
- **Estrellas** = suma de las estrellas ganadas por nivel en los records
  existentes. **Mochila** = registro `client/src/zoo/backpack.ts`, un
  objeto por ítem con su condición de obtención.
- **Un solo movimiento propio**: la niebla del sector recién descubierto
  se desvanece una vez (opacidad, 1,5 s). Respeta
  `prefers-reduced-motion`.
- Tocar un sector abierto entra a la primera aventura sin completar de
  ese sector. Tocar un sector con niebla no hace nada. Volver de un nivel
  cae en el mapa. `LevelMap` queda como chrome de desarrollo.
- Sin `url(#)`: nada de `mask`, `clipPath`, `pattern` ni filtros.

**Texto en pantalla**: la frase del Pulpito va en el bocadillo con la
huella adentro; el número de estrellas va junto a la estrella. Nunca una
palabra sola sin su imagen.

## 4. Para que no pueda salir mal

- Test puro: para cada sector cerrado, la unión de los rects de su niebla
  contiene el `hit` entero.
- Test puro: ningún `hit` se superpone con otro ni con la plaza.
- Flag `?debug=sectores` que dibuja los `hit` y los `animalSpot` en rojo
  semitransparente. Se saca captura con y sin el flag. Si un rect no cae
  sobre su sector en el dibujo, se corrige el registro, no el dibujo.
- Capturas a 1000×600 y a una relación de tablet vertical para ver el
  recorte del `slice`.

## 5. Arte

Pedido en la ronda del 2026-09-12: `mapa zoologico.png` (opaco, 3:2),
`niebla 1/2/3.png`, `pulpo mochila.png`, `mochila.png`, `estrella.png`,
`huella pulpo.png`, `bocadillo.png`. Los animales recuperados usan el
arte que ya existe de cada animal.
