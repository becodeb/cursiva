// The office's ground: grass along the top edge, trodden earth along the
// bottom (`docs/10` §3 — the home is the SAME place the trails are in, and
// pasto/tierra is what says so without a word).
//
// Scattered as individual marks rather than filled as bands, for the reason
// `canvas/groundScatter.ts` records at length: tiling needs `<pattern>` plus
// `fill="url(#id)"` and this repo bans `url(#…)` (scarred at
// `TraceCanvas.tsx:63-84`, it hydrates WHITE on real devices). The art
// pipeline already cuts the two authored tiles into 12 grass and 8 mud marks
// precisely so they can be placed one at a time.
//
// This is a BAND scatter, not `groundScatter`'s corridor scatter, and that is
// why it is a separate function: `grassScatter`/`mudScatter` take a route
// polyline and a `halfWidthAt` taper to keep grass off the walked path. The
// home has no route. Feeding it a fake one to reuse the code would be more
// machinery, not less.
//
// Deterministic, via the same seeded-PRNG discipline: the office must look the
// same on every visit, and it must be assertable in a node test.

/** One placed ground mark, in home-canvas units, origin at its centre. */
export interface GroundMark {
  x: number
  y: number
  /** Index into the caller's art array. */
  art: number
  /** Rendered height in canvas units. */
  size: number
  /** Degrees. Ground marks LEAN; they never spin (a tuft rotated 90° reads as
   * debris, `groundScatter.ts`). */
  angle: number
}

export interface BandInput {
  /** Horizontal span the marks are spread across. */
  x0: number
  x1: number
  /** Vertical span a mark's centre may land in. */
  y0: number
  y1: number
  count: number
  sizeMin: number
  sizeMax: number
  /** Maximum lean, degrees, applied either way. */
  tilt: number
  artCount: number
  seed: number
}

/** mulberry32 — four lines, no dependency, and identical output everywhere.
 * `Math.random` is not an option: the ground would reshuffle on every render. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Spread `count` marks across a horizontal band.
 *
 * Positions come off an even lattice with jitter under one full step, so the
 * marks never line up as a visible row and never pile up either — the same
 * trade `GRASS_STEP`/`GRASS_JITTER` make next door. Art indices cycle rather
 * than being drawn at random: with twelve variants and sixteen marks, random
 * picks reliably repeat one silhouette three times in a row, and section 5 of
 * the style guide is exactly about what repetition does to a mark.
 */
export function bandScatter(input: BandInput): readonly GroundMark[] {
  const { x0, x1, y0, y1, count, sizeMin, sizeMax, tilt, artCount, seed } = input
  const next = rng(seed)
  const step = (x1 - x0) / count
  const marks: GroundMark[] = []
  for (let i = 0; i < count; i++) {
    marks.push({
      x: x0 + step * (i + 0.5) + (next() - 0.5) * step * 0.8,
      y: y0 + next() * (y1 - y0),
      art: (i * 5 + Math.floor(next() * 2)) % artCount,
      size: sizeMin + next() * (sizeMax - sizeMin),
      angle: (next() - 0.5) * 2 * tilt,
    })
  }
  return marks
}
