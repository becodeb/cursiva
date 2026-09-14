// Pure, DOM-free placement helper for the dolphin family (design.md §5.1,
// amendment A2). A SIBLING of `levels/vertexArt.ts`'s `routeApexes`, not a
// mode on it: `routeApexes` has two shipped consumers (eight sheep and llama
// levels) whose behaviour must not change, and a mode parameter would put a
// branch inside a function two families already depend on.

export interface RouteExtremum {
  readonly x: number
  readonly y: number
  /** Y grows DOWNWARD, so a CREST is a local MINIMUM in y and a TROUGH is a
   *  local MAXIMUM. Naming them by what the child sees rather than by the
   *  sign is the whole reason this field is a word and not a boolean. */
  readonly side: 'crest' | 'trough'
}

/**
 * Every turning point of a route, in route order, tagged by side.
 *
 * IT SCANS MONOTONE RUNS, NOT TRIPLES, AND THAT IS THE WHOLE POINT.
 * `routeApexes` (`vertexArt.ts:19-34`) accepts an apex only when it rises at
 * least `minRise` above its IMMEDIATE flattened neighbours. On a `peakRidge`
 * that works, because the generator emits exactly one polyline point per
 * apex between two long straight legs. On a `wave` it finds NOTHING:
 * `flattenPathD` samples the cubic densely, so the neighbours of the crest
 * sample sit a fraction of a unit away and every apex is rejected. A
 * trough-aware copy of the same test would find nothing either — which is
 * why this is not a copy.
 *
 * A run ends where the sign of `Δy` reverses; that reversal point is the
 * turning point, and its rise is measured against the SURROUNDING RUNS
 * (`min(|y − yPrevTurn|, |y − yNextTurn|)`), so it stays correct at any
 * sample density and for a route whose extrema are not all the same height.
 * The route's first and last points are never turning points — a `wave`
 * starts and ends on its own centreline, and neither end has a following
 * segment to reveal a reversal.
 *
 * Read off the already-centred `LevelTarget.polyline`, like `routeApexes`,
 * so no caller redoes `buildLevelTarget`'s centring arithmetic and no
 * authored coordinate can drift from a re-tuned literal.
 */
export function routeExtrema(
  polyline: ReadonlyArray<{ x: number; y: number }>,
  minRise = 40,
): readonly RouteExtremum[] {
  if (polyline.length < 3) return []

  type Turn = { index: number; side: 'crest' | 'trough' }
  const turns: Turn[] = []
  let dir: 1 | -1 | 0 = 0
  for (let i = 1; i < polyline.length; i++) {
    const dy = polyline[i].y - polyline[i - 1].y
    if (dy === 0) continue // flat run: neither direction, no reversal yet
    const next: 1 | -1 = dy > 0 ? 1 : -1
    if (dir !== 0 && next !== dir) {
      // The sign reversed between i-1 and i: i-1 is the turning point.
      // dir === -1 (y was decreasing, i.e. rising on screen) then reversing
      // to increasing is a local MINIMUM in y — a crest.
      turns.push({ index: i - 1, side: dir === -1 ? 'crest' : 'trough' })
    }
    dir = next
  }

  const result: RouteExtremum[] = []
  for (let k = 0; k < turns.length; k++) {
    const { index, side } = turns[k]
    const cur = polyline[index]
    const prevY = k > 0 ? polyline[turns[k - 1].index].y : polyline[0].y
    const nextY = k < turns.length - 1 ? polyline[turns[k + 1].index].y : polyline[polyline.length - 1].y
    const rise = Math.min(Math.abs(cur.y - prevY), Math.abs(cur.y - nextY))
    if (rise < minRise) continue
    result.push({ x: cur.x, y: cur.y, side })
  }
  return result
}

/**
 * Where each dolphin's PICTURE stands, as points the SHIPPED `vertexArt`
 * render layer can draw with no new component and no new prop.
 *
 * `TraceCanvas.tsx`'s vertex-art layer places art with `STANDING_GRIP`
 * (`placeArt.ts` = `[0.5, 1]`), i.e. the point is the box's BOTTOM edge,
 * horizontally centred. So:
 *
 *   crest  → return `e.y − cw/2 − clear`            → box `[that − size, that]`
 *   trough → return `e.y + cw/2 + clear + size`      → box `[e.y + cw/2 + clear, +size]`
 *
 * One point list, one grip, one shipped layer, zero new render code and zero
 * new `url(#…)` surface.
 *
 * `corridorWidth` MUST be the level's AUTHORED width
 * (`LevelConfig.corridorWidth`), never the adaptive `LevelTarget.corridorWidth`
 * — the identical rule `clues.ts` states for `trailEndArc`, with the
 * identical consequence at `MAX_WIDTH_FACTOR = 2`: feeding the widened width
 * into this function moves the picture, which the placement design forbids
 * (design.md §5.1, §5.3).
 */
export function vertexArtPoints(
  extrema: readonly RouteExtremum[],
  o: { corridorWidth: number; size: number; clear: number },
): readonly { x: number; y: number }[] {
  return extrema.map((e) => {
    if (e.side === 'crest') {
      return { x: e.x, y: e.y - o.corridorWidth / 2 - o.clear }
    }
    return { x: e.x, y: e.y + o.corridorWidth / 2 + o.clear + o.size }
  })
}
