# Proposal: Finish MVP Roadmap

## Why
Finish the MVP as ordered local work units after the committed LF/CRLF baseline. The change must preserve player progress, avoid generic-engine rewrites, and close visual, narrative, accessibility, QA, and archive-readiness gaps without push/pull/reset/rebase/discard or PRs.

## What Changes

### Scope
- Migration safety for fresh `glass1` reopen and contaminated stored progress.
- Stars, unlocks, map return, explicit ink, fogged glass, night discovery, PISTAS clarity, and approved narrative closures.
- docs/09 3:2 background families with calm gameplay zones and placeholder protection.
- docs/16 wooden zoo-sign frame around in-level `CaptionedArt`, preserving image+caption semantics.
- Playwright matrix for start, partial, error, success, and map-return at `1280x720`, `844x390`, and `390x844`.
- U15 archive preflight structurally repairs known invalid main specs before archive, without semantic changes.

### Capabilities
- New: `visual-regression-matrix`.
- Modified: `progress-store`, `zoo-map`, `trace-canvas`, `reveal-grid`, `detective-mode`, `prologue-opening`, `art-corridor`.

### Approach
Execute U1→U15 locally. Each unit follows: implement → validate → fresh review → fix confirmed findings → conventional local commit. Keep each unit under 400 changed lines when practical; isolate content blockers so unrelated units continue.

### Out of Scope
Backend persistence, new deduction semantics, broad engine rewrites, destructive cleanup of historical progress, invented unapproved story content, and PR/push/pull/reset/rebase/discard operations.

## Impact

| Area | Impact |
|---|---|
| `client/src/game`, `client/src/progress`, `client/src/zoo` | Migration, progression, stars, unlocks, map return. |
| `client/src/canvas`, `client/src/detective`, `client/src/screen` | Ink, reveal, PISTAS, narrative/accessibility/signage polish. |
| `openspec/specs/{detective-mode,trace-canvas,zoo-map}` | U15 preflight-only structural repair before archive. |
| `scripts/art`, `art-source`, `client/public/art`, `docs/09_GUIA_DE_ESTILO_VISUAL.md` | Art contract, placeholders, final backgrounds. |

### Risks / Rollback / Success
- Risk: oversized combined diff; mitigation: local work-unit commits below budget.
- Risk: visual regressions; mitigation: real Playwright captures and separated art/QA review.
- Rollback: revert affected local commit; migrations never delete localStorage.
- Success: roadmap states validate, progress is preserved, approved closures/signage render, and archive preflight removes structural blockers.
