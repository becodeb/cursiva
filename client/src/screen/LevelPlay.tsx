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
  INK_COLOR,
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
import { backdropFor, NIGHT_VEIL, TORCH_CHALK, TORCH_CHALK_DIM } from '../zoo/backdrops'
import { adventureFor } from '../zoo/adventures'
import type { AdventureProgress } from '../zoo/progress'
import {
  completionGrowthFraction,
  debugClearedTiles,
  EMPTY_REVEAL,
  isLightAnimating,
  LIGHT_COMPLETE_GROWTH_MS,
  nightHintFor,
  revealTick,
  revealTiles,
  type RevealState,
} from '../levels/revealGrid'
import {
  DEFAULT_IDLE_NUDGE_CONFIG,
  idleNudgeCueIndex,
  idleNudgePhase,
  shouldSpeakIdleHint,
} from './idleNudge'
import { hasIntroCue, idleCueForLevel, INTRO_CUE_MS, type IdleCueVisual } from './idleNudgeCue'
import {
  arrangeDebugCount,
  cameraDebugOrigin,
  collectDebugCount,
  isSpineDebug,
  lightDebugPoint,
  revealDebugFraction,
  snakeColourDebugCount,
  spineDebugCount,
  waypointDebugCount,
} from '../canvas/devMode'
import { seedCameraOrigin } from '../canvas/camera'
import { clampArtBox, placeArt, standBesideArtCorridor, STANDING_GRIP, type ArtBox } from '../canvas/placeArt'
import {
  EMPTY_WAYPOINTS,
  debugCarrier,
  debugTrail,
  seedWaypoints,
  waypointArt,
  waypointRings,
  waypointTick,
  waypointsComplete,
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
  spineSpikePaths,
  type SpineState,
} from '../levels/spines'
import { grassScatter, mudScatter } from '../canvas/groundScatter'
import type { TracePoint } from '../canvas/useTraceInput'
import { resolveInkPolicy } from '../canvas/ink'
import { contactThisSample, contactTick, NO_CONTACT, type ResetDebounce } from '../canvas/resetOnContact'
import { buildLevelTarget } from '../levels/buildLevel'
import { hitObstacle, obstacleAt } from '../levels/obstacles'
import { routeApexes } from '../levels/vertexArt'
import { routeExtrema, vertexArtPoints } from '../levels/dolphinExtrema'
import { revealFractionAt } from '../levels/artCorridor'
import { evaluateLevel } from '../game/evaluateLevel'
import { coachMessage } from '../game/adaptiveTolerance'
import { playApprovalTone } from '../modes/tone'
import { onRisingEdge, playSfx } from '../audio/sfx'
import { createTraceTone, type TraceTone } from '../canvas/traceTone'
import { pulseOnLeaving } from '../canvas/haptics'
import { railFade, railPull } from '../canvas/rail'
import { multiCorridorTick, routeTrackStart, type RouteTrack } from './corridorTrack'
import { releaseOutcome } from './levelCompletion'
import {
  emptySnakeColourState,
  wakingPulseIndex,
  snakeColourTick,
  type SnakeColourState,
} from './snakeColour'
import {
  arrangeRenderPieces,
  arrangeTick,
  isArranged,
  seedArrange,
  type ArrangeConfig,
  type ArrangeState,
} from '../levels/arrange'
import type { TraceArtCorridor } from '../canvas/TraceCanvas'
import type { TraceTorch } from '../canvas/TorchLayer'
import { directionArrowOf } from './directionArrow'
import { goalMarkerOf } from './goalMarker'
import type { LevelConfig, LevelTarget, RevealConfig } from '../levels/types'
import { luma } from '../detective/palette'
import { isCaseTrail, inDetectiveWorld } from '../levels/world'
import type { LevelAttempt, LevelRecord } from '../game/types'
// Detective mode (design unit 6, spec: detective-mode "Clue Collection State
// Machine" / "Trail Completion Lamp and Rail Filing"). A level with no
// `clue` field is an ordinary level and none of this wiring engages.
import {
  clueTick,
  levelClueMarks,
  emptyClueState,
  reachedTrailEnd,
  segmentClueMarks,
  segmentClueState,
  type ClueState,
} from '../detective/clues'
// T45 (`docs/21` N5/N6): segment levels, each path its own stroke.
import {
  emptySegmentState,
  segmentStandPoint,
  settleSegmentRelease,
  type SegmentState,
} from '../levels/segments'
// Collect-along-the-path (docs/19 §2.2/§3.4; T17). `level.collect` is the
// sole discriminator, the same convention `level.clue` above uses — its
// absence means an ordinary level and none of this wiring engages.
import {
  collectTick,
  emptyCollectState,
  isCollectComplete,
  resolveCollectItems,
  type CollectItem,
  type CollectState,
} from '../levels/collect'
import {
  CARRIER_LENS_ART,
  CLUE_ART,
  GROUND_GRASS,
  GROUND_MUD,
  HOME_OCTOPUS_ART,
  isPlaceholderArt,
  OCTOPUS_ART,
  SIGN_ART,
  ZOO_ANIMAL_ART,
  ZOO_STAR_ART,
} from '../detective/assets'
import CaptionedArt from '../detective/CaptionedArt'
import TrailProgressBar, { ANIMAL_MAX_WIDTH } from '../detective/TrailProgressBar'
import CollectBar from '../detective/CollectBar'
import { BackIcon, PlaceholderAnimalBadge, ReplayIcon } from '../detective/icons'
import { useNarration } from '../voice/useNarration'
import { canAutoSpeak, speak } from '../voice/narrator'
import SpeakButton from '../voice/SpeakButton'

/** Seconds one demonstration sub-path takes, and the gap before the next one. */
const DEMO_DURATION_S = 1.6
const DEMO_STEP_S = 1.7
/**
 * T13 (`odd/tasks/prewriting-stage-completion.md`, tablet playtest #2: "the
 * animation that shows you what to do is very slow"): the hedgehog demo
 * plays at roughly 2x the shared `DEMO_DURATION_S`/`DEMO_STEP_S` pace above —
 * a spine is one short straight stroke, not a routed corridor shape, so it
 * reads fine drawn quickly. Kept SEPARATE from the shared constants rather
 * than lowering them: every OTHER level with a `demo` (a routed letter/word)
 * still plays at the original pace, byte-identical.
 *
 * T19 (third tablet playtest, "the demo is still slow and ugly"): tightened
 * again, alongside `levels/spines.ts`'s own `DEMO_SPINES` (3 → 2) — "one or
 * two spines, each ≲0.6s" (the task's own brief). At 2 spines/0.5s/0.55s
 * step the WHOLE demo (`demoMs` below) now runs well under 1.5s, down from
 * T13's ~2.85s for 3 spines at 0.8s/0.85s.
 */
const SPINE_DEMO_DURATION_S = 0.5
const SPINE_DEMO_STEP_S = 0.55
/** T13: how long a rejected (non-spine) stroke's ink stays visible while it
 *  fades (`.cv-spine-fading`, `LAYOUT_CSS` below) before `SpineLayer` stops
 *  being asked to render it at all. */
const SPINE_REJECT_FADE_MS = 300
/** T17 follow-up: how long a just-collected item's own picture stays
 *  visible while it hops away (`.cv-collect-hop`, `LAYOUT_CSS` below) before
 *  it stops being rendered at all. Matches the keyframe's own duration. */
const COLLECT_HOP_MS = 420
/**
 * T19 follow-up (orchestrator screenshot review of `hedgehog1-04-all-but-
 * last.png`/`hedgehog4-04-all-but-last.png`): the accepted spike's own fill
 * used to be `INK_COLOR` (`#1e293b`, near-black slate) — indistinguishable
 * from `SPINE_BACKDROPS.hedgehog`'s own night band (`quiet` `#2a3346`/
 * `brightest` `#526083`, both dark navy too). A warm brown reads as
 * "hedgehog spine", not generic ink, and this exact value clears the
 * repo's own 55-luma law (`docs/09`, `MIN_BACKDROP_CONTRAST` in
 * `zoo/backdrops.test.ts`) against ALL THREE surfaces a spike can sit in
 * front of — measured, not eyeballed (`LevelPlay.test.tsx`'s own contrast
 * test holds this): `quiet` (luma 50, gap 106), `brightest` (luma 96, gap
 * 60), and the body's own measured brightest pixel (luma 213, gap 57 — the
 * spike reads as darker fur, not a hole in it). The outline stays
 * `TORCH_CHALK` (design.md's existing "earned" chalk), which already clears
 * every backdrop surface by over 140 luma — together, a spike reads at a
 * glance against sky, band, and body alike.
 */
const SPINE_SPIKE_FILL = '#c79165'
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

/**
 * T7 (prewriting-stage-completion, "the next-level one could either appear
 * big or simply go automatically"): once a drawn-place attempt is approved,
 * the level advances on its own after this short celebration — no manual
 * "Siguiente" tap. Chosen inside the user's own "~1.5-2 s" window.
 */
const CELEBRATE_MS = 1800
/**
 * T15 (`odd/tasks/prewriting-stage-completion.md`, Batch 2.6: "in some
 * levels it's very fast... I want to see a bit of what happened. In the
 * ones where something is discovered at the end it should take a bit
 * longer"): a REVEAL level (`level.reveal` present — the `erase` cleaning
 * family: glass/sand/mud/leaves, and the `light` flashlight/night family)
 * uncovers something the child could not see a moment before. `CELEBRATE_MS`
 * was tuned for a PATH level, where the whole route was visible throughout
 * the attempt and there is nothing new to look at once it is approved —
 * snapping away after the same ~1.8s on a reveal cuts off the one moment
 * the level exists to deliver.
 */
export const REVEAL_HOLD_MS = 4000
/**
 * A tap anywhere skips the wait (decision, same task) — but not for this
 * long after the celebration starts. The pointerup that just finished the
 * WINNING stroke can synthesize a click at the same screen coordinates the
 * instant this full-screen skip target mounts under the fingertip, which
 * would eat the celebration before the child ever sees it. This grace
 * window is that one release's own ghost click, nothing more — it is well
 * under the 1.4s a real second tap would take to arrive on purpose.
 */
export const CELEBRATE_SKIP_GRACE_MS = 400

/**
 * T15's own classification, pure and exported so its rule ("what kind of
 * level is this?") is unit-testable without a live attempt — `renderToString`
 * (this file's own SSR harness) cannot drive `attempt.approved` or a real
 * timer, so the celebration EFFECT below stays real-browser-only proof, but
 * the DECISION it reads from can be pinned directly. Keyed off
 * `level.reveal?.mode` alone: `'erase'` already covers every cleaning family
 * (glass, sand — `RevealLayer`'s `mud`/`leaves`/`sand` visuals are a
 * render-only choice downstream of the SAME `erase` mode, not a second
 * mode), `'light'` is the flashlight/night family, and every other level
 * (routed, waypoints, spines, free-with-no-reveal) is `'path'` — nothing new
 * is uncovered by finishing one, so it keeps the short hold.
 */
export type CelebrationKind = 'path' | 'reveal-erase' | 'reveal-light'

export function celebrationKindFor(level: Pick<LevelConfig, 'reveal'>): CelebrationKind {
  if (level.reveal?.mode === 'erase') return 'reveal-erase'
  if (level.reveal?.mode === 'light') return 'reveal-light'
  return 'path'
}

/**
 * T15's hold, in one pure function of the level alone. `startDelayMs` is how
 * long AFTER `celebrating` begins the hold itself starts counting down — 0
 * for every kind except `reveal-light`, which needs `LIGHT_COMPLETE_GROWTH_MS`
 * (`levels/revealGrid.ts`) to finish its own scene-wide completion-growth
 * animation FIRST: `attempt.approved` turns true the instant every object is
 * found, while the darkness is still visibly shrinking outward — starting
 * the countdown there would auto-advance while the child is still watching
 * it grow, the opposite of what this task asks for ("for night, the hold
 * starts AFTER the completion growth animation ends"). `holdMs` is how long
 * the child then gets to look before the level advances on its own.
 */
export interface CelebrationHold {
  startDelayMs: number
  holdMs: number
}

export function celebrationHold(level: Pick<LevelConfig, 'reveal'>): CelebrationHold {
  const kind = celebrationKindFor(level)
  if (kind === 'path') return { startDelayMs: 0, holdMs: CELEBRATE_MS }
  const startDelayMs = kind === 'reveal-light' ? LIGHT_COMPLETE_GROWTH_MS : 0
  return { startDelayMs, holdMs: REVEAL_HOLD_MS }
}

/**
 * docs/16's first three enclosures identify the animal that belongs behind
 * the surface the child is cleaning. The approved art already includes the
 * animal, uppercase word, and wooden frame, so this stays a narrow LevelPlay
 * projection rather than becoming another level-engine field.
 *
 * Exported (`odd/tasks/prewriting-stage-completion.md` T31 follow-up,
 * "the intro must use the SAME framing as the level"): `screen/introChrome.tsx`
 * reads this SAME table to render an invisible replica of this row's own
 * header for `AdventureIntro.tsx`'s own chrome-inset measurement — a second,
 * independently-maintained copy would silently drift the instant a sign is
 * added or removed here.
 */
export const PROLOGUE_ZOO_SIGNS = {
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
/** [T44] The clue marks by torchlight: a little bigger, since they are the
 *  only guide and are only ever seen inside the light. */
export const TORCH_CLUE_MARK_SIZE = 38

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

/**
 * T38: the octopus standing at the start WITHOUT the magnifying glass, shown
 * while the finger is down (the glass is then on the fingertip).
 *
 * `home-octopus.png` is a stand-in: same character, same marker style and
 * colours, but it is the home screen's pose (all eight tentacles curled
 * out), not `carrier-octopus.png`'s pose with the glass taken out of the
 * raised tentacle. `docs/20_PEDIDOS_DE_ARTE_TANDA_3.md` B18 asks for the
 * matching drawing; once it ships only this constant changes.
 */
const OCTOPUS_EMPTY_HANDED_ART = HOME_OCTOPUS_ART

/**
 * T38: whether the octopus standing at the start is the one holding this
 * level's carrier. His art (`OCTOPUS_ART`) already has the magnifying glass
 * in his raised tentacle, so this is true exactly when the carrier IS that
 * glass — `level.carrier` with no `level.carrierArt` of its own (the same
 * gate `carrierArt` below uses to pick `CARRIER_LENS_ART`). A level that
 * carries something else (the bee family's own bee) is not the octopus's to
 * hold: that carrier keeps resting on its home point.
 */
export function octopusHoldsLens(level: Pick<LevelConfig, 'carrier' | 'carrierArt'>): boolean {
  return !!level.carrier && !level.carrierArt
}
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

/** [T44] How often the torch follows the fingertip, in ms — the off-path
 *  sample's own rate, so the light moves as smoothly as the night levels'. */
export const TORCH_TICK_MS = 33

/** [T44] The small glow that keeps the start and the goal findable on a
 *  torch level while the finger is up: about one corridor across, enough
 *  for the octopus and the apple, not enough to show the way between. */
export const TORCH_MARKER_GLOW = 90

/**
 * [T44] The torch layers' projection (`canvas/TorchLayer.tsx`) for a
 * `level.torch` level, or `undefined` when there is nothing to darken:
 * no torch on this level, or the lights are on — during the demo, which
 * shows the whole trail in the light before the dark falls ("mostrar antes
 * de pedir"), and once the level is approved, when the trail the child
 * followed blind is finally shown whole. Pure, so the decision is testable
 * without a pointer.
 */
export function torchView(
  torch: LevelConfig['torch'],
  polyline: readonly { x: number; y: number }[],
  finger: { x: number; y: number } | null,
  lightsOn: boolean,
  fill: string,
): TraceTorch | undefined {
  if (!torch || lightsOn || polyline.length === 0) return undefined
  const start = polyline[0]
  const end = polyline[polyline.length - 1]
  const sources = [
    { cx: start.x, cy: start.y, radius: TORCH_MARKER_GLOW },
    { cx: end.x, cy: end.y, radius: TORCH_MARKER_GLOW },
  ]
  if (finger) sources.push({ cx: finger.x, cy: finger.y, radius: torch.radius })
  return { sources, fill }
}

/** The mud with the light down — the off-corridor dim. The shipped `#94a3b8`
 * is a cold grey, and against a warm earth corridor it reads as a DIFFERENT
 * substance rather than as the same line fading; this is the same brown
 * desaturated and lifted toward the ground it is drawn on. */
const MUD_INK_DIM = '#b3a08c'

/**
 * T45 follow-up (coordinator review: "the child's ink on the brown turtle
 * channel is faint"). The mud is a brown a little darker than the EARTH
 * corridor it was chosen for; on a backdrop whose own channel is itself a
 * mid brown (the turtles' `WET_SAND_HOLLOW`, luma 116 against the mud's 112)
 * the line vanishes into the channel. Where the mud fails the 55-luma law
 * against the channel AND the backdrop declares its own ink, the backdrop's
 * ink wins — the line `turtle1..4` already draw on the same channel. Every
 * other world level keeps its mud, every non-world level its backdrop ink.
 */
export function worldInk(
  inWorld: boolean,
  backdrop: { channel?: string; ink?: string; inkDim?: string } | undefined,
): { ink: string | undefined; inkDim: string | undefined } {
  if (!inWorld) return { ink: backdrop?.ink, inkDim: backdrop?.inkDim }
  const channel = backdrop?.channel
  if (channel && backdrop?.ink && Math.abs(luma(MUD_INK) - luma(channel)) < 55) {
    return { ink: backdrop.ink, inkDim: backdrop.inkDim }
  }
  return { ink: MUD_INK, inkDim: MUD_INK_DIM }
}

/** The octopus's standing height and widest drawing (holding the glass, or
 *  the empty-handed one), for keeping him clear of a segment level's marks. */
const OCTOPUS_ASPECT = Math.max(OCTOPUS_ART.w / OCTOPUS_ART.h, HOME_OCTOPUS_ART.w / HOME_OCTOPUS_ART.h)

/** [T45 follow-up] Where the octopus's feet go on a segment level: the
 *  nearest spot to the first start whose box stays on the sheet (which every
 *  viewport shows whole) and clear of every segment (`segmentStandPoint`).
 *  The live corridor first, the authored one if a widened corridor leaves no
 *  room. */
export function segmentOctopusFeet(target: LevelTarget): { x: number; y: number } | undefined {
  const bounds = { x: 0, y: 0, width: target.viewBoxWidth, height: 600 }
  return (
    segmentStandPoint(target.routes, target.corridorWidth, OCTOPUS_SIZE, OCTOPUS_ASPECT, bounds) ??
    segmentStandPoint(target.routes, target.config.corridorWidth, OCTOPUS_SIZE, OCTOPUS_ASPECT, bounds)
  )
}

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
  // T12: defaults to `EMPTY_REVEAL` so every EXISTING caller (this file's
  // own tests included) that predates the replay-on-lift fix stays
  // byte-identical — the one caller that actually needs to preserve
  // timestamps (`onRelease`, this file) passes `revealStateRef.current`
  // explicitly.
  prev: RevealState = EMPTY_REVEAL,
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
  // T12 (`odd/tasks/prewriting-stage-completion.md`, tablet playtest #2:
  // "once I discover something it stays lit, but when I lift my finger it
  // goes dark for a second and the animation plays again"): the raw re-fold
  // above ALWAYS restarts from `EMPTY_REVEAL`, so `revealTick` stamps
  // `litAt`/`completeAt` at THIS release's own `now` for every object still
  // lit and for `completeAt` whenever every object is still found — even a
  // release that found nothing new, anywhere on the sheet, long after the
  // real grow-in already finished. Left alone, that replays a found object's
  // own grow-in (and the scene-wide completion wash) on every single stroke
  // release, not only the one that actually found something. `prev` is the
  // live incremental fold (`revealStateRef.current`, this function's one
  // caller) — its `litAt`/`completeAt` are the REAL first-found timestamps,
  // stamped once by the live `onFrame` ticks that ran while the child was
  // actually drawing/lighting, so they are preserved for every index this
  // raw re-score agrees was already lit before this release; only a index
  // that is NEWLY lit by this exact re-score (not in `prev.lit`) keeps the
  // fresh `next` stamp, and `completeAt` only takes `next`'s fresh stamp the
  // FIRST time the level completes (`prev.completeAt` is still `null`).
  const litAt = new Map(next.litAt)
  for (const idx of next.lit) {
    const priorAt = prev.litAt.get(idx)
    if (priorAt !== undefined) litAt.set(idx, priorAt)
  }
  const completeAt = prev.completeAt ?? next.completeAt
  return { ...next, litAt, completeAt }
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
 * T35: the `found` cue (night family only) — `light` per object whose index
 * just entered `lit` — `lit` only ever grows (`revealTick`'s own header), so
 * a size increase IS a genuinely new find, never a re-count of one already
 * lit. Pure, so a call site never has to re-derive "did a NEW object just
 * light up" itself.
 *
 * `erase` (glass/sand/mud/leaves) has NO matching field here to diff:
 * `RevealState.completeAt` is set ONLY inside `revealTick`'s `light` branch
 * (`levels/revealGrid.ts`) — an erase level's own "done" is decided at
 * RELEASE, by `evaluateLevel`'s cleared-fraction accuracy against
 * `rules.minAccuracy`, the SAME measurement `result.approved` already is.
 * `clean` fires from THAT approval instead (`onRelease`, alongside
 * `playApprovalTone()`), not from this function.
 */
export function fireRevealSfx(reveal: RevealConfig | undefined, prev: RevealState, next: RevealState): void {
  if (!reveal || reveal.mode !== 'light' || next === prev) return
  for (let i = 0; i < next.lit.size - prev.lit.size; i++) playSfx('found')
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
 * A collect level's INITIAL state (T17 follow-up): `emptyCollectState`, or
 * the `?debug=juntado:<k>` seed — this repo's harness cannot drive a live
 * finger, so this flag pre-fills the first `k` items (by route order)
 * before the very first render, the same reason `initialSpineState`/
 * `initialWaypointState` exist for their own mechanics. `k` is clamped into
 * `[0, items.length]` so a debug flag can never mark more items collected
 * than the level actually has.
 */
export function initialCollectState(items: readonly CollectItem[], search: string): CollectState {
  const k = collectDebugCount(search)
  if (k === null || items.length === 0) return emptyCollectState(items.length)
  const n = Math.max(0, Math.min(Math.trunc(k), items.length))
  return { collected: items.map((_, i) => i < n) }
}

/**
 * A snake level's INITIAL colour-reveal state (T20): `emptySnakeColourState`,
 * or the `?debug=vibora:<k>` seed — the same reason `initialCollectState`/
 * `initialSpineState` exist for their own mechanics: this repo's harness
 * cannot drive a live finger, so this flag pre-marks the first `k` pieces
 * (by authored, small→large order) fully done before the very first render.
 * `k` is clamped into `[0, n]` so a debug flag can never mark more pieces
 * done than the level actually has.
 */
export function initialSnakeColourState(n: number, search: string): SnakeColourState {
  const base = emptySnakeColourState(n)
  const k = snakeColourDebugCount(search)
  if (k === null || n === 0) return base
  const done = Math.max(0, Math.min(Math.trunc(k), n))
  return {
    pieces: base.pieces.map((piece, i) =>
      i < done ? { track: piece.track, progress: 1, fadeFrom: null, fadeStartProgress: 1, done: true, started: true } : piece,
    ),
  }
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
/* T34 (odd/tasks/prewriting-stage-completion.md): the bar read faint over
 * busy art, especially at 844x390 — a socket's own translucent white rect
 * (Slot's own fill, rgba(255,255,255,0.42..0.88)) and the silhouette's bare
 * img (no fill at all) both let a saturated backdrop show straight through.
 * background/border/box-shadow below give the WHOLE row one shared paper
 * backing, the SAME marker-style pill this screen's other chrome already
 * uses (.cv-btn/.cv-result-pill, both background: SHEET_PAPER behind a
 * #1a1a1a marker-line border) rather than inventing a second "chrome" look
 * -- a socket's own translucent white still lightens further ON TOP of this
 * opaque paper, so "filed" keeps reading brighter than "pending" exactly as
 * before. NO BACKTICKS in this block -- this file's own template literal
 * ends early on one. */
.pistas-bar {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 5px 12px;
  border-radius: 999px;
  background: ${SHEET_PAPER};
  border: 3px solid #1a1a1a;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.3);
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
/* T34: max-width + object-fit: contain is the width cap itself, not just a
 * safety margin — the two smaller-viewport media queries below only ever
 * override height, and a browser resolving width: auto from a height-only
 * constraint re-derives it from the image's OWN intrinsic aspect ratio (the
 * snake's real ~4.32:1 PNG), which would silently undo a JS-computed cap
 * the instant a narrower breakpoint's height override took over. Fixing
 * max-width here, once, holds at every breakpoint no matter which height
 * wins; object-fit: contain then letterboxes the real art inside that box
 * (never crops, never distorts) instead of stretching it to fill a height
 * it was never meant to reach. A normal (narrower-than-cap) animal's own
 * natural size already sits under this cap, so nothing here changes for it
 * -- object-fit is a no-op once content already fits its box. */
.pistas-animal img { display: block; max-width: ${ANIMAL_MAX_WIDTH}px; object-fit: contain; filter: brightness(0); opacity: 0.5; }
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
/* T50 (docs/23 D36): an icon-only button whose face is the author's own
 * round button art (detective/icons.tsx ButtonArt) drops the pill chrome —
 * the art already carries the marker outline and the paper fill — and
 * becomes a square tap box of the same height the pill had. Two-class
 * selectors so the media-query .cv-btn/.cv-btn-back overrides below never
 * bring the pill's padding back. */
.cv-btn.cv-btn-art { padding: 0; border: none; background: transparent; border-radius: 50%; width: 64px; height: 64px; min-height: 0; display: inline-flex; align-items: center; justify-content: center; }
.cv-btn-art.cv-btn-back { width: 56px; height: 56px; }
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
/* T19 ('odd/tasks/prewriting-stage-completion.md' §3.3, "el trazo se
 * convierte en espina"): the SAME one-shot pop '.cv-spine-mark-filled'
 * already plays, on the fresh spike shape that replaces the stroke's own
 * raw ink the instant its anchor fills — "becomes a spine" reads as a quick,
 * satisfying pop-in rather than a silent shape swap. */
.cv-spine-spike {
  transform-box: fill-box;
  transform-origin: center;
  animation: cv-spine-pop 380ms cubic-bezier(.2,.9,.25,1.2) both;
}
@media (prefers-reduced-motion: reduce) {
  .cv-spine-spike { animation: none; }
}
/* T13 (tablet playtest #2, "a line that isn't a spine could disappear when I
 * lift the finger"): a rejected stroke's own ink ('SpineLayer''s 'fading'
 * entries) plays this ONCE on mount — a '@keyframes' animation, not a CSS
 * transition, on purpose: a transition needs the element to paint at its
 * START value on one frame before the engine can animate toward a DIFFERENT
 * value set on a later frame ('TraceCanvas.tsx''s own reset-fade needs
 * exactly that two-step dance for this reason), while a keyframe animation
 * runs from 0% the instant the element exists — no second render, no flip
 * flag, nothing else this file has to own. 'forwards' keeps the element
 * sitting at 0 opacity for whatever few milliseconds pass before
 * 'onRelease''s own timeout drops the entry from 'fadingSpineStrokes'
 * entirely. */
.cv-spine-fading {
  animation: cv-spine-reject-fade 300ms ease-out forwards;
}
@keyframes cv-spine-reject-fade {
  0% { opacity: 0.85; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .cv-spine-fading { animation: none; opacity: 0; }
}

/* T17 follow-up (orchestrator screenshot review): a just-collected item
 * hops up and shrinks away toward the top bar instead of just standing
 * there or silently vanishing — "I got it" has to read as the picture
 * actually LEAVING its spot. Same one-shot-keyframe-with-'forwards' idiom
 * as .cv-spine-fading above (a transition needs a start frame to paint
 * before it can animate; a keyframe runs from 0% the instant the class
 * exists). 'transform-box: fill-box' is load-bearing for the same reason
 * .cv-spine-mark-filled needs it: an <image>'s default transform origin
 * is the outer <svg>'s (0,0), not its own box, so a bare scale() here
 * would visibly jump the picture toward the sheet's corner instead of
 * shrinking in place. */
.cv-collect-hop {
  transform-box: fill-box;
  transform-origin: center;
  animation: cv-collect-hop 420ms ease-in forwards;
  pointer-events: none;
}
@keyframes cv-collect-hop {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  40% { transform: translateY(-30px) scale(1.05); opacity: 1; }
  100% { transform: translateY(-90px) scale(0.35); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .cv-collect-hop { animation: none; opacity: 0; }
}

/* T20 ('odd/tasks/prewriting-stage-completion.md' §3.1, "the Pulpito points
 * at which one is next and it pulses softly"): the next snake to wake (still
 * grey, first in size order — 'screen/snakeColour.ts''s 'nextWakingIndex')
 * gets a gentle opacity pulse so a child can tell which one to trace next
 * without reading anything. 'opacity' only, never 'transform', so there is
 * no SVG transform-origin concern for a rotated piece ('snake3''s vertical
 * family) the way '.cv-spine-mark-filled' already has to guard against for a
 * scale animation. */
.cv-snake-next {
  animation: cv-snake-next-pulse 1.8s ease-in-out infinite;
}
@keyframes cv-snake-next-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .cv-snake-next { animation: none; opacity: 1; }
}

/* T33 ('odd/tasks/prewriting-stage-completion.md', "help a stuck child"):
 * the start marker's own STRONGER pulse during an idle nudge — the plain dot/
 * 'startArt' otherwise sits at a flat, unanimated opacity ('canvas/
 * TraceCanvas.tsx''s own start-marker block), so this is new motion, not an
 * amplified existing one. 'transform-box: fill-box'/'transform-origin:
 * center' is the same guard '.cv-spine-mark-filled' documents: an SVG
 * element's default transform origin is the outer '<svg>''s (0,0), not its
 * own box, so a bare 'scale()' here would visibly jump the dot toward the
 * sheet's corner instead of pulsing in place. */
.cv-idle-nudge-start {
  transform-box: fill-box;
  transform-origin: center;
  animation: cv-idle-nudge-start-pulse 1s ease-in-out infinite;
}
@keyframes cv-idle-nudge-start-pulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.3); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .cv-idle-nudge-start { animation: none; opacity: 1; }
}

/* T33 follow-up (orchestrator screenshot review, "too small and too
 * faint… twinkling: scale/opacity pulse"): the night hint's own twinkle
 * ('canvas/RevealLayer.tsx''s 'NIGHT_HINT_SPARKLE_PATH' + its warm glow
 * circle) — scale AND opacity now, never opacity alone. 'transform-box:
 * fill-box'/'transform-origin: center' is the same guard '.cv-spine-mark-
 * filled' already documents: the glow circle and the star are concentric
 * (both centred on the same translated origin), so scaling the wrapping
 * group around their shared bounding-box centre keeps them pulsing as ONE
 * light, never drifting apart. Reduced motion holds it at a single large,
 * legible frame — scale 1, a clearly-visible opacity — never shrunk. */
.cv-night-hint-sparkle {
  transform-box: fill-box;
  transform-origin: center;
  animation: cv-night-hint-twinkle 1.4s ease-in-out infinite;
}
@keyframes cv-night-hint-twinkle {
  0%, 100% { opacity: 0.55; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.2); }
}
@media (prefers-reduced-motion: reduce) {
  .cv-night-hint-sparkle { animation: none; opacity: 0.85; transform: scale(1); }
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
  .cv-btn.cv-btn-art { width: 58px; height: 58px; }
  .cv-btn-art.cv-btn-back { width: 56px; height: 56px; }
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
  .cv-btn.cv-btn-art, .cv-btn-art.cv-btn-back { width: 48px; height: 48px; }
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

/** The chrome's own left/right safe inset (`docs/09`'s "small side insets" —
 *  no element on either side needs protecting, unlike the top/bottom rows).
 *  Exported (T31 follow-up) so `screen/introChrome.tsx` feeds
 *  `canvas/TraceCanvas.tsx`'s `fitContentWithInsets` the EXACT same four
 *  numbers this screen does — see this component's own `SIDE_INSET` below,
 *  which reads from here rather than restating the literal a second time. */
export const LEVEL_CHROME_SIDE_INSET = 16

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
  const SIDE_INSET = LEVEL_CHROME_SIDE_INSET

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
  // T45: a segment level (`level.segments`) is several short strokes, and
  // its marks sit on every one of them, each lit by its own segment.
  const segmentDef = level.segments
  const trailClueMarks = useMemo(
    () =>
      // [T44] `levelClueMarks`: evenly spaced, or at the places `clue.at`
      // names (the bridges' feet, the bottom or top of every loop).
      clueDef
        ? segmentDef
          ? segmentClueMarks(target.routes, clueDef.spacing, clueDef.kind)
          : levelClueMarks(target.polyline, target.length, clueDef)
        : [],
    [clueDef, segmentDef, target.routes, target.polyline, target.length],
  )

  // Collect-along-the-path (T17). `collectItems` is the SAME derived-position
  // convention `trailClueMarks` above uses — recomputed from `target`, never
  // authored coordinates. `level.corridorWidth` (the AUTHORED width, not
  // `target.corridorWidth`) is what lets the LAST item's own arc tolerate a
  // real fingertip landing short of the route's mathematically exact final
  // vertex — see `levels/collect.ts`'s `collectItemsFromPeaks` for why.
  const collectDef = level.collect
  const collectItems = useMemo<readonly CollectItem[]>(
    () =>
      collectDef ? resolveCollectItems(collectDef, target.polyline, target.length, level.corridorWidth) : [],
    [collectDef, target.polyline, target.length, level.corridorWidth],
  )
  // T39: the level mount effect below reads the items through this ref —
  // see that effect's own comment for why they must not be its dependency.
  const collectItemsRef = useRef(collectItems)
  collectItemsRef.current = collectItems

  // T20 (`odd/tasks/prewriting-stage-completion.md`, docs/19 §3.1): whether
  // this level's art corridor uses the colour-follows-the-finger mechanic —
  // read from the PIECES themselves (`ArtCorridorPiece.greyArt`), never a
  // separate level-level flag, so a level can never author `artCorridor`
  // pieces that disagree about it. Only the snake family sets `greyArt`
  // today.
  const hasSnakeColour = !!level.artCorridor?.some((piece) => !!piece.greyArt)

  // One demonstration per sub-path, played in sequence (docs/08 §5).
  // `target.demoPaths`, never `target.paths`/`level.paths`: for every
  // routed level this is the SAME array reference as `paths` (the target
  // is the CENTRED copy the engine scores against, so demo, corridor and
  // guide all sit exactly where the ideal cloud is — `buildLevel
  // centreHorizontally`); for a routeless `spines` level with `demo: true`
  // it is the generator's own first-k anchor→tip segments (the demo
  // repair, `radial-spines` capability, design.md §2 D3).
  // T13: `level.spines` alone picks the faster pace — never `target.kind` or
  // anything about the shape of `demoPaths` itself, so a future routeless
  // family that is NOT spines keeps the original shared pace by default.
  const demoStepS = level.spines ? SPINE_DEMO_STEP_S : DEMO_STEP_S
  const demoDurationS = level.spines ? SPINE_DEMO_DURATION_S : DEMO_DURATION_S
  const demos = useMemo<DrawDemo[]>(
    () =>
      target.demoPaths.map((d, idx) => ({
        d,
        delay: idx * demoStepS,
        duration: demoDurationS,
        strokeWidth: 12,
      })),
    [target.demoPaths, demoStepS, demoDurationS],
  )
  const demoMs = target.demoPaths.length * demoStepS * 1000 + 300

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
  // [T44] Where the torch is on a `level.torch` level: the fingertip while
  // it is down, `null` once it lifts (`onFrame`'s own torch block).
  const [torchPoint, setTorchPoint] = useState<{ x: number; y: number } | null>(null)
  const torchPointRef = useRef<{ x: number; y: number } | null>(null)
  const lastTorchTickRef = useRef(0)
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
  // T45: a segment level's latch (`levels/segments.ts`) and the strokes that
  // completed a segment — the only ink such a level keeps on the sheet. A
  // stroke that completed nothing leaves when the finger lifts, and the
  // segment simply waits to be drawn again. Both belong to a genuinely new
  // attempt at the level (their own `level.id` effect below), never to
  // `resetSurface`, which also runs between two strokes of the same attempt.
  const segmentRef = useRef<SegmentState>(emptySegmentState(segmentDef ? target.routes.length : 0))
  const [segmentInk, setSegmentInk] = useState<ReadonlyArray<ReadonlyArray<{ x: number; y: number }>>>([])
  // T17: a level's own collected items (`levels/collect.ts`'s `CollectState`)
  // — DELIBERATELY not reset by `restartRun` (a wall-contact reset), unlike
  // `clueState` just above: `docs/19` §2.2 point 3 requires an item to stay
  // collected even after the finger leaves the corridor, while a detective
  // trail's clue marks are explicitly meant to drain on that same reset (see
  // `restartRun`'s own comment). It IS reset on a genuinely new attempt at
  // the level, in the level-id-keyed mount effect below, same as `clueState`.
  // The ref mirrors `spineRef`/`waypointRef`'s own dual ref+state convention:
  // `onFrame` needs the FRESH value synchronously (no stale closure), and
  // `onRelease`'s completion override needs it before this render's `setState`
  // has necessarily committed.
  const collectStateRef = useRef<CollectState>(initialCollectState(collectItems, debugSearch))
  const [collectState, setCollectState] = useState<CollectState>(collectStateRef.current)
  // T29 (`odd/tasks/prewriting-stage-completion.md`, tablet playtest: "if I
  // pass quickly through the last sheep and lose by leaving the line, it
  // counts as grabbed but not as passing the level"). Root cause: approval
  // for a collect level was decided ONLY at `onRelease`, but a wall-contact
  // reset (`restartRun`, below) can fire from `onFrame` BEFORE the finger is
  // ever lifted — and `restartRun` bumps `resetSignal`, which
  // `TraceCanvas.tsx`'s own reset effect answers by calling `abortStroke()`
  // (`canvas/useTraceInput.ts`), whose own doc comment states plainly: "both
  // buffers are emptied and `onEnd` does NOT fire". So the very run that
  // just finished collecting the last item could be discarded with NO
  // `onRelease` ever called for it — `onAttempt` never runs, nothing is
  // persisted, and the child has to retrace the whole route with nothing
  // left standing on it. `isCollectComplete` cannot fix this by being
  // checked more carefully at release: release itself is what can be
  // skipped. The fix is to decide approval the INSTANT the last item is
  // collected, in `onFrame`, rather than deferring it to a release that a
  // reset can pre-empt — see the `collectDef` branch of `onFrame` and the
  // `resetOnContact` guard right below it. `false` until this run's own
  // `onFrame` reports completion; latched `true` exactly once so a later
  // `onRelease` (the same gesture continuing, or a fresh one) never re-fires
  // `onAttempt` for the same approval. Reset alongside `collectStateRef` in
  // the level-id-keyed mount effect below — a genuinely new attempt owes
  // nobody a stale approval.
  const collectApprovedRef = useRef(false)
  // T20: a snake level's own colour-reveal state (`screen/snakeColour.ts`).
  // The SAME dual ref+state convention as `collectStateRef`/`spineRef` above
  // — `onFrame` needs the fresh value synchronously every frame (the fade
  // animation reads it on ticks that never call `setState` themselves), and
  // the render below needs a REAL state value to recompute `traceArtCorridor`
  // from. Reset ONLY in the level-id-keyed mount effect below, exactly like
  // `collectStateRef` — NEVER by `resetSurface`/`restartRun`, even though a
  // piece's own live reveal (unlike a collected item) DOES reset on leaving
  // the corridor mid-trace (`snakeColourTick`'s own job). The two are
  // different resets: `resetSurface` also fires between two ORDINARY
  // strokes of the SAME multi-piece attempt (`onStart`'s
  // `clearOnFailedRetryRef`, whenever the stroke just finished did not by
  // itself pass `evaluateLevel` — true of every intermediate piece on an
  // `enforceOrder` level until the LAST one), and resetting THIS state there
  // would wipe an already-coloured piece the instant the child started the
  // next one — found live via browser QA (a screenshot showed the completed
  // small snake snap back to grey the moment the medium snake's stroke
  // began), not guessed.
  const snakeColourStateRef = useRef<SnakeColourState>(
    initialSnakeColourState(level.artCorridor?.length ?? 0, debugSearch),
  )
  const [snakeColourState, setSnakeColourState] = useState<SnakeColourState>(snakeColourStateRef.current)
  // T39: whether a stroke is in progress, for the "wake me next" pulse only
  // (`wakingPulseIndex` hides it while drawing). Mirrored from `onFrame`'s
  // own `drawing` flag and set only when it flips, so a snake level pays
  // two re-renders per stroke for it, never one per frame.
  const snakeDrawingRef = useRef(false)
  const [snakeDrawing, setSnakeDrawing] = useState(false)
  // Whether a box is the trace-phase `placeArtCorridor` placement or the live
  // arrange-phase scatter/held/snapped position is decided here; the layer
  // itself (`canvas/ArtCorridorLayer.tsx`) only ever draws the box it is
  // given. T20: a piece carrying its own `greyArt` additionally gets
  // `colourHref`/`progress` (from `snakeColourState`, this run's own reveal)
  // and `next` (`wakingPulseIndex` — the piece the child should wake next,
  // docs/19 §3.1 point 5) — never during `arrangeOpen`, since no snake level
  // authors `arrange` any more (the drag step this task removes).
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
    const nextIdx = hasSnakeColour ? wakingPulseIndex(snakeColourState, snakeDrawing) : null
    return configPieces.map((piece, i) => {
      const base: TraceArtCorridor[number] = {
        href: piece.art.href,
        box: placements[i].box,
        rotate: placements[i].rotate,
      }
      if (!piece.greyArt) return base
      const pieceState = snakeColourState.pieces[i]
      // T30 (`odd/tasks/prewriting-stage-completion.md`, "the colour doesn't
      // follow my finger that well; it lags behind"): `ArtCorridorLayer`'s
      // `progress` prop is a FRACTION OF `box.width`, not an arc-length
      // fraction — `revealFractionAt` (`levels/artCorridor.ts`) converts
      // between the two, correcting for the drawn body's own wave and its
      // untraceable head/tail (see that function's own header for the
      // measured gap this closes). A `done` piece is the one exception: it
      // shows the FULL box (`progress: 1`), never `revealFractionAt`'s own
      // `traceTo`-bounded fraction — `docs/19` §3.1 point 3, "the ones
      // already awake are untouched", stays a state `revealFractionAt` is
      // never asked about.
      const progress = pieceState?.done ? 1 : revealFractionAt(piece, pieceState?.progress ?? 0)
      return {
        ...base,
        href: piece.greyArt.href,
        colourHref: piece.art.href,
        progress,
        next: i === nextIdx,
      }
    })
  }, [
    target.artCorridor,
    level.artCorridor,
    arrangeOpen,
    arrangeState,
    arrangeConfig,
    hasSnakeColour,
    snakeColourState,
    snakeDrawing,
  ])
  // T17 follow-up: a just-collected item's own picture hops away from its
  // spot instead of just vanishing — the SAME transient-list-plus-timeout
  // convention `fadingSpineStrokes` already uses for a rejected hedgehog
  // stroke, restated here for a departing collect item. Deliberately NOT
  // reset by `restartRun`/`resetSurface` (an in-flight hop finishes on its
  // own timeout regardless), only by the level-id mount effect below.
  const [departingCollectMarks, setDepartingCollectMarks] = useState<
    readonly { id: number; x: number; y: number }[]
  >([])
  const departingCollectIdRef = useRef(0)
  const departingCollectTimeoutsRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    const timeouts = departingCollectTimeoutsRef.current
    return () => {
      for (const t of timeouts) window.clearTimeout(t)
      timeouts.clear()
    }
  }, [])
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
  // T35: the reveal-family SFX (`clean`/`found`) fire from a DEDICATED
  // effect over the committed `revealState`, never from a ref read inside
  // `onFrame`'s own rAF loop. `revealTick` is a sliding-WINDOW fold keyed by
  // `prev.seen` (`levels/revealGrid.ts`'s own header) — feeding it a ref
  // that has not yet caught up with the last commit re-processes an
  // overlapping window and can double-count a find. Diffing the actual
  // COMMITTED value here, once per real state change, cannot: `prevRevealSfxRef`
  // starts at THIS component's own initial `revealState` (so a debug-seeded
  // partial reveal never fires on mount) and both directions of a level
  // reset (a completed level's own state falling back to `EMPTY_REVEAL`) are
  // FALLING transitions that `fireRevealSfx`'s own rising-edge/growth-only
  // checks already ignore — no manual reset needed on a level change.
  const prevRevealSfxRef = useRef(revealState)
  useEffect(() => {
    fireRevealSfx(level.reveal, prevRevealSfxRef.current, revealState)
    prevRevealSfxRef.current = revealState
  }, [level.reveal, revealState])
  const lastAnimTickRef = useRef(0)
  // Read once per mount, the same one-shot convention `isPortraitGuidanceViewport`
  // itself uses — see `prefersReducedMotion`'s own header for why a listener
  // is not worth it here.
  const reducedMotionRef = useRef(prefersReducedMotion())

  // T33 (`odd/tasks/prewriting-stage-completion.md`, "help a stuck child"):
  // the idle nudge's own clocks — plain refs, not state, because every one
  // of them is written far more often (every live `onFrame` sample while
  // drawing) than it needs to trigger a render; `pollNow` below is the ONE
  // state value a slow poll actually bumps, and every idle-nudge/night-hint
  // value this screen renders is derived FROM it plus these refs, the same
  // "the caller's clock, this file's own pure selector" split
  // `screen/idleNudge.ts`'s own header documents.
  const lastTouchAtRef = useRef(performance.now())
  const lastProgressAtRef = useRef(performance.now())
  const lastHintSpokenAtRef = useRef(Number.NEGATIVE_INFINITY)
  const lastNudgeCueIndexRef = useRef(-1)
  // `bee1`/`night1` play a ONE-SHOT intro cue instead of the shared route
  // demo, which their own `kind: 'free'` shape can never animate (`demoPaths`
  // is always empty for them — `levels/catalog.ts`'s own `bee1` header).
  const [introCuePlaying, setIntroCuePlaying] = useState<boolean>(() => hasIntroCue(level))
  // Ticked on a slow poll while the sheet is actually waiting for a touch —
  // see the dedicated effect below. Every idle-nudge/night-hint value is
  // computed FROM this plus the refs above, never from a second clock.
  const [idlePollNow, setIdlePollNow] = useState<number>(() => performance.now())

  useEffect(() => {
    if (introCuePlaying) {
      const t = window.setTimeout(() => setIntroCuePlaying(false), INTRO_CUE_MS)
      return () => window.clearTimeout(t)
    }
  }, [introCuePlaying])

  // Polls at a resolution far coarser than the 60fps ink loop — the idle
  // nudge and the night hint both reason in whole seconds, so 250ms is
  // plenty to hit the ~6s/~15s/~20s thresholds within a fraction of a
  // second, at a cost of at most 4 `setState`s/second while the child is
  // genuinely idle (never while drawing — `enabled` below only runs the
  // interval for as long as there is something to wait FOR: no demo/intro
  // cue in the way, and the level not already approved).
  const idleNudgeArmed = phase === 'ready' && !introCuePlaying && !attempt?.approved
  useEffect(() => {
    if (!idleNudgeArmed) return
    const id = window.setInterval(() => setIdlePollNow(performance.now()), 250)
    return () => window.clearInterval(id)
  }, [idleNudgeArmed])

  // The night hint's own "since progress" clock resets on every NEW find —
  // `revealState.lit.size` only ever grows within an attempt (`revealTick`'s
  // own latch), so this fires exactly once per object found, never on an
  // unrelated re-render.
  useEffect(() => {
    lastProgressAtRef.current = performance.now()
  }, [revealState.lit.size])

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

  // T13 (tablet playtest #2, "a stroke that isn't a spine could disappear
  // when I lift"): rejected strokes fading out via `SpineLayer` — a small
  // list rather than a single slot, so two rejections in quick succession
  // each get their OWN fade instead of the second silently replacing the
  // first mid-animation. `fadingSpineIdRef` hands out stable keys (never
  // reused, so a stale timeout can never remove the wrong entry); the
  // pending-timeout set exists only so unmount can cancel every outstanding
  // one instead of letting it fire a `setState` on an unmounted screen.
  const [fadingSpineStrokes, setFadingSpineStrokes] = useState<
    readonly { id: number; points: readonly TracePoint[] }[]
  >([])
  const fadingSpineIdRef = useRef(0)
  const fadingSpineTimeoutsRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    const timeouts = fadingSpineTimeoutsRef.current
    return () => {
      for (const t of timeouts) window.clearTimeout(t)
      timeouts.clear()
    }
  }, [])

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
    // [T44] A new attempt starts with the torch off.
    torchPointRef.current = null
    setTorchPoint(null)
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
    // T30 (`odd/tasks/prewriting-stage-completion.md`, browser QA on the
    // hedgehog acceptance fix — "it detects fewer times than before"): the
    // spine latch is DELIBERATELY NOT reset here any more — see the T20
    // comment on `snakeColourStateRef`'s own dedicated effect below for the
    // exact same mechanism, now confirmed live for spines too: THIS function
    // is a dependency of the level.id-keyed mount effect below, and its OWN
    // identity churns on every adaptive-tolerance `record.widthFactor`
    // change (`game/adaptiveTolerance.ts`) — which fires after the THIRD
    // consecutive un-approved release, and every hedgehog release except the
    // very last is un-approved by construction (`minAccuracy: 100`). A
    // Playwright drag-by-drag replay showed exactly this: two anchors fill
    // correctly, then the THIRD release (still geometrically perfect, not a
    // rejection) wipes BOTH back to unfilled — no wall touch, no explicit
    // retry, `record.widthFactor` alone. A spine, once earned, must stay
    // earned (design.md §6, `docs/01` "no punishment") regardless of how
    // many further releases this same attempt takes; the dedicated effect
    // below resets it only for a genuinely NEW attempt at the level.
    // T13: a rejected stroke's fade resets with the run too — otherwise a
    // fade already in flight would keep counting down and vanish over the
    // FRESH attempt's own first spines.
    for (const t of fadingSpineTimeoutsRef.current) window.clearTimeout(t)
    fadingSpineTimeoutsRef.current.clear()
    setFadingSpineStrokes([])
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
    // T20: a snake's own colour reveal is DELIBERATELY NOT reset here —
    // `resetSurface` also fires between two ORDINARY strokes of the SAME
    // multi-piece attempt (`onStart`'s `clearOnFailedRetryRef`, whenever the
    // stroke just finished did not by itself pass `evaluateLevel` — which is
    // every intermediate piece on an `enforceOrder` snake level, by design,
    // until the LAST one is traced). Resetting it here would wipe an
    // already-coloured piece the instant the child started tracing the
    // NEXT one — found live, via browser QA, not guessed: a screenshot
    // showed the just-completed small snake snap back to grey the moment
    // the medium snake's stroke began. Same rule `collectStateRef` already
    // follows, for the same reason (see that ref's own comment) — only a
    // genuinely NEW attempt at the level (the level-id-keyed mount effect
    // below) starts every piece grey again.
  }, [
    level.reveal,
    level.waypoints,
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
    // T17: a level's collected items belong to THIS run too, same as the
    // clue state above — but through the ref FIRST (see `collectStateRef`'s
    // own comment: `onFrame`/`onRelease` must never read a stale value).
    collectStateRef.current = initialCollectState(collectItemsRef.current, debugSearch)
    setCollectState(collectStateRef.current)
    // T29: this run has not reported its own completion yet.
    collectApprovedRef.current = false
    // T17 follow-up: any hop still in flight belongs to the level that is
    // ENDING, never to the fresh one about to start.
    for (const t of departingCollectTimeoutsRef.current) window.clearTimeout(t)
    departingCollectTimeoutsRef.current.clear()
    setDepartingCollectMarks([])
    // T39: `collectItems` is read through a ref and is NOT a dependency.
    // It is a `useMemo` over `target.polyline`, and `target` is rebuilt on
    // every adaptive widen (`record.widthFactor`, after every third
    // unapproved release) — so `collectItems` (even the plain `[]` of a
    // level with no collect at all) came back as a NEW array with the SAME
    // content, and this whole effect re-ran mid-attempt: `resetSurface`
    // emptied the canvas's stroke buffer, the attempt, the reveal/waypoint
    // progress and the collected items, and a demo level replayed its demo
    // over the child's work. Measured on the hedgehog (every spine but the
    // last is an unapproved release): the buffer was wiped on releases 3,
    // 6 and 9, which is why the score could never reach the spines the
    // latch already showed. The items only change with the level itself
    // (`collectDef`, listed), never with the corridor's width.
  }, [level.id, playDemo, resetSurface, trailClueMarks.length, collectDef, debugSearch])

  // T33: the idle nudge's own clocks belong to THIS level — deliberately its
  // own effect, keyed on `level.id` alone, for the same reason the T20 snake-
  // colour effect below is not folded into the combined mount effect above
  // (that effect's own `resetSurface` dependency churns far more often than
  // "a genuinely new level started", which is the only thing that should
  // ever rewind these). `bee1`/`night1` re-arm their one-shot intro cue here
  // too — the ONE place a level is known to have just started fresh.
  useEffect(() => {
    const now = performance.now()
    lastTouchAtRef.current = now
    lastProgressAtRef.current = now
    lastHintSpokenAtRef.current = Number.NEGATIVE_INFINITY
    lastNudgeCueIndexRef.current = -1
    setIntroCuePlaying(hasIntroCue(level))
    setIdlePollNow(now)
  }, [level.id])

  // T20: a snake level's own colour reveal belongs to a genuinely NEW attempt
  // at THIS level — deliberately its OWN effect, keyed on `level.id` alone
  // (plus `debugSearch` for `?debug=vibora:<k>`), rather than folded into the
  // combined mount effect just above. Found live, via browser QA: that
  // effect also depends on `resetSurface`, whose OWN identity changes
  // whenever `target` does — which includes every adaptive-tolerance
  // `record.widthFactor` change (`game/adaptiveTolerance.ts`), and EVERY
  // intermediate piece of a multi-piece `enforceOrder` snake level reports
  // `approved: false` on release (only the LAST one can pass), which is
  // exactly the input that widens the corridor. A screenshot showed an
  // already-completed piece snap back to grey the instant the CHILD STARTED
  // THE NEXT ONE, with no wall touch and no failed retry involved — the
  // adaptive-tolerance recompute alone was enough to refire that shared
  // effect. This effect names only what it actually needs to reset for, so
  // an unrelated `resetSurface` identity change can never reach it.
  useEffect(() => {
    snakeColourStateRef.current = initialSnakeColourState(target.routes.length, debugSearch)
    setSnakeColourState(snakeColourStateRef.current)
    // `target.routes.length` is not listed: it is a fixed count derived
    // 1:1 from `level.id`'s own authored `paths` (never from the adaptive
    // `record.widthFactor` `target` itself also depends on), so it can only
    // ever change together with `level.id`, which IS listed.
  }, [level.id, debugSearch])

  // T30 (`odd/tasks/prewriting-stage-completion.md`, browser QA on the
  // hedgehog acceptance fix): the spine latch belongs to a genuinely NEW
  // attempt at THIS level — the SAME fix as `snakeColourStateRef`'s own
  // effect just above, for the identical reason. A hedgehog level's
  // `minAccuracy: 100` (T19) means every release except the very last
  // reports `approved: false`, which is exactly the input `game/
  // adaptiveTolerance.ts` counts toward its three-consecutive-failure
  // corridor widen — and that widen changes `record.widthFactor`, which
  // changes `target`, which changes `resetSurface`'s own identity, which
  // used to refire the combined mount effect above (`resetSurface` sits in
  // its dependency list) and wipe every already-filled spine right there,
  // mid-attempt, with no wall touch and no explicit retry. A Playwright
  // drag-by-drag replay caught it directly: two anchors filled correctly,
  // then the third release — itself accepted, not a rejection — reset both
  // back to unfilled. A spine, once earned, stays earned for the rest of
  // this attempt (design.md §6, `docs/01` "no punishment"); only a genuinely
  // new attempt (this effect) starts every spine unfilled again.
  useEffect(() => {
    spineRef.current = initialSpineState(level.spines, debugSearch)
    setSpineState(spineRef.current)
    // T45: the segment latch and its ink, for the same reason.
    segmentRef.current = emptySegmentState(level.segments ? target.routes.length : 0)
    setSegmentInk([])
    // `level.spines` is not listed: like `target.routes.length` above, it is
    // a fixed config derived 1:1 from `level.id`'s own authored catalog
    // entry, never from the adaptive `record.widthFactor` `target` also
    // depends on, so it can only ever change together with `level.id`,
    // which IS listed.
  }, [level.id, debugSearch])

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

  // T33: the idle nudge's own "no touch for ~6s" is measured from when the
  // sheet actually becomes touchable — the moment `phase` reaches `'ready'`,
  // whether that is immediately (no demo for this level) or only once a
  // route demo/replay has finished. Without this, a level with a multi-
  // second demo would silently eat part of its own idle countdown before
  // the child could touch anything at all.
  useEffect(() => {
    if (phase === 'ready') lastTouchAtRef.current = performance.now()
  }, [phase])

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
  // T41: a hazard ALWAYS restarts the run on contact, on every level that
  // has one — including a level whose walls are forgiving (`resetOnContact:
  // false`: turtles, monkeys) and a routeless one (the bee). The walls keep
  // their own rule; only the thing the child is asked to wait for bites.
  const hazardResets = obstacles.length > 0
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
    // T13: same reset as `resetSurface` — dead today (this function's own
    // comment below: unreachable for a `spines` level), kept only so it
    // cannot silently reproduce the waypoint fold's own bug the moment
    // either ever becomes reachable together.
    for (const t of fadingSpineTimeoutsRef.current) window.clearTimeout(t)
    fadingSpineTimeoutsRef.current.clear()
    setFadingSpineStrokes([])
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
    // T41: a bee level reaches `restartRun` now (its hazard), and the
    // flowers it already opened STAY open — the rule T29 set for collected
    // items ("collected things persist"). Only `seen` goes back to 0, because
    // the next stroke is a new one; approval reads the latch
    // (`levelCompletion.ts`), not the buffer this restart empties. This also
    // retires the old latent defect recorded here (`radial-spines` design.md
    // §6/§9 item 5): the bare `EMPTY_WAYPOINTS` reset would have wiped a
    // `?debug=estela:<k>` seed.
    if (waypointRef.current.seen !== 0) {
      waypointRef.current = { ...waypointRef.current, seen: 0 }
      setWaypointState(waypointRef.current)
    }
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
    // T20: a snake's own colour reveal is deliberately NOT reset here either
    // — `resetSurface`'s own comment above has the full reasoning (a piece
    // already coloured must survive an ordinary mid-attempt reset, the same
    // rule `collectStateRef` already follows). Doubly moot for snakes today
    // since every snake level sets `resetOnContact: false`, so `restartRun`
    // is unreachable for a `hasSnakeColour` level in the first place — but
    // matching the rule here too means it cannot silently regress the
    // moment `resetOnContact` and the colour mechanic ever meet.
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
    // T33: a touch is the one thing that stops the idle nudge outright — the
    // intro cue too, since a child who is already touching does not need a
    // demo of where to start.
    lastTouchAtRef.current = performance.now()
    setIntroCuePlaying(false)
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
      // T33: any live sample means the child is actively on the sheet —
      // resets the idle nudge's own clock every such frame, so it can only
      // ever fire during a genuine pause. A plain ref write, not a
      // `setState`: nothing needs to re-render on every one of these, only
      // the slow poll (`idlePollNow`, above) that reads it later.
      if (drawing) lastTouchAtRef.current = timeMs
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
      // T20: the snake colour reveal's own clock tick — rides this SAME
      // sample, ahead of every early return below (the same reason the T10
      // block above does), so a piece already fading back to grey keeps
      // animating even after the finger lifts (`drawing: false`) or while
      // mid-arrange, exactly like `levels/revealGrid.ts`'s own torch fade.
      // `snakeColourTick` reads `drawing`/`point` itself and is cheap (three
      // short polylines), so it runs unthrottled, every frame — no separate
      // `LIGHT_ANIM_TICK_MS`-style gate is worth the complexity here.
      if (hasSnakeColour) {
        if (drawing !== snakeDrawingRef.current) {
          snakeDrawingRef.current = drawing
          setSnakeDrawing(drawing)
        }
        const head = drawing ? points[points.length - 1] : undefined
        const next = snakeColourTick(
          snakeColourStateRef.current,
          target.routes,
          head ? { x: head.x, y: head.y } : null,
          drawing,
          target.corridorWidth,
          timeMs,
        )
        if (next !== snakeColourStateRef.current) {
          // T35: fire the shimmer exactly once, on the tick where the LAST
          // piece finishes — `onRisingEdge`'s own "edge, not level" gate, so
          // an already-fully-coloured snake never replays it on every later
          // frame this branch still runs.
          const wasDone = snakeColourStateRef.current.pieces.length > 0 && snakeColourStateRef.current.pieces.every((p) => p.done)
          const isDone = next.pieces.length > 0 && next.pieces.every((p) => p.done)
          onRisingEdge(wasDone, isDone, () => playSfx('snakeColour'))
          snakeColourStateRef.current = next
          setSnakeColourState(next)
        }
      }
      // [T44] The torch over a routed level (`level.torch`): the light
      // follows the fingertip while it is down and goes out when it lifts.
      // Throttled to `TORCH_TICK_MS` (the off-path sample's own ~30 Hz):
      // every move re-unions the veil's circles, which the night levels
      // already pay at this rate.
      if (level.torch) {
        const head = drawing ? points[points.length - 1] : undefined
        const prev = torchPointRef.current
        if (!head) {
          if (prev) {
            torchPointRef.current = null
            setTorchPoint(null)
          }
        } else if (!prev || timeMs - lastTorchTickRef.current >= TORCH_TICK_MS) {
          lastTorchTickRef.current = timeMs
          const next = { x: head.x, y: head.y }
          torchPointRef.current = next
          setTorchPoint(next)
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
      // T45: a segment level lights its marks from the segment latch at
      // release instead (`onRelease`), never from arc progress here.
      if (shouldTickClue(!!clueDef && !segmentDef && trailClueMarks.length > 0, out)) {
        const maxArc = corridorSample.track.tracks[corridorSample.active].maxArc
        setClueState((prev) => clueTick(prev, maxArc, trailClueMarks))
      }
      // T17: a level's own collect items ride this SAME sample, gated on
      // `!out` for the exact reason the clue channel above is — an item
      // earned while the fingertip is genuinely outside the corridor is the
      // same bug class a screenshot already caught for clues. Through the
      // ref FIRST (see `collectStateRef`'s own comment), then `setState`
      // only when the fold actually changed — `collectTick` is monotone and
      // returns the exact same reference otherwise.
      if (collectDef && collectItems.length > 0 && !out) {
        const maxArc = corridorSample.track.tracks[corridorSample.active].maxArc
        const prevCollected = collectStateRef.current
        const next = collectTick(prevCollected, maxArc, collectItems)
        if (next !== prevCollected) {
          collectStateRef.current = next
          setCollectState(next)
          // T17 follow-up: whichever index flipped false -> true THIS tick
          // hops away from its spot — never the whole array, so re-passing
          // an already-collected item's arc (harmless, `collectTick` is
          // monotone) never replays its animation.
          // `typeof window` guard: this same onFrame closure is exercised
          // directly (no DOM) by `LevelPlay.test.tsx`'s SSR wiring tests —
          // the departing-hop animation is cosmetic/browser-only, so a node
          // environment simply skips scheduling it rather than throwing.
          if (typeof window !== 'undefined') {
            // T35: the running collected-count BEFORE this tick's own flips —
            // `playSfx('collect', { index })` rises a little per item, so a
            // level's pieces are given consecutive indices even when more
            // than one flips in the same tick (a debug-seeded start).
            let collectIndex = prevCollected.collected.filter(Boolean).length
            next.collected.forEach((isCollected, i) => {
              if (!isCollected || prevCollected.collected[i]) return
              playSfx('collect', { index: collectIndex++ })
              const item = collectItems[i]
              const id = ++departingCollectIdRef.current
              setDepartingCollectMarks((marks) => [...marks, { id, x: item.x, y: item.y }])
              const timeout = window.setTimeout(() => {
                departingCollectTimeoutsRef.current.delete(timeout)
                setDepartingCollectMarks((marks) => marks.filter((m) => m.id !== id))
              }, COLLECT_HOP_MS)
              departingCollectTimeoutsRef.current.add(timeout)
            })
          }
          // T29: the LAST item just flipped to collected — the level is
          // PASSED right now, whatever the finger does next (leaving the
          // line, lifting, or a wall-contact reset: see `collectApprovedRef`'s
          // own comment for why waiting for `onRelease` is not safe here).
          // Approval never depends on the pillars below (docs/19 §2.2 point
          // 4, `failedPillar: null`, same override `onRelease` already
          // applies) — `evaluateLevel` is still called, on the CURRENT
          // in-progress stroke, only to fill the record's accuracy/fluency
          // fields with a real measurement instead of a placeholder.
          // `pointerType` is unknown this early (only `onRelease` receives
          // it) — 'touch' matches this app's actual device (docs/02) and,
          // like every other pillar value here, is never shown for a collect
          // level and never gates this outcome.
          if (!collectApprovedRef.current && isCollectComplete(next)) {
            collectApprovedRef.current = true
            const evaluated = evaluateLevel([points], target, 'touch')
            const result: LevelAttempt = { ...evaluated, approved: true, failedPillar: null }
            setAttempt(result)
            setPhase('result')
            playApprovalTone() // best-effort, approval only
            onAttempt(result)
          }
        }
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
        !segmentDef &&
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
      //
      // T29: `!collectApprovedRef.current` — once a collect level's last item
      // is collected there is nothing left ON THE SHEET for a reset to send
      // the child back to (every item's own picture is already gone,
      // permanently: `collectStateRef` is never rewound by `restartRun`), and
      // the level is already passed regardless (see the `collectDef` block
      // above). Restarting it anyway would be pure busywork — retracing an
      // empty route — and, worse, `restartRun` calls `setAttempt(null)`,
      // which would erase the very approval this same tick may just have
      // set. "No reset may ever leave the child on a level with nothing left
      // to collect" (T29's own binding rule) is satisfied by never resetting
      // a collect level once it is done.
      //
      // T41: the same guard for a waypoint level — once the bee has every
      // flower and the hive, a hazard has nothing left to send it back from.
      if (
        (resetOnContact || hazardResets) &&
        !collectApprovedRef.current &&
        !(level.waypoints && waypointsComplete(waypointRef.current, level.waypoints))
      ) {
        const hazardHit = hazardResets && hitObstacle(head, obstaclesRef.current, target, now) >= 0
        const next = contactTick(contactRef.current, contactThisSample(resetOnContact, out, hazardHit))
        contactRef.current = next
        if (next.reset) restartRun()
      }
    },
    [
      target,
      feedback.tone,
      feedback.haptics,
      resetOnContact,
      hazardResets,
      restartRun,
      clueDef,
      trailClueMarks,
      collectDef,
      collectItems,
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
      hasSnakeColour,
      level.torch,
      onAttempt,
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
      // RAW points, always. `snapshot` is the captured stroke, never the
      // rail-warped copy the canvas draws — scoring the assist would make
      // accuracy a measurement of the rail instead of the child (see `rail.ts`).
      const releasedReveal = releasedRevealState(level.reveal, snapshot, target.viewBoxWidth, revealStateRef.current)
      if (releasedReveal) setRevealState(releasedReveal)
      const evaluated = evaluateLevel(snapshot, target, pointerType)
      // T39: the release decision lives in `screen/levelCompletion.ts`
      // (`releaseOutcome`, which states the root cause in full): a level
      // whose "done" is COUNTED in parts — spines, snake colour, collect
      // items — is approved by those parts, read from the latch the child
      // sees, never by re-scoring a canvas buffer that `onStart`'s
      // clear-on-failed-retry (or any mid-attempt reset) may already have
      // emptied of the earlier parts' strokes.
      //
      // T17 (docs/19 §2.2 point 4): on a collect level approval is the LAST
      // item being collected — through the ref, since a same-tick `onFrame`
      // `setState` is not guaranteed to have committed yet (the same race
      // `reachedEndRef` above is read through a ref to avoid). No failure
      // pillar is attached to a collect miss (`failedPillar: null`): the
      // collect bar's own remaining count is the only "what's left" signal
      // these levels ever show (design.md §2.2 point 5, `docs/01` "no
      // punishment, no red, no failure sound").
      // T41: the bee's latch, folded with the stroke just released (the last
      // frame's segment may not have been sampled yet), so approval reads
      // the flowers the child sees open.
      let releasedWaypoints: WaypointState | undefined
      if (level.waypoints && !waypointPin) {
        const lastReleased = snapshot[snapshot.length - 1] ?? []
        releasedWaypoints = waypointTick(waypointRef.current, lastReleased, true, level.waypoints)
        if (releasedWaypoints !== waypointRef.current) {
          waypointRef.current = releasedWaypoints
          setWaypointState(releasedWaypoints)
        }
      }
      // T45: a segment level judges the stroke just released against its
      // segments; one that completes a segment keeps its ink and lights
      // that segment's marks.
      let releasedSegments: SegmentState | undefined
      if (segmentDef) {
        const lastReleased = snapshot[snapshot.length - 1] ?? []
        const settled = settleSegmentRelease(
          segmentRef.current,
          lastReleased,
          target.routes,
          target.corridorWidth,
          segmentDef,
        )
        releasedSegments = settled.state
        if (settled.accepted >= 0) {
          segmentRef.current = settled.state
          setSegmentInk((ink) => [...ink, lastReleased])
          setClueState(segmentClueState(trailClueMarks, settled.state.done))
          if (feedback.haptics) pulseOnLeaving(false, true)
        }
      }
      const outcome = releaseOutcome({
        evaluated,
        snapshot,
        segments: releasedSegments,
        waypoints:
          level.waypoints && releasedWaypoints ? { state: releasedWaypoints, cfg: level.waypoints } : undefined,
        collectComplete: collectDef ? isCollectComplete(collectStateRef.current) : undefined,
        spines: level.spines && !spinePin ? { prev: spineRef.current, cfg: level.spines } : undefined,
        snakes: hasSnakeColour ? snakeColourStateRef.current : undefined,
      })
      const result = outcome.attempt
      // The spine latch (`radial-spines` capability, design.md §2 D1): a
      // spine is a spine only once it ends, so the latch moves at RELEASE
      // only, by the stroke JUST released and nothing else
      // (`settleSpineRelease`). The one-shot haptic edge fires here,
      // mirroring the waypoint fold's own `opened` edge in `onFrame` above.
      if (outcome.spineState && outcome.spineState !== spineRef.current) {
        spineRef.current = outcome.spineState
        setSpineState(outcome.spineState)
        if (feedback.haptics) pulseOnLeaving(false, true)
        playSfx('spine') // T35: one tiny click-pop per accepted spine
      }
      // T13 (tablet playtest #2, "a stroke that isn't a spine could be
      // erased as soon as I lift the finger"): a released stroke that did
      // not become a spine is never shown as permanent ink (`shownStrokes`
      // is empty on a `spines` level); it fades out through `SpineLayer`
      // (`fadingSpineStrokes` below, `LAYOUT_CSS`'s `.cv-spine-fading`).
      // T19's fix for a stroke lingering un-faded read this from a fresh
      // walk of the whole buffer because the latch used to re-walk old
      // strokes (and could "grow" on a release whose own stroke was the
      // rejected one); T39's `settleSpineRelease` folds only this stroke,
      // so `spineAccepted` IS "this stroke became a spine", exactly.
      const lastStroke = snapshot[snapshot.length - 1]
      if (outcome.spineAccepted === false && lastStroke && lastStroke.length > 0) {
        const id = ++fadingSpineIdRef.current
        setFadingSpineStrokes((prev) => [...prev, { id, points: lastStroke }])
        const timeout = window.setTimeout(() => {
          fadingSpineTimeoutsRef.current.delete(timeout)
          setFadingSpineStrokes((prev) => prev.filter((f) => f.id !== id))
        }, SPINE_REJECT_FADE_MS)
        fadingSpineTimeoutsRef.current.add(timeout)
      }
      setAttempt(result)
      setPhase('result')
      // T29: on a collect level, `onFrame` already ran this exact override
      // (`{ ...evaluated, approved: true, failedPillar: null }`) and reported
      // it to `onAttempt` the instant the last item was collected, precisely
      // so a wall-contact reset could never swallow it (see
      // `collectApprovedRef`'s own comment). This release may be that SAME
      // gesture simply continuing (nothing more to approve) or, if a reset
      // did fire (now a no-op past that point, see the `onFrame` guard), a
      // later one — either way `onAttempt` must not fire a SECOND time for
      // one approval (`zoo/progress.ts` counts approvals/streaks per call).
      // `setAttempt`/`setPhase` above still run unconditionally, so the UI
      // reflects this release's own (equally approved) snapshot rather than
      // the earlier partial one.
      const alreadyFinalized = !!collectDef && collectApprovedRef.current
      if (alreadyFinalized) return
      if (result.approved) {
        playApprovalTone() // best-effort, approval only
        // T35: an erase-family level (glass/sand/mud/leaves) has no
        // `completeAt` to diff (`fireRevealSfx`'s own header) — its "done"
        // IS this exact approval, so `clean` fires from it directly.
        if (level.reveal?.mode === 'erase') playSfx('clean')
      }
      // `result` is reported to `onAttempt` exactly as before on every
      // level — the parent (`GameScreen`) persists it and bumps its own
      // `version`, which is what recomputes this level's `progress` prop
      // (`zoo/progress.ts`) with this attempt's own filing already in it.
      onAttempt(result)
    },
    [
      target,
      onAttempt,
      clueDef,
      collectDef,
      arrangeOpen,
      level.spines,
      level.reveal,
      level.waypoints,
      spinePin,
      waypointPin,
      feedback.haptics,
      hasSnakeColour,
      segmentDef,
      trailClueMarks,
    ],
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
    // `standBesideArtCorridor` already rotates the offset WITH the piece
    // (`placeArt.test.ts`'s own "rotate:-90 column shifts on Y, not X"
    // proof) — verified on `snake3`'s rotated column too
    // (`fix-snakes-true-alignment`'s own browser QA), so a rotated piece no
    // longer needs to fall back to the unmoved default.
    if (piece0 && startMarker) return standBesideArtCorridor(startMarker, piece0, OCTOPUS_STAND_MARGIN, true)
    // [T45 follow-up] On a segment level the octopus stands beside the
    // segments, never on a start dot, stop mark, clue or corridor.
    if (segmentDef) return segmentOctopusFeet(target)
    return undefined
  }, [target, startMarker, segmentDef])
  const directionArrow = useMemo(() => directionArrowOf(target), [target])

  // T33 (`odd/tasks/prewriting-stage-completion.md`, "help a stuck child"):
  // the idle nudge's own derived values — every one of them a pure function
  // of `idlePollNow`/the refs above, recomputed on each slow poll (never on
  // the 60fps ink loop). `idleCueForLevel` picks the right geometry for this
  // level's own kind (`screen/idleNudgeCue.ts`'s own header).
  const idleCueSegment = useMemo(
    () =>
      idleCueForLevel(level, {
        startMarker,
        directionArrowPoint: directionArrow ? { x: directionArrow.x, y: directionArrow.y } : undefined,
        spineState,
        // T33 follow-up (browser QA on `duck-trail1`): `inWorld` is exactly
        // the condition `startArt` below renders the octopus under (a
        // detective trail) — pushing the slide clear of its own larger
        // drawn footprint, the screenshot that caught it nearly invisible
        // underneath it.
        hasStartArt: inWorld,
      }),
    [level, startMarker, directionArrow, spineState, inWorld],
  )
  const nudgeElapsedMs = idlePollNow - lastTouchAtRef.current
  const nudgePhase = idleNudgePhase(nudgeElapsedMs)
  const nudgeCueIndex = idleNudgeCueIndex(nudgeElapsedMs)
  // The spoken hint repeats at most every ~20s, independent of how often the
  // VISUAL cue itself repeats — fires once per `nudgeCueIndex` RISING EDGE
  // (never once per poll, or a still-showing cue would retrigger speech
  // every 250ms).
  useEffect(() => {
    if (nudgeCueIndex < 0 || nudgeCueIndex === lastNudgeCueIndexRef.current) return
    lastNudgeCueIndexRef.current = nudgeCueIndex
    const now = performance.now()
    if (!shouldSpeakIdleHint(now - lastHintSpokenAtRef.current, DEFAULT_IDLE_NUDGE_CONFIG)) return
    lastHintSpokenAtRef.current = now
    if (canAutoSpeak()) speak(level.hint)
  }, [nudgeCueIndex, level.hint])
  // Shows the cue for the general idle nudge (`nudgePhase === 'nudge'`) OR,
  // once per level, the one-shot intro for `bee1`/`night1` — the two never
  // overlap (`idleNudgeArmed`, above, only starts the poll once the intro
  // cue is done). `-1` is a key no real `nudgeCueIndex` ever takes (it starts
  // at 0), so the intro's own mount never collides with the nudge's first
  // occurrence.
  const showIdleCue = introCuePlaying || nudgePhase === 'nudge'
  const idleCueKey = introCuePlaying ? -1 : nudgeCueIndex
  const idleCue =
    showIdleCue && idleCueSegment
      ? {
          visual: idleCueSegment.visual as IdleCueVisual,
          from: idleCueSegment.from,
          to: idleCueSegment.to,
          cueKey: idleCueKey,
          reducedMotion: reducedMotionRef.current,
        }
      : null
  // The start dot's own stronger pulse belongs to the ONGOING nudge, not the
  // one-shot level intro — the intro is "here is how this works", the nudge
  // is "you seem stuck", and only the second one needs the dot itself to
  // insist.
  const idleNudgeActive = nudgePhase === 'nudge'

  // The night hint (T33 item 2) — a SEPARATE, much more targeted cue than
  // the general idle nudge above: it needs real elapsed searching time
  // (measured from the last find, or the level's own start) rather than
  // "elapsed since last touch", and it only ever applies to a `light`
  // reveal. `from` is the last known torch position — live if the finger is
  // down, the fading ghost if it just lifted, the sheet's own centre before
  // any touch at all — so "nearest" is measured from where the child
  // actually is, not an arbitrary origin.
  const nightHint = useMemo(() => {
    if (level.reveal?.mode !== 'light') return null
    const from = revealState.point ?? revealState.torchGhost ?? { x: target.viewBoxWidth / 2, y: 300 }
    const elapsed = idlePollNow - lastProgressAtRef.current
    return nightHintFor(level.reveal, revealState, elapsed, from, target.viewBoxWidth)
  }, [level.reveal, revealState, idlePollNow, target.viewBoxWidth])

  // Where the route ends. A `kind: 'free'` level has no route, so it gets no
  // goal — and no start dot and no arrow either, which is why the standing line
  // below has to be derived rather than fixed.
  //
  // [the carrier repair, recorded gap] `goalArt` stays dead on a `kind:
  // 'free'` level — not repaired here, deferred to row G, because the
  // hive's coordinate and its touch radius must live in the same object
  // (`WaypointConfig.goal` already is that object; `goalArt` alone is not).
  // T17 follow-up: a collect level renders NO end marker at all — not even
  // the default hollow diamond `endMarker && !endArt` would otherwise draw
  // once `endArt` is suppressed above. The route's own end is the LAST
  // collect item, drawn entirely through vertexArt/vertexArtDeparting; a
  // diamond popping into that exact spot once the item hops away is the
  // same "two pictures in one place" defect this follow-up exists to fix.
  //
  // T20 follow-up (orchestrator screenshot review): the SAME abstract hollow
  // diamond used to sit on the big snake's own tail on every snake level —
  // `docs/18` D20 already flagged that shape as meaningless on its own, and
  // once a snake's own body IS the goal (it turns and stays coloured), a
  // second, unrelated rhombus parked on the tail reads as clutter with no
  // relationship to what just happened. Suppressed the same way `collectDef`
  // already is, for every level this task's own colour mechanic applies to
  // (`hasSnakeColour`, never a hardcoded snake id).
  const endMarker = useMemo(
    () =>
      level.kind === 'path' && !collectDef && !hasSnakeColour && !segmentDef ? goalMarkerOf(target) : undefined,
    [level.kind, target, collectDef, hasSnakeColour, segmentDef],
  )
  // T45: a segment level marks every segment's own start and stop instead
  // (`TraceCanvas`'s `routeMarkers`); the octopus stands beside them
  // (`segmentOctopusFeet`), so the first start keeps its own dot too.
  const routeMarkers = useMemo(
    () =>
      segmentDef
        ? target.routes.map((route) => ({
            start: route.polyline[0],
            end: route.polyline[route.polyline.length - 1],
          }))
        : undefined,
    [segmentDef, target.routes],
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
  // T17 follow-up: a collect level's route-end picture is the LAST collect
  // item, drawn entirely through the vertexArt/vertexArtDeparting layer
  // below (so it can hop away and stay gone) — never through `endArt`. Every
  // branch below (goalArt, the encounter animal, a clue, the plain star)
  // would otherwise pop a SECOND, different picture into the exact spot the
  // last item just vacated, which is the opposite of "the spot is empty
  // afterwards".
  // T20 (`odd/tasks/prewriting-stage-completion.md` §3.1): a snake-colour
  // level's own route-end reward icon used to show the recovered animal's
  // art (`ZOO_ANIMAL_ART.vibora`, a medium snake) parked beside the LARGE
  // snake's own tail on `snake4` — a real defect once every piece can turn
  // fully coloured on its own: a floating fourth snake read as clutter, not
  // as "restored", and the colour-follows-the-finger payoff (every piece
  // ending the run fully coloured) is already the encounter. Suppressed for
  // whichever levels this task's own mechanic applies to — never a
  // hardcoded `snake4` id, so a future snake level inherits the rule for
  // free — the same way `collectDef` already suppresses it above.
  const endArt = collectDef || hasSnakeColour || segmentDef
    ? undefined
    : level.goalArt
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
      // [T44] A torch level draws no corridor at all: the clue marks under
      // the light are the only guide (`docs/21` §3.2.7, "seguir un trazo sin
      // corredor"). The walls still score and collect (`target.routes`).
      showCorridor && !level.torch
        ? { paths: target.paths, width: target.corridorWidth, taper: level.taper }
        : undefined,
    [showCorridor, level.torch, target.paths, target.corridorWidth, level.taper],
  )

  // Settled ink of previous strokes, pulled the SAME way the live ink was, so
  // an assisted attempt does not visibly snap back the instant the finger
  // lifts. `strokes` itself stays raw — it is what was scored.
  const shownStrokes = useMemo(() => {
    // T19 (`odd/tasks/prewriting-stage-completion.md` §3.3, "el trazo se
    // convierte en espina"): on a hedgehog level, an accepted stroke's own
    // raw ink is NEVER shown as permanent ink here any more — the instant an
    // anchor fills, its clean spike (`spines.spikes` below, `SpineLayer`)
    // takes over, so this list is always empty for a `spines` level. A
    // rejected stroke is never silently dropped with no feedback either: it
    // fades through `SpineLayer` instead (`fadingSpineStrokes` above), the
    // instant it is released. `strokes` itself (the state `onRelease` sets
    // from the canvas's own full captured list) is UNCHANGED — still every
    // stroke ever drawn this attempt, exactly what `evaluateLevel` scores —
    // this filtering is render-only.
    if (level.spines) return []
    // T45: only the strokes that completed a segment stay (`segmentInk`).
    const kept = level.segments ? segmentInk : strokes
    return inkWarp ? kept.map((stroke) => stroke.map((p) => inkWarp(p))) : kept
  }, [strokes, inkWarp, level.spines, level.segments, segmentInk])
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
    return trailClueMarks.map((mark, idx) => {
      const art = CLUE_ART[mark.kind]
      // [T44] By torchlight a print is drawn as it is (black) from the start:
      // the drained grey all but vanishes in the pool of light, and there the
      // prints are the only guide. Finding them is the light falling on them.
      const img = clueState.lit[idx] || level.torch ? art.art.earned : art.art.drained
      return {
        x: mark.x,
        y: mark.y,
        angle: mark.angle,
        href: img.href,
        w: img.w,
        h: img.h,
        size: level.torch ? TORCH_CLUE_MARK_SIZE : CLUE_MARK_SIZE,
      }
    })
  }, [clueDef, trailClueMarks, clueState, level.torch])

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
    return b ? { href: b.art.href, quiet: b.quiet, channel: b.channel, ...(b.edge ? { edge: b.edge } : {}) } : undefined
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
  // T15: the hold is a pure function of the LEVEL, not of the attempt, so it
  // never changes mid-celebration — memoized only so the effect's own
  // dependency array can name plain numbers instead of a fresh object every
  // render.
  const hold = useMemo(() => celebrationHold(level), [level])
  // T30 (`odd/tasks/prewriting-stage-completion.md`, tablet play-test: "I
  // think when you finish the level it goes away abruptly"): investigated
  // and NOT fixed here, on purpose — this timer's own contract is correct
  // and already covered (`LevelPlay.test.tsx`'s `celebrationHold` suite): a
  // Playwright replay of a real night1 completion showed the scene staying
  // fully lit and stable for the ENTIRE `hold.startDelayMs + hold.holdMs`
  // window (1.4s completion growth, then 4s hold, confirmed frame-by-frame),
  // with no premature cut. The actual abrupt moment is ONE FRAME LATER: the
  // instant `onNextRef.current()` fires below, `screen/GameScreen.tsx`
  // swaps `state.levelId`, which changes `ScreenTransition`'s own key
  // (`screenTransitionKey`) and REMOUNTS its wrapper — the fully-lit night
  // scene unmounts immediately, with nothing left on screen to fade FROM
  // while the wipe grows IN the next level, so the area outside the
  // growing circle briefly shows the page's own plain background (a stark
  // white flash) between the warm lit scene and the next level's own dark
  // starting frame. That is a property of `ScreenTransition.tsx`/
  // `GameScreen.tsx`'s key-swap remount, not of this file's own timing or
  // of `levels/revealGrid.ts`'s growth animation — outside this task's own
  // file scope (`canvas/ArtCorridorLayer.tsx`, `levels/revealGrid.ts`,
  // `canvas/RevealLayer.tsx`, and this file's own localized wiring), and
  // squarely the screen-transition capability another task already owns.
  useEffect(() => {
    advancingRef.current = false
    setSkipReady(false)
    if (!celebrating) return undefined
    const grace = window.setTimeout(() => setSkipReady(true), CELEBRATE_SKIP_GRACE_MS)
    const advance = window.setTimeout(() => {
      if (advancingRef.current) return
      advancingRef.current = true
      onNextRef.current()
    }, hold.startDelayMs + hold.holdMs)
    return () => {
      window.clearTimeout(grace)
      window.clearTimeout(advance)
    }
  }, [celebrating, hold.startDelayMs, hold.holdMs])
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

  // T17 follow-up (`odd/tasks/prewriting-stage-completion.md`, orchestrator
  // screenshot review): a collect level's own items REPLACE `vertexArt`
  // (`levels/catalog.ts` authors `collect` alone, never both) — a picture
  // stands at an item's spot only while that item is still un-collected, so
  // "I got it" reads as the sheep actually leaving the peak, not a second,
  // independent decoration that never reacts to collection at all.
  // [T27 follow-up, orchestrator screenshot review 2026-09-27] A collect
  // level whose `art` is a `PLACEHOLDER_ZOO_ANIMALS` entry (`isPlaceholderArt`)
  // never reaches `TraceCanvas`'s own `vertexArt`/`vertexArtDeparting` — that
  // prop draws a plain `<image href>`, which for a placeholder animal is the
  // grey sign block itself: five meaningless boxes, not "a monkey is here".
  // `collectPlaceholderBadges`/`collectPlaceholderBadgesDeparting`, below,
  // compute the SAME positions instead, rendered as `PlaceholderAnimalBadge`s
  // through `TraceCanvas`'s own `children` slot — never a second `<image>`.
  const collectVertexArt = useMemo<TraceVertexArt | undefined>(() => {
    if (!collectDef || isPlaceholderArt(collectDef.art)) return undefined
    const at = collectItems
      .filter((_, i) => !collectState.collected[i])
      .map((item) => ({ x: item.x, y: item.y }))
    if (at.length === 0) return undefined
    return { ...collectDef.art, size: collectDef.size, at }
  }, [collectDef, collectItems, collectState])

  // The SEPARATE, transient "just collected" layer — `departingCollectMarks`
  // below, cleared by its own timeout once the hop animation finishes (the
  // exact `fadingSpineStrokes` convention this file already uses for the
  // hedgehog's rejected strokes). Kept apart from `collectVertexArt` so the
  // steady layer's own `at` never has to know which entry is mid-animation.
  const collectVertexArtDeparting = useMemo<TraceVertexArt | undefined>(() => {
    if (!collectDef || isPlaceholderArt(collectDef.art) || departingCollectMarks.length === 0) {
      return undefined
    }
    return {
      ...collectDef.art,
      size: collectDef.size,
      at: departingCollectMarks.map(({ x, y }) => ({ x, y })),
    }
  }, [collectDef, departingCollectMarks])

  // The sheet's own bounds, in viewBox units — `clampArtBox`'s own `bounds`
  // argument, the SAME box `ground`'s `shared.viewBox` (below) is built from,
  // restated here so this memo does not have to depend on `ground` itself.
  const sheetBounds = useMemo<ArtBox>(
    () => ({ x: 0, y: 0, width: target.viewBoxWidth, height: SHEET_HEIGHT }),
    [target.viewBoxWidth],
  )

  const collectPlaceholderBadges = useMemo<readonly ArtBox[] | undefined>(() => {
    if (!collectDef || !isPlaceholderArt(collectDef.art)) return undefined
    const at = collectItems
      .filter((_, i) => !collectState.collected[i])
      .map((item) => ({ x: item.x, y: item.y }))
    if (at.length === 0) return undefined
    // `placeArt` with `STANDING_GRIP` (feet on the point) — the SAME
    // placement `TraceCanvas`'s own vertex-art layer uses (`TraceCanvas.tsx`,
    // "vertex-art-…"), clamped into the sheet the same way every other
    // standing picture already is. The badge's own glyph is drawn on a
    // square (`viewBox="0 0 100 100"`), so `w`/`h` are both 100 regardless
    // of `collectDef.size`.
    return at.map((point) =>
      clampArtBox(placeArt({ w: 100, h: 100, grip: STANDING_GRIP }, collectDef.size, point), sheetBounds),
    )
  }, [collectDef, collectItems, collectState, sheetBounds])

  const collectPlaceholderBadgesDeparting = useMemo<readonly ArtBox[] | undefined>(() => {
    if (!collectDef || !isPlaceholderArt(collectDef.art) || departingCollectMarks.length === 0) {
      return undefined
    }
    return departingCollectMarks.map(({ x, y }) =>
      clampArtBox(placeArt({ w: 100, h: 100, grip: STANDING_GRIP }, collectDef.size, { x, y }), sheetBounds),
    )
  }, [collectDef, departingCollectMarks, sheetBounds])

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
  // [T44] The torch over a routed level — see `torchView`.
  const torch = useMemo(
    () =>
      torchView(
        level.torch,
        target.polyline,
        torchPoint,
        phase === 'demo' || !!attempt?.approved,
        backdropEntry?.tile ?? NIGHT_VEIL,
      ),
    [level.torch, target.polyline, torchPoint, phase, attempt, backdropEntry],
  )

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
      // T13: rejected strokes fading out (`fadingSpineStrokes`, `onRelease`
      // above) — absent whenever none are currently fading, so every level
      // without a rejection in flight renders byte-identical to before.
      fading: fadingSpineStrokes.length > 0 ? fadingSpineStrokes : undefined,
      fadingColor: INK_COLOR,
      // T19 (§3.3, "el trazo se convierte en espina"): every FILLED anchor's
      // own clean spike, from the SAME `spineState` `marks` above already
      // reads — a mark and its spike can never disagree about which anchors
      // are earned. `shownStrokes` (above) never shows an accepted stroke's
      // raw ink any more, so this is the ONLY thing that paints a settled
      // spine.
      spikes: spineSpikePaths(level.spines, spineState),
      // T19 follow-up: a warm brown fill (not `INK_COLOR`'s near-black,
      // which blended into the night backdrop) with the earned chalk tone
      // as its outline — see `SPINE_SPIKE_FILL`'s own header for the
      // measured contrast against every surface a spike sits in front of.
      spikeFill: SPINE_SPIKE_FILL,
      spikeStroke: TORCH_CHALK,
    }
  }, [level.spines, spineState, spineDebugK, fadingSpineStrokes])

  // The spines themselves. `SpineLayer` draws each FILLED anchor's own
  // clean spike (`spines.spikes`, T19) — the stroke that earned it never
  // renders its own raw ink again. So a flag that lights k marks and hands
  // no spikes produces a frame the real game can never make: five earned
  // anchors on a bare hedgehog. That is amendment 8's failure exactly
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
  // T17: `collectDef` widens this the same way — a collect level with no
  // adventure `progress` at all (none exists yet; every T17 level today is
  // also a multi-level adventure) still shows `CollectBar` in this exact
  // slot and needs the exact same width class.
  const hasProgressBar = !!progress || !!collectDef

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
          onClick={() => {
            playSfx('tap')
            onBack()
          }}
          className={drawnPlace ? 'cv-btn cv-btn-back cv-btn-art' : 'cv-btn cv-btn-back'}
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
         * never a fight over the centre of this row.
         *
         * T17: a level that authors `collect` shows its OWN in-level item
         * progress here instead — "how many sheep have I gathered on THIS
         * level" is the more useful question mid-run than "which of the
         * adventure's four levels am I on", and the two bars occupy the
         * exact same absolutely-positioned slot, so swapping one for the
         * other adds no row and no height. */}
        {collectDef ? (
          <CollectBar collected={collectState.collected} art={collectDef.art} />
        ) : (
          progress && <TrailProgressBar progress={progress} />
        )}
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
        idleNudgeActive={idleNudgeActive}
        idleCue={idleCue}
        // The octopus stands where the route begins, in place of the green dot
        // (see `TraceStandingArt`): with a character already standing there the
        // dot says nothing the octopus does not. Every non-detective level
        // passes nothing and keeps its dot. On an art-corridor level `at`
        // moves its feet beside the drawn body instead of onto it (N3).
        startArt={
          drawnPlace ? { ...OCTOPUS_ART, size: OCTOPUS_SIZE, at: startArtAt } : undefined
        }
        // T38: the octopus's own art already holds the magnifying glass, so
        // on a level whose carrier IS that glass he keeps it in his hand while
        // nobody touches, and only while the finger is down is he drawn
        // without it and the big glass follows the finger
        // (`TraceCanvas`'s `heldCarrierView`). `octopusHoldsLens` has the
        // exact gate.
        startArtEmptyHanded={
          drawnPlace && octopusHoldsLens(level) && !waypointDebugCarrier
            ? { ...OCTOPUS_EMPTY_HANDED_ART, size: OCTOPUS_SIZE, at: startArtAt }
            : undefined
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
        routeMarkers={showMarkers ? routeMarkers : undefined}
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
        //
        // T29 (tablet playtest: "in the duckling levels I no longer move the
        // magnifying glass but something weird"). This used to read `inWorld
        // ? CARRIER_LENS_ART : undefined` — so `carrier: true` silently drew
        // NO art at all once a level fell outside `inDetectiveWorld` (a plain
        // rect+circle placeholder, `TraceCanvas.tsx`'s own `carrier &&
        // !carrierArt` fallback, is what actually renders then — the "weird"
        // shape). `duck-trail3`/`duck-trail4` kept `carrier: true` from
        // before T21 but lost `inWorld` the moment T21 replaced their `clue`
        // with `collect` (no case trail left to be `isCaseTrail`, and
        // neither ever got a `detectiveWorld: true`) — the exact same thing
        // T26 did to `f2-agua3`/`f2-agua4` and T26's own dolphin family
        // never had `inWorld` in the first place. `catalog.ts`'s own header
        // above `duck-trail1..4` states the rule this contradicted: "Every
        // trail sets `carrier: true`: that carrier IS the magnifying glass"
        // — not "IS the magnifying glass, except outside the detective
        // world". `inWorld` governs mud ink and the drawn-place surface
        // (both real, separate concerns, untouched here); it was never a
        // correct proxy for "does this level want the lupa", and gating the
        // hard-wired default behind it is what made the two silently drift
        // apart the first time a family dropped its `clue` while keeping its
        // `carrier`. The fix is direct: gate the default on `level.carrier`
        // itself (whether a carrier is asked for at all) instead of
        // `inWorld` — exactly what `level.carrierArt`'s own doc comment
        // above already claimed the rule was.
        carrierArt={
          level.carrierArt
            ? { ...level.carrierArt.art, size: level.carrierArt.size }
            : level.carrier
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
        // [T44] ...except by torchlight: mud ink vanishes in the dark, so a
        // torch level keeps its backdrop's own chalk.
        inkColor={worldInk(inWorld && !level.torch, backdropEntry).ink}
        inkDimColor={worldInk(inWorld && !level.torch, backdropEntry).inkDim}
        inkHidden={arrangeOpen}
        inkPolicy={inkPolicy}
        artCorridor={traceArtCorridor}
        // Any bump restarts the run (docs/01 principle 2); a hazard always
        // does (T41).
        resetSignal={resetOnContact || hazardResets ? resetSignal : undefined}
        // Clue marks (design unit 4/6). Absent on every level without a
        // `clue` config, so the surface pays nothing for the feature.
        clues={clueDef ? { marks: traceClueMarks } : undefined}
        // Grass and trodden earth. Detective trails only — every other level,
        // maze or not, renders exactly the surface it always did.
        ground={ground}
        // The sector's drawn place — an adventure's backdrop, once its
        // sector has one. Absent for every level whose adventure has none.
        backdrop={backdrop}
        // Static art standing at the route's own peaks (design.md §3.3), OR
        // (T17 follow-up) a collect level's own un-collected items — the two
        // are mutually exclusive by construction (a `collect` level authors
        // no `vertexArt`, see `levels/catalog.ts`), so this never draws the
        // same picture twice. Absent for every level with neither field.
        vertexArt={vertexArt ?? collectVertexArt}
        // T17 follow-up: a just-collected item hopping away toward the bar.
        // Absent for every level that predates `LevelConfig.collect`.
        vertexArtDeparting={collectVertexArtDeparting}
        // The reveal grid's covering layer (`reveal-grid` capability).
        // Absent on every level without a `reveal` config.
        reveal={reveal}
        // [T44] The torch over a routed level. Absent on every other level.
        torch={torch}
        nightHint={nightHint}
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
        {/* [T27 follow-up, orchestrator screenshot review 2026-09-27] A
            placeholder-animal collect item's OWN drawn stand-in
            (`collectPlaceholderBadges`, above) — through `TraceCanvas`'s
            `children` slot, never its `vertexArt` prop (that one draws a
            plain `<image>`, which for a placeholder animal is the grey sign
            block this whole badge exists to replace). */}
        {collectPlaceholderBadges && (
          <g pointerEvents="none">
            {collectPlaceholderBadges.map((box, idx) => (
              <PlaceholderAnimalBadge
                key={`collect-placeholder-${idx}`}
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
              />
            ))}
          </g>
        )}
        {collectPlaceholderBadgesDeparting && (
          // The SAME departing treatment `vertexArtDeparting` gives a real
          // picture (`.cv-collect-hop`, `LAYOUT_CSS` below) — applied
          // directly here since these badges never pass through that prop.
          <g pointerEvents="none">
            {collectPlaceholderBadgesDeparting.map((box, idx) => (
              <PlaceholderAnimalBadge
                key={`collect-placeholder-departing-${idx}`}
                className="cv-collect-hop"
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
              />
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
       * see it, same convention as `.cv-btn-back`'s own icon-only label.
       *
       * T17: a collect level reuses this SAME icon-only success pill even
       * though it is not `drawnPlace` (sheep-hill/llama-peak are explicitly
       * NOT in the detective world) — its own `approved` is decided by
       * collecting the last item, not by the pillars below, so the pillar
       * section's accuracy/order/fluency readouts would be misleading right
       * next to a plain checkmark; the collect bar's own remaining count is
       * already this level's "what's left" signal (docs/01 "no failure
       * feedback"). */}
      {(drawnPlace || !!collectDef) && !level.reveal && attempt?.approved && (
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
       * D6) AND on a collect level (T17: see this block's own twin above —
       * a collect level's pass/fail does not come from these pillars, so
       * showing them (and a possible fail state, `docs/01` "no failure
       * feedback") next to the collect bar would contradict it). Every
       * other phase's result section is untouched. */}
      {!drawnPlace && !collectDef && (
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
          <button
            type="button"
            onClick={() => {
              playSfx('tap')
              clearAttempt()
            }}
            className="cv-btn"
          >
            Borrar
          </button>
        )}
        {playDemo && (
          <button
            type="button"
            onClick={() => {
              playSfx('tap')
              replayDemo()
            }}
            className={drawnPlace ? 'cv-btn cv-btn-art' : 'cv-btn'}
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
          <button
            type="button"
            onClick={() => {
              playSfx('tap')
              setGuideRequested(true)
            }}
            className="cv-btn"
          >
            Ver la guía
          </button>
        )}
        {/* T7 (decision: auto-advance replaces the manual "Siguiente" tap on
         * a drawn place — see `celebrating`/the effect above, which calls
         * this SAME `onNext`). A classic level keeps the manual button. */}
        {!drawnPlace && (
          <button
            type="button"
            onClick={() => {
              playSfx('tap')
              onNext()
            }}
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
