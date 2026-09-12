# Home: la oficina del pulpo

Ideada el 2026-09-11. Estado: **corte 1 implementado el 2026-09-11** — el
pulpo, la lupa como continuar, la lámpara y el riel con estado real, y un solo
modo (`detective`) en el registro. El lápiz y el mapa siguen sin entrar: sus
modos no existen. Es la pantalla
a la que llega el chico al abrir la app (y, cuando exista el login, después
de iniciar sesión). Reemplaza como pantalla de entrada al banco de letras
actual (`client/src/screen/MainScreen.tsx`), que pasa a ser un modo más.

Se rige por `docs/09_GUIA_DE_ESTILO_VISUAL.md`. Si algo de este documento
la contradice, gana la guía.

---

## 1. La idea en una frase

La home es **el pulpo detective en su oficina**, con la lupa en un brazo.
Tocar la lupa es "seguir por donde lo dejé". Cada modo futuro del juego es
**un objeto que el pulpo sostiene en otro brazo**. No hay menú, no hay
texto, no hay botón "Iniciar".

## 2. Por qué así

- **Sin texto.** El chico tiene cinco años y el modo detective entero es
  sin palabras (cáscara sin texto, D6 de `PISTAS`). Un botón "Iniciar" en la
  primera pantalla rompe eso. La acción tiene que leerse por la imagen.
- **Es el mismo lugar.** Pasto, tierra, papel `#fdfcf7`, el mismo pulpo.
  La home no es "otra app" delante del juego: es la oficina desde la que
  sale a investigar.
- **Los ocho brazos son el sistema de expansión.** Hoy hay un modo (los
  rastros de pistas). Cuando aparezca otro, se le da un objeto y un brazo.
  La pantalla no se rediseña: se agrega un objeto. Ocho brazos son el tope
  natural y sobra.
- **El progreso se ve, no se lee.** La lámpara encendida y el riel de
  pistas ganadas/apagadas ya existen. En la home muestran el caso en
  curso de un vistazo.

## 3. Cómo se ve

```
┌──────────────────────────────────────────┐
│  pasto  ···  pasto  ···  pasto  ···      │
│                                          │
│      🔦 (lámpara)          ●●○○ (riel)   │
│                                          │
│               ( PULPO )                  │
│          ✏️  /   |   |   \   🗺           │
│       apagado    🔍 grande    apagado     │
│         ─────── escritorio ───────       │
│  tierra ··· tierra ··· tierra ···        │
└──────────────────────────────────────────┘
```

- **Pulpo** en el centro, cuerpo entero, ocho brazos abiertos con las
  puntas libres. Es el único elemento grande.
- **Lupa** sostenida en un brazo delantero, grande y a mano. Es el
  "continuar". Es el único elemento con movimiento: un pulso suave cada
  pocos segundos, como diciendo "acá". Nada más se mueve por sí solo.
  Con `prefers-reduced-motion` el pulso no existe.
- **Lámpara y riel** arriba, chicos, con el estado real del caso en curso.
- **Objetos de otros modos** en los brazos laterales. Un modo bloqueado
  muestra el objeto en gris pista apagada (`#838383`, ver docs/09 §4), derivado por el
  pipeline igual que las pistas apagadas. Un modo que todavía no existe
  no muestra nada: el brazo queda vacío.
- **Escritorio** de madera, plano, delante del pulpo. Da el "lugar" sin
  competir con el personaje.
- **Sin cabecera, sin título, sin texto.** La palabra "cursiva" no va.

Tocar el pulpo entero también entra al modo activo. Blanco de toque de
al menos 96 unidades del lienzo para la lupa y cada objeto.

## 4. Comportamiento

| Acción | Resultado |
|---|---|
| Tocar la lupa o el pulpo | Abre el rastro siguiente sin terminar. Si el caso está completo, abre la deducción o el siguiente caso. |
| Tocar un objeto activo | Entra a ese modo. |
| Tocar un objeto apagado | Nada. A lo sumo un pequeño temblor del objeto. Sin diálogo, sin texto. |
| Volver de un modo | Vuelve a la home con el estado ya actualizado. |

"Por donde lo dejé" sale del store existente de niveles
(`cursiva.levels.v1`). El login no cambia esta pantalla: cambia de dónde
sale el progreso.

## 5. Arquitectura: un modo es un objeto, no código

Misma filosofía que el motor de niveles (`catalog.ts`): la home recorre un
registro declarativo y lo reparte en los brazos.

```ts
// client/src/home/modes.ts  (propuesto)
export interface HomeMode {
  id: 'detective' | 'cuaderno' | 'casos'    // crece con cada modo
  arm: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7        // qué brazo lo sostiene
  art: ArtImage                             // objeto, estado activo
  artLocked: ArtImage                       // objeto en gris apagado
  unlocked: (progress: LevelsProgress) => boolean
  enter: 'trail' | 'letters' | 'caseMap'    // a qué pantalla va
}
```

- Las **ocho anclas de brazo** son coordenadas fijas sobre el lienzo de la
  home, medidas una vez contra el arte del pulpo y declaradas en el mismo
  módulo. El pulpo se dibuja una sola vez; los objetos se posicionan por
  ancla. Esto evita ocho versiones del pulpo con distintos objetos.
- Agregar un modo = agregar una entrada al array + sus dos PNG.
- Todo el arte entra por `client/src/detective/assets.ts` y se deriva con
  `scripts/art/build_art.py` desde `art-source/`. Nunca a mano.
- `HomeScreen` vive en `client/src/screen/`, con estilos inline como
  `MainScreen` y `LevelMap` (no ven `LAYOUT_CSS`). Lógica de "qué toca
  seguir" extraída a una función pura exportada y testeada con
  `renderToString`, como todo el repo.
- El banco de letras actual (`MainScreen`) queda como modo `cuaderno`,
  detrás de un objeto lápiz. No se borra: se enruta.

Primer corte razonable: home con el pulpo, la lupa como continuar, la
lámpara y el riel con estado real, y un solo modo (`detective`). Los
otros objetos entran cuando exista su modo.

**Lo que el corte 1 cambió respecto de este documento, y por qué.**

- `artLocked` es `ArtImage | null`, no `ArtImage`. Un modo que no puede
  bloquearse nunca —hoy, `detective`— obligaría a derivar un gris que nada
  dibuja, y `artManifest.test.ts` rechaza por nombre el arte que el registro
  no puede alcanzar. `null` significa "brazo vacío".
- La entrada lleva además un `grip`: dónde agarra el brazo ese objeto, en
  fracciones de su propia caja. Hizo falta porque `carrier-lens.png` **no**
  está centrado en la lente: `build_art.py` la centra con padding en el paso
  `CENTRED` y después `emit()` recorta cada salida a su bounding box de alfa,
  que le saca justo ese padding. Medido sobre el archivo embarcado, la lente
  cae en (0.603, 0.391). Es un dato del registro, no un offset escondido en el
  renderer. **`TraceCanvas` no lo compensa**: centra la lupa por su caja
  (`CARRIER_ART_SIZE`, con un comentario que afirma que el archivo viene
  padeado), así que en un rastro la lente va unas 11 unidades arriba y a la
  derecha de la yema. Es un defecto preexistente, fuera del alcance de este
  corte.
- El riel de la home no usa `PistasRail`: ese componente no trae estilos
  propios y depende del `LAYOUT_CSS` de `LevelPlay`, que esta pantalla
  deliberadamente no monta (§5). El riel se dibuja adentro del lienzo con
  `LAMP_ART` y `CLUE_ART` directo, y sin la palabra PISTAS — acá no hay texto.
- La vuelta desde un modo todavía cae en el mapa de niveles, no en la home.
  El enlace "la oficina" vive en el pie del mapa, que es chrome de desarrollo
  y nunca aparece en la home.

## 6. Arte necesario

Se **reutiliza** sin pedir nada nuevo: la lupa (`art-source/lupa.png`), la
lámpara encendida y apagada, las pistas del riel, pasto y barro.

Hace falta pedir **cuatro imágenes nuevas**. Todas con las mismas reglas
técnicas:

- PNG con **fondo transparente**, cuadrado 1:1, 1024 o más. Sin sombra
  proyectada en el piso, sin fondo, sin texto, sin marca de agua.
- El objeto **entero y centrado**, con aire alrededor. Nada cortado por el
  borde.
- Estilo marcador grueso (sección 1 de la guía): contorno negro azulado
  parejo con puntas redondeadas, relleno plano, formas gordas, sin
  sombreado ni volumen.
- **Adjuntar siempre `art-source/pulpo con lupa.png` como referencia** de
  estilo, grosor de línea y personaje. Es lo que mantiene todo en la misma
  familia. Sin la referencia, ChatGPT deriva a otro estilo.

### 6.1 Pulpo de cuerpo entero, brazos libres

Archivo destino: `art-source/pulpo oficina.png`.

> Usá la imagen adjunta como referencia exacta de estilo y de personaje.
> Dibujá el MISMO pulpo (mismo naranja coral, mismos ojos grandes blancos
> con pupila oscura, mismo contorno azul marino grueso y parejo con puntas
> redondeadas, relleno plano sin sombreado). Esta vez de cuerpo entero, de
> frente, sentado, con los OCHO brazos abiertos en abanico hacia los
> costados, bien separados entre sí, y las ocho puntas de los brazos
> libres y visibles, enroscadas apenas, como listas para sostener algo.
> NO sostiene nada: sin lupa, sin objetos. Expresión curiosa y contenta.
> Ilustración plana estilo marcador grueso, un solo color por forma, sin
> degradados, sin brillos, sin sombra en el piso. PNG con fondo
> transparente, formato cuadrado, el pulpo entero y centrado con margen
> alrededor, sin texto.

Revisar al recibirla: que los ocho brazos se cuenten a simple vista y que
ninguna punta se cruce con otra. Si dos brazos se tocan, pedirla de nuevo.

### 6.2 Escritorio de detective

Archivo destino: `art-source/escritorio.png`.

> Usá la imagen adjunta como referencia de estilo (grosor de contorno,
> relleno plano, formas redondeadas). Dibujá un escritorio de madera de
> detective, visto de frente, ancho y bajo, vacío, sin nada encima: solo
> la tabla y las patas. Madera marrón cálido en un solo tono plano, veta
> sugerida con dos o tres líneas gruesas como mucho. Contorno azul marino
> grueso y parejo con puntas redondeadas. Sin sombreado, sin degradados,
> sin sombra en el piso, sin fondo. PNG con fondo transparente, formato
> cuadrado, el escritorio entero y centrado con margen, sin texto.

### 6.3 Lápiz (modo cuaderno de letras)

Archivo destino: `art-source/lapiz.png`.

> Usá la imagen adjunta como referencia de estilo. Dibujá un lápiz gordo
> y corto, en diagonal, con punta afilada y goma de borrar rosada en la
> otra punta. Cuerpo amarillo en un solo tono plano, punta de madera en
> beige plano, mina gris oscura. Contorno azul marino grueso y parejo con
> puntas redondeadas, sin sombreado, sin brillos. Proporciones gordas y
> simples, legible a tamaño chico. PNG con fondo transparente, formato
> cuadrado, el lápiz entero y centrado con margen, sin texto.

### 6.4 Mapa de casos (modo elegir caso)

Archivo destino: `art-source/mapa.png`.

> Usá la imagen adjunta como referencia de estilo. Dibujá un mapa de
> papel desplegado, un poco arrugado, con un camino de puntos que lleva a
> una X grande. Papel beige claro en un solo tono plano, camino y X en
> rojo plano. Contorno azul marino grueso y parejo con puntas redondeadas,
> sin sombreado, sin degradados. Formas gordas y simples, sin detalles
> finos. PNG con fondo transparente, formato cuadrado, el mapa entero y
> centrado con margen, sin texto ni letras en el papel.

### 6.5 Estados apagados

No se piden. El pipeline los deriva recoloreando a `#838383` con el
contorno intacto, igual que hace con las pistas.

### 6.6 Prompt único para ChatGPT con acceso a los archivos del repo

Pensado para pegar tal cual en un ChatGPT que puede leer y escribir en la
carpeta del proyecto. Pide las cuatro imágenes de una vez, con nombre y
carpeta de destino.

> Estás trabajando en la carpeta del proyecto `cursiva`. Abrí
> `art-source/pulpo con lupa.png` y usalo como referencia exacta de
> estilo y de personaje para todo lo que sigue: pulpo naranja coral, ojos
> grandes blancos con pupila oscura, contorno azul marino grueso y
> parejo con puntas redondeadas, relleno plano de un solo color por
> forma, sin sombreado, sin degradados, sin brillos, sin sombra en el
> piso. Es estilo "marcador grueso": formas gordas y simples, legibles a
> tamaño chico.
>
> Generá cuatro imágenes y guardá cada una en la carpeta `art-source/`
> con el nombre exacto que indico. Reglas comunes a las cuatro: PNG con
> fondo transparente, formato cuadrado de 1024×1024 o más, el objeto
> entero y centrado con margen alrededor, nada cortado por el borde, sin
> fondo, sin texto, sin letras, sin marca de agua.
>
> 1. `art-source/pulpo oficina.png`: el MISMO pulpo de la referencia, de
>    cuerpo entero, de frente, sentado, con los ocho brazos abiertos en
>    abanico hacia los costados, bien separados entre sí, las ocho puntas
>    libres y visibles, apenas enroscadas como listas para sostener algo.
>    No sostiene nada: sin lupa, sin objetos. Expresión curiosa y
>    contenta. Los ocho brazos tienen que contarse a simple vista y
>    ninguna punta puede tocar a otra.
>
> 2. `art-source/escritorio.png`: un escritorio de madera de detective
>    visto de frente, ancho y bajo, vacío, sin nada encima: solo la tabla
>    y las patas. Madera marrón cálido en un solo tono plano, veta
>    sugerida con dos o tres líneas gruesas como mucho.
>
> 3. `art-source/lapiz.png`: un lápiz gordo y corto en diagonal, punta
>    afilada y goma rosada en la otra punta. Cuerpo amarillo plano, punta
>    de madera beige plana, mina gris oscura.
>
> 4. `art-source/mapa.png`: un mapa de papel desplegado, un poco
>    arrugado, con un camino de puntos que lleva a una X grande. Papel
>    beige claro plano, camino y X en rojo plano. Sin letras en el papel.
>
> Cuando termines, listá los cuatro archivos guardados con su tamaño en
> píxeles y confirmá que el fondo es transparente.

Al recibirlas, revisar en este orden: fondo transparente real (no blanco
pintado), los ocho brazos del pulpo separados, y que cada objeto se
siga leyendo achicado a 60 píxeles de alto.

## 7. Qué NO es esta pantalla

- No es un mapa de niveles con casilleros numerados.
- No es un menú de botones con texto.
- No lleva título, logo ni la palabra "cursiva".
- No tiene más de un elemento con movimiento propio.
