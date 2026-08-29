# Proposal: scaffold-mvp-canvas

## Intent

Greenfield repo (docs only). Slice 1 = TECHNICAL VALIDATION: prove the pedagogy loop (trace → feedback → progression) for cursive `a`/`c` on touch, frontend-only, measurable, before classroom polish. Demonstrates every docs/04 must-have as base for later changes.

## Scope

### In Scope
- Vite + React + TS scaffold under `client/` (monorepo, room for `server/` later)
- Trace engine: Pointer Events → normalized `Point[]` in viewBox `0 0 1000 600` via `getScreenCTM().inverse()`; perfect-freehand render; resample to K points
- Canonical `LetterConfig` (unified doc/02 `puntosClave`/`pathBézier` + doc/07 `pathDefinition.d`/`checkpoints`) + registry + seeds `a`, `c`
- Mode 1 guided demo (framer-motion pathLength draw + checkpoint follow); Mode 2 free trace (checkpoint-order + tolerant scoring + Web Audio tone + SVG placeholder feedback)
- `ProgressStore` interface + `LocalProgressStore` (localStorage), per-letter %
- Thin main screen (book, picker, progress, bloom element)

### Out of Scope
- Backend/Postgres/Docker (docs/06); rich audio; thematic art; other letters/ligatures/word; adaptive generator + Mastery machine (docs/03); classroom polish

## Capabilities

> sdd-spec contract. `openspec/specs/` is empty — all NEW.

### New Capabilities
- `letter-model`: canonical `LetterConfig` (explicit doc/02+doc/07 reconciliation), registry, seeds `a`/`c` (`a` = keystone with foot+hook)
- `trace-canvas`: SVG viewBox, 3-zone ruled lines (Y 180/420), capture→Point[], ink, resample
- `trace-validation`: checkpoint order, continuity, avg-distance + TOLERANT margins (wider for touch)
- `guided-trace-mode`: Mode 1 — draw-path demo + checkpoint follow
- `free-trace-mode`: Mode 2 — score on release, tone + star feedback
- `progress-store`: interface, localStorage impl, per-letter %
- `main-screen`: picker, progress, bloom

### Modified Capabilities
None.

## Approach

From 7 compared (explore #923): frontend-only (localStorage satisfies docs/04); raw SVG + Pointer Events capture, perfect-freehand render-only; `Point[]` evaluation (paths can't drive scoring); localStorage behind interface; avg-distance + tolerance (Fréchet deferred); framer-motion draw-path; seeds `a` + `c`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `client/` | New | Vite/React/TS scaffold; `main.tsx`, `App.tsx` |
| `client/src/canvas/` + `modes/` + `letters/` | New | TraceCanvas, useTraceInput, freehand, resample, validation; GuidedDemo, FreeTrace; types, registry, letra_a/c |
| `client/src/progress/` + `screen/` | New | ProgressStore, LocalProgressStore; MainScreen |
| `client/public/assets/themes/` | New | placeholder SVG geometry |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `a` seed from doc/02 points (doc/07 radii exist for `c` only) | High | Derive verbatim; generous radii per TOLERANT ruling |
| K/tolerance numbers unspecified | Med | Fix in spec/design; docs/02 formula, touch widens |
| 60fps needs device check; no runner yet | Med | vitest on pure modules + device checklist |
| Multi-pointer vs slice 1 | Low | Primary pointer only; handle pointercancel |

## Rollback Plan

Additive: delete `client/`, archive the change. No migration — localStorage only.

## Dependencies

- npm: react, vite, typescript, perfect-freehand, framer-motion; vitest (dev).

## Success Criteria

- [ ] Counterclockwise arc exercised: clockwise `a` fails checkpoint order (docs/04 criterion 1, mechanical)
- [ ] ~60fps touch, no perceptible lag (device pass + vitest)
- [ ] Loop demonstrable: demo → trace → feedback → progress updated
- [ ] Per-letter progress persists across reloads
- [ ] Natural finger deviation passes (widened tolerance, criterion 3)