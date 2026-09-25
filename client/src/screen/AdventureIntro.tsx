// The narrative entry (docs/13_AVENTURAS_POR_ANIMAL.md §5 item 1;
// duck-undulations-and-sector-backdrop design.md §4). One reusable screen,
// built once and reused by every later adventure (rows C-H): the octopus
// with its backpack, the speech bubble, the adventure's animal, and one
// short phrase — a tap leads into the adventure's first level.
//
// No `url(#…)` anywhere (`canvas/TraceCanvas.tsx:70-84`'s ban): the octopus
// and the bubble are plain `<img src>`, the animal is `CaptionedArt`'s own
// SVG `<image href>`. `INTRO_CSS`'s comments carry NO BACKTICKS — this is a
// template literal, and one backtick inside a comment ends the string.
import CaptionedArt from '../detective/CaptionedArt'
import { ZOO_OCTOPUS_BACKPACK_ART, ZOO_SPEECH_BUBBLE_ART } from '../detective/assets'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { backdropFor } from '../zoo/backdrops'
import { adventureIcon, type Adventure } from '../zoo/adventures'
import { useNarration } from '../voice/useNarration'
import SpeakButton from '../voice/SpeakButton'
import { BUBBLE_POP_CSS } from './BubblePop'

/* The frame is a percentage box with container-type: inline-size, the same
   fix the zoo map's own bubble uses (ZooMap.tsx's ZOO_CSS): everything
   inside sizes in cqw (percent of the FRAME's own width), so nothing here
   needs a px length that would be right at exactly one viewport. The
   octopus stands at the bottom, the bubble floats above his head, the same
   composition docs/13 section 5 item 1 asks for. flex: none on the
   captioned SVG keeps the animal from being squeezed to a sliver by the
   phrase beside it, the same override the zoo map's own bubble needed.

   The frame side is clamped by the VIEWPORT HEIGHT as well as its width.
   A square sized on width alone overflows a landscape viewport: at
   1000x600 the padding leaves 520 of height, the frame took its full 620,
   and the octopus — anchored to the frame's bottom — was pushed past the
   edge with its lower tentacles cut off. Landscape is this app's primary
   orientation (LevelPlay ships a rotate-your-device hint), so the
   narrow side has to be the one that decides. 84dvh leaves room for the
   4 percent padding on both sides; portrait tablets stay width-bound at
   620 and are unchanged. Verified by capture at 1000x600 and 768x1024.

   T7 (docs/18 D1) split what used to be ONE element (`.cv-intro-stage`
   carried both the sizing AND the tap) into `.cv-intro-frame` (sizing only)
   and `.cv-intro-stage` (an absolutely positioned, inset:0 overlay that
   carries the tap) — `PrologueOpening.tsx`'s own frame/stage split, restated
   here for the same reason: `SpeakButton` must be a SIBLING of the stage
   button, never a descendant (a button nested inside a button is invalid
   HTML and would swallow the tap meant for the stage underneath it), and
   the only place a new sibling can sit AT THE BUBBLE'S OWN POSITION is one
   level up, in a shared positioned ancestor. This is a pure refactor of the
   BOX that owns position:relative/the size — every child's own percentages
   resolve against the exact same box they always did, so the octopus and
   the bubble land pixel-identical to before. */
const INTRO_CSS = `
.cv-intro { height: 100dvh; display: flex; align-items: center; justify-content: center; background-color: ${SHEET_PAPER}; box-sizing: border-box; padding: 4%; }
.cv-intro-frame { position: relative; width: min(100%, 620px, 84dvh); aspect-ratio: 1 / 1; container-type: inline-size; }
.cv-intro-stage { position: absolute; inset: 0; container-type: inline-size; border: none; background: none; padding: 0; cursor: pointer; }
/* T8 item 1 (odd/tasks/prewriting-stage-completion.md): idle life, using
   only the existing art — see PrologueOpening.tsx's own header for why
   breathing restates the static translateX(-50%) in its own keyframes while
   the occasional blink lives on the nested, transform-free .cv-octopus-life
   image instead. NO BACKTICKS in this block — one inside a comment ends
   this template literal early (this file's own header). */
.cv-intro-octopus { position: absolute; left: 50%; bottom: 2%; width: 44%; height: auto; transform: translateX(-50%); animation: cv-octopus-breathe 3.6s ease-in-out infinite; transform-origin: 50% 100%; }
@keyframes cv-octopus-breathe {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.02) translateY(-1%); }
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
.cv-intro-bubble { position: absolute; left: 50%; top: 4%; width: 82%; transform: translateX(-50%); }
.cv-intro-bubble .cv-bubble-pop > img { display: block; width: 100%; height: auto; }
.cv-intro-bubble .cv-captioned { position: absolute; left: 10%; right: 10%; top: 16%; height: 58%; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4cqw; }
.cv-intro-bubble .cv-captioned > svg { width: auto; height: 62%; flex: none; }
.cv-intro-bubble .cv-caption { font-size: 5.6cqw; line-height: 1.16; font-weight: 700; color: #1e293b; text-align: left; }
/* T7: the "hear it again" button, pinned to the bubble's own top-right
   corner (mirrors PrologueOpening.tsx's own .cv-prologue-speak rule and
   rationale) — a SIBLING of .cv-intro-stage, positioned against the FRAME
   it shares with it. */
.cv-intro-speak { position: absolute; top: 2%; right: 4%; z-index: 1; }
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
  return (
    <main className="cv-intro" style={{ background: backdrop?.quiet ?? SHEET_PAPER }}>
      <style>{INTRO_CSS}</style>
      <div className="cv-intro-frame">
        <button type="button" className="cv-intro-stage" onClick={onStart}>
          <span className="cv-intro-octopus">
            <img src={ZOO_OCTOPUS_BACKPACK_ART.href} alt="" className="cv-octopus-life" />
          </span>
          <span className="cv-intro-bubble">
            {/* Keyed on the line (T8 item 2), same reasoning
                `PrologueOpening.tsx` gives — this screen only ever shows
                one line per mount, so the pop-in plays once, on arrival. */}
            <span key={adventure.intro} className="cv-bubble-pop">
              <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
              <CaptionedArt art={adventureIcon(adventure)} label={adventure.intro} size={76} />
            </span>
          </span>
        </button>
        <SpeakButton line={adventure.intro} className="cv-intro-speak" />
      </div>
    </main>
  )
}
