// The MVP level catalog (docs/08 section 5). Everything playable is DATA:
// adding a level is adding an object to this array, never touching the engine.
//
// Phases 1-2 generate their paths parametrically (`paths.ts`), so amplitude,
// cycles and width can be retuned without redrawing anything. Phases 3-5 take
// their paths from the EXISTING letter pipeline (docs/08 section 6):
// `src/letters/svg/<char>.svg` → `buildLetterConfig()` for a single grapheme,
// and `buildWord()` for a linked group.
//
// Import-time resilience: a word whose members are not `isWordEligible` makes
// `buildWord` throw. That must NEVER blank the app, so the failure degrades to
// the first letter's own path and warns. A level always exists; at worst it is
// easier than authored.
import { buildWord } from '../letters/combinations'
import { LETTER_REGISTRY } from '../letters/registry'
import type { LetterConfig } from '../letters/types'
import {
  crests,
  garland,
  hills,
  loops,
  spiral,
  squareWave,
  straight,
  sweep,
  switchback,
  transformPath,
  triangularWave,
  wave,
} from './paths'
import type { LevelConfig, LevelFeedback, LevelRules, Phase } from './types'

/** Phase headings, as named in docs/08 section 5. */
export const PHASE_TITLES: Record<Phase, string> = {
  1: 'Control visomotor',
  2: 'Patrón continuo',
  3: 'Grafema aislado',
  4: 'Enlace',
  5: 'Palabra y automatización',
}

/**
 * Minimum accuracy per phase: the mazes are wide and forgiving, the letters are
 * not. 55 in phase 1, 60 in phase 2, 65 from the first grapheme on.
 *
 * `f1-libre` reuses the phase-1 number for a DIFFERENT quantity: on a `free`
 * level accuracy is COVERAGE, not nearness to a route (coverage.ts). 55 is not
 * a coincidence, it is a measurement: a single short line scores 4, a dense
 * scribble in one corner scores 13, and every model of a child covering the
 * whole sheet scores 60-90. The bar sits under that band ON PURPOSE — a free
 * warm-up has nothing to widen when it is failed (the adaptive corridor
 * (docs/03 section 4) has no corridor to widen here), so a bar the child cannot
 * clear would be the hard block docs/01 principle 3 forbids, and it would be
 * the very first screen of the app.
 */
function minAccuracyFor(phase: Phase): number {
  if (phase === 1) return 55
  if (phase === 2) return 60
  return 65
}

/**
 * Live feedback (docs/01 principle 2, docs/03 section 6). Tone and haptics are
 * on everywhere: leaving the corridor dims the trace and buzzes, it never marks
 * an error.
 *
 * `metronomeBpm` is phase 2 only — the rhythm phase. `rail` is the "riel
 * asistido" first-contact assist: it magnetizes the ink toward the route, so it
 * belongs to the FIRST route of a new kind of task and nowhere else. Left on it
 * stops being an assist and becomes the child's motor plan.
 */
function feedback(metronomeBpm: number, rail: boolean): LevelFeedback {
  return { tone: true, haptics: true, metronomeBpm, rail }
}

/** Compact rule builder — every level declares the same four switches. */
function rules(
  phase: Phase,
  mustBeContinuous: boolean,
  enforceOrder: boolean,
  minFluency: number,
): LevelRules {
  return { mustBeContinuous, enforceOrder, minFluency, minAccuracy: minAccuracyFor(phase) }
}

/**
 * Path strings of a letter config: the per-subpath `segments` when the glyph
 * has pen-lift secondaries (a dot, a crossbar), otherwise the single stored
 * `d`. Both shapes are exactly what `LevelConfig.paths` means.
 */
function pathsOf(config: LetterConfig): string[] {
  return config.pathDefinition.segments ?? [config.pathDefinition.d]
}

/** Level ids that fell back to a degraded path at import time (diagnostics). */
const degraded: string[] = []

/**
 * Paths for a single grapheme (phase 3). An unregistered character cannot
 * happen with the bundled SVG set, but it must not throw at import either:
 * it degrades to the phase-1 straight path so the catalog still loads.
 */
function letterPaths(id: string, char: string): string[] {
  const config = LETTER_REGISTRY[char]
  if (!config) {
    degraded.push(id)
    console.warn(
      `[levels] El nivel '${id}' no encontró la letra '${char}' en el registro; ` +
        'se degradó a un camino recto. Revisá src/letters/svg/.',
    )
    return [straight()]
  }
  return pathsOf(config)
}

/**
 * Paths for a linked group or word (phases 4-5). `buildWord` throws when a
 * member is not word-eligible (its stroke does not start at its entry anchor —
 * docs/08 section 6). That is an authoring problem, not a runtime one: the
 * level degrades to the FIRST letter's own path and warns, so the catalog
 * never throws and the app never blanks.
 */
function wordPaths(id: string, chars: string[]): string[] {
  try {
    return pathsOf(buildWord(chars))
  } catch (error) {
    degraded.push(id)
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(
      `[levels] El nivel '${id}' no pudo componer '${chars.join('')}' (${reason}); ` +
        `se degradó a la letra '${chars[0]}' sola.`,
    )
    return letterPaths(id, chars[0])
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fase 1 — Control visomotor. TODA LA HOJA EN BLANCO, no el renglón.
//
// `detective-mode` retheme (design units 9-10): the six unthemed corridor
// levels below are RETIRED — moved unwired to `LEGACY_PHASE_1` further down —
// and replaced by four themed detective trails, each carrying exactly one
// clue kind. `f1-libre` stays, rethemed as the opening beat of the case and
// explicitly clue-free (level-engine spec, "f1-libre Retheme Carries No
// Clue").
//
// Motor volume is restored by CONFIG, not level count (proposal Q1): the
// four trails between them keep the taper narrowing, the timed hazard and
// the arc-length total the six removed levels offered — asserted directly in
// `catalog.test.ts` ("Total arc length does not regress") rather than eyed.
// The themed hazard sits on trail 1 alone (design C3: it has the most open
// interior of the four, and the spiral's 120-unit radial gap against a
// 70-unit corridor leaves no room for one).
//
//   f1-libre  free scribble, rethemed as the case's opening page — no clue
//   trail1    droplet / sine wave — carries the one themed hazard
//   trail2    corn / counter-clockwise coil (D2, reuses the shipped spiral())
//   trail3    footprint / triangular wave — sharp corners, no curve to approx
//   trail4    feather / square wave — sharp corners, both clearance rules
//
// `demo: true` on every trail (design C1): the shell renders no title, hint
// or coach text for a detective trail (`LevelPlay.tsx`'s `isDetectiveTrail`
// branch, already shipped in S3), so the engine's existing pre-attempt route
// animation is what replaces the written instruction — shown, not written.
//
// Every trail sets `carrier: true`: that carrier IS the magnifying glass.
// `LevelPlay.tsx` passes `carrierArt` with the ink glass override for a
// detective trail, so the shipped sage shape never renders here.
//
// These shipped `carrier: false` for one slice, because the override existed
// on `TraceCanvas` and nothing passed it — the mode's central mechanic was
// missing while the suite stayed green, held there by a test that asserted
// the gap. If a trail ever reads `carrier: false` again, the glass is gone.
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_1: LevelConfig[] = [
  {
    id: 'f1-libre',
    phase: 1,
    title: 'El caso empieza',
    hint: 'Antes de investigar, dibujá lo que quieras por toda la hoja.',
    // The most literal answer to "que sea libre": no route, no corridor, no
    // rule about where to start or which way to go. The child warms the arm up.
    // No `clue` field — clue-free by design (level-engine spec, "f1-libre
    // contributes no clue" / "f1-libre is not tracked by the clue reducer").
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    // Nothing to be inside of, so there is no tone to sustain and no wall to
    // buzz against: the only feedback is the ink itself.
    feedback: { tone: false, haptics: false, metronomeBpm: 0, rail: false },
    paths: [],
    corridorWidth: 0,
    // No path means no checkpoints, so order cannot be validated; and lifting
    // the finger is not a defect when there is nothing to draw continuously.
    rules: rules(1, false, false, 0),
    // There is no guide to draw.
    showGuide: false,
    letters: [],
  },
  // ───────────────────────────────────────────────────────────────────────
  // The duck case (case-registry-and-captions design.md §3): four themed
  // trails inserted BEFORE `trail1`, one clue each, corridor width strictly
  // decreasing 100→70. `game/migrateDuckCase.ts` protects a returning
  // child's positional unlock of `trail1..4` across this insertion — it
  // must ship before these four levels do (Ordering Summary, S1 before S2).
  //
  //   duck-trail1  webfoot / broad wave, one cycle — the pond's edge
  //   duck-trail2  breadcrumb / wave, two cycles
  //   duck-trail3  bubble / garland — the one duck trail whose whole point
  //                is one unbroken stroke, like trail2's spiral
  //   duck-trail4  feather / square wave, sharp corners — both clearance
  //                rules (cornerClearance, armClearance) hold at w=70
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'duck-trail1',
    phase: 1,
    title: 'El charco del pato',
    hint: 'Seguí el charco de punta a punta.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    // FIRST CONTACT with a routed trail in the duck case: the rail is on
    // here and nowhere else, the same convention `trail1` carries.
    feedback: feedback(0, true),
    // [deviation from design.md §3's literal `amplitude: 140`] 140 draws a
    // vertical span of exactly 280 units, failing the pre-existing "phase 1
    // uses the whole blank sheet" guard (`catalog.test.ts`: every phase-1
    // routed level's vertical span MUST exceed the 300-420 writing band, i.e.
    // amplitude > 150) by 20 units. Widened to 170 — the same amplitude
    // design.md gives `duck-trail2` — which clears the guard with margin
    // (span 340, minY 130, maxY 470) while corridorWidth (100 vs 90) and
    // cycle count (1 vs 2) still carry the progression between the two.
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 170, cycles: 1 })],
    corridorWidth: 100,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'webfoot', spacing: 60 },
  },
  {
    id: 'duck-trail2',
    phase: 1,
    title: 'El sendero de migas',
    hint: 'Seguí las migas sin salirte.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 170, cycles: 2 })],
    corridorWidth: 90,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'breadcrumb', spacing: 60 },
  },
  {
    id: 'duck-trail3',
    phase: 1,
    title: 'La vuelta de las burbujas',
    hint: 'Seguí hasta el fondo, dá la vuelta y volvé.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
    // [deviation from design.md §3's literal `garland({ cycles: 3 })`, and
    // from the first implementation of this level]
    //
    // Three reasons, and the first is the one that matters.
    //
    // 1. A garland IS the row of U's, and the row of U's is the SIGNATURE of
    //    the directive's Nivel 3 — the jellyfish that swims away. Spending it
    //    here flattens that level before it ships. This is the same ruling
    //    that kept a timed obstacle off every duck trail (proposal D1): a
    //    later level's mechanic is not free decoration for an earlier one.
    // 2. `garland`'s cusps put two consecutive clue marks within ~20 units of
    //    each other where the arcs nearly meet, and a bubble is a fat round
    //    28-unit mark. Measured on a render: they overlapped into one blob.
    //    A switchback has no cusp, so consecutive marks stay apart.
    // 3. Clearing the "phase 1 uses the whole blank sheet" guard by pushing
    //    `yTop` to 110 put the route's FIRST POINT so high that the octopus
    //    and its glass — which stand at that point — were clipped by the top
    //    of the sheet. `yTop: 140` is where `trail4` already starts safely.
    //
    // A switchback is also the shape the directive actually asks Nivel 2 for:
    // "laberintos". One long run, one reversal, one long run back.
    paths: [switchback({ x0: 120, x1: 880, yTop: 140, yBottom: 480 })],
    corridorWidth: 80,
    // The reversal's whole point is one unbroken stroke — same reason
    // `trail2`'s spiral does — so it is the one duck trail requiring
    // continuity.
    rules: rules(1, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'bubble', spacing: 60 },
  },
  {
    id: 'duck-trail4',
    phase: 1,
    title: 'El rastro de plumas',
    hint: 'Seguí el rastro, esquina por esquina.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    taper: { from: 1.15, to: 0.9 },
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
    // [deviation from design.md §3's literal `amplitude: 140`] 140 draws a
    // vertical span of exactly 280 — the same pre-existing "phase 1 uses the
    // whole blank sheet" shortfall `duck-trail1` and `duck-trail3` also hit.
    // Widened to 170 (span 340, clears the guard); `cornerClearance` depends
    // only on `run`/`corridorWidth` and `armClearance` only gets MORE true as
    // amplitude grows, so design.md §3's arithmetic conclusion (both guards
    // hold) is unaffected — only its literal worked numbers go stale.
    paths: [squareWave({ x0: 100, mid: 300, amplitude: 170, run: 200, cycles: 3 })],
    corridorWidth: 70,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'feather', spacing: 60 },
  },
  {
    id: 'trail1',
    phase: 1,
    title: 'El sendero del agua',
    hint: 'Seguí el sendero de punta a punta.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // Narrows as the route runs, same "el sendero se estrecha" idea the
    // retired `f1-travesia` carried.
    taper: { from: 1.15, to: 0.85 },
    // ONE themed hazard (design C3: trail 1 has the most open interior of the
    // four, and it is the only trail this change places a hazard on). Sits at
    // the midpoint, with room to approach, stop and go on either side.
    obstacles: [{ at: 0.5, travel: 220, periodMs: 2400, phase: 0, radius: 30 }],
    resetOnContact: true,
    carrier: true,
    // The rail's first-contact slot moved to `duck-trail1` when the duck
    // case was inserted ahead of this trail (design.md §3) — it is now the
    // actual first routed level of phase 1, and the rail is on there and
    // nowhere else, same convention the retired `f1-travesia` carried
    // (docs/03 section 6).
    feedback: feedback(0, false),
    // A broad sinusoid across the whole sheet — the droplet's open water.
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 200, cycles: 3 })],
    corridorWidth: 90,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // Arc-length spacing, not a fixed count (defect fix: "far more clue
    // marks; the trail must look walked-on" — the user's reference is a
    // trail densely covered in marks, like footprints, not five pickups).
    // 60 units sits in the middle of the target 55-70 range; `clueCountFor`
    // (`detective/clues.ts`) turns that into ~42 marks on this trail's real
    // ~2607-unit length (spacing ≈ 60.6). Same 60 on every trail below, so
    // density reads the same regardless of each trail's own length: trail2
    // (~1719 units) → ~28 marks (≈59.3), trail3 (~2536) → ~41 (≈60.4),
    // trail4 (~3240) → ~53 (≈60.0).
    clue: { kind: 'droplet', spacing: 60 },
  },
  {
    id: 'trail2',
    phase: 1,
    // Counter-clockwise on purpose: the same turn the `a` family needs later
    // (D2, `explore.md` §5.3 — the proposal's overturned sawtooth suggestion).
    title: 'El caracol de maíz',
    hint: 'Girá para este lado, sin levantar el dedo.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
    // Shipped defaults, counter-clockwise: no override, so the radial gap
    // stays exactly the 120 units the corridor width below is measured against.
    paths: [spiral()],
    // 70 against the generator's 120 radial gap leaves ~50 units of visible
    // wall between the arms; wider merges the turns into a filled disc (D2,
    // `paths.ts:498-502`).
    corridorWidth: 70,
    rules: rules(1, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'corn', spacing: 60 },
  },
  {
    id: 'trail3',
    phase: 1,
    title: 'El sendero de huellas',
    hint: 'Seguí las huellas de punta a punta.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
    // Sharp-corner sibling of `wave()`: every footprint sits at a real elbow,
    // not a rounded crest (level-engine spec, "Generators emit only supported
    // commands" — `triangularWave` is `M`/`L` only).
    paths: [triangularWave({ x0: 90, x1: 910, y: 300, amplitude: 200, cycles: 3 })],
    corridorWidth: 90,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'footprint', spacing: 60 },
  },
  {
    id: 'trail4',
    phase: 1,
    title: 'El sendero de plumas',
    hint: 'Seguí el sendero, esquina por esquina.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // The last taper of the catalog, same narrowing shape the retired
    // `f1-pasillo` carried.
    taper: { from: 1.2, to: 0.8 },
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
    // `run: 220`, `amplitude: 160` against `corridorWidth: 70` satisfies BOTH
    // `cornerClearance` (run ≥ 2·corridorWidth ⇒ 220 ≥ 140) and `armClearance`
    // (amplitude ≥ corridorWidth ⇒ 160 ≥ 70, wall 250 against a 49 threshold —
    // level-engine spec, "Square-Wave Corner Constraint").
    paths: [squareWave({ x0: 100, mid: 300, amplitude: 160, run: 220, cycles: 3 })],
    corridorWidth: 70,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'feather', spacing: 60 },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Retired phase-1 configs (design unit 10 / Phase 11, `detective-mode`).
//
// The six unthemed corridor levels this catalog shipped before the retheme
// above, UNWIRED from `LEVELS` but kept exported and byte-for-byte unchanged
// (level-engine spec, "LEGACY_PHASE_1 preserves the removed configs"). This is
// the whole rollback plan: reverting is swapping this array back into `LEVELS`
// in place of the four trails, no revert needed (proposal §Rollback Plan).
//
// Safe to remove from `LEVELS` only because `client/src/game/migratePhase1.ts`
// (Phase 9, already shipped) runs a one-time copy-forward migration BEFORE
// this swap ever reaches a real child's store: `isUnlocked` is positional
// (`LevelProgressStore.ts:123-129`), so removing these six without that
// migration landing first would lock trails 2-4 for anyone already past
// `f1-travesia` (D3, no-demotion). See `tasks.md`'s Ordering Summary.
// ─────────────────────────────────────────────────────────────────────────────
export const LEGACY_PHASE_1: readonly LevelConfig[] = [
  {
    id: 'f1-travesia',
    phase: 1,
    title: 'La travesía',
    hint: 'Cruzá toda la hoja, de una punta a la otra, sin frenar.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // "El sendero se estrecha": forgiving where the child starts, narrower
    // where the movement is already running.
    taper: { from: 1.3, to: 0.7 },
    resetOnContact: false,
    carrier: false,
    // FIRST CONTACT with a route in the whole app: the rail is on here and
    // nowhere else in phase 1 (docs/03 section 6).
    feedback: feedback(0, true),
    paths: [sweep()],
    corridorWidth: 120,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f1-pelotas',
    phase: 1,
    title: 'Las pelotas que cruzan',
    // Names the STRATEGY, not the obstacle: "wait, then go" is the thing being
    // trained (docs/01 phase 1, inhibición motriz).
    hint: 'Esperá a que pase la pelota y recién ahí seguí.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // TWO hazards, and the difficulty is the TIMING, not the shape. They sit a
    // third and two thirds along the route so there is room to approach, stop
    // and go between them.
    //
    // `travel` 260 against an 84-unit corridor is 3.1x the channel: the sweep
    // covers the corridor wall to wall, so there is no safe lane to hug, and it
    // carries the ball far enough OUT of the channel that a real gap opens. The
    // ball is clear of the corridor (|offset| > 84/2 + 32 + 12) for 54% of each
    // cycle — two windows of about 0.7s, which is a gap a six-year-old can see
    // coming and act on.
    //
    // The periods differ (2600 / 2200) AND the phases are half a cycle apart:
    // either alone would leave the two balls in a fixed relation the child can
    // learn as ONE rhythm. With 13:11 periods the pair only repeats every ~29s,
    // so each hazard has to be read on its own — which is the lesson.
    obstacles: [
      { at: 0.33, travel: 260, periodMs: 2600, phase: 0, radius: 32 },
      { at: 0.66, travel: 260, periodMs: 2200, phase: 0.5, radius: 32 },
    ],
    resetOnContact: true,
    carrier: false,
    feedback: feedback(0, false),
    // A broad, gentle arch: one rise and one fall across the whole sheet, with
    // no corner anywhere. The route is deliberately EASY to read — a shape that
    // also had to be solved would hide what the child is actually learning.
    paths: [sweep({ x0: 110, y0: 470, x1: 890, y1: 470, bow: -330, waves: 0.5 })],
    corridorWidth: 84,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f1-paseo',
    phase: 1,
    title: 'El paseo',
    hint: 'Llevá al viajero de una punta a la otra sin tocar los bordes.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
    // FIRST CONTACT with the escort rule, so the SHAPE gives nothing away: a
    // long diagonal with a bow of 45, barely more than a straight line. When a
    // new rule arrives the geometry has to get out of its way (docs/01
    // principle 1); the difficulty lives in the 68-unit corridor.
    paths: [sweep({ x0: 110, y0: 480, x1: 890, y1: 130, bow: 45 })],
    corridorWidth: 68,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f1-pasillo',
    phase: 1,
    title: 'El pasillo angosto',
    hint: 'Ahora el pasillo se angosta: llevalo despacio y por el medio.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // The second taper of the catalog, and the only one that narrows into a
    // half-turn: the corridor is most forgiving on the outward run and tightest
    // on the way back, when the child already knows the movement.
    taper: { from: 1.2, to: 0.8 },
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
    // Nearly twice the length of any other phase-1 route, so precision has to
    // be HELD rather than found, plus one half-turn — stop, reverse, keep the
    // ink off the wall.
    paths: [switchback()],
    // The narrowest corridor in phase 1. The escort levels are the precision
    // levels: if the walls did not actually matter, `resetOnContact` would be a
    // rule the child never meets.
    corridorWidth: 56,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f1-ondas',
    phase: 1,
    title: 'Las olas inclinadas',
    hint: 'Seguí las olas grandes, despacio y por el medio.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(0, false),
    // The same wave, TILTED: an oblique route is a different wrist rotation,
    // and a horizontal one would quietly rehearse the writing line again.
    paths: [transformPath(wave(), { rotate: -22 })],
    corridorWidth: 95,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f1-espiral',
    phase: 1,
    // Counter-clockwise on purpose: the same turn the `a` family needs later.
    title: 'El caracol',
    hint: 'Entrá al caracol girando para este lado, sin levantar el dedo.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(0, false),
    paths: [spiral()],
    // 70 against the generator's 120 radial gap leaves ~50 units of visible
    // wall between the arms; wider merges the turns into a filled disc.
    corridorWidth: 70,
    rules: rules(1, true, true, 0),
    showGuide: true,
    letters: [],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Fase 2 — Patrón continuo (pre-cursiva). Todos con mustBeContinuous: acá se
// instala la regla de la cursiva.
//
// The geometry STAYS in the writing band, scaled 1.25× (paths.ts): guirnalda,
// colinas, bucles and crestas are letter shapes, and their proportions against
// the pauta are the whole point of the phase. What they lose is the DRAWN
// pauta (`surface: 'blank'`) — the rules still mean nothing to the child until
// phase 3 — and what they gain is the metronome: this is the rhythm phase
// (docs/01 phase 2, "planificación motora, ritmo").
//
// One beat = one cycle of the pattern, so the bpm falls as the cycle gets
// longer: 66/63 for the four short arcs of the hamacas and the montañas, 56/52
// for the three tall ones of the crestas and the rulos. Everything stays inside
// 50-70 bpm, which is a pace a six-to-eight-year-old can actually follow — fast
// enough to be a rhythm, slow enough to be a movement and not a scribble.
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_2: LevelConfig[] = [
  {
    id: 'f2-guirnalda',
    phase: 2,
    title: 'Las hamacas',
    hint: 'Hacé las hamacas de corrido, al ritmo: bajá y subí.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(66, false),
    paths: [garland({ cycles: 4 })],
    corridorWidth: 85,
    rules: rules(2, true, true, 35),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f2-colinas',
    phase: 2,
    title: 'Las montañas',
    hint: 'Subí y bajá las montañas al ritmo, sin levantar el dedo.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(63, false),
    paths: [hills({ cycles: 4 })],
    corridorWidth: 85,
    rules: rules(2, true, true, 40),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f2-bucles',
    phase: 2,
    title: 'Los rulos altos',
    hint: 'Un rulo por golpe: subí bien alto y cruzá, todos iguales.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(52, false),
    paths: [loops({ cycles: 3 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 45),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f2-crestas',
    phase: 2,
    title: 'Las olas grandes',
    hint: 'Una ola por golpe, de arriba abajo, sin frenar.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(56, false),
    paths: [crests({ cycles: 3 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 45),
    showGuide: true,
    letters: [],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Fase 3 — Grafema aislado: una letra por familia de movimiento, para probar
// que el motor sirve para las cinco.
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_3: LevelConfig[] = [
  {
    id: 'f3-l',
    phase: 3,
    title: 'La letra l',
    hint: 'Hacé el rulo alto de la ele, de una sola vez.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(0, true),
    paths: letterPaths('f3-l', 'l'),
    corridorWidth: 42,
    rules: rules(3, true, true, 40),
    showGuide: true,
    letters: ['l'],
    demo: true,
  },
  {
    id: 'f3-a',
    phase: 3,
    title: 'La letra a',
    hint: 'Girá para este lado y cerrá la a, sin levantar el dedo.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(0, false),
    paths: letterPaths('f3-a', 'a'),
    corridorWidth: 42,
    rules: rules(3, true, true, 40),
    showGuide: true,
    letters: ['a'],
    demo: true,
  },
  {
    id: 'f3-m',
    phase: 3,
    title: 'La letra m',
    hint: 'Hacé las montañas de la eme de corrido, sin frenar.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(0, false),
    paths: letterPaths('f3-m', 'm'),
    corridorWidth: 42,
    rules: rules(3, true, true, 45),
    showGuide: true,
    letters: ['m'],
    demo: true,
  },
  {
    id: 'f3-o',
    phase: 3,
    title: 'La letra o',
    hint: 'Girá redondito y cerrá la o arriba.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(0, false),
    paths: letterPaths('f3-o', 'o'),
    corridorWidth: 42,
    rules: rules(3, true, true, 45),
    showGuide: true,
    letters: ['o'],
    demo: true,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Fase 4 — Enlace. El corte del trazo entre las dos letras es el error a
// detectar: acá `mustBeContinuous` no es negociable.
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_4: LevelConfig[] = [
  {
    id: 'f4-la',
    phase: 4,
    title: 'Enlace la',
    hint: 'Uní la ele con la a sin levantar el dedo.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(0, false),
    paths: wordPaths('f4-la', ['l', 'a']),
    corridorWidth: 40,
    rules: rules(4, true, true, 50),
    showGuide: true,
    letters: ['l', 'a'],
    demo: true,
  },
  {
    id: 'f4-ma',
    phase: 4,
    title: 'Enlace ma',
    hint: 'Uní la eme con la a de un solo trazo.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(0, false),
    paths: wordPaths('f4-ma', ['m', 'a']),
    corridorWidth: 40,
    rules: rules(4, true, true, 50),
    showGuide: true,
    letters: ['m', 'a'],
    demo: true,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Fase 5 — Palabra y automatización. En `f5-mama` la guía desaparece: solo
// quedan los renglones. Ese es el examen real de la memoria motora.
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_5: LevelConfig[] = [
  {
    id: 'f5-ala',
    phase: 5,
    title: 'La palabra ala',
    hint: 'Escribí ala completa, de corrido.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(0, false),
    paths: wordPaths('f5-ala', ['a', 'l', 'a']),
    corridorWidth: 40,
    rules: rules(5, true, true, 55),
    showGuide: true,
    letters: ['a', 'l', 'a'],
    demo: true,
  },
  {
    id: 'f5-mama',
    phase: 5,
    title: 'La palabra mama',
    hint: 'Ahora de memoria: escribí mama de un solo trazo.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(0, false),
    paths: wordPaths('f5-mama', ['m', 'a', 'm', 'a']),
    corridorWidth: 40,
    rules: rules(5, true, true, 55),
    showGuide: false,
    letters: ['m', 'a', 'm', 'a'],
  },
]

/** The full MVP catalog, in play order (docs/08 section 5). */
export const LEVELS: readonly LevelConfig[] = [
  ...PHASE_1,
  ...PHASE_2,
  ...PHASE_3,
  ...PHASE_4,
  ...PHASE_5,
]

/**
 * Level ids whose path DEGRADED at import time (an unregistered letter, or a
 * word whose members are not eligible). Empty in a healthy build; exposed so a
 * dev overlay or a test can assert authoring health without parsing console
 * output.
 */
export const DEGRADED_LEVEL_IDS: readonly string[] = degraded

/** Look up a level by id. Throws — an unknown id is a programming error. */
export function getLevel(id: string): LevelConfig {
  const level = LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`Nivel no encontrado: ${id}`)
  return level
}

/** Every level of a phase, in play order. */
export function levelsByPhase(phase: Phase): LevelConfig[] {
  return LEVELS.filter((l) => l.phase === phase)
}

/** The next level in play order; `null` at the end of the catalog or for an unknown id. */
export function nextLevelId(id: string): string | null {
  const index = LEVELS.findIndex((l) => l.id === id)
  if (index < 0 || index >= LEVELS.length - 1) return null
  return LEVELS[index + 1].id
}
