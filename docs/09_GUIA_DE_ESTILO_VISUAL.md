# Guía de Estilo Visual

Decidida el 2026-09-10. Rige todo lo visual del juego: assets, UI y
pantallas. Si algo nuevo no cumple esto, no entra.

---

## 1. La dirección: marcador grueso

Todo está dibujado con un marcador grueso.

- **Contorno negro parejo**, del mismo grosor en todo el dibujo, con
  puntas redondeadas. No hay línea fina ni línea que se afine.
- **Relleno plano que se pasa un poco del contorno**, como un dibujo de
  chico hecho prolijo. Ese desborde es deliberado: es lo que separa este
  estilo de un vector genérico.
- **Formas gordas y generosas.** Cero detalle fino: si un rasgo no se
  entiende a 24 píxeles, no va.
- **Un color plano por forma.** Nada de sombreado, ni volumen, ni brillo.

Se eligió sobre tres alternativas (cuaderno a mano, papel recortado,
sellos de tinta) por ser la más legible para un chico de cinco años y la
más difícil de saturar.

## 2. El personaje: un pulpo

El personaje que el chico controla es un **pulpo**. Sigue la yema del
dedo por el rastro.

Por qué un pulpo y no una mano con lupa: ocho brazos resuelven de una
que el personaje pueda **mirar y recoger al mismo tiempo** — un brazo
sostiene la lupa, los otros levantan las pistas al pasar. La mecánica de
recolección deja de necesitar explicación.

Implicancia de diseño: los brazos son el lugar natural para mostrar
*cuántas* pistas lleva. No hace falta inventar un indicador.

## 3. Restricciones técnicas (no son gusto, son el motor)

Un asset que no las cumpla hay que rehacerlo.

- **SVG, un `path` por forma** cuando se pueda. Nada de PNG: se escala a
  pantallas de tablet muy distintas.
- **Prohibido `url(#...)`**: sin degradados, sin filtros, sin máscaras,
  sin `clipPath`. En este repo eso **hidrata en blanco en dispositivos
  reales** — está documentado en `client/src/canvas/TraceCanvas.tsx:70-84`
  con la cicatriz correspondiente. Rellenos y trazos planos nada más.
- **Centradas en el origen**: el `(0,0)` es el centro visual de la marca,
  porque el motor la rota para seguir la tangente del camino. Excepción:
  los animales llevan el origen en las patas, así se paran sobre la línea
  del suelo.
- **Un color por forma.** Cada marca tiene dos estados —apagada y
  ganada— y el cambio es un swap de `fill`. Una forma con seis colores
  internos rompe eso.
- **Tamaños** sobre el lienzo de `1000×600`: marcas de pista ~20-30 de
  alto, pulpo ~60, animales ~140.

## 4. Paleta

Son los valores que ya están en `client/src/detective/palette.ts`. El
arte generado tiene que usar estos, no aproximaciones.

| Uso | Hex |
|---|---|
| Papel / fondo | `#fdfcf7` |
| Tinta / contorno | `#1e293b` |
| Pista apagada | `#c8cdd2` |
| Gotita de agua | `#3f6f8f` |
| Grano de maíz | `#b8912f` |
| Huella | `#000000` |
| Pluma | `#2f6b5c` |
| Lamparita encendida | `#f2d377` |

**El color es la recompensa.** El mundo es tinta sobre papel y una marca
sólo toma color cuando el chico la recoge. Ningún color decorativo en
ninguna parte: si algo tiene color, es porque se ganó. La huella es la
excepción y va a negro, no a un color, porque una huella en la tierra no
tiene color propio.

## 5. La regla que decide todo: la marca repetida

**La huella se dibuja unas 40 veces por nivel.** Es el elemento más
repetido del juego y el que decide si el rastro se lee como un camino o
como suciedad.

Un asset puede quedar hermoso en una lámina y arruinarse al repetirse.
Antes de aceptar cualquier marca de pista, hay que verla **repetida a lo
largo de una curva**, no sola. Y las huellas **alternan izquierda y
derecha**: la alternancia es lo que hace que una huella lea como "alguien
caminó por acá"; la forma sola no alcanza.

## 6. Dónde entran los assets

Todo el arte vive detrás de un registro tipado en
`client/src/detective/assets.ts` (`CLUE_ART`, `ANIMAL_ART`, `GLASS_ART`).
Reemplazar un placeholder por arte real es editar el string `d` de esa
entrada y nada más. La costura está hecha justamente para esto.

## 7. Deuda de layout conocida

No es falta de assets, es layout, y hay que arreglarlo en el mismo pase
de estilo:

- La hoja se dibuja como un rectángulo gris con esquinas redondeadas y
  márgenes vacíos arriba y abajo. Eso hace que parezca un diagrama en
  vez de un lugar. Debería ocupar la pantalla.
- El "afuera" del corredor no tiene identidad: es un relleno gris. Con
  esta dirección debería ser pasto, y el corredor tierra pisada.
