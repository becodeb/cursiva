// Dev-mode flag: on in `vite` dev server (import.meta.env.DEV) or when the URL
// carries `?dev` (so it can be toggled on a production/preview build for demos).
export function isDevMode(): boolean {
  if (typeof window === 'undefined') return false
  return import.meta.env.DEV || new URLSearchParams(window.location.search).has('dev')
}

/**
 * `?debug=sectores` (`zoo-map` design.md §5, "`?debug=sectores` is parsed by
 * a pure function, and is not dev-gated"). Pure over its one explicit
 * argument, exactly like `screen/GameScreen.ts`'s `initialView` — and
 * deliberately NOT gated by `isDevMode()` the way `?nivel=mapa` is. The two
 * flags differ in kind: `?nivel=mapa` opens a navigable surface carrying a
 * destructive control ("Reiniciar progreso"), which is why it needs a gate.
 * This one paints translucent rects and adds no control, no word and no
 * route — and it must work against the EXACT build a reviewer is
 * screenshotting (`scripts/shot.sh` is routinely pointed at a preview
 * build), so a dev gate would mean the reviewed build and the debugged
 * build disagree.
 */
export function isSectorDebug(search: string): boolean {
  try {
    return new URLSearchParams(search).get('debug') === 'sectores'
  } catch {
    // Malformed query string: no debug overlay, never a crash.
    return false
  }
}

/**
 * `?debug=espina` (`snake-drag-and-art-corridor` design.md §8). NOT
 * dev-gated — `isSectorDebug`'s own stated reason: it overlays `target.paths`
 * as a plain line over the art, adding no control, no word and no route, and
 * must work against the EXACT build a reviewer is screenshotting. Mirrors
 * `isSectorDebug`'s own colon-less shape: an exact-match flag, not a
 * `<prefix>:<rest>` pair.
 */
export function isSpineDebug(search: string): boolean {
  try {
    return new URLSearchParams(search).get('debug') === 'espina'
  } catch {
    return false
  }
}

/**
 * `?debug=pato-recuperado` (duck-undulations-and-sector-backdrop, screenshot
 * verification): a DEV-GATED capture aid — unlike `isSectorDebug` above,
 * this one seeds a real persisted record (`duck-trail4` filed) rather than
 * only painting an overlay, so it needs the same gate `?nivel=mapa` uses,
 * never the reviewed-build guarantee `isSectorDebug` protects.
 *
 * Exists because `scripts/shot.sh`'s single-URL model cannot click through
 * four levels or seed `localStorage` before capturing the zoo map with the
 * duck already standing at the pond — this flag does in one page load what
 * would otherwise need a live interactive session or manual devtools.
 */
export function shouldSeedRecoveredDuck(search: string): boolean {
  try {
    return new URLSearchParams(search).get('debug') === 'pato-recuperado'
  } catch {
    return false
  }
}

/**
 * `?debug=<prefix>:<rest>` — the shared parser behind the three screenshot-
 * seeding flags below (design.md §9). Private: every flag's own grammar
 * (comma-separated ids, a bare percentage, an `x,y` pair) is parsed by its
 * own exported function, never by a caller reaching into this one directly.
 * Malformed input (a bad query string, or `debug` present but not matching
 * `prefix`) returns `null`, never throws.
 */
function debugArg(search: string, prefix: string): string | null {
  try {
    const raw = new URLSearchParams(search).get('debug')
    if (raw === null) return null
    const at = raw.indexOf(':')
    if (at < 0) return null
    if (raw.slice(0, at) !== prefix) return null
    return raw.slice(at + 1)
  } catch {
    return null
  }
}

/**
 * `?debug=progreso:<id>,<id>,…` (design.md §9; `level-engine` spec
 * "Comma-Separated Progress Seeding Flag"). DEV-GATED at the call site,
 * exactly like `?nivel=mapa` and `shouldSeedRecoveredDuck` above: unlike
 * `revealDebugFraction`/`lightDebugPoint` below, this one writes REAL
 * persisted `LevelProgressStore` records, so it needs the same gate every
 * other navigable/mutating surface in this file uses. Generalizes
 * `shouldSeedRecoveredDuck`'s one boolean into an arbitrary id list — the
 * same shape, one seeded record per listed id, instead of one hardcoded id.
 * Malformed input, or no match at all, returns `[]`, never throws.
 */
export function seededProgressIds(search: string): readonly string[] {
  const arg = debugArg(search, 'progreso')
  if (arg === null || arg.length === 0) return []
  return arg.split(',').filter((id) => id.length > 0)
}

/**
 * `?debug=revelado:<pct>` (design.md §9; `reveal-grid` spec "Screenshot
 * Seeding Flags for Render State"). NOT dev-gated — `isSectorDebug`'s own
 * stated reason above: it paints render state, adds no control and no
 * route, and must work against the EXACT build a reviewer is
 * screenshotting. Feeds `levels/revealGrid.ts`'s `debugClearedTiles` to
 * pre-clear an erase-mode level before a live finger ever touches it.
 * Malformed input, a missing flag, or a non-numeric percentage all return
 * `null`, never throw.
 */
export function revealDebugFraction(search: string): number | null {
  const arg = debugArg(search, 'revelado')
  if (arg === null) return null
  const pct = Number(arg)
  if (!Number.isFinite(pct)) return null
  return pct / 100
}

/**
 * `?debug=linterna:<x>,<y>` (design.md §9; same `reveal-grid` spec). NOT
 * dev-gated, for the same reason as `revealDebugFraction` above — and it
 * exists because `scripts/shot.sh` cannot move a finger. Pins a light-mode
 * level's fold point at the given viewBox coordinate, replacing live
 * pointer input entirely. Malformed input, a missing flag, or a
 * non-numeric coordinate all return `null`, never throw.
 */
export function lightDebugPoint(search: string): { x: number; y: number } | null {
  const arg = debugArg(search, 'linterna')
  if (arg === null) return null
  const [xRaw, yRaw] = arg.split(',')
  const x = Number(xRaw)
  const y = Number(yRaw)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

/**
 * `?debug=ordenadas:<k>` (`object-arrange` spec, "debugArrange Seeds the
 * First K Pieces Home, Ungated"; design.md §8). NOT dev-gated, for the same
 * reason as `revealDebugFraction`/`lightDebugPoint` above: it paints render
 * state (which pieces are already home), adds no control and persists
 * nothing, and must work against the exact build being screenshotted.
 * Malformed input, a missing flag, or a non-numeric count all return
 * `null`, never throw.
 */
export function arrangeDebugCount(search: string): number | null {
  const arg = debugArg(search, 'ordenadas')
  if (arg === null) return null
  const k = Number(arg)
  if (!Number.isFinite(k)) return null
  return k
}

/**
 * `?debug=estela:<k>` (`free-trail-waypoints` spec: "Screenshot Seeding
 * Flags for the Waypoint Fold"; design.md §8, amendment A4). NOT dev-gated —
 * the same reason `arrangeDebugCount` above is not: it paints render state
 * (which flowers are lit, where the bee sits, the trail that got her there,
 * the touch-radius rings), adds no control and persists nothing, and must
 * work against the exact build being screenshotted. ONE flag drives all four
 * of those facts from the SAME number, which is what stops them from ever
 * disagreeing with each other (A4's whole argument, replacing the
 * proposal's two independent flags). `arrangeDebugCount`'s body, verbatim.
 * Malformed input, a missing flag, or a non-numeric count all return
 * `null`, never throw.
 */
export function waypointDebugCount(search: string): number | null {
  const arg = debugArg(search, 'estela')
  if (arg === null) return null
  const k = Number(arg)
  if (!Number.isFinite(k)) return null
  return k
}

/**
 * `?debug=camara:<x>` (`scrolling-camera` spec; design.md §7). NOT dev-gated
 * — the same reason `arrangeDebugCount`/`waypointDebugCount` above are not:
 * it paints render state (where the window sits over the world), adds no
 * control, no word and no route, persists nothing, and must work against the
 * EXACT build a reviewer is screenshotting. `arrangeDebugCount`'s body,
 * verbatim. Malformed input, a missing flag, or a non-numeric origin all
 * return `null`, never throw. The returned value is NOT clamped here —
 * `seedCameraOrigin` (`canvas/camera.ts`) does that, the same clamp the live
 * rAF loop uses, so a seeded capture and a live stroke cannot tell different
 * stories.
 */
export function cameraDebugOrigin(search: string): number | null {
  const arg = debugArg(search, 'camara')
  if (arg === null) return null
  const x = Number(arg)
  if (!Number.isFinite(x)) return null
  return x
}
