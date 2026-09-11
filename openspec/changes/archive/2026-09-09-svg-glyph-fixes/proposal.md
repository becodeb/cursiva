# Proposal: SVG Glyph Rendering Fixes

## Intent

Authoring all 26 lowercase SVGs exposed four defects that make letters unusable for learners: `i`/`j` render as garbage (silent `NaN`), mid/top-exit seams (`b e o v w`) look wrong, demo strokes show sharp miter cusps, and solo letters draw a visible straight line across pen lifts (`x t i j f`). Fix the pipeline and render layer so every authored letter displays faithfully.

## Scope

### In Scope

1. **Arc support (P1)**: elliptical-arc `A/a` → cubic Bézier conversion in `flattenPathD`; unsupported commands throw a descriptive error instead of producing `NaN`.
2. **Hybrid seam (P2)**: keep rigid translation for baseline-exit seams; for mid/top exits (`b e o v w`) keep the next letter anchored at/near baseline and let the Bézier connector absorb more vertical travel.
3. **Pen-lift segmentation (P4)**: extract `combinations.ts`'s main/tail split into a shared helper; apply it to solo `pathDefinition` and `animationTimeline` so guide and demo renders lift the pen.
4. **Round joins (P3)**: `strokeLinejoin="round"` on the animated demo path and the guide path in `TraceCanvas.tsx`.

### Out of Scope

- Per-letter "starts-at-mid" entry variants.
- Redrawing user SVGs (including the `i`/`j` dots).
- Auditing letters `g`–`z` beyond what these fixes require.
- Checkpoint generation, renumbering, or validation logic.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `letter-model`: arc-command ingestion + fail-loud parsing; solo `pathDefinition`/`animationTimeline` must express pen lifts.
- `letter-combinations`: Seam Continuity gains exit-kind-dependent placement.
- `trace-canvas`: demo and guide paths must round line joins.

## Approach

Fix at the lowest correct layer: parser (P1), placement formula (P2), config builder via shared helper (P4), render attributes (P3). Reuse the already-correct `buildWord` segmentation rather than duplicating it.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `client/src/letters/svgLetter.ts` | Modified | Arc→Bézier, fail-loud, segmentation helper |
| `client/src/letters/combinations.ts` | Modified | Hybrid seam; consume shared helper |
| `client/src/canvas/TraceCanvas.tsx` | Modified | `strokeLinejoin` on demo + guide |
| `client/src/modes/{guidedTrace,freeTrace}.tsx` | Modified | Consume segmented guide/demo |
| `client/src/letters/*.test.ts` | Modified | Arc fixtures, gap assertions, new goldens |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hybrid seam moves goldens in `combinations.test.ts` / `wordBuilding.test.ts` | High | Deliberate; regenerate with visual QA per exit kind |
| `letter-model` states `d` stays a single-`M` polyline — P4 may conflict | High | Design decides: derived segments vs. relaxing the rule |
| Arc→Bézier conversion is scope-creep prone | Medium | Cover only what Inkscape emits; unit-test against `i`/`j` |
| Fail-loud parsing may break untested `g`–`z` at load | Medium | Run the full registry once; treat failures as findings |

## Rollback Plan

Single PR, four independent commits (P1/P2/P3/P4). Revert any commit alone; P2's revert also restores prior goldens.

## Success Criteria

- [ ] `i` and `j` render with a visible dot; no `NaN` in any config.
- [ ] Unsupported path commands throw a named error.
- [ ] No line drawn across pen lifts in solo guide or demo (`x t i j f`).
- [ ] No miter cusps on demo/guide strokes.
- [ ] `b e o v w` seams visually acceptable; goldens updated intentionally.
- [ ] `npm run build` and `npm test` green.

## Proposal question round

Non-interactive mode (`execution_mode=auto`); the two product forks were pre-decided by the user. Residual items for design, not blocking: (1) does the hybrid seam need a tunable vertical-absorption factor or a fixed rule; (2) should `f`'s pen lift be treated as immediate or deferred.
