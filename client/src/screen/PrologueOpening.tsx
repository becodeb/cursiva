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
import { useNarration } from '../voice/useNarration'
import SpeakButton from '../voice/SpeakButton'
import { BUBBLE_POP_CSS } from './BubblePop'
import { octopusBoxBySize, placeSpeechBubble, ZOO_SPEECH_BUBBLE_TAIL } from './bubblePlacement'

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
/* Sized by HEIGHT, unlike AdventureIntro's own octopus rule, and the
   difference is not cosmetic. That rule says width: 44% because
   ZOO_OCTOPUS_BACKPACK_ART is 442x448 -- near square, so width and height
   land in the same place. The caretaker is 235x320: at width: 44% it stands
   36% taller than the backpack octopus does and its head disappears behind
   the bubble. Height is what has to be pinned here, because what the layout
   actually needs is for the figure to stop below the bubble. */
/* T8 item 1 (odd/tasks/prewriting-stage-completion.md): idle life, using
   only the existing art. Breathing lives on THIS box (the one that already
   carries the static translateX(-50%) centring), so its own keyframes
   restate that translateX in every frame — animating transform replaces the
   whole property rather than composing with a separate static rule
   (BubblePop.ts's own header explains the same defect class). The
   occasional blink is a SEPARATE animation on the nested .cv-octopus-life
   image instead, which carries no static transform of its own to protect —
   two animations on ONE transform property would fight each other the
   same way, so each lives on its own element. NO BACKTICKS in this block —
   see this file's own top-of-file note: one inside a comment ends the
   template literal early. */
.cv-prologue-octopus { position: absolute; left: 50%; bottom: 2%; height: 44%; width: auto; transform: translateX(-50%); animation: cv-octopus-breathe 3.6s ease-in-out infinite; transform-origin: 50% 100%; }
@keyframes cv-octopus-breathe {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.02) translateY(-1%); }
}
.cv-octopus-life { display: block; height: 100%; width: auto; animation: cv-octopus-blink 6.4s ease-in-out infinite; transform-origin: 50% 50%; }
@keyframes cv-octopus-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.82); }
}
@media (prefers-reduced-motion: reduce) {
  .cv-prologue-octopus { animation: none; }
  .cv-octopus-life { animation: none; }
}
${BUBBLE_POP_CSS}
/* T16 (odd/tasks/prewriting-stage-completion.md), following a tablet
   play-test: left/top/width used to be a fixed CENTRED box
   (left: 50%; transform: translateX(-50%); width: 82%) -- that centres the
   IMAGE'S OWN BOUNDING BOX, not the tail inside it, so the tail (the art's
   bottom-left corner, bubblePlacement.ts's own ZOO_SPEECH_BUBBLE_TAIL)
   ended up pointing at empty space beside the octopus rather than at him.
   Left/top/width are now an INLINE style computed by placeSpeechBubble
   (below) from the octopus's own rendered box -- a static rule cannot know
   where the octopus's head sits. NO BACKTICKS in this block -- one inside
   a comment ends this template literal early (this file's own top note). */
.cv-prologue-bubble { position: absolute; }
.cv-prologue-bubble .cv-bubble-pop > img { display: block; width: 100%; height: auto; }
/* The mirrored orientation (placeSpeechBubble's own "mirrored"): flips
   the SHAPE only, never the caption -- "don't mirror the text" (this task's
   own brief), the same split ZooMap.tsx's own .cv-zoo-bubble--mirror-x
   rule makes. */
.cv-prologue-bubble--mirror-x .cv-bubble-pop > img { transform: scaleX(-1); }
.cv-prologue-bubble .cv-captioned { position: absolute; left: 10%; right: 10%; top: 16%; height: 58%; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4cqw; }
.cv-prologue-bubble .cv-captioned > svg { width: auto; height: 62%; flex: none; }
.cv-prologue-bubble .cv-caption { font-size: 5.6cqw; line-height: 1.16; font-weight: 700; color: #1e293b; text-align: left; }
.cv-prologue-skip { position: absolute; bottom: 1.5cqw; right: 1.5cqw; border: 0.5cqw solid #1a1a1a; border-radius: 999px; background: ${SHEET_PAPER}; padding: 1cqw 2.6cqw 1cqw 1.4cqw; cursor: pointer; z-index: 1; }
.cv-prologue-skip .cv-captioned { display: flex; flex-direction: row; align-items: center; gap: 1.6cqw; }
.cv-prologue-skip .cv-captioned > svg { width: auto; height: 5.4cqw; flex: none; }
.cv-prologue-skip .cv-caption { font-size: 3.4cqw; line-height: 1; font-weight: 700; color: #1e293b; white-space: nowrap; }
/* T7 (docs/18 D1): the "hear it again" button, pinned to the bubble's own
   top-right corner (the bubble spans left 9%-91%, top starts at 4% — see
   the derivation above .cv-prologue-bubble) rather than the frame's own
   corner, so it reads as PART of the bubble rather than as a fourth,
   unrelated control. Never in the bottom-right corner, which is
   .cv-prologue-skip's own spot. A SIBLING of .cv-prologue-stage, never a
   descendant — see this file's own header on why a nested button cannot be
   used here. NOTE: no backticks anywhere in this block, same reason the
   header above states — this is a template literal. */
.cv-prologue-speak { position: absolute; top: 2%; right: 4%; z-index: 1; }
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
  // Voice narration (docs/18 D1, "sin voz no se entera de la historia"; T7):
  // every plate speaks its own line the instant it appears. The FIRST plate
  // mounts before any tap has happened at all, so `canAutoSpeak()` (inside
  // `useNarration`) correctly stays silent for it — its own `SpeakButton`
  // below is the only way that first line is ever heard, and the tap that
  // advances past it is what makes every LATER plate's own autoplay allowed.
  useNarration(plate.line)

  // T16: the bubble's own placement, so its tail tip lands beside the
  // caretaker's head instead of the box's centre (this file's own header on
  // `.cv-prologue-bubble`, above). The caretaker (`ZOO_CARETAKER_ART`,
  // 235x320) is sized by HEIGHT — `octopusBoxBySize`'s own header on why —
  // and every plate stands the SAME caretaker, so this is computed once per
  // render rather than per plate.
  const octopusBox = octopusBoxBySize(ZOO_CARETAKER_ART, { sizeBy: 'height', size: 44, bottom: 2 })
  const bubblePlaced = placeSpeechBubble({ frame: { w: 100, h: 100 }, headBox: octopusBox, tail: ZOO_SPEECH_BUBBLE_TAIL })

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
          <span className="cv-prologue-octopus">
            <img src={ZOO_CARETAKER_ART.href} alt="" className="cv-octopus-life" />
          </span>
          <span
            className={`cv-prologue-bubble${bubblePlaced.mirrored ? ' cv-prologue-bubble--mirror-x' : ''}`}
            style={{ left: `${bubblePlaced.left}%`, top: `${bubblePlaced.top}%`, width: `${bubblePlaced.width}%` }}
          >
            {/* Keyed on the line itself (T8 item 2): a fresh key on every
                plate forces React to remount this span, replaying the
                pop-in — while `useNarration` above, unaffected by this
                child remounting, keeps deciding on its own when to speak.
                T16: `transform-origin` is set inline to the tail tip's own
                position within the box (`bubblePlaced.tailOriginX/Y`), so
                the pop-in grows OUT of the tail — out of the octopus —
                instead of the box's geometric centre. */}
            <span
              key={plate.line}
              className="cv-bubble-pop"
              style={{ transformOrigin: `${bubblePlaced.tailOriginX}% ${bubblePlaced.tailOriginY}%` }}
            >
              <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
              <CaptionedArt art={plate.art} label={plate.line} size={76} />
            </span>
          </span>
        </button>
        <SpeakButton line={plate.line} className="cv-prologue-speak" />
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
