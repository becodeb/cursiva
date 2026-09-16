# El prólogo: el Pulpito es el cuidador del zoológico

Directiva del usuario, 2026-09-16. **Es el próximo trabajo.** Reordena la
entrada que hoy existe en `main` para que la historia se entienda antes de
que aparezca el primer nivel.

Se apoya en `docs/11` ("NIVEL 1 — EXPLORACIÓN Y DESCUBRIMIENTO", escenas 1 a
4) y en `docs/12` §1 ("Después de la introducción… la cámara se aleja y
aparece la vista general del zoológico"). Donde esos documentos difieren de
lo que dice acá, **gana este**.

---

## 1. El problema que resuelve

La app abre en el **mapa del zoológico**, con el sector `entrada` como único
sector abierto. Tocarlo entra a la aventura `glass`, cuya pantalla de entrada
dice una sola frase:

> "El vidrio de la pecera está todo sucio. ¿Lo limpiamos?"

Después vienen `glass1..4`, sin cierre. Después la aventura `sand` con su
frase, `sand1..4`, y recién ahí un cierre —el **único** `closingBeat` del
juego entero (`zoo/adventures.ts:122`):

> "¡Se fueron todos los animales! Agarrá la lupa: los vamos a buscar."

O sea: **la historia entera del prólogo está en esa última oración.** El
chico limpia ocho pantallas sin saber quién es el Pulpito ni por qué limpia,
y al final se le anuncia de golpe que faltan todos los animales —animales que
nunca vio, en recintos que nunca se presentaron como recintos—. El vidrio
está "sucio", no empañado; cuando queda limpio no falta nadie, porque nunca
se dijo quién debería estar.

El motor está bien y la progresión de dificultad está bien. Lo que falta es
que el chico **descubra** la ausencia en vez de que se la cuenten.

## 2. La secuencia que tiene que quedar

```
  ┌─ 0. Presentación ──────────────────────────────────────────────┐
  │  El Pulpito es el CUIDADOR del zoológico. Carrito, elementos   │
  │  de limpieza, el zoológico abierto y con animales. El chico    │
  │  es su ayudante y no aparece en pantalla.                      │
  └────────────────────────────────────────────────────────────────┘
                              ↓
  ┌─ 1. Primer recinto: los peces ─────────────────────────────────┐
  │  Una pecera grande con el vidrio empañado. El chico pasa el    │
  │  dedo y lo desempaña. Detrás aparecen las algas, el cofre, las │
  │  piedras… y NO HAY PECES. Un cartel con imagen + la palabra    │
  │  PECES dice qué debería haber ahí.                             │
  │  Pulpito: "¿Y los peces?"                                      │
  └────────────────────────────────────────────────────────────────┘
                              ↓
  ┌─ 2. Segundo recinto: las tortugas ─────────────────────────────┐
  │  Arena que tapa el recinto. El chico la barre. Quedan las      │
  │  piedras, las hojas, el tronco… y NO HAY TORTUGAS.             │
  └────────────────────────────────────────────────────────────────┘
                              ↓
  ┌─ 3. Tercer recinto ────────────────────────────────────────────┐
  │  Otra superficie, otra acción de limpieza. Tampoco está el     │
  │  animal. A esta altura el chico ya anticipa el patrón: ese     │
  │  es el punto.                                                  │
  └────────────────────────────────────────────────────────────────┘
                              ↓
  ┌─ 4. Cuarto recinto: LAS HUELLAS ───────────────────────────────┐
  │  Se limpia como los anteriores, pero al terminar, además del   │
  │  recinto vacío, aparecen HUELLAS en el piso.                   │
  │  Pulpito: "¡Miré! ¿Y esto?"                                    │
  └────────────────────────────────────────────────────────────────┘
                              ↓
  ┌─ 5. Nace el detective ─────────────────────────────────────────┐
  │  El Pulpito saca la LUPA (y/o se pone el sombrero). La lupa    │
  │  entra a la mochila. Es el primer objeto que gana.             │
  └────────────────────────────────────────────────────────────────┘
                              ↓
  ┌─ 6. La cámara se aleja → EL MAPA ──────────────────────────────┐
  │  Aparece el mapa del zoológico (docs/12). Casi todo con        │
  │  niebla. Unas huellas salen de la plaza hacia UN sector.       │
  │  Pulpito: "¡Mirá! Las huellas van hacia allá. ¿Vamos?"         │
  │  Recién acá empiezan los niveles que ya existen.               │
  └────────────────────────────────────────────────────────────────┘
```

## 3. Qué es nuevo y qué ya existe

| Beat | ¿Existe hoy? | Qué falta |
|---|---|---|
| 0. Presentación del cuidador | **No** | Pantalla (o video) de apertura. Ver §4 |
| 1-4. Limpiar cuatro recintos | **El motor sí** (`reveal: { mode:'erase' }`, `levels/revealGrid.ts`, `canvas/RevealLayer.tsx`) | Hoy son **dos** superficies (vidrio, arena), no cuatro recintos. Ninguna tiene un animal ausente propio |
| Entrada narrativa por recinto | **Sí, el componente existe**: `screen/AdventureIntro.tsx` (Pulpito + bocadillo + imagen + una frase, tap para entrar). Lo usa cada aventura | Cuatro aventuras en `entrada` en vez de dos, con sus frases |
| Cartel con imagen + palabra (PECES) | **A medias**: `detective/CaptionedArt.tsx` es exactamente imagen + palabra, y `captionAudit.ts` obliga a que ninguna palabra vaya sola | El marco de cartel de madera del zoológico, y ponerlo dentro del nivel, no solo en el bocadillo |
| "Falta el animal" al terminar | **El componente sí**: `screen/AdventureClosing.tsx`. Pero **solo `sand` declara un `closingBeat`** (`zoo/adventures.ts:122`); las otras nueve aventuras del juego vuelven al mapa sin decir nada | Un `closingBeat` por recinto |
| 4. Las huellas | **El arte sí** (`zoo-octopus-print.png`, `clue-footprint-*.png`) y el mapa ya las dibuja (`sectors.ts:601`) | Que aparezcan **dentro** del cuarto recinto al terminar de limpiarlo |
| 5. La lupa / detective | **A medias**: la lupa se gana en `sand4` (`zoo/backpack.ts:41`) y el cierre de `sand` la nombra. El Pulpito ya lleva la lupa como `carrier` en los niveles de camino (`LevelPlay.tsx:1941`) | El **momento**: hoy es una línea de texto, no una transformación en pantalla |
| 6. El mapa con huellas hacia un sector | **Sí, hecho y funcionando** (`screen/ZooMap.tsx`, `zoo/sectors.ts`: niebla, huellas desde la plaza, bocadillo, animales recuperados, mochila, estrellas) | Nada. El prólogo desemboca ahí |

**La conclusión importante**: no hace falta motor nuevo, ni componentes
nuevos de pantalla. `AdventureIntro` y `AdventureClosing` ya son el par de
entrada/cierre narrativo, y están **infrautilizados**: nueve de diez
aventuras no tienen cierre. El trabajo es de **guion, arte y datos**
(`zoo/adventures.ts`), más una pantalla de apertura. El riesgo es bajo.

## 4. La presentación del cuidador (beat 0)

El usuario quiere, idealmente, **un video corto** generado por IA a partir de
los assets del personaje. Criterio para no bloquear el avance:

1. **Ahora**: una secuencia de **2 o 3 pantallas fijas** encadenadas, con el
   mismo patrón de `AdventureIntro.tsx` (fondo, Pulpito, bocadillo, una frase
   corta, tap para avanzar). Es la versión que se puede construir y probar ya.
2. **Después**: se reemplaza por un `<video>` cuando exista, sin tocar el
   resto del flujo. Por eso la pantalla de presentación tiene que ser **un
   componente con una sola responsabilidad**: mostrar la apertura y avisar
   cuando termina. Si mañana adentro hay un video en vez de tres láminas, el
   resto de la app no se entera.
3. El video **nunca** puede ser obligatorio para jugar: botón de saltar
   siempre visible, y si el archivo no carga, se cae a las láminas fijas.

Las tres frases propuestas (una por lámina):

> 1. "¡Hola! Soy el Pulpito y cuido este zoológico."
> 2. "Todas las mañanas limpio los recintos."
> 3. "¿Me ayudás?"

## 5. Los cuatro recintos

`docs/11` fija los dos primeros (peces, tortugas) y deja el tercero abierto.
Propuesta para cerrar los cuatro:

| # | Recinto | Superficie a limpiar | Animal ausente | Qué queda a la vista |
|---|---|---|---|---|
| 1 | Pecera | Vidrio **empañado** (vaho) | PECES | Algas, cofre, piedras, burbujas |
| 2 | Tortugas | **Arena** que se barre | TORTUGAS | Piedras, tronco, hojas, agua baja |
| 3 | Monos / aviario | **Hojas** que se apartan | MONOS | Sogas, ramas, frutas en el piso |
| 4 | Sendero del zoológico | **Barro** que se limpia | (ninguno: es el sendero) | El piso… y las HUELLAS |

El cuarto es distinto a propósito: no es un recinto con un animal ausente
más, es **el lugar donde aparece la pista**. Cierra el patrón en vez de
repetirlo una cuarta vez.

### Cómo se agrupan, y por qué así

**Un recinto = una aventura.** Esa es la unidad que el código ya tiene:
`zoo/adventures.ts` define una `Adventure` con `intro`, `levelIds`,
`closingBeat` y arte, y `GameScreen.tsx` ya sabe mostrar la entrada antes del
primer nivel y el cierre después del último. Cuatro recintos = cuatro filas
en `ADVENTURES` para el sector `entrada`, donde hoy hay dos (`glass`, `sand`).

**Los ocho ids de nivel no se tocan.** Son claves persistidas del progreso
(`glass1..4`, `sand1..4`) y además `zoo/sectors.ts` abre el estanque con
`isFiled('sand4')`. Se reparten en cuatro aventuras de dos niveles:

| Aventura | Ids | Recinto | Progresión interna |
|---|---|---|---|
| `peces` | `glass1`, `glass2` | Pecera, vidrio empañado | amplia y tolerante → cubrir todo el vidrio |
| `tortugas` | `sand1`, `sand2` | Arena del recinto | amplia → toda la superficie |
| `monos` | `glass3`, `glass4` | Hojas del aviario | más zonas → radio de dedo más chico |
| `sendero` | `sand3`, `sand4` | Barro del sendero | más fina → precisión, y aparecen las huellas |

Esto mantiene intacta la microprogresión que `catalog.test.ts` ya asegura
(`radius` no crece, `minAccuracy` no baja, `cols*rows` no baja, dentro de cada
familia) y sube de dos a cuatro los beats de historia sin agregar ni un nivel.

**Alternativa descartada**: cuatro aventuras de un nivel cada una, retirando
los otros cuatro ids. Hace el prólogo más corto pero rompe la progresión de
dificultad dentro de cada superficie y obliga a migrar progreso guardado.

**Requiere confirmación del usuario**: los nombres de los recintos 3 y 4
(monos y sendero) los propone este documento; `docs/11` deja el tercero
abierto y no tiene cuarto.

## 6. Qué mira `night1..4` (la linterna)

La zona nocturna con linterna **no** entra en el prólogo. Usa la misma grilla
de revelado pero es un sector del mapa (`docs/13` §3), con el erizo. Queda
donde está.

## 7. Arte que hay que pedirle a ChatGPT

Las referencias del PDF del primer caso
(`docs/referencias/primer-caso/`) muestran una dirección visual **mucho más
elaborada** que el arte actual del repo: ilustración con volumen, luz e
iluminación de escena. Todavía **no** es el estilo aprobado
(`docs/09_GUIA_DE_ESTILO_VISUAL.md` manda hoy). Para el prólogo alcanza con
arte funcional; el pase de estilo viene después.

Pedidos, en orden de bloqueo:

**Bloqueantes (sin esto el prólogo no se ve):**

1. `pulpo cuidador.png` — el Pulpito con delantal o gorra de cuidador, con su
   carrito de limpieza. Transparente, cuadrado. Es el personaje del beat 0.
2. `fondo pecera.png` — lo que hay **detrás** del vidrio: algas, cofre,
   piedras, burbujas. Sin peces. Opaco, 3:2.
3. `fondo recinto tortugas.png` — piedras, tronco, hojas, agua baja. Sin
   tortugas. Opaco, 3:2.
4. `fondo recinto monos.png` — sogas, ramas, frutas caídas. Sin monos.
   Opaco, 3:2.
5. `fondo sendero.png` — el sendero de tierra del zoológico, vacío. Opaco,
   3:2. (Puede reusarse `sector-forest-background.png` si hace falta
   destrabar.)
6. `cartel peces.png`, `cartel tortugas.png`, `cartel monos.png` — cartel de
   madera del zoológico con la silueta del animal y la palabra en mayúsculas.
   Transparentes, horizontales.
7. `pulpo lupa.png` — el Pulpito ya detective: lupa en un tentáculo, sombrero
   puesto. Es el beat 5. Transparente, cuadrado.

**Deseables:**

8. `capa vaho.png` — la textura de vidrio empañado que se borra. Hoy se
   dibuja por código; una textura dibujada queda mejor.
9. `carrito limpieza.png` — suelto, para la presentación.
10. El **video** del beat 0, cuando el resto esté funcionando.

Nota sobre coherencia: pedir el Pulpito cuidador y el Pulpito detective **en
una misma imagen** (dos poses en un solo pedido) hace que el personaje no
cambie entre una y otra. Lo mismo con los tres carteles.

## 8. Cómo no romper lo que funciona

- El mapa (`ZooMap`) ya sabe mostrar niebla, huellas hacia un sector y el
  bocadillo. El prólogo **desemboca** ahí; no lo reimplementa.
- `AdventureIntro` y `AdventureClosing` ya son los componentes de entrada y
  cierre narrativo reusables (`docs/13` §5). El prólogo los usa o los
  extiende; no crea un tercer patrón de pantalla.
- `game/migrateEntrance.ts` existe para proteger el progreso guardado cuando
  cambió el orden de la entrada. **Si cambia el agrupamiento de los ids, hay
  que revisarlo.** Los ids en sí no cambian, así que no debería hacer falta
  una migración nueva.
- `zoo/sectors.ts` abre el estanque con `isFiled('sand4')`. Con el
  agrupamiento de §5, `sand4` sigue siendo el último nivel del prólogo, así
  que la condición se sostiene sin tocarla.
- La veda de `url(#…)` sigue vigente: nada de `mask`, `clipPath`, `pattern`
  ni filtros SVG (`canvas/TraceCanvas.tsx`).
- El texto en pantalla nunca va solo: siempre imagen + palabra
  (`docs/12` §3). `detective/captionAudit.ts` lo verifica en tests.
- **Arte nuevo = tres lugares, no uno.** El pipeline es
  `art-source/*.png` → `python3 scripts/art/build_art.py` →
  `client/public/art/` + `manifest.json` → una fila nueva en
  `detective/assets.ts` con el `w`/`h` del manifest → alta en la lista
  `REGISTERED` de `detective/artManifest.test.ts`. Ese test **falla si sobra
  o falta un PNG**, y hoy afirma `REGISTERED.length === 81`: ese número sube
  con cada imagen. Los fondos opacos van por la tabla `PASSTHROUGHS` de
  `build_art.py`, que muestrea la franja del corredor.
- Los niveles de revelado pintan el velo con el color `tile` del backdrop de
  la aventura (`LevelPlay.tsx:1684`), así que el vaho verdoso o el barro
  salen de `zoo/backdrops.ts`, no de un PNG de velo.

## 9. El guion completo

Una frase de entrada y una de cierre por recinto. Corta, en voseo, siempre
acompañada de una imagen (`CaptionedArt`).

| Recinto | Entrada (`intro`) | Cierre (`closingBeat.line`) |
|---|---|---|
| Peces | "El vidrio de la pecera está todo empañado. ¿Lo limpiamos?" | "¡Las algas, el cofre, las piedras… pero no hay ni un pez!" |
| Tortugas | "La arena tapó todo el recinto. Barrámosla." | "Las piedras, el tronco… ¿y las tortugas dónde están?" |
| Monos | "Cayeron un montón de hojas. ¿Las sacamos?" | "Las sogas, las frutas… acá tampoco hay nadie." |
| Sendero | "El sendero quedó lleno de barro." | "¡Mirá! ¿Y esto? ¡Son huellas!" |

Y el cierre del prólogo, que ya existe y solo se corre de lugar: hoy es el
`closingBeat` de `sand`, y pasa a ser el momento de la lupa, después del
cierre del sendero:

> "¡Se fueron todos los animales! Agarrá la lupa: los vamos a buscar."
