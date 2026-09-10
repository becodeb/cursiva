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

import LevelPlay, { shouldFileClue, shouldTickClue } from './LevelPlay'
import { GLASS_ART } from '../detective/assets'
import { INK_COLOR } from '../canvas/TraceCanvas'

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
    // PISTAS itself is the one allowed word, and it is present.
    expect(html).toContain('PISTAS')
  })

  it("a detective-trail level's only text node is the literal word PISTAS", () => {
    const level = makeDetectiveLevel()
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(textOf(html)).toBe('PISTAS')
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
    const art = traceCanvasProbe.current?.carrierArt as { d: string; color: string } | undefined
    expect(art, 'no carrierArt reached the canvas: the glass would not render').toBeTruthy()
    expect(art?.d).toBe(GLASS_ART.d)
    // Ink, not a colour of its own: the glass belongs to the world, and colour
    // in this mode only ever means a clue was earned.
    expect(art?.color).toBe(INK_COLOR)
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

  it('a fresh detective trail starts with the rail drained and the lamp off', () => {
    const level = makeDetectiveLevel()
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={noop} onNext={noop} onBack={noop} />,
    )
    expect(html).toContain('<aside')
    // The lamp's "on" colour and the trail's earned droplet colour (POND)
    // must not appear anywhere before the trail has been completed.
    expect(html).not.toContain('#f2d377')
    expect(html).not.toContain('#3f6f8f')
  })
})

describe('shouldFileClue (spec: detective-mode "Trail Completion Lamp and Rail Filing")', () => {
  it('files when the level is a detective trail and the attempt is approved (scenario "Finishing a trail lights the lamp and files the clue")', () => {
    expect(shouldFileClue(true, true)).toBe(true)
  })

  it('refuses to file when the attempt is NOT approved, whatever the marks did (scenario "Filing is refused mid-trace")', () => {
    // The signature deliberately carries no `lit`/marks argument at all —
    // marks earned is not part of this decision, which is the point.
    expect(shouldFileClue(true, false)).toBe(false)
  })

  it('never files on a level with no clue trail, even if somehow approved is true', () => {
    expect(shouldFileClue(false, true)).toBe(false)
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
