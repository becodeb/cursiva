# Arquitectura Técnica y Motor de Validación de Trazo

## 1. Stack Tecnológico Sugerido
- **Frontend:** React + Vite / TypeScript.
- **Backend:** Node.js con Express + TypeScript.
- **Base de Datos:** PostgreSQL o SQLite para persistencia relacional.
- **Contenedores:** Docker & Docker Compose para orquestación local y producción.

## 2. Normalización de Coordenadas y Responsive
Para garantizar la consistencia en smartphones, tablets de 10" y laptops táctiles:
- El lienzo de trazado no usa píxeles fijos de pantalla.
- Utiliza un sistema de coordenadas normalizado en un espacio virtual fijo (`viewBox="0 0 1000 600"`).
- Se utiliza la API estandarizada de **Pointer Events** (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) para procesar simultáneamente dedos, mouse o stylus con captura de presión (`e.pressure`) si está disponible.


```
   0 ────────────── 500 ────────────── 1000 (X)
 0 ┌──────────────────────────────────────┐  <- Techo (Cielo)
   │           Zona Alta (Cielo)          │
180 ├┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┤  <- Línea Guía Media Superior
   │           Zona Media (Pasto)         │
420 ├──────────────────────────────────────┤  <- Línea Base (Tierra)
   │           Zona Baja (Raíces)         │
600 └──────────────────────────────────────┘  <- Piso (Subsuelo)
(Y)
```

## 3. Estructura de Datos de una Letra de Referencia
Cada letra o ligadura se define como una secuencia ordenada de curvas paramétricas (Bézier cúbicas) y puntos de control temporales:

```json
{
  "id": "letra_a_minuscula",
  "familia": "ola",
  "puntosClave": [
    { "x": 350, "y": 420, "orden": 1, "tipo": "inicio_enganche" },
    { "x": 480, "y": 200, "orden": 2, "tipo": "cresta_ola" },
    { "x": 330, "y": 300, "orden": 3, "tipo": "retorno_curva" },
    { "x": 480, "y": 200, "orden": 4, "tipo": "cierre_ovalo" },
    { "x": 480, "y": 420, "orden": 5, "tipo": "bajada_pie" },
    { "x": 550, "y": 400, "orden": 6, "tipo": "gancho_salida" }
  ],
  "pathBézier": "M 350 420 C 400 300, 440 210, 480 200 C 420 200, 330 250, 330 330 C 330 400, 420 420, 480 420 L 480 420 C 480 420, 520 420, 550 400",
  "zonasValidas": ["media"]
}
```

## 4. Algoritmo de Evaluación de Trazo (3 Pilares)

1. **Validación de Dirección y Secuencia Temporal:**
* A medida que el usuario traza, el sistema registra una lista de puntos `[{x, y, timestamp}]`.
* Se valida que los checkpoints de la letra ideal se activen estrictamente en el orden `1 -> 2 -> ... -> N`.
* Si se detecta un giro inverso (ej. recorrer el bucle en sentido horario cuando debe ser antihorario), se emite un aviso visual de rescate.


2. **Detección de Continuidad (Flag de Levantamiento):**
* Para letras simples o ligaduras directas, se registra la cantidad de eventos `pointerup`.
* Si la palabra requiere un solo trazo continuo y el usuario levanta el dedo antes de llegar al gancho final, se contabiliza como corte de trazo (`isContinuous = false`).


3. **Cálculo de Similitud Geométrica (Distance Matching):**
* Se muestrean $K$ puntos equidistantes del trazo del usuario frente a la curva de referencia ideal mediante el algoritmo de Distancia de Fréchet Discreta o Distancia Euclidiana Promedio normalizada:


$$\text{ScorePrecisión} = \max\left(0, 100 - \frac{\sum_{i=1}^{K} \text{dist}(P_{\text{usuario}}[i], P_{\text{ideal}}[i])}{K \cdot \text{Tolerancia}}\right)$$


* La `Tolerancia` se amplía automáticamente si se detecta un puntero de tipo `touch` (dedo) frente a un puntero fino (`pen`).
