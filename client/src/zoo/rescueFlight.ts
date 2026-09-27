// The rescue flight (prewriting-stage-completion T24, `docs/19_PROPUESTA_
// HISTORIA_Y_MECANICAS.md` §2.1 step 5 + §6 "Aventura -> mapa (rescate)"):
// once an animal-recovering adventure's closing is dismissed
// (`screen/AdventureClosing.tsx`), its big rescue image flies from where it
// stood in the closing to its spot on the zoo map (`zoo/sectors.ts`'s own
// `animalSpot`, `screen/ZooMap.tsx`'s `recovered` list), landing with a
// small bounce.
//
// `docs/19` §6 names the TECHNIQUE, not just the picture: "El mapa se monta
// con el animal en la posición de pantalla que tenía en el cierre y lo anima
// hasta su lugar (técnica FLIP). Se anima una imagen HTML encima, no el nodo
// SVG (el `transform` de CSS pisa al atributo)". The animal's permanent
// on-map appearance is an ordinary SVG `<image>` (`ZooMap.tsx`'s own
// `recovered.map`) — this is exactly the bug the Engram note `svg-transform-
// css-pisa-atributo` records: animating a LIVE inline SVG node's own
// `transform` mid-flight fights its `x`/`y`/`width`/`height` attributes and
// can snap it back to the origin. The flight is therefore always a SEPARATE
// plain HTML `<img>` overlay, positioned in screen pixels, that disappears
// once it lands — the permanent SVG image underneath was already correct
// from the very first frame (the level's approval that unlocks it is
// persisted before the closing ever mounts), so nothing about it is ever
// touched.
//
// Pure math lives here, DOM-free and directly testable — the same split
// `pulpitoStance.ts`'s `stageSizePx`/`octopusBoxAtCorner` and `bubbleFit.ts`
// already keep for their own placement arithmetic: the two screens that
// actually measure real rects (`AdventureClosing.tsx`, `ZooMap.tsx`) hand
// this module plain numbers, never the other way around.
//
// The DEPARTURE HANDOFF below (`recordDeparture`/`peekPendingDeparture`/
// `takeDeparture`) is module-scope session memory, the same idiom
// `zoo/stars.ts`'s own `lastSeenStars` documents: `AdventureClosing` and
// `ZooMap` are mounted by DIFFERENT shells (`App.tsx`'s `game` vs `map` —
// that file's own header), and `GameScreen` fully UNMOUNTS before `ZooMap`
// mounts, so no React state or context can span the hop. A plain module
// variable, written once and read once, is what carries the measured
// departure rect across that unmount/mount boundary.
import type { ZooAnimalId } from '../detective/assets'

/** An axis-aligned rect in CSS pixels — `getBoundingClientRect()`'s own
 *  shape, restated as a plain object. Never store a live `DOMRect`: its
 *  properties are getters that go stale the instant the source element
 *  moves, and the whole point of `recordDeparture` is to freeze a snapshot
 *  taken BEFORE the element that produced it unmounts. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** How long a recorded departure stays usable (ms). Generous enough to
 *  survive the real shell swap (`App.tsx`'s `onExit` → `goToMap` → `ZooMap`
 *  mounting), short enough that a stale departure from a much earlier,
 *  unrelated visit can never replay on a later one that has nothing to do
 *  with it. */
const DEPARTURE_TTL_MS = 6000

interface PendingDeparture {
  animalId: ZooAnimalId
  rect: Rect
  recordedAt: number
}

let pendingDeparture: PendingDeparture | null = null

/**
 * Called by `AdventureClosing.tsx`'s own stage button, the instant it is
 * tapped for an animal-recovering closing — BEFORE `onContinue` starts the
 * navigation that eventually unmounts it. `rect` is that render's own big
 * rescue image, measured live (`getBoundingClientRect`, copied into a plain
 * object by the caller); `now` is injectable so this stays testable without
 * a real clock.
 */
export function recordDeparture(animalId: ZooAnimalId, rect: Rect, now: number = Date.now()): void {
  pendingDeparture = { animalId, rect, recordedAt: now }
}

/**
 * Non-destructive: whether a still-fresh departure is waiting, without
 * consuming it. `App.tsx`'s own map-shell branch uses THIS alone (never
 * `takeDeparture`) to pick the screen-swap transition kind
 * (`screen/ScreenTransition.tsx`'s own `kind` prop, T24: the flight replaces
 * the lupa wipe for this one hop) — it must never clear the handoff itself,
 * or `ZooMap`'s own `takeDeparture` below would find nothing left to fly.
 */
export function peekPendingDeparture(now: number = Date.now()): ZooAnimalId | null {
  if (!pendingDeparture) return null
  if (now - pendingDeparture.recordedAt > DEPARTURE_TTL_MS) return null
  return pendingDeparture.animalId
}

/**
 * Destructive: consumes and clears the handoff. `ZooMap` calls this exactly
 * ONCE per mount (guarded by its own `useRef`, the same one-shot-per-mount
 * shape `zoo/stars.ts`'s `recordSeenStars` documents for session memory), so
 * a later map visit — even within the same session — never replays a flight
 * that already landed.
 */
export function takeDeparture(now: number = Date.now()): { animalId: ZooAnimalId; rect: Rect } | null {
  const found = pendingDeparture
  pendingDeparture = null
  if (!found) return null
  if (now - found.recordedAt > DEPARTURE_TTL_MS) return null
  return { animalId: found.animalId, rect: found.rect }
}

/** Test-only reset: `rescueFlight.test.ts` runs many cases against the SAME
 *  module-scope variable, and neither `recordDeparture` nor a stale `peek`
 *  clears it on their own (by design — the TTL is what naturally retires a
 *  handoff in production, `DEPARTURE_TTL_MS`'s own header). */
export function __resetPendingDepartureForTests(): void {
  pendingDeparture = null
}

/**
 * Maps an axis-aligned box in SVG VIEWBOX units into on-screen CSS pixels,
 * for an `<svg>` rendered with `preserveAspectRatio="xMidYMid meet"`
 * (`ZooMap.tsx`'s own root `<svg>`) — a plain "contain" fit: the whole
 * viewBox is scaled uniformly to fit inside the element's own rendered box,
 * then centred within whatever margin is left on the other axis. Pure
 * arithmetic, no DOM: `svgScreenRect` is the caller's own
 * `getBoundingClientRect()` reading, handed in rather than read here, so
 * this stays directly testable with plain numbers.
 *
 * `viewBox.x`/`.y` (T32, `odd/tasks/prewriting-stage-completion.md`, the
 * full-bleed map): before T32 the root `<svg>`'s own `viewBox` was always the
 * literal `"0 0 1000 600"`, so every pre-T32 caller passed only
 * `{width, height}` and this function only ever needed to scale `box.x`/`.y`
 * directly. T32 grows that viewBox to `screen/ZooMap.tsx`'s own
 * `displayBounds` (`canvas/TraceCanvas.tsx`'s `fitContentWithInsets`, the
 * SAME minimum-zoom-cover box a level's own backdrop already uses) to cover
 * the real container at whatever aspect the device has — an `ArtBox` with a
 * generally NON-zero `x`/`y` origin (`fitContentWithInsets`'s own centring
 * term). Both default to `0`, so a pre-T32 `{width, height}`-only call stays
 * byte-identical.
 */
export function viewBoxRectToScreenRect(
  box: Rect,
  svgScreenRect: Rect,
  viewBox: { x?: number; y?: number; width: number; height: number },
): Rect {
  const viewBoxX = viewBox.x ?? 0
  const viewBoxY = viewBox.y ?? 0
  const scale = Math.min(svgScreenRect.width / viewBox.width, svgScreenRect.height / viewBox.height)
  const renderedWidth = viewBox.width * scale
  const renderedHeight = viewBox.height * scale
  const offsetX = svgScreenRect.x + (svgScreenRect.width - renderedWidth) / 2
  const offsetY = svgScreenRect.y + (svgScreenRect.height - renderedHeight) / 2
  return {
    x: offsetX + (box.x - viewBoxX) * scale,
    y: offsetY + (box.y - viewBoxY) * scale,
    width: box.width * scale,
    height: box.height * scale,
  }
}

/**
 * The FLIP delta FROM `to`'s own frame back to `from` — a `translate` (in
 * `to`'s own CSS pixels, top-left origin) plus a `scale` that, applied to an
 * element already laid out AT `to`, renders it looking exactly like it sits
 * at `from`. Playing that transform back to the identity
 * (`translate(0, 0) scale(1, 1)`) over `RESCUE_FLIGHT_DURATION_MS` is the
 * whole manual-fallback animation (Paul Lewis's FLIP technique — invert,
 * then let it play), restated as pure numbers so it needs no DOM to test
 * (this module's own header on why the geometry is pure). `to.width`/
 * `to.height` are assumed non-zero (a rendered rect always is once mounted).
 */
export function flipDelta(
  from: Rect,
  to: Rect,
): { translateX: number; translateY: number; scaleX: number; scaleY: number } {
  return {
    translateX: from.x - to.x,
    translateY: from.y - to.y,
    scaleX: from.width / to.width,
    scaleY: from.height / to.height,
  }
}

/**
 * Feature-detects the View Transitions API without widening this project's
 * shipped `lib.dom.d.ts` globally (`document.startViewTransition` is not in
 * it yet) — `ZooMap.tsx` passes its own `document` through a narrow local
 * cast at the one call site instead of an ambient global declaration, so a
 * typo elsewhere in the app can never silently start relying on a wider
 * (wrong) type.
 */
export function supportsViewTransitions(doc: { startViewTransition?: unknown } | null | undefined): boolean {
  return typeof doc?.startViewTransition === 'function'
}

/**
 * `docs/19` §6's own closing line: "Con `prefers-reduced-motion`, todo esto
 * se reduce a cortes directos" — reads a `matchMedia` result the caller
 * already obtained, rather than calling `window.matchMedia` itself, so this
 * stays callable from a `node` test with a plain `{ matches: boolean }`
 * fixture (the exact split `screen/ScreenTransition.tsx`'s CSS-only reduced-
 * motion override does not need, because that one is pure CSS — this
 * decision also gates a JS branch, `ZooMap.tsx`'s own effect, so it has to
 * exist as a function).
 */
export function prefersReducedMotion(mql: { matches: boolean } | null | undefined): boolean {
  return mql?.matches ?? false
}

/** The one `view-transition-name` this flight ever uses — exactly one animal
 *  can be mid-flight at a time (the closing screen shows exactly one
 *  rescue), so there is no need for a per-animal name. Shared, not
 *  per-caller, so `AdventureClosing.tsx` and `ZooMap.tsx` can never drift
 *  apart on the string both tag their own image with. */
export const RESCUE_FLIGHT_VT_NAME = 'cv-rescue-flight'

/** Total on-screen duration of the flight's own move (ms) — the manual
 *  fallback's CSS transition length, and the override `ZooMap.tsx` applies
 *  to `::view-transition-group(cv-rescue-flight)` so a supporting browser's
 *  own (much shorter, 250ms UA-stylesheet default) timing matches it
 *  instead. Within the task's own "must not block input for more than the
 *  animation (~700-900ms)" budget. */
export const RESCUE_FLIGHT_DURATION_MS = 750
