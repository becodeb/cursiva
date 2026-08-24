# Especificación del Producto Mínimo Viable (MVP)

## 1. Objetivo del MVP
Validar en aula con alumnos reales si el sistema de detección táctil (dedo sobre pantalla) permite aprender la dirección del trazo continuo y las 3 zonas del renglón sin frustración motriz.

## 2. Alcance Reducido (Familia "La Ola del Mar")
- **Letras incluidas:** `c`, `a`, `o`.
- **Ligaduras incluidas:** `ca`, `co`.
- **Palabra final:** `coca` o `oca`.

## 3. Funcionalidades Esenciales (Must-Have)
- [ ] **Canvas con Renglón 3 Zonas:** Renderizado responsivo con `viewBox` fijo que soporte interacción touch.
- [ ] **Modo 1 - Riel Guiado:** 
  - La letra `a` muestra su animación mnemotécnica ("Sube la ola, vuelve, cierra y saca pie") utilizando el orquestador `MorphingDemoLayer`.
  - El usuario debe seguir los checkpoints 1, 2, 3 sin salirse de la tolerancia.
- [ ] **Modo 2 - Trazo Libre sobre Guía:**
  - El usuario dibuja con su dedo. El trazo se renderiza con tinta fluida.
  - Al soltar el dedo, el sistema calcula si pasó por los checkpoints en orden y muestra feedback auditivo y visual simple (estrellitas / sonido suave).
- [ ] **Persistencia Local Básica:** Almacenamiento en `localStorage` o base de datos local simple del porcentaje de aciertos por letra.
- [ ] **Pantalla Principal Básica:** Visualización del libro con un elemento interactivo que florece al completar la familia de la ola.

## 4. Criterios de Éxito para Validar el MVP
1. El 90% de los niños logra realizar el giro antihorario de la `a` y la `o` sin invertir el sentido tras ver la animación de la ola.
2. La interfaz táctil responde a 60 FPS sin retraso (lag) perceptible en el trazo con el dedo.
3. El cálculo de tolerancia no frustra al niño por pequeñas desviaciones naturales del dedo.
