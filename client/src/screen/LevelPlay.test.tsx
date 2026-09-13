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
import { EMPTY_RECORD, type LevelAttempt } from '../game/types'

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

import LevelPlay, { drawingBand, shouldFileClue, shouldTickClue } from './LevelPlay'
import { CARRIER_LENS_ART, CLUE_ART, LAMP_ART, OCTOPUS_ART, SECTOR_BACKGROUND_ART } from '../detective/assets'
import { auditCaptions } from '../detective/captionAudit'
import { INK_COLOR } from '../canvas/TraceCanvas'
import { PRINT } from '../detective/palette'
import { getLevel } from '../levels/catalog'

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
    // PISTAS is the one allowed word; the licensed `pistas-bar` container
    // that holds it must itself carry an image — checked, not granted
    // (`detective/captionAudit.ts`).
    const audit = auditCaptions(html)
    expect(audit.captioned).toContain('PISTAS')
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it("a detective-trail level's only visible word is PISTAS, and it carries its own image (captionAudit)", () => {
    const level = makeDetectiveLevel()
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(textOf(html)).toBe('PISTAS')
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

  it("f2-agua2 keeps its scattered ground unchanged — the medusa regression guard (shares the estanque sector but belongs to no backed adventure)", () => {
    renderToString(
      <LevelPlay
        level={getLevel('f2-agua2')}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(traceCanvasProbe.current?.backdrop, 'f2-agua2 must not get the lagoon backdrop').toBeUndefined()
    const ground = traceCanvasProbe.current?.ground as
      | { grass: { marks: unknown[] }; mud: { marks: unknown[] } }
      | undefined
    expect(ground, 'f2-agua2 must keep its grass/mud scatter').toBeDefined()
    expect(ground!.grass.marks.length).toBeGreaterThan(0)
    expect(ground!.mud.marks.length).toBeGreaterThan(0)
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

describe('LevelPlay PISTAS rail presence (design unit 5/6)', () => {
  it('renders no rail for an ordinary level (no `clue` config), matching f1-libre (task 10.5)', () => {
    const html = renderToString(
      <LevelPlay level={makeLevel()} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(html).not.toContain('<aside')
  })

  it('renders no rail for a world-only level, even though it is drawn in the detective world (level-engine spec "A Nivel 3 world-only level renders no rail")', () => {
    const html = renderToString(
      <LevelPlay
        level={makeWorldOnlyLevel()}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect(html).not.toContain('<aside')
  })

  it('a fresh detective trail starts with the rail drained and the lamp off', () => {
    const level = makeDetectiveLevel()
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(html).toContain('<aside')
    // Every clue the child can see is still in its DRAINED state, the lamp
    // included. With raster art this is an href check rather than a colour
    // check, but it pins the same thing: nothing on screen may claim a
    // reward the child has not earned yet.
    expect(html).toContain(CLUE_ART.droplet.art.drained.href)
    expect(html).not.toContain(CLUE_ART.droplet.art.earned.href)
    expect(html).toContain(LAMP_ART.off.href)
    expect(html).not.toContain(LAMP_ART.on.href)
    // The earned droplet colour (POND) must not reach the rail's socket
    // either — the colour token half of the contract is unchanged.
    expect(html).not.toContain('#3f6f8f')
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

  it('sends the lamp as endArt, OFF before the trail is finished', () => {
    render(makeDetectiveLevel())
    const art = traceCanvasProbe.current?.endArt as Art
    expect(art?.href).toBe(LAMP_ART.off.href)
    expect(art?.href).not.toBe(LAMP_ART.on.href)
  })

  it('keeps the sheet lamp separate from the rail lamp: neither is lit on a fresh trail', () => {
    // Two lamps, two sentences. The rail's means "the clue is filed"; this
    // one means "you got here". They coincide on a finished trail and are
    // still not the same statement — this asserts the starting state of both,
    // which is the only one a server render can observe.
    const html = renderToString(
      <LevelPlay
        level={makeDetectiveLevel()}
        record={EMPTY_RECORD}
        onAttempt={noop}
        onNext={noop}
        onBack={noop}
      />,
    )
    expect((traceCanvasProbe.current?.endArt as Art)?.href).toBe(LAMP_ART.off.href)
    expect(html).toContain(LAMP_ART.off.href) // the rail's, unlit too
    expect(html).not.toContain(LAMP_ART.on.href)
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
    // A creature, peer of the octopus's 96 — never the lamp's 84.
    expect(art?.size).toBe(96)
  })

  it('goalArt WINS over the case lamp when both are present: a level\'s own content beats a default it did not ask for', () => {
    const goalArt = { href: '/art/test-goal.png', w: 200, h: 240 }
    render(makeDetectiveLevel({ goalArt }))
    const art = traceCanvasProbe.current?.endArt as Art
    expect(art?.href).toBe(goalArt.href)
    expect(art?.href).not.toBe(LAMP_ART.off.href)
    expect(art?.href).not.toBe(LAMP_ART.on.href)
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
