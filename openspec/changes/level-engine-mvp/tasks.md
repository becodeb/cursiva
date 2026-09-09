# Tasks — Level engine MVP

## Docs
- [x] Rewrite `docs/01_VISION_Y_PEDAGOGIA.md` around the five phases
- [x] Rewrite `docs/02_ARQUITECTURA_Y_MOTOR_TRAZO.md` with the single engine and three pillars
- [x] Rewrite `docs/03_SISTEMA_PROGRESION_Y_DESAFIOS.md`
- [x] Rewrite `docs/04_ESPECIFICACION_MVP.md` for the mechanics-only MVP
- [x] Rewrite `docs/05_ROADMAP_EVOLUTIVO_POR_ETAPAS.md` (theme moved to post-MVP)
- [x] Add `docs/08_MOTOR_DE_NIVELES.md` with the level model and catalog

## Engine (pure)
- [x] `src/levels/types.ts`, `src/game/types.ts` — contracts
- [x] `src/levels/paths.ts` — parametric path generators for phases 1-2
- [x] `src/levels/buildLevel.ts` — `LevelConfig` → `LevelTarget`
- [x] `src/levels/catalog.ts` — the 14 levels
- [x] `src/canvas/validation/fluency.ts` — the fluency pillar
- [x] `src/game/evaluateLevel.ts` — three-pillar evaluation
- [x] `src/game/adaptiveTolerance.ts` — streak transitions and coaching copy
- [x] `src/game/LevelProgressStore.ts` — per-level persistence and unlocking

## UI
- [x] `useTraceInput` — point timestamps and multi-stroke capture (additive)
- [x] `TraceCanvas` — corridor, completed strokes, start marker, off-path dimming (additive)
- [x] `src/screen/LevelPlay.tsx`
- [x] `src/screen/LevelMap.tsx`
- [x] `src/screen/GameScreen.tsx`, `src/App.tsx`

## Delivery
- [x] `Dockerfile`, `docker/nginx.conf`, `docker-compose.yml`, `.dockerignore`
- [x] Rewrite `docs/06_GUIA_DESPLIEGUE_DOCKER.md`
- [x] Full `vitest` and `tsc --noEmit` green
- [x] Visual verification of every phase via headless screenshots

## Post-review fixes (verified in headless screenshots)
- [x] Spiral corridor was wider than the radial gap between turns — it rendered as a solid disc with no walls
- [x] Direction arrowhead was near-equilateral so no vertex read as the tip; replaced with a notched dart
- [x] Phase 3-5 corridors were wider than a middle-zone glyph is tall, erasing the letter shape; narrowed and the crisp guide now renders over the corridor
- [x] Accuracy tolerance scale clamped to [0.7, 2.5] so a narrow corridor never grades a fingertip like a stylus
- [x] Composed words were laid out left-to-right without re-centring
- [x] Variable viewBox width (height stays 600) so a long word gets more paper instead of running off the sheet

## Second review round — mechanics missing from the original plan
- [x] Phases 1-2 were drawn on the ruled pauta, which is meaningless there and is pure visual noise (docs/01 principle 1)
- [x] Every phase-1 route hugged the writing band, training only the fingertip; phase 1 now uses the whole 1000x600 sheet at varied scale and orientation
- [x] Free scribble warm-up (`f1-libre`) scored on sheet coverage, not accuracy
- [x] Corridors rendered as walls knocked out of a solid field — a real maze, not a hint
- [x] Corridor taper along the route ("el sendero se estrecha")
- [x] Sustained tone while inside the corridor, silence when outside (the "linterna")
- [x] Haptic pulse on the transition out of the corridor
- [x] Rhythm metronome in phase 2, audible tick plus a visual pulse for muted tablets
- [x] Magnetized rail on first contact — warps the DRAWN ink only, never the scored points
- [x] Progressive guide withdrawal by mastery: docs/03 section 3 specified four bands, the code had one static boolean
- [x] Goal marker: levels showed where to start and never where to finish
- [x] Standing hint derived from level kind and withdrawal band — it promised a green dot that was not on screen
