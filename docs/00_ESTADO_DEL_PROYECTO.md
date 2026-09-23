# Estado del proyecto y mapa de la documentación

Actualizado el 2026-09-16, verificado contra el código de la rama
`sdd/prologo-cuidador`, no contra los documentos.

**2026-09-23:** hay una revisión completa jugando desde cero en `docs/18`, y
la rama `feat/adventure-flow-and-map-guidance` (sin mergear) implementa su
§5: la aventura se juega de corrido, la entrada es un nivel por recinto, el
mapa destaca el próximo lugar, la barra de camino reemplaza a PISTAS, cada
rescate tiene su cierre y todo se escucha. Encima, la rama `feat/promised-animals` (también sin mergear) suma las
aventuras de peces, tortugas y monos, el final de la historia y el toque que
corta la demo. **Lo que queda está en `docs/18`
§7**, que reemplaza la lista de §3 de acá para todo lo que toca. Leer `18`
primero.

---

## 1. Los documentos, y cuál manda

Se fueron acumulando por capas. **Cuando dos se contradicen, gana el más
nuevo.**

| Doc | Qué es | Vigencia |
|---|---|---|
| `01`–`08` | Visión, motor de trazo, progresión, MVP, roadmap, docker, animaciones, motor de niveles | **Técnicos, vigentes.** Los pedagógicos (`01`, `03`, `04`, `05`) están escritos en lenguaje de "Nivel N" y quedaron viejos: la unidad hoy es la aventura |
| `09_GUIA_DE_ESTILO_VISUAL` | Marcador grueso, paleta, el Pulpito, la hoja como lugar | **Vigente**, pero ver §4: hay arte de referencia nuevo con otra dirección |
| `10_HOME_LA_OFICINA_DEL_PULPO` | La home como oficina de objetos perdidos | **Reemplazado** por `12`. Vuelve más adelante como pantalla de capítulo (ver `15`) |
| `11_PULPITO_DETECTIVE_DIRECTIVA` | Primera directiva completa: Niveles 1 a 4 | **Parcialmente vigente.** Su "Nivel 1" (peces, tortugas, nace el detective) es la base de `16`. Su numeración por niveles la reemplazó `13` |
| `12_MAPA_DEL_ZOOLOGICO` | El mapa como pantalla principal | **Vigente e implementado** |
| `13_AVENTURAS_POR_ANIMAL` | La progresión va por animal y sector. Plan A–H | **Vigente. Es el documento de referencia del contenido.** Pasos A–H terminados |
| `14_PROYECTO_APP_PULPITO_DIRECTIVA` | Versión formalizada de `13` (transcripción del `.docx`) | **Vigente**, es la fuente de `13` |
| `15_PRIMER_CASO_OBJETOS_PERDIDOS` | El capítulo de las letras cursivas, empezando por la `i` | **Documentado, sin implementar. Etapa futura**, no el próximo paso |
| `16_PROLOGO_EL_CUIDADOR` | El prólogo: el Pulpito es el cuidador, limpia cuatro recintos, nacen las huellas y el detective | **Vigente e implementado** |
| `17_PEDIDOS_DE_ARTE_PROLOGO` | Los cuatro pedidos de arte del prólogo y cómo entra una lámina nueva | **Vigente.** Acorta la lista de `16` §7: cuatro de esos diez pedidos ya estaban dibujados |
| `18_DIAGNOSTICO_Y_REDISENO_PEDAGOGICO` | La app jugada como un chico de primer grado (2026-09-22): 29 defectos, qué hacen Matific y Glifing, la historia propuesta, pedidos de arte y lo que falta | **Vigente. Manda sobre `12`, `13` y `16`** en el flujo entre niveles, el orden de la entrada, qué es una pista y cómo se recupera un animal |

Los PDF y `.docx` originales están fuera del repo, en
`~/cursiva-pdfs-originales/`. Sus transcripciones (`11`, `14`, `15`) y sus
imágenes (`docs/referencias/`) son lo que vive acá.

## 2. Qué está hecho y funcionando

**Motor de trazo y niveles**: corredor con tolerancia, checkpoints,
continuidad, fluidez, puntaje, demo animada, retiro progresivo de guía,
tolerancia adaptativa, háptica, tono. `client/src/canvas/`, `client/src/levels/`.

**Mapa del zoológico** (`docs/12`, paso A): es la pantalla de entrada de la
app. Siete sectores, niebla sobre los cerrados, huellas hacia el recién
descubierto, animales recuperados, mochila, contador de estrellas, bocadillo
del Pulpito. `screen/ZooMap.tsx`, `zoo/sectors.ts`.

**El prólogo** (`docs/16`): pantalla de apertura de tres láminas donde el
Pulpito se presenta como cuidador, con botón de saltar siempre visible; los
cuatro recintos de la entrada, cada uno con su entrada y su cierre; y el
cierre del sendero en dos beats — las huellas, y después la lupa, donde el
pulpo se transforma en detective sin que se mueva nada más en pantalla.
`screen/PrologueOpening.tsx`, `zoo/prologue.ts`, `zoo/adventures.ts`.
El arte nuevo son seis placeholders (`scripts/art/make_placeholders.py`):
qué se pide para reemplazarlos está en `docs/17`.

**Las doce aventuras** (`docs/13`, pasos B–H, más los cuatro recintos del
prólogo). Las de `docs/13` llevan 4 niveles cada una:

| Sector | Aventuras | Mecánica |
|---|---|---|
| entrada | `peces` (`glass1-2`), `tortugas` (`sand1-2`), `monos` (`glass3-4`), `sendero` (`sand3-4`) | grilla de revelado, modo borrar |
| estanque | `duck-trail1..4`, medusa (`f2-*`), `dolphin1..4` | camino; los delfines con cámara que se desplaza |
| montañas | `sheep-hill1..4`, `llama-peak1..4` | cresta con altura por vértice |
| nocturna | `night1..4`, `hedgehog1..4` | revelado con linterna; trazos radiales sueltos |
| arena | `snake1..4` | el arte es el corredor; arrastre para ordenar |
| bosque | `bee1..4` | trazo libre con puntos de paso |

**Entrada y cierre narrativo**: `screen/AdventureIntro.tsx` y
`screen/AdventureClosing.tsx` — Pulpito, bocadillo, una imagen y una frase.
El cierre ahora puede ser una **secuencia** de beats, no uno solo, y un beat
puede cambiar la figura que está parada en escena: así se cuenta la
transformación de la lupa sin una tercera pantalla.

**Arte**: 87 PNG en `client/public/art/`, generados por
`python3 scripts/art/build_art.py` desde `art-source/`. Tests que fallan si
sobra o falta un asset, si el contraste de las pistas no gana, o si la paleta
se sale de banda.

**Tests**: 82 archivos, 1882 casos. `npm test` (vitest), `npm run build`
(`tsc --noEmit && vite build`). No hay linter en el repo.

## 3. Qué falta, en orden

1. **El arte del prólogo.** Los seis assets nuevos son placeholders: bloques
   de color con la palabra dibujada. Los pedidos están escritos en `docs/17`,
   agrupados en cuatro láminas para que el personaje no cambie entre una pose
   y otra. **Es el próximo trabajo, y no es de código.**
2. **Cierres narrativos en las otras ocho aventuras.** Los cuatro recintos
   del prólogo ya tienen el suyo. Las demás terminan y vuelven al mapa sin
   decir nada, así que "el animal apareció en el zoológico" nunca se cuenta.
3. **Pruebas en tablet.** Nadie las hizo todavía: corredor sobre agua, onda 4
   del pato, cámara de los delfines, rendimiento de la grilla de revelado.
4. **Decisiones de arte abiertas** (`docs/13` §4, ítems 5–10). Son de la
   autora, no de código: vaho verde y arena como barro, linterna de baldosas
   que dibuja una cruz, delfín chico y sobre la orilla, abeja que tapa la
   flor, espinas de `hedgehog1` como antenas.
5. **El caracol.** La consigna no está cerrada (`docs/13` §2): falta resolver
   cómo indicar que hay que seguir la espiral y no limpiar toda la superficie.
6. **Las letras cursivas** (`docs/15`). Etapa siguiente, no ahora.

## 4. Lo que hay que mirar de frente: el estilo visual

`docs/09` define el estilo actual: marcador grueso, formas planas, la hoja
como lugar. El arte de referencia que llegó con el primer caso
(`docs/referencias/primer-caso/`) es **otra cosa**: ilustración con volumen,
luz de escena, madera con textura, profundidad de campo.

Las dos direcciones no conviven. **La decisión no se toma ahora**: primero
que todo funcione con el arte que hay, después el pase de estilo. Pero
conviene saber que existe, porque cada asset nuevo que se pida hasta
entonces se va a tirar cuando esa decisión se tome.

## 5. Deuda conocida

- Pantallas huérfanas: `screen/Deduction.tsx` (la deducción de tres animales)
  solo se alcanza por `?nivel=deduccion`. `screen/LevelMap.tsx` y
  `screen/MainScreen.tsx` son chrome de desarrollo y el banco de letras viejo.
- Niveles inalcanzables desde el mapa: `f1-libre`, `trail1..4`,
  `f2-colinas`, `f2-bucles`, `f2-crestas`, y toda la fase de letras
  (`f3-*`, `f4-*`, `f5-*`).
- La barra de PISTAS muestra una sola pista real y tres marcadores vacíos: la
  persistencia entre niveles nunca se implementó (`LevelPlay.tsx:1770`).
- Las cuatro pantallas de medusa (`f2-*`) están en el sector estanque pero no
  tienen fila en `ADVENTURES`, así que no tienen entrada ni cierre narrativo.
- 15 secciones `## ADDED/MODIFIED Requirements` huérfanas en 4 specs de
  OpenSpec. El ledger `sdd-attempt` quedó en `interrupted` desde el paso F.
- `docs/01`–`05` siguen hablando de "Niveles 1 a 4" en vez de aventuras.

## 6. Cómo mirar la app

```bash
npm test                       # 86 archivos, 2065 casos (rama feat/adventure-flow-and-map-guidance)
npm run build                  # tsc --noEmit && vite build
npm run dev                    # vite
bash scripts/shot.sh <url> capturas/x.png 1000 600
```

Flags de depuración: `?debug=sectores`, `?debug=ordenadas:<k>`,
`?debug=espina`, `?debug=estela:<k>`, `?debug=espinas:<k>`,
`?debug=camara:<x>`, `?debug=progreso:<ids>`, `?debug=pato-recuperado`.
Enlaces directos: `?nivel=<id>`, `?nivel=intro-<id>`, `?nivel=cierre-<id>`,
`?nivel=cierre-<id>:<n>` (el beat n del cierre), `?nivel=apertura`,
`?nivel=apertura:<n>`, `?nivel=mapa`, `?nivel=deduccion`.

Las capturas de cada paso ya hecho están en `capturas/` (fuera de git).
Mirarlas antes de pedir cambios.
