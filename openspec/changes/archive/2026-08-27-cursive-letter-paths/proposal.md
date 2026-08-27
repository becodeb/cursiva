# Proposal: Cursive Letter Paths

## Intent

- Complete the lowercase cursive set: **26 hand-drawn single-stroke SVGs** (`a–z`) whose paths are pen-trajectory ductus, not glyph outlines.
- Upgrade the pipeline for **multi-subpath letters** (i/j/t/f/x): automatic main/secondary classification; main = subpath starting near the entry anchor (baseline-left, bottom-left of fitted bbox), tie-break longest subpath, then file order; secondary strokes (dots, crosses, x's second diagonal) drawn AFTER the main path ("finish the word").
- **Remove Kalam from the spec**: `ideal` derives from the stroke centerline + perpendicular band (as `buildLetterConfig` already does), checkpoints follow the ductus, entry/exit anchors become per-letter metadata. No OpenType, no font extraction.
- `t` becomes an ascender (`alta`, top line, Zaner-Bloser style).

## Scope

### In Scope
- 25 new lowercase SVGs (`a.svg` exists) authored by the USER per the guide below (stroke-only, one `<path>` element).
- Pipeline: multi-subpath classification; anchor-aware end-corner diagnostic (no false fires for `o r v w e`); `LETTER_ZONES` `t` media→alta.
- `letter-model` delta spec revision (Kalam removed, anchors + ductus model).
- README authoring-guide rewrite + zone map update; tests (classification, zones, anchors).

### Out of Scope
- Uppercase letters and digits (deferred to a later change).
- OpenType/fonts, `calt`/`liga`-style variants, word-mode connectors.

## Capabilities

> Contract for sdd-spec. Research done on `openspec/specs/`.

### New Capabilities
None

### Modified Capabilities
- `letter-model`: "Path–Checkpoint Consistency" Kalam-extraction requirement REMOVED, replaced by hand-drawn single-stroke ductus (`ideal` from centerline + band); `LetterConfig` gains entry/exit anchor metadata (entry universal baseline-left; exit baseline-right default, top-right for `o r v w`, mid-right for `e`); multi-subpath main/secondary classification rule; `t` zone `media`→`alta`.

## Approach

Exploration Approach 1 (recommended): hand-drawn single-stroke SVGs + per-letter anchor metadata; no OpenType — only the `curs` anchor concept as data. Pipeline classifies subpaths at load, diagnostics become anchor-aware. User authors first; ductus validated on the first real SVGs in verify.

## User-Facing Authoring Guide (content for README rewrite)

**Rules**: ALL strokes MUST be combined into ONE `<path>` element (multiple `M` subcommands) — `extractPathD` reads only the first `<path>`. Inkscape: Ctrl+K; Figma: flatten/combine. ALL letters start at the baseline-left entry anchor (Y≈420).

| Letter | Zone | Exit |
|--------|------|------|
| a | media | baseline-right |
| b | alta | baseline-right |
| c | media | baseline-right |
| d | alta | baseline-right |
| e | media | mid-right |
| f | alta | baseline-right* |
| g | baja | baseline-right |
| h | alta | baseline-right |
| i | media | baseline-right (dot separate) |
| j | mixta | baseline-right (dot separate) |
| k | alta | baseline-right |
| l | alta | baseline-right |
| m | media | baseline-right |
| n | media | baseline-right |
| o | media | top-right |
| p | baja | baseline-right |
| q | baja | baseline-right |
| r | media | top-right |
| s | media | baseline-right |
| t | alta | baseline-right (cross separate) |
| u | media | baseline-right |
| v | media | top-right |
| w | media | top-right |
| x | media | baseline-right (second diagonal separate) |
| y | baja | baseline-right |
| z | media | baseline-right |

*`f` exit verified against the Zaner-Bloser reference during authoring. `x`: first diagonal = the one starting at the entry anchor; second = the other. Secondary subpaths (i/j dot, t/f cross, x second diagonal) are pen-lift strokes drawn after the main path.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `client/src/letters/svg/*.svg` | New | 25 user-authored letters |
| `client/src/letters/svg/README.md` | Modified | guide + zone map (t→alta) + anchor table above |
| `client/src/letters/svgLetter.ts` | Modified | classification, anchor-aware diagnostic, LETTER_ZONES |
| `client/src/letters/types.ts` | Modified | anchor metadata fields (design decides placement) |
| `client/src/letters/svgLetter.test.ts` | Modified | t-zone union test (line 127), classification tests |
| `openspec/specs/letter-model/spec.md` | Modified | delta revision |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| End-corner warning fires falsely for o/r/v/w/e | High | anchor-aware diagnostic + README fix |
| Classification reorders checkpoints vs current file-order concatenation (`reorderForWriting`) | Med | main-first rule keyed on entry anchor; validate on real SVGs in verify |
| t media→alta breaks `svgLetter.test.ts:127` + README/tests asserting media | High | update zone map, tests together; keep migration note |
| bbox fit misaligns out-of-zone exit flourishes | Med | constrain drawing to zones; anchor-based normalization considered in design |
| Group transforms silently dropped | Low | document "only the `d` matters" (`a.svg` already has one) |
| Kalam requirements linger in spec | Med | delta removes them; archive warns before merging destructive deltas |

## Rollback Plan

- Revert pipeline/types/tests: `git revert` (self-contained change).
- Remove the 26 SVGs → eager glob loads `{}`, Kalam seeds remain source of truth.
- Leave the `letter-model` delta unmerged if authoring fails.

## Dependencies

- User-authored SVGs (26) following the guide.
- Inkscape Ctrl+K / Figma flatten for multi-subpath combine.

## Success Criteria

- [ ] All 26 letters load via the glob; each shows demo + checkpoints in-app.
- [ ] Classification puts the entry-anchor subpath first; secondaries draw after (i/j/t/f/x; x ductus verified against the first real SVG).
- [ ] No false end-corner warnings for o/r/v/w/e; warnings still fire for genuinely wrong ends.
- [ ] `t` resolves `alta`; zone map and tests updated, `npm run build` + tests green.
- [ ] `letter-model` delta removes Kalam, adds anchors + ductus model.