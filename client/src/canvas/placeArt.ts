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
): { x: number; y: number; width: number; height: number } {
  const width = (height * art.w) / art.h
  const [gx, gy] = art.grip ?? DEFAULT_GRIP
  return { x: center.x - gx * width, y: center.y - gy * height, width, height }
}
