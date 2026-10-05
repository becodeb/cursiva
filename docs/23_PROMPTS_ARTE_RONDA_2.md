# 23 — Prompts de arte, ronda 2

Escrito el 2026-10-02 (T47 de `odd/tasks/prewriting-stage-completion.md`).
Sigue el formato de `docs/22`: cada pedido trae un prompt completo, listo
para pegar en ChatGPT. **Los prompts van en inglés; el resto, en
castellano.** Los ids de esta ronda son `D1`–`D37`. Los de `docs/20` (`B…`)
y `docs/22` (`C…`) siguen valiendo salvo lo que lista la §8.

El pedido de la autora:

> Aprovechá para pedir assets a ChatGPT: todos los que estén feos tienen que
> quedar lindos, incluso aprovechar para generar variaciones del mismo, por
> ejemplo del charco de agua y esas cosas, y asegurarse de que realmente se
> parezcan a lo que se deberían parecer.

Entran también sus notas anteriores: los fondos de nivel se ven feos y se
recortan; los botones siguen feos; la transición de la lupa no se lee como
una lupa; huellas, gotas y semillas no se parecían a lo que eran; el mono
sigue siendo un placeholder (B10); faltan los patitos (B16).

Para leer primero:

1. **Para ChatGPT** → §0, y después solo las §4, §5 y §6.
2. **Qué se ve hoy, imagen por imagen** → §2 (las diez peores, en §2.2).
3. **Qué reemplaza este documento** de `docs/20` y `docs/22` → §8.

---

## 0. Instrucciones para ChatGPT

1. **Hacer los pedidos `pendiente` de la tabla de la §1, en el orden de la
   tabla**: primero los de prioridad alta, después media, después baja.
   Alta es lo que el chico ve en todos los niveles (pistas, cosas para
   juntar, el Pulpito, obstáculos); media, los fondos; baja, la interfaz.
2. **Antes de D23 y D24**, C9 y C10 de `docs/22` tienen que estar hechos:
   D23 y D24 son sus variaciones. Si siguen pendientes, hacerlos en ese
   momento desde `docs/22` §4. Si D10 (la oveja nueva) ya está hecha,
   adjuntar también `oveja v2.png` al pedir C9.
3. **Una imagen por mensaje, todas en la misma conversación**, así
   comparten el grosor de línea y la paleta. Las variaciones 2 y 3 de una
   misma pista van en dos mensajes seguidos, con la 1 adjunta en los dos.
4. **Pegar cada prompt completo, tal cual**, y adjuntar las referencias
   que dice el pedido (están en `art-source/`). Una referencia sirve para
   la forma, el tamaño, el personaje y el color; **nunca para el
   contorno**, que lo define el bloque de estilo (`docs/09` §9).
5. **Guardar cada imagen en `art-source/` con el nombre exacto** del
   pedido. Todos los nombres son nuevos: **nunca pisar un archivo que ya
   exista**. Si el nombre ya existe, no guardar y avisar.
6. **Tamaños.** Recortes y láminas: el tamaño que dice el pedido (1024 ×
   1024 o 1536 × 1024), con fondo transparente de verdad. Fondos:
   exactamente 2048 × 1024 y totalmente opacos. Si la herramienta no
   entrega 2048 × 1024 directo, generar la escena y después **ampliarla
   hacia los costados** (outpainting) hasta 2048 × 1024; nunca estirarla
   ni recortarle arriba o abajo.
7. **Las láminas se guardan enteras.** Los pedidos que dicen "lámina"
   traen varias poses u objetos en una imagen; no recortarla: los
   recortes los hace la sesión que la integra (§7), para que todas las
   poses salgan con el mismo recuadro.
8. **Pasar el checklist del pedido y el común (§3.3)** antes de guardar.
   Si falla un punto, pedirla de nuevo; no guardar "casi bien". Si después
   de tres intentos sigue fallando, poner `descartado: <motivo en una
   línea>` en el Estado y seguir con el próximo pedido.
9. **No modificar código ni otros documentos.** Nada en `client/`,
   `scripts/`, `server/`, `client/public/art/` ni en otro `.md`. El único
   cambio permitido en el repo, además de los PNG nuevos, es la columna
   "Estado" de la §1 de este archivo: `pendiente` → `hecho` cuando
   **todos** los archivos de la fila están guardados y pasaron su
   checklist (o `2 de 3`, etc., mientras tanto). Meter las imágenes en el
   juego lo hace otra sesión (§7).

---

## 1. Estado

ChatGPT: cambiar solo la columna "Estado" (ver §0, punto 9).

| ID | Archivo(s) en `art-source/` | Qué | Dónde se usa | Prioridad | Estado | Reemplaza o rehace |
|---|---|---|---|---|---|---|
| D1 | `pista pelo de gato.png` | Mechón de pelo del gato naranja | deducción de las ovejas | **alta** | hecho (T48: en la deducción de las ovejas) | nuevo |
| D2 | `pista alga.png`, `pista alga 2.png`, `pista alga 3.png` | Alga del fondo de la laguna, tres variaciones | peces: `f2-buceo` | **alta** | hecho (T48: en el juego, `f2-buceo`) | `alga.png` |
| D3 | `pista escamas de pez.png`, `pista escamas de pez 2.png`, `pista escamas de pez 3.png` | Escamas de pez, tres variaciones | peces: `f2-agua2` | **alta** | hecho (T48: en el juego, `f2-agua2`; la variación 1 salió azul y como un pedazo de piel, no tres escamas naranjas: ver T48) | C6 (`pista escama.png`) |
| D4 | `monos lamina.png` | El mono, tres poses | monos: juntar, rescate, mapa, libreta | **alta** | pendiente | B10 (`mono.png`, placeholder) |
| D5 | `patitos lamina.png` | Tres patitos | pato: juntar la familia | **alta** | pendiente | B16 |
| D6 | `pulpo lupa lamina.png` | El Pulpito con lupa y sin lupa, misma pose | todos los niveles | **alta** | pendiente | B18; `pulpo con lupa.png` |
| D7 | `pulpo poses lamina.png` | El Pulpito: señala, piensa, festeja | el Pulpito sobre la escena | **alta** | pendiente | B15 |
| D8 | `lupa v2.png` | La lupa que sigue al dedo | todos los niveles con lupa | **alta** | pendiente | `lupa.png` |
| D9 | `abeja lamina.png` | Abeja, flor y panal, con colores vivos | abeja: `bee1`–`bee4` | **alta** | pendiente | `abeja.png`, `flor.png`, `panal.png` |
| D10 | `oveja v2.png` | La oveja, de perfil y con borde limpio | ovejas: juntar, deducción | **alta** | pendiente | `oveja.png` |
| D11 | `piedra v2.png` | La piedra que rueda | obstáculo de ovejas y llamas | **alta** | hecho (T48: en el juego; las rayas de movimiento se recortan, `MOTION_LINE_SOURCES`) | `piedra.png` |
| D12 | `pista charco 2.png`, `pista charco 3.png` | Variaciones del charco | pato | **alta** | hecho (T48: en el juego, en secuencia 1, 2, 3) | — |
| D13 | `pista semillas 2.png`, `pista semillas 3.png` | Variaciones de las semillas | pato | **alta** | hecho (T48: en el juego, en secuencia 1, 2, 3) | — |
| D14 | `pista pluma de pato 2.png`, `pista pluma de pato 3.png` | Variaciones de la pluma | pato | **alta** | hecho (T48: en el juego, en secuencia 1, 2, 3) | — |
| D15 | `pista huella de pato 2.png`, `pista huella de pato 3.png` | Variaciones de la huella palmeada | pato; deducción por huellas | **alta** | hecho (T48: en el juego, en secuencia 1, 2, 3) | — |
| D16 | `pista burbujas 2.png`, `pista burbujas 3.png` | Variaciones de las burbujas | peces | **alta** | hecho (T48: en el juego, en secuencia 1, 2, 3) | — |
| D17 | `pista mano de mono 2.png`, `pista mano de mono 3.png` | Variaciones de la manito | monos | **alta** | hecho (T48: en el juego, en secuencia 1, 2, 3) | — |
| D18 | `pista banana 2.png`, `pista banana 3.png` | Variaciones de la banana | monos | **alta** | hecho (T48: en el juego, en secuencia 1, 2, 3) | — |
| D19 | `pista cascara de banana 2.png`, `pista cascara de banana 3.png` | Variaciones de la cáscara | monos: `monkey-lianas` | **alta** | hecho (T48: en el juego, en secuencia 1, 2, 3) | — |
| D20 | `pista huellita de erizo 2.png`, `pista huellita de erizo 3.png` | Variaciones de la huellita | noche: `night-rastro` | **alta** | hecho (T48: en el juego, en secuencia 1, 2, 3) | — |
| D21 | `hoja 2.png`, `hoja 3.png` | Variaciones de la hoja | obstáculo; prólogo | **alta** | hecho (T48: en el juego; `night2` y las dos hojas de `monkey3`) | — |
| D22 | `manzana 2.png`, `manzana 3.png` | Variaciones de la manzana | noche | **alta** | hecho (T48: en el juego; `night3` y el final de `night-rastro`) | — |
| D23 | `pista lana 2.png`, `pista lana 3.png` | Variaciones del mechón de lana (después de C9) | ovejas: `sheep-lana` | **alta** | hecho (T48: en el juego, en secuencia 1, 2, 3) | — |
| D24 | `pista huella de tortuga 2.png`, `pista huella de tortuga 3.png` | Variaciones de la huella de tortuga (después de C10) | tortugas | **alta** | hecho (T48: en el juego, en secuencia 1, 2, 3) | — |
| D25 | `fondo laguna v2.png` | La laguna | pato, peces, delfines | media | pendiente | B1 |
| D26 | `fondo ladera v2.png` | La ladera | ovejas | media | pendiente | B2 |
| D27 | `fondo cordillera v2.png` | La cordillera | llamas | media | pendiente | B3 |
| D28 | `fondo bosque v2.png` | El bosque | abeja, monos | media | pendiente | B4 |
| D29 | `fondo nocturno v2.png` | La noche del erizo | erizo | media | pendiente | B5 |
| D30 | `fondo sendero v2.png` | El sendero, con huellas | prólogo: sendero | media | pendiente | B7 |
| D31 | `fondo pecera v2.png` | La pecera de verdad | prólogo: peces | media | pendiente | B6 |
| D32 | `fondo arena v2.png` | La arena, ampliada a 2:1 | tortugas, víboras, prólogo | media | pendiente | — |
| D33 | `fondo noche zoo v2.png` | La noche del zoológico, ampliada a 2:1 | noche (linterna) | media | pendiente | — |
| D34 | `fondo recinto monos v2.png` | El recinto de los monos, ampliado a 2:1 | prólogo: monos | media | pendiente | — |
| D35 | `lupa transicion.png` | La lupa grande de la transición | entre pantallas | baja | pendiente | — |
| D36 | `botones lamina.png` | Los ocho botones | todas las pantallas | baja | pendiente | — |
| D37 | `escritorio v2.png` | El escritorio de la oficina | inicio | baja | pendiente | `escritorio.png` |

Son **37 pedidos y 54 archivos**. Antes de D23 y D24 van C9 y C10 de `docs/22` (§0, punto 2).

---

## 2. Qué se ve hoy

Miré, una por una, cada imagen embarcada en `client/public/art/` y su fuente
en `art-source/` (`main` en `4ceda88`, 2026-10-02), más el alga de la rama
`feat/new-clue-levels` (T44), que ya está en un nivel. Las pistas las miré
ganadas y apagadas.

### 2.1 Resumen

| Veredicto | Fuentes | Qué quiere decir |
|---|---|---|
| conservar | 42 | Queda como está |
| variaciones | 13 | Queda, y se piden dos dibujos más del mismo objeto (o de C9/C10) |
| rehacer | 20 | Se pide de nuevo con otro nombre (`… v2.png` o un nombre nuevo); el viejo queda |
| nuevo | 6 | No existe, o es un placeholder |
| fuera de alcance | 1 | Está feo, pero lo resuelve otra sesión |

Además hay 11 fuentes sin uso y las imágenes derivadas (§2.9).

### 2.2 Las diez más feas

1. **`mono.png`**: un bloque gris con la palabra MONO; en la libreta, un
   octógono negro. Se ve en el rescate, el mapa y al juntar monos. → D4
2. **`fondo nocturno.png`**: óvalos negros, pasto como letras "M", una
   franja pizarra lisa y una línea de regla. Parece un boceto. → D29
3. **`piedra.png`**: un óvalo gris. Es un obstáculo que rueda y no se lee
   ni piedra ni giro. → D11
4. **`pista escama.png`**: gajos de mandarina naranjas; en gris, tres
   piedras. → D3
5. **`alga.png`**: contorno azul marino, línea de vector; a 28 px, una llama
   verde. → D2
6. **`fondo ladera.png`**: el 60 % de la pantalla es gris verdoso liso. → D26
7. **`fondo cordillera.png`**: un cielo que parece pared y rocas cortadas
   en recta. → D27
8. **`fondo laguna.png`**: un rectángulo celeste grisáceo; no hay agua, y
   los juncos están cortados con regla. → D25
9. **`abeja.png`** (y su flor y su panal): caqui oliva y rosa grisáceo; la
   abeja no es amarilla. → D9
10. **`oveja.png`**: borde lleno de motas, blanco puro, y una silueta que
    parece un arbusto. → D10

Fuera de la lista porque no son imágenes, pero igual de feos: la transición
de la lupa (D35) y los botones (D36).

### 2.3 Pistas del recorrido

| Fuente en `art-source/` | Se embarca como | Dónde aparece | Veredicto | Por qué | Pedido |
|---|---|---|---|---|---|
| `pista charco.png` | `clue-puddle-*` | pato: `duck-trail1`, `duck-charcos` | **variaciones** | Se lee como charco con salpicaduras. Pero sale idéntico unas quince veces por nivel y el rastro parece sellado | D12 |
| `pista semillas.png` | `clue-seeds-*` | pato | **variaciones** | Tres semillas de girasol, se entienden. Repetidas iguales, cantan | D13 |
| `pista pluma de pato.png` | `clue-duck-feather-*` | pato | **variaciones** | Amarilla y con cañón: ya no parece hoja. La misma curva repetida | D14 |
| `pista huella de pato.png` | `clue-webfoot-*` | pato; deducción de las tortugas | **variaciones** | Se lee pata palmeada; la membrana es muy honda y los dedos finos, pero al lado de la gallina se distingue por la mancha llena | D15 |
| `pista burbujas.png` | `clue-bubble-*` | peces: `f2-guirnalda` | **variaciones** | Tres burbujas que suben: funciona. Repetida idéntica | D16 |
| `pista escama.png` | `clue-scale-*` | peces: `f2-agua2` | **rehacer** | Tres medialunas naranjas pegadas: parecen gajos de mandarina o tejas; en gris, tres piedras. Nada dice "pez" | D3 |
| `pista mano de mono.png` | `clue-handprint-*` | monos: `monkey1` | **variaciones** | Es una mano humana de "pare" más que de mono, pero un chico dice "una manito" y alcanza. Las variaciones alargan los dedos | D17 |
| `pista banana.png` | `clue-banana-*` | monos: `monkey2` | **variaciones** | Banana clara | D18 |
| `pista cascara de banana.png` | `clue-banana-peel-*` | monos: `monkey-lianas` (T44) | **variaciones** | Cáscara clásica; se distingue de la banana por la silueta | D19 |
| `pista huellita de erizo.png` | `clue-hedgehog-print-*` | noche: `night-rastro` (T44); hoy también suplente de la tortuga (T45) | **variaciones** | Se lee como huella de perro o de gato. El nivel no pide saber de quién es, así que alcanza | D20 |
| `alga.png` | `clue-seaweed-*` (rama `feat/new-clue-levels`) | peces: `f2-buceo` (T44) | **rehacer** | Contorno azul marino saturado y línea de vector lisa (falla `docs/09` §1 y §4); a 28 px es una llama verde o una mano. Lámina de 1230 × 1278, fuera del tamaño autoral | D2 |
| `huella negra.png`, `huella gris.png` | `clue-footprint-*` | deducción de las tortugas (la gallina); `trail3`, fuera del recorrido | conservar | Buena huella de pájaro de tres dedos | — |
| `gota de agua.png` | `clue-droplet-*` | `trail1`, `trail2`, `trail4` (fuera del recorrido) | conservar | Vector liso, pero ningún nivel del recorrido la muestra. No se borra (`docs/22` §5.7) | — |
| `grano de maiz.png` | `clue-corn-*` | ídem | conservar | Una papa ocre a 28 px; fuera del recorrido | — |
| `pluma verde.png`, `pluma gris.png` | `clue-feather-*` | ídem | conservar | Una hoja verde; fuera del recorrido | — |
| `miga de pan.png` | `clue-breadcrumb-*` | suplente de la lana en `sheep-lana` (T45) | conservar | Pan mordido; deja de usarse cuando llegue C9 | C9 |
| `pista lana.png` (no existe) | — | ovejas: `sheep-lana` | **variaciones** | C9 sigue pendiente en `docs/22`; acá van solo sus variaciones | D23 |
| `pista huella de tortuga.png` (no existe) | — | tortugas: `turtle-huellas` | **variaciones** | C10 sigue pendiente en `docs/22`; acá van solo sus variaciones | D24 |
| `pista pelo de gato.png` (no existe) | — | deducción de las ovejas: "¿De quién es esta lana?" | **nuevo** | La opción "gato", al lado de la lana y de la pluma de pato | D1 |

### 2.4 Cosas para juntar, objetos y obstáculos

| Fuente en `art-source/` | Se embarca como | Dónde aparece | Veredicto | Por qué | Pedido |
|---|---|---|---|---|---|
| `manzana.png` | `sector-apple` | noche: `night2`, final de `night-rastro` | **variaciones** | Bien dibujada. Variaciones para que no sea siempre la misma manzana | D22 |
| `hongo.png` | `sector-mushroom` | noche: `night3` | conservar | Se entiende; algo genérico | — |
| `hoja.png` | `sector-leaf` | obstáculo de `bee3` y `monkey3`; rincones de `glass3`; entrada de los monos | **variaciones** | La mejor ancla de estilo de los objetos chicos. Varias iguales a la vez se ven pegadas con sello | D21 |
| `piedra.png` | `sector-stone` | obstáculo que rueda en `sheep-hill3` y `llama-peak3`; entrada de las tortugas | **rehacer** | Un óvalo gris sin nada adentro: no se lee piedra ni se nota que rueda. La fuente trae 4199 motas sueltas (`SPECKLED_ALPHA_SOURCES`) | D11 |
| `cofre.png` | `sector-chest` | noche: `night1`; entrada de los peces | conservar | Cofre clarísimo | — |
| `flor.png` | `sector-flower`, `sector-flower-dormant` | abeja: las paradas | **rehacer** | Rosa grisáceo con centro caqui: apagada, parece marchita aun "despierta" | D9 |
| `panal.png` | `sector-honeycomb` | abeja: la meta | **rehacer** | Colmena caqui oliva, sin nada de miel; a lo lejos, una piña | D9 |
| `linterna.png` | `sector-flashlight` | herramienta de la libreta; entrada de la noche | conservar | Caqui apagado, pero se lee linterna | — |
| `gorro andino.png` | `andean-hat` | herramienta de la libreta | conservar | Bien | — |
| `estrella de mar.png` | `hazard-starfish` | obstáculo de `f2-agua4` | conservar | Clara y alegre | — |
| `medusa.png` | `goal-medusa` | Nivel 3 (fuera del recorrido) | conservar | Más lustrosa que el resto, pero fuera del recorrido | — |
| `caracol.png` | `sector-snail` | obstáculo de `turtle3` | conservar | Bien | — |
| `lamparita prendida.png` | `lamp-on`, `lamp-off` | riel de pistas | conservar | Funciona prendida y apagada | — |
| `estrella.png` | `zoo-star` | mapa | conservar | Bien | — |

### 2.5 Animales

| Fuente en `art-source/` | Se embarca como | Dónde aparece | Veredicto | Por qué | Pedido |
|---|---|---|---|---|---|
| `mono.png` | `animal-mono` y su silueta | juntar en `monkey3`/`monkey4`, rescate, mapa, libreta | **nuevo** | Un bloque gris con la palabra MONO; su silueta es un octógono negro. Es el único placeholder que el chico ve | D4 |
| `oveja.png` | `sector-sheep` y su silueta | juntar en `sheep-hill1`–`4`; deducción de las ovejas | **rehacer** | De frente (los demás animales van de perfil), lana blanco puro (la de C9 es crema) y 4374 motas en el borde; la silueta negra parece un arbusto | D10 |
| `abeja.png` | `sector-bee` y su silueta | la que sigue al dedo en `bee1`–`bee4` | **rehacer** | Cuerpo caqui oliva, no amarillo: de un vistazo no se lee abeja | D9 |
| `pato.png` | `animal-pato` | deducción del pato; `duck-trail3`/`4` (achicado, en lugar de los patitos) | conservar | Bien. Es la referencia de los patitos (D5) | — |
| (no existe) | — | juntar la familia del pato (`duck-trail3`/`4`) | **nuevo** | Hoy se junta el pato adulto achicado | D5 |
| `gallina.png`, `vaca.png`, `gato.png` | `animal-*` | deducciones | conservar | Claros. El gato naranja es la referencia del pelo de gato (D1) | — |
| `pez.png` | `animal-pez` | juntar en `f2-agua3`/`4`; carteles | conservar | Bien | — |
| `tortuga.png` | `animal-tortuga` | juntar en `turtle1`–`4` | conservar | El caparazón va relleno de negro (fuera de `docs/09` §9), pero se lee tortuga, y rehacerla obliga a rehacer el cartel TORTUGAS | — |
| `llama.png` | `sector-llama` | juntar en `llama-peak1`–`4` | conservar | Bien | — |
| `delfin.png` | `sector-dolphin` | juntar en `dolphin1`–`4` | conservar | Bien | — |
| `vibora chica.png`, `vibora mediana.png`, `vibora grande.png` | `sector-snake-*` (y el gris) | víboras | conservar | Funcionan; el gris sale por código | — |
| `erizo.png` | `hedgehog-profile` | `hedgehog3`/`4` | conservar | Sin espinas a propósito: las dibuja el chico. El erizo terminado sigue en B14 (`docs/20`) | — |
| `erizo enroscado.png` | `hedgehog-curled` | `night4`; `hedgehog1`/`2` | conservar | Tiene una mancha blanca de brillo en la bola. No se pide de nuevo: las espinas se anclan a esta silueta (§7, punto 10) | — |

### 2.6 El Pulpito

| Fuente en `art-source/` | Se embarca como | Dónde aparece | Veredicto | Por qué | Pedido |
|---|---|---|---|---|---|
| `pulpo con lupa.png` | `carrier-octopus` | inicio de cada nivel | **rehacer** | Cejas de preocupado; la lupa flota al lado del brazo en vez de estar agarrada; y no tiene gemelo sin lupa: al apoyar el dedo se cambia por el de la oficina, que tiene otra pose | D6 |
| (no existe) | — | el Pulpito sobre la escena: señala, piensa, festeja | **nuevo** | Hoy ninguna figura señala ni piensa | D7 |
| `lupa.png` | `carrier-lens` | sobre el dedo, en cada nivel con lupa | **rehacer** | Contorno azul marino y brillo de clip-art: el único objeto de cada nivel con ese contorno | D8 |
| `pulpo oficina.png` | `home-octopus` | inicio; hoy, suplente del Pulpito sin lupa | conservar | Bien; deja de ser suplente con D6 | — |
| `pulpo mochila.png` | `zoo-octopus-backpack` | mapa | conservar | Bien | — |
| `pulpo cuidador.png` | `zoo-octopus-caretaker` | prólogo | conservar | Bien | — |

### 2.7 Fondos

| Fuente en `art-source/` | Se embarca como | Dónde aparece | Veredicto | Por qué | Pedido |
|---|---|---|---|---|---|
| `fondo laguna.png` | `sector-lagoon-background` | pato, peces, delfines | **rehacer** | Dos tiras de juncos y un rectángulo celeste grisáceo liso; los juncos de abajo están cortados con regla en la fila 820. No se lee agua | D25 |
| `fondo ladera.png` | `sector-slope-background` | ovejas | **rehacer** | El 60 % es gris verdoso liso: ni pasto ni ladera. La cerca de abajo, cortada en recta | D26 |
| `fondo cordillera.png` | `sector-range-background` | llamas | **rehacer** | Un cielo gris liso que parece una pared; las rocas de abajo, cortadas en recta | D27 |
| `fondo bosque.png` | `sector-forest-background` | abeja, monos | **rehacer** | El 70 % es verde liso; copas cortadas arriba; sin profundidad | D28 |
| `fondo nocturno.png` | `sector-night-background` | erizo | **rehacer** | El más pobre: óvalos negros, pasto dibujado como letras "M", una línea de regla. No es la misma noche que la de la linterna | D29 |
| `fondo sendero.png` | `sector-path-background` | prólogo: sendero | **rehacer** | Plano; el cielo es del mismo beige que el suelo; al limpiar el barro no aparece ninguna huella | D30 |
| `fondo entrada vidrio.png` | `sector-aquarium-background` | prólogo: peces | **rehacer** | Lindo, pero es un invernadero con piso brillante, no una pecera; el cierre nombra algas, cofre y piedras que no están | D31 |
| `fondo arena.png` | `sector-sand-background` | tortugas, víboras, prólogo | **rehacer** | Funciona, pero es 3:2: en una pantalla ancha pierde arriba y abajo, y la cascada roza el borde. Se amplía, no se redibuja | D32 |
| `fondo noche zoo.png` | `sector-night-zoo-background` | noche (linterna) | **rehacer** | Ídem: 3:2. Se amplía | D33 |
| `fondo recinto monos.png` | `sector-monkeys-background` | prólogo: monos | **rehacer** | Ídem: 3:2, y es el mejor de todos. Se amplía | D34 |

### 2.8 Mapa, interfaz y suelo

| Fuente en `art-source/` | Se embarca como | Dónde aparece | Veredicto | Por qué | Pedido |
|---|---|---|---|---|---|
| `mapa zoologico.png` | `zoo-map` | mapa | conservar | Lindo y claro. El suelo de la zona de noche tiene un gris moteado, menor | — |
| `niebla 1.png`–`niebla 3.png` | `zoo-fog-*` | mapa | conservar | Nubes de niebla simples; cumplen | — |
| `mochila.png` | `zoo-backpack` | mapa | conservar | Bien | — |
| `huella pulpo.png` | `zoo-octopus-print` | huellas del mapa | fuera de alcance | Parece una suela o un semáforo, no una huella. Las huellas del mapa son A1, de la otra sesión (`exp/svg-art`) | — |
| `bocadillo.png` | `zoo-speech-bubble` | globos del Pulpito | conservar | Bien. B9 sigue en `docs/20` | — |
| `carrito.png` | `zoo-cart` | prólogo | conservar | Bien | — |
| `cartel peces.png`, `cartel tortugas.png`, `cartel monos.png` | `sign-*` | deducción de los peces; prólogo | conservar | Funcionan. El mono del cartel es la referencia de D4 | — |
| `escritorio.png` | `home-desk` | inicio | **rehacer** | Contorno azul marino y vector liso | D37 |
| `pasto.png`, `barro.png` | `ground-grass-*`, `ground-mud-*` | suelo de los caminos | conservar | Apagados a propósito (`docs/09` §7) | — |
| botones (código: `detective/icons.tsx`, `voice/icons.tsx`) | — | todas las pantallas | **nuevo** | Glifos de 26 px en tinta azul pizarra sobre una pastilla: no son del mundo dibujado | D36 |
| transición de la lupa (código: `screen/lupaWipe.ts`) | — | entre pantallas | **nuevo** | Un aro de CSS con un palito: se lee como un círculo que crece, no como una lupa (la autora, T31) | D35 |

### 2.9 Derivadas y sin uso

- **Derivadas** (las hace `build_art.py`, siguen a su fuente): todas las
  `clue-*-drained`, las `*-silhouette`, `sector-snake-*-grey`,
  `sector-flower-dormant` y `lamp-off`. Cuando cambia la fuente, cambian
  solas.
- **Sin uso** (ninguna fila de `build_art.py` las lee): `mapa.png`,
  `sombrero.png`, `nube.png`, `cartel.png`, `lamparita apagada.png`,
  `lapiz.png`, `pasto tile.png`, `escoba.png`, `huella palmeada.png`,
  `burbuja.png` y `fondo pecera.png`. No se piden ni se borran.

---

## 3. Reglas comunes

### 3.1 Los nombres de archivo

- **`<nombre> 2.png`, `<nombre> 3.png`**: variaciones. La 1 es el archivo
  que ya existe (por ejemplo `pista charco.png`). El juego las va a usar
  **en secuencia** a lo largo del camino: 1, 2, 3, 1, 2, 3… (§7, punto 1).
- **`<nombre> v2.png`**: el reemplazo de un archivo que se rehace. El
  viejo no se pisa ni se borra.
- **Un nombre nuevo** cuando la cosa cambia de verdad: `pista alga.png`
  (reemplaza a `alga.png`), `pista escamas de pez.png` (reemplaza a
  `pista escama.png`).
- **`… lamina.png`**: una imagen con varias poses u objetos; se guarda
  entera y la recorta la sesión que la integra (§0, punto 7).

### 3.2 Cómo se piden las variaciones

Lo que se repite muchas veces a lo largo de un camino (charcos, semillas,
plumas, huellas, escamas, burbujas, lana, hojas, manzanas, bananas…) no
puede ser el mismo sello quince veces. Cada variación:

- **conserva** el color exacto (el hex de cada prompt es el relleno
  medido en `client/public/art/manifest.json`), el grosor de línea, el
  tamaño que ocupa en el lienzo, el nivel de detalle y el frente hacia
  arriba;
- **cambia la forma**: el contorno, cuántos son, cómo se reparten, la
  curva. Nunca es la 1 espejada ni rotada: eso el juego ya lo hace solo
  (rota cada marca según el camino, y en las huellas alterna izquierda y
  derecha, `docs/22` §3.3);
- **sigue siendo lo mismo**: puesta al lado de la 1, un chico tiene que
  decir "otro charco", no "otra cosa".

### 3.3 Checklist común (vale para todos los pedidos de pistas y objetos)

1. **¿El fondo es transparente de verdad?** Abrirla sobre un fondo oscuro.
   Si aparece un blanco, un gris o un damero pintado, se rechaza.
2. **¿El contorno es negro neutro?** Si tira a azul, marrón o verde, se
   rechaza (el error que más se repitió, `docs/09` §1).
3. **¿La línea tiembla y el relleno se pasa un poco en algún lado?** Si es
   una curva perfecta y el relleno calza exacto, es vector: se rechaza.
4. **¿Respeta los colores del pedido?** En las pistas: contorno y un solo
   relleno (en las huellas, uno solo: negro). Un brillo blanco o una
   sombra se rechazan.
5. **¿Se entiende a 28 px?** Achicarla y mirarla de lejos. Tiene que decir
   qué es sin la frase del Pulpito.
6. **¿Se entiende en gris?** Pasarla a gris plano: la forma sola tiene que
   seguir diciendo qué es.
7. **¿Aguanta repetida?** Pegarla unas treinta veces a lo largo de una
   curva (en las variaciones: alternando 1, 2 y 3). Si se vuelve una
   mancha, se rechaza (`docs/09` §5).
8. **¿El frente apunta hacia arriba?**
9. **¿Un chico de 6 años, sin ayuda, diría qué es?** Mostrarla sola y
   preguntarse qué contestaría. Si la respuesta honesta es "una mancha",
   "una papa" o cualquier otra cosa que no sea la del pedido, se rechaza.

### 3.4 Los fondos: qué cambia respecto de `docs/20`

`docs/20` §2 pedía la franja del camino "de UN solo color suave". ChatGPT
lo cumplió al pie de la letra, y ese es el problema que ve la autora: **dos
tiras de decoración y un rectángulo liso en el medio**, que es casi toda la
pantalla. Encima, la decoración termina con una **recta de regla** (la
laguna, en la fila 820; las rocas de la cordillera; la cerca de la ladera),
que es lo que se lee como "recortado".

Los fondos que gustan (arena, recinto de los monos, noche del zoológico)
tienen otra cosa en el medio: **suelo en perspectiva con textura suave**.
Por eso esta ronda pide eso, con dos límites que pone el juego:

- **El tono**: el camino se dibuja encima, y la ley de 55 de luma
  (`backdrops.test.ts`, `docs/09` §4) se mide sobre el píxel más claro de
  la franja. Cada pedido dice qué tono no se puede pasar y hacia qué lado:
  en los fondos de camino claro, **nada más claro que** el hex; en los de
  canal de piedra (ladera, cordillera), **nada más oscuro que** el hex. La
  textura vive del lado permitido.
- **La zona segura**: 2:1 (2048 × 1024); los 341 px de cada costado se
  pueden recortar; lo importante va en los 1365 px del centro (4:3). La
  cuenta está en `docs/20` §2.2.

Las filas de la franja son las mismas de `docs/20` §3 (dependen del alto,
que sigue en 1024). La referencia de estilo es un fondo aprobado entero
(`docs/20` §2.1): de día, `fondo recinto monos.png`; de noche, `fondo noche
zoo.png`.

---

## 4. Pedidos de prioridad alta (D1–D24)

Cada bloque de código es el prompt completo: se pega entero, en un mensaje.

### D1 — El pelo de gato (nuevo)

- **Archivo**: `art-source/pista pelo de gato.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/gato.png` (el color: es pelo de ese gato) y `art-source/pista pluma de pato.png` (el nivel de detalle, y para que se vea distinto).
- **Qué es y qué tiene que reconocer el chico**: en la deducción de las ovejas, "¿De quién es esta lana?", se ponen tres cosas grandes: el mechón de lana (C9), este pelo de gato y la pluma de pato (C2). El chico elige la que es igual a la que juntó. Tiene que ser **pelo de gato** a primera vista: pelitos cortos y rectos, del naranja del gato, nada de rulos (eso es la lana) ni de cañón (eso es la pluma).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue picture in a deduction screen of a game for 6-year-olds.
It is shown big, next to a tuft of sheep's wool and a duck feather,
and the child must tell the three apart at a glance.

The subject: a small tuft of cat fur that came off the attached orange
tabby cat, the kind a cat leaves on a sofa. A soft clump of short,
STRAIGHT hairs, a little wider than tall, lying flat. Its outline is
made of many small, pointed hair tips sticking out in several
directions, like a tiny brush, with two or three loose single hairs
escaping at the sides. Inside it, four or five short straight #1a1a1a
strokes showing which way the hair lies, and two thicker #1a1a1a
stripes like the cat's tabby stripes. Fill ginger orange #f28c28, the
same orange as the attached cat. The tips point in different
directions, NOT all upwards: this must never look like a flame.
```

- **Evitar**: una llama de fuego (todas las puntas hacia arriba); un pompón redondo; rulos o espirales (eso es la lana); un cañón en el medio (eso es la pluma); un gato entero; un cepillo con mango.
- **Checklist**: el común (§3.3), y además:
  1. ¿Un chico de 6 años diría "pelo de gato" (o "pelito")? ¿O diría "fuego"? Si dice fuego, se rechaza.
  2. Al lado de `oveja.png` (o de C9, si ya está) y de `pista pluma de pato.png`, ¿son tres cosas claramente distintas?
  3. ¿Es del naranja del gato adjunto?

### D2 — El alga (rehacer `alga.png`, tres variaciones)

- **Qué es y qué tiene que reconocer el chico**: en `f2-buceo` (`docs/21` N3, T44) el pez baja al fondo de la laguna y, en cada bucle, mordisquea un alga. Hoy la pista sale de `alga.png`, con contorno azul marino y línea de vector. Tiene que leerse **planta del agua**: cintas onduladas de puntas redondas, no pasto (puntas finas) ni fuego.
- **Orden**: primero `pista alga.png` (variación 1), después la 2 y la 3 con la 1 adjunta.

#### D2 · `pista alga.png`

- **Archivo**: `art-source/pista alga.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/hoja.png` (tamaño de formas y nivel de detalle; no su color).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: a small clump of seaweed growing from the muddy bottom of a
pond, tips pointing UP, the kind a fish nibbles. Soft, wavy,
ribbon-like fronds that sway left and right as if moving in the water,
all with ROUNDED tips, never pointed. Three fronds rising from one small rounded base: a tall one in the middle and two shorter ones leaning out to the sides. One #1a1a1a line runs along the middle of the tallest frond. Fill seaweed green #3fae6a.
```

#### D2 · `pista alga 2.png`

- **Archivo**: `art-source/pista alga 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista alga.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: a small clump of seaweed growing from the muddy bottom of a
pond, tips pointing UP, the kind a fish nibbles. Soft, wavy,
ribbon-like fronds that sway left and right as if moving in the water,
all with ROUNDED tips, never pointed. Only TWO fronds from the base: one tall and wavy, one short that curls over to the side at its tip. One #1a1a1a line runs along the middle of the tall frond. Fill seaweed green #3fae6a.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista alga.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #3fae6a, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D2 · `pista alga 3.png`

- **Archivo**: `art-source/pista alga 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista alga.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: a small clump of seaweed growing from the muddy bottom of a
pond, tips pointing UP, the kind a fish nibbles. Soft, wavy,
ribbon-like fronds that sway left and right as if moving in the water,
all with ROUNDED tips, never pointed. ONE tall wavy frond, with a small side frond branching off it halfway up. One #1a1a1a line runs along the middle of the tall frond. Fill seaweed green #3fae6a.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista alga.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #3fae6a, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: pasto (hojas rectas de punta fina); una llama de fuego; una mano; un arbolito; burbujas o peces alrededor.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. ¿Un chico de 6 años diría "un alga" o "una planta del agua"? Si dice "pasto" o "fuego", se rechaza.
  2. ¿El contorno es negro y no azul (el defecto de hoy)?
  3. Las tres juntas: ¿mismo verde, mismo tamaño, formas distintas?

### D3 — Las escamas de pez (rehacer C6, tres variaciones)

- **Qué es y qué tiene que reconocer el chico**: escamitas del pez naranja en `f2-agua2`. La C6 de hoy (`pista escama.png`) son tres medialunas pegadas que parecen gajos de mandarina. Tienen que leerse como **pedacitos de la piel del pez**: sueltas, con la rayita adentro que tienen las escamas de los peces dibujados.
- **Si no sale**: es la pista más dudosa del juego (`docs/21` decisión 2). Si a los tres intentos ninguna se lee como escama, poner `descartado` y seguir: `f2-agua2` vuelve a burbujas (§7, punto 11).

#### D3 · `pista escamas de pez.png`

- **Archivo**: `art-source/pista escamas de pez.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pez.png` (el color: son de ese pez).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: loose fish scales that fell off the attached goldfish. Each
scale is a small rounded fan shape, like a guitar pick: wide and round
at the top, narrowing to a short blunt point at the bottom. Inside
each scale, ONE thick #1a1a1a curved line runs parallel to its round
top edge, the way scales are drawn on a cartoon fish. The scales do
NOT touch: small clear gaps between them. Three scales in a small triangle: two side by side at the bottom and one above, centred between them, each tilted a little differently. Fill bright goldfish orange #fb7e08, the same orange as the attached fish.
```

#### D3 · `pista escamas de pez 2.png`

- **Archivo**: `art-source/pista escamas de pez 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista escamas de pez.png` (la variación 1) y `art-source/pez.png`.

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: loose fish scales that fell off the attached goldfish. Each
scale is a small rounded fan shape, like a guitar pick: wide and round
at the top, narrowing to a short blunt point at the bottom. Inside
each scale, ONE thick #1a1a1a curved line runs parallel to its round
top edge, the way scales are drawn on a cartoon fish. The scales do
NOT touch: small clear gaps between them. Two scales, one a bit bigger than the other, the small one higher and tilted outwards. Fill bright goldfish orange #fb7e08, the same orange as the attached fish.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista escamas de pez.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #fb7e08, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D3 · `pista escamas de pez 3.png`

- **Archivo**: `art-source/pista escamas de pez 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista escamas de pez.png` (la variación 1) y `art-source/pez.png`.

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: loose fish scales that fell off the attached goldfish. Each
scale is a small rounded fan shape, like a guitar pick: wide and round
at the top, narrowing to a short blunt point at the bottom. Inside
each scale, ONE thick #1a1a1a curved line runs parallel to its round
top edge, the way scales are drawn on a cartoon fish. The scales do
NOT touch: small clear gaps between them. Three scales in a short diagonal line going up to the right, from the biggest at the bottom to the smallest at the top. Fill bright goldfish orange #fb7e08, the same orange as the attached fish.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista escamas de pez.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #fb7e08, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: gajos de mandarina (medialunas con punta a los dos lados); tejas pegadas; conchas de mar (rayas que salen en abanico); pétalos; un arco iris (un arco con otro adentro); brillos.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. Al lado de `pez.png`, ¿se entiende que son pedacitos de ese pez?
  2. ¿Un chico de 6 años diría "escamas" o "de un pez"? ¿O "gajos", "pétalos", "púas de guitarra"? Si dice otra cosa, se rechaza.
  3. En gris, ¿siguen sin parecer piedras?

### D4 — El mono, tres poses (reemplaza B10)

- **Archivo**: `art-source/monos lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/cartel monos.png` (el **personaje**: el mono del cartel es el diseño a seguir), `art-source/pez.png` y `art-source/tortuga.png` (tamaño y nivel de detalle).
- **Qué es y qué tiene que reconocer el chico**: el mono que hoy es un bloque gris con la palabra MONO. Se ve en el rescate, el mapa, la libreta (en color y en silueta negra) y al juntar monos en `monkey3`/`monkey4`. La pose 1 es la principal; la 2 y la 3 son variaciones para juntar. En silueta tiene que seguir diciendo mono: **cola larga enrulada, orejas redondas grandes**.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1536x1024. THREE separate full-body poses of THE SAME small
cartoon monkey, side by side, evenly spaced, not touching, all three
standing on the same invisible ground line and all the same height.
Same body, same face, same colours and same outline weight in all
three. Use the monkey on the attached "MONOS" sign as the character
design (round face, big round ears, long curled tail); use the attached
fish and turtle for the size and the level of detail.

Pose 1 (left): standing on its two feet, seen from the side, one arm
raised as if about to grab a vine, long tail curled up behind it.
Pose 2 (centre): sitting on the ground, holding a banana with both
hands, tail curled beside it.
Pose 3 (right): standing on its feet, waving with one hand, tail
curled up in a spiral.

Colours: fur brown #8a5a3c; face, ears and belly light tan #e8c39e;
banana yellow #f2d24b; black dot eyes with a small white shine.
```

- **Evitar**: un oso, un perro o una ardilla (la cola peluda es de ardilla; la del mono es fina y enrulada); un gorila; ropa; texto.
- **Checklist**: el común (§3.3), y además:
  1. ¿Un chico de 6 años diría "un mono" en las tres?
  2. Pasar la pose 1 a negro plano: ¿la silueta sigue siendo un mono (cola enrulada, orejas)?
  3. ¿Es el mismo mono en las tres, y el mismo que el del cartel?
  4. ¿Las tres paradas sobre la misma línea y de la misma altura?

### D5 — Los patitos (reemplaza B16)

- **Archivo**: `art-source/patitos lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/pato.png` (son sus hijos: mismo amarillo, mismo naranja, mismo trazo).
- **Qué es y qué tiene que reconocer el chico**: en `duck-trail3` y `duck-trail4` se junta la familia del pato. Hoy se junta el pato adulto achicado. Tienen que ser **patitos bebés**, y **patitos, no pollitos**: pico ancho y chato y patas palmeadas, como el pato.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1536x1024. THREE separate small ducklings, the babies of
the attached duck, side by side, evenly spaced, not touching, all
standing on their feet on the same invisible ground line, seen from
the side and facing RIGHT like the attached duck. Clearly BABIES: a
round fluffy body, a big round head almost as big as the body, a tiny
stubby wing, no tail feathers. Clearly DUCKS, not chicks: a wide, flat,
rounded duck bill and webbed feet, like the attached duck.

Pose 1 (left): walking, one foot forward.
Pose 2 (centre): looking back over its shoulder.
Pose 3 (right): flapping its tiny wings, bill open as if peeping.

Colours: the same yellow as the attached duck #f5d10a; bill and feet
orange #f2780a; black dot eyes with a small white shine.
```

- **Evitar**: pollitos de gallina (piquito puntudo, patas de tres dedos finos); un pato adulto chico; plumas de colores; agua o pasto debajo.
- **Checklist**: el común (§3.3), y además:
  1. ¿Un chico de 6 años diría "patitos" (y no "pollitos")?
  2. Al lado de `pato.png`, ¿se entiende que son sus hijos?
  3. ¿Los tres del mismo tamaño, parados sobre la misma línea?

### D6 — El Pulpito con lupa y sin lupa (reemplaza B18)

- **Archivo**: `art-source/pulpo lupa lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/pulpo con lupa.png` (el **personaje**: cuerpo, ojos, brazos; no su cara de preocupado ni su contorno).
- **Qué es y qué tiene que reconocer el chico**: el Pulpito está parado al principio de cada camino con la lupa. Cuando el chico apoya el dedo, la lupa se va al dedo y el Pulpito queda **sin** lupa; al levantarlo, la recupera. Las dos poses tienen que ser **idénticas** salvo la lupa, porque el juego cambia una por la otra en el mismo lugar. Y hoy la lupa flota al lado del brazo: tiene que estar **agarrada**. La cara, alegre y curiosa.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1536x1024. TWO separate full-body poses of THE SAME
friendly cartoon octopus as the attached reference, side by side,
evenly spaced, not touching, both standing on the same invisible
ground line. Same body, same orange #f25a24, same eyes, same size and
the same position of all eight arms in both poses. His face is
cheerful and curious: big round eyes looking forward, a small smile,
NO worried eyebrows.

Pose 1 (left): he holds a magnifying glass up in his raised arm on the
viewer's right. The tip of that arm wraps around the HANDLE, clearly
gripping it. The magnifying glass has a round grey rim #8c8c8c, light
blue glass #8fd0f0 with one short curved white stroke as its shine, and
a short grey handle; the glass is about one third as wide as his head.
Pose 2 (right): the same octopus in exactly the same pose, WITHOUT the
magnifying glass. The raised arm stays raised in the same place, its
tip curled and empty, as if he had just let go of the glass. Nothing
else changes.
```

- **Evitar**: contorno azul marino (el defecto de `docs/09` §4); cejas caídas; ojos distintos entre las dos poses; brazos que cambian de lugar; una lupa en las dos.
- **Checklist**: el común (§3.3), y además:
  1. Superponer las dos poses al 50 %: ¿lo único que cambia es la lupa?
  2. ¿La lupa está agarrada por el mango, no flotando?
  3. ¿La cara es alegre, sin cejas de preocupado?
  4. A 60 px de alto, ¿se reconoce el Pulpito y la lupa?

### D7 — El Pulpito señala, piensa y festeja (reemplaza B15)

- **Archivo**: `art-source/pulpo poses lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/pulpo lupa lamina.png` (D6, el **personaje**). Si D6 todavía no está, `art-source/pulpo con lupa.png`.
- **Qué es y qué tiene que reconocer el chico**: el Pulpito que habla sobre la escena (`docs/19` §4): señala dónde mirar, piensa en la deducción, festeja al resolver. Tiene que ser el mismo de D6.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1536x1024. THREE separate full-body poses of THE SAME
octopus as in the attached image (same orange #f25a24, same eyes, same
size, same magnifying glass), side by side, evenly spaced, not
touching, all standing on the same invisible ground line.

Pose 1 (left): pointing to the RIGHT with one arm stretched out,
excited, the magnifying glass held in another arm.
Pose 2 (centre): thinking: one arm tip touching his chin, eyes looking
up, the magnifying glass held low in another arm.
Pose 3 (right): celebrating: three or four arms raised high, a big
open smile, the magnifying glass raised in one of them.
```

- **Evitar**: otro pulpo (otro naranja, otros ojos); contorno azul; signos de pregunta o estrellitas dibujados; texto.
- **Checklist**: el común (§3.3), y además:
  1. ¿Es el mismo pulpo que en D6?
  2. ¿Se entiende cada pose sin explicación: señala, piensa, festeja?
  3. ¿Las tres paradas sobre la misma línea?

### D8 — La lupa del dedo (rehacer `lupa.png`)

- **Archivo**: `art-source/lupa v2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pulpo lupa lamina.png` (D6: tiene que ser **esa** lupa). Si D6 todavía no está, `art-source/lupa.png` (solo la forma).
- **Qué es y qué tiene que reconocer el chico**: la lupa que el chico arrastra con el dedo en cada nivel. Hoy tiene contorno azul marino y un brillo de clip-art. Tiene que ser la misma lupa que sostiene el Pulpito. El juego centra el dedo en el **vidrio**, así que el vidrio es un círculo limpio.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1024x1024. One magnifying glass, the SAME one the octopus
holds in the attached image, seen flat from the front, its handle
pointing DOWN and to the LEFT at 45 degrees. A thick round rim, mid
grey #8c8c8c, outlined in #1a1a1a on both its outer and its inner edge.
Inside the rim, light blue glass #8fd0f0 with ONE short curved white
stroke near its upper-left edge as the shine. A chunky handle of the
same grey, ending in a rounded cap. The round glass takes about two
thirds of the image width.
```

- **Evitar**: contorno azul marino; un brillo grande en forma de banana; mango de madera si la lupa del Pulpito es gris; perspectiva.
- **Checklist**: el común (§3.3), y además:
  1. ¿El contorno es negro neutro (el de hoy es azul marino)?
  2. ¿Es la misma lupa que la de D6?
  3. A 40 px, ¿se lee lupa?
  4. ¿El vidrio es un círculo limpio?

### D9 — La abeja, la flor y el panal (rehacer los tres)

- **Archivo**: `art-source/abeja lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/abeja.png`, `art-source/flor.png` y `art-source/panal.png` (las **formas**: se conservan; los colores cambian).
- **Qué es y qué tiene que reconocer el chico**: la abeja que sigue al dedo en `bee1`–`bee4`, las flores donde para y el panal adonde vuelve. Hoy los tres son caqui y rosa grisáceo: la abeja no es amarilla, la flor parece marchita, el panal parece una piña. Tienen que ser **una abeja amarilla, una flor viva y una colmena con miel**.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1536x1024. THREE separate objects side by side, evenly
spaced, not touching. Use the three attached images for the SHAPES:
keep the same shapes and proportions. The COLOURS change as described
below, because the old ones are dull and dusty.

(1) Left: the same round, chubby cartoon bee, facing the viewer,
smiling. Body bright sunny yellow #f7c41f with two thick #1a1a1a
stripes; wings very pale blue #d9eef8 with one dark line each; two
antennae with round tips; black dot eyes with a small white shine;
small rosy cheeks #f29a9a.
(2) Centre: the same five-petal flower, seen from the front. Petals
bright pink #f27bb0, round centre sunny yellow #f7c41f.
(3) Right: the same beehive hanging from a short branch with two
leaves. Hive warm honey orange #f0a830 with its stacked rings drawn as
dark lines; on its front, four hexagon honeycomb cells filled with
darker honey #c9821e; branch brown #7a5236; leaves green #66d236.
```

- **Evitar**: caqui, mostaza u oliva en la abeja; una abeja realista con aguijón; flores de varios colores; una caja de colmena de madera.
- **Checklist**: el común (§3.3), y además:
  1. ¿La abeja es amarilla de verdad (no mostaza, no caqui)? ¿Un chico de 6 años diría "una abeja" a 40 px?
  2. ¿La flor se ve viva, rosa fuerte con centro amarillo?
  3. ¿El panal se lee "colmena con miel" y no una piña?
  4. ¿Las formas son las de las imágenes adjuntas?

### D10 — La oveja (rehacer `oveja.png`)

- **Archivo**: `art-source/oveja v2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/oveja.png` (el **personaje**: cara oscura, lana esponjosa) y `art-source/llama.png` (vista de perfil y nivel de detalle).
- **Qué es y qué tiene que reconocer el chico**: la oveja que se junta en las lomas (`sheep-hill1`–`4`) y la de la deducción "¿Quién deja lana?", que también se ve en silueta negra. Hoy está de frente, la lana es blanco puro, el borde tiene miles de motas y la silueta parece un arbusto. De perfil y con patas, la silueta dice **oveja**. La lana, crema: es de donde sale el mechón de C9.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1024x1024. One small cartoon sheep, the same character as
the attached sheep but turned to the SIDE, facing RIGHT, whole body
visible, standing on its four legs. A fluffy body whose outline is
made of many round bumps, warm cream wool #f3ecd9, with three or four
small curls drawn as short #1a1a1a spirals. Face, ears and legs dark
grey #4a4a4a. Black dot eye with a small white shine, a small friendly
smile. Same level of detail as the attached llama. A clean outline:
no specks, no dots, no dust around the sheep.
```

- **Evitar**: de frente; lana blanco puro; motas o puntitos alrededor del borde; una nube con patas; un carnero con cuernos.
- **Checklist**: el común (§3.3), y además:
  1. Pasarla a negro plano: ¿la silueta dice "oveja" (patas, cabeza de perfil) y no "arbusto" ni "nube"?
  2. Abrirla sobre fondo oscuro: ¿el borde está limpio, sin polvillo de puntos?
  3. ¿La lana es crema, la misma de C9?
  4. ¿Un chico de 6 años diría "una oveja"?

### D11 — La piedra que rueda (rehacer `piedra.png`)

- **Archivo**: `art-source/piedra v2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/hoja.png` (tamaño de formas y nivel de detalle).
- **Qué es y qué tiene que reconocer el chico**: el obstáculo de `sheep-hill3` y `llama-peak3`: una piedra que baja rodando y el chico tiene que esperar que pase (T41). También es el ícono de la entrada de las tortugas. Hoy es un óvalo gris. Tiene que ser **una piedra**, y las grietas tienen que dejar ver que **gira**.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1024x1024. One chunky, roundish boulder, a little wider than
tall, the kind of rock that could roll down a hill. Fill warm stone
grey #a19d94. Inside, three short #1a1a1a crack lines and one small
chipped corner, placed off-centre, so that when the rock turns you can
see it turning. A slightly lumpy, uneven outline, never a perfect
oval. No moss, no face, no ground under it.
```

- **Evitar**: un óvalo liso; un huevo; una papa; una nube gris; una cara; musgo; motas sueltas alrededor.
- **Checklist**: el común (§3.3), y además:
  1. ¿Un chico de 6 años diría "una piedra"?
  2. Girarla 90°: ¿se nota que giró (grietas fuera del centro)?
  3. ¿El borde está limpio, sin motas?
  4. ¿Se ve sobre el gris verdoso de la ladera y sobre el cielo pálido de la cordillera?

### D12 — El charco: variaciones

- **Qué es y qué tiene que reconocer el chico**: el charco que deja el pato al salir de la laguna (`duck-trail1`, `duck-charcos`). Tiene que seguir siendo **agua en el piso**, nunca una gota ni una piedra azul.
- **La variación 1** es `art-source/pista charco.png`, que ya existe. Se adjunta en los dos mensajes.

#### D12 · `pista charco 2.png`

- **Archivo**: `art-source/pista charco 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista charco.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: a small puddle of water on the ground, seen from above, as if a wet duck had just stepped out of it. This time the puddle is WIDER than tall (about 1.3 times wider), one flat irregular blob with a wavy, uneven edge, a bit like a bean. Inside it, ONE long curved #1a1a1a ripple line and one short one. Just above its top edge, on the RIGHT only, one small separate drop splashing up. Fill #50a0da.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista charco.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #50a0da, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D12 · `pista charco 3.png`

- **Archivo**: `art-source/pista charco 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista charco.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: a small puddle of water on the ground, seen from above, as if a wet duck had just stepped out of it. This time it is one main puddle, rounder and a little smaller, with a second tiny separate puddle just above it, as if the duck dripped twice. Inside the main puddle, two short curved #1a1a1a ripple lines. No splash drops. Fill #50a0da.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista charco.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #50a0da, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: una gota con forma de lágrima; un óvalo perfecto; reflejos blancos; barro marrón; una huella adentro.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. ¿Un chico de 6 años diría "un charco" (agua en el piso)?
  2. Al lado de `pista charco.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  3. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D13 — Las semillas: variaciones

- **Qué es y qué tiene que reconocer el chico**: las semillas de girasol que picoteó el pato. Tienen que seguir siendo **semillas con rayas**, nunca piedritas ni papas.
- **La variación 1** es `art-source/pista semillas.png`, que ya existe. Se adjunta en los dos mensajes.

#### D13 · `pista semillas 2.png`

- **Archivo**: `art-source/pista semillas 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista semillas.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: fat sunflower seeds, the kind people throw to ducks. Each seed is a plump teardrop with a pointed top and a rounded bottom, with two thick #1a1a1a stripes running along its length. This time only TWO seeds side by side, leaning slightly apart like a V, both pointing UP, touching only at their rounded bottoms. Fill #dba43c.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista semillas.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #dba43c, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D13 · `pista semillas 3.png`

- **Archivo**: `art-source/pista semillas 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista semillas.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: fat sunflower seeds, the kind people throw to ducks. Each seed is a plump teardrop with a pointed top and a rounded bottom, with two thick #1a1a1a stripes running along its length. This time FOUR seeds in a loose little pile: three standing fanned out and pointing UP, and a fourth, smaller one in front of them, tilted. Fill #dba43c.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista semillas.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #dba43c, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: semillas sin rayas; una pila de puntitos; maíz; maní.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. ¿Un chico de 6 años diría "semillas" y no "piedras"?
  2. Al lado de `pista semillas.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  3. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D14 — La pluma del pato: variaciones

- **Qué es y qué tiene que reconocer el chico**: la pluma amarilla del pato. Tiene que seguir siendo **pluma** (cañón, borde con muescas, punta redonda), nunca hoja.
- **La variación 1** es `art-source/pista pluma de pato.png`, que ya existe. Se adjunta en los dos mensajes.

#### D14 · `pista pluma de pato 2.png`

- **Archivo**: `art-source/pista pluma de pato 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista pluma de pato.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one soft, fluffy duck feather, tip pointing UP, the kind that falls off a yellow cartoon duckling, with a central quill drawn as a thick #1a1a1a line that sticks out below the vane as a short bare stem. This time the quill curves gently to the LEFT, the vane is a little wider on the right, the tip is ROUNDED and slightly bent, and there is one small V-shaped notch on each side. Fill #f6ca3c.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista pluma de pato.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #f6ca3c, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D14 · `pista pluma de pato 3.png`

- **Archivo**: `art-source/pista pluma de pato 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista pluma de pato.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one soft, fluffy duck feather, tip pointing UP, the kind that falls off a yellow cartoon duckling, with a central quill drawn as a thick #1a1a1a line that sticks out below the vane as a short bare stem. This time a shorter, fluffier feather: a wide, rounded, almost oval vane with a straight quill, three small V-shaped notches on the left edge only, and a longer bare stem below with two loose wisps of fluff at its base. Fill #f6ca3c.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista pluma de pato.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #f6ca3c, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: nervaduras que salen del cañón (eso es una hoja); punta aguda; verde; una pluma de escribir.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. Al lado de `hoja.png`, ¿se distinguen al instante?
  2. ¿Un chico de 6 años diría "una pluma"?
  3. Al lado de `pista pluma de pato.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  4. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D15 — La huella del pato: variaciones

- **Qué es y qué tiene que reconocer el chico**: la huella palmeada del pato, que además es una opción de la deducción de las tortugas, al lado de la de gallina. Tiene que seguir siendo **pata de pato**: tres dedos hacia adelante unidos por membrana.
- **La variación 1** es `art-source/pista huella de pato.png`, que ya existe. Se adjunta en los dos mensajes.

#### D15 · `pista huella de pato 2.png`

- **Archivo**: `art-source/pista huella de pato 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista huella de pato.png` (la variación 1).

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid shape filled with #1a1a1a.
No outline of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one webbed duck footprint pressed into mud, toes pointing UP: three long, rounded toes spread like an open fan, joined by webbing, and a small rounded heel below. The whole print is wider at the top than at the bottom. This time the toes spread WIDER, like a wide-open fan, and the front edge of the web curves inward only gently between the toe tips, so the web looks full.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista huella de pato.png". Keep EXACTLY the same as variation 1: the
outline weight, the solid #1a1a1a colour, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D15 · `pista huella de pato 3.png`

- **Archivo**: `art-source/pista huella de pato 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista huella de pato.png` (la variación 1).

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid shape filled with #1a1a1a.
No outline of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one webbed duck footprint pressed into mud, toes pointing UP: three long, rounded toes spread like an open fan, joined by webbing, and a small rounded heel below. The whole print is wider at the top than at the bottom. This time the three toes are a little closer together, the middle toe clearly longer than the two side toes, the web edge has gentle inward curves, and the heel sits slightly off-centre.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista huella de pato.png". Keep EXACTLY the same as variation 1: the
outline weight, the solid #1a1a1a colour, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: dedos finos como palitos o un dedo hacia atrás (eso es la gallina); forma de corona; tres bolitas sobre un triángulo.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. Al lado de `huella negra.png` (gallina), ¿son claramente dos animales distintos?
  2. ¿Un chico de 6 años diría "pata de pato"?
  3. Al lado de `pista huella de pato.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  4. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D16 — Las burbujas: variaciones

- **Qué es y qué tiene que reconocer el chico**: las burbujas que dejaron los peces (`f2-guirnalda`). Tienen que seguir siendo **burbujas que suben**, de tamaños distintos, separadas.
- **La variación 1** es `art-source/pista burbujas.png`, que ya existe. Se adjunta en los dos mensajes.

#### D16 · `pista burbujas 2.png`

- **Archivo**: `art-source/pista burbujas 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista burbujas.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: round water bubbles rising, as if a fish breathed them out underwater. Each bubble is a round outline with ONE short curved #1a1a1a line inside it, close to its upper-left edge, as the shine. Small clear gaps between them: they never touch. This time only TWO bubbles: a big one at the bottom left and a smaller one above it, to the right. Fill #51b9e1.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista burbujas.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #51b9e1, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D16 · `pista burbujas 3.png`

- **Archivo**: `art-source/pista burbujas 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista burbujas.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: round water bubbles rising, as if a fish breathed them out underwater. Each bubble is a round outline with ONE short curved #1a1a1a line inside it, close to its upper-left edge, as the shine. Small clear gaps between them: they never touch. This time FOUR bubbles rising in a gentle S-shaped column, from the biggest at the bottom to the smallest at the top. Fill #51b9e1.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista burbujas.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #51b9e1, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: un solo círculo; brillos blancos; burbujas pegadas en racimo; peces u ondas alrededor.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. A 28 px, ¿se ven burbujas y no pelotas ni un semáforo?
  2. Al lado de `pista burbujas.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  3. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D17 — La manito del mono: variaciones

- **Qué es y qué tiene que reconocer el chico**: las manos que dejó el mono al trepar la liana (`monkey1`). Tiene que seguir siendo **una manito**, y un poco **más de mono** que la de hoy: palma angosta, dedos largos, pulgar bien separado.
- **La variación 1** es `art-source/pista mano de mono.png`, que ya existe. Se adjunta en los dos mensajes.

#### D17 · `pista mano de mono 2.png`

- **Archivo**: `art-source/pista mano de mono 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista mano de mono.png` (la variación 1).

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid shape filled with #1a1a1a.
No outline of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one monkey handprint, fingers pointing UP: a narrow rounded palm, four LONG slightly curved fingers with small clear gaps between them, and a long thumb set low on the RIGHT side, sticking out and apart from the fingers. This time the four fingers spread a little apart like a fan, and the thumb sits lower and points more sideways.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista mano de mono.png". Keep EXACTLY the same as variation 1: the
outline weight, the solid #1a1a1a colour, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D17 · `pista mano de mono 3.png`

- **Archivo**: `art-source/pista mano de mono 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista mano de mono.png` (la variación 1).

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid shape filled with #1a1a1a.
No outline of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one monkey handprint, fingers pointing UP: a narrow rounded palm, four LONG slightly curved fingers with small clear gaps between them, and a long thumb set low on the RIGHT side, sticking out and apart from the fingers. This time the four fingers are close together and gently curved to the left, as if the hand had been gripping a vine; the thumb still clearly apart.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista mano de mono.png". Keep EXACTLY the same as variation 1: the
outline weight, the solid #1a1a1a colour, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: una mano de adulto; un guante; dedos pegados (a 28 px se vuelven un mitón); garras.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. A 28 px, ¿se cuentan los dedos y se ve el pulgar separado?
  2. Al lado de `huella negra.png`, ¿nadie las confunde?
  3. Al lado de `pista mano de mono.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  4. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D18 — La banana: variaciones

- **Qué es y qué tiene que reconocer el chico**: la banana que se les cayó a los monos (`monkey2`). Tiene que seguir siendo **una banana entera**, nunca una luna ni una sonrisa.
- **La variación 1** es `art-source/pista banana.png`, que ya existe. Se adjunta en los dos mensajes.

#### D18 · `pista banana 2.png`

- **Archivo**: `art-source/pista banana 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista banana.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one whole, unpeeled ripe banana standing on end, stem pointing UP. The short stem at the top and the small tip at the bottom are drawn solid #1a1a1a. One curved #1a1a1a line runs along its length, like the ridge of the peel. This time the banana is curved MORE strongly, like a deep crescent, and leans slightly to the left. Fill #fbd63a.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista banana.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #fbd63a, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D18 · `pista banana 3.png`

- **Archivo**: `art-source/pista banana 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista banana.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one whole, unpeeled ripe banana standing on end, stem pointing UP. The short stem at the top and the small tip at the bottom are drawn solid #1a1a1a. One curved #1a1a1a line runs along its length, like the ridge of the peel. This time a short, chubby banana, thicker in the middle and only gently curved to the right. Fill #fbd63a.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista banana.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #fbd63a, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: un racimo; una banana pelada; manchas marrones; una luna.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. A 28 px, ¿es una banana y no una luna?
  2. Al lado de `pista banana.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  3. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D19 — La cáscara de banana: variaciones

- **Qué es y qué tiene que reconocer el chico**: las cáscaras colgando de las lianas (`monkey-lianas`). Tiene que seguir siendo **una cáscara vacía**, distinta de la banana entera por la silueta.
- **La variación 1** es `art-source/pista cascara de banana.png`, que ya existe. Se adjunta en los dos mensajes.

#### D19 · `pista cascara de banana 2.png`

- **Archivo**: `art-source/pista cascara de banana 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista cascara de banana.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: an empty banana peel, the classic cartoon one, hanging with its short solid #1a1a1a stem pointing UP; below the stem, the peel flaps open outwards and droop down, with nothing inside. Each flap has one #1a1a1a line along its middle. This time only TWO long flaps: one hanging almost straight down and one drooping out to the side and curling at its end. Fill #fbd73e.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista cascara de banana.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #fbd73e, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D19 · `pista cascara de banana 3.png`

- **Archivo**: `art-source/pista cascara de banana 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista cascara de banana.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: an empty banana peel, the classic cartoon one, hanging with its short solid #1a1a1a stem pointing UP; below the stem, the peel flaps open outwards and droop down, with nothing inside. Each flap has one #1a1a1a line along its middle. This time FOUR shorter flaps splayed wide open all around, like a star hanging from the stem. Fill #fbd73e.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista cascara de banana.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #fbd73e, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: la fruta asomando adentro; que parezca un pulpo o una flor; manchas marrones.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. Al lado de `pista banana.png`, ¿se ve de un vistazo cuál es la banana y cuál la cáscara?
  2. Al lado de `pista cascara de banana.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  3. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D20 — La huellita del erizo: variaciones

- **Qué es y qué tiene que reconocer el chico**: las huellitas que guían el camino de `night-rastro` bajo la linterna. Tienen que seguir siendo **huellitas de un animal chico de patitas**, con los dedos separados.
- **La variación 1** es `art-source/pista huellita de erizo.png`, que ya existe. Se adjunta en los dos mensajes.

#### D20 · `pista huellita de erizo 2.png`

- **Archivo**: `art-source/pista huellita de erizo 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista huellita de erizo.png` (la variación 1).

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid shape filled with #1a1a1a.
No outline of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one small hedgehog footprint, toes pointing UP: a rounded palm pad at the bottom and FIVE small round toe pads in an arc above it. The toe pads are separate from the palm and from each other, with clear gaps at least as wide as a thick marker line. This time the palm pad is a little more oval and the five toe pads sit in a WIDER, flatter arc.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista huellita de erizo.png". Keep EXACTLY the same as variation 1: the
outline weight, the solid #1a1a1a colour, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D20 · `pista huellita de erizo 3.png`

- **Archivo**: `art-source/pista huellita de erizo 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista huellita de erizo.png` (la variación 1).

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid shape filled with #1a1a1a.
No outline of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one small hedgehog footprint, toes pointing UP: a rounded palm pad at the bottom and FIVE small round toe pads in an arc above it. The toe pads are separate from the palm and from each other, with clear gaps at least as wide as a thick marker line. This time the palm pad is rounder and the five toe pads sit in a tighter, taller arc, the two outer toes a little smaller than the rest.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista huellita de erizo.png". Keep EXACTLY the same as variation 1: the
outline weight, the solid #1a1a1a colour, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: cuatro dedos y almohadilla de corazón (perro o gato); dedos largos (eso es el mono); uñas; dedos pegados.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. A 28 px, ¿los dedos siguen separados?
  2. Al lado de `pista mano de mono.png`, ¿nadie las confunde?
  3. Al lado de `pista huellita de erizo.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  4. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D21 — La hoja: variaciones

- **Qué es y qué tiene que reconocer el chico**: la hoja que el viento cruza por el camino en `bee3` y `monkey3`, y las de los rincones de `glass3`. Tiene que seguir siendo **una hoja verde** del mismo árbol.
- **La variación 1** es `art-source/hoja.png`, que ya existe. Se adjunta en los dos mensajes.

#### D21 · `hoja 2.png`

- **Archivo**: `art-source/hoja 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/hoja.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a small object in a finger-tracing game for 6-year-olds. It is
shown about 30 pixels tall, and sometimes several of them float across
the screen at once, blown by the wind.

The subject: one green leaf, oriented like the attached leaf (stem at the bottom left, tip at the top right), with one central vein drawn as a thick #1a1a1a line and a short stem. This time the leaf is longer and narrower, with a gentle S-curve along its vein. Fill #66d236.

This is VARIATION 2 of 3 of the same object. Variation 1 is the
attached image "hoja.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #66d236, the size the subject takes on the
canvas, the level of detail, and the same orientation. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D21 · `hoja 3.png`

- **Archivo**: `art-source/hoja 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/hoja.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a small object in a finger-tracing game for 6-year-olds. It is
shown about 30 pixels tall, and sometimes several of them float across
the screen at once, blown by the wind.

The subject: one green leaf, oriented like the attached leaf (stem at the bottom left, tip at the top right), with one central vein drawn as a thick #1a1a1a line and a short stem. This time the leaf is rounder and broader, with a small bite missing from one edge, as if a caterpillar had nibbled it. Fill #66d236.

This is VARIATION 3 of 3 of the same object. Variation 1 is the
attached image "hoja.png". Keep EXACTLY the same as variation 1: the
outline weight, the fill colour #66d236, the size the subject takes on the
canvas, the level of detail, and the same orientation. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: una pluma; varias hojas juntas; otoño (marrón, naranja); nervaduras finas.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. Al lado de `hoja.png`, ¿son hojas del mismo árbol?
  2. ¿Un chico de 6 años diría "una hoja"?
  3. Al lado de `hoja.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  4. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D22 — La manzana: variaciones

- **Qué es y qué tiene que reconocer el chico**: la manzana que el chico encuentra con la linterna (`night2`, final de `night-rastro`). Tiene que seguir siendo **una manzana roja**.
- **La variación 1** es `art-source/manzana.png`, que ya existe. Se adjunta en los dos mensajes.

#### D22 · `manzana 2.png`

- **Archivo**: `art-source/manzana 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/manzana.png` (la variación 1).

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1024x1024. One single object, centred, filling about three
quarters of the canvas. It is a small object in a game for
6-year-olds, shown about 40 pixels tall.

The subject: one red apple #d94436 with a short brown #6b4a2e stem. This time the apple is whole, with NO bite; its stem tilts to the right and one green #66d236 leaf grows on the LEFT of the stem.

This is VARIATION 2 of 3 of the same object. Variation 1 is the
attached image "manzana.png". Keep EXACTLY the same as variation 1: the
outline weight, the same red, brown, green and cream, the size the subject takes on the
canvas, the level of detail, and the same orientation. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D22 · `manzana 3.png`

- **Archivo**: `art-source/manzana 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/manzana.png` (la variación 1).

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1024x1024. One single object, centred, filling about three
quarters of the canvas. It is a small object in a game for
6-year-olds, shown about 40 pixels tall.

The subject: one red apple #d94436 with a short brown #6b4a2e stem. This time the apple has a BIG bite out of its left side, showing the pale cream #f3e3c3 inside with two small dark seeds; the stem stands straight up and there is no leaf.

This is VARIATION 3 of 3 of the same object. Variation 1 is the
attached image "manzana.png". Keep EXACTLY the same as variation 1: the
outline weight, the same red, brown, green and cream, the size the subject takes on the
canvas, the level of detail, and the same orientation. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: una cereza; un tomate (sin cabito ni hoja, más chato); brillos blancos; varias manzanas.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. ¿Un chico de 6 años diría "una manzana" y no "un tomate"?
  2. Al lado de `manzana.png`, ¿mismo rojo y mismo tamaño?
  3. Al lado de `manzana.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  4. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D23 — El mechón de lana (después de C9): variaciones

- **Qué es y qué tiene que reconocer el chico**: la lana enganchada en los postes del alambrado (`sheep-lana`). La 1 es C9 de `docs/22`. Tiene que seguir siendo **lana de oveja**: borde de bolitas y rulos adentro, nunca una nube.
- **La variación 1** es `art-source/pista lana.png`, que ya existe (o va a existir cuando C9/C10 estén hechos). Se adjunta en los dos mensajes.

#### D23 · `pista lana 2.png`

- **Archivo**: `art-source/pista lana 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista lana.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: a fluffy tuft of sheep's wool, the same wool as the attached first tuft. Its outline is made of many small round bumps, like a small cloud, and inside it there are small tight curls drawn as short #1a1a1a spirals. This time the tuft is WIDER and lower, with three small curls inside.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista lana.png". Keep EXACTLY the same as variation 1: the
outline weight, exactly the same fill colour as variation 1, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D23 · `pista lana 3.png`

- **Archivo**: `art-source/pista lana 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista lana.png` (la variación 1).

```
Style: a single 2D game asset drawn with a thick felt-tip marker, by
hand. Dark outline #1a1a1a, thick, with rounded ends. The line is
HUMAN, not vector: slight wobble along the stroke, small variation in
thickness, curves that do not close perfectly. Flat colour fill that
overshoots the outline slightly on one side and falls short on the
other, like a child colouring in tidily. Chunky, generous shapes with
no fine detail. Flat colours only.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, outlines in any colour
other than #1a1a1a, texture noise, photorealism, or a background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow under it, no text, no frame.

Colour rule: exactly TWO colours, the #1a1a1a outline and ONE flat fill
colour. Every inner detail is a thick #1a1a1a line. No white
highlights, no second fill colour, no lighter or darker patches.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: a fluffy tuft of sheep's wool, the same wool as the attached first tuft. Its outline is made of many small round bumps, like a small cloud, and inside it there are small tight curls drawn as short #1a1a1a spirals. This time the tuft is pulled into two lumps joined by a short twisted neck, as if it snagged on a fence wire and stretched; two small curls inside each lump.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista lana.png". Keep EXACTLY the same as variation 1: the
outline weight, exactly the same fill colour as variation 1, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: una nube con cielo; algodón de azúcar rosa; un ovillo con hilo suelto; una oveja entera.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. Al lado de `oveja.png` (o `oveja v2.png`), ¿se entiende que es un pedacito de su lana y no una nube?
  2. Al lado de `pista lana.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  3. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

### D24 — La huella de la tortuga (después de C10): variaciones

- **Qué es y qué tiene que reconocer el chico**: las huellas a los dos lados del surco de la cola (`turtle-huellas`). La 1 es C10 de `docs/22`. En la deducción va al lado de la del pato y la de la gallina: tiene que seguir siendo **muy distinta** de las dos.
- **La variación 1** es `art-source/pista huella de tortuga.png`, que ya existe (o va a existir cuando C9/C10 estén hechos). Se adjunta en los dos mensajes.

#### D24 · `pista huella de tortuga 2.png`

- **Archivo**: `art-source/pista huella de tortuga 2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista huella de tortuga.png` (la variación 1).

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid shape filled with #1a1a1a.
No outline of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one turtle footprint in the sand, front pointing UP: a wide, rounded, oval pad, wider than tall, whose top edge is made of four short, blunt, stubby toes JOINED to the pad, and short thick claw scratches in front of the toes, separate from the pad. This time the pad is a little rounder and there are only TWO claw scratches in front.

This is VARIATION 2 of 3 of the same clue. Variation 1 is the
attached image "pista huella de tortuga.png". Keep EXACTLY the same as variation 1: the
outline weight, the solid #1a1a1a colour, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

#### D24 · `pista huella de tortuga 3.png`

- **Archivo**: `art-source/pista huella de tortuga 3.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/pista huella de tortuga.png` (la variación 1).

```
Style: a single 2D game asset drawn by hand with a thick felt-tip
marker, like a rubber stamp pressed on the ground. The edges are
slightly irregular and hand-made, never perfectly smooth. Chunky,
generous shapes with no fine detail.

Do NOT produce: smooth vector or clip-art shapes, a logo, gradients,
shadows, glow, 3D shading, texture noise, photorealism, or a
background.

Canvas: one image, 1024x1024 pixels, TRANSPARENT background (a real
alpha channel: not white, not grey, not a painted checkerboard). One
single subject, centred, filling about three quarters of the canvas.
Nothing else: no ground, no shadow, no text, no frame.

Colour rule: the whole print is ONE solid shape filled with #1a1a1a.
No outline of another colour, no inner lines, no second colour.

This is a clue mark in a finger-tracing game for 6-year-olds. It is
shown about 28 pixels tall, repeated many times along a path, and
rotated to follow the path, so its FRONT must point UP.

The subject: one turtle footprint in the sand, front pointing UP: a wide, rounded, oval pad, wider than tall, whose top edge is made of four short, blunt, stubby toes JOINED to the pad, and short thick claw scratches in front of the toes, separate from the pad. This time the pad is slightly tilted, wider on one side, and the three claw scratches spread out in a small fan.

This is VARIATION 3 of 3 of the same clue. Variation 1 is the
attached image "pista huella de tortuga.png". Keep EXACTLY the same as variation 1: the
outline weight, the solid #1a1a1a colour, the size the subject takes on the
canvas, the level of detail, and the front pointing UP. Only the shape
details change, as described above. Side by side, a child must see at
once that they are the same kind of thing, but never the same stamp,
and never simply a mirrored or rotated copy of variation 1.
```

- **Evitar**: dedos separados en puntitos (eso es el erizo); dedos largos; un caparazón.
- **Checklist** (para cada una): el común (§3.3), y además:
  1. Al lado de `pista huella de pato.png` y de `huella negra.png`, ¿un chico las distingue sin dudar?
  2. Al lado de `pista huella de tortuga.png`: ¿mismo color, mismo grosor, mismo tamaño en el lienzo?
  3. ¿Se distingue de la 1 a simple vista, y no es la 1 espejada o girada?

---

## 5. Pedidos de prioridad media: los fondos (D25–D34)

Leer antes la §3.4. Pedirlos todos en la misma conversación, uno por
mensaje, con la referencia que dice cada uno.

| ID | Archivo | Filas de la franja | Límite de tono en la franja | Referencia |
|---|---|---|---|---|
| D25 | `fondo laguna v2.png` | 13 %–87 % | nada más claro que `#b4c5d0` | `fondo recinto monos.png` |
| D26 | `fondo ladera v2.png` | 21 %–85 % | nada más oscuro que `#9da396` | `fondo recinto monos.png` |
| D27 | `fondo cordillera v2.png` | 16 %–84 % | nada más oscuro que `#c8d3d8` | `fondo recinto monos.png` |
| D28 | `fondo bosque v2.png` | 19 %–90 % | nada más claro que `#86a678`; sin flores | `fondo recinto monos.png` |
| D29 | `fondo nocturno v2.png` | 20 %–85 % | nada más claro que `#526083` | `fondo noche zoo.png` |
| D30 | `fondo sendero v2.png` | (fondo de revelado) | — | `fondo recinto monos.png` |
| D31 | `fondo pecera v2.png` | (fondo de revelado) | — | `fondo recinto monos.png` |
| D32–D34 | ampliaciones | sin cambios: el centro es el mismo | — | la imagen misma |

Checklist de los fondos (vale para D25–D31):

1. ¿Mide exactamente 2048 × 1024 y es totalmente opaco (ningún píxel
   transparente, ni en las esquinas)?
2. Tapar las dos franjas de 341 px de los costados: ¿lo que queda (el
   centro 4:3) se entiende solo, y no quedó nada importante cortado?
3. ¿Un chico de 6 años, mirando solo el centro, diría qué lugar es (una
   laguna, una ladera, un bosque…)?
4. ¿La franja tiene textura suave (no es un rectángulo liso), pero ningún
   objeto, contorno, blanco ni brillo? ¿Respeta el límite de tono?
5. ¿El borde entre la decoración y la franja es irregular, nunca una recta
   de regla?
6. Dibujar encima una línea gruesa de papel blanco (unos 80 px) ondulando
   por el medio: ¿se lee bien el camino?
7. ¿Se sienta al lado de la referencia sin desentonar (mismo trazo, misma
   paleta)?

### D25 — La laguna (reemplaza B1)

- **Archivo**: `art-source/fondo laguna v2.png`. PNG 2048 × 1024, opaco.
- **Adjuntar**: `art-source/fondo recinto monos.png` (referencia de estilo: el mejor fondo aprobado).
- **Qué es**: el fondo del pato, los peces y los delfines (12 niveles). Hoy es un rectángulo celeste grisáceo con juncos cortados con regla. Tiene que ser **una laguna con agua de verdad**, con orilla y profundidad.

```
Match the drawing style, line weight and colour palette of the attached
reference image exactly: a children's book illustration with bold
dark outlines, flat colour areas with a soft painted texture inside
them, and a scene with real depth (near things big, far things small).
Landscape 2:1, exactly 2048x1024 pixels, full-bleed, FULLY OPAQUE:
every single pixel painted, no transparency anywhere, not even at the
corners. No animals, no characters, no people, no text, no writing on
any sign.

A calm zoo duck pond in daylight, seen from its grassy bank, with real
depth. Along the top: the far shore with reeds, cattails, round stones,
a few bushes and a small wooden duck house on short stilts. Along the
bottom: the near shore with reeds, big lily pads at the water's edge
and a small wooden jetty, a little left of the centre. The open water in the
middle is soft blue-grey, close to #9fb4c2.

Composition rules. They matter more than any detail:
- This is the backdrop of a finger-tracing game for young children.
  The game draws a path ON TOP of the middle of this picture.
- SAFE ZONE. Depending on the screen, up to 341 px of the width may be
  cropped on the LEFT edge and the same on the RIGHT edge. Everything
  that tells the child WHERE we are (the duck house, the jetty and the shore lines) goes inside the
  CENTRAL 1365 px of the 2048 px width, a 4:3 safe zone. The outer
  strips on both sides only continue the scenery naturally: nothing
  there that matters, nothing important cut by the canvas edge.
- The top and bottom edges are never cropped, but nothing important
  touches them: keep about 40 px of breathing room.
- THE GROUND BAND, from 13% to 87% of the image height and
  across the WHOLE width, is the open pond water. It is part of the place, seen in
  gentle perspective, NOT a flat empty rectangle: it carries a soft,
  low-contrast painted texture (very soft horizontal ripple strokes and a few large, faint reflections of the reeds). Every pixel of the texture is DARKER than #b4c5d0: nothing in the band is lighter than #b4c5d0. Inside the band: no
  objects, no dark outlines, no white, no sparkles, no small repeated
  marks, nothing that looks like a path, a road or a line.
- The scenery above and below the band ends with an ORGANIC, uneven
  edge (tufts, stones, roots, ripples) that overlaps the band a little.
  NEVER a straight horizontal cut, never a line drawn with a ruler.
- Spread the interesting detail above and below the band and into the
  four corners, so no side of the picture looks empty.
```

- **Evitar**: agua con brillos blancos o destellos; un patito o un pez; nenúfares en el medio de la franja; un cielo enorme.
- **Checklist**: el de los fondos (arriba), y además:
  1. ¿Se lee agua (ondas, reflejos) y no un piso celeste?

### D26 — La ladera de las ovejas (reemplaza B2)

- **Archivo**: `art-source/fondo ladera v2.png`. PNG 2048 × 1024, opaco.
- **Adjuntar**: `art-source/fondo recinto monos.png` (referencia de estilo: el mejor fondo aprobado).
- **Qué es**: el fondo de las ovejas. Hoy es un 60 % de gris verdoso liso. Tiene que ser **una ladera de pasto**. El camino de este fondo es un canal de piedra oscuro (`CHANNEL_STONE`): lo que tiene que quedar lejos es lo oscuro.

```
Match the drawing style, line weight and colour palette of the attached
reference image exactly: a children's book illustration with bold
dark outlines, flat colour areas with a soft painted texture inside
them, and a scene with real depth (near things big, far things small).
Landscape 2:1, exactly 2048x1024 pixels, full-bleed, FULLY OPAQUE:
every single pixel painted, no transparency anywhere, not even at the
corners. No animals, no characters, no people, no text, no writing on
any sign.

A gentle green mountain pasture in daylight, a grassy hillside rising
away from us. Along the top: far mountains with a little snow and two
small clouds, a wooden sheep pen and a small shepherd's hut. Along the
bottom: a low dry-stone wall and tufts of grass. The grassy slope in
the middle is a soft sage green, close to #a9b09f.

Composition rules. They matter more than any detail:
- This is the backdrop of a finger-tracing game for young children.
  The game draws a path ON TOP of the middle of this picture.
- SAFE ZONE. Depending on the screen, up to 341 px of the width may be
  cropped on the LEFT edge and the same on the RIGHT edge. Everything
  that tells the child WHERE we are (the sheep pen, the hut and the stone wall) goes inside the
  CENTRAL 1365 px of the 2048 px width, a 4:3 safe zone. The outer
  strips on both sides only continue the scenery naturally: nothing
  there that matters, nothing important cut by the canvas edge.
- The top and bottom edges are never cropped, but nothing important
  touches them: keep about 40 px of breathing room.
- THE GROUND BAND, from 21% to 85% of the image height and
  across the WHOLE width, is the grassy slope. It is part of the place, seen in
  gentle perspective, NOT a flat empty rectangle: it carries a soft,
  low-contrast painted texture (soft strokes of grass going up the hill and a few large, faint patches of a lighter green). Every pixel of the texture is LIGHTER than #9da396: nothing in the band is darker than #9da396. Inside the band: no
  objects, no dark outlines, no white, no sparkles, no small repeated
  marks, nothing that looks like a path, a road or a line.
- The scenery above and below the band ends with an ORGANIC, uneven
  edge (tufts, stones, roots, ripples) that overlaps the band a little.
  NEVER a straight horizontal cut, never a line drawn with a ruler.
- Spread the interesting detail above and below the band and into the
  four corners, so no side of the picture looks empty.
```

- **Evitar**: postes de alambrado en la franja (el chico dibuja los postes en `sheep-lana`); ovejas; flores blancas en la franja; un camino de tierra.
- **Checklist**: el de los fondos (arriba), y además:
  1. ¿Se lee pasto en pendiente y no una pared verde?

### D27 — La cordillera de las llamas (reemplaza B3)

- **Archivo**: `art-source/fondo cordillera v2.png`. PNG 2048 × 1024, opaco.
- **Adjuntar**: `art-source/fondo recinto monos.png` (referencia de estilo: el mejor fondo aprobado).
- **Qué es**: el fondo de las llamas, que trazan picos sobre el cielo. Hoy el cielo parece una pared. Tiene que ser **aire de montaña**, con lejanía. Canal de piedra, como D26.

```
Match the drawing style, line weight and colour palette of the attached
reference image exactly: a children's book illustration with bold
dark outlines, flat colour areas with a soft painted texture inside
them, and a scene with real depth (near things big, far things small).
Landscape 2:1, exactly 2048x1024 pixels, full-bleed, FULLY OPAQUE:
every single pixel painted, no transparency anywhere, not even at the
corners. No animals, no characters, no people, no text, no writing on
any sign.

High Andean mountains in daylight. Along the top: sharp snowy peaks and
a far valley. Along the bottom: big grey boulders, a few tall cardón
cactus and a colourful woven blanket hanging on a wooden fence post,
a little right of the centre. The middle is open pale sky and soft distant mist,
close to #d3dcdf.

Composition rules. They matter more than any detail:
- This is the backdrop of a finger-tracing game for young children.
  The game draws a path ON TOP of the middle of this picture.
- SAFE ZONE. Depending on the screen, up to 341 px of the width may be
  cropped on the LEFT edge and the same on the RIGHT edge. Everything
  that tells the child WHERE we are (the snowy peaks, the cactus and the blanket) goes inside the
  CENTRAL 1365 px of the 2048 px width, a 4:3 safe zone. The outer
  strips on both sides only continue the scenery naturally: nothing
  there that matters, nothing important cut by the canvas edge.
- The top and bottom edges are never cropped, but nothing important
  touches them: keep about 40 px of breathing room.
- THE GROUND BAND, from 16% to 84% of the image height and
  across the WHOLE width, is the open sky and the distant mist. It is part of the place, seen in
  gentle perspective, NOT a flat empty rectangle: it carries a soft,
  low-contrast painted texture (large, soft drifts of mist and a hint of faraway valley haze). Every pixel of the texture is LIGHTER than #c8d3d8: nothing in the band is darker than #c8d3d8. Inside the band: no
  objects, no dark outlines, no white, no sparkles, no small repeated
  marks, nothing that looks like a path, a road or a line.
- The scenery above and below the band ends with an ORGANIC, uneven
  edge (tufts, stones, roots, ripples) that overlaps the band a little.
  NEVER a straight horizontal cut, never a line drawn with a ruler.
- Spread the interesting detail above and below the band and into the
  four corners, so no side of the picture looks empty.
```

- **Evitar**: montañas oscuras en el medio; pájaros; un sol con rayos; un cielo azul fuerte.
- **Checklist**: el de los fondos (arriba), y además:
  1. ¿Se siente lejanía (aire, niebla), no una pared gris?

### D28 — El bosque (reemplaza B4)

- **Archivo**: `art-source/fondo bosque v2.png`. PNG 2048 × 1024, opaco.
- **Adjuntar**: `art-source/fondo recinto monos.png` (referencia de estilo: el mejor fondo aprobado).
- **Qué es**: el fondo de la abeja (flores y panal encima) y de los monos (bucles encima). Hoy es un 70 % de verde liso. Tiene que ser **un claro del bosque** con profundidad. **Nada de flores en la franja**: le ganan a la flor que hay que juntar (`docs/13` §4, decisión 8).

```
Match the drawing style, line weight and colour palette of the attached
reference image exactly: a children's book illustration with bold
dark outlines, flat colour areas with a soft painted texture inside
them, and a scene with real depth (near things big, far things small).
Landscape 2:1, exactly 2048x1024 pixels, full-bleed, FULLY OPAQUE:
every single pixel painted, no transparency anywhere, not even at the
corners. No animals, no characters, no people, no text, no writing on
any sign.

A leafy zoo forest clearing in daylight, with depth. Along the top:
tall tree trunks and big rounded canopies, with patches of sky between
them, and hanging vines in the two top corners. Along the bottom:
ferns, mossy logs, roots and a few small mushrooms. The clearing in
the middle is soft green grass, close to #7b9a6e, seen in gentle
perspective.

Composition rules. They matter more than any detail:
- This is the backdrop of a finger-tracing game for young children.
  The game draws a path ON TOP of the middle of this picture.
- SAFE ZONE. Depending on the screen, up to 341 px of the width may be
  cropped on the LEFT edge and the same on the RIGHT edge. Everything
  that tells the child WHERE we are (the big trees, the vines and the mossy logs) goes inside the
  CENTRAL 1365 px of the 2048 px width, a 4:3 safe zone. The outer
  strips on both sides only continue the scenery naturally: nothing
  there that matters, nothing important cut by the canvas edge.
- The top and bottom edges are never cropped, but nothing important
  touches them: keep about 40 px of breathing room.
- THE GROUND BAND, from 19% to 90% of the image height and
  across the WHOLE width, is the grassy clearing. It is part of the place, seen in
  gentle perspective, NOT a flat empty rectangle: it carries a soft,
  low-contrast painted texture (soft mottled grass shading and a few faint, large patches of shade from the trees). Every pixel of the texture is DARKER than #86a678: nothing in the band is lighter than #86a678. No flowers anywhere in the band. Inside the band: no
  objects, no dark outlines, no white, no sparkles, no small repeated
  marks, nothing that looks like a path, a road or a line.
- The scenery above and below the band ends with an ORGANIC, uneven
  edge (tufts, stones, roots, ripples) that overlaps the band a little.
  NEVER a straight horizontal cut, never a line drawn with a ruler.
- Spread the interesting detail above and below the band and into the
  four corners, so no side of the picture looks empty.
```

- **Evitar**: flores en la franja; rayos de sol claros cruzando el claro; una colmena o un panal (los pone el juego); monos.
- **Checklist**: el de los fondos (arriba), y además:
  1. ¿Se lee un claro del bosque y no una pared verde?
  2. ¿No hay ni una flor en la franja?

### D29 — La noche del erizo (reemplaza B5)

- **Archivo**: `art-source/fondo nocturno v2.png`. PNG 2048 × 1024, opaco.
- **Adjuntar**: `art-source/fondo noche zoo.png` (el **mismo lugar**, un rato después: en `docs/19` §3.2 el erizo aparece ahí mismo).
- **Qué es**: el fondo del erizo. Hoy es el más pobre de todos. La tinta del erizo es clara (`TORCH_CHALK`), así que la franja queda **oscura**; la luna, las estrellas, el farol y las ventanas encendidas van arriba, fuera de la franja.

```
Match the drawing style, line weight and colour palette of the attached
reference image exactly: a children's book illustration with bold
dark outlines, flat colour areas with a soft painted texture inside
them, and a scene with real depth (near things big, far things small).
Landscape 2:1, exactly 2048x1024 pixels, full-bleed, FULLY OPAQUE:
every single pixel painted, no transparency anywhere, not even at the
corners. No animals, no characters, no people, no text, no writing on
any sign.

The same zoo path as in the attached reference, later at night, a few
steps further along. Along the top: dark trees and bushes, a crescent
moon and a few stars, the lit lantern on its post a little left of the
centre and the glowing dome windows a little right of the centre.
Along the bottom: round stepping stones and dark grass. The ground in the middle is soft dark slate blue, close
to #2a3346.

Composition rules. They matter more than any detail:
- This is the backdrop of a finger-tracing game for young children.
  The game draws a path ON TOP of the middle of this picture.
- SAFE ZONE. Depending on the screen, up to 341 px of the width may be
  cropped on the LEFT edge and the same on the RIGHT edge. Everything
  that tells the child WHERE we are (the lantern, the dome and the stepping stones) goes inside the
  CENTRAL 1365 px of the 2048 px width, a 4:3 safe zone. The outer
  strips on both sides only continue the scenery naturally: nothing
  there that matters, nothing important cut by the canvas edge.
- The top and bottom edges are never cropped, but nothing important
  touches them: keep about 40 px of breathing room.
- THE GROUND BAND, from 20% to 85% of the image height and
  across the WHOLE width, is the dark ground of the path. It is part of the place, seen in
  gentle perspective, NOT a flat empty rectangle: it carries a soft,
  low-contrast painted texture (soft, slightly darker and slightly lighter patches, like a packed-earth path at night). Nothing in the band is lighter than #526083. Inside the band: no
  objects, no dark outlines, no white, no sparkles, no small repeated
  marks, nothing that looks like a path, a road or a line.
- The scenery above and below the band ends with an ORGANIC, uneven
  edge (tufts, stones, roots, ripples) that overlaps the band a little.
  NEVER a straight horizontal cut, never a line drawn with a ruler.
- Spread the interesting detail above and below the band and into the
  four corners, so no side of the picture looks empty.
```

- **Evitar**: luz del farol cayendo sobre la franja; luciérnagas o estrellas en la franja; un cielo claro.
- **Checklist**: el de los fondos (arriba), y además:
  1. Al lado de `fondo noche zoo.png`, ¿se reconoce el mismo lugar?
  2. ¿La franja es oscura de punta a punta?

### D30 — El sendero, con huellas (reemplaza B7)

- **Archivo**: `art-source/fondo sendero v2.png`. PNG 2048 × 1024, opaco.
- **Adjuntar**: `art-source/fondo recinto monos.png` (referencia de estilo: el mejor fondo aprobado).
- **Qué es**: lo que aparece al limpiar el barro del sendero en el prólogo, y **ahí tienen que aparecer las huellas** de los animales que se escaparon (`docs/16` §2, beat 4). Fondo de revelado: no lleva camino encima, así que no tiene límite de tono. Hoy es plano y el cielo es del mismo beige que el suelo.

```
Match the drawing style, line weight and colour palette of the attached
reference image exactly: a children's book illustration with bold
dark outlines, flat colour areas with a soft painted texture inside
them, and a scene with real depth (near things big, far things small).
Landscape 2:1, exactly 2048x1024 pixels, full-bleed, FULLY OPAQUE:
every single pixel painted, no transparency anywhere, not even at the
corners. No animals, no characters, no people, no text, no writing on
any sign.

A packed-earth footpath through a small zoo, in daylight, seen from the
front with gentle depth. Along the top: low wooden fences, bushes, a
couple of trees and a light blue sky clearly different from the brown
path; a blank wooden signpost with no writing in one top corner.
Along the bottom: grass tufts and stones.

On the path, a trail of animal FOOTPRINTS crosses the picture from left
to right: webbed duck prints, small two-toed hoof prints and round paw
prints, mixed together, all heading to the right, as if many animals
had walked out together. The prints are dark brown and clearly
readable.

Composition rules. They matter more than any detail:
- This picture is revealed when the child wipes away the mud or the
  fog covering it, so the whole picture is seen at once.
- SAFE ZONE. Depending on the screen, up to 341 px of the width may be
  cropped on the LEFT edge and the same on the RIGHT edge. Everything
  that tells the child WHERE we are (the fences, the trees and the signpost) goes inside the
  CENTRAL 1365 px of the 2048 px width, a 4:3 safe zone. The outer
  strips on both sides only continue the scenery naturally.
- The top and bottom edges are never cropped, but nothing important
  touches them: keep about 40 px of breathing room.
- The footprints cross the middle of the picture on the path; they may run into the side strips and off the right edge.
- No straight horizontal cuts between the parts of the scene: every
  edge is organic and uneven.
```

- **Evitar**: un camino vacío; huellas humanas; animales; letras en el cartel.
- **Checklist**: el de los fondos (arriba), y además:
  1. ¿Las huellas se leen como de varios animales distintos, todas hacia la derecha?
  2. ¿El cielo es celeste y se distingue del camino?

### D31 — La pecera (reemplaza B6)

- **Archivo**: `art-source/fondo pecera v2.png`. PNG 2048 × 1024, opaco. (Nombre nuevo: reemplaza en el juego a `fondo entrada vidrio.png`.)
- **Adjuntar**: `art-source/fondo recinto monos.png` (referencia de estilo: el mejor fondo aprobado).
- **Qué es**: lo que aparece al limpiar el vidrio empañado del recinto de los peces. El cierre dice "las algas, el cofre, las piedras", y hoy es un invernadero con piso brillante. Tiene que ser **el adentro de una pecera**, sin peces (se escaparon). Fondo de revelado: sin límite de tono.

```
Match the drawing style, line weight and colour palette of the attached
reference image exactly: a children's book illustration with bold
dark outlines, flat colour areas with a soft painted texture inside
them, and a scene with real depth (near things big, far things small).
Landscape 2:1, exactly 2048x1024 pixels, full-bleed, FULLY OPAQUE:
every single pixel painted, no transparency anywhere, not even at the
corners. No animals, no characters, no people, no text, no writing on
any sign.

The inside of a big zoo aquarium, seen through its front glass: water
fills the whole scene, light at the top and a bit deeper blue at the
bottom. Tall green algae along the bottom, grey rounded stones on pale
sand, one small closed wooden treasure chest half buried in the sand,
a few bubbles rising. NO fish anywhere.

Composition rules. They matter more than any detail:
- This picture is revealed when the child wipes away the mud or the
  fog covering it, so the whole picture is seen at once.
- SAFE ZONE. Depending on the screen, up to 341 px of the width may be
  cropped on the LEFT edge and the same on the RIGHT edge. Everything
  that tells the child WHERE we are (the treasure chest, the biggest algae and the stones) goes inside the
  CENTRAL 1365 px of the 2048 px width, a 4:3 safe zone. The outer
  strips on both sides only continue the scenery naturally.
- The top and bottom edges are never cropped, but nothing important
  touches them: keep about 40 px of breathing room.
- The upper middle of the water stays calm and open: the octopus talks over it.
- No straight horizontal cuts between the parts of the scene: every
  edge is organic and uneven.
```

- **Evitar**: peces; un buzo o un castillo; brillos fuertes; un invernadero; vidrios con marco.
- **Checklist**: el de los fondos (arriba), y además:
  1. ¿Se lee "adentro de una pecera" y se ven algas, cofre y piedras?
  2. ¿No hay ni un pez?

### D32 — La arena, ampliada a 2:1

- **Archivo**: `art-source/fondo arena v2.png`. PNG 2048 × 1024, opaco.
- **Adjuntar**: `art-source/fondo arena.png` (la imagen que se amplía).
- **Qué es**: un fondo aprobado que funciona, pero es 3:2: en una pantalla ancha (hasta 2,1:1) pierde cerca del 29 % del alto. Ampliado hacia los costados a 2:1, ninguna pantalla le recorta arriba ni abajo. **No se redibuja**: el centro tiene que quedar igual.

```
Extend the attached image into a wider picture, exactly 2048x1024
pixels, landscape 2:1. Keep the attached picture EXACTLY as it is, in
the centre: same drawing, same colours, same size, nothing redrawn,
nothing moved. Add about 256 px of NEW scenery on the LEFT and the same
on the RIGHT, continuing naturally what is already at those edges
(rocks, the waterfall pool and plants on the left; rocks, the wooden fence and plants on the right). Do not stretch the picture. Do not crop or change the top or
the bottom. Do not add anything new in the centre. Fully opaque: every
pixel painted. No animals, no characters, no people, no text.
```

- **Evitar**: redibujar o "mejorar" el centro; estirar; agregar animales o carteles; una costura visible entre lo viejo y lo nuevo.
- **Checklist**:
  1. ¿Mide exactamente 2048 × 1024 y es totalmente opaco?
  2. Poner `fondo arena.png` encima, corrido 256 px a la derecha: ¿el centro coincide (mismo dibujo, mismos colores)?
  3. ¿Se ve alguna costura entre lo original y lo agregado? Si se ve, se rechaza.
  4. ¿La cascada ya no roza el borde de la imagen?

### D33 — La noche del zoológico, ampliada a 2:1

- **Archivo**: `art-source/fondo noche zoo v2.png`. PNG 2048 × 1024, opaco.
- **Adjuntar**: `art-source/fondo noche zoo.png` (la imagen que se amplía).
- **Qué es**: un fondo aprobado que funciona, pero es 3:2: en una pantalla ancha (hasta 2,1:1) pierde cerca del 29 % del alto. Ampliado hacia los costados a 2:1, ninguna pantalla le recorta arriba ni abajo. **No se redibuja**: el centro tiene que quedar igual.

```
Extend the attached image into a wider picture, exactly 2048x1024
pixels, landscape 2:1. Keep the attached picture EXACTLY as it is, in
the centre: same drawing, same colours, same size, nothing redrawn,
nothing moved. Add about 256 px of NEW scenery on the LEFT and the same
on the RIGHT, continuing naturally what is already at those edges
(the stone gate, bushes and trees on the left; the waterfall rocks, bushes and trees on the right). Do not stretch the picture. Do not crop or change the top or
the bottom. Do not add anything new in the centre. Fully opaque: every
pixel painted. No animals, no characters, no people, no text.
```

- **Evitar**: redibujar o "mejorar" el centro; estirar; agregar animales o carteles; una costura visible entre lo viejo y lo nuevo.
- **Checklist**:
  1. ¿Mide exactamente 2048 × 1024 y es totalmente opaco?
  2. Poner `fondo noche zoo.png` encima, corrido 256 px a la derecha: ¿el centro coincide (mismo dibujo, mismos colores)?
  3. ¿Se ve alguna costura entre lo original y lo agregado? Si se ve, se rechaza.
  4. ¿El farol y la cúpula siguen enteros y lejos de los bordes?

### D34 — El recinto de los monos, ampliado a 2:1

- **Archivo**: `art-source/fondo recinto monos v2.png`. PNG 2048 × 1024, opaco.
- **Adjuntar**: `art-source/fondo recinto monos.png` (la imagen que se amplía).
- **Qué es**: un fondo aprobado que funciona, pero es 3:2: en una pantalla ancha (hasta 2,1:1) pierde cerca del 29 % del alto. Ampliado hacia los costados a 2:1, ninguna pantalla le recorta arriba ni abajo. **No se redibuja**: el centro tiene que quedar igual.

```
Extend the attached image into a wider picture, exactly 2048x1024
pixels, landscape 2:1. Keep the attached picture EXACTLY as it is, in
the centre: same drawing, same colours, same size, nothing redrawn,
nothing moved. Add about 256 px of NEW scenery on the LEFT and the same
on the RIGHT, continuing naturally what is already at those edges
(the tree house platform, ropes and big leaves on the left; the wooden poles, ropes and big leaves on the right). Do not stretch the picture. Do not crop or change the top or
the bottom. Do not add anything new in the centre. Fully opaque: every
pixel painted. No animals, no characters, no people, no text.
```

- **Evitar**: redibujar o "mejorar" el centro; estirar; agregar animales o carteles; una costura visible entre lo viejo y lo nuevo.
- **Checklist**:
  1. ¿Mide exactamente 2048 × 1024 y es totalmente opaco?
  2. Poner `fondo recinto monos.png` encima, corrido 256 px a la derecha: ¿el centro coincide (mismo dibujo, mismos colores)?
  3. ¿Se ve alguna costura entre lo original y lo agregado? Si se ve, se rechaza.
  4. ¿Las sogas siguen de un lado al otro sin cortes raros?

---

## 6. Pedidos de prioridad baja: la interfaz (D35–D37)

### D35 — La lupa de la transición (nuevo)

- **Archivo**: `art-source/lupa transicion.png`. PNG 1024 × 1024, fondo transparente, **y el vidrio también transparente**.
- **Adjuntar**: `art-source/lupa v2.png` (D8: es la misma lupa). Si D8 todavía no está, `art-source/pulpo con lupa.png` (la lupa que tiene en la mano).
- **Qué es y qué tiene que reconocer el chico**: entre pantalla y pantalla crece un círculo que muestra la pantalla nueva. Hoy el borde es un aro de CSS con un palito, y la autora dice que "parece más un círculo blanco que crece" (T31). Esta lupa se dibuja encima del círculo y crece con él: el chico tiene que ver **una lupa grande que se acerca**. El vidrio va **vacío**, porque a través de él se ve la pantalla nueva.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1024x1024. One big magnifying glass, the same design as the
attached one, seen flat from the front: a thick round rim, mid grey
#8c8c8c, with a thick #1a1a1a outline on its outer edge and on its
inner edge, and a chunky handle of the same grey pointing DOWN and to
the RIGHT at 45 degrees, ending in a rounded cap. The rim is a clean,
almost perfect circle (the game lines it up with a circle): its centre
sits at 40% of the image width from the left and 40% of the height
from the top, and its outer diameter is 60% of the image width.

THE INSIDE OF THE RIM IS EMPTY: fully transparent, no glass colour, no
shine, nothing at all. Only the rim and the handle are painted.
```

- **Evitar**: vidrio celeste o blanco; un brillo adentro; un aro ovalado; mango hacia otro lado; sombra.
- **Checklist**: el común (§3.3), y además:
  1. Abrirla sobre un fondo oscuro: ¿adentro del aro se ve el fondo (transparente de verdad)?
  2. ¿Un chico de 6 años diría "una lupa"?
  3. ¿El mango apunta abajo a la derecha?
  4. ¿Es la misma lupa que D8?

### D36 — Los botones (nuevo)

- **Archivo**: `art-source/botones lamina.png`. PNG 1536 × 1024, fondo transparente. Lámina: se guarda entera.
- **Adjuntar**: `art-source/bocadillo.png` (el trazo de marcador de la interfaz) y `art-source/lamparita prendida.png` (el amarillo).
- **Qué es y qué tiene que reconocer el chico**: los botones de todas las pantallas. Hoy son glifos chicos en tinta azul pizarra sobre una pastilla, y no parecen del mismo mundo que el dibujo. Cada uno tiene que entenderse **sin texto**; "siguiente" tiene que llamar la atención más que el resto.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1536x1024. EIGHT separate round buttons for a children's
game, in two rows of four, evenly spaced, not touching, all the same
size (each about 300 px wide). Every button has the same design: a
slightly wobbly, hand-drawn circle with a thick #1a1a1a marker outline,
filled with warm paper cream #fdfcf7, with one chunky #1a1a1a symbol in
the middle drawn with the same marker (thick strokes, rounded ends).
No text anywhere.

Top row, left to right:
1. NEXT: a big fat arrow pointing RIGHT. This one button is filled
   sunny yellow #f7c41f instead of cream.
2. TRY AGAIN: a circular arrow going round clockwise, with an arrowhead.
3. WATCH AGAIN: a fat play triangle pointing right.
4. BACK: a fat arrow pointing LEFT.
Bottom row, left to right:
5. CLOSE: a fat X.
6. NOTEBOOK: a small spiral-bound notepad seen from the front.
7. SOUND ON: a loudspeaker with two curved sound waves.
8. SOUND OFF: the same loudspeaker with a small X instead of the waves.
```

- **Evitar**: texto o letras; botones con brillo o relieve 3D; colores distintos en cada uno (solo "siguiente" es amarillo); íconos finos.
- **Checklist**: el común (§3.3), y además:
  1. ¿Cada símbolo se entiende sin texto, para un chico de 6 años?
  2. ¿"Siguiente" es el que más llama la atención?
  3. ¿Los ocho tienen el mismo tamaño y el mismo trazo?
  4. ¿Afuera de los círculos es transparente?

### D37 — El escritorio (rehacer `escritorio.png`)

- **Archivo**: `art-source/escritorio v2.png`. PNG 1024 × 1024, fondo transparente.
- **Adjuntar**: `art-source/escritorio.png` (solo la forma y las proporciones; su contorno azul marino es lo que cambia).
- **Qué es y qué tiene que reconocer el chico**: el escritorio de la oficina del Pulpito, en el inicio. Hoy tiene contorno azul marino y línea de vector.

```
Style: a 2D game asset drawn with a thick felt-tip marker, by hand.
Dark outline #1a1a1a, thick, with rounded ends: a true neutral black,
never navy, never dark blue, never dark green. The line is HUMAN, not
vector: slight wobble along the stroke, small variation in thickness,
curves that do not close perfectly. Flat fills, one flat colour per
shape, that overshoot the outline slightly here and there, like a
child colouring in tidily. Chunky, generous shapes with no fine
detail. Every inner detail is a dark #1a1a1a line, never a shadow.

Do NOT produce: smooth vector or clip-art lines, a logo, gradients,
soft or drop shadows, glow, 3D shading, bevels, texture noise,
photorealism, or a background.

Canvas: TRANSPARENT background (a real alpha channel: not white, not
grey, not a painted checkerboard). Nothing else in the image: no
ground line, no shadow under the subject, no text, no frame.

One image, 1024x1024. One simple wooden desk, a table with a thick top
and four chunky legs, seen from the front, flat, with the same shape
and proportions as the attached desk. Warm wood #b8743a with two or
three dark #1a1a1a wood-grain lines on the top and one on each front
leg.
```

- **Evitar**: contorno azul; perspectiva; cajones u objetos encima.
- **Checklist**: el común (§3.3), y además:
  1. ¿El contorno es negro neutro?
  2. ¿Mismas proporciones que el actual?

---

## 7. Notas para la implementación (no son para ChatGPT)

Para la sesión que meta las imágenes en el juego. Lo de siempre vale igual:
cada fuente nueva lleva su entrada en `AUTHORED_SOURCE_SIZES`, se mide el
alpha fantasma (`docs/17` §3 bis), se copian `w`/`h` del manifiesto a
`detective/assets.ts` y se mira la captura.

1. **Variaciones en secuencia.** Una pista pasa a tener una lista de
   dibujos en vez de uno. La marca `i` del camino usa la variación
   `i mod 3` (1, 2, 3, 1, 2, 3…), así nunca quedan dos iguales al lado. En
   las huellas, el espejado izquierda/derecha sigue alternando encima: con
   3 variaciones y 2 lados el ciclo es de 6 marcas. Cada variación lleva
   sus dos filas en `SINGLES`, como la 1:
   `('pista charco 2.png', 'clue-puddle-2-earned.png', 256, 'contour', True)`
   y la misma con `CLUE_DRAINED` (las huellas, `PRINT` y `keep_ink=False`).
   El riel de pistas y la deducción siguen mostrando la variación 1.
2. **Un color por pista, no por variación.** El token sigue siendo el
   relleno medido de la 1 (`dominant_fill`, T43). Las variaciones se
   pidieron con ese hex; si una mide distinto por más que un redondeo, se
   pide de nuevo. `artManifest.test.ts` hoy exige token = relleno medido:
   decidir si lo exige a cada variación o a la 1 con tolerancia para las
   demás, y escribirlo en el test.
3. **Rehechos `v2` y nombres nuevos.** Cambiar la fuente de la fila que ya
   existe (`SINGLES` o `PASSTHROUGHS`); el archivo viejo queda y no se
   borra (como `docs/22` §5.7). `oveja v2.png` y `piedra v2.png` no
   deberían necesitar `SPECKLED_ALPHA_SOURCES`: medirlas antes de decidir.
   `pista alga.png` reemplaza a `alga.png` en la fila de `clue-seaweed`
   (rama `feat/new-clue-levels`); `pista escamas de pez.png` reemplaza a
   `pista escama.png` en la de `clue-scale`.
4. **Láminas.** Recortar cada pose u objeto a 1024 × 1024 transparente,
   centrado, con los pies a la misma altura dentro de una misma lámina.
   - D4 → `mono v2.png` (pose 1: rescate, mapa, deducción, libreta),
     `mono 2.png` y `mono 3.png` (variaciones para juntar en
     `monkey3`/`monkey4`). Copiar `w`/`h` a `PROMISED_ANIMAL_ART.mono`,
     sacar `mono` de `PLACEHOLDER_ZOO_ANIMALS`; la silueta se rederiva sola
     y el `PawPrintIcon` de la libreta deja de hacer falta para el mono.
   - D5 → `patito 1.png`, `patito 2.png`, `patito 3.png`, para
     `duck-trail3`/`4` en lugar del pato achicado.
   - D6 → `pulpo con lupa v2.png` y `pulpo sin lupa.png`, **con el mismo
     recuadro de recorte** (`docs/20` B18): el juego pone uno en lugar del
     otro y cualquier diferencia se ve como un salto. Después, lo de
     `docs/20` B18 "Al volver" (`carrier-octopus-empty.png`,
     `OCTOPUS_EMPTY_HANDED_ART`).
   - D7 → `pulpo senala.png`, `pulpo piensa.png`, `pulpo festeja.png`. El
     señalar hacia la izquierda es la pose 1 espejada.
   - D9 → `abeja v2.png`, `flor v2.png`, `panal v2.png`. `flor v2.png`
     sigue derivando `sector-flower-dormant` con `FLOWER_DORMANT`. La flor
     nueva es más clara y saturada: volver a correr los tests de contraste
     de la abeja.
   - D36 → `boton siguiente.png`, `boton repetir.png`, `boton ver de
     nuevo.png`, `boton volver.png`, `boton cerrar.png`, `boton
     libreta.png`, `boton sonido.png`, `boton sin sonido.png`.
5. **Fondos.** El procedimiento de `docs/20` §2.4 no cambia: opacidad,
   fila en `PASSTHROUGHS` a (2048, 1024), `quiet`/`brightest` del
   manifiesto a `zoo/backdrops.ts`, `npm test`, capturas a 1024 × 768 y a
   una pantalla ancha. La franja ahora tiene textura: si la ley de 55
   falla, la primera salida es pedirlo de nuevo con la textura más
   apagada; nunca bajar la ley. D29: achicar la fila del erizo a 205–870
   (`docs/20` B5, "Ojo al volver"). D31 va a la fila de
   `sector-aquarium-background`. D32–D34: superponer el original para
   confirmar que el centro no se movió antes de cambiar la fila.
6. **D35, la lupa de la transición.** Reemplaza el aro y el mango de CSS
   de `screen/lupaWipe.ts` por la imagen, escalada con el mismo keyframe.
   El agujero tiene que coincidir con el círculo del `clip-path`: medir en
   el PNG el centro y el radio interior del aro y llevarlos a constantes
   (no estimarlos). Sigue sin `url(#…)`.
7. **D36, los botones.** Reemplazan los glifos de `detective/icons.tsx` y
   `voice/icons.tsx` adentro de los mismos `<button>`: el `aria-label` y
   el piso de 64 px de toque no cambian.
8. **D1, el pelo de gato.** Solo aparece en la deducción de las ovejas
   (T46). No necesita versión apagada salvo que esa pantalla la muestre
   apagada.
9. **D10 antes de C9.** C9 (`docs/22`) adjunta `oveja.png`; si D10 ya está,
   ChatGPT adjunta también `oveja v2.png` (§0, punto 2), y el crema de la
   lana sale igual en los dos.
10. **`erizo enroscado.png` no se pide de nuevo.** La mancha blanca de la
    bola se arregla editando la fuente o pintando el relleno plano en
    `build_art.py`, nunca regenerándola: las espinas se anclan a esa
    silueta (`HEDGEHOG_SILHOUETTE`, `levels/catalog.ts`) y un dibujo nuevo
    la cambia.
11. **Si D3 se descarta**, `f2-agua2` vuelve a burbujas (`docs/21`
    decisión 2, opción b) y `pista escama.png` sale del recorrido.

---

## 8. Qué reemplaza de `docs/20` y `docs/22`

En cada una de esas entradas hay una nota "ver `docs/23`".

| Entrada | Qué pasa | Por qué |
|---|---|---|
| `docs/20` B1–B5, B7 (fondos) | **Reemplazados** por D25–D30 | Pedían la franja de un solo color liso, que es lo que se ve feo (§3.4) |
| `docs/20` B6 (pecera) | **Reemplazado** por D31, con nombre nuevo (`fondo pecera v2.png`) | Mismo motivo, y no pisar `fondo entrada vidrio.png` |
| `docs/20` B10 (el mono) | **Reemplazado** por D4 | Tres poses en vez de una (juntar monos), con el mono del cartel como personaje |
| `docs/20` B15, B18 (el Pulpito) | **Reemplazados** por D7 y D6 | Cara alegre, lupa agarrada y nombres que no pisan `pulpo con lupa.png` |
| `docs/20` B16 (los patitos) | **Reemplazado** por D5 | Prioridad alta y "patitos, no pollitos" |
| `docs/22` C6 (escamas) | **Reemplazado** por D3 | La C6 hecha parece gajos de mandarina |
| `docs/20` B9, B14, B17 | Siguen en `docs/20` | No se ven feos hoy: todavía no existen y su pedido sirve |
| `docs/22` C9, C10 | Siguen en `docs/22` | Acá solo se agregan sus variaciones (D23, D24) |
