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
