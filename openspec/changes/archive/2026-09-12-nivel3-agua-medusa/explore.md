# Explore: nivel3-agua-medusa

Step 2 of five in the `docs/11_PULPITO_DETECTIVE_DIRECTIVA` rollout. Investigation only;
no source file was edited. Every file:line below was verified against the working tree.

The directive's NIVEL 3: one of the trails leads to the water. The Pulpito sees a jellyfish
that moves or tries to escape and must follow its path. Four challenges — wide slow U's;
successive U's with smaller amplitude or greater proximity; varying size and distance
between the U's; then "frenar y continuar", where something from the water (a starfish)
crosses or momentarily occupies the path and the child must stop, wait, and go on.

## 1. Scope — and it was already decided, by step 1

`docs/04_ESPECIFICACION_MVP.md:40-41`, shipped by `case-registry-and-captions`, already
commits the split:

- **Nivel 3** — Fase 2 in code, 1 of 4: `f2-guirnalda`.
- **Nivel 4** — Fase 2 in code, 3 of 4: `f2-colinas` · `f2-bucles` (flagged as a transition:
  it is already a letter, the cursive `l`, neither a U nor a mountain) · `f2-crestas`.

So `crests` is NOT Nivel 3 content despite being an arch wave; step 1 assigned it to Nivel 4.
Nivel 3 is therefore **`f2-guirnalda` rethemed as desafío 1, plus three new levels** for
desafíos 2-4, inserted after `f2-guirnalda` and before `f2-colinas`. `f2-bucles` is not
touched — it is already parked under Nivel 4, and moving it here would be spending a later
level's content early, the same mistake step 1's D1 ruling forbids, aimed the other way.

## 2. Positional unlock and migration

`LEVELS` is `[...PHASE_1, ...PHASE_2, ...]` (`catalog.ts:873-878`) and
`LevelProgressStore.isUnlocked` (`LevelProgressStore.ts:123-129`) reads `LEVELS[index-1]`.

Inserting three ids after `f2-guirnalda` shifts every later absolute index, but
`isUnlocked` never reads an absolute index — only the id immediately before. Every other
level keeps its neighbour, so **exactly one predecessor link breaks**: `f2-colinas`, whose
predecessor moves from `f2-guirnalda` to the new desafío-4 id. Far smaller blast radius than
the duck-case insertion.

Cost, stated plainly: a child with `f2-guirnalda.approvals >= 2` currently has `f2-colinas`
unlocked; without a migration it relocks on the next load.

Copy `migrateDuckCase.ts`, not `migratePhase1.ts`. The latter is shaped for removed ids being
replaced; nothing is removed here. This one is simpler than the duck's — there is no
case-solved pseudo-id to seed, because Nivel 3 is not a case (§7). It ships as its own slice
BEFORE the catalog insertion, the ordering rule step 1 had to honour twice.

`catalog.test.ts`'s `EXPECTED_IDS` and phase-ordering assertions need the three ids at the
exact array position. Mechanical, not a design risk.

## 3. The U generators

From `client/src/levels/paths.ts`: `garland({x0=140, x1=860, yTop=285, yBottom=435,
cycles=4})` draws repeated U dips with `w=(x1-x0)/cycles` and per-cycle control point
`cy=(4·yBottom−yTop)/3` (`:546-563`). `hills` is its mirror, `crests` and `wave` are
alternating arches, `switchback` is one run plus a U-turn.

**Every one takes a single amplitude and cycle count for the whole path.** None supports
per-cycle variation.

- Desafío 1: `f2-guirnalda`'s own `garland` retuned — wider band, and "lentas" maps to
  `feedback(metronomeBpm, rail)`, the knob that already exists. Its 66 is already near the
  catalog's slowest.
- Desafío 2: reachable with the existing signature alone — more cycles shrinks `w`
  (proximity), a narrower band shrinks amplitude. No new generator.
- Desafío 3: genuinely unsupported. The smallest honest change is a variant taking an array
  of per-cycle `{width, depth}` instead of a scalar `cycles`, keeping `garland`'s exact
  rounded-U cubic math and still emitting only absolute `M`/`C` — `transformPath`
  (`paths.ts:172-174`) throws on any other command.
- Desafío 4: reuses desafío 1 or 2's geometry with an `obstacles` array; no new shape.

For desafío 3, check `buildLevel.ts`'s checkpoint and ideal-band derivation against a path
with non-uniform per-cycle amplitude. That was not inspected in this pass.

## 4. "Frenar y continuar" with the starfish

The retired `f1-pelotas` (`catalog.ts:490-530`) carries two hazards, `travel` 260,
`periodMs` 2600/2200, `radius` 32, phases half a cycle apart, with measured reasoning in its
comments: travel 3.1× the corridor so the ball fully clears it, ~54% of each cycle with a
real gap, and a 13:11 period ratio so the pair cannot be learned as one rhythm.

**Correction to the brief:** that shape has already been partly reused. The live `trail1`
carries a single retuned hazard (`catalog.ts:348`, `at 0.5, travel 220, periodMs 2400,
radius 30`). What is left to reuse is the pattern, not an untouched literal.

`Obstacle`/`obstacleAt`/`hitObstacle` are independent of `maze`, `carrier` and detective
status — hazard hit-testing is wired off `resetOnContact` alone (`LevelPlay.tsx:960-967`).

**The rendering seam.** A hazard today is a bare `<circle fill={inkOnly ? 'none' :
HAZARD_COLOR}>` (`TraceCanvas.tsx:1242-1253`) whose `cx`/`cy` the rAF loop mutates directly
on an `SVGCircleElement` ref (`:629, 703-711`). An `<image>` has no `cx`/`cy`. Making the
hazard a starfish means moving to the pattern the carrier already uses: a `<g ref
transform="translate(x,y)">` whose `transform` the loop writes, holding a static `<image>`
placed by `placeArt`. That means `hazardEls` becomes `SVGGElement[]`, `TraceHazards` gains an
optional art, and the plain-circle path stays the default so `trail1` does not regress.

This touches the rAF hot loop, so it needs the same rigour step 1 used for the lens: a
numeric before/after check of rendered attributes, not only a screenshot.

## 5. The jellyfish as the goal

`TraceCanvas`'s `startArt`/`endArt` (`TraceCanvas.tsx:340-439`) are **already generic** —
`TraceStandingArt {href, w, h, size, grip?}`, positioned by `placeArt`/`clampArtBox`, with no
import from `detective/`. `LevelPlay.tsx:1221-1236` is the only place that wires them and
does so only under `isDetectiveTrail`, but nothing structural requires that.

Recommendation: a `LevelConfig.goalArt?` field, with `endArt` computed as the level's own
goal art when present. That makes the medusa a property of the level's content rather than a
side effect of case membership, and it generalises to Nivel 4's sheep.

Must NOT change: `home/caseState.ts`'s `lampOn` is a pure boolean over case trail approvals
and has nothing to do with art; `LAMP` and `LAMP_ART` remain the detective case's own lamp
for the office rail and every case trail's end of route. A `goalArt` field is orthogonal to
all of it.

## 6. Art

This step needs exactly two of the six candidates on disk: `medusa.png` (the goal) and
`estrella de mar.png` (the desafío-4 hazard). `alga.png`, `piedra.png` and `hoja.png` wait —
`artManifest.test.ts` fails the build the moment `build_art.py` emits a PNG no registry entry
reaches, so registering unused art is not waste, it is a broken build.

Neither new piece is a clue mark, so neither needs the earned/drained pair, a new `ClueKind`
or a new palette token. Per `docs/09` §4's exceptions they most plausibly keep their authored
colour, like the animals and the octopus.

The concurrent art-pipeline rework matters: `ART_OUTLINE` (`palette.ts`, `#1a1a1a`) is now
the token for every drawn-world contour, and any new `build_art.py` row must point at it and
not at `INK_COLOR` — the mistake `palette.ts`'s own header records as having happened twice.
`artHierarchy.test.ts` globs `clue-*-drained.png` and caps ground decoration size against a
clue mark; it is only load-bearing if this step adds clue art, which it should not.

## 7. Clues and cases — DECIDED BY THE USER

The exploration recommended making Nivel 3 an ordinary, non-detective Fase 2 level. **The
user overrode the second half of that: the world stays, the case does not.**

Nivel 3 keeps the detective world — grass and earth, the octopus standing at the start, the
glass on the fingertip, the wordless shell — and carries **no clue marks and no deduction**.
The jellyfish is simply the goal.

The directive's own text is why: *"Uno de los rastros conduce al sector acuático."* It is one
continuous narrative, and `docs/09` §7 spent a whole section making the sheet a place rather
than a diagram. Dropping the child from grass and earth onto a bare white worksheet with a
title would contradict both. But there is equally no lineup to deduce — the Pulpito SEES the
jellyfish — so inventing a third `DetectiveCase` would be a fake mystery.

**The architectural consequence, and it is the real work of this step.**
`isDetectiveTrail = !!level.clue` (`LevelPlay.tsx:633`) currently bundles two separate ideas
and this level is the first thing that needs them apart:

- *is a case trail* — clue marks, the PISTAS rail, filing a clue, deduction routing;
- *is in the detective world* — ground scatter, mud ink, the octopus and the glass, the
  wordless shell, and the suppressed result block.

Nivel 3 is the second without the first. The split is the seam to design.

## 8. The three stars — a verified docs/code mismatch, now corrected

The gate is `!isDetectiveTrail` (`LevelPlay.tsx:1141-1155`), i.e. `!!level.clue` — not a
phase check and not "Nivel 1". So **every Nivel 2 trail hides the stars too**, because all
eight carry a clue.

`docs/03` claimed "a partir del Nivel 2 las tres estrellas vuelven". That was false and has
been corrected on `main` (commit `058ffc4`): Nivel 1 hides them because it asks for no
precision, Nivel 2 hides them because its screen has no words, and the two reasons only
coincide for now.

Under §7's decision Nivel 3 also hides them, for Nivel 2's reason. That must be stated in the
spec rather than discovered later.

## 9. Risks

1. **Splitting `isDetectiveTrail` touches everything it currently gates** — chrome, ink,
   scatter, carrier, rail, result block. A partial split that leaves one consumer on the old
   flag produces a level that is half in the world. Mitigation: enumerate every consumer
   first and convert them in one slice, with a test per gated behaviour.
2. **The hazard rendering change touches the rAF hot loop** (`<circle>` + `cx`/`cy` → `<g>` +
   `transform`). Bigger structurally than step 1's centring fix. Mitigation: numeric
   before/after of rendered attributes, and keep the circle path as the default.
3. **Per-cycle geometry is new surface in `paths.ts`**, which several tests measure closely.
   Mitigation: check `buildLevel.ts`'s checkpoint and ideal-band derivation against a
   non-uniform path before authoring desafío 3.
4. **The legacy hazard pair is already partly spent** on `trail1`. Reusing it literally would
   put three near-identical hazards in the catalog with no pedagogical distinction.
   Mitigation: reuse the measured reasoning, not the numbers.
5. **Migration ordering.** Its slice ships before the catalog insertion. Step 1 had to catch
   this live twice.
