// Level play screen (docs/04 §3.3 wireframe, docs/08 §3): one screen runs all
// five phases from data — animated demonstration, visible corridor, live
// off-path dimming, and the THREE SEPARATE pillars at release. Never a single
// grade, never red, never an error sound (docs/03 §7).
//
// Live feedback (docs/01 principle 2, docs/02 §7.2). ONE ~10 Hz off-path sample
// drives every channel: the ink dims, the corridor tone falls silent, the
// device buzzes once on the way out. Adding a second scan per channel would
// spend the frame budget the surface exists to protect, so they all hang off
// `onFrame` and nothing else.
//
// Guide withdrawal (docs/03 §3) is `guideLevelFor` below — the corridor, the
// shape line, the demonstration, the checkpoints and even the start marker are
// all functions of mastery, not one static boolean.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TraceCanvas, {
  GROUND_FIELD,
  SHEET_PAPER,
  type DrawDemo,
  type TraceBackdrop,
  type TraceCamera,
  type TraceClueMark,
  type TraceCorridor,
  type TraceGround,
  type TraceHazards,
  type TraceReveal,
  type TraceSpines,
  type TraceVertexArt,
  type TraceWaypoints,
} from '../canvas/TraceCanvas'
import { backdropFor, TORCH_CHALK, TORCH_CHALK_DIM } from '../zoo/backdrops'
import { adventureFor } from '../zoo/adventures'
import type { AdventureProgress } from '../zoo/progress'
import {
  completionGrowthFraction,
  debugClearedTiles,
  EMPTY_REVEAL,
  isLightAnimating,
  revealTick,
  revealTiles,
  type RevealState,
} from '../levels/revealGrid'
import {
  arrangeDebugCount,
  cameraDebugOrigin,
  isSpineDebug,
  lightDebugPoint,
  revealDebugFraction,
  spineDebugCount,
  waypointDebugCount,
} from '../canvas/devMode'
import { seedCameraOrigin } from '../canvas/camera'
import { standBesideArtCorridor } from '../canvas/placeArt'
import {
  EMPTY_WAYPOINTS,
  debugCarrier,
  debugTrail,
  seedWaypoints,
  waypointArt,
  waypointRings,
  waypointTick,
  type WaypointState,
} from '../levels/waypoints'
import {
  EMPTY_SPINES,
  SPINE_MARK_R,
  debugSpineStrokes,
  seedSpines,
  spineAim,
  spineBody,
  spineMarks,
  spineRings,
  spineSettle,
  type SpineState,
} from '../levels/spines'
import { grassScatter, mudScatter } from '../canvas/groundScatter'
import type { TracePoint } from '../canvas/useTraceInput'
import { resolveInkPolicy } from '../canvas/ink'
import { contactTick, NO_CONTACT, type ResetDebounce } from '../canvas/resetOnContact'
import { buildLevelTarget } from '../levels/buildLevel'
import { hitObstacle, obstacleAt } from '../levels/obstacles'
import { routeApexes } from '../levels/vertexArt'
import { routeExtrema, vertexArtPoints } from '../levels/dolphinExtrema'
import { evaluateLevel } from '../game/evaluateLevel'
import { coachMessage } from '../game/adaptiveTolerance'
import { playApprovalTone } from '../modes/tone'
import { createTraceTone, playBeatTick, type TraceTone } from '../canvas/traceTone'
import { pulseOnLeaving } from '../canvas/haptics'
import { railFade, railPull } from '../canvas/rail'
import { multiCorridorTick, routeTrackStart, type RouteTrack } from './corridorTrack'
import {
  arrangeRenderPieces,
  arrangeTick,
  isArranged,
  seedArrange,
  type ArrangeConfig,
  type ArrangeState,
} from '../levels/arrange'
import type { TraceArtCorridor } from '../canvas/TraceCanvas'
import { directionArrowOf } from './directionArrow'
import { goalMarkerOf } from './goalMarker'
import type { LevelConfig, LevelTarget } from '../levels/types'
import { isCaseTrail, inDetectiveWorld } from '../levels/world'
import type { LevelAttempt, LevelRecord } from '../game/types'
// Detective mode (design unit 6, spec: detective-mode "Clue Collection State
// Machine" / "Trail Completion Lamp and Rail Filing"). A level with no
// `clue` field is an ordinary level and none of this wiring engages.
import {
  clueCountFor,
  clueMarks,
  clueTick,
  emptyClueState,
  reachedTrailEnd,
  type ClueState,
} from '../detective/clues'
import {
  CARRIER_LENS_ART,
  CLUE_ART,
  GROUND_GRASS,
  GROUND_MUD,
  OCTOPUS_ART,
  SIGN_ART,
  ZOO_ANIMAL_ART,
  ZOO_STAR_ART,
} from '../detective/assets'
import CaptionedArt from '../detective/CaptionedArt'
import TrailProgressBar from '../detective/TrailProgressBar'
import { BackIcon, ReplayIcon } from '../detective/icons'
import { useNarration } from '../voice/useNarration'
import { speak } from '../voice/narrator'
import SpeakButton from '../voice/SpeakButton'

/** Seconds one demonstration sub-path takes, and the gap before the next one. */
const DEMO_DURATION_S = 1.6
const DEMO_STEP_S = 1.7
/**
 * Live off-path sampling period (~30 Hz): the 60fps ink loop owns the frame.
 *
 * Was 100ms (~10 Hz). Combined with `RESET_CONTACT_TICKS = 2` that gave up
 * to 200ms of grace before a contact restarted the run — enough for "apenas
 * toques el borde ya tengas que volver a empezar" to read as a delay instead
 * of an edge. Dropping the period to ~33ms keeps the SAME 2-tick debounce
 * (one noisy sample still cannot trip a reset on its own) but shrinks the
 * grace window to ~66ms.
 */
const OFF_PATH_PERIOD_MS = 33
/** The arrange fold's own config when `level.arrange` is absent — never
 *  actually consulted, since `arrangeOpen` is `false` whenever
 *  `level.arrange` itself is absent. */
const EMPTY_ARRANGE_CONFIG: ArrangeConfig = { from: [], snapRadius: 0 }
/** How long the visual metronome stays swollen after a beat. Short enough to
 * read as a pulse, long enough to see at 60 BPM on a slow panel. */
const BEAT_FLASH_MS = 140

/**
 * T7 (prewriting-stage-completion, "the next-level one could either appear
 * big or simply go automatically"): once a drawn-place attempt is approved,
 * the level advances on its own after this short celebration — no manual
 * "Siguiente" tap. Chosen inside the user's own "~1.5-2 s" window.
 */
const CELEBRATE_MS = 1800
/**
 * A tap anywhere skips the wait (decision, same task) — but not for this
 * long after the celebration starts. The pointerup that just finished the
 * WINNING stroke can synthesize a click at the same screen coordinates the
 * instant this full-screen skip target mounts under the fingertip, which
 * would eat the celebration before the child ever sees it. This grace
 * window is that one release's own ghost click, nothing more — it is well
 * under the 1.4s a real second tap would take to arrive on purpose.
 */
const CELEBRATE_SKIP_GRACE_MS = 400

/**
 * docs/16's first three enclosures identify the animal that belongs behind
 * the surface the child is cleaning. The approved art already includes the
 * animal, uppercase word, and wooden frame, so this stays a narrow LevelPlay
 * projection rather than becoming another level-engine field.
 */
const PROLOGUE_ZOO_SIGNS = {
  glass1: { art: SIGN_ART.fish, label: 'PECES' },
  glass2: { art: SIGN_ART.fish, label: 'PECES' },
  sand1: { art: SIGN_ART.turtles, label: 'TORTUGAS' },
  sand2: { art: SIGN_ART.turtles, label: 'TORTUGAS' },
  glass3: { art: SIGN_ART.monkeys, label: 'MONOS' },
  glass4: { art: SIGN_ART.monkeys, label: 'MONOS' },
} as const

/** Rendered HEIGHT the enclosure sign is drawn at before {@link SIGN_CROP_HEIGHT}
 * takes its slice off the bottom (T5, D14). Purely an intrinsic-aspect-ratio
 * input for `CaptionedArt`'s `<svg viewBox>` — the CSS `width` on
 * `.cv-level-zoo-sign > svg` is what actually decides the on-screen size at
 * each `max-height` breakpoint (`height: auto` then derives from this
 * ratio), the same division of labour every other sized art constant in this
 * file already leaves to `LAYOUT_CSS`. */
export const SIGN_SIZE = 128

/** The visible slice of {@link SIGN_SIZE}: crops off the sign's own two
 * wooden support legs (T5 — "Crop the sign's legs with a nested
 * `<svg viewBox>` … if that makes the board legibly bigger"). The three
 * approved files (`sign-fish.png`/`-turtles.png`/`-monkeys.png`, all
 * ~199x256) are the same template: frame + animal + word fill roughly the
 * top four fifths, the two legs the bottom fifth (checked by eye against all
 * three). 82% keeps a couple of points of margin below the frame's own
 * bottom edge — safe even if that eyeballed split is slightly off — while
 * still letting the sign's row spend nearly all of its height on the part a
 * child actually reads, instead of on the props holding the board up.
 * `CaptionedArt`'s own `<svg viewBox>` is what performs the crop (no
 * `<clipPath>`/`mask`/`url(#…)`) — see that component's `cropHeight` doc. */
export const SIGN_CROP_HEIGHT = Math.round(SIGN_SIZE * 0.82)

/** Rendered HEIGHT of a clue mark, in viewBox units on the 1000x600 sheet
 * (docs/09 §3: clue marks are ~20-30 units tall).
 *
 * This used to be a unitless `scale` multiplier against art authored in a
 * 100-unit em. The raster art has no em, and its files differ in aspect
 * (a 103x256 feather against a 220x256 footprint), so a shared multiplier
 * would render them at visibly different sizes. Fixing the HEIGHT and
 * deriving each width from the source aspect ratio keeps the original
 * intent — the defect this constant was introduced for was density: at the
 * shipped ~60-unit spacing, marks any bigger run into their own neighbours
 * and merge into a smear instead of reading as individual
 * footprints/droplets/kernels/feathers. */
export const CLUE_MARK_SIZE = 28

/** Rendered HEIGHT of the octopus standing at the start of a trail, in sheet
 * units (`docs/09_GUIA_DE_ESTILO_VISUAL.md` §3). It stands on its FEET — the
 * canvas's `TraceStandingArt` contract — so it waits AT the start of the route
 * rather than being bisected by it. */
const OCTOPUS_SIZE = 96

/** How far before an art-corridor piece's own drawn box the start octopus's
 *  feet land (`standBesideArtCorridor`). The margin has to clear the whole
 *  standing character on whichever screen axis the piece's rotation maps it
 *  to (its own width unrotated, its own height on a `rotate: -90` column) —
 *  `OCTOPUS_SIZE` itself covers the larger of the two, plus a 16-unit gap so
 *  a mere edge touch still reads as standing beside the animal, not against
 *  it. */
const OCTOPUS_STAND_MARGIN = OCTOPUS_SIZE + 16

/** Rendered HEIGHT of whatever stands at the route's end, a little under the
 * octopus at its start (T6, adventure-flow-and-map-guidance: renamed from
 * `LAMP_SIZE` once the goal stopped being only ever the case lamp — a
 * case's own clue art, an adventure's animal encounter and its star reward
 * all share this one size now, the same way the lamp's two states always
 * did: reads at this size without being oversized to compensate for a
 * drained mark's own lower contrast). */
const END_MARK_SIZE = 84

/** Rendered HEIGHT of a level's own `goalArt` (design.md §5) — a creature,
 * peer of {@link OCTOPUS_SIZE}, not of `END_MARK_SIZE`: the medusa is Nivel
 * 3's content, not a case default. */
const GOAL_ART_SIZE = 96

function isSandRevealLevel(levelId: string): boolean {
  return levelId === 'sand1' || levelId === 'sand2'
}

/** The `monos` adventure's own two levels (`zoo/adventures.ts`). They are
 *  named `glass*` only because they predate the two-per-enclosure regrouping
 *  — the SURFACE they erase is the monkey enclosure's leaf litter
 *  (`backdrops.ts`'s `LEAF_LITTER` on the `monos` row), so both the visual
 *  policy and the child-facing wording follow the leaves, not the ID. */
function isLeavesRevealLevel(levelId: string): boolean {
  return levelId === 'glass3' || levelId === 'glass4'
}

/** The mud path (D15, T3): `sendero`'s one played level is `sand3`
 *  (`adventureFor('sand3')?.id === 'sendero'`, `zoo/adventures.ts`). `sand4`
 *  is `sendero`'s harder twin — T1 dropped it from every `ADVENTURES` row
 *  (never deleted from the catalog, since level ids are persisted keys; it
 *  is reachable only through the dev `?nivel=` deep link), so it resolves NO
 *  adventure at all and needs its own explicit check rather than inheriting
 *  one through the adventure lookup every other family above uses. Keying
 *  off the adventure (not an id prefix) is the same call `isLeavesRevealLevel`
 *  already made for `glass3`/`glass4`: the SURFACE decides the wording, and
 *  `sand*` already names the surface for the sand adventures too, so the
 *  explicit id here only disambiguates the one id membership cannot reach. */
function isMudRevealLevel(levelId: string): boolean {
  return adventureFor(levelId)?.id === 'sendero' || levelId === 'sand4'
}

export function eraseResultMessage(levelId: string, approved: boolean): string {
  if (isSandRevealLevel(levelId)) {
    return approved ? '¡Arena barrida!' : 'Seguí barriendo la arena.'
  }
  if (isLeavesRevealLevel(levelId)) {
    return approved ? '¡Hojas juntadas!' : 'Seguí juntando las hojas.'
  }
  // D15: this used to fall through to the glass wording below, so finishing
  // the muddy sendero said "¡Vidrio limpio!" — there is no glass anywhere on
  // this trail.
  if (isMudRevealLevel(levelId)) {
    return approved ? '¡Sendero limpio!' : 'Seguí limpiando el sendero.'
  }
  return approved ? '¡Vidrio limpio!' : 'Seguí limpiando el vidrio.'
}

/**
 * The exact sentence spoken once an erase/light attempt is APPROVED (docs/18
 * D1, "Todo se escucha"; T7) — the SAME success text `.cv-result-pill` shows
 * on screen (`eraseResultMessage` for erase; the light mode's own literal for
 * light), so a child who cannot read it yet still hears the exact words a
 * grown-up reading over their shoulder would say. `null` for anything that
 * is not a successful erase/light attempt: a "keep going" coaching message
 * is deliberately never spoken here — D1/T7 is about the instruction and the
 * celebration, not about narrating every intermediate nudge out loud, and a
 * routed/lettered level's own three-pillar result section has no single
 * sentence to read at all (`docs/01` principle 2's "never a single grade").
 *
 * Pure and exported so the exact wording is directly testable without a
 * live pointer release — the same reason `eraseResultMessage` itself is
 * exported (this file's own header notes `onFrame`/`onRelease` are not
 * observable through `renderToString`).
 */
export function resultSpeechLine(
  levelId: string,
  mode: 'erase' | 'light' | undefined,
  approved: boolean,
): string | null {
  if (!approved) return null
  if (mode === 'erase') return eraseResultMessage(levelId, true)
  if (mode === 'light') return '¡Descubrimiento brillante!'
  return null
}

/**
 * Where the magnifying glass RESTS, as an offset from the octopus's feet.
 *
 * The glass is the carrier, so at rest it sits on the carrier's home point.
 * Left at the route's first point it renders dead-centre on the octopus's
 * body and reads as swallowed rather than held. These two numbers move the
 * home point to where the octopus's own raised tentacle holds the glass in
 * the source art (`/art/carrier-octopus.png`: its lens sits at about 85% of
 * the width and 27% of the height, which against `OCTOPUS_SIZE` and that
 * file's 384x353 aspect is about 55% of `OCTOPUS_SIZE` across and 94% of it
 * up from the feet). They scale WITH `OCTOPUS_SIZE`: raise one and the other
 * two move, or the glass drifts off the tentacle holding it.
 *
 * It is applied to the carrier's HOME POINT here rather than as an offset
 * inside the canvas, and that is the only place it can live: `TraceCanvas`'s
 * rAF loop rewrites the carrier group's `transform` every single frame, so
 * anything written on that group is gone in ~16ms, and an offset on the
 * group's CHILD would follow the glass onto the fingertip while drawing —
 * where the glass must sit exactly ON the finger, not beside it. Offsetting
 * the home point moves the glass only where it rests.
 */
const GLASS_REST_DX = 53
const GLASS_REST_DY = -90

/**
 * The child's own line on a detective trail: MUD, not ink.
 *
 * A trail is walked, not written, so the trace the glass leaves behind should
 * read as trodden earth — the user's brief is "a brown slightly darker than
 * the ground", so the child can see the route they have already covered. The
 * corridor's earth is `#d9c3ae` (`TraceCanvas`'s `CORRIDOR_EARTH`); this is
 * the same hue carried down in value.
 *
 * It is bounded on BOTH sides on purpose. Too light and it vanishes into the
 * corridor it is drawn on, which is the one thing this line exists to show;
 * too dark and it competes with the footprint clue's `PRINT` (`#000000`) and
 * with every earned clue colour, in a mode whose first rule is that colour
 * means a clue was earned. `#8a6a4a` sits clear of both: obviously darker
 * than the ground, obviously lighter and warmer than the marks lying on it.
 */
const MUD_INK = '#8a6a4a'

/** The mud with the light down — the off-corridor dim. The shipped `#94a3b8`
 * is a cold grey, and against a warm earth corridor it reads as a DIFFERENT
 * substance rather than as the same line fading; this is the same brown
 * desaturated and lifted toward the ground it is drawn on. */
const MUD_INK_DIM = '#b3a08c'

/**
 * The restart cue (`LevelConfig.resetOnContact`, docs/01 principle 2).
 *
 * Warm, neutral, and only about what to do NEXT. It does not say what went
 * wrong, because the child already felt it and naming it adds nothing but
 * blame; it is not red, there is no sound of failure, and no score moves. The
 * rule is the consequence — the sentence is just the invitation to go again.
 */
export const RESTART_MESSAGE = 'Volvé a empezar'
/** How long the restart cue stays up before the standing hint returns. */
const RESTART_CUE_MS = 2200
/** T10: how often `animNow` is allowed to re-render while a flashlight
 *  grow is in flight — well under the ~400ms/~1400ms durations themselves,
 *  and well over the 60fps `onFrame` cadence, so the grow reads as smooth
 *  without spending a `setState` on every single animation frame. */
const LIGHT_ANIM_TICK_MS = 60
export const PORTRAIT_GUIDANCE_QUERY = '(max-width: 559px) and (orientation: portrait)'

export function isPortraitGuidanceViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(PORTRAIT_GUIDANCE_QUERY).matches
  )
}

/**
 * T10 (`odd/tasks/prewriting-stage-completion.md`, "add animations to the
 * darkness"): the one gate the found-object grow and the completion wash
 * both check before animating at all — the same `matchMedia` shape
 * {@link isPortraitGuidanceViewport} already uses, read once rather than
 * watched, since a preference flip mid-level is not a case worth a listener
 * for a feature this small.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Full sheet height; the drawing band is a crop of it (docs/02 §3). */
const SHEET_HEIGHT = 600
/** The ruled pauta itself: ascender ceiling to descender floor. This band is
 * pedagogy and is ALWAYS shown — a letter is read against these lines. */
const PAUTA_TOP = 180
const PAUTA_BOTTOM = 540
/** Breathing room kept outside whatever the band ends up containing, so the
 * ink cap and the r=22 start dot are never clipped against the paper edge. */
const BAND_MARGIN = 40
/** Half the ink stroke (18) plus the start-dot radius (22): how far past a path
 * centreline the drawing can actually reach when the corridor is narrow. */
const INK_REACH = 31

/**
 * The vertical band of the sheet a level actually shows (docs/02 §3). It is the
 * ruled pauta plus a margin, WIDENED when a level's corridor genuinely leaves
 * it — phase 1/2 pattern levels ride above the ascender ceiling (`f2-bucles`
 * reaches y≈105) and below the descender floor (`f1-ondas` reaches y≈544), and
 * a fixed crop would cut their channel off.
 *
 * Cropping the dead margin is what makes the CONTAIN fit pay: it flattens the
 * aspect ratio, so on a height-constrained screen (tablet landscape, touch
 * laptop) the same height buys a much wider — therefore much bigger — sheet.
 * On a width-constrained screen (a phone held upright) the scale still comes
 * from the width and the letters do NOT grow; only empty paper is removed.
 *
 * ON A BLANK SURFACE THERE IS NO PAUTA TO PROTECT. The clamp exists so the
 * band always contains the ruled lines a child is writing between — but a
 * `surface: 'blank'` level never draws one (see `TraceCanvas`'s `surface`
 * prop), so on those the clamp was reserving room for four lines that are not
 * there, and giving away 160 units of sheet for nothing. Every detective trail
 * is blank, and on those the sheet is no longer paper at all: it is the world,
 * so the "empty margin" the crop was removing is now grass (docs/09 §7, "la
 * hoja … debería ocupar la pantalla"). Ruled levels keep the clamp exactly.
 */
export function drawingBand(
  ideal: ReadonlyArray<readonly [number, number]>,
  corridorWidth: number,
  surface: LevelConfig['surface'] = 'ruled',
): { y: number; height: number } {
  if (surface === 'blank') return { y: 0, height: SHEET_HEIGHT }
  // Content bounds start empty on purpose: the pauta gets BAND_MARGIN, the
  // content gets its own corridor/ink reach, and the band is the UNION. Seeding
  // these with the pauta values instead would add the reach to the pauta too
  // and quietly give back most of the crop.
  let minY = Infinity
  let maxY = -Infinity
  for (const p of ideal) {
    if (p[1] < minY) minY = p[1]
    if (p[1] > maxY) maxY = p[1]
  }
  const reach = Math.max(corridorWidth / 2, INK_REACH) + BAND_MARGIN
  const top = Math.max(0, Math.floor(Math.min(PAUTA_TOP - BAND_MARGIN, minY - reach)))
  const bottom = Math.min(SHEET_HEIGHT, Math.ceil(Math.max(PAUTA_BOTTOM + BAND_MARGIN, maxY + reach)))
  return { y: top, height: bottom - top }
}

/**
 * The reveal grid's INITIAL fold state (Phase 6, design.md §9) —
 * `EMPTY_REVEAL`, or a debug-seeded one when the exact non-gated
 * screenshot-seeding query flags are present (`canvas/devMode.ts`'s
 * `revealDebugFraction`/`lightDebugPoint`): `scripts/shot.sh` cannot draw a
 * finger, so these flags pre-clear an erase level's tiles or pin a light
 * level's torch before the very first render, no live interaction required.
 * `?debug=linterna:<x>,<y>` also REPLACES live pointer input for that
 * level's own live fold (`onFrame`'s `!debugLightPoint` guard below) — the
 * flag's own contract. Absent flags (the ordinary, non-debug path) return
 * EXACTLY `EMPTY_REVEAL`, byte-identical to before this wiring.
 */

export function releasedRevealState(
  reveal: LevelConfig['reveal'],
  snapshot: ReadonlyArray<ReadonlyArray<TracePoint>>,
  width: number,
): RevealState | null {
  if (!reveal) return null
  // One shared clock for the whole instant replay (T10's own `now` param on
  // `revealTick`): this rebuild exists to re-score off RAW points, not to
  // re-run the live growth animation, so every stroke in the snapshot is
  // folded at the SAME moment rather than at N slightly different reads of
  // the clock. `performance.now()`, NOT `Date.now()`: `canvas/TraceCanvas.tsx`'s
  // own rAF loop stamps `onFrame`'s `timeMs` (and therefore every OTHER
  // `revealTick` call site's `now`, and `animNow`'s own clock below) from
  // `performance.now()` — a page-relative clock starting near 0, not the
  // Unix epoch. Stamping `litAt`/`completeAt` from `Date.now()` here would
  // put them on a completely different scale (~1.7e12 apart), so every
  // later `elapsed = animNow - litAt` would be a huge negative number that
  // `growthFraction` clamps to 0 forever — a found object's own grow-in
  // (and the completion wash) would never advance past radius 0, because
  // `onRelease` (this function's one caller) runs on EVERY stroke release
  // and overwrites `revealState` wholesale, right after the live fold had
  // already stamped it correctly.
  const now = performance.now()
  let next = EMPTY_REVEAL
  for (const stroke of snapshot) {
    next = revealTick(next, stroke, true, reveal, width, now)
    next = revealTick(next, [], false, reveal, width, now)
  }
  return next
}

export function allRevealTiles(reveal: NonNullable<LevelConfig['reveal']>, width: number): Array<TraceReveal['tiles'][number]> {
  const tileW = (width > 0 ? width : 1) / reveal.cols
  const tileH = SHEET_HEIGHT / reveal.rows
  const tiles: Array<TraceReveal['tiles'][number]> = []
  for (let row = 0; row < reveal.rows; row++) {
    for (let col = 0; col < reveal.cols; col++) {
      tiles.push({ x: col * tileW, y: row * tileH, w: tileW, h: tileH, opacity: 0 })
    }
  }
  return tiles
}
export function initialRevealState(reveal: LevelConfig['reveal'], search: string): RevealState {
  if (!reveal) return EMPTY_REVEAL
  if (reveal.mode === 'erase') {
    const fraction = revealDebugFraction(search)
    if (fraction === null) return EMPTY_REVEAL
    return { ...EMPTY_REVEAL, cleared: debugClearedTiles(reveal, fraction) }
  }
  const point = lightDebugPoint(search)
  if (point === null) return EMPTY_REVEAL
  return { ...EMPTY_REVEAL, point }
}

/**
 * The waypoint fold's INITIAL state (`free-trail-waypoints` capability,
 * design.md §8): `EMPTY_WAYPOINTS`, or the `?debug=estela:<k>` seed —
 * `scripts/shot.sh` cannot draw a finger, so this flag pre-lights `k`
 * flowers (and the hive, once `k` exceeds the stop count) before the very
 * first render, no live interaction required. The ONE function every reset
 * site must call (`levels/arrange.ts`'s `seedArrange` doc comment names the
 * exact bug a raw `EMPTY_WAYPOINTS` at a reset site would reintroduce: the
 * debug seed applied once at mount, then silently wiped by the mount
 * effect's own unconditional reset).
 */
export function initialWaypointState(
  waypoints: LevelConfig['waypoints'],
  search: string,
): WaypointState {
  if (!waypoints) return EMPTY_WAYPOINTS
  return seedWaypoints(waypoints, waypointDebugCount(search))
}

/**
 * The spine fold's INITIAL state (`radial-spines` capability, design.md
 * §6/§7): `EMPTY_SPINES`, or the `?debug=espinas:<k>` seed —
 * `scripts/shot.sh` cannot draw a finger, so this flag pre-fills `k`
 * anchors before the very first render, no live interaction required.
 * `initialWaypointState`'s own convention, restated: the ONE function
 * every reset site must call, never the bare `EMPTY_SPINES` constant
 * directly (`levels/arrange.ts`'s `seedArrange` doc comment names the
 * exact bug that reintroduces).
 */
export function initialSpineState(
  spines: LevelConfig['spines'],
  search: string,
): SpineState {
  if (!spines) return EMPTY_SPINES
  return seedSpines(spines, spineDebugCount(search))
}

/**
 * The camera's own seeded origin for one reset (`scrolling-camera`
 * capability, design.md §2.4): 0 when the level has no `camera` field,
 * otherwise `seedCameraOrigin`'s clamp over `?debug=camara:<x>`'s seed. ONE
 * function, called from mount, `resetSurface`, AND `restartRun` — the exact
 * discipline `initialWaypointState` above already states, restated here
 * because `restartRun` once skipped it: it does not call `resetSurface`, it
 * duplicates a subset of its resets inline, and the camera reseed was the
 * one reset that subset first omitted (verify-report R1). A future reset
 * site that forgets to call this can no longer drift silently — the
 * `LevelPlay.test.tsx` source guard counts every call site by name.
 */
export function seedCameraFor(
  level: Pick<LevelConfig, 'camera'>,
  target: Pick<LevelTarget, 'viewWidth' | 'viewBoxWidth'>,
  search: string,
): number {
  return level.camera ? seedCameraOrigin(cameraDebugOrigin(search), target.viewWidth, target.viewBoxWidth) : 0
}

/**
 * Full-viewport level layout (docs/04 §3.3). The surface sets `touch-action:
 * none` so a trace is never stolen by the page scroller — which means the page
 * must not NEED scrolling, or the buttons under a tall canvas become
 * unreachable. So the level is exactly one viewport tall, the chrome rows are
 * fixed-size flex items, and the canvas is the only growing one. `min-height:0`
 * is load-bearing: without it a flex child refuses to shrink below its content
 * and the column overflows anyway.
 */
export const LAYOUT_CSS = `
.cv-play, .cv-play * { box-sizing: border-box; }
html, body, #root { margin: 0; padding: 0; }
.cv-play {
  height: 100vh; /* fallback for engines without dvh */
  height: 100dvh;
  overflow: hidden;
  /* T7 rework #2 (orchestrator review, "the chrome sits on flat bands, not
   * over the art"): .cv-play is no longer a flex column sharing space
   * between the header row, the sheet and the footer row. .cv-sheet is now
   * position:fixed;inset:0 (the WHOLE viewport, no padding at all), and
   * every other child of .cv-play floats ABOVE it instead — position:
   * relative here is only what makes THOSE absolutely-positioned children
   * anchor to this box rather than to the page.
   * Kept as the page-behind-the-sheet fallback colour (still visible for
   * an instant while the backdrop image decodes, or on a classic level
   * with no backdrop at all — docs/09 section 7's own "the sheet should
   * occupy the screen", not read as a card on a page). */
  position: relative;
  background: ${SHEET_PAPER};
}
/* …and on a detective trail the sheet's edge is grass, so the page is grass.
 * One token, imported from the canvas that paints the field, so the two can
 * never drift into two nearly-identical greens. */
.cv-play.cv-play-ground { background: ${GROUND_FIELD}; }
/* T7 rework ("the art is drawn twice" — the first pass's separate CSS
 * .cv-backdrop-fill layer removed outright): the adventure's own backdrop
 * art now fills the whole viewport as ONE continuous picture INSIDE
 * TraceCanvas's own SVG (canvas/TraceCanvas.tsx's fitContentWithInsets/
 * fitCameraContentWithInsets grow the viewBox itself to the container's
 * aspect ratio; the backdrop image is sized to that same grown box).
 * .cv-sheet needs no special CSS for this at all — no second layer, no
 * object-fit, nothing to keep in sync with the canvas's own placement.
 *
 * T7 rework #2 (orchestrator review, "ALL chrome floats above it... no flat
 * bands anywhere"): .cv-top/.cv-foot used to be display:contents (invisible
 * to layout, letting .cv-head/.cv-hint and .cv-result/.cv-actions become
 * direct flex items of .cv-play's own flex column). Now they are real,
 * ABSOLUTELY POSITIONED rows floating over the full-viewport sheet —
 * pointer-events:none on the row itself, so an empty stretch of its own
 * padding lets a touch reach the art/canvas underneath, with pointer-
 * events:auto restored per child (the actual buttons/text, immediately
 * below) so those stay tappable. Their own flex-direction:column stacks
 * head-then-hint (top) and result-then-actions (bottom); a short viewport
 * flips that to a single ROW (see the max-height:520px block far below),
 * which is still worth doing even though the canvas no longer needs the
 * room back — a shorter chrome silhouette is still the nicer look there. */
.cv-top, .cv-foot {
  position: absolute;
  left: 0;
  right: 0;
  /* .cv-sheet sits BETWEEN these two in source order (.cv-top, then
   * .cv-sheet, then .cv-foot) — without this, plain DOM-order stacking
   * would paint .cv-sheet's own opaque backdrop image OVER .cv-top,
   * hiding the back/sound buttons entirely. Above .cv-sheet's own
   * z-index: 0, below .cv-celebrate-skip's z-index: 5. */
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  pointer-events: none;
}
.cv-top > *, .cv-foot > * { pointer-events: auto; }
.cv-top { top: 0; }
.cv-foot { bottom: 0; }
/* position: relative is for .cv-level-zoo-sign below: absolutely centring it
 * on THIS row (not on the viewport, not relative to the back button) needs a
 * positioned ancestor no bigger than the row itself. */
.cv-head { position: relative; flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.cv-title { margin: 0; font-size: 24px; font-weight: 700; color: #1e293b; text-align: right; }
/* T7 (docs/18 D1/D24/D26): the "hear it again" button for the level's own
 * hint lives at the RIGHT END of .cv-head — the back button occupies the
 * left, the enclosure sign or the adventure bar (when either exists) is
 * absolutely centred over the row (.cv-level-zoo-sign/.pistas-bar,
 * above/below), and the right end was free (this row's own T3/T5 comment
 * already says so: "the row's right side left empty on purpose for a later
 * listen button" — this is that button). .cv-head-right is a SINGLE
 * flex child wrapping the (optional) title AND the speak button together:
 * .cv-head keeps exactly two flow children — the back button and this
 * group — so justify-content: space-between still puts the group flush
 * against the row's own right edge, byte-identical to where .cv-title
 * alone used to sit on a classic (non-drawnPlace) level, and the group
 * never competes with the centred sign/bar for space because it is a
 * normal flow child while those stay absolutely positioned. flex: 0 0
 * auto keeps the group from stretching into a click target wider than its
 * own contents, and gap: 10px keeps the title (when present) from
 * touching the round button beside it. Never taller than the row: the
 * button is 44px, .cv-title's own line-height is well under that at
 * every breakpoint below, so this adds no height to .cv-head. NOTE: no
 * backticks anywhere in this block — LAYOUT_CSS is a template literal, and
 * one backtick inside a comment here ends the string (the exact trap
 * PROLOGUE_CSS/INTRO_CSS/ZOO_CSS already carry this same warning for). */
.cv-head-right { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; }
.cv-hint { flex: 0 0 auto; margin: 0; font-size: 28px; line-height: 1.3; color: #1e293b; }
/* T7 rework #2: was flex:1 1 auto (a flex-column sibling of .cv-sheet,
 * taking its place when the sheet was flex:1 1 auto too). Now a floating
 * card in its own right, same as .cv-top/.cv-foot — inset:0 so it can
 * centre itself over the whole viewport, with generous fixed top/bottom
 * padding (rather than a measured inset — this mode is explicitly out of
 * this task's own scope, "the portrait-phone guidance may stay as is")
 * wide enough to clear .cv-top/.cv-foot's own tallest rendered height at
 * any breakpoint, so the card is never itself hidden under the back
 * button or the actions row. */
.cv-portrait-guidance { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 90px 18px; border: 2px dashed #94a3b8; border-radius: 20px; background: rgba(255,255,255,0.72); color: #1e293b; font-size: 24px; line-height: 1.3; text-align: center; font-weight: 700; }
.cv-portrait-guidance strong { display: block; font-size: 30px; margin-bottom: 8px; }
.cv-portrait-guidance span { display: block; color: #475569; font-size: 18px; font-weight: 600; }
/* T7 rework #2: was position:relative;flex:1 1 auto (a flex column sibling
 * sharing space with the header/footer rows). Now fixed to the WHOLE
 * viewport — no padding, no flex sizing, nothing held back for chrome —
 * every button that used to reserve its own row now floats over this. */
.cv-sheet { position: absolute; inset: 0; z-index: 0; container-type: size; display: flex; align-items: center; justify-content: center; gap: 10px; }
/* The canvas is TraceCanvas's own root svg element — no wrapper element
 * exists to put a class on, so it is targeted structurally. It grows to
 * fill the sheet, exactly as it always did. T5 moved the zoo sign out of
 * .cv-sheet entirely (it lives in .cv-head now — see .cv-level-zoo-sign
 * below), so TraceCanvas is the sheet's only direct SVG child and keeps the
 * exact sizing contract it had before U14; the T3 revision below adds one
 * more, non-SVG, ABSOLUTELY POSITIONED child (.cv-result-pill) that costs
 * this rule nothing since it never participates in flex sizing. */
.cv-sheet > svg { flex: 1 1 auto; min-width: 0; min-height: 0; }

/* docs/16 zoo signage (T5/D14, revised again by T3's orchestrator QA pass).
 * The approved PNG is the complete wooden sign: animal, word, frame and two
 * support legs. Two earlier placements both cost the sheet real height: it
 * first sat ABSOLUTELY POSITIONED inside .cv-sheet, over the top-left corner
 * of the very art it was announcing (D14's original complaint); moving it to
 * its OWN row above the sheet fixed that overlap but cost .cv-sheet a
 * permanent ~84px of the flex column instead (measured 1252x592 -> 1252x438
 * at 1280x720). It now lives INSIDE .cv-head — the row the back button
 * already occupies — sized well under that row's own height and absolutely
 * centred on it (.cv-head's own position: relative above), so it costs
 * .cv-head nothing and touches .cv-sheet not at all. pointer-events: none
 * because it is decorative chrome, never a control. CaptionedArt still owns
 * the accessible text; its duplicate visual glyphs are clipped because
 * PECES / TORTUGAS / MONOS are already legible inside the authored sign. */
.cv-level-zoo-sign {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  pointer-events: none;
}
/* height: auto derives from the svg's own intrinsic ratio, which is now
 * width OVER the level screen's SIGN_CROP_HEIGHT constant, not over the
 * full uncropped SIGN_SIZE — shrinking this CSS width keeps the CROPPED
 * board's own proportions, never the legs it no longer draws. Sized to sit
 * well inside .cv-head's own height (the back button's 56/48/44px min-height
 * at each breakpoint below), never to define it. */
.cv-level-zoo-sign > svg { width: 53px; height: auto; }
.cv-level-zoo-sign .cv-caption {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Adventure trail progress bar (adventure-flow-and-map-guidance T6, docs/18
 * §4.3-§4.4; supersedes the old PISTAS rail — D19: "PISTAS" read as an
 * abstract word and its light bulb meant "idea", neither said WHO or WHY).
 * detective/TrailProgressBar.tsx is the new component; it targets these
 * SAME class names (pistas-bar, pistas-slot-shell, pistas-slot,
 * pistas-flight and its three keyframes below) on purpose — reusing them
 * is what keeps the flight-home animation and the caption licence
 * (captionAudit.ts's CAPTION_CONTAINERS already lists pistas-bar) without
 * touching either. detective/PistasRail.tsx itself is UNCHANGED and keeps
 * its OWN, unrelated use of these exact names for the hen's deduction-
 * screen case summary (screen/Deduction.tsx) — CSS classes are global, but
 * only one of the two screens is ever mounted at a time, so the
 * redefinition below (sized and positioned for THIS screen's .cv-head)
 * never reaches that other screen's own stylesheet.
 *
 * It lives centred in .cv-head now, not in its own row above the sheet —
 * the same move already made for the enclosure sign (T5), for the same
 * measured reason (T3/T5's lesson, restated in this task's own brief): an
 * extra row in the flex column cost .cv-sheet ~84px of height. zooSign and
 * a real progress never both hold for the same level (a signed entrance
 * enclosure is always a single-level ADVENTURES row, which
 * adventureProgress returns null for), so the two share this exact centred
 * slot in .cv-head without ever colliding. */
.pistas-bar {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}
.pistas-slots { flex: 0 0 auto; display: flex; flex-direction: row; align-items: center; gap: 6px; }
.pistas-slot-shell { position: relative; display: inline-flex; align-items: center; justify-content: center; border-radius: 13px; }
/* The current level's own slot (D20/D21's "no festejo" complaint, restated
 * for the bar: the child should be able to find "which one is THIS tramo"
 * at a glance). A thicker ring, not a colour change — colour on this bar is
 * reserved for "earned", so the current marker has to be shape/weight only.
 * Static under reduced motion, same convention .cv-next-ready uses. */
.pistas-slot-shell-current::before {
  content: "";
  position: absolute;
  inset: -4px;
  border: 2.5px solid rgba(37, 99, 235, 0.75);
  border-radius: 16px;
  animation: pistas-current-pulse 1.6s ease-in-out infinite;
}
@keyframes pistas-current-pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}
@media (prefers-reduced-motion: reduce) {
  .pistas-slot-shell-current::before { animation: none; opacity: 1; }
}
/* The animal being searched for, at the end of the bar (docs/18 §4.3,
 * "Encuentro"). filter: brightness(0) plus a lowered opacity on a plain
 * HTML img — never an SVG filter referencing a fragment id, which this
 * repo's own header comment (canvas/TraceCanvas.tsx) bans for hydrating
 * blank on a real device; a CSS filter on an img resolves with no
 * referenced def at all, so nothing here can hit that failure mode. */
.pistas-animal { display: inline-flex; margin-left: 2px; }
.pistas-animal img { display: block; filter: brightness(0); opacity: 0.5; }
.pistas-animal-rescued img { filter: none; opacity: 1; }
.pistas-slot { display: block; border-radius: 13px; background: rgba(255,255,255,0.42); }
.pistas-slot-shell-filed .pistas-slot {
  animation: pistas-store-pop 760ms cubic-bezier(.2,.9,.25,1.2) both;
  box-shadow: 0 5px 9px rgba(63,111,143,.22);
}
.pistas-slot-shell-filed::after {
  content: "";
  position: absolute;
  inset: -7px;
  border: 3px solid rgba(250, 204, 21, 0.82);
  border-radius: 18px;
  opacity: 0;
  animation: pistas-slot-spark 900ms ease-out both;
  pointer-events: none;
}
.pistas-flight {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 1;
  transform: translate(-84px, 48px) scale(1.9) rotate(-12deg);
  transform-origin: center;
  opacity: 0;
  pointer-events: none;
  animation: pistas-fly-home 880ms cubic-bezier(.22,.78,.26,1) both;
}
@keyframes pistas-fly-home {
  0% { opacity: 0; transform: translate(-84px, 48px) scale(1.9) rotate(-12deg); }
  18% { opacity: 1; transform: translate(-70px, 34px) scale(2.05) rotate(-8deg); }
  72% { opacity: 1; transform: translate(-12px, 4px) scale(1.24) rotate(3deg); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(.72) rotate(0deg); }
}
@keyframes pistas-store-pop {
  0% { transform: scale(.72); }
  52% { transform: scale(1.28); }
  100% { transform: scale(1); }
}
@keyframes pistas-slot-spark {
  0% { opacity: 0; transform: scale(.7); }
  36% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 0; transform: scale(1.35); }
}
@media (prefers-reduced-motion: reduce) {
  .pistas-slot-shell-filed .pistas-slot,
  .pistas-slot-shell-filed::after,
  .pistas-flight {
    animation: none;
  }
  .pistas-flight { display: none; }
  .pistas-slot-shell-filed::after { opacity: 1; transform: none; border-color: rgba(250, 204, 21, 0.72); }
}
.cv-result { flex: 0 0 auto; min-height: 96px; display: flex; flex-direction: column; justify-content: center; color: #1e293b; }
.cv-pillars { display: flex; flex-wrap: wrap; gap: 28px; justify-content: center; }
.cv-pillar { display: inline-flex; align-items: baseline; gap: 8px; font-size: 24px; font-weight: 600; }
.cv-coach { margin: 8px 0 0; text-align: center; font-size: 22px; }
/* T3 revision (orchestrator QA regression): the drawnPlace erase/light
 * result message used to be a .cv-result row like the one above — first
 * appearing only on attempt (shrinking the sheet the instant a level
 * resolved), then reserved from first paint (shrinking the sheet
 * PERMANENTLY instead). Both cost .cv-sheet real height it must never
 * lose. This message asks the flex column for nothing: it is an absolutely
 * positioned pill. White-on-dark-text is chosen specifically because it
 * must read over ANY of this screen's backdrops — plain paper, a leaf-
 * litter fill, a night sky — without a per-backdrop colour override (the
 * old light-mode section needed one; this does not). pointer-events: none
 * because it is feedback, never a control, and must never intercept the
 * next attempt's first touch.
 *
 * T7 rework #2: this used to sit bottom: 16px within .cv-sheet, which
 * was a flex sibling of .cv-foot — the two never overlapped. Now .cv-sheet
 * is the WHOLE viewport (T7 rework #2's own .cv-sheet comment), so a
 * viewport-bottom-relative offset would land the pill on top of .cv-foot's
 * own actions row. Rendered as a CHILD of .cv-foot instead (JSX, below),
 * positioned bottom: 100% — its own bottom edge pinned to .cv-foot's own
 * TOP edge, margin-bottom for the gap — so it always floats just above
 * whatever chrome the actions row currently holds, at any breakpoint,
 * without needing to know that row's own height. */
.cv-result-pill {
  position: absolute;
  left: 50%;
  bottom: 100%;
  margin-bottom: 16px;
  transform: translateX(-50%);
  z-index: 3;
  max-width: calc(100% - 32px);
  padding: 10px 22px;
  border-radius: 999px;
  background: ${SHEET_PAPER};
  border: 3px solid #1a1a1a;
  color: #1e293b;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.35);
  pointer-events: none;
}
/* T7: the text-free celebration for every drawn-place level that has no
 * erase/light result sentence of its own (spines, waypoints, a plain
 * corridor) — C1 keeps the detective world wordless, so this is the SAME
 * pill with only the check mark inside, a round badge instead of a long
 * pill. aria-label on the element itself (JSX) carries the words a
 * sighted child never sees, the exact convention '.cv-btn-back''s own
 * aria-label already uses for an icon-only button on a drawn place. */
.cv-result-pill-icon { padding: 14px 18px; font-size: 30px; line-height: 1; }
.cv-result-pill-icon .cv-result-check { margin-right: 0; }
/* Success only (attempt.approved) — never shown on the neutral "keep
 * going" coaching text, so a green check never contradicts a message that
 * says the child is not done yet (docs/01 principle 2: never a mixed
 * signal). */
.cv-result-check { color: #16a34a; font-weight: 900; margin-right: 8px; }
.cv-actions { flex: 0 0 auto; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.cv-btn { min-height: 64px; padding: 0 28px; border-radius: 18px; border: 3px solid #1a1a1a; background: ${SHEET_PAPER}; color: #1e293b; font-size: 20px; font-weight: 600; cursor: pointer; }
.cv-btn-back { min-height: 56px; padding: 0 18px; }
.cv-btn-ok { background: #dcfce7; border-color: #16a34a; }
.cv-btn-off { opacity: 0.45; cursor: default; }
/* T7 auto-advance: the transparent full-screen tap target that skips the
 * celebration. Below the dev-only skip button's own z-index (9999,
 * GameScreen.tsx's DEV_SKIP_BUTTON) so that corner keeps working
 * untouched; above everything else on this screen, which is exactly what
 * "a tap ANYWHERE" needs. appearance: none and a transparent background
 * keep it visually absent — only '.cv-result-pill''s own check mark is
 * what the child sees. */
.cv-celebrate-skip {
  position: fixed;
  inset: 0;
  z-index: 5;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  appearance: none;
  cursor: pointer;
}

/* D21/T3: finishing a level used to change nothing but a small button's own
 * pale colour — no festejo at all, easy to miss entirely. The enabled
 * "Siguiente"/chevron now says "now!" on its own: visibly bigger, a solid
 * (not pale) green, a white glyph instead of the ink-grey every other icon
 * uses, and a slow pulse that keeps drawing the eye without being loud.
 * transform: scale (not bigger padding/font-size per breakpoint) so the
 * 1.15x holds at every .cv-btn size this file already ships, with no
 * separate override needed inside the max-height queries below.
 * prefers-reduced-motion keeps the size and colour — the actual affordance
 * change — and drops only the motion (docs/03's "never a jump scare",
 * restated for animation rather than sound). */
.cv-next-ready {
  transform: scale(1.15);
  background: #22c55e;
  border-color: #16a34a;
  color: #ffffff;
  animation: cv-next-pulse 1.4s ease-in-out infinite;
}
@keyframes cv-next-pulse {
  0%, 100% { transform: scale(1.15); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
  50% { transform: scale(1.22); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .cv-next-ready { animation: none; }
}

/* T3 (2026-09-25 tablet playtest, hedgehog/'radial-spines'): the spine
 * marks used to be a flat dim/earned 'fill' swap with no live hint of
 * WHICH anchor to draw next — a six-year-old had to guess or hunt. Neither
 * rule below touches 'fill', 'stroke' or 'r' as an SVG ATTRIBUTE (only as a
 * CSS property), so SpineLayer.test.tsx's byte-level parsing of those
 * exact attributes stays unchanged — see the file header comment.
 * '.cv-spine-mark-next' marks the lowest-index unfilled anchor
 * (nextSpineIndex, levels/spines.ts) with a gentle stroke pulse on the
 * SAME dim mark — never a new colour (this mode's own rule: colour means a
 * clue was earned) and never 'transform', so there is no SVG
 * transform-origin concern here at all. */
.cv-spine-mark-next {
  stroke: #f2efe6; /* TORCH_CHALK (zoo/backdrops.ts) — must match if that ever changes */
  stroke-width: 3;
  animation: cv-spine-next-pulse 1.4s ease-in-out infinite;
}
@keyframes cv-spine-next-pulse {
  0%, 100% { stroke-opacity: 0.3; }
  50% { stroke-opacity: 0.95; }
}
@media (prefers-reduced-motion: reduce) {
  .cv-spine-mark-next { animation: none; stroke-opacity: 0.8; }
}
/* '.cv-spine-mark-filled' gives the fill swap a one-shot "pop" the instant
 * an anchor is earned, instead of a silent colour change alone.
 * 'transform-box: fill-box' is load-bearing: an SVG shape's default
 * transform origin is the OUTER svg's (0,0), not its own centre, so a bare
 * 'transform: scale(...)' here would visibly jump the mark toward the
 * sheet's corner for the animation's duration instead of scaling in place. */
.cv-spine-mark-filled {
  transform-box: fill-box;
  transform-origin: center;
  animation: cv-spine-pop 380ms cubic-bezier(.2,.9,.25,1.2) both;
}
@keyframes cv-spine-pop {
  0% { transform: scale(.55); }
  60% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .cv-spine-mark-filled { animation: none; }
}

/* Upright and narrow is genuinely width-limited: show guidance instead of
 * shrinking the play surface into an unusable mini game. Header and actions
 * stay outside this block, so Back/Return and keyboard navigation are never
 * trapped behind the instruction. The class is set from the same media query
 * this rule answers, so the sheet is hidden only when the guidance is present
 * in the document. */
.cv-play-portrait-guided .cv-portrait-guidance { flex-direction: column; }
.cv-play-portrait-guided .cv-sheet { display: none; }
.cv-play-portrait-guided .cv-level-zoo-sign { display: none; }

/* Height-constrained but not tiny — the PRIMARY devices, a tablet in landscape
 * and a touch laptop. Full-size chrome eats ~45% of a 700px viewport, so the
 * rows tighten. T7 rework #2: was .cv-play { gap; padding } (the flex
 * column's own outer spacing) — now .cv-top, .cv-foot directly, each
 * row's OWN edge padding and internal (head-to-hint / result-to-actions)
 * gap, since the two rows no longer share a flex column with the sheet. */
@media (max-height: 820px) {
  .cv-top, .cv-foot { gap: 6px; padding: 8px 14px; }
  .cv-title { font-size: 20px; }
  .cv-hint { font-size: 22px; }
  .cv-result { min-height: 64px; }
  .cv-pillar { font-size: 20px; }
  .cv-coach { margin: 4px 0 0; font-size: 18px; }
  /* T7: kept >= 56px even at this tighter tier (1024x768/1280x720 both
   * land here) — the decision's own "big touch targets >= 56px". */
  .cv-btn { min-height: 58px; padding: 0 22px; font-size: 18px; }
  .cv-btn-back { min-height: 56px; }
  .pistas-slots { gap: 5px; }
  /* Both target viewports at this breakpoint (1280x720, 1024x768) want the
   * whole bar around 40px tall — the animal end-cap is the tallest element,
   * so it alone is sized to the target; the slots stay a little under it. */
  .pistas-slots svg { width: 34px; height: 34px; }
  .pistas-animal img { height: 40px; }
  /* width: 47px -> ~50px tall, comfortably inside the 48px back button row
   * this breakpoint sets just above (1280x720 and 1024x768 both land here). */
  .cv-level-zoo-sign > svg { width: 47px; }
  .cv-result-pill { font-size: 18px; padding: 8px 18px; margin-bottom: 12px; }
}

/* Short viewport (844x390 lands here): the chrome stays compact even though
 * the canvas itself no longer needs the room back (T7 rework #2 — the sheet
 * is always the full viewport now). Buttons stop at 48px, not the
 * decision's own 56px floor — a genuine tradeoff, not an oversight: the
 * '.cv-top'/'.cv-foot' rows below still collapse to one row each, since a
 * shorter chrome silhouette over the art is still the nicer look on a
 * 390px-tall landscape phone regardless. Flagged for the user rather than
 * silently either way. */
@media (max-height: 520px) {
  .cv-top, .cv-foot { gap: 4px; padding: 6px 10px; }
  .cv-title { font-size: 16px; }
  .cv-hint { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cv-portrait-guidance { font-size: 18px; padding: 12px; }
  .cv-portrait-guidance strong { font-size: 22px; }
  .cv-result { min-height: 34px; flex-direction: row; align-items: center; justify-content: center; gap: 14px; }
  .cv-pillars { flex-wrap: nowrap; gap: 14px; }
  .cv-pillar { font-size: 16px; gap: 5px; }
  .cv-coach { margin: 0; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cv-btn { min-height: 48px; padding: 0 16px; font-size: 16px; }
  .cv-btn-back { min-height: 48px; padding: 0 12px; font-size: 16px; }
  /* width: 30px -> ~32px tall, comfortably inside the 44px back button row
   * this breakpoint sets (844x390 lands here). */
  .cv-level-zoo-sign > svg { width: 30px; }
  .cv-result-pill { font-size: 15px; padding: 6px 14px; margin-bottom: 8px; }

  /* Two rows become one, twice — a shorter chrome silhouette, not a canvas-
   * height budget any more (T7 rework #2). flex-direction: row is the part
   * that actually does the merging: .cv-top/.cv-foot default to a COLUMN
   * (head above hint, result above actions) at every taller breakpoint. */
  .cv-top, .cv-foot {
    flex-direction: row;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-width: 0;
  }
  .cv-top { justify-content: flex-start; }
  .cv-top > .cv-head { flex: 0 0 auto; }
  /* A head that carries the enclosure sign OR the adventure bar must span
   * the whole row: both are centred on .cv-head's own box, and a head
   * shrunk to the back button put the sign on top of the button (measured
   * at 844x390) — the same overlap a bar would hit for the same reason. A
   * level that shows either is always a drawn place, so there is no hint
   * beside it to share the row. */
  .cv-top > .cv-head-wide { flex: 1 1 auto; }
  .cv-title { white-space: nowrap; }
  .cv-hint { flex: 1 1 auto; min-width: 0; }
  .cv-result { flex: 0 1 auto; min-height: 0; min-width: 0; }
  .cv-actions { flex: 0 0 auto; }

  /* The bar is already centred at every height — a short viewport only
   * needs it SMALLER, never restructured, so every pixel reclaimed here
   * still goes straight into canvas height (844x390 lands here). */
  .pistas-slots { gap: 4px; }
  .pistas-slots svg { width: 26px; height: 26px; }
  .pistas-animal img { height: 32px; }
}
`

export interface LevelPlayProps {
  level: LevelConfig
  record: LevelRecord
  /** Parent persists — this screen never writes storage. */
  onAttempt: (attempt: LevelAttempt) => void
  onNext: () => void
  onBack: () => void
  /**
   * This level's own adventure progress (`zoo/progress.ts`'s
   * `adventureProgress`), or `undefined`/`null` for a level with no bar to
   * show (no adventure at all, or a single-level one — see that function's
   * own doc). OPTIONAL: every caller that predates T6 (every hand-built test
   * fixture in this file) keeps rendering byte-identically without it.
   * `GameScreen` recomputes this from the store on every render, which is
   * what makes it advance the instant an attempt is saved — see that
   * screen's own `version` bump.
   */
  progress?: AdventureProgress | null
}

/**
 * Coarse uniform bucket grid over the dense ideal cloud.
 *
 * NO LONGER used for the off-path wall check (`onFrame` below) — that check
 * measures against the LOCAL stretch of `target.polyline` now
 * (`corridorTrack.ts`'s `corridorTick`), because the whole-cloud nearest
 * point is wrong for any route that doubles back on itself (`detective-mode`
 * defect fix: "the corridor walls do nothing" — a trace on `trail1` measured
 * CLOSER to the cloud 180 units off the wall than 23 units off it, because
 * stepping off one arm of the wave landed nearer a neighbouring arm).
 *
 * Still used for the assisted rail (`inkWarp`/`railPull` below): the rail is
 * a visual magnet toward the nearest ideal point, not a boundary test, and
 * still degrades to the single-arm cloud for every level with one path.
 * The off-path wall check itself now walks EVERY route
 * (`corridorTrack.ts`'s `multiCorridorTick`, `snake-drag-and-art-corridor`
 * design.md §4/amendment A2): a multi-path level's live feedback used to be
 * computed against `paths[0]` alone, reading the second and third snake as
 * permanently off-corridor. `multiCorridorTick` delegates to the untouched
 * `corridorTick` once per `target.routes` entry and reports the nearest.
 */
interface IdealGrid {
  cell: number
  cols: number
  rows: number
  buckets: Array<Array<readonly [number, number]>>
}

function buildIdealGrid(
  ideal: ReadonlyArray<readonly [number, number]>,
  corridorWidth: number,
  viewBoxWidth: number,
): IdealGrid {
  const cell = Math.max(40, corridorWidth)
  const cols = Math.max(1, Math.ceil(viewBoxWidth / cell))
  const rows = Math.max(1, Math.ceil(600 / cell))
  const buckets: Array<Array<readonly [number, number]>> = Array.from(
    { length: cols * rows },
    () => [],
  )
  for (const p of ideal) {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(p[0] / cell)))
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(p[1] / cell)))
    buckets[cy * cols + cx].push(p)
  }
  return { cell, cols, rows, buckets }
}

/** Nearest cloud point to `x`,`y` and its distance, or `{ point: null,
 * distance: Infinity }` when the 3×3 neighbourhood is empty — which already
 * proves the point is far enough out (see `IdealGrid`). The POINT is what the
 * assisted rail pulls toward; the DISTANCE alone answers the off-path test. */
function neighbourhoodNearest(
  grid: IdealGrid,
  x: number,
  y: number,
): { point: { x: number; y: number } | null; distance: number } {
  const cx = Math.min(grid.cols - 1, Math.max(0, Math.floor(x / grid.cell)))
  const cy = Math.min(grid.rows - 1, Math.max(0, Math.floor(y / grid.cell)))
  let best = Infinity
  let point: { x: number; y: number } | null = null
  for (let gy = cy - 1; gy <= cy + 1; gy++) {
    if (gy < 0 || gy >= grid.rows) continue
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      if (gx < 0 || gx >= grid.cols) continue
      for (const p of grid.buckets[gy * grid.cols + gx]) {
        const d = Math.hypot(x - p[0], y - p[1])
        if (d < best) {
          best = d
          point = { x: p[0], y: p[1] }
        }
      }
    }
  }
  return { point, distance: best }
}

/**
 * How much guide a level still shows. docs/03 §3 "Retiro progresivo de la
 * guía": the mechanism that forces the move from conscious control to motor
 * memory.
 *
 *   dominio  0–40   full guide + animated demonstration + visible checkpoints
 *   dominio 40–70   dotted guide, no demonstration
 *   dominio 70–90   start point and direction arrow only
 *   dominio 90+     ruled lines only (traced from memory)
 *
 * WITHDRAWAL APPLIES FROM PHASE 3 ONWARD ONLY. This is the correction to a real
 * defect: the bands were applied to every phase, so one accurate run through a
 * phase-1 maze permanently removed its walls and left a blank sheet with two
 * markers on it. A child reported exactly that and it looked like a rendering
 * bug for a whole round of debugging.
 *
 * The reason is not a tuning number, it is a category error. In phases 3-5 the
 * guide is SCAFFOLDING — the letter's silhouette, drawn so it can be taken away
 * once the movement is remembered. In phases 1-2 the corridor is THE LEVEL: the
 * whole task is "stay inside the channel", and the hazards and reset-on-contact
 * rules are defined against it. Removing it does not raise the difficulty, it
 * deletes the exercise. Nothing there is a memory test, so there is nothing to
 * withdraw.
 *
 * `dominio` is read as `record.bestAccuracy` — the only persisted quantity on
 * the doc's 0-100 scale, and accuracy IS the "did you keep to the shape"
 * measure the guide supports.
 *
 * Boundaries are lower-inclusive: reaching a threshold EARNS the lighter guide.
 *
 * `showGuide === false` still forces `'none'`: `f5-mama` is the motor-memory
 * exam and must stay one whatever the child's accuracy is.
 */
export type GuideLevel = 'full' | 'dotted' | 'minimal' | 'none'

export const GUIDE_DOTTED_FROM = 40
export const GUIDE_MINIMAL_FROM = 70
export const GUIDE_NONE_FROM = 90

/** Below this phase the corridor IS the exercise, so nothing is ever withdrawn. */
export const WITHDRAWAL_FROM_PHASE = 3

export function guideLevelFor(record: LevelRecord, level: LevelConfig): GuideLevel {
  if (!level.showGuide) return 'none'
  if (level.phase < WITHDRAWAL_FROM_PHASE) return 'full'
  const mastery = record.bestAccuracy
  if (mastery >= GUIDE_NONE_FROM) return 'none'
  if (mastery >= GUIDE_MINIMAL_FROM) return 'minimal'
  if (mastery >= GUIDE_DOTTED_FROM) return 'dotted'
  return 'full'
}

/**
 * Whether the demonstration plays. Renamed from the inline `playDemo`
 * literal it replaces (`level-engine` spec, "Routeless Demo Segments...",
 * design.md §2 D3's amendment-9 naming rule).
 *
 * **A found defect in design.md §2 D3, not silently followed.** The design
 * document states the formula as `!!level.demo && guide === 'full'`
 * (unchanged from the old `playDemo`) AND separately requires (§11.1 item
 * 5) that `demoPlays(level, 'none') === true` for a routeless `spines`
 * level with `demo: true`. Those two are mutually exclusive: every
 * hedgehog config carries `showGuide: false` (design.md §8's own literal
 * table), so `guideLevelFor` can never return anything but `'none'` for it
 * (`:617`, unconditional on `showGuide`) — under the UNCHANGED formula,
 * `demoPlays(hedgehog1, guideLevelFor(...))` is `false` FOREVER, and the
 * "second blocker" §2 D3 diagnosed would stay unfixed despite the rename.
 * §2 D3's own whole-catalog invariant ("`demoPlays(l, g) === (!!l.demo && g
 * === 'full')` for every `l` in `LEVELS`") cannot hold for every routeless
 * `spines` level AND satisfy §11.1 item 5's red-then-green demand at once.
 *
 * Resolution taken here: the guide-band gate is inapplicable to a level
 * that authors NO guide ladder in the first place — every `spines` level's
 * `showGuide` is unconditionally `false` (there is no mastery band to
 * withdraw FROM), so gating its demo on reaching the `'full'` band a
 * `showGuide: false` config can never reach is not "the band rule", it is
 * a vacuous permanent lock. `level.spines` (not the wider `kind: 'free'`,
 * to keep the change scoped to the one capability that needs it) bypasses
 * the guide check entirely; every other level — including every existing
 * `kind: 'free'` level, none of which declares `demo` — keeps the exact
 * unchanged formula, so the whole-catalog invariant holds for every level
 * this change does not touch.
 */
export function demoPlays(level: Pick<LevelConfig, 'demo' | 'spines'>, guideLevel: GuideLevel): boolean {
  if (level.spines) return !!level.demo
  return !!level.demo && guideLevel === 'full'
}

/** The three states a level attempt moves through: `demo` (the line draws
 * itself), `ready` (traceable), `result` (an attempt just resolved). */
export type LevelPhase = 'demo' | 'ready' | 'result'

/**
 * Defect fix (finding N8, "a touch during the demo starts the trace"): the
 * canvas below used to be `enabled={phase !== 'demo'}`, so `useTraceInput`'s
 * `pointerdown` handler refused the touch outright for as long as the demo
 * played (`options.enabled === false` returns before a single point is
 * captured) — a child who pressed down mid-demo got no ink and no response
 * at all, and had to lift and press again once `ready` arrived on its own
 * timer. The first attempt was silently lost.
 *
 * The canvas now stays enabled through the whole demo (see the `enabled`
 * prop below), so that SAME `pointerdown` starts a real stroke immediately —
 * `useTraceInput.startStroke` captures the first point and fires `onStart`
 * synchronously, in the same React event, before the next paint. This is the
 * pure decision `onStart` applies to the phase: a stroke starting during
 * `demo` ends it right there and moves straight to `ready`, so the very
 * point already captured keeps accumulating on the next frame — the child
 * never has to lift and press again, because nothing was ever refused. Any
 * other phase is returned unchanged: a stroke starting mid-`result` is the
 * ordinary retry a level already allows and is not this fix's concern, and
 * `ready` obviously has no demo left to end.
 */
export function endDemoOnStrokeStart(phase: LevelPhase): LevelPhase {
  return phase === 'demo' ? 'ready' : phase
}

/**
 * The standing line under the sheet, before the child has tried anything.
 *
 * It MUST describe what is actually on screen. A fixed "Empezá desde el punto
 * verde" was wrong on two levels at once: `f1-libre` has no route and therefore
 * no green dot, and `f5-mama` withdraws every mark and leaves only the ruled
 * lines. Telling a six-year-old who may not read fluently to start from a dot
 * that is not there is the worst kind of instruction — it cannot be obeyed and
 * it cannot be questioned.
 *
 * So the copy is derived from the same two values that decide what gets drawn:
 * the level's `kind` and the withdrawal band. Anything added to the chrome must
 * be added here too.
 */
export function standingHintFor(
  level: Pick<LevelConfig, 'kind' | 'surface'>,
  guideLevel: GuideLevel,
  demoPlaying: boolean,
): string {
  if (demoPlaying) return 'Mirá cómo se hace'
  // No route at all: there is nothing to start from and nowhere to arrive.
  if (level.kind === 'free') return 'Empezá donde quieras'
  // Every mark withdrawn (docs/03 §3, last band). Name what IS still there.
  if (guideLevel === 'none') {
    return level.surface === 'ruled' ? 'Guiate por los renglones' : 'Acordate del camino'
  }
  // Start dot and goal are both on screen from 'minimal' upward.
  return 'Del punto verde hasta la meta'
}

/**
 * Whether a trail's clue should file into the `PISTAS` rail (spec:
 * detective-mode "Trail Completion Lamp and Rail Filing").
 *
 * WHAT IT TAKES, AND WHAT IT STILL REFUSES TO TAKE. The second argument is
 * `reachedEnd` — `detective/clues.ts`'s `reachedTrailEnd` against the run's
 * monotone arc progress. It is NOT the clue marks' `lit` state, and the
 * original argument for that has not weakened: filing must be a fact about the
 * ROUTE the child walked, never a fact about the rewards that walk produced,
 * or the two become circular and a trail could file itself from a lucky
 * pattern of lit marks (spec scenario "Filing is refused mid-trace", D5,
 * `docs/05:14`). The finger still down with every mark earned files nothing —
 * `onRelease` is the only caller.
 *
 * WHY IT IS NO LONGER `evaluateLevel`'s `approved`. On a detective trail the
 * user overrode the three-pillar rule outright: "the only thing that matters
 * is that the finger does not leave the path; everything else is decoration".
 * Accuracy, checkpoint order and fluency are all a letter's concerns; a trail
 * asks one thing, and reaching the end of a `resetOnContact` corridor IS that
 * thing proven — leaving would have restarted the run. `evaluateLevel` itself
 * is untouched and still scores every letter level exactly as it did, and it
 * still runs on a trail: the attempt, the stars and the stored progress are
 * all unchanged. It is only the FILING decision that stopped consulting it.
 *
 * Pure and exported — like `guideLevelFor`/`standingHintFor` above — so the
 * decision is testable without simulating a pointer release.
 */
export function shouldFileClue(hasClueTrail: boolean, reachedEnd: boolean): boolean {
  return hasClueTrail && reachedEnd
}

/**
 * Whether a live `onFrame` sample should be folded into the clue-collection
 * state (defect fix: a real screenshot caught two marks lighting up while
 * the trace was far outside the corridor). Collection is gated on the SAME
 * inside/outside result the wall and tone channels already compute for this
 * sample — a mark is a reward for walking the route, not for being anywhere
 * on the sheet. Pure and exported — like `shouldFileClue` above — so the
 * gate is testable without a `setState` call, which this file's own harness
 * (`LevelPlay.test.tsx`) cannot observe: a `setState` updater passed outside
 * a live React tree is never invoked, so a test spying on what runs INSIDE
 * it would pass vacuously whether the gate is there or not.
 */
export function shouldTickClue(hasClueMarks: boolean, out: boolean): boolean {
  return hasClueMarks && !out
}

/**
 * [A1] Whether the live sample is outside the corridor — the guard a
 * routeless level was missing. `multiCorridorTick` (`corridorTrack.ts:188`)
 * returns `Infinity` for an empty `routes` array, so `distance >
 * corridorWidth / 2` was `true` on the very first drawing frame of every
 * `kind: 'free'` level: the child's live line rendered in `inkDimColor` for
 * the whole attempt, plus one spurious haptic pulse per stroke — a phantom
 * error signal `docs/03` §7 forbids. A level with no route has no wall to be
 * outside of, so a routeless level (`routeCount === 0`) is never off-path.
 *
 * Extracted as a named, exported pure function — like `shouldFileClue`/
 * `shouldTickClue` above — because this repo's harness (node, no jsdom, no
 * testing-library) cannot observe a decision made only inside `onFrame`'s
 * closure: nothing here re-renders after a live sample, so the only way to
 * prove the guard is testable is to name it.
 */
export function isOffPath(routeCount: number, distance: number, corridorWidth: number): boolean {
  return routeCount > 0 && distance > corridorWidth / 2
}

/** One of the three pillars (docs/03 §7): a star, a name, and a raw value —
 * shown side by side and NEVER averaged into a single grade. */
function Pillar({
  label,
  value,
  filled,
  muted = false,
}: {
  label: string
  value: string
  filled: boolean
  muted?: boolean
}) {
  return (
    // Sizing lives in `.cv-pillar` so a short viewport can shrink the readouts
    // and lay the three of them out on a single row (docs/04 §3.3).
    <span className="cv-pillar" style={{ color: muted ? '#94a3b8' : '#1e293b' }}>
      <span aria-hidden="true" style={{ color: muted ? '#cbd5e1' : filled ? '#eab308' : '#cbd5e1' }}>
        {filled && !muted ? '★' : '☆'}
      </span>
      {label} {value}
    </span>
  )
}

export default function LevelPlay({ level, record, onAttempt, onNext, onBack, progress }: LevelPlayProps) {
  // T7 rework #2 (orchestrator review, "fit the content box into the
  // viewport minus the chrome's safe insets"): .cv-top/.cv-foot's own
  // RENDERED CSS-pixel heights, measured live — the same real-browser-only
  // split every other measurement in this rework lives by (`ResizeObserver`,
  // `null`/`0` in SSR/tests). Neither row's height is a fixed constant: both
  // vary by breakpoint (the 820px/520px tiers above shrink padding, font
  // size, and — at 520px — merge head+hint into one row) and by content
  // (the enclosure sign or the adventure bar adds height to `.cv-head-wide`,
  // a demo button appears/disappears from `.cv-actions`). `TraceCanvas.tsx`
  // owns the actual fitting maths (`fitContentWithInsets`); this only hands
  // it the four numbers. Left/right stay a small fixed constant (`docs/09`'s
  // own "small side insets" — no element on either side actually needs
  // protecting, unlike the top/bottom rows).
  const topChromeRef = useRef<HTMLDivElement | null>(null)
  const bottomChromeRef = useRef<HTMLDivElement | null>(null)
  const [chromeInsets, setChromeInsets] = useState<{ top: number; bottom: number }>({ top: 0, bottom: 0 })
  useEffect(() => {
    const topEl = topChromeRef.current
    const bottomEl = bottomChromeRef.current
    if (!topEl || !bottomEl || typeof ResizeObserver === 'undefined') return undefined
    const measure = (): void => {
      setChromeInsets({ top: topEl.getBoundingClientRect().height, bottom: bottomEl.getBoundingClientRect().height })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(topEl)
    observer.observe(bottomEl)
    measure()
    return () => observer.disconnect()
  }, [])
  const SIDE_INSET = 16

  // Building the dense ideal cloud is the expensive part of a level load; it
  // may only re-run when the level or the adaptive width actually changes.
  const target = useMemo(
    () => buildLevelTarget(level, record.widthFactor),
    [level, record.widthFactor],
  )
  const grid = useMemo(
    () => buildIdealGrid(target.ideal, target.corridorWidth, target.viewBoxWidth),
    [target.ideal, target.corridorWidth, target.viewBoxWidth],
  )

  // Detective mode (design unit 6). `level.clue` is the sole discriminator
  // (`levels/types.ts`) — its absence means an ordinary level, and every
  // branch below stays a no-op. `f1-libre` omits it on purpose (task 10.5),
  // same as every level authored before this change.
  //
  // Two predicates from `levels/world.ts` (design.md §1), not one flag: a
  // case trail (`isCaseTrail`) files clues into the PISTAS rail and routes
  // to a deduction; being drawn IN the detective world (`inDetectiveWorld`)
  // is the wider idea — grass, mud ink, the standing octopus, the wordless
  // shell — that a case trail always implies but that Nivel 3 needs without
  // implying a case (D1).
  const isCase = isCaseTrail(level)
  const inWorld = inDetectiveWorld(level)
  const clueDef = level.clue
  const trailClueMarks = useMemo(
    () =>
      clueDef
        ? clueMarks(
            target.polyline,
            target.length,
            clueCountFor(target.length, clueDef.spacing),
            clueDef.kind,
          )
        : [],
    [clueDef, target.polyline, target.length],
  )

  // One demonstration per sub-path, played in sequence (docs/08 §5).
  // `target.demoPaths`, never `target.paths`/`level.paths`: for every
  // routed level this is the SAME array reference as `paths` (the target
  // is the CENTRED copy the engine scores against, so demo, corridor and
  // guide all sit exactly where the ideal cloud is — `buildLevel
  // centreHorizontally`); for a routeless `spines` level with `demo: true`
  // it is the generator's own first-k anchor→tip segments (the demo
  // repair, `radial-spines` capability, design.md §2 D3).
  const demos = useMemo<DrawDemo[]>(
    () =>
      target.demoPaths.map((d, idx) => ({
        d,
        delay: idx * DEMO_STEP_S,
        duration: DEMO_DURATION_S,
        strokeWidth: 12,
      })),
    [target.demoPaths],
  )
  const demoMs = target.demoPaths.length * DEMO_STEP_S * 1000 + 300

  // docs/03 §3. Everything the surface shows is a function of this, so it is
  // computed once and read all the way down.
  // Escape hatch for the withdrawal (docs/03 section 3). `bestAccuracy` is a
  // MONOTONIC maximum, so without this a child who scored 72 once could never
  // see the shape again — not even on the day they cannot remember it. Earning
  // the lighter guide must not mean losing the right to ask for help.
  const [guideRequested, setGuideRequested] = useState(false)
  const earnedGuideLevel = guideLevelFor(record, level)
  // A request restores the full guide for THIS visit only; nothing is persisted,
  // so the earned band is exactly where the child left it next time.
  const guideLevel = guideRequested && level.showGuide ? 'full' : earnedGuideLevel
  const showCorridor = guideLevel === 'full' || guideLevel === 'dotted'
  const showShapeLine = guideLevel === 'full'
  const showMarkers = guideLevel !== 'none'
  // The demonstration belongs to the FULL band alone: a child at 40+ has
  // already produced the shape, and replaying it for them is the crutch §3
  // exists to remove.
  const playDemo = demoPlays(level, guideLevel)

  const [phase, setPhase] = useState<LevelPhase>(playDemo ? 'demo' : 'ready')
  const [attempt, setAttempt] = useState<LevelAttempt | null>(null)
  const [strokes, setStrokes] = useState<ReadonlyArray<ReadonlyArray<TracePoint>>>([])
  const [offPath, setOffPath] = useState(false)
  const [clearSignal, setClearSignal] = useState(0)
  const [demoRun, setDemoRun] = useState(0)
  const [resetSignal, setResetSignal] = useState(0)
  const [restarted, setRestarted] = useState(false)
  const offPathRef = useRef(false)
  const lastCheckRef = useRef(0)
  const contactRef = useRef<ResetDebounce>(NO_CONTACT)
  // The child's progress along `target.polyline` (defect fix: "the corridor
  // walls do nothing"), carried between `onFrame` samples so the local wall
  // check follows the route instead of re-scanning it from scratch. Reset
  // wherever a run starts over — `resetSurface` (new level, cleared attempt,
  // demo replay) and `restartRun` (contact reset) both send it back to the
  // start of the route, exactly like `contactRef` above.
  const corridorTrackRef = useRef<RouteTrack>(routeTrackStart(target.routes.length))
  // Hoisted above the arrange state below so `?debug=ordenadas:<k>` can seed
  // it at mount — `arrangeDebugCount`/`isSpineDebug` are both ungated
  // (design.md §8), the same reasoning `isSectorDebug` already carries.
  const debugSearch = typeof window === 'undefined' ? '' : window.location.search
  // Before the tracing opens, the child drags this level's art-corridor
  // pieces into their own hollows, smallest to largest (`object-arrange`
  // spec, design.md §5.2). Absent `level.arrange` = no arrange phase, the
  // dummy config below is never consulted for real gating since
  // `arrangeOpen` is `false` whenever `level.arrange` itself is absent.
  const arrangeConfig = level.arrange ?? EMPTY_ARRANGE_CONFIG
  // Every reset site (the initial `useState` below, `resetSurface`,
  // `restartRun`) MUST go through this, never `initialArrange` directly —
  // see `seedArrange`'s own doc comment for the bug this closes.
  const seedArrangeState = useCallback(
    (): ArrangeState => seedArrange(arrangeConfig, level.arrange ? arrangeDebugCount(debugSearch) : null),
    [arrangeConfig, level.arrange, debugSearch],
  )
  const [arrangeState, setArrangeState] = useState<ArrangeState>(seedArrangeState)
  const arrangeOpen = !!level.arrange && !isArranged(arrangeState)
  // The SAME layer serves both phases (trace-canvas spec): during arrange,
  // each piece's box is its live scatter/held/snapped position; once
  // arranged (or on a level with no `arrange` at all), it is
  // `placeArtCorridor`'s own placement — the SAME box `target.artCorridor`
  // already carries, so nothing here recomputes placement independently.
  const traceArtCorridor: TraceArtCorridor | undefined = useMemo(() => {
    const placements = target.artCorridor // ArtCorridorPlacement[]: box/rotate
    const configPieces = level.artCorridor // ArtCorridorPiece[]: art.href
    if (!placements || !configPieces || placements.length === 0) return undefined
    const homeBoxes = placements.map((p) => p.box)
    if (arrangeOpen) {
      return arrangeRenderPieces(
        arrangeState,
        configPieces.map((p) => ({ href: p.art.href, rotate: p.rotate })),
        homeBoxes,
        arrangeConfig,
      )
    }
    return configPieces.map((piece, i) => ({
      href: piece.art.href,
      box: placements[i].box,
      rotate: placements[i].rotate,
    }))
  }, [target.artCorridor, level.artCorridor, arrangeOpen, arrangeState, arrangeConfig])
  // A trail's marks lit so far this run (drained → earned, `clueTick`), and
  // whether its ONE clue has been filed into the rail. Filing rides
  // `onRelease`'s existing approval signal — never the marks alone (spec
  // scenario "Filing is refused mid-trace", D5): all marks earned but the
  // route not completed must leave both of these exactly where they started.
  //
  // [T6, adventure-flow-and-map-guidance] The old rail's OWN local
  // `clueFiled`/`setClueFiled` state is gone: the new bar's "filed" comes
  // from `progress` (store-derived, `zoo/progress.ts`), which is what makes
  // it advance for every slot, not only the current one, and what makes it
  // recompute correctly across a level change without a local reset effect
  // to remember. `shouldFileClue` itself is untouched below — it is still
  // directly unit-tested as the documented rule ("filing rides arc
  // progress, not approval") even though nothing in this component calls it
  // as a production decision any more.
  const [clueState, setClueState] = useState<ClueState>(() => emptyClueState(trailClueMarks.length))
  // Whether THIS run has reached the end of the trail — the one thing a
  // detective trail asks (`reachedTrailEnd`). It drives the lamp standing at
  // the end of the route, which lights the moment the child arrives rather
  // than waiting for the finger to lift: "al llegar al final se prende la
  // lámpara". The ref is what `onRelease` reads, because a `setState` from
  // `onFrame` has not necessarily committed by the time the finger lifts in
  // the same tick, and filing must not depend on that race.
  const reachedEndRef = useRef(false)
  const [trailLampOn, setTrailLampOn] = useState(false)
  // The reveal grid's live fold (`reveal-grid` capability, design.md §4.2) —
  // the erase set / light latch for THIS attempt. Reset wherever a run
  // starts over, exactly like `corridorTrackRef` above. Seeded from
  // `initialRevealState` (Phase 6, design.md §9) rather than the bare
  // `EMPTY_REVEAL` constant, so a screenshot-seeding debug flag survives
  // the mount effect below (which calls `resetSurface` unconditionally on
  // every level change, including the very first render) instead of being
  // silently wiped the instant the effect flushes.
  const [revealState, setRevealState] = useState(() => initialRevealState(level.reveal, debugSearch))
  // `?debug=linterna:<x>,<y>` REPLACES live pointer input for a light-mode
  // level's fold (`reveal-grid` spec "Screenshot Seeding Flags for Render
  // State") — the two `onFrame` sites below skip the live tick entirely
  // while this is set, so the pinned point from `initialRevealState`
  // survives untouched regardless of any live sample.
  const debugLightPoint =
    level.reveal?.mode === 'light' ? lightDebugPoint(debugSearch) : null

  // T10 (`odd/tasks/prewriting-stage-completion.md`, "add animations to the
  // darkness"): the reveal projection below (`reveal` useMemo) needs a clock
  // to ease a growing radius against, but `revealState` itself only changes
  // on a genuine fold edge (a new object latching, the torch moving past
  // `REVEAL_EPSILON`) — a still torch mid-grow would never re-render
  // otherwise. `animNow` is that clock, ticked from the SAME `onFrame`
  // sample every other live fold already rides (no second rAF loop), but
  // only a `setState` while something is actually animating
  // (`isLightAnimating`) and only every `LIGHT_ANIM_TICK_MS` — a plain idle
  // level (the overwhelming majority of every frame ever sampled here)
  // costs one `Map`/`Set` scan over at most a handful of found objects, no
  // `setState` at all. `performance.now()`, matching `onFrame`'s own
  // `timeMs`/`releasedRevealState`'s own clock (their headers explain why
  // `Date.now()` here would be a scale mismatch, not just a cosmetic one).
  const [animNow, setAnimNow] = useState<number>(() => performance.now())
  const revealStateRef = useRef(revealState)
  useEffect(() => {
    revealStateRef.current = revealState
  }, [revealState])
  const lastAnimTickRef = useRef(0)
  // Read once per mount, the same one-shot convention `isPortraitGuidanceViewport`
  // itself uses — see `prefersReducedMotion`'s own header for why a listener
  // is not worth it here.
  const reducedMotionRef = useRef(prefersReducedMotion())

  // The waypoint fold's live latch (`free-trail-waypoints` capability,
  // design.md §2.3) — the lit-flower / home set for THIS attempt. `waypointRef`
  // mirrors the same shape `corridorTrackRef` already uses: the pulse needs a
  // before/after comparison and a `setState` updater must stay pure, so the
  // fold is folded into a ref first and mirrored into state for rendering.
  // Seeded from `initialWaypointState`, the same reason `revealState` reads
  // `initialRevealState` rather than the bare `EMPTY_WAYPOINTS` constant.
  const waypointRef = useRef<WaypointState>(initialWaypointState(level.waypoints, debugSearch))
  const [waypointState, setWaypointState] = useState<WaypointState>(waypointRef.current)
  // `?debug=estela:<k>` REPLACES live pointer input for the waypoint fold —
  // the same contract `debugLightPoint` carries for a light-mode reveal
  // level: the seeded state survives untouched regardless of any live
  // sample, so a screenshot is never fighting a real onFrame call it cannot
  // receive anyway.
  const waypointPin = !!level.waypoints && waypointDebugCount(debugSearch) !== null

  // The spine fold's live latch (`radial-spines` capability, design.md §6)
  // — `spineRef`'s own shape mirrors `waypointRef` above exactly, for the
  // same reason: `spineSettle`'s recount needs a before/after comparison
  // for the one-shot haptic edge, and a `setState` updater must stay pure.
  // Seeded from `initialSpineState`, never the bare `EMPTY_SPINES`
  // constant.
  const spineRef = useRef<SpineState>(initialSpineState(level.spines, debugSearch))
  const [spineState, setSpineState] = useState<SpineState>(spineRef.current)
  // `?debug=espinas:<k>` REPLACES live pointer input for the spine fold —
  // the same contract `waypointPin`/`debugLightPoint` carry: the seeded
  // state survives untouched regardless of any live sample.
  const spinePin = !!level.spines && spineDebugCount(debugSearch) !== null

  // The camera's own world x-origin (`scrolling-camera` capability). ONE
  // initialiser, `seedCameraFor`, called from mount (this `useState`
  // initializer), `resetSurface` below, AND `restartRun` — `seedArrangeState`'s
  // own scar, where a reset site calling the raw initialiser directly
  // silently wiped the screenshot seed. Absent `level.camera` = 0 always, and
  // the camera code path below never renders a `camera` prop at all.
  const [cameraOriginX, setCameraOriginX] = useState<number>(() =>
    seedCameraFor(level, target, debugSearch),
  )

  const resetSurface = useCallback((): void => {
    setAttempt(null)
    setStrokes([])
    setOffPath(false)
    offPathRef.current = false
    contactRef.current = NO_CONTACT
    corridorTrackRef.current = routeTrackStart(target.routes.length)
    // Progress and the lamp go back with the track they are derived from.
    reachedEndRef.current = false
    setTrailLampOn(false)
    setRestarted(false)
    setClearSignal((n) => n + 1)
    setRevealState(initialRevealState(level.reveal, debugSearch))
    // The waypoint latch resets with the run too — `docs/13` §6's
    // "posibilidad de reinicio" — THROUGH `initialWaypointState`, never the
    // bare `EMPTY_WAYPOINTS`, for the exact reason `seedArrangeState` above
    // is never bypassed either.
    waypointRef.current = initialWaypointState(level.waypoints, debugSearch)
    setWaypointState(waypointRef.current)
    // The spine latch resets with the run too, THROUGH `initialSpineState`,
    // never the bare `EMPTY_SPINES` — `initialWaypointState`'s own reason
    // above, restated (`radial-spines` capability, design.md §6).
    spineRef.current = initialSpineState(level.spines, debugSearch)
    setSpineState(spineRef.current)
    // The arrangement resets to its deterministic scatter with the run —
    // `docs/13` §6's "posibilidad de reinicio", free (object-arrange spec).
    // THROUGH `seedArrangeState`, never `initialArrange` directly, or this
    // mount effect's own call silently wipes `?debug=ordenadas:<k>` the
    // instant it fires (task 8.7/8.8's own regression).
    setArrangeState(seedArrangeState())
    // The camera resets to its seeded origin with the run, through the SAME
    // initialiser the mount `useState` above uses (`scrolling-camera` §2.4:
    // "otherwise the child restarts with the world parked at the route's
    // end and the green start dot off-screen").
    setCameraOriginX(seedCameraFor(level, target, debugSearch))
  }, [
    level.reveal,
    level.waypoints,
    level.spines,
    level.camera,
    debugSearch,
    target.routes.length,
    target.viewWidth,
    target.viewBoxWidth,
    arrangeConfig,
    seedArrangeState,
  ])

  // A new level starts its own flow: demo first when the level asks for one AND
  // the child is still in the full-guide band. A trail's clue state and filed
  // flag belong to THIS run — a fresh level (or a restart of the same one via
  // `level.id` staying put but `clueDef` changing is not possible, so this
  // effect is the one place they reset) starts every mark drained again.
  useEffect(() => {
    setPhase(playDemo ? 'demo' : 'ready')
    resetSurface()
    setClueState(emptyClueState(trailClueMarks.length))
  }, [level.id, playDemo, resetSurface, trailClueMarks.length])

  // Voice narration (docs/18 D1/D24/D26, §3 "Todo se escucha"; T7): every
  // level's hint is also SPOKEN, not merely displayed. `!drawnPlace` in the
  // header below only gates the WRITTEN sentence (Orchestrator Correction
  // C1's "no text in the detective world" rule) — it is exactly the
  // drawnPlace levels (the zoo entrance's erase/light picture and every
  // detective-world trail, bee and hedgehog included) that carry NO
  // on-screen instruction at all today, which is precisely the D24/D26
  // complaint ("sin consigna"). Speaking unconditionally, regardless of
  // `drawnPlace`, is what actually closes that gap; a classic (non-world)
  // level's own written `.cv-hint` gains a spoken twin too, which costs it
  // nothing. `useNarration` is what checks `canAutoSpeak()`/mute before ever
  // touching `speechSynthesis` — this call only decides WHEN, never WHETHER
  // a given device is allowed to speak.
  useNarration(level.hint)

  // The erase/light SUCCESS line is narrated too, the instant it appears
  // (docs/18 D1/T7) — `resultSpeechLine` (above `eraseResultMessage`) is the
  // exact same text `.cv-result-pill` shows, `null` for a coaching ("keep
  // going") message or for a level with no `reveal` mode, matching what
  // that pill itself only shows on `attempt.approved`. Keyed on the
  // `attempt` OBJECT (a fresh reference on every `onRelease`'s own
  // `setAttempt`, below) rather than on `attempt.approved` alone, so
  // replaying an already-clean level and succeeding again is announced
  // again instead of silently skipped for "looking unchanged".
  useEffect(() => {
    if (!attempt) return
    const line = resultSpeechLine(level.id, level.reveal?.mode, attempt.approved)
    if (line) speak(line)
  }, [attempt, level.id, level.reveal?.mode])

  useEffect(() => {
    if (phase !== 'demo') return
    const t = window.setTimeout(() => setPhase('ready'), demoMs)
    return () => window.clearTimeout(t)
  }, [phase, demoMs, demoRun])

  // ---- Live feedback channels (docs/01 principle 2, docs/02 §7.2) ----------
  const feedback = level.feedback
  // A `free` level has no route, so there is no "outside" to be sent back from
  // and nowhere to be sent back TO. The rule needs a path to mean anything.
  const resetOnContact = level.resetOnContact && level.kind === 'path'

  // The sustained corridor tone. Created here but SILENT and device-free until
  // the first `setActive(true)`, which can only happen mid-stroke — that is the
  // user gesture the autoplay policy wants. Disposed on unmount and on every
  // level change, or the oscillator would outlive the screen.
  const toneRef = useRef<TraceTone | null>(null)
  useEffect(() => {
    if (!feedback.tone) return
    const tone = createTraceTone()
    toneRef.current = tone
    return () => {
      tone.dispose()
      toneRef.current = null
    }
  }, [feedback.tone, level.id])

  // A result is on screen: the finger is off the glass, so the light is off.
  useEffect(() => {
    if (phase !== 'ready') toneRef.current?.setActive(false)
  }, [phase])

  // Rhythm cue (docs/01 fase 2: "planificación motora, ritmo"). Runs only while
  // the level is actually traceable — never under the demonstration, never over
  // a result — and is torn down by the effect cleanup on both.
  const [beatOn, setBeatOn] = useState(false)
  const metronomeBpm = feedback.metronomeBpm
  useEffect(() => {
    if (metronomeBpm <= 0 || phase !== 'ready') {
      setBeatOn(false)
      return
    }
    let flash = 0
    const id = window.setInterval(() => {
      playBeatTick() // best-effort; stays silent until the first gesture
      setBeatOn(true)
      window.clearTimeout(flash)
      flash = window.setTimeout(() => setBeatOn(false), BEAT_FLASH_MS)
    }, 60000 / metronomeBpm)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(flash)
      setBeatOn(false)
    }
  }, [metronomeBpm, phase, level.id])

  // Assisted rail (docs/03 §6). Strength decays with attempts at THIS level and
  // with proximity to the route; at zero the transform is dropped entirely so
  // the ink loop pays nothing for it.
  const railStrength = feedback.rail ? railFade(record.attempts) : 0
  const inkWarp = useMemo(() => {
    if (railStrength <= 0) return undefined
    return (p: TracePoint): { x: number; y: number } =>
      railPull(p.x, p.y, neighbourhoodNearest(grid, p.x, p.y), target.corridorWidth, railStrength)
  }, [railStrength, grid, target.corridorWidth])

  // ---- Timed hazards (docs/08, `LevelConfig.obstacles`) --------------------
  // The geometry is the pure `obstacleAt`; the screen only binds it to this
  // level's target and hands it to the surface, which calls it once per hazard
  // per frame off its own clock. The hit test below calls the SAME pure pair
  // with the SAME clock reading, so what hits the child is always what they
  // were looking at.
  const obstacles = useMemo(() => level.obstacles ?? [], [level.obstacles])
  const obstaclesRef = useRef(obstacles)
  obstaclesRef.current = obstacles
  const hazards = useMemo<TraceHazards | undefined>(
    () =>
      obstacles.length > 0
        ? {
            radii: obstacles.map((o) => o.radius),
            at: (index: number, timeMs: number) => obstacleAt(obstacles[index], target, timeMs),
            art: level.hazardArt,
          }
        : undefined,
    [obstacles, target, level.hazardArt],
  )

  // ---- Restart the run on contact (docs/01 principle 2) --------------------
  /**
   * Touching a wall or a hazard sends the run back to the start: the ink goes
   * (fading, in `TraceCanvas`), the completed strokes go, and the child begins
   * again from the green dot.
   *
   * What deliberately does NOT happen: no attempt is recorded, so `onAttempt`
   * is never called and no score, no star and no stored progress moves. An
   * abandoned run is not a failed one — principle 2 forbids scolding, and a
   * penalty is a scolding with arithmetic. The haptic pulse is the SAME neutral
   * buzz leaving the corridor already gives (`haptics.ts`), not an error tone.
   */
  const restartRun = useCallback((): void => {
    contactRef.current = NO_CONTACT
    // Back to the start of the route with NO progress banked. This is what
    // makes "reached the end" mean "reached the end without leaving": the only
    // way `maxArc` survives to the far end is a run that never triggered this.
    corridorTrackRef.current = routeTrackStart(target.routes.length)
    reachedEndRef.current = false
    setTrailLampOn(false)
    offPathRef.current = false
    setOffPath(false)
    setAttempt(null)
    setStrokes([])
    setArrangeState(seedArrangeState())
    // `restartRun` does NOT call `resetSurface` — it duplicates a subset of
    // its resets inline — so the camera's own reseed (design.md §2.4: "back
    // to the SAME seeded origin, through the SAME initialiser") must be
    // repeated here too, or a contact reset would leave the world parked
    // mid-route while the ink vanished (§2.4's own stated failure mode).
    setCameraOriginX(seedCameraFor(level, target, debugSearch))
    toneRef.current?.setActive(false)
    setResetSignal((n) => n + 1)
    setRestarted(true)
    setRevealState(EMPTY_REVEAL)
    // A FOUND, LATENT DEFECT, recorded rather than silently fixed here
    // (`radial-spines` design.md §6/§9 item 5): this resets the waypoint
    // fold with the BARE `EMPTY_WAYPOINTS` constant, exactly the shipped-bug
    // shape `arrange.ts`'s own `seedArrange` doc comment warns about — it
    // would wipe a `?debug=estela:<k>` seed instead of reseeding through
    // `initialWaypointState`. It is unreachable today (only
    // `resetOnContact: true` reaches `restartRun`, and no free level sets
    // it), so a neighbouring capability's bug is not repaired in passing
    // here; it stays exactly as it was before this change.
    waypointRef.current = EMPTY_WAYPOINTS
    setWaypointState(EMPTY_WAYPOINTS)
    // The spine latch resets the SAME way `resetSurface` does — THROUGH
    // `initialSpineState`, never a bare constant, so this new field does
    // not repeat the waypoint fold's own bug the moment it is born.
    spineRef.current = initialSpineState(level.spines, debugSearch)
    setSpineState(spineRef.current)
    // The route itself is starting over, so any clue marks lit during the
    // abandoned pass go with it — the child will pass them again on the way
    // back through. The FILED rail clue is untouched: filing only ever
    // happens on a completed, approved trail (below), never mid-run, so
    // there is nothing here for a contact restart to undo.
    if (clueDef) setClueState(emptyClueState(trailClueMarks.length))
    // `false → true` forces exactly one pulse through the same edge rule the
    // off-path channel uses, so a restart can never turn into a buzzing nag.
    if (feedback.haptics) pulseOnLeaving(false, true)
  }, [
    feedback.haptics,
    clueDef,
    trailClueMarks.length,
    target.routes.length,
    seedArrangeState,
    level.camera,
    level.spines,
    debugSearch,
    target.viewWidth,
    target.viewBoxWidth,
  ])

  // The cue is a passing line, not a state the child has to dismiss.
  useEffect(() => {
    if (!restarted) return
    const t = window.setTimeout(() => setRestarted(false), RESTART_CUE_MS)
    return () => window.clearTimeout(t)
  }, [restarted, resetSignal])

  // A new stroke means the child has moved on; the cue has done its job. It
  // is ALSO the demo's own end signal (N8, `endDemoOnStrokeStart` above): a
  // functional `setPhase` update reads the LATEST phase at commit time, so
  // this callback stays referentially stable (empty deps) without ever
  // closing over a stale `phase`.
  // T7 (the "Borrar"/repeat button is gone on a drawn place): a fresh touch
  // that starts right after a FAILED attempt must clear the old ink itself.
  // `clearOnFailedRetryRef` is set below, once `drawnPlace`/`level.kind` are
  // in scope — folded into a ref (not a direct dependency here) only so
  // `onStart` itself can stay declared next to the other stroke-lifecycle
  // callbacks it has always lived beside, instead of moving past a third of
  // this file to sit after `drawnPlace`.
  const clearOnFailedRetryRef = useRef(false)
  const onStart = useCallback((): void => {
    setRestarted(false)
    setPhase(endDemoOnStrokeStart)
    if (clearOnFailedRetryRef.current && attempt && !attempt.approved) {
      resetSurface()
    }
  }, [attempt, resetSurface])

  // Live corridor feedback (docs/03 §6 "salirse atenúa el trazo, no lo corta"):
  // throttled to ~30 Hz so it never competes with the 60fps ink loop, and it
  // only ever flips a boolean — the stroke keeps being captured either way.
  // The tone and the haptic pulse ride on THIS ONE SAMPLE; none of them scans
  // the cloud again.
  const onFrame = useCallback(
    (points: TracePoint[], drawing: boolean, timeMs: number) => {
      // T10: the flashlight grow's own clock tick — rides this SAME sample,
      // ahead of every early return below, so a growing light still animates
      // even mid-arrange or mid-drag. `isLightAnimating` is a cheap scan (at
      // most a handful of found objects), so it is safe to run every frame;
      // only the throttled `setState` is gated behind it actually finding
      // something to animate.
      if (level.reveal?.mode === 'light' && isLightAnimating(revealStateRef.current, timeMs)) {
        if (timeMs - lastAnimTickRef.current >= LIGHT_ANIM_TICK_MS) {
          lastAnimTickRef.current = timeMs
          setAnimNow(timeMs)
        }
      }
      // The arrange phase (object-arrange spec) redirects the SAME per-frame
      // sample instead of adding a second pointer-capture mechanism: no
      // wall/clue/reveal fold runs while a level's pieces are not yet home.
      if (arrangeOpen) {
        const head = points[points.length - 1] ?? { x: 0, y: 0 }
        const boxes = (target.artCorridor ?? []).map((piece) => piece.box)
        setArrangeState((prev) => arrangeTick(prev, boxes, head, drawing, arrangeConfig))
        return
      }
      // The waypoint fold rides this SAME sample (`free-trail-waypoints`
      // capability, design.md §2.3) — no second pointer-capture mechanism
      // and no second per-frame sample. `waypointTick` reads `drawing`
      // itself, so this runs on every sample, drawing or not, exactly like
      // `revealTick`'s own two call sites below. Folded into a REF first
      // (`waypointRef`, the shape `corridorTrackRef` already uses) rather
      // than only a `setState` updater, because the haptic pulse needs a
      // before/after comparison and a state updater must stay pure.
      // `!waypointPin` mirrors the shipped `!debugLightPoint` guard: the
      // flag REPLACES live input rather than racing it.
      if (level.waypoints && !waypointPin) {
        const next = waypointTick(waypointRef.current, points, drawing, level.waypoints)
        if (next !== waypointRef.current) {
          const opened =
            next.lit.size > waypointRef.current.lit.size || (next.home && !waypointRef.current.home)
          waypointRef.current = next
          setWaypointState(next)
          // The contact worth feeling here: with A1's repair `pulseOnLeaving`
          // never fires on a bee level (there is no route to leave), so
          // `haptics: true` needs a real site — a flower opening or the hive
          // being reached. The shipped one-shot edge, restated.
          if (opened && feedback.haptics) pulseOnLeaving(false, true)
        }
      }
      // The spine fold's live half rides this SAME sample (`radial-spines`
      // capability, design.md §2 D1) — `aiming` only, never scoreable, so
      // no haptic fires here: a spine is a spine only once it ends, and
      // the one-shot edge lives at RELEASE (`onRelease`'s recount below).
      // `!spinePin` mirrors the shipped `!waypointPin`/`!debugLightPoint`
      // guard: the flag REPLACES live input rather than racing it.
      if (level.spines && !spinePin) {
        const next = spineAim(spineRef.current, points, drawing, level.spines)
        if (next !== spineRef.current) {
          spineRef.current = next
          setSpineState(next)
        }
      }
      if (!drawing) {
        toneRef.current?.setActive(false) // finger up: the light goes out
        contactRef.current = NO_CONTACT // a finished stroke owes nothing
        if (offPathRef.current) {
          offPathRef.current = false
          setOffPath(false)
        }
        // The reveal grid's fold also rides this sample: the finger lifting
        // is what turns the torch off (design.md §4.2's "the light goes out
        // when the finger lifts", one line above the tone's own version of
        // the same sentence). Skipped while `?debug=linterna` pins the
        // point — the flag replaces live pointer input entirely.
        if (level.reveal && !debugLightPoint) {
          setRevealState((prev) => revealTick(prev, points, false, level.reveal!, target.viewBoxWidth, timeMs))
        }
        return
      }
      // The surface's own frame clock, so the hazard hit test below asks about
      // the exact positions the hazards were just DRAWN at.
      const now = timeMs
      if (now - lastCheckRef.current < OFF_PATH_PERIOD_MS) return
      lastCheckRef.current = now
      const head = points[points.length - 1]
      if (!head) return
      // The LOCAL wall distance (defect fix: "the corridor walls do
      // nothing"), not the whole-cloud nearest point — see `corridorTrack.ts`
      // and the note on `buildIdealGrid` above. `corridorTrackRef` carries the
      // route position forward between samples, so a wavy or spiralled trail
      // never gets confused with a neighbouring arm of itself.
      const corridorSample = multiCorridorTick(
        target.routes,
        corridorTrackRef.current,
        head.x,
        head.y,
      )
      corridorTrackRef.current = corridorSample.track
      // A routeless level has no wall to be outside of (A1) — see
      // `isOffPath`'s own header for the defect this guards against.
      const out = isOffPath(target.routes.length, corridorSample.distance, target.corridorWidth)
      // "La linterna encendida": the tone sounds while the finger is INSIDE and
      // stops when it drifts. Silence is the whole message — there is no
      // out-of-corridor sound, because that would be the error sound docs/03 §7
      // forbids.
      if (feedback.tone) toneRef.current?.setActive(!out)
      if (out !== offPathRef.current) {
        // Rising edge only: at 30 Hz, pulsing on the LEVEL would buzz thirty
        // times a second for as long as the child stayed out (see `haptics.ts`).
        if (feedback.haptics) pulseOnLeaving(offPathRef.current, out)
        offPathRef.current = out
        setOffPath(out)
      }
      // The reveal grid's live fold rides this SAME sample too (design.md
      // §4.2, docs/02 §7.2) — no second cloud scan. Monotone; a still
      // finger costs a no-op setState (design.md §1.4's REVEAL_EPSILON).
      // Skipped while `?debug=linterna` pins the point (same guard as the
      // `!drawing` branch above).
      if (level.reveal && !debugLightPoint) {
        setRevealState((prev) => revealTick(prev, points, drawing, level.reveal!, target.viewBoxWidth, now))
      }
      // Detective mode's clue marks ride this SAME sample (design.md "The rAF
      // loop is not touched"; spec "Clue Collection State Machine") — no
      // second cloud scan. Gated on `!out`: a mark earned while the fingertip
      // is genuinely outside the corridor is the exact bug a screenshot caught
      // (two marks lit on a trace far off the trail) — collection is only
      // meaningful while the child is actually walking the route.
      // `clueTick` is monotone and returns the exact same state reference
      // when nothing flips, so an idle re-pass costs a no-op setState.
      if (shouldTickClue(!!clueDef && trailClueMarks.length > 0, out)) {
        const maxArc = corridorSample.track.tracks[corridorSample.active].maxArc
        setClueState((prev) => clueTick(prev, maxArc, trailClueMarks))
      }
      // Arriving at the end of the trail lights the lamp standing there. Same
      // sample, same monotone progress, and latched: it is an arrival, not a
      // zone the child can drift back out of. Only `restartRun` unlatches it,
      // which is the point — see `shouldFileClue`.
      //
      // `level.corridorWidth` is the AUTHORED width, deliberately not
      // `target.corridorWidth`: the adaptive one carries the child's
      // `widthFactor` and would move the finish line for them — see
      // `trailEndArc`.
      if (
        isCase &&
        !reachedEndRef.current &&
        reachedTrailEnd(
          corridorSample.track.tracks[corridorSample.active].maxArc,
          target.length,
          level.corridorWidth,
        )
      ) {
        reachedEndRef.current = true
        setTrailLampOn(true)
      }
      // Reset on contact rides THIS SAME sample. The wall answer is the `out`
      // already computed above and the hazard answer is one point-in-circle
      // test per obstacle — no second cloud scan, which is the rule docs/02
      // §7.2 sets for every live channel.
      if (resetOnContact) {
        const hazardHit =
          obstaclesRef.current.length > 0 &&
          hitObstacle(head, obstaclesRef.current, target, now) >= 0
        const next = contactTick(contactRef.current, out || hazardHit)
        contactRef.current = next
        if (next.reset) restartRun()
      }
    },
    [
      target,
      feedback.tone,
      feedback.haptics,
      resetOnContact,
      restartRun,
      clueDef,
      trailClueMarks,
      isCase,
      level.corridorWidth,
      level.reveal,
      level.waypoints,
      level.spines,
      debugLightPoint,
      waypointPin,
      spinePin,
      arrangeOpen,
      arrangeConfig,
    ],
  )

  // Every release re-evaluates the WHOLE stroke set: on a continuous level the
  // second stroke immediately shows its fluency penalty, and on a segmented one
  // the child keeps adding strokes and sees the set re-scored each time.
  const onRelease = useCallback(
    (_points: TracePoint[], pointerType: string, all: TracePoint[][]) => {
      // While the arrange phase is open, a release is never evaluated: no
      // ink is captured as a stroke, no attempt is recorded, no score moves
      // (object-arrange spec, "The Arrange Phase Gates Completion by
      // Sequencing, Not by a Second Score").
      if (arrangeOpen) return
      const snapshot = all.map((s) => s.slice())
      setStrokes(snapshot)
      setOffPath(false)
      offPathRef.current = false
      toneRef.current?.setActive(false)
      // The spine fold's AUTHORITATIVE recount (`radial-spines` capability,
      // design.md §2 D1) — the live fold never feeds the score, so the
      // settled `filled` set is recomputed here, from the SAME snapshot
      // `evaluateLevel` below scores, at RELEASE only: a spine is a spine
      // only once it ends. The one-shot haptic edge fires here, mirroring
      // the waypoint fold's own `opened` edge in `onFrame` above, but at
      // release rather than mid-stroke.
      if (level.spines && !spinePin) {
        const next = spineSettle(spineRef.current, snapshot, level.spines)
        if (next !== spineRef.current) {
          const grew = next.filled.size > spineRef.current.filled.size
          spineRef.current = next
          setSpineState(next)
          if (grew && feedback.haptics) pulseOnLeaving(false, true)
        }
      }
      // RAW points, always. `snapshot` is the captured stroke, never the
      // rail-warped copy the canvas draws — scoring the assist would make
      // accuracy a measurement of the rail instead of the child (see `rail.ts`).
      const releasedReveal = releasedRevealState(level.reveal, snapshot, target.viewBoxWidth)
      if (releasedReveal) setRevealState(releasedReveal)
      const result = evaluateLevel(snapshot, target, pointerType)
      setAttempt(result)
      setPhase('result')
      if (result.approved) playApprovalTone() // best-effort, approval only
      // `result` is reported to `onAttempt` exactly as before on every
      // level — the parent (`GameScreen`) persists it and bumps its own
      // `version`, which is what recomputes this level's `progress` prop
      // (`zoo/progress.ts`) with this attempt's own filing already in it.
      onAttempt(result)
    },
    [target, onAttempt, clueDef, arrangeOpen, level.spines, level.reveal, spinePin, feedback.haptics],
  )

  const replayDemo = (): void => {
    resetSurface()
    setPhase('demo')
    setDemoRun((n) => n + 1)
  }

  const clearAttempt = (): void => {
    resetSurface()
    setPhase('ready')
  }

  // `levels/buildLevel.ts`'s `levelStart`: `target.polyline[0]` for a routed
  // level, the authored `waypoints.start` for a routeless one that declares
  // it — the carrier-visibility repair, general (design.md §2.2). Byte-
  // identical to `target.polyline[0]` for every level that predates this.
  const startMarker = target.start
  // Where the start octopus's FEET actually land, on an art-corridor level:
  // beside the first piece's drawn body, not on the route's own point (which
  // sits on the body's centreline — `TraceStandingArt.at`'s own doc, N3).
  // Every other level keeps `undefined`, so `startArt` falls back to
  // `startMarker` exactly as it always has.
  const startArtAt = useMemo(() => {
    const piece0 = target.artCorridor?.[0]
    // Scoped to an UNROTATED piece (`snake1`/`snake2`/`snake4`'s shared
    // small snake): the "before the box" side maps to a plain horizontal
    // shift there, verified clear of the sheet and of the next piece down.
    // A rotated piece (`snake3`'s vertical column) maps that same side to a
    // different screen axis this fix was not verified against — it keeps
    // the unmoved default rather than risk an unverified placement.
    if (!piece0 || !startMarker || piece0.rotate) return undefined
    return standBesideArtCorridor(startMarker, piece0, OCTOPUS_STAND_MARGIN, true)
  }, [target.artCorridor, startMarker])
  const directionArrow = useMemo(() => directionArrowOf(target), [target])
  // Where the route ends. A `kind: 'free'` level has no route, so it gets no
  // goal — and no start dot and no arrow either, which is why the standing line
  // below has to be derived rather than fixed.
  //
  // [the carrier repair, recorded gap] `goalArt` stays dead on a `kind:
  // 'free'` level — not repaired here, deferred to row G, because the
  // hive's coordinate and its touch radius must live in the same object
  // (`WaypointConfig.goal` already is that object; `goalArt` alone is not).
  const endMarker = useMemo(
    () => (level.kind === 'path' ? goalMarkerOf(target) : undefined),
    [level.kind, target],
  )
  // Registry art standing where the route ends, in place of the two hollow
  // diamonds AND (T6, adventure-flow-and-map-guidance) the case lamp itself
  // — docs/18 §4.3's "the trail's goal shows the item instead of the light
  // bulb when feasible". Priority, in order:
  //
  //  1. `level.goalArt` (design.md §5) WINS over everything below: a
  //     level's own content beats a default it did not ask for. Orthogonal
  //     to `home/caseState.ts`'s lamp — no Nivel 3 id is in any case's
  //     `trailIds`, so it cannot move the office lamp by construction.
  //  2. The LAST level of an adventure that recovers an animal
  //     (`zoo/adventures.ts`'s `AdventureSubject.animal`) shows THAT
  //     animal — the encounter (docs/18 §4.3) — even when the level ALSO
  //     carries its own clue (`duck-trail4` does: `feather`). The animal is
  //     what this specific tramo is walking toward; a clue's own drained/
  //     earned pair would say nothing the last tramo's own payoff needs.
  //  3. Any OTHER case (clue) level shows its OWN clue's drained/earned
  //     pair instead of the generic lamp bulb — literally the "something
  //     the animal left behind" docs/18 §4.4 describes, drained until
  //     `trailLampOn` (reused byte-for-byte: an arrival, not an approval —
  //     see that state's own comment above) says the end is reached.
  //  4. Every OTHER routed level of a multi-level adventure (an
  //     `ADVENTURES` row with more than one level — the same "single-level
  //     row" exclusion `zoo/progress.ts`'s `adventureProgress` applies)
  //     shows the star (`ZOO_STAR_ART`) docs/18 §4.4 already uses in the
  //     bar itself: reaching it is EARNING it, the same sentence the map's
  //     own star counter tells.
  //  5. Everything else (an ordinary letter level, a level in no adventure
  //     at all) keeps rendering nothing here, byte-identical to before.
  const adventure = adventureFor(level.id)
  const isLastOfAnimalAdventure =
    !!adventure && adventure.animal !== undefined && adventure.levelIds[adventure.levelIds.length - 1] === level.id
  const isOtherRoutedAdventureLevel = !!adventure && adventure.levelIds.length > 1 && !isLastOfAnimalAdventure
  const endArt = level.goalArt
    ? { ...level.goalArt, size: GOAL_ART_SIZE }
    : isLastOfAnimalAdventure
      ? { ...ZOO_ANIMAL_ART[adventure!.animal!], size: END_MARK_SIZE }
      : clueDef
        ? {
            ...(trailLampOn ? CLUE_ART[clueDef.kind].art.earned : CLUE_ART[clueDef.kind].art.drained),
            size: END_MARK_SIZE,
          }
        : isOtherRoutedAdventureLevel
          ? { ...ZOO_STAR_ART, size: END_MARK_SIZE }
          : undefined

  // The corridor object is memoized so `TraceCanvas` can derive the tapered
  // geometry once per level instead of once per render.
  const corridor = useMemo<TraceCorridor | undefined>(
    () =>
      showCorridor
        ? { paths: target.paths, width: target.corridorWidth, taper: level.taper }
        : undefined,
    [showCorridor, target.paths, target.corridorWidth, level.taper],
  )

  // Settled ink of previous strokes, pulled the SAME way the live ink was, so
  // an assisted attempt does not visibly snap back the instant the finger
  // lifts. `strokes` itself stays raw — it is what was scored.
  const shownStrokes = useMemo(
    () => (inkWarp ? strokes.map((stroke) => stroke.map((p) => inkWarp(p))) : strokes),
    [strokes, inkWarp],
  )
  const fluencyEvaluated = level.rules.minFluency > 0
  // Same cost as the ideal grid and the same inputs, so it rides along.
  const band = useMemo(
    () => drawingBand(target.ideal, target.corridorWidth, level.surface),
    [target.ideal, target.corridorWidth, level.surface],
  )

  // Canvas clue layer (design unit 4, already shipped in `TraceCanvas`):
  // WHICH art a mark shows is resolved HERE, never inside the canvas
  // component (design.md "colour already resolved by the caller"). Drained
  // until `clueTick` says otherwise, then the trail's own earned art.
  //
  // The earned/drained swap is now an `href` swap rather than a `fill` swap.
  // The two files are derived from one silhouette by
  // `scripts/art/build_art.py`, so the mark does not move or change shape
  // when it lights up — only its colour does, which is exactly what the old
  // fill swap did.
  const traceClueMarks = useMemo<TraceClueMark[]>(() => {
    if (!clueDef) return []
    const art = CLUE_ART[clueDef.kind]
    return trailClueMarks.map((mark, idx) => {
      const img = clueState.lit[idx] ? art.art.earned : art.art.drained
      return {
        x: mark.x,
        y: mark.y,
        angle: mark.angle,
        href: img.href,
        w: img.w,
        h: img.h,
        size: CLUE_MARK_SIZE,
      }
    })
  }, [clueDef, trailClueMarks, clueState])

  // The ground (docs/09 §7). Keyed off `inDetectiveWorld`, the WORLD half of the
  // split — NOT off `level.clue`, which is the CASE half and which this comment
  // used to name, and not off `level.maze` either, which `catalog.ts`'s
  // `LEGACY_PHASE_1` rollback array also sets. The distinction became real with
  // Nivel 3: those levels stand on grass without carrying a single clue, so a
  // ground keyed off the clue would have left them on bare paper. Memoized on
  // the route and the corridor, NEVER recomputed per frame: a re-scatter
  // mid-run would make the field crawl under the child's finger.
  //
  // `halfWidthAt` is where a taper is respected: the same
  // `lerp(from, to, fraction)` `corridorTaper` uses to cut its pieces, so the
  // grass keeps clear of the channel's real edge rather than a nominal one.
  //
  // The two layers are seeded differently so the mud does not inherit the
  // grass's jitter pattern, and both are seeded from a CONSTANT rather than
  // from the level id: the field should be the same field every time this
  // trail is opened.
  // The sector's drawn backdrop (duck-undulations-and-sector-backdrop
  // design.md §3.4). `backdropFor` resolves through the level's ADVENTURE,
  // not through its sector directly — see that function's own header — so
  // this stays correct once the medusa's four levels get a row of their own.
  // Kept as the RAW registry row (not only the `TraceBackdrop`-shaped prop
  // below) so the reveal grid can read `tile`/`ink`/`inkDim` — fields
  // `TraceBackdrop` deliberately does not carry (design.md §2.5, §4.1).
  const backdropEntry = useMemo(() => backdropFor(level.id), [level.id])
  const backdrop = useMemo<TraceBackdrop | undefined>(() => {
    const b = backdropEntry
    return b ? { href: b.art.href, quiet: b.quiet, channel: b.channel } : undefined
  }, [backdropEntry])

  // The level is drawn in a PLACE — a sector's backdrop or the detective
  // world's ground — so the engine's own marker colours, all chosen against
  // paper, yield to ink. Today `backdrop ⇒ inWorld`, so every shipped level
  // renders byte-identically; the eight mountain levels are the first to be
  // a place without being the world (design.md §3.2).
  const drawnPlace = inWorld || !!backdrop
  // T7: see `onStart`'s own comment above (`clearOnFailedRetryRef`) — a
  // route level only (`level.kind === 'path'`), never a `free` one
  // (reveal/spines/waypoints/coverage), whose own accumulated strokes are
  // wanted progress, not noise. Never a classic (non-drawnPlace) level
  // either — out of this task's scope (cursive letters, docs/15).
  clearOnFailedRetryRef.current = drawnPlace && level.kind === 'path'

  // T7 auto-advance: a drawn-place level celebrates a real approval and then
  // calls the SAME `onNext` the old "Siguiente" button used — never a
  // separate advance path, so a skip stays exactly one ordinary approval
  // to `GameScreen` (progress save, next level/closing/map resolution).
  // `onNextRef` exists only so the timer below is not restarted by an
  // unrelated parent re-render changing `onNext`'s identity (`GameScreen`
  // defines it inline, fresh on every `version` bump) — the effect itself
  // depends on `celebrating` alone.
  const celebrating = drawnPlace && !!attempt?.approved
  const onNextRef = useRef(onNext)
  onNextRef.current = onNext
  const advancingRef = useRef(false)
  const [skipReady, setSkipReady] = useState(false)
  useEffect(() => {
    advancingRef.current = false
    setSkipReady(false)
    if (!celebrating) return undefined
    const grace = window.setTimeout(() => setSkipReady(true), CELEBRATE_SKIP_GRACE_MS)
    const advance = window.setTimeout(() => {
      if (advancingRef.current) return
      advancingRef.current = true
      onNextRef.current()
    }, CELEBRATE_MS)
    return () => {
      window.clearTimeout(grace)
      window.clearTimeout(advance)
    }
  }, [celebrating])
  const skipCelebration = (): void => {
    if (!skipReady || advancingRef.current) return
    advancingRef.current = true
    onNextRef.current()
  }

  const inkPolicy = resolveInkPolicy({
    revealMode: level.reveal?.mode,
    artCorridor: !!level.artCorridor,
    waypoints: !!level.waypoints,
    spines: !!level.spines,
    inWorld,
  })
  const [portraitGuidanceActive, setPortraitGuidanceActive] = useState(isPortraitGuidanceViewport)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(PORTRAIT_GUIDANCE_QUERY)
    const sync = () => setPortraitGuidanceActive(media.matches)
    sync()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync)
      return () => media.removeEventListener('change', sync)
    }
    media.addListener(sync)
    return () => media.removeListener(sync)
  }, [])
  // The window, when this level authors one (`scrolling-camera` capability).
  // Absent `level.camera` = no `camera` prop at all, so `TraceCanvas` renders
  // the shipped byte-identical expression. `viewWidth` comes from the
  // TARGET (already clamped by `buildLevel.ts`'s `Math.min`), never the raw
  // `level.camera.viewWidth`, so a camera window authored wider than its own
  // world can never reach the screen.
  const traceCamera: TraceCamera | undefined = level.camera
    ? { viewWidth: target.viewWidth, lead: level.camera.lead, originX: cameraOriginX }
    : undefined

  // Static art standing at the route's own peaks (design.md §3.3) — derived
  // from the BUILT route, never authored as coordinates, so no literal can
  // drift from a re-tuned generator call.
  const vertexArt = useMemo<TraceVertexArt | undefined>(() => {
    if (!level.vertexArt) return undefined
    const at =
      level.vertexArt.place === 'extrema'
        ? vertexArtPoints(routeExtrema(target.polyline), {
            // The AUTHORED width, never `target.corridorWidth` — the picture
            // must not move when adaptive tolerance widens the channel
            // (design.md §5.1, §5.3).
            corridorWidth: level.corridorWidth,
            size: level.vertexArt.size,
            clear: level.vertexArt.clear ?? 8,
          })
        : routeApexes(target.polyline)
    if (at.length === 0) return undefined
    return { ...level.vertexArt.art, size: level.vertexArt.size, at }
  }, [level.vertexArt, level.corridorWidth, target.polyline])

  const ground = useMemo<TraceGround | undefined>(() => {
    // A backdrop retires the scattered ground (docs/13 §4 decision 3): the
    // sector's own drawn place replaces the field/earth scatter, per
    // adventure, as each backdrop lands.
    if (!inWorld || !corridor || backdrop) return undefined
    const taper = level.taper
    const halfWidthAt = (t: number): number =>
      (corridor.width * (taper ? taper.from + (taper.to - taper.from) * t : 1)) / 2
    const shared = { halfWidthAt, viewBox: { x: 0, y: 0, width: target.viewBoxWidth, height: SHEET_HEIGHT } }
    return {
      grass: {
        marks: grassScatter({ ...shared, polyline: target.polyline, artCount: GROUND_GRASS.length, seed: 0x9e37 }),
        art: GROUND_GRASS,
      },
      mud: {
        marks: mudScatter({ ...shared, polyline: target.polyline, artCount: GROUND_MUD.length, seed: 0x7f4a }),
        art: GROUND_MUD,
      },
    }
  }, [inWorld, corridor, backdrop, level.taper, target.polyline, target.viewBoxWidth])

  // The reveal grid's covering layer (`reveal-grid` capability, design.md
  // §4.1-4.2): a pure projection from `revealState` + `level.reveal`, plus
  // the backdrop's own veil paint and the hidden objects' art, if any.
  const reveal = useMemo<TraceReveal | undefined>(() => {
    if (!level.reveal) return undefined
    const reducedMotion = reducedMotionRef.current
    const lightComplete = level.reveal.mode === 'light' && revealState.lit.size >= level.reveal.objects.length
    // T10 (`odd/tasks/prewriting-stage-completion.md`, "add animations to
    // the darkness"): completion no longer jumps straight from dark to the
    // `allRevealTiles` all-clear bypass. While the completion wash is still
    // growing (`completionGrowthFraction < 1`), the found objects keep
    // acting as real light sources — `canvas/RevealLayer.tsx` is the one
    // that grows their reach out to cover the whole screen, since it alone
    // knows `displayBounds`. Only once that grow has actually finished does
    // this fall back to the old bypass (no veil at all, forever, no more
    // per-frame cost).
    const completionGrowth =
      level.reveal.mode === 'light' ? completionGrowthFraction(revealState, animNow, reducedMotion) : 1
    const stillGrowingCompletion = lightComplete && completionGrowth < 1
    const tiles =
      lightComplete && !stillGrowingCompletion
        ? allRevealTiles(level.reveal, target.viewBoxWidth)
        : revealTiles(level.reveal, revealState, target.viewBoxWidth, animNow, reducedMotion)
    const art =
      level.reveal.mode === 'light'
        ? level.reveal.objects.map((o, idx) => ({
            href: o.art.href,
            w: o.art.w,
            h: o.art.h,
            size: o.size,
            x: o.x,
            y: o.y,
            revealed: revealState.lit.has(idx),
          }))
        : undefined
    // Every reveal-grid level ships a backdrop declaring `tile` (design.md
    // §2.5); the fallback only guards a level authored without one.
    const light =
      level.reveal.mode === 'light'
        ? lightComplete
          ? { x: 0, y: 0, radius: level.reveal.radius, complete: true, growth: stillGrowingCompletion ? completionGrowth : 1 }
          : revealState.point
            ? { x: revealState.point.x, y: revealState.point.y, radius: level.reveal.radius, complete: false }
            : null
        : null
    return {
      fill: backdropEntry?.tile ?? SHEET_PAPER,
      ...(isSandRevealLevel(level.id) ? { visual: 'sand' as const } : {}),
      ...(isLeavesRevealLevel(level.id) ? { visual: 'leaves' as const } : {}),
      // T4: the mud path (`sand3`/`sendero`, plus its dropped harder twin
      // `sand4`) used to fall through to the plain flat-fill tile contract —
      // the flat brown squares the user compared unfavourably to the drawn
      // sand and leaves. `isMudRevealLevel` is the SAME discriminant
      // `eraseResultMessage` above already uses for the mud wording.
      ...(isMudRevealLevel(level.id) ? { visual: 'mud' as const } : {}),
      tiles,
      art,
      light,
    }
  }, [level.id, level.reveal, revealState, target.viewBoxWidth, backdropEntry, animNow])

  // The waypoint fold's render projection (`free-trail-waypoints`
  // capability, design.md §5): N images (the flowers, then the hive), plus
  // — only under `?debug=estela:<k>` — their touch radii as debug rings.
  // `TORCH_CHALK` is this file's own shipped debug-overlay colour
  // (`?debug=espina`'s spine, above); the ring stroke is resolved HERE,
  // never inside `WaypointLayer` itself (`TraceClueMark`'s own convention).
  const waypointDebugK = level.waypoints ? waypointDebugCount(debugSearch) : null
  const waypoints = useMemo<TraceWaypoints | undefined>(() => {
    if (!level.waypoints) return undefined
    return {
      art: waypointArt(level.waypoints, waypointState),
      rings: waypointDebugK !== null ? waypointRings(level.waypoints) : undefined,
      ringStroke: TORCH_CHALK,
    }
  }, [level.waypoints, waypointState, waypointDebugK])

  // The spine fold's render projection (`radial-spines` capability,
  // design.md §5/§6): the body `<image>` plus every anchor mark, and —
  // only under `?debug=espinas:<k>` — the baseRadius rings. `dim`/`earned`
  // are resolved HERE, never inside `SpineLayer` itself (`TraceClueMark`'s
  // own convention): `TORCH_CHALK_DIM` for unfilled, `TORCH_CHALK` for
  // earned (design.md §2 D4's ink algebra).
  const spineDebugK = level.spines ? spineDebugCount(debugSearch) : null
  const spines = useMemo<TraceSpines | undefined>(() => {
    if (!level.spines) return undefined
    const { href, box } = spineBody(level.spines)
    return {
      body: { href, x: box.x, y: box.y, width: box.width, height: box.height },
      marks: spineMarks(level.spines, spineState),
      markRadius: SPINE_MARK_R,
      dim: TORCH_CHALK_DIM,
      earned: TORCH_CHALK,
      rings: spineDebugK !== null ? spineRings(level.spines) : undefined,
      ringStroke: TORCH_CHALK,
    }
  }, [level.spines, spineState, spineDebugK])

  // The spines themselves. There is no "spine" shape anywhere in
  // `SpineLayer` — the spine the child sees IS their own settled ink, drawn
  // by `TraceCanvas` from `completedStrokes`. So a flag that lights k marks
  // and draws no ink produces a frame the real game can never make: five
  // earned anchors on a bare hedgehog. That is amendment 8's failure exactly
  // (`docs/13` §4): ONE number must drive every render fact the flag
  // produces, or a still frame tells two stories at once and cannot answer
  // the one question it exists to answer ("do the spines look right?").
  // Each spine is its own stroke, so these ride as k EXTRA entries —
  // render-only, never in `strokes` (which `onRelease` overwrites from the
  // canvas's own captured list regardless), so never scored and never
  // persisted.
  const spineDebugStrokes = useMemo(() => {
    if (!level.spines || spineDebugK === null) return null
    return debugSpineStrokes(level.spines, spineDebugK)
  }, [level.spines, spineDebugK])

  // `?debug=estela:<k>`'s implied trail: `start`, the first `k` flowers, the
  // hive once `k` exceeds the stop count — the very picture the touch rings
  // above measure against, so the two cannot tell inconsistent stories (A4).
  // Render-only: passed as an EXTRA entry on `completedStrokes`, never in
  // `strokes` (which `onRelease` overwrites from the canvas's own captured
  // list regardless), so it is never scored and never persisted.
  const waypointDebugStrokes = useMemo(() => {
    if (!level.waypoints || waypointDebugK === null) return null
    return debugTrail(level.waypoints, waypointDebugK)
  }, [level.waypoints, waypointDebugK])

  // Where `?debug=estela:<k>` parks the bee. A4's argument is that ONE number
  // drives every render fact the flag produces, so a still frame cannot tell
  // two stories at once — and `debugCarrier` was written and tested for
  // exactly that. It was not wired, and the captures showed the cost: the
  // trail ran to the second flower while the bee sat at the start, which
  // reads as "she did not follow" — the opposite of the sentence this whole
  // family exists to teach (`docs/14` §10, "la abeja lo sigue inmediatamente").
  // A green test on an unreachable function is precisely paso E's own lesson
  // (`docs/13` §4 decision 7), so the assertion below this one reaches the
  // SCREEN's prop, not the helper.
  const waypointDebugCarrier = useMemo(() => {
    if (!level.waypoints || waypointDebugK === null) return null
    return debugCarrier(level.waypoints, waypointDebugK)
  }, [level.waypoints, waypointDebugK])

  const mainClassName = `${ground ? 'cv-play cv-play-ground' : 'cv-play'}${portraitGuidanceActive ? ' cv-play-portrait-guided' : ''}`
  const zooSign = PROLOGUE_ZOO_SIGNS[level.id as keyof typeof PROLOGUE_ZOO_SIGNS]
  // Named once so both the head's own width class and the bar's render
  // gate agree on the same truthiness check — `progress` is `undefined` for
  // every pre-T6 caller and `null` for a real level with nothing to show
  // (`zoo/progress.ts`'s own return type); both mean the same thing here.
  const hasProgressBar = !!progress

  return (
    <main
      className={mainClassName}
      style={backdrop ? { background: backdrop.quiet } : undefined}
      aria-describedby={portraitGuidanceActive ? 'cv-portrait-guidance' : undefined}
      // QA hook (adventure-flow-and-map-guidance T3): a stable, purely
      // structural identifier for whichever level is currently mounted, so a
      // Playwright driver (or any other outside-in probe) can assert "this is
      // glass1" without depending on visible copy that the detective world
      // deliberately keeps wordless (C1).
      data-level-id={level.id}
    >
      <style>{LAYOUT_CSS}</style>
      <div className="cv-top" ref={topChromeRef}>
      <header className={`cv-head${zooSign || hasProgressBar ? ' cv-head-wide' : ''}`}>
        <button
          type="button"
          onClick={onBack}
          className="cv-btn cv-btn-back"
          aria-label={drawnPlace ? 'Volver' : undefined}
        >
          {drawnPlace ? <BackIcon /> : '‹ Volver'}
        </button>
        {/* T3 revision (orchestrator QA regression): the sign used to get its
         * OWN row above the sheet (T5's first pass), which cost the sheet a
         * permanent ~84px of height on every enclosure level — measured
         * 1252x592 -> 1252x438 at 1280x720. Centring it here instead, inside
         * the row the back button already occupies, costs .cv-head nothing:
         * it is `position: absolute` (see `.cv-head`'s own `position:
         * relative` in LAYOUT_CSS) and sized well under the row's own
         * height, so it never grows `.cv-head` and never touches
         * `.cv-sheet`'s share of the flex column. Centred on the row's own
         * width (not "next to the back button"), so it clears the button on
         * the left at every supported viewport, with the row's right side
         * left empty on purpose for a later "listen" button — T7 (docs/18
         * D1/D24/D26) is that button, in `.cv-head-right` below. */}
        {zooSign && (
          <CaptionedArt
            art={zooSign.art}
            label={zooSign.label}
            size={SIGN_SIZE}
            cropHeight={SIGN_CROP_HEIGHT}
            className="cv-level-zoo-sign"
          />
        )}
        {/* T6 (adventure-flow-and-map-guidance): the adventure progress bar
         * takes the exact same slot the sign does, for the same reason —
         * `zooSign` and `progress` never both hold for the same level (a
         * signed entrance enclosure is always a single-level ADVENTURES
         * row, which `adventureProgress` returns `null` for), so there is
         * never a fight over the centre of this row. */}
        {progress && <TrailProgressBar progress={progress} />}
        {/* T7 (docs/18 D1/D24/D26): the level's own hint is spoken
         * unconditionally (`useNarration(level.hint)`, above), but the
         * REPEAT button lives here, grouped with the title into ONE flex
         * child so `.cv-head`'s `justify-content: space-between` still puts
         * it flush against the row's own right end (`.cv-head-right`'s own
         * LAYOUT_CSS comment has the full reasoning) — never over the
         * centred sign/bar above, which stays absolutely positioned and
         * therefore out of this flex flow entirely. No level title in the
         * detective world (Orchestrator Correction C1: "Hace todo bien
         * grande, bien simple la pantalla, sin texto") — that branch is
         * untouched, only wrapped. */}
        <div className="cv-head-right">
          {!drawnPlace && (
            <h1 className="cv-title">
              Fase {level.phase} · {level.title}
            </h1>
          )}
          <SpeakButton line={level.hint} />
        </div>
      </header>
      {/* The standing hint sentence is also suppressed (C1) — a world level's
       * instruction is SHOWN via `demo` (`TraceCanvas.tsx:747`), never
       * written. */}
      {!drawnPlace && <p className="cv-hint">{level.hint}</p>}
      </div>
      {/* Upright phones are width-limited, but miniaturizing the drawing game
       * makes the real task worse. The portrait path therefore gives a clear
       * rotate-device instruction while keeping Back and the action nav in the
       * normal document flow, including drawn-place levels. */}
      {portraitGuidanceActive && (
        <section
          id="cv-portrait-guidance"
          className="cv-portrait-guidance"
          role="status"
          aria-live="polite"
        >
          <strong>Girá el dispositivo</strong>
          <span>Para dibujar cómodo, usá el juego en horizontal. Podés volver al mapa con el botón Volver.</span>
        </section>
      )}
      <div className="cv-sheet">
        <TraceCanvas
        key={`${level.id}-${demoRun}`}
        demo={phase === 'demo' ? demos : undefined}
        // N8 fix: this used to be `phase !== 'demo'`, which shut pointer
        // capture off for the whole demo and silently swallowed a child's
        // first touch (see `endDemoOnStrokeStart` above for the full story).
        // The canvas stays enabled through the demo now — `onStart` is what
        // ends it, from the touch's own stroke-start path.
        enabled
        multiStroke
        // Guide withdrawal (docs/03 §3). The corridor survives the full and
        // dotted bands; from `minimal` on there is nothing but the start point
        // and the arrow, and at `none` not even those — which is how phase 5
        // and `f5-mama` become a motor-memory exam (docs/08 §5).
        corridor={corridor}
        // The corridor alone is the TOLERATED ZONE, and from phase 3 on it is
        // wider than the strokes of the glyph itself — a channel with no shape
        // inside it. The crisp centreline on top is the SHAPE TO DRAW, so the
        // child can still see the letter they are being asked to copy. It is
        // the FIRST thing §3 takes away: the dotted band keeps the channel and
        // its dashed centre, but not the solid shape.
        // ...and not in a maze either: the walls are already the shape.
        // ...and not over an art corridor either: a crisp dark centreline
        // drawn down the middle of a drawn snake is the one thing the art
        // corridor cannot carry (design.md §2.1's R1 — a dark line over the
        // author's own black spots separates only 14, short of the 55-luma
        // law by 41).
        guide={showShapeLine && !level.maze && !level.artCorridor ? target.paths : undefined}
        // ...but NOT inside a maze. docs/08 makes the crisp-line-over-soft-
        // channel rule a phase-3-and-up rule, because only there is the
        // corridor wider than the glyph. A maze has no shape to recover: the
        // walls already say exactly where the path runs, and a line down the
        // middle of them is one more thing on a screen docs/01 principle 1
        // wants empty.
        showCentreLine={showCorridor && !level.maze && !level.artCorridor}
        // Fases 1-2 draw on blank paper: the pauta means nothing before a
        // letter exists (docs/01 principle 1).
        surface={level.surface}
        // A sendero becomes a real laberinto — walls, not a hint (docs/01 fase 1).
        maze={level.maze}
        inkWarp={inkWarp}
        // docs/03 §3's full band also lists "checkpoints visibles", and that is
        // DELIBERATELY not wired to `DevCheckpointOverlay`. That overlay is a
        // dev instrument: a dozen numbered dashed circles, each as wide as the
        // corridor. On `f3-a` they swallow the letter whole — the exact failure
        // docs/08 names ("el canal no puede tragarse la letra") — and on a fase-1
        // maze they bury the walls. Numerals are also unreadable to the
        // pre-reader this app is for, which is why the hint is an ARROW at all.
        // The ordered-waypoint idea needs its own child-facing rendering before
        // it earns a place on the sheet.
        beatPulse={
          metronomeBpm > 0 && phase === 'ready' && startMarker
            ? { x: startMarker.x, y: startMarker.y, on: beatOn }
            : undefined
        }
        // A long word gets a wider sheet, never smaller letters (docs/02 §3).
        viewBoxWidth={target.viewBoxWidth}
        // The window, narrower than the world, on the two levels that author
        // one (`scrolling-camera` capability). Absent on every other level.
        camera={traceCamera}
        // Crop the dead margin and fill the flex area in both axes, so the
        // sheet is as large as BOTH limits allow (docs/02 §3, docs/04 §3.3).
        viewBoxY={band.y}
        viewBoxHeight={band.height}
        fit="contain"
        // T7 rework #2: the chrome's own measured safe insets (this
        // component's own `topChromeRef`/`bottomChromeRef` effect above) —
        // `TraceCanvas.tsx`'s `fitContentWithInsets` keeps the corridor,
        // markers, spines and the octopus clear of the back/sound button
        // row and the actions row, while the backdrop art still fills every
        // pixel of the viewport including behind them.
        insetTop={chromeInsets.top}
        insetBottom={chromeInsets.bottom}
        insetLeft={SIDE_INSET}
        insetRight={SIDE_INSET}
        startMarker={showMarkers ? startMarker : undefined}
        // The octopus stands where the route begins, in place of the green dot
        // (see `TraceStandingArt`): with a character already standing there the
        // dot says nothing the octopus does not. Every non-detective level
        // passes nothing and keeps its dot. On an art-corridor level `at`
        // moves its feet beside the drawn body instead of onto it (N3).
        startArt={
          drawnPlace ? { ...OCTOPUS_ART, size: OCTOPUS_SIZE, at: startArtAt } : undefined
        }
        // Shown wherever the start dot is shown (docs/03 §3): from phase 3 on,
        // "where the letter ends" is real information, not decoration. At the
        // 'none' band it goes too, or `f5-mama` would stop being a memory test.
        endMarker={showMarkers ? endMarker : undefined}
        // Whatever stands where the route ends (see the `endArt` derivation
        // above: goalArt, an adventure's own animal, a case's clue, or a
        // star) is drained/off until `trailLampOn` says this run has
        // reached the end, then earned/on after — "llegaste", never
        // "aprobaste" (`trailLampOn`'s own onFrame comment). That is a
        // different sentence from the BAR's own "filed" state below
        // (store-derived, approval-gated): the two usually coincide on a
        // finished trail but are not the same statement.
        endArt={endArt}
        // No arrow in the detective world. The octopus standing at one end and
        // the lamp/goal art at the other already say "from here to there", and
        // the arrow is drawn AT the route's first point, so it lands on the
        // octopus's head — observed on a screenshot. On a letter level there
        // is no character at the start, so the arrow stays the only thing
        // carrying direction.
        directionArrow={showMarkers && !drawnPlace ? directionArrow : undefined}
        // `?debug=estela:<k>`'s implied trail rides as ONE extra entry here,
        // and `?debug=espinas:<k>`'s spines as k extra entries (one per
        // spine — a spine is a loose stroke, not a leg of a polyline). Both
        // are render-only: never in `strokes`, never scored, never persisted
        // (design.md §8). Absent on every ordinary frame a child ever sees.
        completedStrokes={
          waypointDebugStrokes || spineDebugStrokes
            ? [
                ...shownStrokes,
                ...(waypointDebugStrokes ? [waypointDebugStrokes] : []),
                ...(spineDebugStrokes ?? []),
              ]
            : shownStrokes
        }
        offPath={offPath}
        clearSignal={clearSignal}
        // Timed hazards (docs/08). Absent on every level that does not author
        // them, so the surface pays nothing for the feature.
        hazards={hazards}
        // The carried character rides the fingertip, and waits on the start of
        // the ROUTE — `target.polyline[0]`, not the start marker, so it is
        // still there on a level that has withdrawn its markers.
        // On a detective trail the resting point is shifted into the
        // octopus's raised tentacle so the glass reads as HELD rather than
        // swallowed (see `GLASS_REST_DX`). While drawing, the canvas puts it on
        // the fingertip and this offset plays no part.
        carrier={
          waypointDebugCarrier ??
          (level.carrier && startMarker
            ? inWorld
              ? { x: startMarker.x + GLASS_REST_DX, y: startMarker.y + GLASS_REST_DY }
              : startMarker
            : undefined)
        }
        // The magnifying glass. It belongs to the world, not to the reward:
        // colour in this mode only ever means a clue was earned, so the art
        // keeps its authored ink contour and takes no palette colour of its
        // own. It is also what keeps CARRIER_COLOR from crowding the
        // feather's PLUME — see the palette suite, which asserts the shipped
        // sage never renders under an override.
        //
        // A level's own art beats a default it did not ask for (`goalArt`'s
        // own argument, `:1196-1201`) — the carrier-visibility repair,
        // general (design.md §2.3). Absent `level.carrierArt` = the shipped
        // hard-wire, byte-for-byte.
        carrierArt={
          level.carrierArt
            ? { ...level.carrierArt.art, size: level.carrierArt.size }
            : inWorld
              ? CARRIER_LENS_ART
              : undefined
        }
        inkOnly={drawnPlace}
        // The child's own line is MUD in the world (see `MUD_INK`). Only the
        // trace changes substance: the carrier, the hazards and the silhouetted
        // markers above all stay ink, because they are the world.
        //
        // Widened for the night backdrop's own ink (design.md §2.4): a slate
        // line does not clear `NIGHT_VEIL`, so the backdrop declares its own
        // `ink`/`inkDim`. Byte-identical today — no shipped backdrop
        // declares `ink` yet (`backdrops.ts`'s `PENDING_ENTRANCE_BACKDROP`
        // is not wired into `ADVENTURE_BACKDROP` in this apply run).
        inkColor={inWorld ? MUD_INK : backdropEntry?.ink}
        inkDimColor={inWorld ? MUD_INK_DIM : backdropEntry?.inkDim}
        inkHidden={arrangeOpen}
        inkPolicy={inkPolicy}
        artCorridor={traceArtCorridor}
        // Any bump restarts the run (docs/01 principle 2).
        resetSignal={resetOnContact ? resetSignal : undefined}
        // Clue marks (design unit 4/6). Absent on every level without a
        // `clue` config, so the surface pays nothing for the feature.
        clues={clueDef ? { marks: traceClueMarks } : undefined}
        // Grass and trodden earth. Detective trails only — every other level,
        // maze or not, renders exactly the surface it always did.
        ground={ground}
        // The sector's drawn place — an adventure's backdrop, once its
        // sector has one. Absent for every level whose adventure has none.
        backdrop={backdrop}
        // Static art standing at the route's own peaks (design.md §3.3).
        // Absent for every level that predates `LevelConfig.vertexArt`.
        vertexArt={vertexArt}
        // The reveal grid's covering layer (`reveal-grid` capability).
        // Absent on every level without a `reveal` config.
        reveal={reveal}
        // The waypoint fold's render projection (`free-trail-waypoints`
        // capability). Absent on every level without a `waypoints` config.
        waypoints={waypoints}
        // The spine fold's render projection (`radial-spines` capability).
        // Absent on every level without a `spines` config.
        spines={spines}
        onStart={onStart}
        onFrame={onFrame}
        onRelease={onRelease}
      >
        {isSpineDebug(debugSearch) && target.paths.length > 0 && (
          // `?debug=espina` (design.md §8): overlays the FITTED centreline
          // over the art, so §1.4's coincidence is photographable rather
          // than only assertable. Ungated, render-only.
          <g pointerEvents="none">
            {target.paths.map((d, idx) => (
              <path key={`spine-debug-${idx}`} d={d} fill="none" stroke={TORCH_CHALK} strokeWidth={2} />
            ))}
          </g>
        )}
        </TraceCanvas>
      </div>
      <div className="cv-foot" ref={bottomChromeRef}>
      {/* T3 revision (orchestrator QA regression): this used to be a
       * `.cv-result` row in `.cv-foot`, first popping into existence on
       * attempt (shrinking the sheet the instant a level resolved), then
       * — this file's own earlier fix — ALWAYS reserved from first paint
       * (which shrank the sheet PERMANENTLY instead, on every enclosure
       * level: measured 1252x592 -> 1252x438 at 1280x720). Neither is
       * right: the sheet must be the exact same box before and after an
       * attempt, and nothing should be reserved for a message that is not
       * always there. So the message asks the flex column for nothing — it
       * is an absolutely positioned pill, high contrast against whatever
       * sits behind it (paper, a leaf-litter fill, a night backdrop),
       * `pointer-events: none` so it can never steal the next attempt's
       * first touch. Gated on `attempt` exactly as it always was pre-T3 —
       * it shows on a short/failed attempt too (the coaching text), not
       * only on success.
       *
       * T7 rework #2: moved from inside `.cv-sheet` (which was a flex
       * sibling of `.cv-foot`, so a `bottom`-anchored pill never overlapped
       * it) to a CHILD of `.cv-foot` itself, now that `.cv-sheet` is the
       * whole viewport — `.cv-result-pill`'s own `bottom: 100%` anchors it
       * to `.cv-foot`'s own top edge instead, so it always floats just
       * above the actions row rather than on top of the viewport's bottom
       * edge (which the actions row itself now also claims). */}
      {drawnPlace && level.reveal?.mode === 'erase' && attempt && (
        <p className="cv-result-pill" role="status" aria-label="Resultado del intento">
          {attempt.approved && (
            <span className="cv-result-check" aria-hidden="true">
              ✓
            </span>
          )}
          {eraseResultMessage(level.id, attempt.approved)}
        </p>
      )}
      {drawnPlace && level.reveal?.mode === 'light' && attempt && (
        <p className="cv-result-pill" role="status" aria-label="Resultado del intento">
          {attempt.approved ? (
            <>
              <span className="cv-result-check" aria-hidden="true">
                ✓
              </span>
              ¡Descubrimiento brillante!
            </>
          ) : (
            `Encontraste ${revealState.lit.size} de ${level.reveal.objects.length}. Volvé a alumbrar las luces que faltan.`
          )}
        </p>
      )}
      {/* T7: every OTHER drawn-place family (a plain corridor, hedgehog's
       * spines, bee's waypoints) had no result pill at all before this —
       * `eraseResultMessage`/the light sentence above are erase/light
       * only. Auto-advance still needs a celebration to show for the
       * ~1.5-2s before it fires, and C1 keeps this world wordless, so this
       * is the check mark alone (`.cv-result-pill-icon`), never a
       * sentence — `aria-label` carries the words for anyone who cannot
       * see it, same convention as `.cv-btn-back`'s own icon-only label. */}
      {drawnPlace && !level.reveal && attempt?.approved && (
        <p
          className="cv-result-pill cv-result-pill-icon"
          role="status"
          aria-label="¡Muy bien!"
        >
          <span className="cv-result-check" aria-hidden="true">
            ✓
          </span>
        </p>
      )}
      {/* Pillars and coach copy (accuracy/direction/fluency readouts, the
       * restart cue, the standing hint) are all suppressed in the detective
       * world (C1: no coach or pillar copy — and therefore no three stars,
       * D6). Every other phase's result section is untouched. */}
      {!drawnPlace && (
        <section aria-label="Resultado del intento" className="cv-result">
          {attempt ? (
            <>
              <div className="cv-pillars">
                <Pillar
                  label="Precisión"
                  value={String(attempt.accuracy)}
                  filled={attempt.accuracy >= level.rules.minAccuracy}
                />
                <Pillar
                  label="Sentido"
                  value={attempt.directionOk && !attempt.wrongDirection ? '✓' : '→'}
                  filled={attempt.directionOk && !attempt.wrongDirection}
                />
                <Pillar
                  label="Fluidez"
                  value={fluencyEvaluated ? String(attempt.fluency) : '—'}
                  filled={fluencyEvaluated && attempt.fluency >= level.rules.minFluency}
                  muted={!fluencyEvaluated}
                />
              </div>
              <p className="cv-coach">{coachMessage(attempt)}</p>
            </>
          ) : (
            // The restart cue takes the standing hint's place for a moment. Same
            // muted slate as every other neutral line on this screen — never red,
            // and never a different, louder kind of text (docs/01 principle 2).
            <p
              className="cv-coach"
              role={restarted ? 'status' : undefined}
              style={{ color: '#64748b' }}
            >
              {restarted ? RESTART_MESSAGE : standingHintFor(level, guideLevel, phase === 'demo')}
            </p>
          )}
        </section>
      )}
      <nav aria-label="Acciones" className="cv-actions">
        {/* T7 (decision: "the repeat button is useless" — REMOVE it on a
         * drawn place): a classic (non-drawnPlace) level keeps "Borrar" —
         * out of this task's scope, `clearOnFailedRetryRef`'s own comment
         * above covers what replaces it here. */}
        {!drawnPlace && (
          <button type="button" onClick={clearAttempt} className="cv-btn">
            Borrar
          </button>
        )}
        {playDemo && (
          <button
            type="button"
            onClick={replayDemo}
            className="cv-btn"
            aria-label={drawnPlace ? 'Ver de nuevo' : undefined}
          >
            {drawnPlace ? <ReplayIcon /> : 'Ver de nuevo'}
          </button>
        )}
        {/* Structurally unreachable in the detective world anyway — phase 1
         * always resolves `earnedGuideLevel` to 'full' (`guideLevelFor`), so
         * this never renders for it. Gated on `inWorld` too as belt-and-
         * braces against a future change to that rule. */}
        {!drawnPlace && level.showGuide && earnedGuideLevel !== 'full' && !guideRequested && (
          <button type="button" onClick={() => setGuideRequested(true)} className="cv-btn">
            Ver la guía
          </button>
        )}
        {/* T7 (decision: auto-advance replaces the manual "Siguiente" tap on
         * a drawn place — see `celebrating`/the effect above, which calls
         * this SAME `onNext`). A classic level keeps the manual button. */}
        {!drawnPlace && (
          <button
            type="button"
            onClick={onNext}
            disabled={!attempt?.approved}
            // D21/T3: an approved attempt makes this button say "now!" on its
            // own (`.cv-next-ready` in `LAYOUT_CSS`) instead of only swapping a
            // pale colour for a slightly less pale one.
            className={`cv-btn ${attempt?.approved ? 'cv-btn-ok cv-next-ready' : 'cv-btn-off'}`}
          >
            Siguiente
          </button>
        )}
      </nav>
      </div>
      {/* T7 auto-advance: "a tap anywhere during the celebration skips the
       * wait" — a full-screen transparent button, only while `celebrating`
       * (see the effect above), guarded by `skipReady` against the winning
       * stroke's own release re-triggering as an instant click on this. */}
      {celebrating && (
        <button
          type="button"
          className="cv-celebrate-skip"
          aria-label="Continuar"
          onClick={skipCelebration}
        />
      )}
    </main>
  )
}
