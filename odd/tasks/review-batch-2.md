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
- `snake3` top→down (2.2): approved by the author 2026-10-16 ("podés cambiar lo que quieras como lo de las snake"). The suggested stop (2.3) is still open.
- Constraints of `odd/tasks/prewriting-stage-completion.md` apply. Pi limits as in `review-batch-1.md`.

## Mode and checks

TDD off; vitest. Full suite (`--maxWorkers=2`), `npm run build` (exit code alone), `git diff --check`,
browser QA (Chromium under `flock /tmp/cursiva-chromium.lock`) of every changed intro at 1024x768 and
768x1024, captures in `capturas/2026-10-16-tanda-r2/`. Orchestrator looks at them before merging.

## Tasks

| ID | Task | Branch / route | Status | Evidence |
|----|------|----------------|--------|----------|
| M1 | Audit every case (duck, sheep, night, fish, turtles, monkeys, hen if present) against rules 1–3; fix intros (line + bubble icon) and anything else that breaks a rule; add a test that enforces rules 1 and 3 from data | `feat/intro-mystery`, delegated writer (opus, copy) | done | `c591b66` + orchestrator follow-up (monkeys/fish intros shortened so the bubble reads large). Intros duck/monkeys/fish reworded to "Alguien…"; 6 hints and 5 titles stop naming the animal; bubble icons are the first clue (puddle, wool, turtle print, handprint, bubble). `zoo/caseMystery.test.ts` enforces rules 1 and 3 from data (13 failures RED on old data). Main after merge: 3665 passed, build 0, diff-check clean. Orchestrator looked at `_sheets/m1-00.png`, `m1b-00.png` |
| S3 | `snake3` heads up, traced top→down; reveal re-measured | `fix/snake3-top-down`, delegated writer | done | `1bf2bf9`: rotate -90 → 90 on the three vertical pieces (the old comment had the direction backwards), columns re-measured (+3.875), hint "de arriba abajo". Writer: full suite 3638, build 0. Orchestrator looked at `_sheets/s3-00.png`: heads up, colour follows the trace, octopus at the first head. On main after merge: 3664 passed + `detective/artHierarchy.test.ts` timed out at 124 s under load in the full run and passed 10/10 alone; build 0, diff-check clean |
| A1 | `docs/24_PROMPTS_ARTE_RONDA_3.md` (everything pending + lore intro layers + docs/25 art) and `docs/26_INTRO_ANIMADA_DEL_LORE.md` (storyboard and approach for the code-made lore intro the author asked for) | `docs/art-round-4`, delegated writer (opus) | done | `112a433` docs/24 (21 requests, 33 files; D38–D46 point to docs/23; D42 promoted to high as reference for E1/E2/E7; E11/E12 on hold until docs/25 3.2/5.2 approved), `2b23245` docs/26 (9-shot 64 s storyboard + part B; in-game framer-motion scene recommended over a video file). Orchestrator read docs/24 §0–§2 and E1 |
| M2 | Orchestrator review, merge `--no-ff`, checks on `main`, push | inline | done | M1, A1, S3 merged and pushed |

## Progress

- 2026-10-16: author's decision recorded; worktree ready.
- 2026-10-16: author approved flipping snake3 and asked for one ChatGPT doc with everything pending plus a code-made lore intro.

## Open for the author (docs/26)

1. Night escape heard (recommended) or shown as shadows.
2. Include part B, the detective's birth (recommended).
3. Voice: her own recording of 9 short lines (recommended) or the browser voice.
4. Soft music or only synthesized effects.

## Next step

Author pulls and runs docs/24 in ChatGPT; answers docs/26 decisions. Then: animatic of the lore intro from existing art, or line 2 (letters).
