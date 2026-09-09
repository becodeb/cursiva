# Design — Level engine MVP

Authoritative design lives in the repo docs, rewritten for this change:

- `docs/01_VISION_Y_PEDAGOGIA.md` — the five neurocognitive phases, the three
  measured pillars, the five design principles.
- `docs/02_ARQUITECTURA_Y_MOTOR_TRAZO.md` — one engine, many levels; the three
  scoring pillars including the fluency formula; adaptive tolerance; perf model.
- `docs/03_SISTEMA_PROGRESION_Y_DESAFIOS.md` — mastery model, progressive guide
  withdrawal, adaptive tolerance transitions, session composition.
- `docs/04_ESPECIFICACION_MVP.md` — scope, explicit non-goals, success criteria.
- `docs/08_MOTOR_DE_NIVELES.md` — `LevelConfig`, derived `LevelTarget`, and the
  14-level catalog table.

## Key decisions

1. **Levels are data, not code.** A maze, a garland, a letter and a word are the
   same shape to the engine: target path + corridor width + rules.
2. **Three pillars, never an average.** High accuracy with low fluency is the
   failure mode the app exists to catch; averaging would hide it.
3. **Accuracy tolerance scales with `corridorWidth`.** A phase-1 maze must not be
   graded with letter-grade tolerance.
4. **Additive canvas changes.** `multiStroke: false` stays bit-identical, so the
   existing golden tests keep their meaning.
5. **Nothing ever blocks.** Adaptive widening replaces the fail gate; needing help
   is recorded as data for the teacher, not as a wall for the child.
