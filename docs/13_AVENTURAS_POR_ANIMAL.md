# Aventuras por animal: la progresión grafomotora dentro del zoológico

Directiva del 2026-09-12. Es la que manda sobre el contenido de los
sectores del mapa (`docs/12`). Donde contradice a `docs/11` (los "Niveles
1 a 4"), gana esta. Estado: **documentada; el cruce con el código está en
la sección 4 y el plan en la 6.**

---

## 1. Principio

Dos capas que se mantienen separadas:

- **Lo que ve el chico**: una historia. El Pulpito es cuidador del
  zoológico, recorre los sectores haciendo tareas de cuidado, descubre que
  faltan animales y pasa a ser Pulpito detective. El chico es su ayudante
  y no aparece en pantalla.
- **Lo que se trabaja**: la progresión grafomotriz. Exploración y control
  del movimiento, direccionalidad, coordinación, continuidad, cambios de
  dirección, curvas, ritmo, regulación, inhibición y precisión. Las
  letras vienen mucho después.

Criterio general para subir la dificultad, en este orden: recorrido
amplio → repetición → variación de amplitud → cambio de dirección →
reducción de espacio → mayor precisión → obstáculos o inhibición. **Las
dificultades se introducen cuando el movimiento ya está comprendido.**
Los obstáculos aparecen después, nunca al comienzo.

## 2. Las aventuras

Secuencia armada: **exploración libre → patos → víboras → ovejas →
llamas**. Para integrar según progresión: **medusa, caracol, abejas,
delfines**.

### Exploración libre (antes de pedir precisión)

El chico mueve el dedo libremente y descubre. Vidrio empañado que se
limpia y muestra lo que hay detrás; arena que se barre; linterna que
ilumina; objetos ocultos. Trabaja exploración, movimiento intencional y
relación acción-consecuencia.

### Patos: pequeñas ondulaciones

Escenario: la laguna de los patos. Ondulaciones pequeñas y suaves, al
principio casi una recta. Progresión: (1) ondulación muy suave y amplia,
(2) más cantidad de ondas pequeñas, (3) variación de amplitud, (4)
caminos más delimitados. Trabaja continuidad, pequeñas variaciones
verticales, ritmo, regulación progresiva.

### Víboras: el animal es el trazo

El cuerpo de la víbora es el recorrido. Varias víboras de distintos
tamaños y ondulaciones. Primero el chico las **ordena** de la más chica a
la más grande; después **recorre** con el dedo el cuerpo de cada una; más
adelante cambia la orientación (horizontal, vertical, oblicua) y varían
las ondulaciones. Una vez ordenadas o encontradas, se **llevan** a un
lugar adecuado dentro de su sector (no a un frasco). Trabaja seriación,
tamaño, movimiento ondulatorio, orientación espacial, precisión
progresiva.

### Ovejas: montañitas cortas

Las ovejas se escaparon y hay que ayudarlas a volver. Pequeñas montañas.
Progresión: (1) dos o tres montañas grandes con espacio amplio, (2) más
subidas y bajadas, (3) camino más angosto y tamaño menor, (4) alternancia
de alturas alta-baja-alta-baja. Trabaja ascenso y descenso, cambios de
dirección, continuidad, regulación de amplitud. Los obstáculos aparecen
después.

### Llamas: picos más altos y angulosos

Ambiente propio: montañas más rectas, empinadas y angulosas. Las llamas
están en distintos picos y se suben y bajan reuniéndolas. Alternancia de
picos bajos y altos. Trabaja cambios de dirección marcados, altura,
continuidad, precisión.

### Medusa: movimientos en U

Ya construida. Cuatro desafíos de U con microprogresión y el cuarto con
"frenar y continuar" (la estrella de mar que cruza). Ver `docs/11`.

### Caracol: la espiral

Movimiento nuevo. Progresión: grande y abierta → intermedia → pequeña y
cerrada. Idea propuesta: después de la lluvia los caparazones quedan con
barro y se limpian siguiendo la espiral. **La consigna no está cerrada**:
el movimiento vale, la consigna hay que revisarla para que sea intuitiva.

### Abejas: volver al panal

El chico crea el recorrido y la abeja sigue de inmediato la estela que
deja su dedo. Puede pasar por flores y llegar al panal. Trabaja
continuidad, curvas, coordinación, respuesta inmediata.

### Zigzag de delfines

Los delfines se alternan arriba y abajo; el Pulpito pasa entre ellos sin
tocarlos, arriba-abajo, rítmico y sostenido. A diferencia del resto, el
recorrido puede ser **más largo, con pantalla que se desplaza**, para
sostener el movimiento. Antes de empezar, una animación breve muestra el
movimiento esperado. Falta la imagen de referencia.

## 3. Dónde vive cada aventura en el mapa

| Sector del mapa | Aventuras, en orden | Por qué ahí |
|---|---|---|
| Entrada | Exploración libre: vidrio empañado, arena | Es la intro: el cuidador limpia recintos |
| Zona nocturna | Exploración libre: linterna, objetos ocultos | La linterna solo tiene sentido a oscuras |
| Estanque | Patos → Medusa → Delfines (más adelante) | Agua |
| Arena | Víboras | Terreno de víboras; hay espacio para ordenarlas |
| Montañas | Ovejas (ladera) → Llamas (cumbre) | Misma montaña, dos alturas; las llamas con identidad propia arriba |
| Bosque | Abejas (flores y panal) → Caracol (después de la lluvia) | Flores y barro |
| Sendero | Conecta; no tiene aventura propia | |

Los delfines pueden pedir un sector propio (costa) si el estanque queda
cargado. Se decide cuando lleguen.

## 4. Cruce contra lo que ya está en `main`

| Aventura | Estado | Qué hay que hacer |
|---|---|---|
| Exploración libre | **No existe.** | Mecánica nueva: superficie tapada por una **grilla de piezas** que se borran al tocarlas. Sin `mask` ni `clipPath` (veda de `url(#)`). La linterna es la misma grilla con opacidad por distancia al dedo, sin persistir. |
| Patos | Existe como **caso detective** (`duck-trail1..4`: onda, espiral, triangular, cuadrada) | **Recortar como ondulaciones**: los cuatro niveles pasan a ser ondas suaves con la progresión de la sección 2. La espiral es del caracol y la triangular de las ovejas; no se gastan acá. Los ids se conservan (son claves persistidas); cambia el contenido. |
| Víboras | **No existe.** | Dos mecánicas nuevas: **arrastrar objetos** (ordenar, llevar) y **el corredor es el arte** (el cuerpo de la víbora como camino). |
| Ovejas | Parcial: hay generadores de colinas (`f2-colinas`) y marcas por arco | Generador de colinas con **lista de alturas por cresta** (alta-baja); ovejas como marcas en los vértices. |
| Llamas | Parcial: hay onda triangular | Picos altos y angulosos. **Medir el límite de fusión de esquinas** del corredor (`strokeLinejoin: round`) antes de prometer picos próximos. |
| Medusa | **Hecha** (`f2-guirnalda`, `f2-agua2..4`) | Nada. Se engancha al sector estanque. |
| Caracol | Generador de espiral existe (`trail2`, `f1-espiral`) | Consigna pendiente. No se implementa hasta cerrarla. |
| Abejas | Parcial: el **carrier** que sigue el dedo ya existe | Nivel de trazo **libre con puntos de paso** (flores) y meta (panal). |
| Delfines | **No existe.** | **Desplazamiento de pantalla** (viewBox que avanza con el trazo). La animación previa ya existe como `demo`. |

### Decisiones que se toman con esta directiva

1. **La deducción de tres opciones sale del flujo principal.** Las dos
   últimas directivas cierran cada sector con "el animal aparece en el
   zoológico", no con un cuestionario. La pantalla `Deduction` queda
   accesible por `?nivel=deduccion` como chrome de desarrollo; no se
   borra. Si se quiere de vuelta, se reengancha.
2. **La unidad es la aventura, no el "Nivel N".** `docs/11` numeró
   Niveles 1 a 4; esta directiva los reorganiza por animal y sector. El
   código no renombra ids. Los docs `01`–`05` se actualizan cuando el
   mapa esté en `main`, no antes.
3. **Cada sector tiene un fondo dibujado entero**, igual que el mapa.
   El corredor se dibuja encima, en una franja central que el dibujo deja
   tranquila. No se compone el escenario con marcas dispersas. El pasto y
   el barro dispersos que hoy usan los senderos se retiran cuando entre
   el fondo de cada sector.
4. **Las pistas del pato** (huella palmeada, miga) siguen valiendo como
   marcas que se encienden a lo largo del camino. Lo que se retira es el
   cuestionario, no la recompensa visual.

## 5. Arte que falta

Fondos por sector, opacos, 3:2, apagados, con una franja central
horizontal tranquila (sin objetos) donde se dibuja el corredor:
`fondo laguna.png`, `fondo arena.png`, `fondo ladera.png`,
`fondo cordillera.png`, `fondo bosque.png`, `fondo pecera.png` (lo que
aparece detrás del vidrio: algas, cofre, piedras).

Animales y objetos, transparentes, cuadrados: `vibora chica.png`,
`vibora mediana.png`, `vibora grande.png` (horizontales, cuerpo gordo y
parejo, distinta cantidad de ondas), `llama.png`, `abeja.png`, `flor.png`,
`panal.png`, `delfin.png`, `caracol.png`, `linterna.png`. La oveja, el
pato, la medusa, la estrella de mar, el pez y la tortuga ya existen.

## 6. Plan de implementación

Un cambio SDD por paso, rama desde `main`, capturas al final de cada uno.
El orden sigue la secuencia pedagógica salvo donde una mecánica nueva
conviene probarla primero.

| Paso | Qué entra | Mecánica nueva |
|---|---|---|
| A | El mapa como pantalla principal (`docs/12`), registro de sectores, enganche de lo que ya existe (patos como están, medusa), animales recuperados, HUD | Ninguna en el motor |
| B | Patos como ondulaciones + fondo de laguna bajo el corredor + retiro del suelo disperso en los senderos | Fondo dibujado bajo el corredor |
| C | Ovejas y llamas en las montañas, con sus fondos | Alturas por cresta; medición de fusión de esquinas |
| D | Entrada: vidrio empañado y arena; intro y transformación en detective; zona nocturna con linterna | Grilla de revelado |
| E | Víboras en la arena | Arrastre de objetos; el arte como corredor |
| F | Abejas en el bosque | Trazo libre con puntos de paso |
| G | Delfines | Pantalla que se desplaza |
| — | Caracol | Esperar la consigna |

Cada paso deja el mapa con un sector más descubierto. La mochila gana un
objeto por sector cerrado (lupa al terminar la entrada, etc.); qué objeto
da cada sector se define en el paso D, cuando exista la intro.
