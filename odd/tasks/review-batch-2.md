# Review batch 2 — keep the animal a mystery until the deduction

Feature document (ODD). Engram mirror: topic `odd/review-batch-2/tasks`, project `cursiva`.
Source: `docs/25_REVISION_PSICOPEDAGOGICA.md` §5.2 P2-2 and §7 item 2.1.

## Author's decision (2026-10-16)

> "mejor si queda en misterio así hay que descubrirlo, pero puede aparecer en las primeras vistas donde
> se limpian los cristales y esas cosas, que sería como los primeros lores que se muestran, así que no
> pasa nada; lo único, que no haya que recolectar el animal que estamos intentando descubrir si no lo
> descubrimos todavía; si no, no hay problema."

Rules derived from it:

1. From a case's intro until its deduction, nothing names the case's animal or shows its art: intro
   line, intro bubble icon, level hints, HUD/collect items.
2. The prologue and the cleaning levels (glass, sand, leaves, path) and their closings may show any
   animal: they are the world's opening lore.
3. No level before a case's deduction collects that case's animal. Collecting it after the deduction
   (the "rescue" levels) is fine.

## Scope and constraints

- Copy changes are limited to what rule 1 forces; new lines keep the existing Rioplatense child voice
  and name the clue or "alguien" instead of the animal. Every changed line is listed for the author.
- No new art: the clue art already exists (`docs/22`, `docs/23` round 2).
- Out of scope here: `snake3` direction (2.2) and the suggested stop (2.3) — still waiting for the author.
- Constraints of `odd/tasks/prewriting-stage-completion.md` apply. Pi limits as in `review-batch-1.md`.

## Mode and checks

TDD off; vitest. Full suite (`--maxWorkers=2`), `npm run build` (exit code alone), `git diff --check`,
browser QA (Chromium under `flock /tmp/cursiva-chromium.lock`) of every changed intro at 1024x768 and
768x1024, captures in `capturas/2026-10-16-tanda-r2/`. Orchestrator looks at them before merging.

## Tasks

| ID | Task | Branch / route | Status | Evidence |
|----|------|----------------|--------|----------|
| M1 | Audit every case (duck, sheep, night, fish, turtles, monkeys, hen if present) against rules 1–3; fix intros (line + bubble icon) and anything else that breaks a rule; add a test that enforces rules 1 and 3 from data | `feat/intro-mystery`, delegated writer (opus, copy) | pending | |
| M2 | Orchestrator review, merge `--no-ff`, checks on `main`, push | inline | pending | |

## Progress

- 2026-10-16: author's decision recorded; worktree ready.

## Next step

M1.
