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
import { crests, garland, hills, loops, spiral, straight, sweep, switchback, transformPath, wave } from './paths'
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
// Every phase-1 level used to sit in the 300-420 band with the three-zone pauta
// drawn behind it. That was wrong twice over. The ruled lines mean nothing
// before phase 3, so they were decoration the child had to filter out against
// docs/01 principle 1 (carga cognitiva controlada); and a 120-unit band trains
// the fingertip, while phase 1 exists to build the whole-arm and wrist control
// the letters later depend on ("coordinación ojo-mano, control tónico",
// docs/01 phase 1). So: `surface: 'blank'`, and the routes span y≈60 to y≈540
// at varied scales, positions and orientations.
//
// `maze: true` on every phase-1 route: the corridor is rendered as walls
// knocked out of a solid field, which is what a laberinto actually is and what
// makes figura-fondo perception part of the task. The phase-2 patterns stay
// soft corridors — a pre-cursive garland is a movement, not a maze.
//
// The progression is MOTOR, and it climbs one demand at a time:
//
//   f1-libre     free scribble — warm the whole arm up, no rule at all
//   f1-travesia  one huge sweep — gross movement from the shoulder
//   f1-pelotas   timed hazards — approach, STOP, wait for the gap, go
//   f1-paseo     escort, wide corridor — first contact with "the walls matter"
//   f1-pasillo   escort, narrow and long — hold that precision for a journey
//   f1-ondas     large tilted curves — wrist rotation
//   f1-espiral   the spiral — the a/c/o turn
//
// Inhibition comes BEFORE precision on purpose. `f1-pelotas` asks the child to
// hold still on command while the route stays forgiving (84 units wide); the
// two escort levels then ask for accuracy over the whole journey with the ball
// gone. Reversing them would ask a child to be precise and to inhibit in the
// same breath, which is two lessons in one screen (docs/01 principle 1).
//
// It still mirrors the order docs/01 phase 1 names — "Rectos, con ángulos, con
// curvas amplias, con bucles" — with the corners now living inside `f1-pasillo`
// (its half-turn) instead of in a route made only of corners.
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_1: LevelConfig[] = [
  {
    id: 'f1-libre',
    phase: 1,
    title: 'Garabato libre',
    hint: 'Dibujá lo que quieras, bien grande, por toda la hoja.',
    // The most literal answer to "que sea libre": no route, no corridor, no
    // rule about where to start or which way to go. The child warms the arm up.
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
