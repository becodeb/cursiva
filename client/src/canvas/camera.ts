// The scrolling camera (`scrolling-camera` spec; design.md §2.1). Pure, no
// React, no DOM. Lives in `canvas/` beside `placeArt.ts` and `resample.ts`,
// NOT in `levels/`: `TraceCanvas` imports nothing from `levels/` or
// `detective/` (it holds no registry and no palette token), and `screen/`
// already depends on `canvas/`, never the reverse.

/**
 * The world x-origin of the window, for one frame.
 *
 * THREE properties, and each is one clause of this expression:
 *
 *  - FORWARD-ONLY. `Math.max(prev, …)` makes the origin monotone
 *    non-decreasing within an attempt. A camera that can retreat turns a
 *    wobbling finger into a rocking world, and a rocking world is a second
 *    motion the child did not ask for.
 *  - CLAMPED. `Math.min(max, …)` with `max = sheetWidth − viewWidth` keeps
 *    the window inside the world, so the child never reaches blank space past
 *    the right edge of the paper.
 *  - THE LEAD WINDOW. `headX − lead·viewWidth` is what stops the self-scroll:
 *    a finger held at world-x `h` yields the same `want` on every frame, and
 *    `max(prev, want)` of a constant is a FIXED POINT. The world cannot move
 *    under a finger that is not moving.
 *
 * `headX === undefined` (the finger is up) returns `prev`, clamped. That is
 * the whole of the pen-lift rule: the camera does NOT rewind between strokes,
 * and it falls out of the forward-only clause with no extra code.
 *
 * NO cap, NO damping, NO easing, and that is a decision rather than a
 * simplification (design.md §2.3): a camera with inertia would forfeit the
 * `prefers-reduced-motion` exemption this mechanic depends on.
 */
export function cameraOrigin(
  prev: number,
  headX: number | undefined,
  o: { viewWidth: number; lead: number; sheetWidth: number },
): number {
  const max = Math.max(0, o.sheetWidth - o.viewWidth)
  if (headX === undefined) return Math.min(max, prev)
  return Math.min(max, Math.max(prev, headX - o.lead * o.viewWidth))
}

/**
 * The origin an attempt STARTS at: 0, or `?debug=camara:<x>`'s seed, clamped
 * into the same `[0, sheetWidth − viewWidth]` the live step clamps into.
 *
 * ONE initialiser, called from mount AND from every reset site (design.md
 * §2.4) — the same discipline `arrange.ts`'s `seedArrange` was written to
 * restate, where a reset site calling the raw initialiser silently wiped the
 * screenshot seed.
 */
export function seedCameraOrigin(seed: number | null, viewWidth: number, sheetWidth: number): number {
  const max = Math.max(0, sheetWidth - viewWidth)
  return Math.min(max, Math.max(0, seed ?? 0))
}
