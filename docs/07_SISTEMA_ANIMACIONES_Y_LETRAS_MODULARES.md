# Sistema Modular de Letras, Animaciones y Metáforas Visuales

## 1. Arquitectura "Data-Driven"
Para evitar escribir código React personalizado por cada letra, el sistema desacopla la **lógica del motor** de la **definición de la letra**. Toda letra o ligadura se define mediante un objeto de configuración que especifica assets, coordenadas Bézier, timeline de animación y checkpoints de validación.

### Librerías Clave Recomendadas
- **Framer Motion (`framer-motion`):** Orquestación declarativa de timelines de animación (`variants`, `staggerChildren`, `AnimatePresence`) y transiciones fluidas de opacidad/escala.
- **Perfect Freehand (`perfect-freehand`):** Generación de trazos de tinta caligráfica vectorial fluida y suavizada en tiempo real a partir de eventos táctiles (`PointerEvents`).
- **SVG Path Properties (`svg-path-properties`):** Para calcular longitudes exactas de paths, interpolar puntos de control y animar `strokeDashoffset` con precisión temporal.

---

## 2. Esquema de Definición de Letra (`LetterConfig`)

Cada letra se almacena en `src/config/letters/[id].ts` siguiendo esta interfaz:

```typescript
export interface AnimationStep {
  id: string;
  type: 'fade_in' | 'slide_in' | 'draw_path' | 'fade_out' | 'custom_css';
  target: 'background_theme' | 'thematic_asset' | 'ink_demonstration' | 'guide_layer';
  duration: number; // en milisegundos
  delay?: number;   // retardo antes de iniciar
  properties?: Record<string, any>; // Ej: { opacity: [0, 0.9], x: [-100, 0] }
}

export interface LetterCheckpoint {
  x: number;          // Coordenada normalizada (0-1000)
  y: number;          // Coordenada normalizada (0-600)
  order: number;      // Secuencia temporal estricta (1..N)
  radius: number;     // Radio de tolerancia en px virtuales
  name?: string;      // Ej: "cresta_ola", "base_pie"
}

export interface LetterConfig {
  id: string;                          // 'letra_c'
  character: string;                   // 'c'
  family: 'ola' | 'rulo' | 'colina' | 'cima' | 'enlazada';
  baselineZone: 'media' | 'alta' | 'baja' | 'mixta';
  
  // 1. Assets Temáticos
  theme: {
    backgroundColor: string;           // Ej: '#F0F9FF' (tinte sutil durante demo)
    watermarkAssetSvg: string;         // SVG del mar/ola/conejo
    soundEffectUrl?: string;           // Efecto de agua/burbuja
  };

  // 2. Trazo Caligráfico Ideal
  pathDefinition: {
    d: string;                         // SVG Path data ("M 400 420 C ...")
    strokeWidth: number;               // Grosor virtual (ej: 14)
    checkpoints: LetterCheckpoint[];   // Puntos obligatorios en orden
  };

  // 3. Orquestador de la Demostración (Morphing Temático)
  animationTimeline: AnimationStep[];
}

```

---

## 3. Ejemplo Concreto: Configuración de la Letra `c` ("La Ola del Mar")

```typescript
export const letraC: LetterConfig = {
  id: 'letra_c',
  character: 'c',
  family: 'ola',
  baselineZone: 'media',
  theme: {
    backgroundColor: 'rgba(224, 242, 254, 0.4)', // Azul celeste muy suave
    watermarkAssetSvg: '/assets/themes/mar_ola_c.svg',
    soundEffectUrl: '/assets/audio/ola_suave.mp3'
  },
  pathDefinition: {
    // Coordenadas en viewBox 0 0 1000 600 (Renglón medio entre Y:180 y Y:420)
    d: 'M 400 420 C 440 340, 480 230, 520 200 C 470 200, 410 260, 410 330 C 410 390, 450 420, 500 420 C 530 420, 560 400, 580 380',
    strokeWidth: 16,
    checkpoints: [
      { order: 1, x: 400, y: 420, radius: 40, name: 'inicio_subida' },
      { order: 2, x: 520, y: 200, radius: 35, name: 'cresta_ola' },
      { order: 3, x: 410, y: 330, radius: 40, name: 'retorno_agua' },
      { order: 4, x: 500, y: 420, radius: 40, name: 'apoyo_tierra' },
      { order: 5, x: 580, y: 380, radius: 45, name: 'salida_gancho' }
    ]
  },
  animationTimeline: [
    {
      id: 'sube_mar_base',
      type: 'slide_in',
      target: 'background_theme',
      duration: 600,
      properties: { y: [100, 0], opacity: [0, 0.8] }
    },
    {
      id: 'ola_lateral',
      type: 'slide_in',
      target: 'thematic_asset',
      delay: 200,
      duration: 800,
      properties: { x: [-120, 0], opacity: [0, 1] }
    },
    {
      id: 'trazo_tinta_c',
      type: 'draw_path',
      target: 'ink_demonstration',
      delay: 1000,
      duration: 1200, // 1.2s para recorrer el ductus
    },
    {
      id: 'desvanecer_a_guia',
      type: 'fade_out',
      target: 'thematic_asset',
      delay: 2400,
      duration: 600,
      properties: { opacity: 0.08 } // Queda como marca de agua casi invisible
    }
  ]
};

```

---

## 4. Registro y Carga Modular de Letras (`LetterRegistry`)

Para sumar nuevas letras en el futuro, solo se crea el archivo `letra_[x].ts` y se registra en un diccionario central:

```typescript
// src/config/letters/index.ts
import { letraC } from './letra_c';
import { letraA } from './letra_a';
import { letraM } from './letra_m';

export const LETTER_REGISTRY: Record<string, LetterConfig> = {
  c: letraC,
  a: letraA,
  m: letraM,
};

export const getLetterConfig = (char: string): LetterConfig => {
  const config = LETTER_REGISTRY[char.toLowerCase()];
  if (!config) throw new Error(`Letra no configurada: ${char}`);
  return config;
};

```

---

## 5. El Componente Orquestador (`MorphingDemoLayer.tsx`)

Un único componente consume cualquier `LetterConfig` y ejecuta la animación de forma determinista antes de ceder el control al canvas de dibujo:

```tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LetterConfig } from './types';

interface Props {
  config: LetterConfig;
  onDemoComplete: () => void;
}

export const MorphingDemoLayer: React.FC<Props> = ({ config, onDemoComplete }) => {
  const [phase, setPhase] = useState<'animating' | 'ready_to_draw'>('animating');

  useEffect(() => {
    // Calcula la duración total sumando delays + duraciones
    const totalDuration = Math.max(
      ...config.animationTimeline.map(step => (step.delay || 0) + step.duration)
    );

    const timer = setTimeout(() => {
      setPhase('ready_to_draw');
      onDemoComplete();
    }, totalDuration + 200);

    return () => clearTimeout(timer);
  }, [config]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 1. Fondo de Tinte Sutil */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: config.theme.backgroundColor }}
        animate={{ opacity: phase === 'animating' ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      />

      {/* 2. Asset Temático (SVG de la Ola / Conejo) */}
      <motion.img
        src={config.theme.watermarkAssetSvg}
        className="absolute inset-0 w-full h-full object-contain"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: phase === 'animating' ? 0.9 : 0.08, scale: 1 }}
        transition={{ duration: 0.6 }}
      />

      {/* 3. Trazo Demostrativo con Path Animation */}
      <svg viewBox="0 0 1000 600" className="absolute inset-0 w-full h-full">
        <motion.path
          d={config.pathDefinition.d}
          fill="none"
          stroke="#0F172A"
          strokeWidth={config.pathDefinition.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 1.2,
            delay: 1.0,
            ease: "easeInOut"
          }}
        />
      </svg>
    </div>
  );
};

```
