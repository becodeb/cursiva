// The narrative entry (docs/13_AVENTURAS_POR_ANIMAL.md §5 item 1;
// duck-undulations-and-sector-backdrop design.md §4; prewriting-stage-
// completion T18, `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md` §4). One
// reusable screen, built once and reused by every later adventure (rows
// C-H): the octopus with its backpack, the speech bubble, the adventure's
// animal, and one short phrase — a tap leads into the adventure's first
// level.
//
// T18 rebuild (`docs/19` §4.1/§4.2): this screen used to sit on a FLAT
// colour (`backdrop.quiet`) with the octopus centred. It now draws the
// adventure's own backdrop art FULL SCREEN behind him — the same picture
// the level itself opens on, still visible while he talks — and moves him
// into a bottom CORNER (`screen/pulpitoStance.ts`), the side chosen per
// line so the bubble opens toward the screen's own centre rather than off
// its edge. The bounded square "stage" that carries him and his bubble
// (`STAGE_MAX_PX`/`STAGE_MAX_VH_FRAC`, unchanged from the pre-T18 centred
// layout's own numbers) is now POSITIONED at that corner instead of
// centred — everything inside it keeps working in the exact same
// percent-of-stage coordinate space it always did.
//
// No `url(#…)` anywhere (`canvas/TraceCanvas.tsx:70-84`'s ban): the
// backdrop, the octopus and the bubble are plain `<img src>`, the animal is
// `CaptionedArt`'s own SVG `<image href>`. `INTRO_CSS`'s comments carry NO
// BACKTICKS — this is a template literal, and one backtick inside a
// comment ends the string.
import type { CSSProperties } from 'react'
import CaptionedArt from '../detective/CaptionedArt'
import { ZOO_OCTOPUS_BACKPACK_ART, ZOO_SPEECH_BUBBLE_ART } from '../detective/assets'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { backdropFor } from '../zoo/backdrops'
import { adventureIcon, type Adventure } from '../zoo/adventures'
import { useNarration } from '../voice/useNarration'
import SpeakButton from '../voice/SpeakButton'
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

/* The stage is a percentage box with container-type: inline-size, the same
   fix the zoo map's own bubble uses (ZooMap.tsx's ZOO_CSS): everything
   inside sizes in cqw (percent of the STAGE's own width), so nothing here
   needs a px length that would be right at exactly one viewport. T18 moved
   this box from CENTRED to a bottom CORNER (`docs/19` §4.1 rule 2) — its
   own bounded size (`min(100%, 620px, 84dvh)`) is UNCHANGED from the
   pre-T18 centred layout (`STAGE_MAX_PX`/`STAGE_MAX_VH_FRAC`,
   `pulpitoStance.ts`), because shrinking it further would need an even
   smaller minimum font size to keep every real line fitting
   (`bubbleFit.test.ts`'s own registry sweep is proven against this exact
   size) — only the octopus's own SIZE within it shrank a little (`44%` to
   `OCTOPUS_CORNER_SIZE_PCT`), which is what actually bought the extra
   vertical room a corner bubble needs (see that constant's own comment).

   T7 (docs/18 D1) split what used to be ONE element (`.cv-intro-stage`
   carried both the sizing AND the tap) into `.cv-intro-frame` (sizing only)
   and `.cv-intro-stage` (an absolutely positioned, inset:0 overlay that
   carries the tap) — `PrologueOpening.tsx`'s own frame/stage split, restated
   here for the same reason: `SpeakButton` must be a SIBLING of the stage
   button, never a descendant (a button nested inside a button is invalid
   HTML and would swallow the tap meant for the stage underneath it). T18
   moves `SpeakButton` OUT of the frame entirely (`docs/19` §4.2: "arriba
   están los botones" — the buttons live at the top of the SCREEN, not
   pinned to a corner stage), so it is now a sibling of `.cv-intro-frame`
   inside `.cv-intro` itself, positioned against the full viewport. */
const INTRO_CSS = `
.cv-intro { position: relative; height: 100dvh; width: 100vw; overflow: hidden; background-color: ${SHEET_PAPER}; }
.cv-intro-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.cv-intro-frame { position: absolute; bottom: ${STAGE_MARGIN_PCT}%; width: min(100%, ${STAGE_MAX_PX}px, ${STAGE_MAX_VH_FRAC * 100}dvh); aspect-ratio: 1 / 1; container-type: inline-size; }
.cv-intro-stage { position: absolute; inset: 0; container-type: inline-size; border: none; background: none; padding: 0; cursor: pointer; }
/* T8 item 1 (odd/tasks/prewriting-stage-completion.md): idle life, using
   only the existing art. T18: no more translateX(-50%) — a corner octopus
   is positioned by a plain inline left/right (octopusBoxAtCorner's own x
   coordinate), so the breathing keyframes no longer need to restate a
   centring transform inside them (the reason PrologueOpening.tsx's own
   header gives for the CENTRED octopus does not apply here any more). NO
   BACKTICKS in this block — one inside a comment ends this template
   literal early (this file's own header). */
.cv-intro-octopus { position: absolute; bottom: 2%; width: ${OCTOPUS_CORNER_SIZE_PCT}%; height: auto; animation: cv-octopus-breathe 3.6s ease-in-out infinite; transform-origin: 50% 100%; }
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
  .cv-intro-octopus { animation: none; }
  .cv-octopus-life { animation: none; }
}
${BUBBLE_POP_CSS}
/* T18 (odd/tasks/prewriting-stage-completion.md): the bubble's own box is
   now a container-type: inline-size context of its own, so every child
   size below is expressed in cqw OF THE BUBBLE (not of the stage) —
   bubbleCssVars.ts's own header explains why that is exactly the unit
   bubbleFit.ts's pure fit math already computes in. The image now FLOATS
   at the top of the content box instead of sitting in a fixed row
   (bubbleFit.ts's own header on why): the caption text (a plain inline
   span) wraps around it for free, exactly like any other floated image in
   HTML. NO BACKTICKS in this block -- one inside a comment ends this
   template literal early (this file's own top note). */
.cv-intro-bubble { position: absolute; container-type: inline-size; }
.cv-intro-bubble .cv-bubble-pop > img { display: block; width: 100%; height: auto; }
.cv-intro-bubble--mirror-x .cv-bubble-pop > img { transform: scaleX(-1); }
.cv-intro-bubble .cv-captioned { position: absolute; left: var(--cv-content-left); top: var(--cv-content-top); width: var(--cv-content-width); }
.cv-intro-bubble .cv-captioned > svg { float: left; width: var(--cv-image-w); height: var(--cv-image-h); margin-right: var(--cv-gap); margin-bottom: 1cqw; }
.cv-intro-bubble .cv-caption { font-size: var(--cv-caption-font); line-height: ${LINE_HEIGHT}; font-weight: 700; color: #1e293b; text-align: left; overflow-wrap: break-word; }
/* T7: the "hear it again" button. T18: no longer pinned to the corner
   stage (docs/19 §4.2's "arriba están los botones") — a sibling of
   .cv-intro-frame inside .cv-intro, pinned to the SCREEN's own top
   corner instead. */
.cv-intro-speak { position: absolute; top: ${STAGE_MARGIN_PCT}%; right: ${STAGE_MARGIN_PCT}%; z-index: 2; }
`

export interface AdventureIntroProps {
  adventure: Adventure
  onStart: () => void
}

/** The reusable narrative entry (`docs/13` §5 item 1). No `aria-label` on
 * the button — the caption inside already names it, and an `aria-label`
 * would override the only sentence on the screen. */
export default function AdventureIntro({ adventure, onStart }: AdventureIntroProps) {
  const backdrop = backdropFor(adventure.levelIds[0])
  // Voice narration (docs/18 D1; T7): this screen is always reached by a
  // tap (leaving the previous screen), so `canAutoSpeak()` is already true
  // by the time this fires — unlike the prologue's very first plate, this
  // line autoplays for real, and `SpeakButton` below is only "hear it
  // again", never the sole way to hear it in the first place.
  useNarration(adventure.intro)
  // T18: the stance (`docs/19` §4.1) — which bottom corner he stands in,
  // and therefore which side the bubble opens toward.
  const stance = resolvePulpitoStance(adventure.introStance)
  const octopusBox = octopusBoxAtCorner(ZOO_OCTOPUS_BACKPACK_ART, {
    corner: stance.corner,
    sizeBy: 'width',
    size: OCTOPUS_CORNER_SIZE_PCT,
    bottom: 2,
    inset: OCTOPUS_CORNER_INSET,
  })
  const icon = adventureIcon(adventure)
  const { placement, content } = placeAndFitBubble({
    frame: { w: 100, h: 100 },
    headBox: octopusBox,
    tail: ZOO_SPEECH_BUBBLE_TAIL,
    side: stanceBubbleSide(stance.corner),
    text: adventure.intro,
    art: icon,
  })
  return (
    <main className="cv-intro" style={{ backgroundColor: backdrop?.quiet ?? SHEET_PAPER }}>
      <style>{INTRO_CSS}</style>
      {backdrop && <img className="cv-intro-backdrop" src={backdrop.art.href} alt="" />}
      <div className="cv-intro-frame">
        <button type="button" className="cv-intro-stage" onClick={onStart}>
          <span className="cv-intro-octopus" style={{ [stance.corner]: `${octopusBox.x}%` } as CSSProperties}>
            <img src={ZOO_OCTOPUS_BACKPACK_ART.href} alt="" className="cv-octopus-life" />
          </span>
          <span
            className={`cv-intro-bubble${placement.mirrored ? ' cv-intro-bubble--mirror-x' : ''}`}
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
            {/* Keyed on the line (T8 item 2), same reasoning
                `PrologueOpening.tsx` gives — this screen only ever shows
                one line per mount, so the pop-in plays once, on arrival.
                T16: `transform-origin` inline at the tail tip, same
                reasoning as `PrologueOpening.tsx`'s own span. */}
            <span
              key={adventure.intro}
              className="cv-bubble-pop"
              style={{ transformOrigin: `${placement.tailOriginX}% ${placement.tailOriginY}%` }}
            >
              <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
              <CaptionedArt art={icon} label={adventure.intro} size={76} />
            </span>
          </span>
        </button>
      </div>
      <SpeakButton line={adventure.intro} className="cv-intro-speak" />
    </main>
  )
}
