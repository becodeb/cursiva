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
//
// T24 (`docs/19` §2.1 step 5 + §6, "the animal gets its big moment"): an
// animal-recovering row now ALSO shows its animal big over the scene
// (`.cv-closing-rescue-animal`), and flies to its map spot once this screen
// is dismissed. The flight itself is `zoo/rescueFlight.ts` + `ZooMap.tsx`'s
// own receiving half — this file's only job is the big image, its jump, and
// freezing its departure rect on tap.
//
// T24 follow-up (coordinator review 2026-09-26): the FIRST cut placed the
// animal at a hand-picked `top: 3%; left: 50%` — it happened to clear the
// bubble at 844x390 but landed squarely on the bubble's own text at
// 1024x768 (a taller bubble there, same percent geometry). The animal's box
// is now computed FROM the bubble's and Pulpito's own real placement
// (`screen/rescueAnimalPlacement.ts`'s `resolveRescueAnimalBox`, tested
// against real `octopusBoxAtCorner`/`placeAndFitBubble` outputs at the four
// required viewports) instead of a guess. The bubble's own small caption
// image is ALSO removed for a rescue beat now that the big animal exists —
// `placeAndFitBubble` is called with no `art` (text only), the same
// text-only shape `Deduction.tsx` already uses for its own bubble; the big
// animal is the one picture, never a second, redundant one crammed into the
// bubble (that screen's own T21 follow-up made exactly this call).
import { useRef, type CSSProperties } from 'react'
import CaptionedArt from '../detective/CaptionedArt'
import {
  isPlaceholderArt,
  ZOO_ANIMAL_ART,
  ZOO_OCTOPUS_BACKPACK_ART,
  ZOO_SPEECH_BUBBLE_LEFT_ART,
} from '../detective/assets'
import { PlaceholderAnimalBadge } from '../detective/icons'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { backdropFor } from '../zoo/backdrops'
import type { Adventure, ClosingBeat } from '../zoo/adventures'
import { useNarration } from '../voice/useNarration'
import SpeakButton from '../voice/SpeakButton'
import RescueCelebration, { RESCUE_CELEBRATION_CSS } from './RescueCelebration'
import { BUBBLE_POP_CSS } from './BubblePop'
import { recordDeparture, RESCUE_FLIGHT_VT_NAME } from '../zoo/rescueFlight'
import { resolveRescueAnimalBox } from './rescueAnimalPlacement'
import { hasOpenedNotebookOnce, NOTEBOOK_HINT_LINE } from './notebookDiscovery'
import { GAP_FRAC, LINE_HEIGHT, ZOO_SPEECH_BUBBLE_LEFT_CONTENT } from './bubbleFit'
import {
  OCTOPUS_CORNER_SIZE_PCT,
  RESCUE_OCTOPUS_ART,
  resolvePulpitoStance,
  STAGE_MARGIN_PCT,
  STAGE_MAX_PX,
  STAGE_MAX_VH_FRAC,
} from './pulpitoStance'
import { bubbleContentCssVars, bubbleContentFracs } from './bubbleCssVars'
import { useViewportSize } from './useViewportSize'
import { placeStageBubble } from './stageBubble'

/** The real viewport, CSS px — `undefined` under `renderToString` (node,
 *  no `window`), which is exactly when nothing here reads it: `resolve
 *  RescueAnimalBox`'s own `viewport` argument only matters for a REAL
 *  render (`rescueAnimalPlacement.ts`'s own header on why the ~40vh cap
 *  needs it), and every SSR test in this file passes `adventure.animal ===
 *  undefined` fixtures or does not assert on the animal's exact box — the
 *  same `typeof window === 'undefined'` guard this whole app already uses
 *  for `window.location.search` (`App.tsx`, `GameScreen.tsx`). A fixed
 *  1024x768 fallback (one of the task's own four required viewports) keeps
 *  a fixture render's numbers sane if a future test DOES start asserting
 *  on them under SSR. */
function currentViewport(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 1024, height: 768 }
  return { width: window.innerWidth, height: window.innerHeight }
}

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
/* The rescue animal (T24, docs/19 section 2.1 step 5: "El animal grande
   salta, el Pulpito festeja"): the star of THIS beat, big over the scene.
   Positioned via inline style (left/top/width/height, percent of the
   square stage) computed by resolveRescueAnimalBox
   (screen/rescueAnimalPlacement.ts) FROM the bubble's and Pulpito's own
   real boxes every render -- found by measuring, not guessing (coordinator
   review, this file's own top note): a hand-picked position cleared the
   bubble at one viewport and covered its text at another, since the SAME
   percent geometry produces a taller bubble at some aspect ratios than
   others. position: absolute, like the octopus/bubble spans above -- this
   span's containing block is .cv-closing-stage (inset: 0 against
   .cv-closing-frame, the SAME square stage the octopus/bubble already
   position themselves against), so plain percent left/top/width/height
   here lands in the SAME coordinate system resolveRescueAnimalBox reasons
   about, with no unit-conversion step and no risk of the two silently
   drifting apart the way a fixed/viewport-relative box could.

   The wrapper is a flex box (centring the img inside a box whose exact
   pixel size is only known once the browser lays it out) rather than a
   sized img directly: resolveRescueAnimalBox's own box already preserves
   the art's aspect ratio, but centring the wrapper's OWN box (not the img)
   keeps the jump animation's translateY/scale from ever being read as
   "this box moved" by anything measuring the WRAPPER (recordDeparture,
   below, measures the wrapper, never the animating img). NO BACKTICKS in
   this block -- this file's own top note. */
.cv-closing-rescue-animal { position: absolute; display: flex; align-items: center; justify-content: center; }
.cv-closing-rescue-animal img, .cv-closing-rescue-animal svg { display: block; height: 100%; width: auto; max-width: 100%; animation: cv-rescue-jump 1.1s ease-in-out infinite; transform-origin: 50% 100%; }
@keyframes cv-rescue-jump {
  0%, 100% { transform: translateY(0) scale(1); }
  35% { transform: translateY(-10%) scale(1.05); }
  60% { transform: translateY(0) scale(0.97); }
  82% { transform: translateY(-3%) scale(1.02); }
}
@media (prefers-reduced-motion: reduce) { .cv-closing-rescue-animal img, .cv-closing-rescue-animal svg { animation: none; } }
/* T24 follow-up: the rescue bubble's own TEXT-ONLY content (the small
   duplicate duck removed from inside it) -- the same rule Deduction.tsx's
   own .cv-deduction-bubble-text already states, restated under this
   file's own class prefix rather than shared (this file's own header on
   why AdventureIntro/AdventureClosing stay siblings rather than one
   generalized component). */
.cv-closing-bubble .cv-closing-bubble-text { position: absolute; left: var(--cv-content-left); top: var(--cv-content-top); width: var(--cv-content-width); font-size: var(--cv-caption-font); line-height: ${LINE_HEIGHT}; font-weight: 700; color: #1e293b; text-align: left; margin: 0; }
${BUBBLE_POP_CSS}
/* T18 (odd/tasks/prewriting-stage-completion.md) -- see AdventureIntro.tsx's
   own INTRO_CSS header on .cv-intro-bubble for the floated-image content
   model and the cqw-of-the-bubble unit convention. NO BACKTICKS in this
   block -- one inside a comment ends this template literal early (this
   file's own top note). */
.cv-closing-bubble { position: absolute; container-type: inline-size; }
.cv-closing-bubble .cv-bubble-pop > img { display: block; width: 100%; height: auto; }
.cv-closing-bubble--mirror-x .cv-bubble-pop > img { transform: scaleX(-1); }
.cv-closing-bubble .cv-captioned { position: absolute; left: var(--cv-content-left); top: var(--cv-content-top); width: var(--cv-content-width); text-align: left; }
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

/**
 * The bubble/spoken text for one beat (`odd/tasks/prewriting-stage-
 * completion.md` T31, notebook discoverability): a rescue beat's own line,
 * plus `NOTEBOOK_HINT_LINE` appended, exactly once, the first time an animal
 * is delivered while the notebook is still undiscovered — never for a
 * non-rescue beat (the four entrance enclosures, `night`), and never again
 * once the child has opened the notebook at least once
 * (`screen/notebookDiscovery.ts`'s own `hasOpenedNotebookOnce`, checked by
 * the caller). Exported as a pure function, the same reason
 * `AdventureIntro.tsx`'s own `introSpokenLine` is: directly testable without
 * a DOM, and the one seam `notebookDiscovery.test.ts`'s own bubbleFit-style
 * check exercises against the longest real rescue line in the registry.
 */
export function closingBubbleText(beat: ClosingBeat, showNotebookHint: boolean): string {
  return showNotebookHint ? `${beat.line} ${NOTEBOOK_HINT_LINE}` : beat.line
}

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
  // T24 (the rescue flight, docs/19 section 2.1 step 5 + section 6): the
  // wrapper this ref measures is what `recordDeparture` (zoo/rescueFlight.ts)
  // freezes into a plain rect BEFORE the tap that unmounts this whole
  // screen — see the handler on the stage button below, and that module's
  // own header for why the handoff has to be a module-scope variable
  // rather than React state.
  const rescueAnimalRef = useRef<HTMLSpanElement | null>(null)
  const isRescue = adventure.animal !== undefined
  // T31 (notebook discoverability): the hint is appended to THIS rescue
  // beat's own line, once, only while the notebook is still undiscovered —
  // `hasOpenedNotebookOnce` reads real `localStorage` (absent under
  // `renderToString`, this file's own `typeof window` guard, the same
  // convention `AdventureClosing.tsx`'s own `currentViewport` already uses).
  const showNotebookHint = isRescue && typeof window !== 'undefined' && !hasOpenedNotebookOnce(window.localStorage)
  const bubbleText = closingBubbleText(beat, showNotebookHint)
  // Voice narration (docs/18 D1; T7): each beat speaks its own line as soon
  // as it appears. `GameScreen`'s own 'close' view (this file's own header)
  // re-renders this SAME component with the NEXT beat rather than
  // remounting it, so this relies on `useNarration`'s "speaks again when
  // `line` changes" behaviour, not on a fresh mount.
  useNarration(bubbleText)
  // T18: the stance (`docs/19` §4.1) — this beat's own, falling back to the
  // shared default.
  const viewport = useViewportSize()
  const stance = resolvePulpitoStance(beat.stance)
  // [T49, `docs/23` D7] A rescue closing shows him cheering; every other
  // beat keeps its own `figure` or the backpack octopus.
  const octopusArt = beat.figure ?? (isRescue ? RESCUE_OCTOPUS_ART : ZOO_OCTOPUS_BACKPACK_ART)
  // T24 follow-up: text-only for a rescue beat (no `art`) — the big animal
  // below is the one picture now; a non-rescue beat (entrance enclosures,
  // night) keeps its own small caption image exactly as before.
  const { octopusBox, placement, content } = placeStageBubble({
    figure: octopusArt,
    corner: stance.corner,
    viewport,
    text: bubbleText,
    art: isRescue ? undefined : beat.art,
  })
  const rescueAnimalBox = isRescue
    ? resolveRescueAnimalBox({
        frame: { w: 100, h: 100 },
        octopusBox,
        bubbleBox: placement,
        artAspect: { w: ZOO_ANIMAL_ART[adventure.animal!].w, h: ZOO_ANIMAL_ART[adventure.animal!].h },
        viewport: currentViewport(),
      })
    : null
  return (
    <main className="cv-closing" style={{ backgroundColor: backdrop?.quiet ?? SHEET_PAPER }}>
      <style>{CLOSING_CSS}</style>
      {backdrop && <img className="cv-closing-backdrop" src={backdrop.art.href} alt="" />}
      <div className="cv-closing-frame">
        <button
          type="button"
          className="cv-closing-stage"
          onClick={() => {
            // T24: freeze the departure BEFORE onContinue starts the
            // navigation that unmounts this screen — `rescueAnimalRef` is
            // absent for an animal-less closing (entrance enclosures,
            // night), so this is a no-op there, exactly like
            // `RescueCelebration` staying unrendered for the same rows.
            if (adventure.animal !== undefined && rescueAnimalRef.current) {
              const rect = rescueAnimalRef.current.getBoundingClientRect()
              recordDeparture(adventure.animal, { x: rect.x, y: rect.y, width: rect.width, height: rect.height })
            }
            onContinue()
          }}
        >
          {isRescue && rescueAnimalBox && (
            <span
              className="cv-closing-rescue-animal"
              ref={rescueAnimalRef}
              aria-hidden="true"
              style={{
                left: `${rescueAnimalBox.x}%`,
                top: `${rescueAnimalBox.y}%`,
                width: `${rescueAnimalBox.w}%`,
                height: `${rescueAnimalBox.h}%`,
              }}
            >
              {/* [T27 follow-up, orchestrator screenshot review 2026-09-27]
                  The SAME `PlaceholderAnimalBadge` swap every other spot a
                  `PLACEHOLDER_ZOO_ANIMALS` entry could show its own grey
                  sign block now makes — the big rescue picture is never
                  that block. `.cv-closing-rescue-animal svg` (below) mirrors
                  the `img` rule so the jump animation still plays. */}
              {isPlaceholderArt(ZOO_ANIMAL_ART[adventure.animal!]) ? (
                <PlaceholderAnimalBadge style={{ viewTransitionName: RESCUE_FLIGHT_VT_NAME } as CSSProperties} />
              ) : (
                <img
                  src={ZOO_ANIMAL_ART[adventure.animal!].href}
                  alt=""
                  style={{ viewTransitionName: RESCUE_FLIGHT_VT_NAME } as CSSProperties}
                />
              )}
            </span>
          )}
          <span
            className="cv-closing-octopus"
            style={{ [stance.corner]: `${octopusBox.x}%`, width: `${octopusBox.w}%` } as CSSProperties}
          >
            <img src={octopusArt.href} alt="" className="cv-octopus-life" />
          </span>
          <span
            className={`cv-closing-bubble${placement.mirrored ? ' cv-closing-bubble--mirror-x' : ''}`}
            style={{
              left: `${placement.left}%`,
              top: `${placement.top}%`,
              width: `${placement.width}%`,
              ...bubbleContentCssVars(placement, content, bubbleContentFracs(ZOO_SPEECH_BUBBLE_LEFT_CONTENT, GAP_FRAC, true)),
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
              <img src={ZOO_SPEECH_BUBBLE_LEFT_ART.href} alt="" />
              {isRescue ? (
                <p className="cv-closing-bubble-text">{bubbleText}</p>
              ) : (
                <CaptionedArt
                  art={beat.art}
                  label={beat.line}
                  size={76}
                  className={content.layout === 'stack' ? 'cv-captioned--stack' : undefined}
                />
              )}
            </span>
          </span>
          {adventure.animal !== undefined && <RescueCelebration />}
        </button>
      </div>
      <SpeakButton line={bubbleText} className="cv-closing-speak" />
    </main>
  )
}
