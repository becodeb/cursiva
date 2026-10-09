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
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import CaptionedArt from '../detective/CaptionedArt'
import { ZOO_SPEECH_BUBBLE_LEFT_ART } from '../detective/assets'
import { SHEET_PAPER, fitContentWithInsets } from '../canvas/TraceCanvas'
import { RevealLayer } from '../canvas/RevealLayer'
import type { ArtBox } from '../canvas/placeArt'
import { backdropFor } from '../zoo/backdrops'
import { introBubbleArt, type Adventure } from '../zoo/adventures'
import { introCoverFor, INTRO_COVER_VIEWBOX_HEIGHT } from './introCover'
import { IntroChromeGhost, levelChromeFacts } from './introChrome'
import { LEVEL_CHROME_SIDE_INSET } from './LevelPlay'
import { useNarration } from '../voice/useNarration'
import SpeakButton from '../voice/SpeakButton'
import { BUBBLE_POP_CSS } from './BubblePop'
import { FLOAT_BOTTOM_MARGIN_FRAC, GAP_FRAC, LINE_HEIGHT, ZOO_SPEECH_BUBBLE_LEFT_CONTENT } from './bubbleFit'
import {
  INTRO_OCTOPUS_ART,
  OCTOPUS_CORNER_SIZE_PCT,
  resolvePulpitoStance,
  STAGE_MARGIN_PCT,
  STAGE_MAX_PX,
  STAGE_MAX_VH_FRAC,
} from './pulpitoStance'
import { bubbleContentCssVars, bubbleContentFracs } from './bubbleCssVars'
import { useViewportSize } from './useViewportSize'
import { placeStageBubble } from './stageBubble'

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
.cv-intro-stage { position: absolute; inset: 0; container-type: inline-size; border: none; background: none; padding: 0; cursor: pointer; font: inherit; text-align: left; }
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
/* [T51] The caption block carries the caption font too: its line boxes take
   their height from the BLOCK strut as well as the inline caption, so a block
   left at the page font (16px, normal line height) spaced small captions
   wider than the fit assumed. */
.cv-intro-bubble .cv-captioned { position: absolute; left: var(--cv-content-left); top: var(--cv-content-top); width: var(--cv-content-width); text-align: left; font-size: var(--cv-caption-font); line-height: ${LINE_HEIGHT}; }
.cv-intro-bubble .cv-captioned > svg { float: left; width: var(--cv-image-w); height: var(--cv-image-h); margin-right: var(--cv-gap); margin-bottom: ${FLOAT_BOTTOM_MARGIN_FRAC * 100}cqw; }
/* T18 follow-up (bubbleFit.ts's own header): the STACK layout — the image
   sits above the caption instead of beside it, so the caption always wraps
   at the bubble's full content width and never has to fit a word into a
   narrow column. No overflow-wrap on .cv-caption below any more: a word
   this layout still cannot fit is a genuine "no admissible layout" case
   (bubbleFit.ts's own fits: false), never something to paper over by
   breaking a word mid-letter -- this is an app for children learning to
   read. */
.cv-intro-bubble .cv-captioned--stack > svg { float: none; display: block; margin: 0 auto var(--cv-gap) auto; }
.cv-intro-bubble .cv-caption { font-size: var(--cv-caption-font); line-height: ${LINE_HEIGHT}; font-weight: 700; color: #1e293b; text-align: left; }
/* T7: the "hear it again" button. T18: no longer pinned to the corner
   stage (docs/19 §4.2's "arriba están los botones") — a sibling of
   .cv-intro-frame inside .cv-intro, pinned to the SCREEN's own top
   corner instead. */
.cv-intro-speak { position: absolute; top: ${STAGE_MARGIN_PCT}%; right: ${STAGE_MARGIN_PCT}%; z-index: 2; }
/* T23 (odd/tasks/prewriting-stage-completion.md, docs/19 §5.1): the tool
   handoff badge — a small captioned picture in the OPPOSITE top corner from
   the "hear it again" button, so the two never collide. Deliberately its
   own tiny element rather than a second image inside .cv-intro-bubble
   (this file's own header explains why that bubble's placement math is not
   safe to extend). A warm-paper pill (the same marker style every other
   HUD chrome in this app already uses, ZooMap.tsx's own HUD pills) rather
   than a bare picture directly on the backdrop: found in browser QA — the
   caption read as nearly illegible against a busy mountain backdrop with
   no plate behind it. NO BACKTICKS in this block -- one inside a comment
   ends this template literal early (this file's own top-of-file note). */
.cv-intro-tool { position: absolute; top: ${STAGE_MARGIN_PCT}%; left: ${STAGE_MARGIN_PCT}%; z-index: 2; display: flex; flex-direction: column; align-items: center; background: ${SHEET_PAPER}; border: 3px solid #1a1a1a; border-radius: 16px; padding: 6px 10px; }
/* (V1 sibling, docs/25 section 5.4: PrologueOpening.tsx's own
   .cv-prologue-skip carries the identical fix, and its header explains
   why) CaptionedArt's <svg> and <span class="cv-caption"> are adjacent
   JSX children with no text node between them -- the default inline flow
   gives them a literal zero-pixel gap, so the icon's edge touches the
   label's first glyph. An explicit row with a real gap never lets that
   happen, at any viewport. */
.cv-intro-tool .cv-captioned { display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 6px; }
.cv-intro-tool .cv-caption { font-size: 14px; font-weight: 700; color: #1e293b; white-space: nowrap; }
`

export interface AdventureIntroProps {
  adventure: Adventure
  onStart: () => void
}

/**
 * The line this screen speaks (`odd/tasks/prewriting-stage-completion.md`
 * T23): the adventure's own `intro`, plus the tool's own handoff line in
 * the SAME utterance when this row hands one out — never a second
 * `useNarration` call, which would double-fire on the same mount. Exported
 * as a pure function so the concatenation is directly testable without a
 * DOM (`renderToString` never runs `useNarration`'s own effect).
 */
export function introSpokenLine(adventure: Adventure): string {
  return adventure.introTool ? `${adventure.intro} ${adventure.introTool.line}` : adventure.intro
}

/** The reusable narrative entry (`docs/13` §5 item 1). No `aria-label` on
 * the button — the caption inside already names it, and an `aria-label`
 * would override the only sentence on the screen. */
export default function AdventureIntro({ adventure, onStart }: AdventureIntroProps) {
  const backdrop = backdropFor(adventure.levelIds[0])
  // T31 (odd/tasks/prewriting-stage-completion.md): "dice que el vidrio está
  // empañado, pero se ve el fondo limpio" — the level as it will look the
  // instant play starts (the fog/sand/leaves/mud cover, night's darkness, a
  // snake's grey art), not the bare backdrop `AdventureIntro` used to show
  // alone. `null` for every adventure whose first level has neither
  // (`introCover.ts`'s own header) — those keep the plain backdrop `<img>`.
  // `useMemo`, keyed on `adventure` (a stable reference per row — `ADVENTURES`
  // is a module-level constant array `GameScreen.tsx`'s own `introLevel`
  // always resolves to the SAME entry): `introCoverFor` returns a fresh
  // object every call, and the `useEffect` below depends on `[cover]` — a
  // bare `introCoverFor(adventure)` call here would hand that effect a NEW
  // reference on every render, re-running it, calling `setChromeInsets`/
  // `setContainerSize` again, forcing another render, forcing a fresh
  // `cover` reference again — an infinite render loop found live in the
  // browser ("Maximum update depth exceeded"), not merely a theoretical
  // risk. Memoizing keeps the reference stable across a render this
  // component's OWN state (not `adventure`) triggered.
  const cover = useMemo(() => introCoverFor(adventure), [adventure])
  // T31 follow-up (coordinator review: "the intro must use the SAME framing
  // as the level" — a bare crop mismatched the level's own, so the snakes
  // jumped bigger/shifted the instant play started). `chromeFacts`/
  // `IntroChromeGhost` (`screen/introChrome.tsx`) render an INVISIBLE
  // replica of the level's own `.cv-top`/`.cv-foot` chrome, measured with
  // the SAME `ResizeObserver` pattern and fed into the SAME
  // `fitContentWithInsets` `screen/LevelPlay.tsx` itself calls — see that
  // module's own header for why this beats hand-computing the same numbers.
  // Only needed when there is a cover to frame; a trail adventure keeps its
  // simple `object-fit: cover` crop, unaffected by any of this. Memoized for
  // the same reason `cover` is (never itself a `useEffect` dependency today,
  // but no need to re-derive it — a fresh `getLevel`/`adventureProgress`
  // call — on every unrelated re-render either).
  const chromeFacts = useMemo(() => (cover ? levelChromeFacts(adventure.levelIds[0]) : null), [cover, adventure])
  const topGhostRef = useRef<HTMLDivElement | null>(null)
  const bottomGhostRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [chromeInsets, setChromeInsets] = useState<{ top: number; bottom: number }>({ top: 0, bottom: 0 })
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
  useEffect(() => {
    if (!cover) return undefined
    const topEl = topGhostRef.current
    const bottomEl = bottomGhostRef.current
    const svgEl = svgRef.current
    if (!topEl || !bottomEl || !svgEl || typeof ResizeObserver === 'undefined') return undefined
    const measure = (): void => {
      setChromeInsets({ top: topEl.getBoundingClientRect().height, bottom: bottomEl.getBoundingClientRect().height })
      const box = svgEl.getBoundingClientRect()
      setContainerSize({ width: box.width, height: box.height })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(topEl)
    observer.observe(bottomEl)
    observer.observe(svgEl)
    measure()
    return () => observer.disconnect()
  }, [cover])
  // `windowBounds` is `sheetBounds` restated as an `ArtBox` (TraceCanvas's
  // own vocabulary) — `displayBounds` is that box grown to the container's
  // own aspect ratio minus the SAME four insets `LevelPlay.tsx` measures,
  // exactly mirroring `TraceCanvas.tsx`'s own `contain && backdrop &&
  // containerSize` gate: `null`/pre-measurement (SSR, or the client's very
  // first paint) falls back to the ungrown box, byte-identical to this
  // screen's own pre-follow-up behaviour.
  const windowBounds: ArtBox | null = cover
    ? { x: 0, y: 0, width: cover.viewBoxWidth, height: INTRO_COVER_VIEWBOX_HEIGHT }
    : null
  const displayBounds: ArtBox | null =
    windowBounds && containerSize
      ? fitContentWithInsets(windowBounds, containerSize.width, containerSize.height, {
          top: chromeInsets.top,
          bottom: chromeInsets.bottom,
          left: LEVEL_CHROME_SIDE_INSET,
          right: LEVEL_CHROME_SIDE_INSET,
        })
      : windowBounds
  const spokenLine = introSpokenLine(adventure)
  // Voice narration (docs/18 D1; T7): this screen is always reached by a
  // tap (leaving the previous screen), so `canAutoSpeak()` is already true
  // by the time this fires — unlike the prologue's very first plate, this
  // line autoplays for real, and `SpeakButton` below is only "hear it
  // again", never the sole way to hear it in the first place.
  useNarration(spokenLine)
  // T18: the stance (`docs/19` §4.1) — which bottom corner he stands in,
  // and therefore which side the bubble opens toward.
  const viewport = useViewportSize()
  const stance = resolvePulpitoStance(adventure.introStance)
  // [T49, `docs/23` D7] He points at the scene: the drawing points right,
  // so in the right corner it is mirrored (CSS `scale`, which composes with
  // the blink keyframe's own `transform` instead of replacing it).
  const icon = introBubbleArt(adventure)
  const { octopusBox, placement, content } = placeStageBubble({
    figure: INTRO_OCTOPUS_ART,
    corner: stance.corner,
    viewport,
    text: adventure.intro,
    art: icon,
  })
  return (
    <main className="cv-intro" style={{ backgroundColor: backdrop?.quiet ?? SHEET_PAPER }}>
      <style>{INTRO_CSS}</style>
      {backdrop && cover && windowBounds && displayBounds && (
        // T31 follow-up: `viewBox`/the backdrop `<image>`'s own box are now
        // `displayBounds` — the SAME JS-computed, chrome-inset-aware box
        // `canvas/TraceCanvas.tsx` itself renders with (`preserveAspectRatio
        // ="xMidYMid meet"` is safe here for the SAME reason it is there:
        // `fitContentWithInsets` GUARANTEES `displayBounds`'s own aspect
        // ratio already equals the container's, so "meet" never letterboxes
        // — `coverAspectRatio`'s own proof, TraceCanvas.tsx). The cover
        // layer (`RevealLayer`, unchanged, reused as-is — or a snake's own
        // grey pieces) gets BOTH `sheetBounds` (`windowBounds`, unchanged)
        // AND `displayBounds`, exactly like TraceCanvas's own call, so its
        // margin bands (`RevealLayer.tsx`'s own `marginGridTiles`) extend
        // the veil into the grown margin instead of leaving it uncovered.
        <svg
          ref={svgRef}
          className="cv-intro-backdrop"
          viewBox={`${displayBounds.x} ${displayBounds.y} ${displayBounds.width} ${displayBounds.height}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <rect
            x={displayBounds.x}
            y={displayBounds.y}
            width={displayBounds.width}
            height={displayBounds.height}
            fill={backdrop.quiet}
          />
          <image
            href={cover.backdropHref}
            x={displayBounds.x}
            y={displayBounds.y}
            width={displayBounds.width}
            height={displayBounds.height}
            preserveAspectRatio="xMidYMid slice"
          />
          {cover.kind === 'veil' ? (
            <RevealLayer reveal={cover.reveal} sheetBounds={windowBounds} displayBounds={displayBounds} />
          ) : (
            cover.pieces.map((piece, i) => (
              <image
                key={i}
                href={piece.href}
                x={piece.box.x}
                y={piece.box.y}
                width={piece.box.width}
                height={piece.box.height}
                transform={piece.rotate ? `rotate(${piece.rotate} ${piece.pivot.x} ${piece.pivot.y})` : undefined}
              />
            ))
          )}
        </svg>
      )}
      {/* T31 follow-up: the invisible chrome replica this screen measures
          its own framing against — never rendered under SSR/tests (no
          `window`, and nothing there would ever measure it), so every
          existing `renderToString` assertion stays byte-identical. */}
      {chromeFacts && typeof window !== 'undefined' && (
        <IntroChromeGhost facts={chromeFacts} topRef={topGhostRef} bottomRef={bottomGhostRef} />
      )}
      {backdrop && !cover && <img className="cv-intro-backdrop" src={backdrop.art.href} alt="" />}
      <div className="cv-intro-frame">
        <button type="button" className="cv-intro-stage" onClick={onStart}>
          <span
            className="cv-intro-octopus"
            style={{ [stance.corner]: `${octopusBox.x}%`, width: `${octopusBox.w}%` } as CSSProperties}
          >
            <img
              src={INTRO_OCTOPUS_ART.href}
              alt=""
              className="cv-octopus-life"
              style={stance.corner === 'right' ? { scale: '-1 1' } : undefined}
            />
          </span>
          <span
            className={`cv-intro-bubble${placement.mirrored ? ' cv-intro-bubble--mirror-x' : ''}`}
            style={{
              left: `${placement.left}%`,
              top: `${placement.top}%`,
              width: `${placement.width}%`,
              ...bubbleContentCssVars(placement, content, bubbleContentFracs(ZOO_SPEECH_BUBBLE_LEFT_CONTENT, GAP_FRAC, false)),
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
              <img src={ZOO_SPEECH_BUBBLE_LEFT_ART.href} alt="" />
              <CaptionedArt
                art={icon}
                label={adventure.intro}
                size={76}
                className={content.layout === 'stack' ? 'cv-captioned--stack' : undefined}
              />
            </span>
          </span>
        </button>
      </div>
      {/* T23 (odd/tasks/prewriting-stage-completion.md, docs/19 §5.1): the
          tool handoff badge — outside `.cv-intro-frame` entirely, a sibling
          of it and of `SpeakButton`, pinned to the opposite top corner. The
          spoken line already carries `introTool.line` (`spokenLine`,
          above); this is the picture half of the same handoff. */}
      {adventure.introTool && (
        <div className="cv-intro-tool">
          <CaptionedArt art={adventure.introTool.art} label={adventure.introTool.label} size={56} />
        </div>
      )}
      <SpeakButton line={spokenLine} className="cv-intro-speak" />
    </main>
  )
}
