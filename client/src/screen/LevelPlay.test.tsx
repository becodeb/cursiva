// LevelPlay SSR tests. Node environment, no DOM: `renderToString` on the
// HTML string (same convention `canvas/TraceCanvas.test.tsx` and
// `canvas/multiStroke.test.ts` already use for this repo — the latter's own
// header comment records the constraint this file inherits: state
// dispatches after a completed `renderToString` call are no-ops on the
// server, because there is no live tree left to re-render as a string. That
// is why the trail-completion filing contract (design unit 6, spec:
// detective-mode "Trail Completion Lamp and Rail Filing") is proven two
// ways below: as a pure, exported decision (`shouldFileClue`) asserted
// directly, and as a wiring check that the REAL `onFrame`/`onRelease`
// handlers `LevelPlay` builds run to completion and call through to
// `onAttempt` correctly — not as a re-rendered "after" screenshot, which
// this harness cannot produce.
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { TracePoint } from '../canvas/useTraceInput'
import type { LevelConfig } from '../levels/types'
import { EMPTY_RECORD, type LevelAttempt, type LevelRecord } from '../game/types'

// `TraceCanvas` is replaced with a prop-capturing stub (same SSR-probe idea
// `canvas/multiStroke.test.ts` uses for a hook): LevelPlay's OWN chrome is
// what this file tests, and capturing the real `onFrame`/`onRelease`
// closures LevelPlay builds lets the wiring tests below invoke them
// directly, with no DOM and no pointer simulation. `vi.mock` calls are
// hoisted above every import by vitest's transform, so this is safe even
// though it reads as though it runs after the imports below.
const traceCanvasProbe: { current: Record<string, unknown> | null } = { current: null }
// Spread the real module and override only the default export. Replacing the
// whole module instead breaks on every named export `LevelPlay` ever adds --
// it already broke once, on `INK_COLOR`, with an error that points at the mock
// rather than at the import that needed it.
vi.mock('../canvas/TraceCanvas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../canvas/TraceCanvas')>()),
  default: (props: Record<string, unknown>) => {
    traceCanvasProbe.current = props
    return null
  },
}))

// A night-shaped backdrop for ONE synthetic level id, so `inkColor`'s
// resolution against `backdrop?.ink` (design.md §2.4) is testable before
// Phase 5 wires `PENDING_ENTRANCE_BACKDROP` into the real `ADVENTURE_BACKDROP`
// registry (`zoo/backdrops.ts`'s own docblock; `apply-progress.md`). Every
// other level id resolves through the REAL `backdropFor`, unchanged.
vi.mock('../zoo/backdrops', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../zoo/backdrops')>()
  return {
    ...actual,
    backdropFor: (levelId: string) =>
      levelId === 'night-fixture'
        ? {
            art: actual.ADVENTURE_BACKDROP.duck!.art,
            quiet: '#394459',
            brightest: '#526084',
            corridorRows: { top: 51, bottom: 973 },
            tile: actual.NIGHT_VEIL,
            ink: actual.TORCH_CHALK,
            inkDim: actual.TORCH_CHALK_DIM,
          }
        : actual.backdropFor(levelId),
  }
})

import LevelPlay, {
  LAYOUT_CSS,
  SIGN_CROP_HEIGHT,
  SIGN_SIZE,
  allRevealTiles,
  drawingBand,
  eraseResultMessage,
  isOffPath,
  releasedRevealState,
  resultSpeechLine,
  seedCameraFor,
  shouldFileClue,
  shouldTickClue,
} from './LevelPlay'
import {
  CARRIER_LENS_ART,
  CLUE_ART,
  OCTOPUS_ART,
  SECTOR_ADVENTURE_ART,
  SECTOR_BACKGROUND_ART,
  SIGN_ART,
  ZOO_ANIMAL_ART,
  ZOO_STAR_ART,
} from '../detective/assets'
import { auditCaptions } from '../detective/captionAudit'
import { INK_COLOR, SHEET_PAPER } from '../canvas/TraceCanvas'
import type { InkRenderPolicy } from '../canvas/ink'
import { TORCH_CHALK } from '../zoo/backdrops'
import { adventureProgress } from '../zoo/progress'
import { PRINT } from '../detective/palette'
import { getLevel } from '../levels/catalog'
import { buildLevelTarget } from '../levels/buildLevel'
import { spineAnchors } from '../levels/spines'
import type { RevealConfig } from '../levels/types'
import type { Records } from '../zoo/sectors'

function makeLevel(over: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: 'test-level',
    phase: 1,
    title: 'Nivel de prueba',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: false, metronomeBpm: 0, rail: false },
    hint: 'Seguí el camino',
    // At least 3 points, or `flattenPathD` rejects the path as degenerate
    // (`letters/svgLetter.ts`: `points.length < 3` returns empty) — the
    // same minimum the level-engine spec's generators are held to.
    paths: ['M100,300 L500,300 L900,300'],
    corridorWidth: 100,
    rules: { mustBeContinuous: false, enforceOrder: false, minFluency: 0, minAccuracy: 0 },
    showGuide: true,
    letters: [],
    ...over,
  }
}

function makeDetectiveLevel(over: Partial<LevelConfig> = {}): LevelConfig {
  // spacing: 200 on this 800-unit straight test path derives to exactly 3
  // marks via `clueCountFor` (`round(800/200) - 1 = 3`), at x = 300, 500, 700
  // — matching every fixture below that was written against a fixed
  // `count: 3` before the arc-length-spacing defect fix.
  return makeLevel({ clue: { kind: 'droplet', spacing: 200 }, ...over })
}

/** A Nivel-3-shaped level: drawn IN the detective world (grass, mud ink, the
 * octopus, the wordless shell) but NOT a case trail — no clue mark, no
 * PISTAS rail entry, no lamp latch. `world.ts`'s `inDetectiveWorld` true,
 * `isCaseTrail` false. This is the split S1 exists to make representable;
 * no shipped level uses it yet (design.md §1, tasks.md 1.7). */
function makeWorldOnlyLevel(over: Partial<LevelConfig> = {}): LevelConfig {
  return makeLevel({ detectiveWorld: true, clue: undefined, ...over })
}

/** A reveal-grid-shaped level (`reveal-grid` capability): `free`/`blank`,
 *  no path, `reveal` set. `id` defaults to a plain string so it resolves
 *  through the REAL `backdropFor` (no backdrop, no ink override) unless the
 *  caller passes `id: 'night-fixture'`, which the mock above resolves to a
 *  night-shaped backdrop. */
function makeRevealLevel(reveal: RevealConfig, over: Partial<LevelConfig> = {}): LevelConfig {
  return makeLevel({ kind: 'free', surface: 'blank', paths: [], reveal, ...over })
}

/** A `Records` map with exactly the given ids filed (one approval each) —
 *  the same shape `adventureProgress` (`zoo/progress.ts`) reads through
 *  `isFiled`, for the T6 adventure-progress-bar tests below. */
function filedRecords(ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, attempts: 1, approvals: 1 }
  return out
}

const noop = (): void => undefined

/** Strips the `<style>` block (LAYOUT_CSS — never rendered as page text or
 * read by a screen reader; a browser's `innerText`, unlike a raw
 * `textContent` walk, already excludes it, so this matches what a reader
 * would actually encounter), then every remaining tag and attribute, then
 * collapses whitespace. Mirrors `detective/PistasRail.test.tsx`'s own
 * helper, extended for the one element this screen adds that helper never
 * had to deal with. */
function textOf(html: string): string {
  return html
    .replace(/<style>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('LevelPlay chrome branch (design.md Orchestrator Correction C1)', () => {
  it('a non-detective level keeps every existing chrome text unchanged (regression guard for the branch)', () => {
    const level = makeLevel()
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(html).toContain('‹ Volver')
    // React SSR interleaves `<!-- -->` hydration-boundary comments between
    // adjacent interpolated text nodes, so "Fase 1 · Nivel de prueba" is
    // never one contiguous substring — assert the title's own tag content
    // via the stripped-text helper instead.
    expect(textOf(html)).toContain('Fase 1 · Nivel de prueba')
    expect(html).toContain('Seguí el camino')
    expect(html).toContain('Borrar')
    expect(html).toContain('Siguiente')
    // The rail never appears on a level with no `clue` config.
    expect(html).not.toContain('<aside')
  })

  it('a detective-trail level renders no title, hint, coach copy, or rotate prompt, and control buttons carry no text label', () => {
    const level = makeDetectiveLevel()
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    // No title.
    expect(html).not.toContain('Fase 1 ·')
    expect(html).not.toContain(level.title)
    // No hint sentence.
    expect(html).not.toContain(level.hint)
    // No rotate prompt (also text, also suppressed).
    expect(html).not.toContain('Girá el dispositivo')
    // No coach/pillar copy — the whole result section is gone.
    expect(html).not.toContain('Del punto verde hasta la meta')
    expect(html).not.toContain('Precisión')
    expect(html).not.toContain('Sentido')
    expect(html).not.toContain('Fluidez')
    // Control buttons carry no VISIBLE text — replaced by ink glyphs. Asserted
    // against stripped text rather than raw HTML on purpose: each button keeps
    // an `aria-label` so a screen reader still hears a named control, and
    // aria-label is not visible text. A raw-HTML check here would fail on that
    // label and push whoever hits it toward deleting the accessible name.
    const visible = textOf(html)
    expect(visible).not.toContain('‹ Volver')
    expect(visible).not.toContain('Borrar')
    expect(visible).not.toContain('Siguiente')
    // T6 (adventure-flow-and-map-guidance) drops "PISTAS" itself — D19: an
    // abstract word a pre-reader cannot read. `makeDetectiveLevel`'s
    // synthetic id belongs to no `ADVENTURES` row, so no `progress` bar
    // renders here either (no `progress` prop is even passed): nothing on
    // this screen carries a caption at all any more. A real adventure
    // level's own bar and its caption licence are asserted separately in
    // the "LevelPlay adventure progress bar" describe block below.
    const audit = auditCaptions(html)
    expect(audit.captioned).toEqual([])
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('a detective-trail level with no adventure of its own (and therefore no progress bar) shows no visible word at all', () => {
    const level = makeDetectiveLevel()
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(textOf(html)).toBe('')
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('a world-only level (Nivel 3 shape: inDetectiveWorld true, isCaseTrail false) suppresses the same chrome as a case trail, but mounts no PISTAS rail (design.md §1, S1 split)', () => {
    const level = makeWorldOnlyLevel()
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    // No title, hint, or rotate prompt — same suppression as a case trail,
    // driven by `inDetectiveWorld`, not `isCaseTrail`.
    expect(html).not.toContain('Fase 1 ·')
    expect(html).not.toContain(level.hint)
    expect(html).not.toContain('Girá el dispositivo')
    // No coach/pillar copy — the result block is gone too.
    expect(html).not.toContain('Precisión')
    // But no case chrome: no PISTAS rail, because this level carries no clue.
    expect(html).not.toContain('<aside')
    expect(textOf(html)).not.toContain('PISTAS')
  })

  /* Row C shipped the ordinary worded shell here, and reading the captures
   * settled it the other way: `capturas/pasoC/` showed "Fase 1 · La ladera
   * angosta", the written hint and the worded buttons on screens whose
   * neighbouring duck adventure has none of it, and the child this is for
   * cannot read either screen.
   *
   * The words were never a decision about these levels. They fell out of one:
   * `CHANNEL_STONE` forced the eight out of the detective world (`MUD_INK`
   * fails the luma law on stone), and `inWorld` happened to gate BOTH the mud
   * ink and the chrome. Splitting them is what `drawnPlace` is for — it
   * already gates the octopus, the vertex art and the goal colour for exactly
   * this reason. The mechanics gates (the lens, `MUD_INK`, the PISTAS rail,
   * the scattered ground) stay on `inWorld` and are untouched.
   *
   * `backdrop ⇒ drawnPlace`, so this asserts the full duck-shaped suppression.
   */
  it('sheep-hill1 (row C, drawn on a backdrop) suppresses the same chrome as a duck trail — shown, not written', () => {
    const level = getLevel('sheep-hill1')
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(textOf(html)).not.toContain(`Fase 1 · ${level.title}`)
    expect(html).not.toContain(level.hint)
    expect(html).not.toContain('Girá el dispositivo')
    expect(html).not.toContain('Precisión')
    // The buttons lose their words too — icons, like the duck trails.
    expect(textOf(html)).not.toContain('Borrar')
    expect(textOf(html)).not.toContain('Siguiente')
    expect(html).not.toContain('<aside') // no PISTAS rail either — no clue
  })

  it('llama-peak1 suppresses the same chrome, so both mountain adventures read alike', () => {
    const level = getLevel('llama-peak1')
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(textOf(html)).not.toContain(`Fase 1 · ${level.title}`)
    expect(html).not.toContain(level.hint)
    expect(textOf(html)).not.toContain('Siguiente')
  })

  it('a phase-2+ (non-detective) level is unaffected even when it CAN show its guide-request button', () => {
    // Regression guard from the opposite direction: this branch must not
    // accidentally suppress chrome on an ordinary level whose config simply
    // happens to omit `clue`.
    const level = makeLevel({ phase: 3, surface: 'ruled' })
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(textOf(html)).toContain('Fase 3 · Nivel de prueba')
    expect(html).toContain(level.hint)
  })
})

describe('LevelPlay hands the magnifying glass to TraceCanvas', () => {
  it('passes the glass art, drawn in ink, on a detective trail', () => {
    renderToString(
      <LevelPlay
        level={makeDetectiveLevel()}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    const art = traceCanvasProbe.current?.carrierArt as
      | { href: string; w: number; h: number }
      | undefined
    expect(art, 'no carrierArt reached the canvas: the glass would not render').toBeTruthy()
    expect(art?.href).toBe(CARRIER_LENS_ART.href)
    // The glass belongs to the world, not to the reward: it takes no palette
    // colour of its own, because colour in this mode only ever means a clue
    // was earned. The art keeps its authored ink contour instead.
    expect(art).toEqual(CARRIER_LENS_ART)
  })

  it('passes the glass art on a world-only level too (gated on inDetectiveWorld, not isCaseTrail)', () => {
    renderToString(
      <LevelPlay
        level={makeWorldOnlyLevel()}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    const art = traceCanvasProbe.current?.carrierArt as
      | { href: string; w: number; h: number }
      | undefined
    expect(art).toEqual(CARRIER_LENS_ART)
  })

  it('passes no glass art on an ordinary level', () => {
    renderToString(
      <LevelPlay
        level={makeLevel()}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(traceCanvasProbe.current?.carrierArt).toBeUndefined()
  })
})

// [the carrier repair, §7.2] The regression a carrier:true + kind:'free'
// level renders no carrier at all today — `startMarker` used to read
// `target.polyline[0]`, always `undefined` on a routeless level, so the
// carrier's own gate (`level.carrier && startMarker`) never opened. Written
// FIRST per design.md §7.2 and confirmed RED on the pre-fix tree (`target
// .polyline[0]` with no fallback).
function makeWaypointCarrierLevel(start: { x: number; y: number }): LevelConfig {
  return makeLevel({
    kind: 'free',
    surface: 'blank',
    paths: [],
    carrier: true,
    carrierArt: { art: SECTOR_ADVENTURE_ART.bee, size: 76 },
    waypoints: {
      start,
      stops: [{ x: 500, y: 265, radius: 110 }],
      stopArt: { dormant: SECTOR_ADVENTURE_ART.flowerDormant, lit: SECTOR_ADVENTURE_ART.flower },
      stopSize: 64,
      goal: { x: 750, y: 385, radius: 96 },
      goalArt: SECTOR_ADVENTURE_ART.honeycomb,
      goalSize: 96,
    },
  })
}

describe('LevelPlay carrier-presence regression (§7.2: carrier:true + kind:"free" with an authored start renders a carrier)', () => {
  it('reaches TraceCanvas with a defined carrier at the authored waypoints.start, and its own carrierArt', () => {
    const start = { x: 250, y: 400 }
    renderToString(
      <LevelPlay
        level={makeWaypointCarrierLevel(start)}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(
      traceCanvasProbe.current?.carrier,
      'no carrier reached the canvas: a carrier:true + kind:"free" level rendered no carrier at all',
    ).toEqual(start)
    const art = traceCanvasProbe.current?.carrierArt as { href: string } | undefined
    expect(art?.href).toBe(SECTOR_ADVENTURE_ART.bee.href)
  })

  it('falls back to the hard-wired lens when the level declares no carrierArt of its own (byte-identical default)', () => {
    const start = { x: 250, y: 400 }
    renderToString(
      <LevelPlay
        level={makeLevel({
          kind: 'free',
          surface: 'blank',
          paths: [],
          carrier: true,
          waypoints: {
            start,
            stops: [{ x: 500, y: 265, radius: 110 }],
            stopArt: { dormant: SECTOR_ADVENTURE_ART.flowerDormant, lit: SECTOR_ADVENTURE_ART.flower },
            stopSize: 64,
            goal: { x: 750, y: 385, radius: 96 },
            goalArt: SECTOR_ADVENTURE_ART.honeycomb,
            goalSize: 96,
          },
        })}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(traceCanvasProbe.current?.carrier).toEqual(start)
    // Not `inWorld` (no `clue`, no `detectiveWorld`), so the shipped default
    // is `undefined` — the hard-wired lens is only for the detective world.
    expect(traceCanvasProbe.current?.carrierArt).toBeUndefined()
  })

  it('bee1 (the real catalog level) renders the bee at its authored start, with its own carrierArt and no CARRIER_LENS_ART', () => {
    const bee1 = getLevel('bee1')
    renderToString(
      <LevelPlay level={bee1} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(traceCanvasProbe.current?.carrier).toEqual(bee1.waypoints!.start)
    const art = traceCanvasProbe.current?.carrierArt as { href: string } | undefined
    expect(art?.href).toBe(SECTOR_ADVENTURE_ART.bee.href)
    expect(art?.href).not.toBe(CARRIER_LENS_ART.href)
    // The waypoint layer's render projection reaches the canvas too.
    const waypoints = traceCanvasProbe.current?.waypoints as { art: unknown[] } | undefined
    expect(waypoints?.art).toHaveLength(bee1.waypoints!.stops.length + 1)
  })
})

describe('LevelPlay backdrop (duck-undulations-and-sector-backdrop design.md §3.4)', () => {
  it('duck-trail2 gets the lagoon backdrop, zero scattered ground, and the quiet colour as the page background', () => {
    const html = renderToString(
      <LevelPlay
        level={getLevel('duck-trail2')}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(traceCanvasProbe.current?.ground, 'duck-trail2 must retire its scattered ground').toBeUndefined()
    const backdrop = traceCanvasProbe.current?.backdrop as { href: string; quiet: string } | undefined
    expect(backdrop?.href).toBe(SECTOR_BACKGROUND_ART.lagoon.href)
    expect(backdrop?.quiet).toBe('#b4c5d0')
    expect(html).toContain('#b4c5d0')
  })

  it("f2-agua2 now gets the lagoon backdrop and retires its scattered ground — the medusa levels joined the fish adventure (promised-animals P2)", () => {
    renderToString(
      <LevelPlay
        level={getLevel('f2-agua2')}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(traceCanvasProbe.current?.ground, 'f2-agua2 must retire its scattered ground').toBeUndefined()
    const backdrop = traceCanvasProbe.current?.backdrop as { href: string; quiet: string } | undefined
    expect(backdrop?.href).toBe(SECTOR_BACKGROUND_ART.lagoon.href)
    expect(backdrop?.quiet).toBe('#b4c5d0')
  })

  // Regression pair, named explicitly (design.md §3.2's `drawnPlace`):
  // `backdrop ⇒ inWorld` held for every level that shipped before this
  // change, so `drawnPlace` must evaluate the same as `inWorld`/`backdrop`
  // did separately for both — nothing about their rendering may move.
  it('duck-trail2 renders byte-identical to before this change (drawnPlace === inWorld for it)', () => {
    renderToString(
      <LevelPlay
        level={getLevel('duck-trail2')}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(traceCanvasProbe.current?.inkOnly).toBe(true)
    expect(traceCanvasProbe.current?.directionArrow).toBeUndefined()
    const startArt = traceCanvasProbe.current?.startArt as { href: string } | undefined
    expect(startArt?.href).toBe(OCTOPUS_ART.href)
  })

  it("f2-agua2 renders byte-identical to before this change (drawnPlace === inWorld for it, no backdrop)", () => {
    renderToString(
      <LevelPlay
        level={getLevel('f2-agua2')}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(traceCanvasProbe.current?.inkOnly).toBe(true)
    expect(traceCanvasProbe.current?.directionArrow).toBeUndefined()
    const startArt = traceCanvasProbe.current?.startArt as { href: string } | undefined
    expect(startArt?.href).toBe(OCTOPUS_ART.href)
  })
})

describe('LevelPlay — sheep-hill3 stands the octopus without a direction arrow (design.md §3.2, row C)', () => {
  it('drawnPlace is true from the backdrop alone (this level is not inDetectiveWorld)', () => {
    renderToString(
      <LevelPlay
        level={getLevel('sheep-hill3')}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    const startArt = traceCanvasProbe.current?.startArt as { href: string } | undefined
    expect(startArt?.href).toBe(OCTOPUS_ART.href)
    expect(traceCanvasProbe.current?.directionArrow).toBeUndefined()
    expect(traceCanvasProbe.current?.inkOnly).toBe(true)
    // A backdrop retires the scattered ground entirely — zero GROUND_GRASS/
    // GROUND_MUD marks, not merely an empty array.
    expect(traceCanvasProbe.current?.ground).toBeUndefined()
  })

  it('passes vertexArt with 3 apexes, one per authored peak', () => {
    renderToString(
      <LevelPlay
        level={getLevel('sheep-hill3')}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    const vertexArt = traceCanvasProbe.current?.vertexArt as
      | { href: string; at: readonly { x: number; y: number }[] }
      | undefined
    expect(vertexArt).toBeDefined()
    expect(vertexArt!.at).toHaveLength(3)
    expect(vertexArt!.href).toBe('/art/sector-sheep.png')
  })
})

describe('LevelPlay icon controls keep an accessible name (C1 removes visible text, not names)', () => {
  it('names every icon-only control on a detective trail', () => {
    const html = renderToString(
      <LevelPlay
        level={makeDetectiveLevel({ demo: true })}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    // The child sees glyphs; a screen reader still hears a named control.
    // aria-label is not visible text, so stripping the labels would have been
    // an accessibility regression, not compliance with the brief.
    for (const name of ['Volver', 'Borrar', 'Ver de nuevo', 'Siguiente']) {
      expect(html, `icon control missing its accessible name: ${name}`).toContain(
        `aria-label="${name}"`,
      )
    }
    // And none of those words is on screen as text.
    expect(textOf(html)).not.toContain('Borrar')
    expect(textOf(html)).not.toContain('Siguiente')
  })

  it('names every icon-only control on a world-only level too, with no PISTAS-related label leaking in', () => {
    const html = renderToString(
      <LevelPlay
        level={makeWorldOnlyLevel({ demo: true })}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    for (const name of ['Volver', 'Borrar', 'Ver de nuevo', 'Siguiente']) {
      expect(html, `icon control missing its accessible name: ${name}`).toContain(
        `aria-label="${name}"`,
      )
    }
    expect(textOf(html)).not.toContain('Borrar')
    expect(textOf(html)).not.toContain('Siguiente')
  })

  it('leaves a non-detective level naming its controls by their visible text', () => {
    const html = renderToString(
      <LevelPlay
        level={makeLevel({ demo: true })}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    // A redundant aria-label on a text button would double-announce it.
    expect(html).not.toContain('aria-label="Borrar"')
    expect(textOf(html)).toContain('Borrar')
  })
})

// The old PISTAS rail presence describe block is replaced by this one
// (adventure-flow-and-map-guidance T6, docs/18 §4.3-§4.4): the rail's ROLE
// inside LevelPlay is now `detective/TrailProgressBar.tsx`, driven by the
// `progress` prop (`zoo/progress.ts`'s `adventureProgress`) rather than by
// `isCase` alone. `detective/PistasRail.tsx` itself is untouched and keeps
// its own test file for the hen's unrelated deduction-screen case summary.
describe('LevelPlay adventure progress bar (adventure-flow-and-map-guidance T6)', () => {
  it('renders no bar for an ordinary level, a world-only level, or a case level with no ADVENTURES row of its own (no `progress` prop reaches any of them)', () => {
    for (const level of [makeLevel(), makeWorldOnlyLevel(), makeDetectiveLevel()]) {
      const html = renderToString(
        <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      // LAYOUT_CSS's own <style> tag always carries the .pistas-bar SELECTOR
      // (it is a static string), so the negative check has to read the body
      // only — the same trap the sign/pill tests above already avoid.
      const body = html.replace(/<style>[\s\S]*?<\/style>/, '')
      expect(body, level.id).not.toContain('pistas-bar')
    }
  })

  it('renders no bar even for a real adventure level when the caller passes no progress (every pre-T6 caller keeps working)', () => {
    const html = renderToString(
      <LevelPlay level={getLevel('duck-trail1')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')
    expect(body).not.toContain('pistas-bar')
  })

  it('a mid-adventure duck trail shows earned clue art for a filed level and drained for the rest, in play order', () => {
    const progress = adventureProgress('duck-trail2', filedRecords(['duck-trail1']))!
    const html = renderToString(
      <LevelPlay
        level={getLevel('duck-trail2')}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
        progress={progress}
      />,
    )
    expect(html).toContain('class="pistas-bar"')
    expect(html).toContain(CLUE_ART.webfoot.art.earned.href) // duck-trail1, filed
    expect(html).not.toContain(CLUE_ART.webfoot.art.drained.href)
    expect(html).toContain(CLUE_ART.breadcrumb.art.drained.href) // duck-trail2, current, unfiled
    expect(html).not.toContain(CLUE_ART.breadcrumb.art.earned.href)
    expect(html).toContain(CLUE_ART.bubble.art.drained.href) // duck-trail3, unfiled
    expect(html).toContain(CLUE_ART.feather.art.drained.href) // duck-trail4, unfiled
  })

  it('marks the level actually being played as current, and gives the bar one accessible name counting filed slots', () => {
    const progress = adventureProgress('duck-trail2', filedRecords(['duck-trail1']))!
    const html = renderToString(
      <LevelPlay
        level={getLevel('duck-trail2')}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
        progress={progress}
      />,
    )
    expect(html).toContain('pistas-slot-shell-current')
    expect(html).toContain('aria-label="Camino hacia el pato: 1 de 4"')
  })

  it('shows the animal as a dark silhouette until rescued, then in colour', () => {
    const midway = adventureProgress('duck-trail2', filedRecords(['duck-trail1']))!
    const html = renderToString(
      <LevelPlay level={getLevel('duck-trail2')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} progress={midway} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')
    expect(body).toContain(`src="${ZOO_ANIMAL_ART.pato.href}"`)
    expect(body).toContain('class="pistas-animal"')
    expect(body).not.toContain('pistas-animal-rescued')

    const rescued = adventureProgress(
      'duck-trail4',
      filedRecords(['duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4']),
    )!
    const rescuedHtml = renderToString(
      <LevelPlay level={getLevel('duck-trail4')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} progress={rescued} />,
    )
    expect(rescuedHtml.replace(/<style>[\s\S]*?<\/style>/, '')).toContain('class="pistas-animal pistas-animal-rescued"')
  })

  it('leaves an animal-less adventure (night) with no end-cap at all', () => {
    const progress = adventureProgress('night2', {})!
    expect(progress.animal).toBeUndefined()
    const html = renderToString(
      <LevelPlay level={getLevel('night2')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} progress={progress} />,
    )
    expect(html.replace(/<style>[\s\S]*?<\/style>/, '')).not.toContain('pistas-animal')
  })

  it('shows a star for a filed level with no clue art yet (sheep), and an empty socket while unfiled — never a dim placeholder star', () => {
    const progress = adventureProgress('sheep-hill2', filedRecords(['sheep-hill1']))!
    const html = renderToString(
      <LevelPlay level={getLevel('sheep-hill2')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} progress={progress} />,
    )
    // sheep-hill1 (filed, no clue) earns exactly one star image; sheep-hill2
    // (current, unfiled, no clue) gets no image in its own socket at all.
    expect(html.split(ZOO_STAR_ART.href).length - 1).toBe(1)
  })

  it('keeps the flight/store-pop/spark animations reusable from the old rail, with a reduced-motion fallback', () => {
    expect(LAYOUT_CSS).toContain('@media (prefers-reduced-motion: reduce)')
    expect(LAYOUT_CSS).toContain('.pistas-flight { display: none; }')
    expect(LAYOUT_CSS).toContain('pistas-fly-home')
    expect(LAYOUT_CSS).toContain('pistas-store-pop')
    expect(LAYOUT_CSS).toContain('pistas-slot-spark')
  })

  it('centres the bar absolutely inside .cv-head, costing that row no height, and hides nothing extra in narrow portrait (the bar is tiny, unlike the old full-width word)', () => {
    // T6 (orchestrator brief, restating T3/T5's own lesson): a bar in its own
    // row cost .cv-sheet ~84px of height. This one is absolutely positioned
    // and centred, the same technique the enclosure sign (T5) already uses.
    expect(LAYOUT_CSS).toMatch(/\.pistas-bar\s*\{\s*position:\s*absolute;/)
    expect(LAYOUT_CSS).toContain('.cv-top > .cv-head-wide { flex: 1 1 auto; }')
  })
})

describe('shouldFileClue (spec: detective-mode "Trail Completion Lamp and Rail Filing")', () => {
  it('files when the level is a detective trail and the run REACHED THE END (scenario "Finishing a trail lights the lamp and files the clue")', () => {
    expect(shouldFileClue(true, true)).toBe(true)
  })

  it('refuses to file when the run did not reach the end, whatever the marks did (scenario "Filing is refused mid-trace")', () => {
    // The signature still deliberately carries no `lit`/marks argument at
    // all: every mark earned is not, and never was, part of this decision.
    // What changed is the OTHER input — it used to be `evaluateLevel`'s
    // three-pillar `approved` and is now arc progress along the route.
    expect(shouldFileClue(true, false)).toBe(false)
  })

  it('never files on a level with no clue trail, even having reached the end', () => {
    expect(shouldFileClue(false, true)).toBe(false)
  })

  it('takes exactly two arguments, neither of them a clue state — filing can never be decided by the rewards it hands out', () => {
    // The arity IS the guarantee here (same reasoning as `reachedTrailEnd`'s
    // own test in `detective/clues.test.ts`): there is no third parameter a
    // future caller could quietly start passing `clueState` into.
    expect(shouldFileClue.length).toBe(2)
  })
})

describe('LevelPlay onFrame/onRelease wiring (integration, SSR probe)', () => {
  it('onRelease evaluates the real attempt and calls onAttempt through (proves the filing branch executes in the real closure)', () => {
    const level = makeDetectiveLevel()
    const onAttempt = vi.fn<(a: LevelAttempt) => void>()
    renderToString(
      <LevelPlay
        level={level}
        record={EMPTY_RECORD}
        onAttempt={onAttempt}
        onNext={noop}
        onBack={noop}
      />,
    )
    const props = traceCanvasProbe.current
    expect(props).not.toBeNull()
    const onRelease = props?.onRelease as (
      points: TracePoint[],
      pointerType: string,
      all: TracePoint[][],
    ) => void
    expect(typeof onRelease).toBe('function')

    // Rules on `makeLevel` set minAccuracy/minFluency to 0, so ANY stroke
    // with at least two points is approved by construction — the point of
    // this test is that the wiring RUNS, not the scoring itself (which
    // `evaluateLevel`'s own suite already covers).
    const stroke: TracePoint[] = [
      { x: 100, y: 300 },
      { x: 500, y: 300 },
      { x: 900, y: 300 },
    ]
    onRelease(stroke, 'touch', [stroke])

    expect(onAttempt).toHaveBeenCalledTimes(1)
    expect(onAttempt.mock.calls[0][0].approved).toBe(true)
  })

  it('onFrame runs the clue-tick branch without throwing for a detective trail', () => {
    const level = makeDetectiveLevel()
    renderToString(
      <LevelPlay
        level={level}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    const props = traceCanvasProbe.current
    const onFrame = props?.onFrame as (
      points: TracePoint[],
      drawing: boolean,
      timeMs: number,
    ) => void
    expect(typeof onFrame).toBe('function')

    // First sample past the ~30 Hz throttle (`OFF_PATH_PERIOD_MS = 33`),
    // near the middle clue mark on the straight test path.
    expect(() => onFrame([{ x: 500, y: 300 }], true, 200)).not.toThrow()
    // Finger up: the frame handler's early-return branch.
    expect(() => onFrame([], false, 300)).not.toThrow()
  })

  it.each(['duck-trail2', 'night2', 'f2-agua2'] as const)(
    "%s: multiCorridorTick's wiring runs on-corridor and off-corridor samples without throwing (single-route wall feedback byte-identical, corridorTrack.test.ts proves the numbers)",
    (id) => {
      const level = getLevel(id)
      const target = buildLevelTarget(level)
      renderToString(
        <LevelPlay
          level={level}
          record={EMPTY_RECORD}
          onAttempt={noop}
          onNext={noop}
          onBack={noop}
        />,
      )
      const onFrame = traceCanvasProbe.current?.onFrame as (
        points: TracePoint[],
        drawing: boolean,
        timeMs: number,
      ) => void
      expect(typeof onFrame).toBe('function')

      // `night2` is a reveal (`kind: 'free'`) level with no route at all —
      // its own `onFrame` branch returns before ever reaching
      // `multiCorridorTick`, which is exactly the "unaffected" case this
      // test proves alongside the two route-bearing levels.
      const mid = target.polyline[Math.floor(target.polyline.length / 2)] ?? { x: 500, y: 300 }
      // A sample ON the route, well past the ~30 Hz throttle.
      expect(() => onFrame([mid], true, 200)).not.toThrow()
      // A sample far off it — the same corridor half-width times 10, always
      // outside any shipped level's corridor.
      const half = (target.corridorWidth || 60) / 2
      expect(() =>
        onFrame([{ x: mid.x + half * 10, y: mid.y + half * 10 }], true, 400),
      ).not.toThrow()
    },
  )

  it('an arrange-bearing level with isArranged false suppresses ink and blocks completion on release (object-arrange spec)', () => {
    const onAttempt = vi.fn<(a: LevelAttempt) => void>()
    const level = makeLevel({
      arrange: { from: [{ x: 150, y: 500 }], snapRadius: 50 },
      artCorridor: [
        {
          art: SECTOR_ADVENTURE_ART.snakeMedium,
          spine: 'snakeMedium',
          span: 200,
          at: { x: 500, y: 300 },
        },
      ],
    })
    renderToString(
      <LevelPlay
        level={level}
        record={EMPTY_RECORD}
        onAttempt={onAttempt}
        onNext={noop}
        onBack={noop}
      />,
    )
    const props = traceCanvasProbe.current
    // Nothing is placed yet — the arrange phase is open from the first
    // render, and TraceCanvas is told to suppress ink.
    expect(props?.inkHidden).toBe(true)

    const onRelease = props?.onRelease as (
      points: TracePoint[],
      pointerType: string,
      all: TracePoint[][],
    ) => void
    const stroke: TracePoint[] = [
      { x: 100, y: 300 },
      { x: 900, y: 300 },
    ]
    onRelease(stroke, 'touch', [stroke])
    expect(onAttempt).not.toHaveBeenCalled()
  })

  it('an arrange-bearing level with isArranged already true (zero pieces) resumes tracing and scoring exactly as a no-arrange level', () => {
    const onAttempt = vi.fn<(a: LevelAttempt) => void>()
    const level = makeLevel({
      arrange: { from: [], snapRadius: 50 },
      artCorridor: [],
      rules: { mustBeContinuous: false, enforceOrder: false, minFluency: 0, minAccuracy: 0 },
    })
    renderToString(
      <LevelPlay
        level={level}
        record={EMPTY_RECORD}
        onAttempt={onAttempt}
        onNext={noop}
        onBack={noop}
      />,
    )
    const props = traceCanvasProbe.current
    // Vacuously arranged (no pieces to place): the gate never opens.
    expect(props?.inkHidden).toBe(false)

    const onRelease = props?.onRelease as (
      points: TracePoint[],
      pointerType: string,
      all: TracePoint[][],
    ) => void
    const stroke: TracePoint[] = [
      { x: 100, y: 300 },
      { x: 900, y: 300 },
    ]
    onRelease(stroke, 'touch', [stroke])
    expect(onAttempt).toHaveBeenCalledTimes(1)
    expect(onAttempt.mock.calls[0][0].approved).toBe(true)
  })

  it('passes a `clues` prop with the trail\'s marks to TraceCanvas, absent on an ordinary level', () => {
    const detective = makeDetectiveLevel()
    renderToString(
      <LevelPlay
        level={detective}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    const detectiveClues = traceCanvasProbe.current?.clues as { marks: unknown[] } | undefined
    expect(detectiveClues?.marks.length).toBe(3)

    renderToString(
      <LevelPlay
        level={makeLevel()}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(traceCanvasProbe.current?.clues).toBeUndefined()

    // A world-only level (no clue) also gets no `clues` prop — the field
    // reads `clueDef` directly and is untouched by the world/case split.
    renderToString(
      <LevelPlay
        level={makeWorldOnlyLevel()}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(traceCanvasProbe.current?.clues).toBeUndefined()
  })

  it('passes `ground` only on a detective trail, and memoises one field per route', () => {
    type Layer = { marks: unknown[]; art: unknown[] }
    const render = (level: LevelConfig): unknown => {
      renderToString(
        <LevelPlay
          level={level}
          record={EMPTY_RECORD}
          onAttempt={noop}
          onNext={noop}
          onBack={noop}
        />,
      )
      return traceCanvasProbe.current?.ground
    }

    const ground = render(makeDetectiveLevel()) as { grass: Layer; mud: Layer } | undefined
    expect(ground?.grass.marks.length).toBeGreaterThan(20)
    expect(ground?.mud.marks.length).toBeGreaterThan(3)
    expect(ground?.grass.art.length).toBe(12)
    expect(ground?.mud.art.length).toBe(8)

    // Deterministic: the same trail scatters the same field every time, so the
    // ground never crawls between renders.
    expect(render(makeDetectiveLevel())).toEqual(ground)

    // An ordinary level -- and the six phase-1 mazes that are not trails --
    // render exactly the surface they always did.
    expect(render(makeLevel())).toBeUndefined()

    // A world-only level also gets the ground — `inDetectiveWorld`, not
    // `isCaseTrail`, is the ground's real gate (design.md §1).
    const worldGround = render(makeWorldOnlyLevel()) as { grass: Layer; mud: Layer } | undefined
    expect(worldGround?.grass.marks.length).toBeGreaterThan(20)
    expect(worldGround?.mud.marks.length).toBeGreaterThan(3)
  })
})

describe('shouldTickClue (defect fix: clue collection gated on inside/outside)', () => {
  it('ticks when there are marks to collect and the fingertip is inside', () => {
    expect(shouldTickClue(true, false)).toBe(true)
  })

  it('does NOT tick while the fingertip is outside the corridor — the exact bug a real screenshot caught (two marks lit on a trace far off the trail)', () => {
    expect(shouldTickClue(true, true)).toBe(false)
  })

  it('never ticks on a level with no clue marks, even if somehow "inside" is true', () => {
    expect(shouldTickClue(false, false)).toBe(false)
  })
})

// [A1] `glass1` is a `kind: 'free'` level with an empty `routes` array —
// `multiCorridorTick` (`corridorTrack.ts:188`) returns `Infinity` for it, and
// the PRE-FIX expression (`corridorSample.distance > target.corridorWidth /
// 2`, with no route-count guard) evaluates `Infinity > 0` — `true` — on the
// very first drawing frame, so the live ink would render in `inkDimColor` for
// the whole attempt. `isOffPath` is the extracted, named decision the fix
// wires in (`LevelPlay.tsx`'s `onFrame`); testing it directly is this file's
// only way to prove the colour it drives, because nothing in this SSR-only
// harness re-renders `TraceCanvas` after a live `onFrame` sample (see this
// file's own header) — `TraceCanvas.tsx`'s `stroke={offPath ? inkDimColor :
// inkColor}` is the untouched, already-shipped mapping from this boolean to
// the colour the design names.
describe('isOffPath (A1: a routeless level has no wall to be outside of)', () => {
  it('confirms the empirical defect: glass1 has an empty routes array, and the un-guarded expression would be true', () => {
    const target = buildLevelTarget(getLevel('glass1'))
    expect(target.routes).toHaveLength(0)
    // The exact pre-fix expression, restated so the RED case is measured, not
    // asserted: `Infinity > corridorWidth / 2` for any non-negative width.
    expect(Infinity > target.corridorWidth / 2).toBe(true)
  })

  it('GREEN: glass1 (kind: free, empty routes) never reports off-path, whatever the sampled distance', () => {
    const target = buildLevelTarget(getLevel('glass1'))
    expect(isOffPath(target.routes.length, Infinity, target.corridorWidth)).toBe(false)
    expect(isOffPath(target.routes.length, 0, target.corridorWidth)).toBe(false)
  })

  it('night2 and every other routeless free level never reports off-path either', () => {
    for (const id of ['night2', 'glass1', 'sand2']) {
      const target = buildLevelTarget(getLevel(id))
      expect(target.routes, id).toHaveLength(0)
      expect(isOffPath(target.routes.length, Infinity, target.corridorWidth), id).toBe(false)
    }
  })

  it('a routed level (duck-trail2) is UNCHANGED: still reports off-path beyond half the corridor width', () => {
    // The one attribute A1 changes is gated on `routeCount === 0` — a routed
    // level's own off-path behaviour is exactly what it was before this fix.
    const target = buildLevelTarget(getLevel('duck-trail2'))
    expect(target.routes.length).toBeGreaterThan(0)
    expect(isOffPath(target.routes.length, target.corridorWidth, target.corridorWidth)).toBe(true)
    expect(isOffPath(target.routes.length, 0, target.corridorWidth)).toBe(false)
  })
})

describe('drawingBand — the pauta clamp only applies where a pauta exists', () => {
  // A short route sitting entirely inside the ruled zone, so the clamp is the
  // only thing deciding the band.
  const ideal: Array<readonly [number, number]> = [
    [100, 290],
    [500, 300],
    [900, 310],
  ]

  it('a RULED surface keeps the clamp: the band always contains the pauta', () => {
    const band = drawingBand(ideal, 110, 'ruled')
    expect(band.y).toBe(140) // PAUTA_TOP 180 - BAND_MARGIN 40
    expect(band.y + band.height).toBe(580) // PAUTA_BOTTOM 540 + BAND_MARGIN 40
  })

  it('defaults to the ruled behaviour when no surface is given', () => {
    expect(drawingBand(ideal, 110)).toEqual(drawingBand(ideal, 110, 'ruled'))
  })

  it('a ruled surface still WIDENS for a route that leaves the pauta', () => {
    const band = drawingBand([[100, 60], [900, 560]], 110, 'ruled')
    expect(band.y).toBeLessThan(140)
    expect(band.y + band.height).toBeGreaterThanOrEqual(580)
  })

  it('a BLANK surface takes the whole sheet: there is no pauta to reserve for', () => {
    // Detective trails and the phase-1/2 mazes are all blank. The clamp used
    // to crop them to ~140..580 to protect four ruled lines that are never
    // drawn, which is 160 units of sheet thrown away -- and on a detective
    // trail that sheet is now the world, not empty margin (docs/09 section 7).
    const band = drawingBand(ideal, 110, 'blank')
    expect(band).toEqual({ y: 0, height: 600 })
  })

  it('a blank surface is the full sheet whatever the route does', () => {
    expect(drawingBand([[10, 20]], 40, 'blank')).toEqual({ y: 0, height: 600 })
    expect(drawingBand([], 40, 'blank')).toEqual({ y: 0, height: 600 })
  })
})


describe('LevelPlay stands the octopus at the start and the lamp at the end', () => {
  const render = (level: LevelConfig): void => {
    renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
  }
  type Art = { href: string; w: number; h: number; size: number } | undefined

  it('sends the octopus as startArt on a detective trail, sized and standing', () => {
    render(makeDetectiveLevel())
    const art = traceCanvasProbe.current?.startArt as Art
    expect(art, 'no startArt reached the canvas: the octopus would not render').toBeTruthy()
    expect(art?.href).toBe(OCTOPUS_ART.href)
    // The canvas needs the intrinsic size to hold aspect, and a target height
    // to render at. The guide's figure is ~60 units; the shipped size is 96,
    // because at 60 a screenshot showed the character reading as a pin rather
    // than as the child's own detective. `GLASS_REST_DX/DY` are derived from
    // this number, so the three move together.
    expect(art?.w).toBe(OCTOPUS_ART.w)
    expect(art?.h).toBe(OCTOPUS_ART.h)
    expect(art?.size).toBe(96)
  })

  // T6 (adventure-flow-and-map-guidance) drops the generic case lamp: docs/18
  // §4.3's "the trail's goal shows the item instead of the light bulb when
  // feasible". `makeDetectiveLevel`'s own default clue (droplet) is what a
  // plain case level with no ADVENTURES row of its own (the hen's case
  // included) now shows at the end instead.
  it("sends the level's own clue art as endArt, drained before the trail is finished", () => {
    render(makeDetectiveLevel())
    const art = traceCanvasProbe.current?.endArt as Art
    expect(art?.href).toBe(CLUE_ART.droplet.art.drained.href)
    expect(art?.href).not.toBe(CLUE_ART.droplet.art.earned.href)
    expect(art?.size).toBe(84)
  })

  it('sends neither on an ordinary level, which keeps its green dot and its diamonds', () => {
    render(makeLevel())
    expect(traceCanvasProbe.current?.startArt).toBeUndefined()
    expect(traceCanvasProbe.current?.endArt).toBeUndefined()
  })

  it("sends the level's own goalArt as endArt on a world-only level with no case (design.md §5)", () => {
    const goalArt = { href: '/art/test-goal.png', w: 200, h: 240 }
    render(makeWorldOnlyLevel({ goalArt }))
    const art = traceCanvasProbe.current?.endArt as Art
    expect(art?.href).toBe(goalArt.href)
    expect(art?.w).toBe(goalArt.w)
    expect(art?.h).toBe(goalArt.h)
    // A creature, peer of the octopus's 96 — never the case/adventure marks'
    // shared 84.
    expect(art?.size).toBe(96)
  })

  it("goalArt WINS over the case's own clue art when both are present: a level's own content beats a default it did not ask for", () => {
    const goalArt = { href: '/art/test-goal.png', w: 200, h: 240 }
    render(makeDetectiveLevel({ goalArt }))
    const art = traceCanvasProbe.current?.endArt as Art
    expect(art?.href).toBe(goalArt.href)
    expect(art?.href).not.toBe(CLUE_ART.droplet.art.drained.href)
    expect(art?.href).not.toBe(CLUE_ART.droplet.art.earned.href)
  })

  // The other two T6 endArt branches — both keyed off a REAL ADVENTURES row,
  // never off the synthetic `makeDetectiveLevel` fixture (which belongs to
  // none): the last level of an animal-recovering adventure shows the
  // encounter itself, even though `duck-trail4` ALSO carries its own clue
  // (feather) — the encounter wins. Every other routed level of a
  // multi-level adventure with no clue of its own (sheep has none yet, per
  // docs/18 §4.4) shows the star instead.
  it('shows the animal (the encounter) on the LAST level of an animal-recovering adventure, even though it also has a clue', () => {
    render(getLevel('duck-trail4'))
    const art = traceCanvasProbe.current?.endArt as Art
    expect(art?.href).toBe(ZOO_ANIMAL_ART.pato.href)
    expect(art?.href).not.toBe(CLUE_ART.feather.art.drained.href)
    expect(art?.size).toBe(84)
  })

  it('shows the star on every other routed level of a multi-level adventure with no clue of its own (sheep)', () => {
    for (const id of ['sheep-hill1', 'sheep-hill2', 'sheep-hill3'] as const) {
      render(getLevel(id))
      const art = traceCanvasProbe.current?.endArt as Art
      expect(art?.href, id).toBe(ZOO_STAR_ART.href)
    }
    // sheep-hill4 is the adventure's own last level and recovers oveja: the
    // animal wins over the star fallback there.
    render(getLevel('sheep-hill4'))
    expect((traceCanvasProbe.current?.endArt as Art)?.href).toBe(ZOO_ANIMAL_ART.oveja.href)
  })

  // The fish adventure (`promised-animals` P2): all four garland levels now
  // carry `clue: { kind: 'bubble' }` and no `goalArt` (the removed medusa
  // goal — see `levels/catalog.ts`'s own comment on `f2-guirnalda`), so
  // `endArt`'s clue branch wins on the first three (drained, since a fresh
  // render never reaches the trail's end) and the encounter branch wins on
  // the fourth, the same duck/sheep pattern above.
  it('shows the drained bubble on f2-guirnalda/f2-agua2/f2-agua3, and the fish on f2-agua4 (its own last level)', () => {
    for (const id of ['f2-guirnalda', 'f2-agua2', 'f2-agua3'] as const) {
      render(getLevel(id))
      const art = traceCanvasProbe.current?.endArt as Art
      expect(art?.href, id).toBe(CLUE_ART.bubble.art.drained.href)
      expect(art?.href, id).not.toBe(ZOO_ANIMAL_ART.pez.href)
    }
    render(getLevel('f2-agua4'))
    const art = traceCanvasProbe.current?.endArt as Art
    expect(art?.href).toBe(ZOO_ANIMAL_ART.pez.href)
    expect(art?.href).not.toBe(CLUE_ART.bubble.art.drained.href)
  })

  it('sends the octopus on a world-only level (inDetectiveWorld), but no lamp (endArt stays gated on isCaseTrail alone in S1)', () => {
    render(makeWorldOnlyLevel())
    const art = traceCanvasProbe.current?.startArt as Art
    expect(art?.href).toBe(OCTOPUS_ART.href)
    // No case to arrive at yet — S6's `goalArt` branch is out of this
    // slice's scope, so a world-only level renders no end art at all here.
    expect(traceCanvasProbe.current?.endArt).toBeUndefined()
  })

  it('rests the glass in the octopus\'s raised tentacle, not at the route\'s first point', () => {
    // "Que se vea que la tiene el pulpo, no que la tiene adentro." The rest
    // point is offset up and to the right of the octopus's feet; while
    // drawing, the canvas puts the glass on the fingertip and this offset
    // plays no part.
    render(makeDetectiveLevel({ carrier: true }))
    const carrier = traceCanvasProbe.current?.carrier as { x: number; y: number } | undefined
    const startMarker = traceCanvasProbe.current?.startMarker as { x: number; y: number }
    expect(carrier).toBeTruthy()
    expect(carrier?.x).toBeGreaterThan(startMarker.x) // to the right
    expect(carrier?.y).toBeLessThan(startMarker.y) // and up (y grows down)
    // Bounded against the OCTOPUS'S OWN rendered height rather than a bare
    // number, because that is what the offset actually has to agree with: far
    // enough out of the body to read as held, close enough that it still reads
    // as this character holding it. The art stands on its feet, so the glass
    // belongs above them and within about one body height.
    const size = (traceCanvasProbe.current?.startArt as Art)!.size
    const dx = carrier!.x - startMarker.x
    const dy = startMarker.y - carrier!.y // upward, positive
    expect(dx).toBeLessThan(size) // not off beyond the octopus's own width
    expect(dy).toBeGreaterThan(size * 0.4) // clear of the body's centre
    expect(dy).toBeLessThan(size * 1.2) // not floating away above it
  })

  it('rests the carrier exactly on the start point on a non-detective carrier level', () => {
    render(makeLevel({ carrier: true }))
    const carrier = traceCanvasProbe.current?.carrier as { x: number; y: number } | undefined
    const startMarker = traceCanvasProbe.current?.startMarker as { x: number; y: number }
    expect(carrier).toEqual(startMarker)
  })
})

describe('LevelPlay makes the trail line MUD, and only the line', () => {
  it('sends a mud ink colour and a warm dim on a detective trail', () => {
    renderToString(
      <LevelPlay
        level={makeDetectiveLevel()}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    const ink = traceCanvasProbe.current?.inkColor as string
    const dim = traceCanvasProbe.current?.inkDimColor as string
    expect(ink).toBeTruthy()
    expect(ink).not.toBe(INK_COLOR) // it is not ink any more
    expect(dim).toBeTruthy()
    expect(dim).not.toBe('#94a3b8') // and its dim is not the cold grey either

    // Darker than the ground it is drawn on, lighter than the darkest clue
    // mark (`PRINT` is pure black), and warm on both counts — the three
    // constraints the brief set, asserted rather than eyeballed.
    const lum = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16)
      return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
    }
    const GROUND_EARTH = '#d9c3ae'
    expect(lum(ink), 'mud must be darker than the corridor earth').toBeLessThan(lum(GROUND_EARTH))
    expect(lum(ink), 'mud must be lighter than the footprint clue').toBeGreaterThan(lum(PRINT))
    // Warm: red channel above blue, the same way the earth it came from is.
    const warm = (hex: string): boolean => {
      const n = parseInt(hex.slice(1), 16)
      return ((n >> 16) & 255) > (n & 255)
    }
    expect(warm(ink), 'mud must be warm, not a cold grey').toBe(true)
    expect(warm(dim), 'the dim must be the same substance with the light down').toBe(true)
    // The dim is the line fading toward the ground, so it sits between them.
    expect(lum(dim)).toBeGreaterThan(lum(ink))
    expect(lum(dim)).toBeLessThan(lum(GROUND_EARTH))
  })

  it('sends the same mud ink colour on a world-only level (gated on inDetectiveWorld)', () => {
    renderToString(
      <LevelPlay
        level={makeWorldOnlyLevel()}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    const ink = traceCanvasProbe.current?.inkColor as string
    const dim = traceCanvasProbe.current?.inkDimColor as string
    expect(ink).toBeTruthy()
    expect(ink).not.toBe(INK_COLOR)
    expect(dim).toBeTruthy()
  })

  it('sends no ink override on an ordinary level, which keeps writing in ink', () => {
    renderToString(
      <LevelPlay
        level={makeLevel()}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(traceCanvasProbe.current?.inkColor).toBeUndefined()
    expect(traceCanvasProbe.current?.inkDimColor).toBeUndefined()
  })
})

describe('LevelPlay reveal grid wiring (reveal-grid capability, design.md §4.2)', () => {
  const erase: RevealConfig = { mode: 'erase', cols: 10, rows: 6, radius: 110 }
  const light: RevealConfig = {
    mode: 'light',
    cols: 15,
    rows: 9,
    radius: 200,
    objects: [{ art: CARRIER_LENS_ART, size: 96, x: 500, y: 300 }],
  }

  it('sends a reveal prop whose tiles cover the whole grid before any stroke (EMPTY_REVEAL)', () => {
    const level = makeRevealLevel(erase)
    renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const reveal = traceCanvasProbe.current?.reveal as { tiles: unknown[]; fill: string; art?: unknown[] }
    expect(reveal).toBeTruthy()
    expect(reveal.tiles.length).toBe(erase.cols * erase.rows) // nothing cleared yet
    expect(reveal.art).toBeUndefined() // erase mode has no hidden objects
  })

  it('opts only sand1 and sand2 into the typed sand visual policy', () => {
    for (const id of ['sand1', 'sand2'] as const) {
      renderToString(
        <LevelPlay level={getLevel(id)} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      expect((traceCanvasProbe.current?.reveal as { visual?: string }).visual, id).toBe('sand')
    }

    renderToString(
      <LevelPlay level={getLevel('glass1')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect((traceCanvasProbe.current?.reveal as { visual?: string }).visual).toBeUndefined()
  })

  it('uses sand-specific attempt wording without changing glass wording', () => {
    expect(eraseResultMessage('sand1', true)).toBe('¡Arena barrida!')
    expect(eraseResultMessage('sand2', false)).toBe('Seguí barriendo la arena.')
    expect(eraseResultMessage('glass1', true)).toBe('¡Vidrio limpio!')
    expect(eraseResultMessage('glass2', false)).toBe('Seguí limpiando el vidrio.')
  })

  // `glass3`/`glass4` are the `monos` adventure: their surface is leaf litter,
  // so policy and wording key off the level, never off the `glass*` ID prefix.
  it('opts only glass3 and glass4 into the typed leaves visual policy', () => {
    for (const id of ['glass3', 'glass4'] as const) {
      renderToString(
        <LevelPlay level={getLevel(id)} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      expect((traceCanvasProbe.current?.reveal as { visual?: string }).visual, id).toBe('leaves')
    }

    for (const id of ['glass1', 'glass2'] as const) {
      renderToString(
        <LevelPlay level={getLevel(id)} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      expect((traceCanvasProbe.current?.reveal as { visual?: string }).visual, id).toBeUndefined()
    }

    for (const id of ['sand1', 'sand2'] as const) {
      renderToString(
        <LevelPlay level={getLevel(id)} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      expect((traceCanvasProbe.current?.reveal as { visual?: string }).visual, id).toBe('sand')
    }
  })

  // T4: `sand3` is `sendero`'s own played level, `sand4` its dropped harder
  // twin (only reachable through the dev `?nivel=` deep link) — both drawn as
  // mud, never as the plain flat-fill tile contract.
  it('opts only sand3 and sand4 into the typed mud visual policy', () => {
    for (const id of ['sand3', 'sand4'] as const) {
      renderToString(
        <LevelPlay level={getLevel(id)} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      expect((traceCanvasProbe.current?.reveal as { visual?: string }).visual, id).toBe('mud')
    }

    for (const id of ['sand1', 'sand2'] as const) {
      renderToString(
        <LevelPlay level={getLevel(id)} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      expect((traceCanvasProbe.current?.reveal as { visual?: string }).visual, id).toBe('sand')
    }
  })

  it('uses leaves attempt wording for glass3/glass4 while glass1/glass2 keep the glass wording', () => {
    expect(eraseResultMessage('glass3', true)).toBe('¡Hojas juntadas!')
    expect(eraseResultMessage('glass3', false)).toBe('Seguí juntando las hojas.')
    expect(eraseResultMessage('glass4', true)).toBe('¡Hojas juntadas!')
    expect(eraseResultMessage('glass4', false)).toBe('Seguí juntando las hojas.')
    expect(eraseResultMessage('glass1', true)).toBe('¡Vidrio limpio!')
    expect(eraseResultMessage('glass2', false)).toBe('Seguí limpiando el vidrio.')
  })

  // D15/T3: the mud path used to fall through to the glass wording below —
  // "¡Vidrio limpio!" for a trail with no glass anywhere on it. `sand3` is
  // `sendero`'s one played level; `sand4` is its harder twin, dropped from
  // every `ADVENTURES` row by T1 (never deleted from the catalog — level ids
  // are persisted keys — but claimed by no adventure any more), so both need
  // covering: one reached through `adventureFor`, the other only through the
  // explicit id fallback. Every other family (glass, sand, leaves) must stay
  // exactly as asserted above — this is the fourth family, not a
  // replacement.
  it('uses mud attempt wording for the sendero adventure (sand3) and its dropped twin (sand4)', () => {
    expect(eraseResultMessage('sand3', true)).toBe('¡Sendero limpio!')
    expect(eraseResultMessage('sand3', false)).toBe('Seguí limpiando el sendero.')
    expect(eraseResultMessage('sand4', true)).toBe('¡Sendero limpio!')
    expect(eraseResultMessage('sand4', false)).toBe('Seguí limpiando el sendero.')
    // sand1/sand2 (the tortugas adventure) must keep the sand wording, never
    // fall into the new mud branch just because they share the sand* prefix.
    expect(eraseResultMessage('sand1', true)).toBe('¡Arena barrida!')
    expect(eraseResultMessage('sand2', true)).toBe('¡Arena barrida!')
  })

  // The leaves slice is copy plus paint: everything the grid scores on is pinned
  // here rather than left to review. `level.reveal`/`rules.minAccuracy` are
  // catalog-level properties, untouched by adventure/sector membership, so
  // both ids keep their own authored numbers regardless of T1.
  it('leaves the glass3/glass4 reveal geometry, rules, and tile count untouched', () => {
    for (const id of ['glass3', 'glass4'] as const) {
      const level = getLevel(id)
      expect(level.reveal, id).toEqual({ mode: 'erase', cols: 15, rows: 9, radius: id === 'glass3' ? 110 : 80 })
      expect(level.rules.minAccuracy, id).toBe(id === 'glass3' ? 76 : 82)
      renderToString(
        <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      const reveal = traceCanvasProbe.current?.reveal as { tiles: unknown[]; fill: string }
      expect(reveal.tiles.length, id).toBe(15 * 9)
      // `fill` comes from the LEAF_LITTER backdrop, resolved through the
      // level's own adventure (`zoo/backdrops.ts`'s `backdropFor`).
      // Adventure-flow-and-map-guidance T1 keeps `glass3` in `monos` (still
      // resolves LEAF_LITTER), but drops `glass4` from every `ADVENTURES`
      // row — it belongs to no adventure at all now, so `backdropFor`
      // resolves `undefined` and the reveal falls back to the ordinary
      // `SHEET_PAPER` fill, the ADVERTISED default for "a level authored
      // without one" (this file's own `reveal` comment above).
      expect(reveal.fill, id).toBe(id === 'glass3' ? '#6e7a4a' : SHEET_PAPER)
    }
  })

  it('sends a reveal prop with the hidden-object art for a light level', () => {
    const level = makeRevealLevel(light)
    renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const reveal = traceCanvasProbe.current?.reveal as { tiles: unknown[]; art?: { revealed?: boolean }[]; light?: unknown }
    expect(reveal.tiles.length).toBe(light.cols * light.rows)
    expect(reveal.art).toHaveLength(1)
    expect(reveal.art?.[0].revealed).toBe(false)
    expect(reveal.light).toBeNull()
  })


  it('derives released night discovery from the complete release stroke snapshot', () => {
    const twoObjects: RevealConfig = {
      mode: 'light',
      cols: 15,
      rows: 9,
      radius: 170,
      objects: [
        { art: CARRIER_LENS_ART, size: 96, x: 260, y: 180 },
        { art: CARRIER_LENS_ART, size: 96, x: 740, y: 420 },
      ],
    }
    const state = releasedRevealState(twoObjects, [[{ x: 260, y: 180 }, { x: 740, y: 420 }]], 1000)
    expect(state?.lit.size).toBe(2)
    expect(state?.point).toBeNull()
  })

  it('keeps one zero-opacity sentinel rect per tile for completed light reveal states', () => {
    const tiles = allRevealTiles(light, 1000)
    expect(tiles).toHaveLength(light.cols * light.rows)
    expect(tiles.every((tile) => tile.opacity === 0)).toBe(true)
  })


  it('sends no reveal prop for a level with no reveal field', () => {
    renderToString(
      <LevelPlay level={makeLevel()} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(traceCanvasProbe.current?.reveal).toBeUndefined()
  })

  // The harness cannot re-render after `renderToString` returns (this file's
  // own header comment), so `onFrame`'s effect on `revealState` is not
  // observable through a second render — only that the wiring RUNS, the
  // same constraint every other `onFrame` wiring test above already accepts.
  it('advances the reveal fold on onFrame without throwing, for both erase and light', () => {
    for (const reveal of [erase, light]) {
      const level = makeRevealLevel(reveal)
      renderToString(
        <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      const onFrame = traceCanvasProbe.current?.onFrame as (
        points: TracePoint[],
        drawing: boolean,
        timeMs: number,
      ) => void
      expect(typeof onFrame).toBe('function')
      expect(() => onFrame([{ x: 500, y: 300 }], true, 200)).not.toThrow()
      expect(() => onFrame([{ x: 500, y: 300 }, { x: 520, y: 320 }], true, 400)).not.toThrow()
      // Finger up: the same branch that resets `seen`/`point` for the reveal
      // fold (design.md §4.2, "the light goes out when the finger lifts").
      expect(() => onFrame([], false, 500)).not.toThrow()
    }
  })

  it('restartRun\'s reveal reset does not throw when a contact resets a reveal-bearing run', () => {
    // Synthetic only: no shipped reveal-grid level sets `resetOnContact`
    // (design.md §5.2's `resetOnContact: false` on all twelve) — this
    // fixture exercises `onFrame`'s `restartRun()` branch, which resets
    // `revealState` to `EMPTY_REVEAL` alongside everything else it resets.
    const level = makeRevealLevel(erase, { resetOnContact: true, corridorWidth: 40 })
    renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const onFrame = traceCanvasProbe.current?.onFrame as (
      points: TracePoint[],
      drawing: boolean,
      timeMs: number,
    ) => void
    // Two throttled samples so `contactTick`'s own debounce has a chance to
    // latch a reset — the exact threshold is `resetOnContact.ts`'s own
    // contract; this only proves the reveal-aware branch runs without error.
    expect(() => {
      onFrame([{ x: 500, y: 300 }], true, 200)
      onFrame([{ x: 500, y: 300 }], true, 400)
      onFrame([{ x: 500, y: 300 }], true, 600)
    }).not.toThrow()
  })



  it('resolves inkPolicy to none for erase reveal levels (T6: the finger only cleans, no ink trail)', () => {
    const level = makeRevealLevel(erase)
    renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(traceCanvasProbe.current?.inkPolicy satisfies unknown).toBe('none' satisfies InkRenderPolicy)
  })

  it('resolves inkPolicy to none for light reveal levels', () => {
    const level = makeRevealLevel(light)
    renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(traceCanvasProbe.current?.inkPolicy satisfies unknown).toBe('none' satisfies InkRenderPolicy)
  })

  it('keeps settled inkPolicy for ordinary mark-making levels', () => {
    renderToString(
      <LevelPlay level={makeLevel()} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(traceCanvasProbe.current?.inkPolicy satisfies unknown).toBe('settled' satisfies InkRenderPolicy)
  })
  it("resolves inkColor to the night backdrop's own TORCH_CHALK", () => {
    const level = makeRevealLevel(
      { mode: 'light', cols: 15, rows: 9, radius: 200, objects: [] },
      { id: 'night-fixture' },
    )
    renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(traceCanvasProbe.current?.inkColor).toBe(TORCH_CHALK)
  })

  it('resolves inkColor to undefined (MUD_INK/INK_COLOR default) for a reveal level with no backdrop ink', () => {
    const level = makeRevealLevel(erase)
    renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    // `test-level` (this fixture's id) resolves to no adventure/backdrop at
    // all through the REAL `backdropFor`, so `inkColor` is `undefined` —
    // exactly the byte-identical default every non-world level already had.
    expect(traceCanvasProbe.current?.inkColor).toBeUndefined()
  })
})

// Voice narration (docs/18 D1/D24/D26, "Todo se escucha"; adventure-flow-
// and-map-guidance T7). `resultSpeechLine` is the pure half — directly
// testable, unlike the `useEffect` that calls `speak()` with its result on
// a live `attempt`, which needs a real pointer release this harness cannot
// produce (this file's own header: `onFrame`/`onRelease` are not
// observable through `renderToString`).
describe('resultSpeechLine (adventure-flow-and-map-guidance T7)', () => {
  it('is null for anything that is not an approved attempt, whatever the mode', () => {
    expect(resultSpeechLine('glass1', 'erase', false)).toBeNull()
    expect(resultSpeechLine('night1', 'light', false)).toBeNull()
    expect(resultSpeechLine('test-level', undefined, false)).toBeNull()
  })

  it('is null for an approved attempt with no reveal mode at all (a routed/lettered level)', () => {
    expect(resultSpeechLine('test-level', undefined, true)).toBeNull()
  })

  it('speaks the exact erase success text, matching the on-screen .cv-result-pill wording', () => {
    expect(resultSpeechLine('glass1', 'erase', true)).toBe(eraseResultMessage('glass1', true))
    expect(resultSpeechLine('sand1', 'erase', true)).toBe('¡Arena barrida!')
    expect(resultSpeechLine('glass3', 'erase', true)).toBe('¡Hojas juntadas!')
    expect(resultSpeechLine('sand3', 'erase', true)).toBe('¡Sendero limpio!')
  })

  it('speaks the exact light success text, matching the on-screen .cv-result-pill wording', () => {
    expect(resultSpeechLine('night1', 'light', true)).toBe('¡Descubrimiento brillante!')
  })
})

// SpeakButton wiring for the level's own hint (docs/18 D1/D24/D26; T7). This
// is the fix for D24 (bee: "sin consigna") and D26 (erizo: "sin consigna")
// — both are drawnPlace levels whose written `.cv-hint` is suppressed by
// Orchestrator Correction C1, so the button (and the `useNarration` call
// that speaks it on mount, not observable here) is the ONLY on-screen
// affordance for their instruction today.
describe('LevelPlay hint SpeakButton (adventure-flow-and-map-guidance T7)', () => {
  it('renders a SpeakButton, aria-label="Escuchar", for a drawnPlace level with no written hint (bee)', () => {
    const html = renderToString(
      <LevelPlay level={getLevel('bee1')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')
    expect(body).toContain('aria-label="Escuchar"')
    // D24's own complaint: no written hint at all for this level.
    expect(body).not.toContain('class="cv-hint"')
  })

  it('renders a SpeakButton, aria-label="Escuchar", for a drawnPlace level with no written hint (erizo/hedgehog, D26)', () => {
    const html = renderToString(
      <LevelPlay level={getLevel('hedgehog1')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')
    expect(body).toContain('aria-label="Escuchar"')
    expect(body).not.toContain('class="cv-hint"')
  })

  it('renders a SpeakButton, aria-label="Escuchar", for an ordinary (non-drawnPlace) level too, alongside its written hint', () => {
    const html = renderToString(
      <LevelPlay level={makeLevel()} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')
    expect(body).toContain('aria-label="Escuchar"')
    expect(body).toContain('class="cv-hint"')
  })

  it('sits inside .cv-head-right, grouped with the title, at the row\'s own right end — never inside .cv-head-wide\'s centred sign/bar slot', () => {
    const html = renderToString(
      <LevelPlay level={getLevel('glass1')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')
    const rightGroupOpen = body.indexOf('class="cv-head-right"')
    const speakOpen = body.indexOf('aria-label="Escuchar"')
    const headClose = body.indexOf('</header>')
    expect(rightGroupOpen).toBeGreaterThanOrEqual(0)
    expect(speakOpen).toBeGreaterThan(rightGroupOpen)
    expect(speakOpen).toBeLessThan(headClose)
  })

  it('LAYOUT_CSS keeps .cv-head-right from adding height to the row (no min-height/padding of its own)', () => {
    expect(LAYOUT_CSS).toMatch(/\.cv-head-right\s*\{[^}]*flex:\s*0 0 auto;/)
  })
})

describe('LevelPlay stable result row and QA hooks (adventure-flow-and-map-guidance T3)', () => {
  // T3 revision (orchestrator QA regression): this file's first fix reserved
  // `.cv-result`'s min-height for the erase/light message from the very
  // first render, which stopped the shrink-on-success defect (D13) but
  // introduced a new one — the reservation itself cost `.cv-sheet` a
  // PERMANENT slice of height instead of only losing it on success
  // (measured 592px -> 522px tall becoming a flat 522px always, at
  // 1280x720). The message is now an absolutely positioned overlay INSIDE
  // `.cv-sheet` (`.cv-result-pill`, gated on `attempt` exactly as it was
  // pre-T3) instead of a row in the flex column, so nothing is reserved at
  // all: before any attempt, no such element exists in the markup.
  it('never renders the erase-level result pill before an attempt exists, so nothing is reserved inside .cv-sheet (D13)', () => {
    const html = renderToString(
      <LevelPlay level={getLevel('glass1')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')
    expect(body).not.toContain('cv-result-pill')
    expect(body).toContain('class="cv-sheet"')
  })

  it('never renders the light-level result pill before an attempt exists either (D13)', () => {
    const html = renderToString(
      <LevelPlay level={getLevel('night1')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')
    expect(body).not.toContain('cv-result-pill')
    expect(body).toContain('class="cv-sheet"')
  })

  it('defines the result pill as an absolutely positioned, non-interactive overlay, and leaves the non-drawnPlace result row untouched', () => {
    expect(LAYOUT_CSS).toMatch(/\.cv-result-pill\s*\{\s*position:\s*absolute;/)
    expect(LAYOUT_CSS).toContain('pointer-events: none;')
    // The ordinary (non-drawnPlace) pillars/coach section is exactly the
    // pre-T3 rule — still a reserved flex row with its own min-height,
    // untouched by this revision.
    expect(LAYOUT_CSS).toContain(
      '.cv-result { flex: 0 0 auto; min-height: 96px; display: flex; flex-direction: column; justify-content: center; color: #1e293b; }',
    )
  })

  it('stamps the level id onto the root main element for outside-in QA hooks', () => {
    const glass1Html = renderToString(
      <LevelPlay level={getLevel('glass1')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(glass1Html).toContain('data-level-id="glass1"')

    const plainHtml = renderToString(
      <LevelPlay level={makeLevel()} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(plainHtml).toContain(`data-level-id="${makeLevel().id}"`)
  })

  it('never marks the button cv-next-ready with no attempt, and defines the ready styling in LAYOUT_CSS (D21)', () => {
    // `attempt` can only become non-null through a live pointer release
    // (`onRelease`), which this file's own header comment records as
    // unobservable through a second `renderToString` pass — so the DEFAULT,
    // pre-attempt render is what a unit test can prove: disabled, never
    // cv-next-ready. The APPROVED state (cv-next-ready actually visible,
    // solid green, pulsing) is real-browser-only proof, left to the
    // orchestrator's visual QA — the same split the sheet's own stable-box
    // claim above already accepts.
    const html = renderToString(
      <LevelPlay level={getLevel('glass1')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')
    expect(body).not.toContain('cv-next-ready')
    expect(body).toContain('cv-btn-off')

    expect(LAYOUT_CSS).toContain('.cv-next-ready {')
    expect(LAYOUT_CSS).toContain('transform: scale(1.15);')
    expect(LAYOUT_CSS).toContain('animation: cv-next-pulse 1.4s ease-in-out infinite;')
    expect(LAYOUT_CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.cv-next-ready \{ animation: none; \}\s*\}/)
  })
})

describe('LevelPlay docs/16 wooden zoo signs (finish-mvp-roadmap U14)', () => {
  // Only the three ids adventure-flow-and-map-guidance T1 KEEPS in an
  // `ADVENTURES` row: each still resolves its enclosure's backdrop
  // (`zoo/backdrops.ts`'s `backdropFor`), which is what makes `drawnPlace`
  // true and the surrounding chrome render as icons rather than plain text —
  // the precondition this test's strict zero-uncaptioned audit relies on.
  const signLevels = [
    ['glass1', SIGN_ART.fish.href, 'PECES'],
    ['sand1', SIGN_ART.turtles.href, 'TORTUGAS'],
    ['glass3', SIGN_ART.monkeys.href, 'MONOS'],
  ] as const

  it.each(signLevels)('%s renders its approved framed CaptionedArt inside the head row, beside the back button', (levelId, href, label) => {
    const html = renderToString(
      <LevelPlay level={getLevel(levelId)} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')

    expect(body).toContain('class="cv-captioned cv-level-zoo-sign"')
    expect(body).toContain(`href="${href}"`)
    expect(body).toContain(`<span class="cv-caption">${label}</span>`)
    // T3 revision (orchestrator QA regression): the sign's own dedicated row
    // (T5's first pass) cost .cv-sheet a permanent ~84px of height. It now
    // lives INSIDE .cv-head, right after the back button and still closed
    // out before .cv-sheet ever opens.
    expect(body.indexOf('cv-level-zoo-sign')).toBeGreaterThan(body.indexOf('cv-btn-back'))
    expect(body.indexOf('cv-level-zoo-sign')).toBeLessThan(body.indexOf('</header>'))
    expect(body.indexOf('</header>')).toBeLessThan(body.indexOf('class="cv-sheet"'))

    const audit = auditCaptions(html)
    expect(audit.captioned).toContain(label)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  // (Previously: `glass2`/`sand2`/`glass4` were asserted alongside the three
  // above, with the SAME strict zero-uncaptioned audit — each still
  // resolved a backdrop before T1. Adventure-flow-and-map-guidance T1 drops
  // all three from every `ADVENTURES` row (`zoo/adventures.ts`), so
  // `backdropFor` now resolves `undefined` for them: `drawnPlace` goes
  // false, and the chrome falls back to the same plain-text buttons and
  // visible hint paragraph every other non-"place" level already uses —
  // `f1-libre`, the hen trails — never held to a zero-uncaptioned claim
  // either. The sign itself still renders correctly — `PROLOGUE_ZOO_SIGNS`
  // keeps these ids as harmless extra keys (docs/16 §9's own script) — so
  // only that narrower claim is asserted for these three now.)
  it.each([
    ['glass2', SIGN_ART.fish.href, 'PECES'],
    ['sand2', SIGN_ART.turtles.href, 'TORTUGAS'],
    ['glass4', SIGN_ART.monkeys.href, 'MONOS'],
  ] as const)('%s still renders its approved framed CaptionedArt, even though T1 dropped it from every adventure', (levelId, href, label) => {
    const html = renderToString(
      <LevelPlay level={getLevel(levelId)} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')

    expect(body).toContain('class="cv-captioned cv-level-zoo-sign"')
    expect(body).toContain(`href="${href}"`)
    expect(body).toContain(`<span class="cv-caption">${label}</span>`)
    expect(body.indexOf('cv-level-zoo-sign')).toBeGreaterThan(body.indexOf('cv-btn-back'))
    expect(body.indexOf('cv-level-zoo-sign')).toBeLessThan(body.indexOf('class="cv-sheet"'))

    const audit = auditCaptions(html)
    expect(audit.captioned).toContain(label)
    expect(audit.imagelessContainers).toEqual([])
  })

  it('does not add a sign to the sendero, night, or ordinary level families', () => {
    for (const level of [getLevel('sand3'), getLevel('night2'), makeLevel()]) {
      const html = renderToString(
        <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      expect(html.replace(/<style>[\s\S]*?<\/style>/, ''), level.id).not.toContain('cv-level-zoo-sign')
    }
  })

  it('centres the sign inside the head row (never its own row) and clips only the duplicated DOM glyphs', () => {
    // T3 revision (orchestrator QA regression): T5's first pass gave the
    // sign its own row above the sheet, which read correctly in the DOM
    // shape but cost .cv-sheet a permanent ~84px of height on every
    // enclosure level (measured 1252x592 -> 1252x438 at 1280x720). It is now
    // absolutely positioned and centred INSIDE .cv-head — the row the back
    // button already occupies — so it costs that row nothing and never
    // reaches .cv-sheet at all.
    expect(LAYOUT_CSS).toContain('.cv-head { position: relative;')
    expect(LAYOUT_CSS).toMatch(/\.cv-level-zoo-sign\s*\{\s*position:\s*absolute;\s*left:\s*50%;\s*top:\s*50%;\s*transform:\s*translate\(-50%,\s*-50%\);/)
    expect(LAYOUT_CSS).toContain('.cv-play-portrait-guided .cv-level-zoo-sign { display: none; }')
    // The sr-only caption clipping is unchanged by the move.
    expect(LAYOUT_CSS).toContain('.cv-level-zoo-sign .cv-caption {')
    expect(LAYOUT_CSS).toContain('clip: rect(0, 0, 0, 0);')
  })

  it('keeps the sign markup in the document under portrait guidance, governed by its own cv-level-zoo-sign hide rule (Back stays visible)', () => {
    vi.stubGlobal('window', {
      location: { search: '' },
      matchMedia: () => ({
        matches: true,
        media: '',
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    })
    try {
      const html = renderToString(
        <LevelPlay level={getLevel('glass1')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      expect(html).toContain('cv-play-portrait-guided')
      expect(html).toContain('cv-level-zoo-sign')
      // Back stays in normal flow and visible under portrait guidance
      // (pre-existing contract, unaffected by the sign living in the same
      // header row now).
      expect(html).toContain('cv-btn-back')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('crops the sign to SIGN_CROP_HEIGHT via the outer svg viewBox/height, never the image element underneath', () => {
    const html = renderToString(
      <LevelPlay level={getLevel('glass1')} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '')
    const svgMatch = body.match(/<svg viewBox="([^"]+)" width="([^"]+)" height="([^"]+)" aria-hidden="true" focusable="false"><image href="\/art\/sign-fish\.png"[^>]*height="(\d+(?:\.\d+)?)"/)
    expect(svgMatch, body).toBeTruthy()
    const [, viewBox, , outerHeight, imageHeight] = svgMatch!
    // The outer svg (and its viewBox) is cropped to SIGN_CROP_HEIGHT...
    expect(Number(outerHeight)).toBe(SIGN_CROP_HEIGHT)
    expect(viewBox.trim().split(/\s+/)[3]).toBe(String(SIGN_CROP_HEIGHT))
    // ...while the image underneath still draws at the full, uncropped
    // SIGN_SIZE — it is the outer viewBox that stops covering its bottom
    // slice, never a smaller image.
    expect(Number(imageHeight)).toBe(SIGN_SIZE)
    expect(SIGN_CROP_HEIGHT).toBeLessThan(SIGN_SIZE)
  })
})

// The `?debug=estela:<k>` flag is the ONLY way to see this family's mechanic
// in a still frame — no screenshot can draw a finger path. A4's argument is
// that one number drives every render fact the flag produces, so a capture
// cannot tell two stories at once. `debugCarrier` was written and unit-tested
// for exactly that and then never called: the captures showed the trail
// running to the second flower while the bee sat at the start, which reads as
// "she did not follow" — the opposite of the sentence the family teaches
// (`docs/14` §10, "la abeja lo sigue inmediatamente"). A green test on an
// unreachable function is paso E's own lesson (`docs/13` §4 decision 7), so
// these assertions reach the SCREEN's prop, never the helper.
describe('LevelPlay ?debug=estela:<k> parks the bee on the trail it draws (A4)', () => {
  function renderWithSearch(levelId: string, search: string) {
    vi.stubGlobal('window', { location: { search } })
    try {
      renderToString(
        <LevelPlay
          level={getLevel(levelId)}
          record={EMPTY_RECORD}
          onAttempt={noop}
          onNext={noop}
          onBack={noop}
        />,
      )
      return traceCanvasProbe.current
    } finally {
      vi.unstubAllGlobals()
    }
  }

  it('puts the bee on the LAST point of the trail the same k draws, for every k', () => {
    const bee4 = getLevel('bee4')
    const stops = bee4.waypoints!.stops
    for (let k = 0; k <= stops.length + 1; k++) {
      const probe = renderWithSearch('bee4', `?debug=estela:${k}`)
      const trail = probe?.completedStrokes as readonly (readonly { x: number; y: number }[])[]
      const drawn = trail[trail.length - 1]
      expect(
        probe?.carrier,
        `estela:${k} drew a trail the bee is not standing on — the capture would read as "she did not follow"`,
      ).toEqual(drawn[drawn.length - 1])
    }
  })

  it('leaves the bee at the authored start when k is 0, so the untouched frame is honest', () => {
    const bee4 = getLevel('bee4')
    expect(renderWithSearch('bee4', '?debug=estela:0')?.carrier).toEqual(bee4.waypoints!.start)
  })

  it('moves the bee to a DIFFERENT point once k passes a flower — the assertion is not vacuous', () => {
    const bee4 = getLevel('bee4')
    const at0 = renderWithSearch('bee4', '?debug=estela:0')?.carrier
    const at2 = renderWithSearch('bee4', '?debug=estela:2')?.carrier
    expect(at2).not.toEqual(at0)
    expect(at2).toEqual({ x: bee4.waypoints!.stops[1].x, y: bee4.waypoints!.stops[1].y })
  })

  it('leaves the carrier on its own resting start with no flag, so shipped behaviour is untouched', () => {
    const bee4 = getLevel('bee4')
    expect(renderWithSearch('bee4', '')?.carrier).toEqual(bee4.waypoints!.start)
    expect(renderWithSearch('duck-trail2', '')?.carrier).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// verify-report R1 (`sdd/dolphin-zigzag-scrolling-screen`): the
// `scrolling-camera` spec scenario "Restarting resets the origin" had zero
// covering test at the layer where the reset actually happens. `LevelPlay`
// wired the reseed at three call sites (mount, `resetSurface`, `restartRun`)
// with a hand-copied ternary; `restartRun`'s own copy was the one the apply
// phase found missing and fixed with no regression test. `vitest` runs on
// `node` — no jsdom, no rAF — so a live restart cannot be driven through a
// real stroke here (this file's own header comment: state dispatches after
// a completed `renderToString` call are no-ops on the server). The seam that
// DOES work on `node`: extract the shared reseed into one pure, exported
// function (`seedCameraFor`) and prove (a) its own semantics directly, and
// (b) that exactly three source call sites still invoke it BY NAME — a
// count that drops from 3 to 2 the instant a future edit removes the
// `restartRun` call the way the original defect did.
// ─────────────────────────────────────────────────────────────────────────────
describe('seedCameraFor (scrolling-camera capability, design.md §2.4; verify-report R1)', () => {
  it('returns 0 for a level with no camera field, regardless of any debug seed', () => {
    const level = getLevel('duck-trail2')
    const target = buildLevelTarget(level)
    expect(target.viewWidth).toBe(target.viewBoxWidth)
    expect(seedCameraFor(level, target, '')).toBe(0)
    expect(seedCameraFor(level, target, '?debug=camara:400')).toBe(0)
  })

  it('seeds the origin at 0 with no debug flag, on a camera level', () => {
    const level = getLevel('dolphin3')
    const target = buildLevelTarget(level)
    expect(seedCameraFor(level, target, '')).toBe(0)
  })

  it('seeds the origin from ?debug=camara:<x>, the same clamp the live rAF floor uses', () => {
    const level = getLevel('dolphin3')
    const target = buildLevelTarget(level)
    expect(seedCameraFor(level, target, '?debug=camara:280')).toBe(280)
  })

  it('clamps a seed past the route extent to viewBoxWidth − viewWidth, never the raw seed', () => {
    const level = getLevel('dolphin4')
    const target = buildLevelTarget(level)
    expect(seedCameraFor(level, target, '?debug=camara:9999')).toBe(target.viewBoxWidth - target.viewWidth)
  })
})

describe('LevelPlay camera reseed call-site guard (verify-report R1: restartRun once skipped the reseed)', () => {
  it('calls seedCameraFor(level, target, debugSearch) at exactly the three reset sites — mount, resetSurface, restartRun', () => {
    // `?raw` source read, the SAME technique `corridorTrack.test.ts`'s own
    // "corridorTick's own body is untouched by this change" guard uses: a
    // future edit that removes ANY of the three call sites (the exact
    // `restartRun` regression this test exists to catch) fails this
    // assertion by count, with no live DOM or rAF required.
    const modules = import.meta.glob('./LevelPlay.tsx', {
      eager: true,
      query: '?raw',
      import: 'default',
    })
    const source = Object.values(modules)[0] as string
    const calls = source.match(/seedCameraFor\(level, target, debugSearch\)/g) ?? []
    expect(calls).toHaveLength(3)
    // And the raw hand-copied ternary this helper replaced must be GONE —
    // proving the extraction actually happened, not merely that a fourth
    // call was added alongside the old inline copies.
    expect(source).not.toContain('seedCameraOrigin(cameraDebugOrigin(debugSearch)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// `radial-spines` capability, design.md §6/§11.1 item 3: reset coverage by
// source-read count, `seedCameraFor`'s exact precedent above. `initialSpineState`
// must be called at exactly THREE sites — mount, `resetSurface`, `restartRun`
// — never through the bare `EMPTY_SPINES` constant directly.
// ─────────────────────────────────────────────────────────────────────────────
describe('LevelPlay spine reseed call-site guard (radial-spines capability, design.md §11.1 item 3)', () => {
  it('calls initialSpineState(level.spines, debugSearch) at exactly the three reset sites — mount, resetSurface, restartRun', () => {
    const modules = import.meta.glob('./LevelPlay.tsx', {
      eager: true,
      query: '?raw',
      import: 'default',
    })
    const source = (Object.values(modules)[0] as string).replace(/\r\n/g, '\n')
    const calls = source.match(/initialSpineState\(level\.spines, debugSearch\)/g) ?? []
    expect(calls).toHaveLength(3)
    // Breaking this by deleting the `restartRun` call (this test's own RED
    // confirmation, tasks.md 8.10) makes the count fall 3 → 2 — asserted
    // directly against the same source text, so the drop is provable
    // without actually deleting the call from the shipped file.
    const withoutRestartRun = source.replace(
      /spineRef\.current = initialSpineState\(level\.spines, debugSearch\)\n\s*setSpineState\(spineRef\.current\)\n\s*\/\/ The route itself is starting over/,
      '// The route itself is starting over',
    )
    const callsAfterBreak = withoutRestartRun.match(/initialSpineState\(level\.spines, debugSearch\)/g) ?? []
    expect(callsAfterBreak).toHaveLength(2)
    // And no reset site assigns the bare `EMPTY_SPINES` constant directly —
    // `radial-spines` spec: "Reset Reseeds Through seedSpines at Every
    // Reset Site, Never the Bare Empty Constant".
    expect(source).not.toMatch(/spineRef\.current = EMPTY_SPINES/)
    expect(source).not.toMatch(/setSpineState\(EMPTY_SPINES\)/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// `radial-spines` capability, design.md §7/§11.1 item 2: the debug flag must
// reach `TraceCanvas`'s `spines` prop, not only `debugSpines`'s own return
// value — `debugCarrier`'s own lesson above (A4), restated for this family.
// ─────────────────────────────────────────────────────────────────────────────
describe('LevelPlay ?debug=espinas:<k> reaches the SCREEN\'s spines prop (radial-spines capability)', () => {
  const spinesFixture = {
    pose: 'curled' as const,
    body: { centre: { x: 500, y: 300 }, height: 300 },
    arc: { from: 0, to: 360 },
    count: 8,
    rules: { baseRadius: 30, tolDeg: 30, straightness: 0.85, lenMin: 80, lenMax: 160 },
  }

  function renderWithSearch(level: LevelConfig, search: string) {
    vi.stubGlobal('window', { location: { search } })
    try {
      renderToString(
        <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
      return traceCanvasProbe.current
    } finally {
      vi.unstubAllGlobals()
    }
  }

  it('seeds exactly k filled marks in the rendered probe.spines.marks, for every k', () => {
    const level = makeLevel({ kind: 'free', paths: [], spines: spinesFixture })
    for (let k = 0; k <= spinesFixture.count; k++) {
      const probe = renderWithSearch(level, `?debug=espinas:${k}`)
      const spines = probe?.spines as { marks: readonly { filled: boolean }[] } | undefined
      const filledCount = spines?.marks.filter((m) => m.filled).length
      expect(filledCount, `espinas:${k}`).toBe(k)
    }
  })

  it('renders every mark unfilled with no debug flag — shipped behaviour untouched', () => {
    const level = makeLevel({ kind: 'free', paths: [], spines: spinesFixture })
    const probe = renderWithSearch(level, '')
    const spines = probe?.spines as { marks: readonly { filled: boolean }[] } | undefined
    expect(spines?.marks.every((m) => !m.filled)).toBe(true)
  })

  it('renders no spines prop at all for a level with no spines field', () => {
    const level = makeLevel()
    const probe = renderWithSearch(level, '?debug=espinas:2')
    expect(probe?.spines).toBeUndefined()
  })

  // The defect the first captures showed: the flag lit k marks as earned and
  // drew NO ink, so `hedgehog1-debug.png` was a hedgehog with five glowing
  // anchors and zero spines — a frame the real game can never produce, and
  // useless for the one question the capture exists to answer. There is no
  // "spine" shape in `SpineLayer`; the spine IS the child's settled ink, so
  // the flag must reach `completedStrokes` too. Amendment 8 again
  // (`docs/13` §4): one number, every render fact. These assertions reach
  // the SCREEN's prop, never `debugSpineStrokes`'s return value — a green
  // test on an unreachable helper is exactly how `debugCarrier` shipped.
  const strokesOf = (probe: Record<string, unknown> | null) =>
    (probe?.completedStrokes ?? []) as readonly (readonly { x: number; y: number }[])[]

  it('adds exactly k extra strokes to probe.completedStrokes on a hedgehog level', () => {
    const level = getLevel('hedgehog1')
    const without = strokesOf(renderWithSearch(level, '')).length
    expect(strokesOf(renderWithSearch(level, '?debug=espinas:3')).length - without).toBe(3)
    expect(strokesOf(renderWithSearch(level, '?debug=espinas:0')).length - without).toBe(0)
    expect(
      strokesOf(renderWithSearch(level, '?debug=espinas:999')).length - without,
      'k past the anchor count clamps to the anchor count, the same way the marks do',
    ).toBe(level.spines!.count)
  })

  it('starts every drawn spine on the very anchor the same k marks as filled', () => {
    const level = getLevel('hedgehog1')
    const anchors = spineAnchors(level.spines!)
    for (let k = 0; k <= level.spines!.count; k++) {
      const probe = renderWithSearch(level, `?debug=espinas:${k}`)
      const all = strokesOf(probe)
      const drawn = all.slice(all.length - k)
      const marks = (probe?.spines as { marks: readonly { filled: boolean }[] }).marks
      const filled = marks.flatMap((m, i) => (m.filled ? [i] : []))
      expect(filled, `espinas:${k} lit the wrong number of marks`).toHaveLength(k)
      expect(
        drawn,
        `espinas:${k} lit ${k} marks but reached TraceCanvas with ${all.length} strokes — the ink never arrived`,
      ).toHaveLength(k)
      filled.forEach((anchorIndex, n) => {
        const stroke = drawn[n]
        expect(stroke).toHaveLength(2)
        expect(
          stroke[0],
          `espinas:${k} drew a spine that does not start on the anchor it lit — the capture would tell two stories`,
        ).toEqual({ x: anchors[anchorIndex].x, y: anchors[anchorIndex].y })
        // And it must actually leave the body, or the "spine" is a dot.
        expect(Math.hypot(stroke[1].x - stroke[0].x, stroke[1].y - stroke[0].y)).toBeGreaterThan(0)
      })
    }
  })

  it('leaves completedStrokes untouched with no flag, so shipped behaviour is unchanged', () => {
    for (const id of ['hedgehog1', 'hedgehog4']) {
      expect(strokesOf(renderWithSearch(getLevel(id), '')), id).toHaveLength(0)
    }
  })

  it('adds no spine strokes to a level that has no spines field', () => {
    const level = makeLevel({ kind: 'free', paths: [] })
    expect(strokesOf(renderWithSearch(level, '?debug=espinas:3'))).toHaveLength(0)
  })
})

describe('LevelPlay portrait guidance (finish-mvp-roadmap U5)', () => {
  function renderWithPortrait(level: LevelConfig, portrait: boolean): string {
    vi.stubGlobal('window', {
      location: { search: '' },
      matchMedia: (media: string) => ({
        matches: portrait,
        media,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    })
    try {
      return renderToString(
        <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
      )
    } finally {
      vi.unstubAllGlobals()
    }
  }

  it('keeps rotate guidance out of the accessibility tree outside portrait', () => {
    const html = renderWithPortrait(makeLevel(), false)
    expect(html).not.toContain('class="cv-portrait-guidance"')
    expect(html).not.toContain('aria-describedby="cv-portrait-guidance"')
    expect(textOf(html)).not.toContain('Girá el dispositivo')
    expect(html).toContain('class="cv-sheet"')
  })

  it('declares rotate guidance as status in portrait while keeping Back and actions outside the guidance', () => {
    const html = renderWithPortrait(makeLevel(), true)
    expect(html).toContain('cv-play-portrait-guided')
    expect(html).toContain('class="cv-portrait-guidance"')
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('Girá el dispositivo')
    expect(html).toContain('class="cv-sheet"')
    expect(html).toContain('aria-describedby="cv-portrait-guidance"')
    expect(textOf(html)).toContain('‹ Volver')
    expect(textOf(html)).toContain('Borrar')
  })

  it('also explains portrait drawn-place levels whose sheet is hidden by the same responsive rule', () => {
    const html = renderWithPortrait(getLevel('duck-trail2'), true)
    expect(html).toContain('cv-play-portrait-guided')
    expect(html).toContain('class="cv-portrait-guidance"')
    expect(html).toContain('Girá el dispositivo')
    expect(html).toContain('aria-describedby="cv-portrait-guidance"')
    expect(html).toContain('class="cv-sheet"')
    expect(textOf(html)).not.toContain('Fase 1 ·')
  })
})
