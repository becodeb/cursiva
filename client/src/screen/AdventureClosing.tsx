// The transformation screen (`docs/13_AVENTURAS_POR_ANIMAL.md` §5 item 6;
// design.md §6.2-§6.3, add-caretaker-prologue design.md D3). The mirror of
// `AdventureIntro`, not a generalization of it: two ~110-line components
// sharing a stage read better than one with a mode flag, and `AdventureIntro`
// stays byte-identical but for §6.1's one line (`adventureIcon`). Shown once
// per adventure that carries a `closingBeat` — today the entrance's
// `peces`/`tortugas`/`monos`/`sendero` adventures — reached ONLY through the
// `'close'` `GameView` `resolveCloseAction` produces, never through a
// `GameAction`. The beat sequencing itself lives OUTSIDE this component
// (`GameScreen`'s own `beat?` field on the `'close'` view, D3): this
// component renders exactly ONE beat per mount and knows nothing about the
// list or its own position in it.
//
// No `url(#…)` anywhere (`canvas/TraceCanvas.tsx:70-84`'s ban): the octopus
// and the bubble are plain `<img src>`, the reward art is `CaptionedArt`'s
// own SVG `<image href>`. `CLOSING_CSS`'s comments carry NO BACKTICKS — this
// is a template literal, and one backtick inside a comment ends the string.
import CaptionedArt from '../detective/CaptionedArt'
import { ZOO_OCTOPUS_BACKPACK_ART, ZOO_SPEECH_BUBBLE_ART } from '../detective/assets'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { backdropFor } from '../zoo/backdrops'
import type { Adventure, ClosingBeat } from '../zoo/adventures'

/* Same stage geometry as `AdventureIntro.tsx`'s `INTRO_CSS`, restated under
   its own class prefix rather than shared, the same reason the two
   components are siblings rather than one with a mode flag: the shapes
   happen to be identical today, and each is free to diverge without the
   other noticing. See `INTRO_CSS`'s own header for the derivation of every
   number below (the 84dvh landscape clamp, the container-type: inline-size
   cqw sizing). */
const CLOSING_CSS = `
.cv-closing { height: 100dvh; display: flex; align-items: center; justify-content: center; background-color: ${SHEET_PAPER}; box-sizing: border-box; padding: 4%; }
.cv-closing-stage { position: relative; width: min(100%, 620px, 84dvh); aspect-ratio: 1 / 1; container-type: inline-size; border: none; background: none; padding: 0; cursor: pointer; }
.cv-closing-octopus { position: absolute; left: 50%; bottom: 2%; width: 44%; height: auto; transform: translateX(-50%); }
.cv-closing-bubble { position: absolute; left: 50%; top: 4%; width: 82%; transform: translateX(-50%); }
.cv-closing-bubble > img { display: block; width: 100%; height: auto; }
.cv-closing-bubble .cv-captioned { position: absolute; left: 10%; right: 10%; top: 16%; height: 58%; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4cqw; }
.cv-closing-bubble .cv-captioned > svg { width: auto; height: 62%; flex: none; }
.cv-closing-bubble .cv-caption { font-size: 5.6cqw; line-height: 1.16; font-weight: 700; color: #1e293b; text-align: left; }
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
 *  already names it. */
export default function AdventureClosing({ adventure, beat, onContinue }: AdventureClosingProps) {
  const backdrop = backdropFor(adventure.levelIds[adventure.levelIds.length - 1])
  return (
    <main className="cv-closing" style={{ background: backdrop?.quiet ?? SHEET_PAPER }}>
      <style>{CLOSING_CSS}</style>
      <button type="button" className="cv-closing-stage" onClick={onContinue}>
        <img src={(beat.figure ?? ZOO_OCTOPUS_BACKPACK_ART).href} alt="" className="cv-closing-octopus" />
        <span className="cv-closing-bubble">
          <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
          <CaptionedArt art={beat.art} label={beat.line} size={76} />
        </span>
      </button>
    </main>
  )
}
