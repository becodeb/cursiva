# Sistema de Progresión Dinámica y Motor de Desafíos

## 1. Filosofía de Nivelación Invisible
El sistema evita colocar exámenes de diagnóstico explícitos o bloqueos rígidos. En su lugar, mide el **Dominio Acumulado (Mastery Score)** de cada letra y enlace de forma continua.

## 2. Modelo de Dominio de Letra / Enlace (0 a 100%)
Cada grafema y ligadura (`aa`, `la`, `cl`, etc.) mantiene un estado en la base de datos:

| Evento de Juego | Impacto en Dominio | Efecto Secundario |
| :--- | :--- | :--- |
| Trazo en Modo Riel correcto | $+15\%$ | Habilita modo guiado libre |
| Trazo Libre con similitud $> 75\%$ | $+25\%$ | Habilita modo ciego |
| Trazo Ciego exitoso sin levantar dedo | $+35\%$ | Letra marcada como "Dominada" ($100\%$) |
| Error de sentido / Giro invertido | $-20\%$ | Dispara animación de rescate con el personaje |
| Corte de trazo donde correspondía enlace | $-10\%$ | Sugiere práctica de calentamiento rítmico |

## 3. Generador de la Sesión Adaptativa (3 a 5 Retos)
Cada vez que el usuario presiona "Jugar Desafío", el backend compone una tanda balanceada:


```
              ┌──────────────────────────────────────────────┐
              │          Botón: "Jugar Desafío"              │
              └──────────────────────┬───────────────────────┘
                                     ▼
               ¿Existe alguna letra con Dominio < 40%?
                            ├── SÍ ──> 1x Calentamiento de Ritmo (Olas / Rulos)
                            │          2x Práctica de Riel / Guiado
                            │
                            └── NO ──> ¿Hay letras intermedias (40-80%)?
                                        ├── SÍ ──> 2x Desafíos Guiados
                                        │          1x Enlace de 2 letras
                                        │
                                        └── NO ──> ¡Alta Maestría detectada!
                                                   3x Palabras completas / Copia
```

## 4. Modos de Interacción por Desafío
1. **Modo Riel Asistido (Fase 1):** El trazo se magnetiza al recorrido ideal para memorizar el sentido.
2. **Modo Guiado con Sombra (Fase 2):** El trazo del niño se dibuja real sobre una silueta punteada; al soltar, compara su trazo con el ideal.
3. **Modo Ciego Autónomo (Fase 3):** Solo se ven los renglones (Cielo, Pasto, Raíz). El alumno dibuja de memoria y luego se superpone la corrección.
4. **Modo Pizarrón Veloz (Fase 4 - Nivel Avanzado):** Una palabra aparece escrita arriba y el usuario debe copiarla de corrido en el renglón inferior manteniendo la fluidez.

## 5. Evolución del Libro de Cuentos
- Al alcanzar múltiplos de dominio en familias completas, se emite un evento de desbloqueo:
  - `EVENT_UNLOCK_GRASS`: Despierta la vegetación y el conejo interactivo.
  - `EVENT_UNLOCK_OCEAN`: Activa el mar animado con olas y peces.
  - `EVENT_UNLOCK_SKY`: Añade aves, molinos y nubes flotantes.
