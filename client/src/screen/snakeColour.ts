// Snake colour-follows-the-finger mechanic (`docs/19_PROPUESTA_HISTORIA_Y_
// MECANICAS.md` §3.1; `odd/tasks/prewriting-stage-completion.md` T20). Pure,
// DOM-free, screen-scoped like its sibling `corridorTrack.ts` — this module
// calls `corridorTick` directly, which is why it lives here and not in
// `levels/`: nothing in `levels/` imports from `screen/`, and this module
// needs the exact one-route arc-length projection `corridorTrack.ts` already
// owns, never a second reimplementation of it.
//
// WHY EACH PIECE OWNS ITS OWN TRACK, NEVER THE SHARED `RouteTrack`
// (`LevelPlay.tsx`'s `corridorTrackRef`, used for scoring/off-path/haptics).
// That track's own `maxArc` is DELIBERATELY monotonic FOREVER: leaving the
// corridor never resets it (`corridorTrack.ts`'s own header — an excursion
// only fails to bank progress because callers separately gate on `!out`; the
// number itself keeps climbing so a wall-touch-free finish can still be told
// apart from one that left and came back). `docs/19` §3.1 point 3 asks for
// the OPPOSITE here: leaving a snake's own body must send THAT snake's
// reveal fully back to grey and make it start over on the next touch.
// Reusing the shared monotonic track would make the colour silently JUMP
// back to wherever it last reached the instant the finger returns, instead
// of rebuilding from the head — the exact "restarts" behaviour the task
// asks for would be visually broken. So every piece gets its own
// {@link CorridorTrack}, reset outright the moment the finger leaves it.
import { corridorTick, CORRIDOR_TRACK_START, type CorridorTrack } from './corridorTrack'
import type { RouteSegment } from '../levels/types'
import { trailEndArc } from '../detective/clues'

/**
 * How long the reveal takes to ease back down to grey once the finger
 * leaves a snake's body (or lifts entirely), in ms. The task's own
 * instruction ("~300 ms") — matching this codebase's other reject/torch
 * fades (`levels/spines.ts`'s `SPINE_REJECT_FADE_MS`, `levels/revealGrid.ts`'s
 * `TORCH_FADE_MS`, both 250-300ms) — rather than `docs/19` §3.1's own prose
 * draft ("un segundo, no de golpe"): the two disagree, and this task's own
 * instructions win; worth a nod from the author since "one second" reads
 * noticeably slower than 300ms.
 */
export const SNAKE_COLOUR_FADE_MS = 300

/** One piece's own colour-reveal state. */
export interface SnakePieceColourState {
  /** This piece's own local corridor track — reset to
   *  {@link CORRIDOR_TRACK_START} the instant the finger leaves it, which is
   *  what makes the NEXT touch rebuild the reveal from the head instead of
   *  jumping back to a stale high-water mark. */
  readonly track: CorridorTrack
  /** `[0, 1]` — how much of this piece is currently shown in colour. */
  readonly progress: number
  /** `performance.now()`-scale timestamp the current fade started, or `null`
   *  while advancing or fully settled (steady grey or steady colour). */
  readonly fadeFrom: number | null
  /** `progress` at the instant the fade started — the fade eases from
   *  WHEREVER it actually was down to 0, never from 1, so leaving the line
   *  partway through fades from the true partial amount. */
  readonly fadeStartProgress: number
  /** Once true, this piece has been traced end to end and stays fully
   *  coloured for the rest of the run — `docs/19` §3.1 point 3, "las que ya
   *  están despiertas no se tocan: nada ganado se pierde". Never touched by
   *  this module again once set. */
  readonly done: boolean
  /** T39: once the finger has been on this piece's own body at all, it
   *  stays `true` for the rest of the run — even after a lift fades the
   *  piece back to grey. It is what retires this piece's "wake me next"
   *  pulse for good ({@link wakingPulseIndex}). */
  readonly started: boolean
}

export interface SnakeColourState {
  readonly pieces: readonly SnakePieceColourState[]
}

const IDLE_PIECE: SnakePieceColourState = {
  track: CORRIDOR_TRACK_START,
  progress: 0,
  fadeFrom: null,
  fadeStartProgress: 0,
  done: false,
  started: false,
}

/** {@link IDLE_PIECE}, but already started — a piece that faded all the way
 *  back to grey after the child had begun it. */
const IDLE_STARTED_PIECE: SnakePieceColourState = { ...IDLE_PIECE, started: true }

/** `n` pieces, every one grey and untouched — the state a level's own run
 *  starts in (mirrors `emptyCollectState`'s own shape and reset story). */
export function emptySnakeColourState(n: number): SnakeColourState {
  return { pieces: Array.from({ length: Math.max(0, n) }, () => IDLE_PIECE) }
}

/**
 * Fold one fingertip sample into every piece's own colour state.
 *
 * `point` is the live fingertip in sheet units, or `null` when the finger is
 * up — treated exactly like a point nowhere near any piece: nothing new is
 * revealed, and any reveal already in flight keeps decaying. Reusable across
 * every frame `LevelPlay.tsx`'s `onFrame` fires, drawing or not (the fade
 * must keep animating after the finger lifts, the same reason
 * `levels/revealGrid.ts`'s torch fade rides `onFrame` unconditionally).
 *
 * Returns the SAME state reference only when every piece is already `done`
 * (nothing left to ever change again) — while any piece is mid-reveal or
 * mid-fade this legitimately returns a fresh object every call, the same way
 * `levels/revealGrid.ts`'s own animated ticks do; a piece that is simply
 * idle at rest (never touched, or fully faded back to grey) also costs a
 * fresh array entry equal in VALUE but not in identity, same trade-off
 * `waypointTick`/`spineAim` already make for their own live-aim channel.
 */
export function snakeColourTick(
  state: SnakeColourState,
  routes: readonly RouteSegment[],
  point: { x: number; y: number } | null,
  drawing: boolean,
  corridorWidth: number,
  now: number,
): SnakeColourState {
  let changed = false
  const pieces = state.pieces.map((piece, i) => {
    if (piece.done) return piece
    const route = routes[i]
    if (!route || route.polyline.length < 2 || route.length <= 0) return piece

    const sample =
      drawing && point ? corridorTick(route.polyline, route.length, piece.track, point.x, point.y) : null
    const inside = !!sample && sample.distance <= corridorWidth

    if (inside && sample) {
      changed = true
      // `trailEndArc(length, corridorWidth)`, not the literal `length`: a
      // dense real trace ending exactly on the route's own last vertex can
      // still leave `maxArc` a hair short of `length` from float noise in
      // the screen-to-viewBox round-trip — `levels/collect.ts`'s own
      // `collectItemsFromPeaks` hit this EXACT bug first (found live, not
      // guessed) and fixed it with this same tolerance rather than a literal
      // threshold. Without it, a piece could never actually reach `done`,
      // and lifting the finger right after finishing it would immediately
      // start fading it back to grey — the opposite of "las que ya están
      // despiertas no se tocan" (docs/19 §3.1 point 3).
      if (sample.track.maxArc >= trailEndArc(route.length, corridorWidth)) {
        return {
          track: CORRIDOR_TRACK_START,
          progress: 1,
          fadeFrom: null,
          fadeStartProgress: 1,
          done: true,
          started: true,
        }
      }
      const raw = Math.max(0, Math.min(1, sample.track.maxArc / route.length))
      return { track: sample.track, progress: raw, fadeFrom: null, fadeStartProgress: raw, done: false, started: true }
    }

    // Off this piece's own body (or the finger is up entirely): start, or
    // continue, the fade back to grey. The track resets THE INSTANT the
    // finger leaves — not once the fade finishes — so a touch that returns
    // mid-fade already measures fresh from the head (see this module's own
    // header for why the shared scoring track cannot do this).
    if (piece.progress <= 0 && piece.fadeFrom === null) return piece
    changed = true
    const fadeFrom = piece.fadeFrom ?? now
    const fadeStartProgress = piece.fadeFrom === null ? piece.progress : piece.fadeStartProgress
    const eased = fadeStartProgress * Math.max(0, 1 - (now - fadeFrom) / SNAKE_COLOUR_FADE_MS)
    if (eased <= 0) return piece.started ? IDLE_STARTED_PIECE : IDLE_PIECE
    return { track: CORRIDOR_TRACK_START, progress: eased, fadeFrom, fadeStartProgress, done: false, started: piece.started }
  })
  return changed ? { pieces } : state
}

/**
 * The first not-yet-done piece, in authored (small→large) order — the one
 * `docs/19` §3.1 point 5 has the Pulpito point at and pulse gently, so a
 * child can tell which snake to wake next without reading anything. `null`
 * once every piece is done (nothing left to invite).
 */
export function nextWakingIndex(state: SnakeColourState): number | null {
  const i = state.pieces.findIndex((p) => !p.done)
  return i === -1 ? null : i
}

/**
 * T39 (`odd/tasks/prewriting-stage-completion.md`, tablet play-test: "once I
 * start the stroke the snakes should stop blinking"): which piece shows the
 * "wake me next" pulse right now, or `null` for none.
 *
 *  - never while a stroke is in progress (`drawing`) — the child has already
 *    acted on the invitation, and a blink under the finger only distracts;
 *  - never again on a piece the child has already started
 *    (`SnakePieceColourState.started`), even after a lift faded it back to
 *    grey: it has done its job for that snake, and the colour itself is now
 *    the feedback. The next, untouched snake still gets its own pulse once
 *    the finger is up.
 *
 * The idle nudge (`screen/idleNudge.ts`) is untouched by this: it is a
 * separate, time-based cue for a child who stopped touching the screen
 * altogether, and it keeps working exactly as before.
 */
export function wakingPulseIndex(state: SnakeColourState, drawing: boolean): number | null {
  if (drawing) return null
  const i = nextWakingIndex(state)
  if (i === null || state.pieces[i].started) return null
  return i
}
