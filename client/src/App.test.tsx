import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'
import { auditCaptions } from './detective/captionAudit'
import { initialView } from './screen/GameScreen'
import MainScreen from './screen/MainScreen'
import type { ProgressStore } from './progress/ProgressStore'

/** Minimal store stub — the shell never writes progress in these renders. */
function fakeStore(): ProgressStore {
  const values = new Map<string, number>()
  return {
    getProgress: (letterId) => values.get(letterId) ?? 0,
    setProgress: (letterId, value) => {
      values.set(letterId, value)
    },
  }
}

describe('App shell (docs/12: the zoo map is the entry point)', () => {
  it('opens on the zoo map, not the office and not the internal level map', () => {
    const html = renderToString(<App />)
    expect(html).toContain('/art/zoo-map.png')
    expect(html).not.toContain('/art/home-octopus.png')
    expect(html).not.toContain('Elegí un camino')
  })

  it('every visible word on the first screen passes auditCaptions (D3)', () => {
    const rendered = renderToString(<App />)
    const audit = auditCaptions(rendered)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  // D3's rewritten assertion, proven able to fail (proposal D3, tasks.md
  // 3.4): the OLD assertion here was "zero visible text at all", which the
  // map cannot satisfy — it carries a star count and the octopus's phrase,
  // both real words. The invariant that survives is `docs/09` §8's "ningún
  // texto aparece solo", already encoded as `auditCaptions`. This proves
  // that check is not vacuous by handing it a string it MUST reject.
  it('the auditCaptions assertion above can fail — proven on a hand-built bare word', () => {
    const bare = '<main><div class="cv-zoo-hud-right">12</div></main>'
    const audit = auditCaptions(bare)
    expect(audit.uncaptioned).not.toEqual([])
  })

  it('a ?nivel= deep link still skips straight into the game', () => {
    // The shell reads `window.location.search`, which is absent under SSR, so
    // the routing decision itself is asserted through the same pure function
    // the shell calls — `initialView` — rather than through a rendered string.
    // `dev` defaults to `false` here, same as every real caller under SSR.
    expect(initialView('?nivel=trail1')).toEqual({ view: 'play', levelId: 'trail1' })
    // Nothing asked for resolves to `null` (design.md §8) — the zoo map is
    // the fallback, not the internal `LevelMap`.
    expect(initialView('')).toBeNull()
  })
})

describe('MainScreen (U7 letter workbench, unchanged behind the toggle)', () => {
  it('renders the trace canvas surface without throwing', () => {
    const html = renderToString(<MainScreen store={fakeStore()} />)
    // trace-canvas "Guides sit on the viewBox grid" scenario (SSR markup):
    expect(html).toContain('viewBox="0 0 1000 600"')
    expect(html).toContain('y1="180"')
    expect(html).toContain('y1="420"')
  })

  it('renders the checkpoint overlay toggle and Borrar, with no combo picker (main-screen)', () => {
    const html = renderToString(<MainScreen store={fakeStore()} />)
    expect(html).not.toContain('aria-label="Combinaciones"')
    expect(html).not.toContain('Combinación ac')
    expect(html).toContain('Mostrar puntos del trazo')
    expect(html).toContain('Borrar')
    // The current-word label renders while the word is non-empty (SSR splits
    // the interpolated char with comment markers, so assert the fragment).
    expect(html).toContain('palabra:')
  })

  it('an empty word renders the placeholder: no canvas, no current-word label', () => {
    const html = renderToString(<MainScreen store={fakeStore()} initialWord={[]} />)
    expect(html).toContain('Elegí una letra o escribí con el teclado para empezar')
    expect(html).not.toContain('y1="180"') // no canvas → no ruled guides
    expect(html).not.toContain('palabra:')
  })

  it('the word flow starts in guided mode: the demo replays from the first letter (T7.3)', () => {
    // GuidedTrace renders the animated demo path on first render. The
    // event-driven reset to guided on EVERY append (picker or a–z, but not
    // Backspace/Borrar) is covered in wordBuilding.test.ts via the pure
    // flowWord reducer — the vitest env is node, so keydown dispatch cannot
    // run under SSR here.
    expect(renderToString(<MainScreen store={fakeStore()} />)).toContain('stroke="#0284c7"')
  })
})
