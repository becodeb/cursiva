// The transformation screen (`docs/13_AVENTURAS_POR_ANIMAL.md` §5 item 6;
// design.md §6.2-§6.3, add-caretaker-prologue design.md D3; prewriting-
// stage-completion T18, `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md` §4).
// The mirror of `AdventureIntro`, not a generalization of it: two ~similar
// components sharing a stage read better than one with a mode flag, and
// `AdventureIntro` stays independent but for the small pieces both share
// (`bubbleFit.ts`, `pulpitoStance.ts`, `bubbleCssVars.ts`). Shown once per
// adventure that carries a `closingBeat` — as of adventure-flow-and-map-
// guidance T8 (docs/18 §4.7 item 1) that is every shipped row: the entrance's
// four enclosures and `night` (animal-less, no celebration) plus every
// animal-recovering adventure (duck/sheep/llama/snake/bee/dolphin/hedgehog,
// each with its own rescue beat AND `RescueCelebration`, imported from its
// own module now that the zoo map's finale reuses it too) — reached
// ONLY through the `'close'` `GameView` `resolveCloseAction` produces, never
// through a `GameAction`. The beat sequencing itself lives OUTSIDE this
// component (`GameScreen`'s own `beat?` field on the `'close'` view, D3):
// this component renders exactly ONE beat per mount and knows nothing about
// the list or its own position in it.
//
// T18 rebuild (`docs/19` §4.1/§4.2, "también los cierres del prólogo"): see
// `AdventureIntro.tsx`'s own header for the shared rationale — full-screen
// backdrop instead of a flat colour, the octopus in a bottom corner instead
// of centred, the bubble fitted instead of fixed-size.
//
// No `url(#…)` anywhere (`canvas/TraceCanvas.tsx:70-84`'s ban): the
// backdrop, octopus and the bubble are plain `<img src>`, the reward art is
// `CaptionedArt`'s own SVG `<image href>`. `CLOSING_CSS`'s comments carry NO
// BACKTICKS — this is a template literal, and one backtick inside a
// comment ends the string.
import type { CSSProperties } from 'react'
import CaptionedArt from '../detective/CaptionedArt'
import { ZOO_OCTOPUS_BACKPACK_ART, ZOO_SPEECH_BUBBLE_ART } from '../detective/assets'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { backdropFor } from '../zoo/backdrops'
import type { Adventure, ClosingBeat } from '../zoo/adventures'
import { useNarration } from '../voice/useNarration'
import SpeakButton from '../voice/SpeakButton'
import RescueCelebration, { RESCUE_CELEBRATION_CSS } from './RescueCelebration'
import { BUBBLE_POP_CSS } from './BubblePop'
import { ZOO_SPEECH_BUBBLE_TAIL } from './bubblePlacement'
import { CONTENT_LEFT_FRAC, CONTENT_TOP_FRAC, CONTENT_WIDTH_FRAC, GAP_FRAC, LINE_HEIGHT, placeAndFitBubble } from './bubbleFit'
import {
  OCTOPUS_CORNER_INSET,
  OCTOPUS_CORNER_SIZE_PCT,
  octopusBoxAtCorner,
  resolvePulpitoStance,
  stanceBubbleSide,
  STAGE_MARGIN_PCT,
  STAGE_MAX_PX,
  STAGE_MAX_VH_FRAC,
} from './pulpitoStance'
import { bubbleContentCssVars } from './bubbleCssVars'

/* Same stage geometry as `AdventureIntro.tsx`'s `INTRO_CSS`, restated under
   its own class prefix rather than shared, the same reason the two
   components are siblings rather than one with a mode flag: the shapes
   happen to be identical today, and each is free to diverge without the
   other noticing. See `INTRO_CSS`'s own header for the derivation of every
   number below. */
const CLOSING_CSS = `
html, body, #root { margin: 0; height: 100%; }
.cv-closing { position: relative; height: 100dvh; width: 100vw; overflow: hidden; background-color: ${SHEET_PAPER}; }
.cv-closing-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.cv-closing-frame { position: absolute; bottom: ${STAGE_MARGIN_PCT}%; width: min(100%, ${STAGE_MAX_PX}px, ${STAGE_MAX_VH_FRAC * 100}dvh); aspect-ratio: 1 / 1; container-type: inline-size; }
.cv-closing-stage { position: absolute; inset: 0; container-type: inline-size; border: none; background: none; padding: 0; cursor: pointer; }
.cv-closing-speak { position: absolute; top: ${STAGE_MARGIN_PCT}%; right: ${STAGE_MARGIN_PCT}%; z-index: 2; }
/* T8 item 1 (odd/tasks/prewriting-stage-completion.md): idle life, using
   only the existing art. T18: no translateX(-50%) any more — see
   AdventureIntro.tsx's own INTRO_CSS header. NO BACKTICKS in this block —
   one inside a comment ends this template literal early (this file's own
   header). */
.cv-closing-octopus { position: absolute; bottom: 2%; width: ${OCTOPUS_CORNER_SIZE_PCT}%; height: auto; animation: cv-octopus-breathe 3.6s ease-in-out infinite; transform-origin: 50% 100%; }
@keyframes cv-octopus-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02) translateY(-1%); }
}
.cv-octopus-life { display: block; width: 100%; height: auto; animation: cv-octopus-blink 6.4s ease-in-out infinite; transform-origin: 50% 50%; }
@keyframes cv-octopus-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.82); }
}
@media (prefers-reduced-motion: reduce) {
  .cv-closing-octopus { animation: none; }
  .cv-octopus-life { animation: none; }
}
${BUBBLE_POP_CSS}
/* T18 (odd/tasks/prewriting-stage-completion.md) -- see AdventureIntro.tsx's
   own INTRO_CSS header on .cv-intro-bubble for the floated-image content
   model and the cqw-of-the-bubble unit convention. NO BACKTICKS in this
   block -- one inside a comment ends this template literal early (this
   file's own top note). */
.cv-closing-bubble { position: absolute; container-type: inline-size; }
.cv-closing-bubble .cv-bubble-pop > img { display: block; width: 100%; height: auto; }
.cv-closing-bubble--mirror-x .cv-bubble-pop > img { transform: scaleX(-1); }
.cv-closing-bubble .cv-captioned { position: absolute; left: var(--cv-content-left); top: var(--cv-content-top); width: var(--cv-content-width); }
.cv-closing-bubble .cv-captioned > svg { float: left; width: var(--cv-image-w); height: var(--cv-image-h); margin-right: var(--cv-gap); margin-bottom: 1cqw; }
/* T18 follow-up (bubbleFit.ts's own header): the STACK layout -- see
   AdventureIntro.tsx's own INTRO_CSS for the full rationale. No
   overflow-wrap on .cv-caption below any more: this is an app for children
   learning to read, and a word must never break mid-letter. */
.cv-closing-bubble .cv-captioned--stack > svg { float: none; display: block; margin: 0 auto var(--cv-gap) auto; }
.cv-closing-bubble .cv-caption { font-size: var(--cv-caption-font); line-height: ${LINE_HEIGHT}; font-weight: 700; color: #1e293b; text-align: left; }
/* The rescue celebration (adventure-flow-and-map-guidance T8, docs/18
   section 4.7 item 1; extracted to RescueCelebration.tsx for promised-animals
   task B, which reuses it on the zoo map's own finale). Absolutely
   positioned and never affecting layout (inset: 0 on a container that itself
   contributes nothing to flow) — this is a decorative flourish, not new
   information the child must not miss. Each star pops in and settles within
   about a second (fill-mode: forwards holds its END state rather than
   resetting), then stays still: no loop, no ongoing motion competing with
   the caption the child is reading. Purely decorative, no wayfinding meaning
   (unlike the map's own spotlight ring/badge, ZooMap.tsx, which stay
   visible-but-still under reduced motion because they carry real
   information) — reduced motion removes it whole.
   NOTE: no backticks anywhere in this block, same reason ZOO_CSS gives. */
${RESCUE_CELEBRATION_CSS}
`

export interface AdventureClosingProps {
  adventure: Adventure
  /** The ONE beat to render this mount — `GameScreen`'s `'close'` view picks
   *  it out of `adventure.closingBeat` by index (design.md D3) and re-mounts
   *  this component with the next one on each tap. This component never
   *  reads `adventure.closingBeat` itself and never advances on its own. */
  beat: ClosingBeat
  onContinue: () => void
}

/** The reusable transformation beat (`docs/13` §5 item 6). Reachable ONLY
 *  for an adventure whose `closingBeat` is defined — `closingLevel`
 *  (`zoo/adventures.ts`) is the one function that resolves a `GameView` into
 *  this component. No `aria-label` on the button — the caption inside
 *  already names it. `adventure.animal !== undefined` is the one condition
 *  `RescueCelebration` renders under (T8) — every entrance enclosure and
 *  `night` recover no animal and never celebrate; every other shipped row
 *  does, on its own (and, since T8, only) closing beat. */
export default function AdventureClosing({ adventure, beat, onContinue }: AdventureClosingProps) {
  const backdrop = backdropFor(adventure.levelIds[adventure.levelIds.length - 1])
  // Voice narration (docs/18 D1; T7): each beat speaks its own line as soon
  // as it appears. `GameScreen`'s own 'close' view (this file's own header)
  // re-renders this SAME component with the NEXT beat rather than
  // remounting it, so this relies on `useNarration`'s "speaks again when
  // `line` changes" behaviour, not on a fresh mount.
  useNarration(beat.line)
  // T18: the stance (`docs/19` §4.1) — this beat's own, falling back to the
  // shared default.
  const stance = resolvePulpitoStance(beat.stance)
  const octopusArt = beat.figure ?? ZOO_OCTOPUS_BACKPACK_ART
  const octopusBox = octopusBoxAtCorner(octopusArt, {
    corner: stance.corner,
    sizeBy: 'width',
    size: OCTOPUS_CORNER_SIZE_PCT,
    bottom: 2,
    inset: OCTOPUS_CORNER_INSET,
  })
  const { placement, content } = placeAndFitBubble({
    frame: { w: 100, h: 100 },
    headBox: octopusBox,
    tail: ZOO_SPEECH_BUBBLE_TAIL,
    side: stanceBubbleSide(stance.corner),
    text: beat.line,
    art: beat.art,
  })
  return (
    <main className="cv-closing" style={{ backgroundColor: backdrop?.quiet ?? SHEET_PAPER }}>
      <style>{CLOSING_CSS}</style>
      {backdrop && <img className="cv-closing-backdrop" src={backdrop.art.href} alt="" />}
      <div className="cv-closing-frame">
        <button type="button" className="cv-closing-stage" onClick={onContinue}>
          <span className="cv-closing-octopus" style={{ [stance.corner]: `${octopusBox.x}%` } as CSSProperties}>
            <img src={octopusArt.href} alt="" className="cv-octopus-life" />
          </span>
          <span
            className={`cv-closing-bubble${placement.mirrored ? ' cv-closing-bubble--mirror-x' : ''}`}
            style={{
              left: `${placement.left}%`,
              top: `${placement.top}%`,
              width: `${placement.width}%`,
              ...bubbleContentCssVars(placement, content, {
                contentLeftFrac: CONTENT_LEFT_FRAC,
                contentTopFrac: CONTENT_TOP_FRAC,
                contentWidthFrac: CONTENT_WIDTH_FRAC,
                gapFrac: GAP_FRAC,
              }),
            }}
          >
            {/* Keyed on the line (T8 item 2): a beat advance re-renders THIS
                SAME component (this file's own header, above) rather than
                remounting it, so the key is what forces the pop-in to replay
                on each beat — `useNarration`, unaffected by this child
                remounting, keeps deciding on its own when to speak. T16:
                `transform-origin` inline at the tail tip, same reasoning as
                `PrologueOpening.tsx`'s own span. */}
            <span
              key={beat.line}
              className="cv-bubble-pop"
              style={{ transformOrigin: `${placement.tailOriginX}% ${placement.tailOriginY}%` }}
            >
              <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
              <CaptionedArt
                art={beat.art}
                label={beat.line}
                size={76}
                className={content.layout === 'stack' ? 'cv-captioned--stack' : undefined}
              />
            </span>
          </span>
          {adventure.animal !== undefined && <RescueCelebration />}
        </button>
      </div>
      <SpeakButton line={beat.line} className="cv-closing-speak" />
    </main>
  )
}
