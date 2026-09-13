// The arrange mechanic (`object-arrange` spec, design.md §5): before tracing
// opens, the child drags this level's art-corridor pieces into their own
// hollows, smallest to largest (`docs/13` §2). Pure, no React, no DOM — every
// decision here is an exported pure function because this repo's harness is
// node with no jsdom and no testing-library: a decision made only inside a
// pointer handler is invisible to every test that exists.
import type { Point } from '../letters/types'
import type { ArtBox } from '../canvas/placeArt'

/** `LevelConfig.arrange`'s own shape, restated as the fold's own config. */
export interface ArrangeConfig {
  /** Each piece's deterministic scatter point, one per `artCorridor` entry,
   *  in the SAME order (smallest first). */
  readonly from: readonly Point[]
  /** How close a drop must land to a slot's own centre to occupy it. */
  readonly snapRadius: number
}

export interface ArrangeState {
  /** `placed[i]` = the SLOT piece `i` occupies, or `null` while scattered.
   *  `isArranged` holds iff `placed[i] === i` for every `i` — the pieces are
   *  authored smallest first, so this literally means "ordered smallest to
   *  largest". */
  readonly placed: readonly (number | null)[]
  /** The piece currently under the finger, or `null`. */
  readonly held: number | null
  /** The held piece's live offset from its own scatter point, viewBox units.
   *  Always `{0, 0}` while nothing is held. */
  readonly offset: Point
}

/** Every piece scattered, nothing held — the state a fresh run (or a
 *  restart) starts in. */
export function initialArrange(cfg: ArrangeConfig): ArrangeState {
  return { placed: cfg.from.map(() => null), held: null, offset: { x: 0, y: 0 } }
}

/** The live box of piece `i` — its home box's own size, recentred on wherever
 *  it currently sits: its own slot's centre once placed, the pointer-tracked
 *  point while held, or its authored scatter point otherwise. `homeBoxes` is
 *  `target.artCorridor.map(p => p.box)` — the SAME boxes the trace phase
 *  renders at, reused rather than recomputed so a slot's position can never
 *  disagree between the arrange phase and the trace phase. */
export function pieceBox(
  state: ArrangeState,
  i: number,
  homeBoxes: readonly ArtBox[],
  cfg: ArrangeConfig,
): ArtBox {
  const own = homeBoxes[i]
  const centre = pieceCentre(state, i, homeBoxes, cfg)
  return { x: centre.x - own.width / 2, y: centre.y - own.height / 2, width: own.width, height: own.height }
}

function boxCentre(box: ArtBox): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

function pieceCentre(
  state: ArrangeState,
  i: number,
  homeBoxes: readonly ArtBox[],
  cfg: ArrangeConfig,
): Point {
  if (state.held === i) {
    return { x: cfg.from[i].x + state.offset.x, y: cfg.from[i].y + state.offset.y }
  }
  const slot = state.placed[i]
  if (slot !== null) return boxCentre(homeBoxes[slot])
  return cfg.from[i]
}

/**
 * Which piece a press picks up: the one whose CURRENT box contains `p`,
 * TOPMOST first when boxes overlap (the piece rendered last among the
 * overlapping candidates — array order IS render order). A piece already
 * placed in its own slot is not grabbable again: once home, it stays home.
 * Returns `null` when no eligible box contains `p`.
 */
export function grabPiece(
  state: ArrangeState,
  boxes: readonly ArtBox[],
  p: Point,
): number | null {
  for (let i = boxes.length - 1; i >= 0; i--) {
    if (state.placed[i] !== null) continue
    const b = boxes[i]
    if (p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height) return i
  }
  return null
}

/**
 * One `onFrame` sample. `boxes` are the HOME boxes (`target.artCorridor`'s
 * own, one per piece — `pieceBox` above derives each piece's live box from
 * them for hit-testing). Returns the SAME REFERENCE when nothing changes —
 * `revealTick`'s own no-op contract, restated, so an idle finger costs a
 * no-op `setState`.
 *
 * A RELEASE is inferred structurally, needing no extra bookkeeping: a piece
 * can only become `held` while `down` was true, so `held !== null` together
 * with `down === false` is exactly the frame the finger lifted. The drop
 * resolves against the GLOBALLY nearest slot (occupied or not): only a
 * FREE nearest slot within `snapRadius` occupies; a distant nearest slot OR
 * an OCCUPIED nearest slot both return the piece to its own scatter point —
 * a swap is a second rule the mechanic does not ask for, and `docs/14` §14
 * forbids punishing an early error hard.
 */
export function arrangeTick(
  prev: ArrangeState,
  boxes: readonly ArtBox[],
  p: Point,
  down: boolean,
  cfg: ArrangeConfig,
): ArrangeState {
  if (down) {
    if (prev.held !== null) {
      const offset = { x: p.x - cfg.from[prev.held].x, y: p.y - cfg.from[prev.held].y }
      if (offset.x === prev.offset.x && offset.y === prev.offset.y) return prev
      return { ...prev, offset }
    }
    const liveBoxes = boxes.map((_, i) => pieceBox(prev, i, boxes, cfg))
    const grabbed = grabPiece(prev, liveBoxes, p)
    if (grabbed === null) return prev
    const offset = { x: p.x - cfg.from[grabbed].x, y: p.y - cfg.from[grabbed].y }
    return { ...prev, held: grabbed, offset }
  }

  if (prev.held === null) return prev

  const held = prev.held
  const current = { x: cfg.from[held].x + prev.offset.x, y: cfg.from[held].y + prev.offset.y }
  let nearestIdx = -1
  let nearestDist = Infinity
  for (let j = 0; j < boxes.length; j++) {
    const centre = boxCentre(boxes[j])
    const dist = Math.hypot(current.x - centre.x, current.y - centre.y)
    if (dist < nearestDist) {
      nearestDist = dist
      nearestIdx = j
    }
  }
  const nearestIsFree = nearestIdx !== -1 && !prev.placed.includes(nearestIdx)
  if (nearestIsFree && nearestDist <= cfg.snapRadius) {
    const placed = prev.placed.map((s, i) => (i === held ? nearestIdx : s))
    return { placed, held: null, offset: { x: 0, y: 0 } }
  }
  return { ...prev, held: null, offset: { x: 0, y: 0 } }
}

/** Every piece in its OWN slot. Seriation and completion are the SAME
 *  claim: `artCorridor` is authored smallest first, so `placed[i] === i` for
 *  all `i` is literally "ordered from smallest to largest". */
export function isArranged(state: ArrangeState): boolean {
  return state.placed.every((slot, i) => slot === i)
}

/** `?debug=ordenadas:<k>` (§8) — the first `k` pieces already home, the rest
 *  scattered. Ungated: it paints render state, adds no control, persists
 *  nothing, and must work against the exact build being screenshotted. */
export function debugArrange(cfg: ArrangeConfig, k: number): ArrangeState {
  const n = cfg.from.length
  const clamped = Math.max(0, Math.min(n, k))
  return {
    placed: cfg.from.map((_, i) => (i < clamped ? i : null)),
    held: null,
    offset: { x: 0, y: 0 },
  }
}

/** `initialArrange`, or `debugArrange` when `?debug=ordenadas:<k>` seeded a
 *  count — the ONE function every reset site must call (the initial
 *  `useState`, `resetSurface`, `restartRun`), so the debug seed is never
 *  silently wiped by a later reset the same way `initialRevealState`
 *  already protects the reveal grid's own screenshot-seeding flag. Calling
 *  `initialArrange` directly from any reset site is the exact bug a
 *  screenshot caught (task 8.7/8.8): the debug-seeded state applied once at
 *  mount, then the mount effect's own `resetSurface` call wiped it a moment
 *  later. */
export function seedArrange(cfg: ArrangeConfig, debugCount: number | null): ArrangeState {
  return debugCount !== null ? debugArrange(cfg, debugCount) : initialArrange(cfg)
}

/** One art-corridor piece's own render facts, structural on purpose (the
 *  same convention `canvas/TraceCanvas.tsx`'s own structural props use) so
 *  this module never imports `ArtCorridorPiece`/`ArtImage`. */
export interface ArrangeRenderPiece {
  readonly href: string
  readonly rotate?: number
}

/** One rendered piece: the box the layer draws it at, and its rotation —
 *  structurally the shape `canvas/TraceCanvas.tsx`'s `TraceArtCorridor`
 *  expects, without importing that type here. */
export interface RenderedPiece {
  readonly href: string
  readonly box: ArtBox
  readonly rotate?: number
}

/**
 * The render-ready box AND rotation for every piece during the arrange
 * phase, in one place — found necessary after a screenshot caught the gap
 * this closes (task 8.7/8.8): a piece already snapped into its own slot
 * MUST render at its authored rotation (matching the hollow it now fills,
 * `snake3`'s own vertical columns); a scattered or held piece has no
 * meaningful "in transit" orientation and renders unrotated. Once
 * `isArranged` is true the level switches away from this function entirely
 * and reads `placeArtCorridor`'s own placements instead (`screen/
 * LevelPlay.tsx`).
 */
export function arrangeRenderPieces(
  state: ArrangeState,
  pieces: readonly ArrangeRenderPiece[],
  homeBoxes: readonly ArtBox[],
  cfg: ArrangeConfig,
): readonly RenderedPiece[] {
  return pieces.map((piece, i) => ({
    href: piece.href,
    box: pieceBox(state, i, homeBoxes, cfg),
    rotate: state.placed[i] !== null ? piece.rotate : undefined,
  }))
}
