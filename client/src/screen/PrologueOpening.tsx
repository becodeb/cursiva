// The prologue's opening screen (`docs/16_PROLOGO_EL_CUIDADOR.md` §4;
// add-caretaker-prologue design.md D1, D2, D8; T36, `odd/tasks/prewriting-
// stage-completion.md`, `docs/18_DIAGNOSTICO_Y_REDISENO_PEDAGOGICO.md` D3).
// Three chained fixed plates shown before the zoo map on a child's first
// visit.
//
// T36 rebuild: this screen used to sit on a FLAT colour (`backdrop.quiet`)
// with the caretaker centred and a bubble whose inline picture, on the
// FIRST plate, was the caretaker AGAIN (docs/18 D3 — "el Pulpito aparece dos
// veces en la primera lámina"). It now follows `AdventureIntro.tsx`'s own
// T18 pattern exactly: the zoo map art (`docs/16` §4's own "el zoológico
// abierto y con animales" — the only shipped picture of the whole, open,
// populated zoo; no new art commissioned) drawn FULL SCREEN behind him, and
// the caretaker moved into a bottom CORNER (`screen/pulpitoStance.ts`) with
// his bubble opening toward the screen's own centre — the SAME
// `octopusBoxAtCorner`/`placeAndFitBubble`/`stanceBubbleSide` machinery
// `AdventureIntro.tsx` and `AdventureClosing.tsx` already ship, reused
// rather than restated (`zoo/prologue.ts`'s own `ProloguePlate.art` header
// is the other half of the D3 fix: the first plate's bubble carries no
// picture at all now, since the big caretaker is already the picture for
// that line). The component's ENTIRE external contract is still
// `{ from?, onDone }`: no caller may reach into its internal plate index,
// and swapping the plates for a `<video>` later (`prologue-opening` spec
// "The Video Swap Point") touches no call site.
//
// No `url(#…)` anywhere (`canvas/TraceCanvas.tsx:70-84`'s ban): the
// backdrop, the octopus and the bubble are plain `<img src>`, the plate's
// own art and the skip control are both `CaptionedArt`'s SVG `<image
// href>`. `PROLOGUE_CSS`'s comments carry NO BACKTICKS — this is a template
// literal, and one backtick inside a comment ends the string.
import { useState, type CSSProperties } from 'react'
import CaptionedArt from '../detective/CaptionedArt'
import { ZOO_MAP_ART, ZOO_CARETAKER_ART, ZOO_SPEECH_BUBBLE_ART } from '../detective/assets'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { PROLOGUE_PLATES, advancePlate } from '../zoo/prologue'
import { useNarration } from '../voice/useNarration'
import { canAutoSpeak, speak } from '../voice/narrator'
import SpeakButton from '../voice/SpeakButton'
import { ReplayIcon } from '../detective/icons'
import { BUBBLE_POP_CSS } from './BubblePop'
import { ZOO_SPEECH_BUBBLE_TAIL } from './bubblePlacement'
import {
  CONTENT_HEIGHT_FRAC,
  CONTENT_LEFT_FRAC,
  CONTENT_TOP_FRAC,
  CONTENT_WIDTH_FRAC,
  FLOAT_BOTTOM_MARGIN_FRAC,
  GAP_FRAC,
  LINE_HEIGHT,
  placeAndFitBubble,
} from './bubbleFit'
import {
  OCTOPUS_CORNER_INSET,
  PROLOGUE_OCTOPUS_SIZE_PCT,
  octopusBoxAtCorner,
  resolvePulpitoStance,
  stanceBubbleSide,
  STAGE_MARGIN_PCT,
  STAGE_MAX_PX,
  STAGE_MAX_VH_FRAC,
} from './pulpitoStance'
import { bubbleContentCssVars } from './bubbleCssVars'

/* `AdventureIntro.tsx`'s own `INTRO_CSS`, restated under `.cv-prologue*`
   rather than shared — the two screens have separate top-level elements
   (`GameScreen.tsx`/`App.tsx` mount them at different points in the flow)
   and this repo's own convention is one CSS block per screen component
   (`AdventureIntro.tsx`'s header on why it does not share `.cv-intro*`
   either). NO BACKTICKS anywhere in this block — one inside a comment ends
   the template literal early. */
const PROLOGUE_CSS = `
.cv-prologue { position: relative; height: 100dvh; width: 100vw; overflow: hidden; background-color: ${SHEET_PAPER}; }
.cv-prologue-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.cv-prologue-frame { position: absolute; bottom: ${STAGE_MARGIN_PCT}%; width: min(100%, ${STAGE_MAX_PX}px, ${STAGE_MAX_VH_FRAC * 100}dvh); aspect-ratio: 1 / 1; container-type: inline-size; }
.cv-prologue-stage { position: absolute; inset: 0; container-type: inline-size; border: none; background: none; padding: 0; cursor: pointer; font: inherit; text-align: left; }
/* T8 item 1 (odd/tasks/prewriting-stage-completion.md): idle life, using
   only the existing art. T36: a corner octopus is positioned by a plain
   inline left/right (octopusBoxAtCorner's own x coordinate), so the
   breathing keyframes need no centring transform inside them (this file's
   own pre-T36 centred layout did). NO BACKTICKS in this block. */
.cv-prologue-octopus { position: absolute; bottom: 2%; height: ${PROLOGUE_OCTOPUS_SIZE_PCT}%; width: auto; animation: cv-octopus-breathe 3.6s ease-in-out infinite; transform-origin: 50% 100%; }
@keyframes cv-octopus-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02) translateY(-1%); }
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
/* T36: the bubble's own placement/content now come from placeAndFitBubble
   (screen/bubbleFit.ts), the same T18 engine AdventureIntro.tsx uses — see
   that file's own .cv-intro-bubble header for the container-type/cqw
   reasoning and the float-vs-stack layout this rule supports. NO BACKTICKS
   in this block — one inside a comment ends this template literal early
   (this file's own top-of-file note). */
.cv-prologue-bubble { position: absolute; container-type: inline-size; }
.cv-prologue-bubble .cv-bubble-pop > img { display: block; width: 100%; height: auto; }
.cv-prologue-bubble--mirror-x .cv-bubble-pop > img { transform: scaleX(-1); }
/* T36 (docs/18 D3's own fix): the first plate's bubble carries no picture
   (zoo/prologue.ts's own ProloguePlate.art header) -- .cv-prologue-bubble-
   text is its bare-caption sibling of .cv-captioned, sharing the SAME
   positioning rule so both land in the exact same content box bubbleFit.ts
   computed, without wrapping the bare word in .cv-captioned itself
   (detective/captionAudit.ts's own licence: a .cv-captioned span that never
   carries an image fails the audit outright) -- the big caretaker's own
   img is a SIBLING elsewhere in this frame, not inside this span, so this
   text is licensed through .cv-prologue-frame instead, the same
   .cv-deduction-frame/.cv-closing-frame precedent captionAudit.ts's own
   header lists. NO BACKTICKS in this block. */
/* [T51] The caption block carries the caption font too: its line boxes take
   their height from the BLOCK strut as well as the inline caption, so a block
   left at the page font (16px, normal line height) spaced small captions
   wider than the fit assumed. */
.cv-prologue-bubble .cv-captioned, .cv-prologue-bubble .cv-prologue-bubble-text { position: absolute; left: var(--cv-content-left); top: var(--cv-content-top); width: var(--cv-content-width); text-align: left; font-size: var(--cv-caption-font); line-height: ${LINE_HEIGHT}; }
.cv-prologue-bubble .cv-captioned > svg { float: left; width: var(--cv-image-w); height: var(--cv-image-h); margin-right: var(--cv-gap); margin-bottom: ${FLOAT_BOTTOM_MARGIN_FRAC * 100}cqw; }
.cv-prologue-bubble .cv-captioned--stack > svg { float: none; display: block; margin: 0 auto var(--cv-gap) auto; }
.cv-prologue-bubble .cv-caption { font-size: var(--cv-caption-font); line-height: ${LINE_HEIGHT}; font-weight: 700; color: #1e293b; text-align: left; }
/* The "hear it again" button and the "go to the map" skip pill: both
   SIBLINGS of .cv-prologue-frame inside .cv-prologue, pinned to the SCREEN's
   own top corners — AdventureIntro.tsx's own .cv-intro-speak/.cv-intro-tool
   convention (docs/19 §4.2's "arriba están los botones"), restated here
   rather than the frame's own bottom corner this screen used pre-T36: the
   frame now sits at a bottom CORNER, not centred, so a corner-pinned pill
   would sit right on top of the octopus or the bubble depending on which
   corner. Never both in the SAME corner — skip stays at top-LEFT, speak at
   top-RIGHT, matching AdventureIntro's own split. NOTE: no backticks
   anywhere in this block — one inside a comment ends this template literal
   early (this file's own top-of-file note). */
.cv-prologue-speak { position: absolute; top: ${STAGE_MARGIN_PCT}%; right: ${STAGE_MARGIN_PCT}%; z-index: 2; }
.cv-prologue-skip { position: absolute; top: ${STAGE_MARGIN_PCT}%; left: ${STAGE_MARGIN_PCT}%; z-index: 2; display: flex; flex-direction: column; align-items: center; background: ${SHEET_PAPER}; border: 3px solid #1a1a1a; border-radius: 16px; padding: 6px 10px; cursor: pointer; }
.cv-prologue-skip .cv-caption { font-size: 14px; font-weight: 700; color: #1e293b; }
/* docs/25 P2-5 (tanda 1, item 1.3): the start tap. A browser will not speak
   before the page has seen a gesture, so on a first visit plate 0's line was
   silent. While audio is still locked, the WHOLE screen is one button (any
   tap starts, nothing to aim at) with the shipped round play-triangle button
   art (the same face as the levels' replay button) large in the middle; the
   skip pill stays above it (z-index 2) for the grown-up. No words. NO
   BACKTICKS in this block. */
.cv-prologue-start { position: absolute; inset: 0; z-index: 1; border: none; background: transparent; padding: 0; margin: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.cv-prologue-start-disc { display: block; width: clamp(120px, 24vmin, 200px); height: clamp(120px, 24vmin, 200px); animation: cv-prologue-start-pulse 1.8s ease-in-out infinite; }
@keyframes cv-prologue-start-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
@media (prefers-reduced-motion: reduce) {
  .cv-prologue-start-disc { animation: none; }
}
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

/** Whether the opening must wait for a start tap before its first plate
 *  (`docs/25` P2-5): exactly when the browser would still refuse to speak
 *  (`voice/narrator.ts`'s `canAutoSpeak`). Reached by a tap — a later visit,
 *  the dev route opened from a link the page already saw a tap on — this is
 *  `false` and the opening adds no step at all. */
export function prologueNeedsStartTap(audioUnlocked: boolean = canAutoSpeak()): boolean {
  return !audioUnlocked
}

/** The caretaker's opening (`docs/16` §4). Tapping the stage advances to the
 *  next plate; tapping the last one, or the skip control on ANY plate, ends
 *  the opening the same way — `onDone` — so the caller cannot distinguish
 *  "watched" from "skipped" (design.md D1). */
export default function PrologueOpening({ from, onDone }: PrologueOpeningProps) {
  const [index, setIndex] = useState(() => clampPlate(from))
  const plate = PROLOGUE_PLATES[index]
  // `docs/25` P2-5: locked until the start tap below, decided ONCE at mount.
  const [awaitingStart, setAwaitingStart] = useState(() => prologueNeedsStartTap())
  // The plate whose line the start tap itself spoke — its narration effect
  // must not speak it a second time (that effect's own cleanup would cancel
  // the tap's utterance and restart it mid-word).
  const [spokenByStart, setSpokenByStart] = useState<number | null>(null)

  // Voice narration (docs/18 D1, "sin voz no se entera de la historia"; T7):
  // every plate speaks its own line the instant it appears. The FIRST plate
  // can mount before any tap has happened at all, when the browser refuses
  // to speak — `docs/25` P2-5 found that line was then simply never heard.
  // That case now waits behind the start tap (`awaitingStart`), which speaks
  // the line itself, INSIDE the gesture (the one place every engine,
  // Safari included, is sure to allow it).
  useNarration(plate.line, { auto: !awaitingStart && spokenByStart !== index })

  const handleStart = (): void => {
    speak(plate.line)
    setSpokenByStart(index)
    setAwaitingStart(false)
  }

  // T36: always the LEFT corner — every plate stands the same caretaker
  // with the same stance, and `docs/16` names no reason for any plate to
  // stand on the other side (unlike an adventure's own per-line
  // `introStance`, which the story registry can opt into later if a future
  // plate ever needs it).
  const stance = resolvePulpitoStance(undefined)
  const octopusBox = octopusBoxAtCorner(ZOO_CARETAKER_ART, {
    corner: stance.corner,
    sizeBy: 'height',
    size: PROLOGUE_OCTOPUS_SIZE_PCT,
    bottom: 2,
    inset: OCTOPUS_CORNER_INSET,
  })
  const { placement, content } = placeAndFitBubble({
    frame: { w: 100, h: 100 },
    headBox: octopusBox,
    tail: ZOO_SPEECH_BUBBLE_TAIL,
    side: stanceBubbleSide(stance.corner),
    text: plate.line,
    art: plate.art,
  })

  const handleTap = (): void => {
    const next = advancePlate(index)
    if (next === null) onDone()
    else setIndex(next)
  }

  return (
    <main className="cv-prologue">
      <style>{PROLOGUE_CSS}</style>
      {/* docs/16 §4's own beat 0 brief: "el zoológico abierto y con
          animales" — the map art is the only shipped picture of the whole,
          populated zoo (`zoo/prologue.ts`'s own header on why no new art
          was commissioned for this). Shared, unchanged, across all three
          plates — the scene does not change while the caretaker talks, only
          the map itself does once the child reaches it for real. */}
      <img className="cv-prologue-backdrop" src={ZOO_MAP_ART.href} alt="" />
      <div className="cv-prologue-frame">
        <button type="button" className="cv-prologue-stage" onClick={handleTap}>
          <span className="cv-prologue-octopus" style={{ [stance.corner]: `${octopusBox.x}%` } as CSSProperties}>
            <img src={ZOO_CARETAKER_ART.href} alt="" className="cv-octopus-life" />
          </span>
          {/* Before the start tap the bubble is not shown yet: it pops in
              with the voice, so the line appears exactly when it is heard. */}
          {!awaitingStart && (
            <span
              className={`cv-prologue-bubble${placement.mirrored ? ' cv-prologue-bubble--mirror-x' : ''}`}
              style={{
                left: `${placement.left}%`,
                top: `${placement.top}%`,
                width: `${placement.width}%`,
                ...bubbleContentCssVars(placement, content, {
                  contentLeftFrac: CONTENT_LEFT_FRAC,
                  contentTopFrac: CONTENT_TOP_FRAC,
                  contentWidthFrac: CONTENT_WIDTH_FRAC,
                  gapFrac: GAP_FRAC,
                  contentHeightFrac: CONTENT_HEIGHT_FRAC,
                }),
              }}
            >
              {/* Keyed on the line itself (T8 item 2): a fresh key on every
                  plate forces React to remount this span, replaying the
                  pop-in — while `useNarration` above, unaffected by this
                  child remounting, keeps deciding on its own when to speak.
                  `transform-origin` is set inline to the tail tip's own
                  position within the box (`placement.tailOriginX/Y`), so the
                  pop-in grows OUT of the tail — out of the caretaker —
                  instead of the box's geometric centre. */}
              <span
                key={plate.line}
                className="cv-bubble-pop"
                style={{ transformOrigin: `${placement.tailOriginX}% ${placement.tailOriginY}%` }}
              >
                <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
                {/* `plate.art` absent (the first plate, docs/18 D3's own fix,
                    `zoo/prologue.ts`'s header) renders a TEXT-ONLY bubble —
                    `CaptionedArt` itself requires an `art` prop, so this plate
                    renders the caption directly instead, in `.cv-prologue-
                    bubble-text` rather than `.cv-captioned` (that class's own
                    header, above, on why a picture-less `.cv-captioned` fails
                    `captionAudit.ts` outright — this text is licensed through
                    `.cv-prologue-frame` instead, which already saw the big
                    caretaker's own `<img>` above). `screen/bubbleFit.ts`'s
                    art-absent case (already proven by `screen/Deduction.tsx`)
                    is what computed `content`'s placement either way. */}
                {plate.art ? (
                  <CaptionedArt
                    art={plate.art}
                    label={plate.line}
                    size={76}
                    className={content.layout === 'stack' ? 'cv-captioned--stack' : undefined}
                  />
                ) : (
                  <span className="cv-prologue-bubble-text">
                    <span className="cv-caption">{plate.line}</span>
                  </span>
                )}
              </span>
            </span>
          )}
        </button>
      </div>
      {awaitingStart ? (
        <button type="button" className="cv-prologue-start" aria-label="Empezar" onClick={handleStart}>
          <span className="cv-prologue-start-disc">
            <ReplayIcon />
          </span>
        </button>
      ) : (
        <SpeakButton line={plate.line} className="cv-prologue-speak" />
      )}
      {/* The "go to the map" skip control — a marker-style pill, always
          reachable (design.md D1/D8: the opening is never mandatory). Text
          + picture, never bare (`docs/12` §3, `detective/captionAudit.ts`):
          the map thumbnail is what the word "mapa" refers to. */}
      <button type="button" className="cv-prologue-skip" onClick={onDone}>
        <CaptionedArt art={ZOO_MAP_ART} label="Ir al mapa" size={28} />
      </button>
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
