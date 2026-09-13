// The art corridor: a walkable surface that IS a drawn cutout — a snake's
// body — rather than a painted band under the child's finger (`docs/13` §4,
// §8 row E). Pure, no React, no DOM. Owns ONE placement function
// (`placeArtCorridor`), shared by the renderer (`canvas/ArtCorridorLayer.tsx`),
// the engine (`levels/buildLevel.ts`'s derivation of `LevelTarget.artCorridor`)
// and the test that proves the two agree (`artCorridor.test.ts`'s
// "coincidence") — none of the three recomputes placement independently,
// because a test that did would prove nothing about what is actually drawn
// and scored (art-corridor spec, "One Shared Placement Function...").
import type { ArtImage } from '../detective/assets'
import type { ArtBox } from '../canvas/placeArt'
import { spineWave, transformPath } from './paths'

/**
 * `spineWave`'s own fit parameters for one snake cutout, hand-copied from
 * the rebuilt `manifest.json` (`scripts/art/build_art.py`'s `sample_spine`),
 * the way every literal in `assets.ts`/`backdrops.ts` already is — guarded
 * against drift by `detective/artManifest.test.ts`, which is the mechanism,
 * not a promise.
 */
export interface DrawnSpine {
  /** The fitted centreline's y, as a fraction of the cutout's height. */
  readonly mid: number
  /** `[widthFrac, riseFrac]` per half-arch — width a fraction of the
   *  cutout's WIDTH, rise a SIGNED fraction of its HEIGHT (negative = up),
   *  spanning only the fitted `[traceFrom, traceTo]` domain (design.md
   *  §3.1's own correction: the tapering tail/head tips outside it are
   *  drawn art but not part of the modelled centreline). */
  readonly halves: readonly (readonly [number, number])[]
  /** Max `|Δy|` between the measured spine and the reconstructed cubics,
   *  in SHIPPED PX (not normalized — `placeArtCorridor` scales it). */
  readonly residual: number
  /** Median opaque-column run length, as a fraction of the height. */
  readonly thickness: number
  /** The traceable span's start/end, as fractions of the width. */
  readonly traceFrom: number
  readonly traceTo: number
}

/**
 * Hand-copied from the rebuilt `manifest.json` (task 1.3/1.4), the way every
 * literal in `assets.ts`/`backdrops.ts` already is. Guarded against drift by
 * `detective/artManifest.test.ts`.
 */
export const DRAWN_SPINE: Readonly<Record<'snakeSmall' | 'snakeMedium' | 'snakeLarge', DrawnSpine>> = {
  snakeSmall: {
    mid: 0.5010499852114759,
    halves: [
      [0.1829347826086956, -0.24084590357882285],
      [0.18164855072463773, 0.23874593315587103],
      [0.16960748792270527, -0.2153356994971902],
    ],
    residual: 3.2717806204692295,
    // The narrowest cross-section within the traceable span, NOT the
    // median (task 8.7/8.8's own correction: a channel stroked at the
    // median thickness pokes out past the drawn body at a real trough of
    // the wave).
    thickness: 0.4897959183673469,
    traceFrom: 0.22083333333333333,
    traceTo: 0.9375,
  },
  snakeMedium: {
    mid: 0.6267300194931774,
    halves: [
      [0.1488915236374586, 0.17151559454191032],
      [0.17458220415537484, -0.22760721247563354],
      [0.14361449864498652, 0.17151559454191032],
      [0.14703590785907852, -0.18374756335282652],
    ],
    residual: 3.361360316309586,
    thickness: 0.3508771929824561,
    traceFrom: 0.21747967479674796,
    traceTo: 0.9471544715447154,
  },
  snakeLarge: {
    mid: 0.5351859649122807,
    halves: [
      [0.1116293333333333, 0.15955087719298247],
      [0.12305600000000004, -0.1615017543859649],
      [0.11994399999999995, 0.1648140350877193],
      [0.1273706666666667, -0.17729122807017544],
      [0.12362933333333331, 0.18060350877192982],
      [0.11705600000000004, -0.1615017543859649],
    ],
    residual: 1.704141190173857,
    thickness: 0.4842105263157895,
    traceFrom: 0.197,
    traceTo: 0.945,
  },
}

/** An art corridor's piece, as a level authors it. Coordinates are in the
 *  SAME pre-centring space every other path generator's parameters live in
 *  (`buildLevel.ts`'s `layOutPaths` centres everything together via `tx`). */
export interface ArtCorridorPiece {
  art: ArtImage
  spine: keyof typeof DRAWN_SPINE
  /** The ONLY size knob: the cutout's rendered WIDTH in viewBox units. The
   *  height, the thickness, the amplitude and the corridor all follow from
   *  it, so seriation is one number per snake (design.md §3.1). */
  span: number
  /** Where the fitted centreline's midline sits: `at.y` is the viewBox y the
   *  spine's fitted `mid` maps to; `at.x` is the piece's own horizontal
   *  CENTRE (the box has no separate x-anchor fraction the way `mid` gives
   *  one for y, so its centre is the natural single point). */
  at: { x: number; y: number }
  /** Degrees about the piece's own centre, applied to the `<image>` AND to
   *  the path, from this one field. Absent = 0. */
  rotate?: number
}

export interface ArtCorridorPlacement {
  /** What the `<image>` is spread onto — unrotated; rotation is a live
   *  `transform="rotate(…)"` about {@link ArtCorridorPlacement.pivot}. */
  readonly box: ArtBox
  readonly rotate: number
  readonly pivot: { x: number; y: number }
  /** `spineWave`'s emitted `d`, already rotated and already translated. */
  readonly d: string
  /** The drawn body's median thickness, viewBox units. */
  readonly thickness: number
  /** The fit residual, viewBox units (`residual * span / art.w`). */
  readonly residual: number
}

/**
 * The `<image>` box and the path that runs down the middle of it, from ONE
 * derivation. The renderer takes `box`/`rotate`/`pivot`; the level takes
 * `d`; `catalog.test.ts` takes `thickness`/`residual`. A test that
 * recomputed the placement independently would prove nothing about what is
 * drawn — so nothing recomputes it.
 *
 * `tx` is the SAME horizontal centring translation `layOutPaths` computed
 * for every path on the sheet (`buildLevel.ts` §1.4's own trap): applying it
 * here, after rotation, is what keeps the picture and the corridor from
 * ever disagreeing about where the level sits.
 */
export function placeArtCorridor(piece: ArtCorridorPiece, tx: number): ArtCorridorPlacement {
  const spine = DRAWN_SPINE[piece.spine]
  const { art, span } = piece
  const height = (span * art.h) / art.w
  const rotate = piece.rotate ?? 0

  // The unrotated, pre-`tx` box and pivot (rotation is about the piece's OWN
  // centre).
  const box0: ArtBox = { x: piece.at.x - span / 2, y: piece.at.y - spine.mid * height, width: span, height }
  const pivot0 = { x: box0.x + box0.width / 2, y: box0.y + box0.height / 2 }

  // The unrotated, un-translated wave path, over the fitted domain
  // [traceFrom, traceTo] of the box.
  const x0 = box0.x + spine.traceFrom * span
  const y = box0.y + spine.mid * height
  const halves = spine.halves.map(([widthFrac, riseFrac]) => ({
    width: widthFrac * span,
    rise: riseFrac * height,
  }))
  const localD = spineWave({ x0, y, halves })

  // ONE transform carries both the rotation (about the piece's own centre)
  // and the translation (the sheet's centring `tx`) — `scale → rotate →
  // translate`, `paths.ts`'s own order.
  const d = transformPath(localD, { rotate, pivot: pivot0, translate: { x: tx, y: 0 } })

  const box: ArtBox = { ...box0, x: box0.x + tx }
  const pivot = { x: pivot0.x + tx, y: pivot0.y }

  return {
    box,
    rotate,
    pivot,
    d,
    thickness: spine.thickness * height,
    residual: (spine.residual * span) / art.w,
  }
}
