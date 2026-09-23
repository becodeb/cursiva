// The transformation screen (`docs/13_AVENTURAS_POR_ANIMAL.md` §5 item 6;
// design.md §6.2-§6.3, add-caretaker-prologue design.md D3). The mirror of
// `AdventureIntro`, not a generalization of it: two ~110-line components
// sharing a stage read better than one with a mode flag, and `AdventureIntro`
// stays byte-identical but for §6.1's one line (`adventureIcon`). Shown once
// per adventure that carries a `closingBeat` — as of adventure-flow-and-map-
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
// No `url(#…)` anywhere (`canvas/TraceCanvas.tsx:70-84`'s ban): the octopus
// and the bubble are plain `<img src>`, the reward art is `CaptionedArt`'s
// own SVG `<image href>`. `CLOSING_CSS`'s comments carry NO BACKTICKS — this
// is a template literal, and one backtick inside a comment ends the string.
import CaptionedArt from '../detective/CaptionedArt'
import { ZOO_OCTOPUS_BACKPACK_ART, ZOO_SPEECH_BUBBLE_ART } from '../detective/assets'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { backdropFor } from '../zoo/backdrops'
import type { Adventure, ClosingBeat } from '../zoo/adventures'
import { useNarration } from '../voice/useNarration'
import SpeakButton from '../voice/SpeakButton'
import RescueCelebration, { RESCUE_CELEBRATION_CSS } from './RescueCelebration'

/* Same stage geometry as `AdventureIntro.tsx`'s `INTRO_CSS`, restated under
   its own class prefix rather than shared, the same reason the two
   components are siblings rather than one with a mode flag: the shapes
   happen to be identical today, and each is free to diverge without the
   other noticing. See `INTRO_CSS`'s own header for the derivation of every
   number below (the 84dvh landscape clamp, the container-type: inline-size
   cqw sizing) AND for the T7 frame/stage split this file mirrors: sizing
   lives on `.cv-closing-frame`, the tap on an inset:0 `.cv-closing-stage`
   overlay, so `SpeakButton` can sit beside it as a sibling rather than a
   descendant (a button nested inside a button is invalid HTML and would
   swallow the tap meant for the stage underneath it). */
const CLOSING_CSS = `
html, body, #root { margin: 0; height: 100%; }
.cv-closing { height: 100dvh; display: flex; align-items: center; justify-content: center; background-color: ${SHEET_PAPER}; box-sizing: border-box; padding: 4%; }
.cv-closing-frame { position: relative; width: min(100%, 620px, 84dvh); aspect-ratio: 1 / 1; container-type: inline-size; }
.cv-closing-stage { position: absolute; inset: 0; container-type: inline-size; border: none; background: none; padding: 0; cursor: pointer; }
.cv-closing-speak { position: absolute; top: 2%; right: 4%; z-index: 1; }
.cv-closing-octopus { position: absolute; left: 50%; bottom: 2%; width: 44%; height: auto; transform: translateX(-50%); }
.cv-closing-bubble { position: absolute; left: 50%; top: 4%; width: 82%; transform: translateX(-50%); }
.cv-closing-bubble > img { display: block; width: 100%; height: auto; }
.cv-closing-bubble .cv-captioned { position: absolute; left: 10%; right: 10%; top: 16%; height: 58%; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4cqw; }
.cv-closing-bubble .cv-captioned > svg { width: auto; height: 62%; flex: none; }
.cv-closing-bubble .cv-caption { font-size: 5.6cqw; line-height: 1.16; font-weight: 700; color: #1e293b; text-align: left; }
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
  return (
    <main className="cv-closing" style={{ background: backdrop?.quiet ?? SHEET_PAPER }}>
      <style>{CLOSING_CSS}</style>
      <div className="cv-closing-frame">
        <button type="button" className="cv-closing-stage" onClick={onContinue}>
          <img src={(beat.figure ?? ZOO_OCTOPUS_BACKPACK_ART).href} alt="" className="cv-closing-octopus" />
          <span className="cv-closing-bubble">
            <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
            <CaptionedArt art={beat.art} label={beat.line} size={76} />
          </span>
          {adventure.animal !== undefined && <RescueCelebration />}
        </button>
        <SpeakButton line={beat.line} className="cv-closing-speak" />
      </div>
    </main>
  )
}
