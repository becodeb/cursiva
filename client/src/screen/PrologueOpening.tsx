// The prologue's opening screen (`docs/16_PROLOGO_EL_CUIDADOR.md` §4;
// add-caretaker-prologue design.md D1, D2, D8). Three chained fixed plates
// shown before the zoo map on a child's first visit — `AdventureIntro`'s own
// stage pattern (backdrop, octopus, speech bubble, one short line, tap to
// advance), restated under its own `.cv-prologue` prefix rather than shared
// (`main-screen` spec "The Opening Reuses AdventureIntro's Stage Pattern
// Without Modifying It" — `AdventureIntro.tsx` stays byte-identical). The
// component's ENTIRE external contract is `{ from?, onDone }` (design.md D1):
// no caller may reach into its internal plate index, and swapping the plates
// for a `<video>` later (`prologue-opening` spec "The Video Swap Point")
// touches no call site.
//
// No `url(#…)` anywhere (`canvas/TraceCanvas.tsx:70-84`'s ban): the octopus
// and the bubble are plain `<img src>`, the plate's own art and the skip
// control are both `CaptionedArt`'s SVG `<image href>`. `PROLOGUE_CSS`'s
// comments carry NO BACKTICKS — this is a template literal, and one backtick
// inside a comment ends the string.
import { useState } from 'react'
import CaptionedArt from '../detective/CaptionedArt'
import { ZOO_CARETAKER_ART, ZOO_MAP_ART, ZOO_SPEECH_BUBBLE_ART } from '../detective/assets'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { backdropFor } from '../zoo/backdrops'
import { PROLOGUE_PLATES, advancePlate } from '../zoo/prologue'

/* Same stage geometry as `AdventureIntro.tsx`'s `INTRO_CSS` — see that
   file's header for the derivation of every number below (the 84dvh
   landscape clamp, the container-type: inline-size cqw sizing). The skip
   control is new here: a pill pinned to the frame's own BOTTOM-right
   corner, a SIBLING of the stage button (never a descendant — a nested
   button is invalid HTML and would swallow the tap meant for the stage
   underneath it, design.md D1/D8).

   Two things about it are load-bearing and were both found by looking at a
   capture, not by reading the markup. It sits at the BOTTOM because the
   speech bubble occupies the top 4%-62% of the frame at 82% width, so a
   top-right pill overlaps the one thing the child is meant to read; the
   octopus is only 44% wide and centred, so the bottom corners are the
   frame's free space. And it carries its OWN size rules: `CaptionedArt`
   renders bare, so without them the skip lands as a 28px thumbnail beside
   unstyled 16px text and reads as a rendering bug rather than a control.
   The frame therefore gets its own `container-type` so these cqw units
   track the stage instead of the viewport. */
const PROLOGUE_CSS = `
.cv-prologue { height: 100dvh; display: flex; align-items: center; justify-content: center; background-color: ${SHEET_PAPER}; box-sizing: border-box; padding: 4%; }
.cv-prologue-frame { position: relative; width: min(100%, 620px, 84dvh); aspect-ratio: 1 / 1; container-type: inline-size; }
.cv-prologue-stage { position: absolute; inset: 0; container-type: inline-size; border: none; background: none; padding: 0; cursor: pointer; }
.cv-prologue-octopus { position: absolute; left: 50%; bottom: 2%; width: 44%; height: auto; transform: translateX(-50%); }
.cv-prologue-bubble { position: absolute; left: 50%; top: 4%; width: 82%; transform: translateX(-50%); }
.cv-prologue-bubble > img { display: block; width: 100%; height: auto; }
.cv-prologue-bubble .cv-captioned { position: absolute; left: 10%; right: 10%; top: 16%; height: 58%; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4cqw; }
.cv-prologue-bubble .cv-captioned > svg { width: auto; height: 62%; flex: none; }
.cv-prologue-bubble .cv-caption { font-size: 5.6cqw; line-height: 1.16; font-weight: 700; color: #1e293b; text-align: left; }
.cv-prologue-skip { position: absolute; bottom: 1.5cqw; right: 1.5cqw; border: 0.5cqw solid #1a1a1a; border-radius: 999px; background: ${SHEET_PAPER}; padding: 1cqw 2.6cqw 1cqw 1.4cqw; cursor: pointer; z-index: 1; }
.cv-prologue-skip .cv-captioned { display: flex; flex-direction: row; align-items: center; gap: 1.6cqw; }
.cv-prologue-skip .cv-captioned > svg { width: auto; height: 5.4cqw; flex: none; }
.cv-prologue-skip .cv-caption { font-size: 3.4cqw; line-height: 1; font-weight: 700; color: #1e293b; white-space: nowrap; }
`

export interface PrologueOpeningProps {
  /** Where to START the opening — a plate index today, a seek offset once
   *  this is a `<video>` (design.md D1). Omitted = from the beginning, the
   *  only production call. */
  from?: number
  /** The opening is OVER. Called exactly once — by the last plate's tap, or
   *  by skip — and the caller cannot tell which happened; that is the
   *  point. */
  onDone: () => void
}

/** Clamps a caller-supplied start index into a representable plate — never
 *  crash on a stray `from` outside `[0, PROLOGUE_PLATES.length - 1]`, the
 *  same never-crash convention every other screen in this app follows for a
 *  stale/out-of-range id. */
function clampPlate(from: number | undefined): number {
  const index = from ?? 0
  return Math.min(Math.max(index, 0), PROLOGUE_PLATES.length - 1)
}

/** The caretaker's opening (`docs/16` §4). Tapping the stage advances to the
 *  next plate; tapping the last one, or the skip control on ANY plate, ends
 *  the opening the same way — `onDone` — so the caller cannot distinguish
 *  "watched" from "skipped" (design.md D1). */
export default function PrologueOpening({ from, onDone }: PrologueOpeningProps) {
  const [index, setIndex] = useState(() => clampPlate(from))
  const plate = PROLOGUE_PLATES[index]
  // `'glass1'` is a LEVEL id, unaffected by the `peces` adventure rename
  // (task 2.5) — `backdropFor` resolves through the level, not the id this
  // change renamed.
  const backdrop = backdropFor('glass1')

  const handleTap = (): void => {
    const next = advancePlate(index)
    if (next === null) onDone()
    else setIndex(next)
  }

  return (
    <main className="cv-prologue" style={{ background: backdrop?.quiet ?? SHEET_PAPER }}>
      <style>{PROLOGUE_CSS}</style>
      <div className="cv-prologue-frame">
        <button type="button" className="cv-prologue-stage" onClick={handleTap}>
          <img src={ZOO_CARETAKER_ART.href} alt="" className="cv-prologue-octopus" />
          <span className="cv-prologue-bubble">
            <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
            <CaptionedArt art={plate.art} label={plate.line} size={76} />
          </span>
        </button>
        <button type="button" className="cv-prologue-skip" onClick={onDone}>
          <CaptionedArt art={ZOO_MAP_ART} label="Ir al mapa" size={28} />
        </button>
      </div>
    </main>
  )
}

/**
 * `?nivel=apertura[:n]`, dev-gated the same way `?nivel=intro-<id>`/
 * `cierre-<id>[:<n>]` are (`GameScreen.tsx`'s `initialView`) — the only way
 * to reach the opening on demand for tests and screenshot captures without
 * clearing storage (`prologue-opening` spec "The Opening Is Reachable On
 * Demand Through a Dev-Gated Route"). Mirrors `GameScreen.tsx`'s own
 * `cierre-<id>:<n>` convention: the `:` separator, never `-`, and a
 * malformed or out-of-range suffix falls through to `null` rather than
 * crashing.
 */
export function prologueRoute(search: string, dev: boolean): { at: 'prologue'; from: number } | null {
  if (!dev) return null
  try {
    const id = new URLSearchParams(search).get('nivel')
    if (id === 'apertura') return { at: 'prologue', from: 0 }
    if (id?.startsWith('apertura:')) {
      const from = Number(id.slice('apertura:'.length))
      if (Number.isInteger(from) && from >= 0) return { at: 'prologue', from }
    }
  } catch {
    // malformed query string: no route, never a crash
  }
  return null
}
