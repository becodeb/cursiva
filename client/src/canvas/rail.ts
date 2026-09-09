// Magnetized rail — the assisted mode of docs/03 §6 ("Riel asistido", fases
// 1-2) taken past a wide visible corridor: the RENDERED ink is pulled toward
// the ideal route, so the child's first contact with a shape already feels
// like the shape. Motor learning needs a correct movement to reinforce, and a
// child who has never produced one has nothing to reinforce.
//
// ============================ THE ONE RULE =============================
// The rail magnetizes ONLY WHAT IS DRAWN. The points handed to `evaluateLevel`
// stay the RAW captured points, always. If the scored points were pulled too,
// accuracy would measure the strength of the rail instead of the control of the
// child, and docs/01 principle 5 ("medir el proceso, no el producto") would be
// silently false — every assisted level would report mastery that nobody has.
// The separation is enforced at the call site in `LevelPlay`, where the warped
// copy feeds the canvas and the raw copy feeds the evaluator. Do not "simplify"
// them into one array.
// =======================================================================
//
// The assist must also DIE. A permanent rail is a crutch: the child stops
// steering and lets the app draw. It fades to nothing over the first few
// attempts at a level, and it is already weak wherever the child is accurate.

/** Fraction of the way to the ideal route on the very first attempt. Half is
 * enough for the shape to feel guided and little enough that a deliberate turn
 * still goes where the finger went. */
export const RAIL_PULL = 0.5

/** Attempts over which the assist decays to zero. Four is two unlocks' worth
 * (`APPROVALS_TO_UNLOCK` is 2), so the rail is gone before the level can be
 * left behind — nobody unlocks the next phase on the rail's steering. */
export const RAIL_FADE_ATTEMPTS = 4

/** A candidate ideal point and how far the finger is from it. */
export interface RailAnchor {
  point: { x: number; y: number } | null
  distance: number
}

/**
 * Assist strength for a child who has made `attempts` attempts at this level:
 * 1 on the first, 0 from `RAIL_FADE_ATTEMPTS` on, linear between. Withdrawal is
 * the pedagogy, not a nicety (docs/03 §3 withdraws the visual guide on exactly
 * the same reasoning).
 */
export function railFade(attempts: number): number {
  if (!Number.isFinite(attempts) || attempts <= 0) return 1
  if (attempts >= RAIL_FADE_ATTEMPTS) return 0
  return 1 - attempts / RAIL_FADE_ATTEMPTS
}

/**
 * Pull `x`,`y` toward `anchor`. Pure.
 *
 * Two independent dampers, both of which can zero the pull:
 *  - `fade`      — attempts at this level (see `railFade`).
 *  - proximity   — distance to the route as a fraction of the corridor
 *                  half-width. Dead on the centreline there is NO pull at all,
 *                  which is what keeps the ink from twitching when a child is
 *                  already doing it right, and what makes the assist feel like
 *                  a groove rather than a hand on the wrist.
 *
 * An anchor of `null` or a non-finite distance means the search found nothing
 * nearby — the finger is somewhere else entirely, and dragging it back across
 * the sheet would be a lie about what happened.
 */
export function railPull(
  x: number,
  y: number,
  anchor: RailAnchor,
  corridorWidth: number,
  fade: number,
  base: number = RAIL_PULL,
): { x: number; y: number } {
  const half = corridorWidth / 2
  if (!anchor.point || !Number.isFinite(anchor.distance) || half <= 0 || fade <= 0) {
    return { x, y }
  }
  const proximity = Math.min(1, anchor.distance / half)
  const k = base * fade * proximity
  if (k <= 0) return { x, y }
  return { x: x + (anchor.point.x - x) * k, y: y + (anchor.point.y - y) * k }
}
