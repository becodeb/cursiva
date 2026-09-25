// Where a piece of registry art actually goes (design.md §7, "placeArt() lives
// in canvas/, takes a structural shape, and reads one grip"; spec:
// trace-canvas "Carrier Art Centres On Its Grip, Not Its Bounding Box").
//
// [case-registry-and-captions, Phase 8] `build_art.py`'s `centre_on()` pads
// `lupa.png` so the lens lands on the image's own centre, and then `emit()`
// crops every output back to its alpha bounding box — which removes exactly
// that padding again. The shipped `carrier-lens.png` therefore has its lens
// at (0.603, 0.391) of the box, not (0.5, 0.5): the correction is applied and
// then unconditionally undone by the pipeline's own later step. Fixing this
// in the renderer with a hardcoded offset would create a SECOND, independent
// place carrying the same fact — exactly how it drifted the first time. This
// function reads the ONE place the fact now lives (`ArtImage.grip`,
// `detective/assets.ts`), so the trail and the home office can never disagree
// about where the glass sits.
//
// Deliberately structural rather than importing `ArtImage` from `detective/`:
// `TraceCanvas` imports nothing from `detective/` (the carrier art arrives as
// a `TraceCarrierArt` prop, `TraceCanvas.tsx:302-306`) precisely so the canvas
// holds no token and no registry. `screen/` already imports from `canvas/`;
// the reverse never happens.

/** A grip that was never declared: the middle of the picture. */
export const DEFAULT_GRIP: readonly [number, number] = [0.5, 0.5]

/**
 * The grip every CHARACTER in this world is drawn by: horizontally centred,
 * and standing on the point rather than bisected by it
 * (`docs/09_GUIA_DE_ESTILO_VISUAL.md` §3, "los animales llevan el origen en
 * las patas"). The counterpart to `DEFAULT_GRIP`, which is what a held object
 * like the lens uses.
 */
export const STANDING_GRIP: readonly [number, number] = [0.5, 1]

/** An axis-aligned box in viewBox units — what an `<image>` is spread onto. */
export interface ArtBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Where a standing character's feet belong beside an art-corridor piece's
 * TRACED END, instead of ON the route's own point
 * (`TraceCanvas.tsx`'s `TraceStandingArt.at` carries this out to the render
 * site; `screen/LevelPlay.tsx` is the one caller). An art-corridor route runs
 * down the drawn body's OWN centreline, so a character planted there with
 * its feet at that point stands chest-deep in the animal, its own height
 * rising straight up over the head — found on `snake1`'s start octopus
 * (diagnostic doc N3).
 *
 * `at` is inverse-rotated into `piece`'s own local (pre-rotation) frame —
 * the exact inverse of `levels/artCorridor.ts`'s own `rotate → translate`,
 * so this works whatever the piece's rotation (an upright `snake1` piece, a
 * `snake3` column standing on `rotate: -90`, alike). Only the local Y (the
 * across-the-body axis, unaffected by which end is traced) survives the
 * round trip; the local X is replaced outright by a point `margin` BEFORE
 * the box's own near edge (`atStart`) or past its far edge (`!atStart`) —
 * off the SHORT axis of the piece's own bounding box, where a single family
 * member's own drawn body is the only thing in frame (`snakeHorizontalPieces`'s
 * three rows sit under 35 units apart vertically — far too little clearance
 * to stand below one without also standing on the next — while every piece's
 * own box is at least 375 units long along this axis, `snakeVerticalPieces`'s
 * own shortest span). Then rotated back to screen space.
 */
export function standBesideArtCorridor(
  at: { x: number; y: number },
  piece: { box: ArtBox; rotate: number; pivot: { x: number; y: number } },
  margin: number,
  atStart: boolean,
): { x: number; y: number } {
  const rad = (piece.rotate * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = at.x - piece.pivot.x
  const dy = at.y - piece.pivot.y
  // Inverse rotation (screen → local): rotate by −rad.
  const localY = -dx * sin + dy * cos
  const localX = atStart
    ? piece.box.x - margin - piece.pivot.x
    : piece.box.x + piece.box.width + margin - piece.pivot.x
  // Forward rotation (local → screen) of (localX, localY).
  return {
    x: piece.pivot.x + localX * cos - localY * sin,
    y: piece.pivot.y + localX * sin + localY * cos,
  }
}

/**
 * The `<image>` box that puts `art`'s grip point exactly on `center`, at a
 * rendered height of `height` and the file's own aspect ratio. Width follows
 * from `art.w`/`art.h`, so a non-square file is never stretched to a shared
 * square.
 *
 * A zero `height` never produces `NaN`: `width = (0 * art.w) / art.h` is `0`
 * for any non-zero `art.h`, and both `x`/`y` fall out of that same `0`
 * multiplied by a finite grip fraction. See `placeArt.test.ts`.
 */
export function placeArt(
  art: { w: number; h: number; grip?: readonly [number, number] },
  height: number,
  center: { x: number; y: number },
): ArtBox {
  const width = (height * art.w) / art.h
  const [gx, gy] = art.grip ?? DEFAULT_GRIP
  return { x: center.x - gx * width, y: center.y - gy * height, width, height }
}

/**
 * The same box, slid by the MINIMUM amount that brings it inside `bounds`.
 * Size is never touched: a character shrunk to fit would read as standing
 * further away, which is a different sentence from the one the art makes.
 *
 * This exists because a route may begin or end hard against the edge of the
 * sheet, and the standing art is placed by its feet — so the octopus at the
 * route's first point was being cut in half by the viewBox
 * (`?nivel=duck-trail4` and, predating it, `?nivel=trail4`). Nudging is
 * legitimate only because it is bounded: `docs/09` §2 has the octopus mark
 * WHERE YOU STARTED FROM and the lamp mark WHERE YOU ARE GOING, so neither
 * may drift off its point. The worst case is half the art's own width — ~52
 * units for a 96-unit-tall octopus on a 1000-unit sheet — which still reads
 * as standing at the start.
 *
 * When the art is LARGER than `bounds` on an axis there is no position that
 * fits, so the near edge wins: the box is pinned to `bounds`' top/left and
 * overflows the far side. Pushing it off the opposite edge instead would
 * only move the clipping, and would move it to the end the child is not
 * looking at. Order of the two comparisons below is what encodes that.
 */
export function clampArtBox(box: ArtBox, bounds: ArtBox): ArtBox {
  let { x, y } = box
  if (x + box.width > bounds.x + bounds.width) x = bounds.x + bounds.width - box.width
  if (x < bounds.x) x = bounds.x
  if (y + box.height > bounds.y + bounds.height) y = bounds.y + bounds.height - box.height
  if (y < bounds.y) y = bounds.y
  return { x, y, width: box.width, height: box.height }
}
