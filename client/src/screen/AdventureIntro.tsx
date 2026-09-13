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

/* The stage is a percentage box with container-type: inline-size, the same
   fix the zoo map's own bubble uses (ZooMap.tsx's ZOO_CSS): everything
   inside sizes in cqw (percent of the STAGE's own width), so nothing here
   needs a px length that would be right at exactly one viewport. The
   octopus stands at the bottom, the bubble floats above his head, the same
   composition docs/13 section 5 item 1 asks for. flex: none on the
   captioned SVG keeps the animal from being squeezed to a sliver by the
   phrase beside it, the same override the zoo map's own bubble needed.

   The stage side is clamped by the VIEWPORT HEIGHT as well as its width.
   A square sized on width alone overflows a landscape viewport: at
   1000x600 the padding leaves 520 of height, the stage took its full 620,
   and the octopus — anchored to the stage's bottom — was pushed past the
   edge with its lower tentacles cut off. Landscape is this app's primary
   orientation (LevelPlay ships a rotate-your-device hint), so the
   narrow side has to be the one that decides. 84dvh leaves room for the
   4 percent padding on both sides; portrait tablets stay width-bound at
   620 and are unchanged. Verified by capture at 1000x600 and 768x1024. */
const INTRO_CSS = `
.cv-intro { height: 100dvh; display: flex; align-items: center; justify-content: center; background-color: ${SHEET_PAPER}; box-sizing: border-box; padding: 4%; }
.cv-intro-stage { position: relative; width: min(100%, 620px, 84dvh); aspect-ratio: 1 / 1; container-type: inline-size; border: none; background: none; padding: 0; cursor: pointer; }
.cv-intro-octopus { position: absolute; left: 50%; bottom: 2%; width: 44%; height: auto; transform: translateX(-50%); }
.cv-intro-bubble { position: absolute; left: 50%; top: 4%; width: 82%; transform: translateX(-50%); }
.cv-intro-bubble > img { display: block; width: 100%; height: auto; }
.cv-intro-bubble .cv-captioned { position: absolute; left: 10%; right: 10%; top: 16%; height: 58%; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4cqw; }
.cv-intro-bubble .cv-captioned > svg { width: auto; height: 62%; flex: none; }
.cv-intro-bubble .cv-caption { font-size: 5.6cqw; line-height: 1.16; font-weight: 700; color: #1e293b; text-align: left; }
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
  return (
    <main className="cv-intro" style={{ background: backdrop?.quiet ?? SHEET_PAPER }}>
      <style>{INTRO_CSS}</style>
      <button type="button" className="cv-intro-stage" onClick={onStart}>
        <img src={ZOO_OCTOPUS_BACKPACK_ART.href} alt="" className="cv-intro-octopus" />
        <span className="cv-intro-bubble">
          <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
          <CaptionedArt art={adventureIcon(adventure)} label={adventure.intro} size={76} />
        </span>
      </button>
    </main>
  )
}
