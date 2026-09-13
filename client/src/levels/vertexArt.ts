// Pure, DOM-free placement selector for `LevelConfig.vertexArt` (design.md
// §3.3): the sheep stand on the sheep-hill humps, the llamas on the llama-
// peak summits (`docs/13` §2). This module touches nothing in
// `detective/clues.ts` — no `ClueKind`, no `PISTAS` rail entry, no case
// membership — and never changes `isCaseTrail`/`inDetectiveWorld` for any
// level.

/**
 * The route's local MINIMA in y — a `peakRidge`'s peaks, in route order.
 * Read off the already-centred `LevelTarget.polyline`, so no caller redoes
 * `buildLevelTarget`'s centring arithmetic and no authored coordinate can
 * drift from a re-tuned literal.
 *
 * `minRise` (default 40) rejects sampling noise while keeping a genuinely
 * short peak (e.g. a 170-unit rise) — the rise is measured against the
 * apex's own flanking points, not against a global base, so it stays
 * correct for a ridge whose valleys are not all at the same height.
 */
export function routeApexes(
  polyline: ReadonlyArray<{ x: number; y: number }>,
  minRise = 40,
): readonly { x: number; y: number }[] {
  const apexes: { x: number; y: number }[] = []
  for (let i = 1; i < polyline.length - 1; i++) {
    const prev = polyline[i - 1]
    const cur = polyline[i]
    const next = polyline[i + 1]
    if (cur.y < prev.y && cur.y < next.y) {
      const rise = Math.min(prev.y, next.y) - cur.y
      if (rise >= minRise) apexes.push(cur)
    }
  }
  return apexes
}
