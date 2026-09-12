# Roadmap Evolutivo (Post-MVP)

El orden importa. Nada de esto arranca antes de que las mecánicas del MVP estén validadas en aula.

---

### Módulo A — Temática, narrativa y personajes
**Depende de:** mecánicas validadas.
**Objetivo:** poner motivación encima de una mecánica que ya funciona.

- Metáfora del **libro abierto vivo**: página izquierda un mundo que despierta, página derecha el taller de caligrafía.
- Personaje guía (detective / explorador) que ilumina el camino y reacciona al trazo.
- **Recompensa temática por nivel.** El Nivel 2 (Fase 1 en el código) ya no
  adelanta una recompensa parcial: cierra un caso completo, y ahora cierra
  **dos**, uno detrás del otro. El chico recorre cuatro rastros con la lupa,
  junta las pistas en el panel `PISTAS` y deduce el animal al final de cada
  caso — primero el **pato** (`duck-trail1`..`duck-trail4`, tres opciones:
  pato/vaca/gato), después la **gallina** (`trail1`..`trail4`, cuatro
  opciones: gallina/pato/vaca/gato) — implementado en `detective-mode`
  (el caso de la gallina) y ampliado en `case-registry-and-captions` (el
  caso del pato, delante, y el registro que hace de "caso" un dato en vez de
  una constante repetida).
  - El escalón original repartía la recompensa a lo largo del juego (huellas en
    Fase 1, la pista en Fase 2, el animal en Fase 3, el caso resuelto en Fase
    5). Se cambió a pedido: juntar cuatro pistas y que no pase nada con ellas
    hasta mucho después no le cierra a un chico de cinco años.
  - **Pendiente:** los Niveles 3 a 7 (Fases 2 a 5 en el código) quedan sin
    recompensa temática propia. Cada uno necesita su propio caso, no un tramo
    de los dos del Nivel 2. Definirlo antes de tematizarlos.
- **Regla de oro:** ninguna animación temática ocurre *dentro* del renglón mientras el chico traza. La carga cognitiva del trazado es sagrada.

---

### Módulo B — Abecedario completo y ligaduras
- Las 26 letras cargadas desde SVG, agrupadas por las cinco familias de movimiento.
- Enlaces difíciles: los que salen de la zona alta (`o`, `v`, `w`, `b`) y los que cortan (`s`, `x`).
- Generador automático de circuitos para cualquier palabra arbitraria.

---

### Módulo C — Museo de tinta e historial
- Guardado del primer intento vs. el último de cada letra, en SVG comprimido.
- Pantalla "antes y después" — la evidencia de progreso más potente para un chico de 7 años es su propia letra de hace un mes.
- Galería de palabras trazadas.

---

### Módulo D — Panel docente y modo aula
- **Backend real** (Node + Express + Postgres) y cuentas por curso.
- Mapa de calor por letra: qué está fallando la clase, y en qué pilar (precisión / sentido / fluidez).
- Creador de desafíos: el docente tipea las palabras de la semana y la app arma los circuitos.
- Modo proyector para mostrar el trazo correcto a escala en el pizarrón.

---

### Módulo E — Personalización
- Tinteros y estelas desbloqueables. Sonidos de trazo (lápiz, pincel, tiza).
- Biomas alternativos del libro.

---

### Módulo F — Puente al papel y offline
- Generador de fichas caligráficas en PDF con los mismos renglones y palabras que se practicaron.
- PWA completa para tablets de escuela sin conexión.

---

## Deuda técnica conocida

- `perfect-freehand` figura como dependencia y no se usa: `ink.ts` renderiza una polilínea centerline a propósito (un polígono grueso se autointersecta y deja huecos en trazos que vuelven sobre sí mismos).
- `family` se fija en `'ola'` para toda letra generada desde SVG; hay que derivarla del char.
- `buildWord()` se recomputa en cada render donde se use sin memo.
