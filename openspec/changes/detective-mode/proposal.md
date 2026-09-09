# Proposal: Detective Mode (Phase 1 Retheme)

## Intent

Phase 1 ships six unthemed corridor levels running one mechanic; theming was deferred to `docs/05` Módulo A, which already reserves a detective guide, per-phase clue rewards and an animal reveal. The mechanics are now validated (654 tests green), so Módulo A comes forward for phase 1 only: four themed trails where a magnifying glass collects one clue each, then a deduction screen where the child names the animal.

## Scope

### In Scope

- Four trail levels replacing the six corridor configs: sine/droplets, counter-clockwise coil/corn, triangular wave/footprints, square wave/feathers.
- `f1-libre` rethemed and explicitly clue-free.
- Two path generators (triangular, square) with a corner constraint tied to `corridorWidth`.
- Pure clue-collection reducer; clue layer on the canvas via the `hazards` prop precedent.
- `PISTAS` rail as hand-drawn SVG capitals, in `LevelPlay` chrome outside the 1000×600 viewBox.
- Deduction view added to `GameView` / `nextView`.
- Typed asset registry (placeholder art) and the repo's first colour tokens: one earned colour per trail, the rest ink-on-paper.
- One-time copy-forward progress migration, removed id → replacement trail.

### Out of Scope

- Real art, audio, any copy beyond `PISTAS`, a font layer, new dependencies.
- Phases 2–5; the `perfect-freehand` spec drift recorded in `explore.md` §4.

## Open Questions Resolved

| # | Decision | Reason |
|---|---|---|
| 1 | Four trails stay. Motor volume is restored by config, not level count: carry `taper` and one themed hazard onto trails, place 4–6 clues per trail as intra-trail sub-goals, and require total trail arc length ≥ the six removed. No second lap. | Unlock already demands two approvals (`docs/08` §4) and `resetOnContact` repeats runs; a forced lap doubles distance without a new demand. |
| 2 | Rail visible during play, rendered in the DOM beside the canvas, not inside the viewBox. | The engine centres every path at x=500 (`docs/08` §2); reserving right-edge room would shrink trails that `docs/08` §5 requires to fill the sheet. |
| 3 | Its own view. | It has no path, no ink and none of the three pillars; a catalog entry would derive an empty target, fake stars, and meaningless corridor widening. |
| 4 | Clue-free. | `kind: 'free'` has no arc length to place a mark on and no pass event to trigger recovery, and four clues must map to four trails. |

**Overturned** (`explore.md` §5.3): trail 2 is a counter-clockwise coil reusing the shipped `spiral()`, not a sawtooth. The `a`-family turn is the only phase-1 demand `docs/08` §5 names as preparation for phase 3, and no wave shape supplies it; sharp corners are already covered twice by trails 3–4. A hen pecking corn in a circle fits the brief's open shape.

## Capabilities

### New Capabilities

- `detective-mode`: the four-trail campaign, clue collection and its state machine, the `PISTAS` rail, the deduction screen, and the asset registry.

### Modified Capabilities

- `guided-trace-mode`: phase-1 level set replaced; two new generators and the square/triangular corner constraint.
- `trace-canvas`: clue layer prop and the earned-colour state change.
- `main-screen`: deduction view in the view reducer; rail chrome beside the canvas.
- `progress-store`: unknown level ids tolerated, never pruned; one-time copy-forward id migration.
- `free-trace-mode`: `f1-libre` is rethemed and carries no clue.

## Approach

- Clue state lives in an exported pure reducer, tested with no DOM (`renderToString`-only test setup, `explore.md` §4).
- Clue pickup is a discrete state change on pass, not ambient motion; the single orchestrated moment (lamp on, clue files into the rail) fires after the trail is finished. This honours `docs/05` Módulo A's rule that no thematic animation runs while the child traces.
- No `url(#…)` references for glow, gradients or masks: they hydrated blank on real devices (`TraceCanvas.tsx:70-84`).
- Removal of the six configs is the last work unit, isolated so it reverts alone.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `client/src/levels/catalog.ts:187-356` | Removed/New | ≈170 lines of six configs out; four trail configs plus `LEGACY_PHASE_1` in. |
| `client/src/levels/paths.ts` | New | Triangular and square generators (`M`/`L` only, ≥3 points). |
| `client/src/canvas/TraceCanvas.tsx` | Modified | Clue layer `<g>` and colour tokens. |
| `client/src/game/LevelPlay.tsx` | Modified | Clue reducer wiring; rail chrome. |
| `client/src/screen/GameScreen.tsx` | Modified | Deduction view in `nextView`. |
| `client/src/game/LevelProgressStore.ts` | Modified | One-time id migration. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Orphaned progress under `cursiva.levels.v1` | High | Store keys by arbitrary string, coerces per field, never prunes and never throws (`LevelProgressStore.ts:75-77`, `:93`, `:123-129`); records survive untouched. Migration copies forward only. |
| Positional unlock breaks re-entry | Med | `f1-libre` remains index 0, so returning children keep their entry; the migration seeds trails 2–4 for mid-campaign children. |
| Square-wave corners merge into elbows | Med | Generator relates run length to `corridorWidth`, asserted in a test (same failure documented for `spiral` at `paths.ts:361`). |
| Motor coverage regression vs. the six removed | Med | Arc-length floor plus retained `taper`/hazard config; verified in test, not by eye. |
| Módulo A reserves the animal reveal for phase 3 | Low | Phase 1 closes its own case; the phase-3 reward needs re-planning (flagged, not resolved here). |
| Over review budget (800 lines) | High | `auto-chain` slices by work unit; catalog removal is the final slice. |

## Rollback Plan

1. The six configs stay in `catalog.ts` as an exported `LEGACY_PHASE_1`, unwired for one release: rollback is a one-line swap back, no revert needed.
2. Progress is never destroyed. Removed ids remain in `cursiva.levels.v1` as orphan records the store ignores without throwing, so a rollback restores each child's exact prior state.
3. The migration is copy-forward only (max of the replaced record into the new trail id) and writes no deletions; the old keys stay readable.
4. Full rollback path: swap `LEGACY_PHASE_1` back in and revert the isolated removal commit. The detective ids then sit unreferenced, mirroring the same orphan behaviour.
5. If the store's unknown-id tolerance is ever narrowed, treat that as a rollback blocker and re-verify before removing any id.

## Dependencies

- None. No new packages; the mode is library-free apart from the `framer-motion` already present.

## Success Criteria

- [ ] Four trails plus the deduction screen are reachable from the map; all four clues file into `PISTAS`.
- [ ] Total trail arc length ≥ the six removed levels, asserted in a test.
- [ ] Square and triangular corner constraints asserted against `corridorWidth`.
- [ ] Clue reducer unit-tested with no DOM; clue layer and rail asserted via `renderToString`.
- [ ] An existing `cursiva.levels.v1` payload from mid-phase-1 loads with no loss and no locked dead end.
- [ ] `npm test` and `npm run build` green; no new `url(#…)` reference introduced.

---

## Orchestrator Decision Block (binding)

Recorded after the proposal was written. Where this block and any earlier
section disagree, this block wins. `sdd-spec` and `sdd-design` must both treat
these as settled and must not reopen them.

### D1 — Phase 1 closes its own case (user decision)

The user was shown the conflict between today's brief and `docs/05:13`
("la Fase 1 revela huellas, la Fase 2 la pista, la Fase 3 el animal, la Fase 5
el caso resuelto") and chose **today's brief**. Phase 1 collects all four
clues and runs the deduction screen. The hen is identified in phase 1.

Consequences that are IN scope for this change:
- Update `docs/05_ROADMAP_EVOLUTIVO_POR_ETAPAS.md` Módulo A so the per-phase
  reward ladder no longer contradicts shipped behaviour. Keep it in Spanish;
  this is the only `docs/` edit this change may make.
- Phases 2 through 5 are left with no thematic reward. Record that as a
  follow-up, not as a gap in this change.

### D2 — Trail 2 is the counter-clockwise coil (proposal's call, accepted)

The proposal overturned the orchestrator's sawtooth suggestion and it was
right. `catalog.ts:319` carries the comment "Counter-clockwise on purpose: the
same turn the `a` family needs later", and no wave generator supplies that
turn. Trails 3 and 4 already contribute sharp corners twice over, so a
sawtooth adds a shape without adding a motor skill. Reuse the shipped
`spiral()`. Also carry forward the width constraint already documented at
`catalog.ts:329`: 70 against the generator's 120 radial gap; wider merges the
arms into a filled disc.

### D3 — Returning progress is seeded, never reset

`isUnlocked` is positional (`LevelProgressStore.ts:123-129`:
`LEVELS.findIndex`, then `LEVELS[index - 1]`), so removing six levels shifts
every position and would lock trails 2 through 4 for any child already past
`f1-travesia`. The one-time copy-forward migration is REQUIRED, not optional.
No child may be demoted by this change.

### D4 — A wrong animal costs nothing

The child may choose again immediately. The ruled-out animal is dismissed
visually, with no scolding, no score, no penalty, and no lockout. `docs/01`
principle 2 forbids reproach; it does not forbid consequence. The discriminating
clue for the dismissed animal MAY be emphasised, and that is the extent of the
feedback.

### D5 — Clue lighting is a state change, not an animation

`docs/05:14` states the golden rule: "ninguna animación temática ocurre
*dentro* del renglón mientras el chico traza. La carga cognitiva del trazado es
sagrada." Phase 1 is `surface: 'blank'` and has no renglón, but the rule's
intent binds anyway. A clue therefore flips grey-to-colour discretely as the
glass passes; no motion, no easing, no ambient effect while the finger is down.
The lamp switch-on is the single orchestrated motion moment and it fires only
after the trail is finished.

### D6 — Typography stays out (user decision)

The app currently renders in the user-agent default serif; there is no font
layer anywhere in the repo. The user was shown this and chose to defer it. This
change adds NO font subsystem. `PISTAS` is drawn as SVG. The rest of the app's
typography is recorded as separate debt.

### Accepted deviations

- The proposal runs ~1,137 words against the skill's 450-word cap. Accepted:
  `openspec/config.yaml` mandates a rollback plan, and four open questions each
  needed a reason. Truncating the rollback plan would have been the wrong trade.
- `design-taste-frontend/SKILL.md` was read only through line 508 of 1,207. Not
  load-bearing: that file self-scopes away from multi-step product UI.
