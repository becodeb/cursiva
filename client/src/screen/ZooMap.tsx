// The zoo map (`docs/12_MAPA_DEL_ZOOLOGICO.md`, design.md §1-§7): one drawn
// illustration with registered layers on top, replacing the level-list entry
// screen. Every decision this screen shows lives in `zoo/sectors.ts` (or
// `zoo/stars.ts`/`zoo/backpack.ts`) as a named exported pure function — this
// component only reads them and draws. That split is not style: the harness
// is vitest in NODE ENV with no jsdom and no testing-library, so a decision
// taken inside a click handler is invisible to `renderToString`.
//
// No `url(#…)` anywhere: no `<defs>`, no `mask`, no `clipPath`, no `pattern`,
// no filter. Every picture is an `<image href="/art/…">`, the one mechanism
// that survives this repo's ban (`TraceCanvas.tsx:69-86` — it hydrates
// BLANK on real devices).
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import CaptionedArt from '../detective/CaptionedArt'
import { fitContentWithInsets, SHEET_PAPER } from '../canvas/TraceCanvas'
import {
  isPlaceholderArt,
  OCTOPUS_ART,
  ZOO_ANIMAL_ART,
  ZOO_BACKPACK_ART,
  ZOO_FOG_ART,
  ZOO_MAP_ART,
  ZOO_OCTOPUS_BACKPACK_ART,
  ZOO_OCTOPUS_PRINT_ART,
  ZOO_SPEECH_BUBBLE_ART,
  ZOO_STAR_ART,
  type ZooAnimalId,
} from '../detective/assets'
import { PlaceholderAnimalBadge, PawPrintIcon } from '../detective/icons'
import { hasOpenedNotebookOnce, markNotebookOpenedOnce } from './notebookDiscovery'
import RescueCelebration, { RESCUE_CELEBRATION_CSS } from './RescueCelebration'
import { BUBBLE_POP_CSS } from './BubblePop'
import { ZOO_SPEECH_BUBBLE_TAIL } from './bubblePlacement'
import { placeArt, type ArtBox } from '../canvas/placeArt'
import {
  flipDelta,
  prefersReducedMotion,
  RESCUE_FLIGHT_DURATION_MS,
  RESCUE_FLIGHT_VT_NAME,
  supportsViewTransitions,
  takeDeparture,
  viewBoxRectToScreenRect,
  type Rect as FlightRect,
} from '../zoo/rescueFlight'
import { isSectorDebug } from '../canvas/devMode'
import { earnedItems } from '../zoo/backpack'
import { STARS_VISIBLE_IN_HUD, recordSeenStars, seenStars, starsIncreased, totalStars } from '../zoo/stars'
import DetectiveNotebook from './DetectiveNotebook'
import {
  MAP_STAGE_BOX,
  overlapArea,
  PLAZA,
  PLAZA_CENTRE,
  SECTORS,
  animalPlacements,
  footprintTrail,
  hitCentre,
  isOpen,
  nextAdventure,
  pxToViewBoxUnits,
  recentlyDiscovered,
  stageRectToPercent,
  type FootprintMark,
  type Rect,
  type Records,
  type SectorId,
  type ZooSector,
} from '../zoo/sectors'
import {
  bubblePlacement,
  everyAdventureFiled,
  finaleBubblePlacement,
  mapBubble,
  type BubbleAnchor,
} from '../zoo/adventures'
import { nextJourneyStep } from '../zoo/journey'
import { getLevel } from '../levels/catalog'
import { canAutoSpeak, speak } from '../voice/narrator'
import VoiceToggle from '../voice/VoiceToggle'

/** How long the map bubble stays up before it hides itself, milliseconds
 *  (D4: it used to say the same thing forever with no way to dismiss it —
 *  `docs/18`). Tapping the Pulpito (`aria-label="Pulpito: escuchar de
 *  nuevo"`) shows it again for another window this same length. */
const BUBBLE_AUTO_HIDE_MS = 10000

/**
 * The finale (`promised-animals` task B, `docs/18` §4 "cumplir la promesa
 * del prólogo"): once `everyAdventureFiled` (`zoo/adventures.ts`) is true and
 * there is no spotlight step left (`nextJourneyStep` is `null`), the map's
 * own bubble used to go silent — `bubbleSector` falls back to
 * `recentlyDiscovered`, which is ALSO `null` in exactly this state (nothing
 * left is untouched, and nothing left has any unfiled adventure), so the
 * bubble simply never rendered and the story had no ending. This line, a
 * celebration picture (`ZOO_STAR_ART` — T36 follow-up, docs/18 D3: NOT the
 * caretaker's own portrait, which would duplicate the detective octopus
 * already standing full-body at `PLAZA_CENTRE` right below this bubble), and
 * a short `RescueCelebration` burst are what fill that gap — the Pulpito's
 * own closing word once there is truly nothing left to do in the whole zoo.
 * Copy approved verbatim (`odd/tasks/promised-animals.md` task B). */
const FINALE_LINE = '¡Volvieron todos los animales! Gracias por ayudarme a cuidar el zoológico.'

/** The measured edge colour of `zoo-map.png` (design.md §1) — the letterbox
 *  `xMidYMid meet` leaves on the outer `<svg>` is filled with this, never a
 *  third white (`docs/09` §7). */
const ZOO_BACKGROUND = '#76B56A'

/** T24: the rescue flight overlay's own render state — see this file's own
 *  hooks (below) for the two effects that drive `phase` from `'start'` to
 *  `'end'`, and `zoo/rescueFlight.ts`'s header for `mode`'s two values. */
interface RescueFlightState {
  art: { href: string; w: number; h: number }
  from: FlightRect
  mode: 'vt' | 'manual'
  phase: 'start' | 'end'
}

const ZOO_CSS = `
.cv-zoo { height: 100vh; height: 100dvh; overflow: hidden; background: ${ZOO_BACKGROUND}; position: relative; }
html, body, #root { margin: 0; height: 100%; }
/* T32 (odd/tasks/prewriting-stage-completion.md, docs/18 §7 N... "the map
   art fills the whole viewport at the minimum zoom"): the map used to be
   locked to a fixed 5:3 box (D4/D7's own aspect-ratio trick, removed here),
   centred in the viewport with flat green bands filling whatever the 5:3 box
   left over above/below or left/right — clearly visible at 1024x768 (a 4:3
   viewport). .cv-zoo-stage is now the WHOLE viewport instead, position:
   fixed's own T7-rework precedent (LevelPlay.tsx's .cv-sheet) restated as
   position: absolute; inset: 0 against .cv-zoo (position: relative, above) -
   the root <svg>'s own viewBox is what grows to cover it (this file's own
   displayBounds, canvas/TraceCanvas.tsx's fitContentWithInsets), never a CSS
   aspect-ratio box any more. Every registered layer (fog, footprints,
   animals, the spotlight ring/badge, the Pulpito and his bubble's tail
   anchor, the rescue landing spot) stays an ordinary child of this SAME
   <svg>, so it moves with the SAME shared transform by construction - never
   a second, independently-scaled overlay. */
.cv-zoo-stage { position: absolute; inset: 0; }
.cv-zoo-stage > svg { display: block; width: 100%; height: 100%; }
.cv-zoo-portrait-guidance { display: none; }
@media (max-width: 559px) and (orientation: portrait) {
  .cv-zoo-stage { display: none; }
  .cv-zoo-portrait-guidance { height: 100%; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px; border: 2px dashed #94a3b8; border-radius: 20px; background: rgba(255,255,255,0.72); color: #1e293b; line-height: 1.3; text-align: center; font-weight: 700; }
  .cv-zoo-portrait-guidance::before { content: "Girá el dispositivo"; display: block; font-size: 30px; margin-bottom: 8px; }
  .cv-zoo-portrait-guidance::after { content: "Para recorrer el zoológico cómodo, usá el juego en horizontal."; display: block; color: #475569; font-size: 18px; font-weight: 600; }
}
.cv-zoo-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.cv-zoo-sector-control:focus-visible .cv-zoo-sector-hit { stroke: #1d4ed8; stroke-width: 8; stroke-dasharray: 18 12; }
.cv-zoo-octopus-control { cursor: pointer; }
.cv-zoo-octopus-control:focus-visible { outline: 4px solid #1d4ed8; outline-offset: 6px; }
.cv-zoo-hud { position: absolute; inset: 0; display: flex; justify-content: space-between; align-items: flex-start; padding: 2% 3%; box-sizing: border-box; pointer-events: none; }
.cv-zoo-hud-left, .cv-zoo-hud-right, .cv-zoo-hud-right-group { display: flex; align-items: center; gap: 6px; pointer-events: auto; }
/* Each HUD group is a pill so it reads as interface, not as scenery: bare
   portraits at the top centre were drawn straight over the montanas and the
   animals standing there (measured at 1024x768 once five animals were back),
   and the snake alone rendered 173px wide at height 40 (aspect 4.32). Square
   30px boxes with object-fit keep every portrait the same footprint.

   T7 rework #2 (orchestrator review, "restyle them to the same marker
   style as the level chrome and the sound button"): warm paper fill and a
   thick dark outline instead of a translucent white pill with a drop
   shadow, matching screen/LevelPlay.tsx's own .cv-result-pill and
   voice/SpeakButton.tsx's restyle — the shadow drops outright per
   docs/09_GUIA_DE_ESTILO_VISUAL.md section 1 (flat fills, no
   sombreado/volumen/brillo). SHEET_PAPER is imported rather than restated
   as a literal here, unlike SpeakButton.tsx's own restatement: this file
   already imports across the canvas/ boundary (placeArt, devMode) so a
   third import adds no new layering, where voice/ deliberately stays a
   leaf module.

   T23 (odd/tasks/prewriting-stage-completion.md, docs/19 §5.3): the
   "recovered animals" pill (.cv-zoo-hud-mid) is GONE — the map already
   stands every recovered animal at its own spot, and the notebook
   (DetectiveNotebook.tsx, opened from the backpack pill below) now says
   the same thing at a size a child can actually read. Nothing here
   replaces its old middle slot; .cv-zoo-hud keeps working as a two-item
   space-between row (backpack / mute+star) exactly like justify-content:
   space-between already assumed for the common case (this pill and
   .cv-zoo-hud-right-group opposite it) — an empty middle slot was never
   load-bearing for that layout.
   NO BACKTICKS in this block -- one inside a comment ends this template
   literal early (this file's own top-of-file note). */
.cv-zoo-hud-left, .cv-zoo-hud-right { background: ${SHEET_PAPER}; border: 3px solid #1a1a1a; border-radius: 999px; padding: 4px 10px; }
.cv-zoo-hud-left img { width: 30px; height: 30px; object-fit: contain; }
/* The backpack pill is now a real <button> (T23: it opens the notebook) —
   reset the browser's own button chrome so it keeps reading as the exact
   same pill it always was. position: relative (T31) is what lets the
   receive badge (below) overlay the pill itself, the same reason
   .cv-zoo-hud-right sets it for the star spark. */
.cv-zoo-hud-left { cursor: pointer; font: inherit; position: relative; }
/* T31 (odd/tasks/prewriting-stage-completion.md, notebook discoverability):
   "no sabia que esto existia" - the backpack pill opened the notebook
   already but nothing on screen ever pointed at it.

   The PERSISTENT pulse (showBackpackPulse, ZooMap.tsx): a soft glow ring
   that keeps breathing until the child opens the notebook once, ever
   (screen/notebookDiscovery.ts). box-shadow rather than a border/outline
   change: it never affects the pill's own layout box or the HUD row beside
   it.

   The one-shot RECEIVE bounce (backpackReceived): plays once per rescue,
   discovered or not - a satisfying "it landed in the bag" flourish, timed
   to settle just as .cv-zoo-backpack-badge's own pop finishes.

   NO BACKTICKS in this block -- one inside a comment ends this template
   literal early (this file's own top-of-file note). */
@keyframes cv-zoo-backpack-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(242, 211, 119, 0.75); }
  50% { box-shadow: 0 0 0 10px rgba(242, 211, 119, 0); }
}
.cv-zoo-hud-left--pulse { animation: cv-zoo-backpack-pulse 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cv-zoo-hud-left--pulse { animation: none; box-shadow: 0 0 0 4px rgba(242, 211, 119, 0.9); }
}
@keyframes cv-zoo-backpack-bounce {
  0% { transform: scale(1) rotate(0deg); }
  30% { transform: scale(1.24) rotate(-6deg); }
  55% { transform: scale(0.94) rotate(4deg); }
  100% { transform: scale(1) rotate(0deg); }
}
.cv-zoo-backpack-receive { animation: cv-zoo-backpack-bounce 900ms ease-out; }
@media (prefers-reduced-motion: reduce) { .cv-zoo-backpack-receive { animation: none; } }
.cv-zoo-backpack-badge {
  position: absolute; top: -6px; right: -6px; width: 22px; height: 22px;
  background: #f2d377; border: 2px solid #1a1a1a; border-radius: 50%; padding: 3px; box-sizing: border-box;
  animation: cv-zoo-backpack-badge-pop 900ms ease-out;
}
@keyframes cv-zoo-backpack-badge-pop {
  0% { transform: scale(0); opacity: 0; }
  40% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) { .cv-zoo-backpack-badge { animation: none; } }
/* T8 item 3 (odd/tasks/prewriting-stage-completion.md): the star pill pops
   and flashes once, the instant stars reads higher than the session
   remembers (zoo/stars.ts's starsIncreased/seenStars — ZooMap remounts
   fresh on every map visit, so this is what makes "you just earned a star"
   survive the trip back from a level). position: relative here is what lets
   .cv-zoo-star-spark (below) overlay the pill rather than the whole HUD
   row. NO BACKTICKS in this block — one inside a comment ends this
   template literal early (this file's own top-of-file note). */
.cv-zoo-hud-right { position: relative; }
.cv-zoo-star-pop > svg { animation: cv-zoo-star-pop-scale 450ms ease-out; transform-origin: 50% 50%; }
@keyframes cv-zoo-star-pop-scale {
  0% { transform: scale(1); }
  45% { transform: scale(1.45); }
  100% { transform: scale(1); }
}
.cv-zoo-star-spark { position: absolute; inset: -8px; border-radius: 999px; pointer-events: none; opacity: 0; background: radial-gradient(circle, rgba(242, 211, 119, 0.9) 0%, rgba(242, 211, 119, 0) 70%); animation: cv-zoo-star-spark-flash 550ms ease-out; }
@keyframes cv-zoo-star-spark-flash {
  0% { opacity: 0; transform: scale(0.5); }
  35% { opacity: 0.9; transform: scale(1.1); }
  100% { opacity: 0; transform: scale(1.5); }
}
@media (prefers-reduced-motion: reduce) {
  .cv-zoo-star-pop > svg { animation: none; }
  .cv-zoo-star-spark { display: none; }
}
/* T7 (docs/18 D1/§3): the mute toggle sits beside the star pill rather than
   INSIDE it — .cv-zoo-hud-right-group is the actual space-between child now
   (replacing .cv-zoo-hud-right in that role), a plain flex row with no pill
   of its own, so the star keeps its EXACT existing pill (unchanged
   selector, unchanged look) and the toggle reads as its own separate round
   control right next to it — never a pill nested inside another pill,
   and never covering the star count, the recovered-animals pill, or the
   backpack (docs/18's own HUD layout, untouched by this addition). No rule
   of its own beyond the shared one above: a flex row sized to its own two
   children's content, never stretched, so there is no extra main-axis
   space for a justify-content of its own to act on. NOTE: no backticks
   anywhere in this block — ZOO_CSS is a template literal, same reason this
   file's own header states. */
/* The spotlight (T4, D5): a dim layer covers the whole stage except an
   ellipse around the next destination's own hit-rect, so exactly one place
   on the map reads as "go here" - drawn as ONE even-odd path
   (spotlightHolePath, below), never a mask or a clip-path (this repo's own
   scar, TraceCanvas.tsx's header). The ring and badge around the hole are
   plain shapes, referencing no def. */
.cv-zoo-spotlight-ring { animation: cv-zoo-spotlight-pulse 1.6s ease-in-out infinite; }
@keyframes cv-zoo-spotlight-pulse {
  0%, 100% { opacity: 0.55; stroke-width: 6; }
  50% { opacity: 1; stroke-width: 10; }
}
@media (prefers-reduced-motion: reduce) { .cv-zoo-spotlight-ring { animation: none; opacity: 0.85; } }
/* The badge's bounce animates an INNER g's CSS transform, never the OUTER
   g's: the outer one carries the positional transform="translate(...)"
   ATTRIBUTE that places the badge at the hit's centre, and a CSS transform
   on the SAME element replaces that attribute outright rather than
   composing with it - a real defect class in this codebase (the node jumps
   to the origin for the animation's duration). Nesting the animated
   element one level inside the positioned one keeps the two from ever
   fighting over the same transform. */
.cv-zoo-spotlight-badge { animation: cv-zoo-spotlight-bounce 1.2s ease-in-out infinite; }
@keyframes cv-zoo-spotlight-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@media (prefers-reduced-motion: reduce) { .cv-zoo-spotlight-badge { animation: none; } }
/* The map bubble (docs/18 D4): sized ~24% of the stage width and positioned
   in one of four fixed quadrants around the Pulpito (bubblePlacement,
   zoo/adventures.ts), chosen at render time so it never sits on top of the
   sector the spotlight is pointing at and never runs off the stage.
   Position (left/top/width/height) is therefore an INLINE style computed
   from bubblePlacement's own returned box - a static rule cannot know which
   sector is being pointed at - while mirroring/flipping and the caption's
   own inset stay plain class rules below, keyed off the anchor's two
   modifier classes.
   container-type: inline-size makes the bubble its own query container, so
   everything inside it can be sized in cqw (percent of the BUBBLE's width,
   itself a percent of the stage) and nothing inside needs a px length -
   unchanged from the single-placement version this replaces. */
.cv-zoo-bubble { position: absolute; container-type: inline-size; isolation: isolate; }
/* T8 item 2: the bubble's own pop-in (BubblePop.ts). Applied directly to
   .cv-zoo-bubble-dismiss — unlike the three stage screens' own bubble box,
   this one carries no static positional transform of its own (its own
   mirror/flip rules below target the nested img instead), so there is no
   composition fight to nest around. NO BACKTICKS in this block — one
   inside a comment ends this template literal early. */
${BUBBLE_POP_CSS}
/* The finale's star burst sits BEHIND the bubble's own picture: the stars
   were sized for the closing screen's large bubble, and on the map's smaller
   one a star landed on the caption itself (measured: over "cuidar" at
   1280x720). Behind the white oval, the stars that fall inside it vanish and
   only the ones around its edge show. isolation on the bubble keeps the
   negative z-index from sinking below the map. */
.cv-zoo-bubble .cv-rescue-celebration { z-index: -1; }
.cv-zoo-bubble-dismiss { position: absolute; inset: 0; display: block; width: 100%; height: 100%; margin: 0; padding: 0; border: none; background: none; cursor: pointer; }
.cv-zoo-bubble-dismiss > img { display: block; width: 100%; height: 100%; }
/* The tail is NOT at the file's own centre: it hangs at ~10% of the width,
   near the bottom ~18% of the height. A bubble placed to the LEFT of the
   Pulpito needs its tail on its own RIGHT side to point at him - the
   mirrored (scaleX(-1)) position; one placed BELOW him needs the tail at
   the TOP rather than the bottom - the vertically flipped (scaleY(-1))
   position. The two modifiers compose (a below-left bubble mirrors AND
   flips) rather than needing a fourth, hand-authored transform. */
.cv-zoo-bubble--mirror-x .cv-zoo-bubble-dismiss > img { transform: scaleX(-1); }
.cv-zoo-bubble--flip-y .cv-zoo-bubble-dismiss > img { transform: scaleY(-1); }
.cv-zoo-bubble--mirror-x.cv-zoo-bubble--flip-y .cv-zoo-bubble-dismiss > img { transform: scale(-1, -1); }
/* The oval's readable interior, inset from the drawn outline on all four
   sides. The tail occupies the bottom ~18% of the file when unflipped,
   which is why the box spans 14%-74% rather than filling the bubble - that
   centres the print and the phrase on the OVAL, not on the image box. A
   flipped bubble (the tail now at the TOP) needs the same inset mirrored
   top-to-bottom, so the oval stays centred under the flip too. */
.cv-zoo-bubble .cv-captioned { position: absolute; left: 8%; right: 8%; top: 14%; height: 60%; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4cqw; }
.cv-zoo-bubble--flip-y .cv-captioned { top: 26%; }
/* width: auto lets the viewBox carry the aspect ratio, the same override
   Deduction.tsx's own .cv-captioned > svg rule already uses. flex: none
   keeps the print from being squeezed to a sliver by the phrase beside it -
   which is exactly what it rendered as before, 19 units wide next to a
   40-character phrase. */
.cv-zoo-bubble .cv-captioned > svg { width: auto; height: 62%; flex: none; }
/* No font-family: .cv-caption inherits Nunito from the document root
   (docs/09 section 8), the same way PistasRail's words do. The size is cqw
   so the phrase tracks the bubble, which tracks the stage - a px value would
   be right at exactly one viewport and wrong at every other. */
.cv-zoo-bubble .cv-caption { font-size: 6.4cqw; line-height: 1.16; font-weight: 700; color: #1e293b; text-align: left; }
/* The ONE thing this screen moves by itself (docs/12 §3, §4): the
   newly-discovered sector's fog fades once, opacity only. Mirrors
   HomeScreen.tsx:88-104's HOME_CSS shape exactly, including the
   reduced-motion override. */
@keyframes cv-zoo-fog-fade {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
.cv-zoo-fog-lift { animation: cv-zoo-fog-fade 1.5s ease-out forwards; }
@media (prefers-reduced-motion: reduce) { .cv-zoo-fog-lift { animation: none; } }
/* The finale's own short star burst (promised-animals task B): the SAME
   rules AdventureClosing's rescue beat uses, shared through
   RescueCelebration.tsx rather than duplicated here - see that module's own
   header for why position: absolute; inset: 0 scales itself to whichever
   positioned ancestor it is mounted in (here, .cv-zoo-bubble itself, so the
   burst reads as scattered around the finale bubble). NOTE: no backticks in
   this comment either, same reason as the note right below it. */
${RESCUE_CELEBRATION_CSS}
/* T24 (docs/19 section 6, "Aventura -> mapa (rescate)"): the rescued
   animal's own flight overlay - see zoo/rescueFlight.ts's own header for why
   this is a plain fixed-position HTML img instead of the permanent SVG
   image already sitting at its landing spot (recovered.map, above). Fixed
   (viewport) positioning, not absolute against this stage: the measured
   departure rect and the svg's own getBoundingClientRect are both in
   viewport pixels. pointer-events: none so the flight never blocks a tap on
   the map underneath it, satisfying the task's own "must not block input
   for more than the animation" - there IS no input blocking, whatever the
   duration. The animation-duration override below matches a supporting
   browser's own timing to RESCUE_FLIGHT_DURATION_MS - the UA stylesheet
   default for ::view-transition-group is a flat 250ms, shorter than this
   flight is meant to read. */
.cv-zoo-rescue-flight { position: fixed; pointer-events: none; z-index: 20; }
::view-transition-group(${RESCUE_FLIGHT_VT_NAME}) { animation-duration: ${RESCUE_FLIGHT_DURATION_MS}ms; }
::view-transition-old(${RESCUE_FLIGHT_VT_NAME}), ::view-transition-new(${RESCUE_FLIGHT_VT_NAME}) { animation-duration: ${RESCUE_FLIGHT_DURATION_MS}ms; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(${RESCUE_FLIGHT_VT_NAME}) { animation: none !important; }
}
/* NOTE: no backticks anywhere in this block - ZOO_CSS is a template
   literal, and one backtick in a CSS comment ends the string. */
`

/**
 * The class a fog patch renders with. Exported and pure so the fade rule can
 * be tested directly against hand-built `ZooSector` data: under the CURRENT
 * registry `recentlyDiscovered` only ever resolves to the estanque (design.md
 * §5, D4's seed), and the estanque starts OPEN, so it never actually carries
 * fog to attach this class to. The scenario this proves (zoo-map spec "Fog
 * Fade Motion") becomes observable end-to-end once paso D adds a second
 * sector that can be closed-then-discovered; until then this function is the
 * honest, directly-testable half of the mechanism.
 */
export function fogClassFor(sectorId: SectorId, discovered: ZooSector | null): string {
  return discovered?.id === sectorId ? 'cv-zoo-fog cv-zoo-fog-lift' : 'cv-zoo-fog'
}

/** Pad around the target hit-rect the spotlight's own hole extends by,
 *  viewBox units — big enough that the ring and badge (drawn just outside
 *  the hole) never overlap the hit's own edge. */
const SPOTLIGHT_PAD = 30

/**
 * The spotlight's own dim layer, as a single even-odd `d` attribute: the
 * whole outer rect, minus an ellipse around `hit` (padded by `SPOTLIGHT_PAD`).
 * Two arcs (`A rx ry 0 1 0 …`, twice) draw a closed ellipse without a second
 * `<circle>`/`<ellipse>` element, so the hole and the outer rect stay ONE
 * `<path>` — never a `<mask>`/`<clipPath>` (`TraceCanvas.tsx`'s header,
 * restated at this file's own). Exported and pure so the hole's geometry —
 * centred on the hit, sized from it — is directly testable without a
 * renderer.
 *
 * `outer` (T32, `odd/tasks/prewriting-stage-completion.md`, full-bleed map)
 * defaults to `MAP_STAGE_BOX`, the fixed 1000×600 stage every pre-T32 caller
 * (including this file's own tests) assumed — so a bare
 * `spotlightHolePath(hit)`/`spotlightHolePath(hit, pad)` call stays
 * byte-identical. `screen/ZooMap.tsx`'s own render passes `displayBounds`
 * explicitly: once the root `<svg>`'s viewBox grows past the stage to cover
 * a wider/taller container, the dim layer has to grow with it too, or the
 * newly-revealed strip of art at the edge would render UNDIMMED — the same
 * "everything but the hole is dim" invariant this whole function exists for,
 * just no longer bounded by a constant.
 */
export function spotlightHolePath(hit: Rect, pad = SPOTLIGHT_PAD, outer: ArtBox = MAP_STAGE_BOX): string {
  const { x: cx, y: cy } = hitCentre(hit)
  const rx = hit.w / 2 + pad
  const ry = hit.h / 2 + pad
  const outerPath = `M ${outer.x} ${outer.y} H ${outer.x + outer.width} V ${outer.y + outer.height} H ${outer.x} Z`
  const hole = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
  return `${outerPath} ${hole}`
}

/** The pulsing ring drawn just outside the spotlight's own hole — a plain
 *  `<ellipse>`, never a `url(#…)` reference. `cv-zoo-spotlight-ring`'s own
 *  animation (`ZOO_CSS`) only touches `opacity`/`stroke-width`, never
 *  `transform`, so it carries no risk of clobbering a positional transform
 *  attribute (unlike the badge below, which needs the extra nesting for
 *  exactly that reason). */
function SpotlightRing({ hit, pad = SPOTLIGHT_PAD }: { hit: Rect; pad?: number }) {
  const { x: cx, y: cy } = hitCentre(hit)
  return (
    <ellipse
      className="cv-zoo-spotlight-ring"
      cx={cx}
      cy={cy}
      rx={hit.w / 2 + pad}
      ry={hit.h / 2 + pad}
      fill="none"
      stroke="#ffe066"
      strokeWidth={8}
    />
  )
}

/** The play badge's own drawn radius (`SpotlightBadge`'s circle `r`), named
 *  so `playBadgePlacement`'s own overlap test reasons about the SAME
 *  footprint the badge actually draws instead of a second guessed number. */
const SPOTLIGHT_BADGE_RADIUS = 30

/** T36 (`odd/tasks/prewriting-stage-completion.md`): the smallest real
 *  on-screen gap the badge's own drawn edge keeps from the viewport's own
 *  edge, at every required viewport — `playBadgePlacement`'s own header on
 *  why this is expressed in real px rather than a viewBox-unit constant. */
const BADGE_MIN_EDGE_MARGIN_PX = 12

/** Compass points around `SpotlightRing`'s own ellipse (`hit.w/2 + pad`,
 *  `hit.h/2 + pad`) `playBadgePlacement` tries, in order, once the hit's own
 *  centre is occupied — 0° is "along +x" (screen-right), so the FIRST clear
 *  point is usually the one furthest from whatever animal already stands
 *  near the sector's own left/centre (`animalSpot` is rarely past the hit's
 *  own right edge). */
const BADGE_RING_ANGLES_DEG = [0, 45, -45, 90, -90, 135, -135, 180]

function badgeBoxAt(at: { x: number; y: number }, radius: number): Rect {
  return { x: at.x - radius, y: at.y - radius, w: radius * 2, h: radius * 2 }
}

/**
 * N4 (`odd/tasks/prewriting-stage-completion.md` T32, `docs/18` §7: "el botón
 * verde de jugar del mapa queda encima del pato cuando el foco está en la
 * laguna"): the green play badge must never sit on top of a rescued animal.
 * `hitCentre(hit)` — the badge's own placement before this task — coincides
 * with, or sits close enough to overlap, several sectors' `animalSpot`
 * (`zoo/sectors.ts`: `bosque`/`montañas`/`arena`/`nocturna` all default
 * `animalSpot` to `hitCentre`, and the estanque's own `animalSpot` sits close
 * enough beside its `hitCentre` that the duck's own box still reaches it —
 * measured directly: a 30-radius badge at `hitCentre(ESTANQUE_HIT)` overlaps
 * the duck's box by a real, non-zero sliver).
 *
 * T36 (`odd/tasks/prewriting-stage-completion.md`, "the badge never touches
 * the viewport edge"): before this, NEITHER the hit's own centre NOR any
 * ring candidate was ever checked against the stage's own bounds — only
 * against `avoid` — so a sector whose hit sits near an edge (the lagoon, at
 * 1024×768: measured, the badge's own right edge landed exactly on the
 * screen's right border) could return a point the drawn badge spills out of.
 * `outer` (`ArtBox`, defaulting to `MAP_STAGE_BOX` — the same pre-T32
 * default `spotlightHolePath` already uses) and `edgeMargin` (viewBox units,
 * defaulting to `0` — a bare two-argument call stays byte-identical to every
 * pre-T36 caller/test) together define the SAFE inner box a candidate's own
 * centre must land inside: `radius + edgeMargin` from every side of `outer`,
 * so the badge's own DRAWN edge — not just its centre — clears `outer` by at
 * least `edgeMargin`. `screen/ZooMap.tsx`'s own render is what converts a
 * real 12px screen margin into `edgeMargin`'s own viewBox-unit scale
 * (`pxToViewBoxUnits`, `zoo/sectors.ts`).
 *
 * Tries the hit's own centre FIRST — unchanged whenever nothing occupies it
 * and it is already in-bounds, so this is a no-op for the common case — then
 * eight points around `SpotlightRing`'s own ellipse in turn
 * (`BADGE_RING_ANGLES_DEG`), preferring one that is BOTH clear of every
 * `avoid` box AND inside the safe box. If none qualifies, the least-overlap
 * candidate among whichever are in-bounds wins (or, failing that, the
 * least-overlap candidate overall) — the same "never leave it undefined"
 * fallback `bubblePlacement` (`zoo/adventures.ts`) already uses — and its
 * own position is then CLAMPED into the safe box, so the function's return
 * value is guaranteed in-bounds even in that worst case. Pure and exported
 * so `ZooMap.test.tsx` can assert it directly against real sector/animal
 * data, no renderer needed.
 */
export function playBadgePlacement(
  hit: Rect,
  avoid: readonly Rect[],
  radius: number = SPOTLIGHT_BADGE_RADIUS,
  pad: number = SPOTLIGHT_PAD,
  outer: ArtBox = MAP_STAGE_BOX,
  edgeMargin: number = 0,
): { x: number; y: number } {
  const centre = hitCentre(hit)
  const totalOverlap = (at: { x: number; y: number }) =>
    avoid.reduce((sum, box) => sum + overlapArea(badgeBoxAt(at, radius), box), 0)

  const inset = radius + edgeMargin
  // A degenerate `outer` narrower/shorter than two insets (never a real map
  // stage, only a defensive floor) still returns a finite point at the
  // safe box's own midline rather than an inverted [min, max] range.
  const minX = outer.x + Math.min(inset, outer.width / 2)
  const maxX = outer.x + outer.width - Math.min(inset, outer.width / 2)
  const minY = outer.y + Math.min(inset, outer.height / 2)
  const maxY = outer.y + outer.height - Math.min(inset, outer.height / 2)
  const inBounds = (at: { x: number; y: number }) => at.x >= minX && at.x <= maxX && at.y >= minY && at.y <= maxY
  const clamp = (at: { x: number; y: number }) => ({
    x: Math.min(Math.max(at.x, minX), maxX),
    y: Math.min(Math.max(at.y, minY), maxY),
  })

  const rx = hit.w / 2 + pad
  const ry = hit.h / 2 + pad
  const ringCandidates = BADGE_RING_ANGLES_DEG.map((deg) => {
    const rad = (deg * Math.PI) / 180
    return { x: centre.x + rx * Math.cos(rad), y: centre.y + ry * Math.sin(rad) }
  })
  const candidates = [centre, ...ringCandidates]

  const clear = candidates.find((at) => totalOverlap(at) === 0 && inBounds(at))
  if (clear) return clear

  const inBoundsCandidates = candidates.filter(inBounds)
  const pool = inBoundsCandidates.length > 0 ? inBoundsCandidates : candidates
  const best = pool.reduce((min, at) => (totalOverlap(at) < totalOverlap(min) ? at : min))
  return clamp(best)
}

/** The round "play" badge, placed at `at` (`playBadgePlacement`'s own
 *  answer). The bounce animation (`cv-zoo-spotlight-badge`, `ZOO_CSS`) lands
 *  on an INNER `<g>` with no `transform` attribute of its own — the OUTER
 *  `<g>` carries the positional `transform="translate(...)"` attribute that
 *  places the whole badge at `at`, and a CSS `transform` animated on that
 *  SAME element would replace the attribute outright rather than compose
 *  with it (`ZOO_CSS`'s own comment on this exact defect class). */
function SpotlightBadge({ at }: { at: { x: number; y: number } }) {
  return (
    <g transform={`translate(${at.x.toFixed(2)} ${at.y.toFixed(2)})`}>
      <g className="cv-zoo-spotlight-badge">
        <circle r={SPOTLIGHT_BADGE_RADIUS} fill="#22c55e" stroke="#ffffff" strokeWidth={4} />
        <path d="M -9 -14 L -9 14 L 15 0 Z" fill="#ffffff" />
      </g>
    </g>
  )
}

/** The bubble's own modifier classes for `anchor`: `cv-zoo-bubble--mirror-x`
 *  for the two LEFT anchors (the tail needs to move to the box's own RIGHT
 *  side to point at the Pulpito, who sits to their right) and
 *  `cv-zoo-bubble--flip-y` for the two BELOW anchors (the tail needs to move
 *  from the bottom of the file to the top). `ZOO_CSS`'s own compound
 *  selector composes both for the one anchor (`below-left`) that needs
 *  them together, so this never has to special-case a fourth transform. */
function bubbleClassName(anchor: BubbleAnchor): string {
  const classes = ['cv-zoo-bubble']
  if (anchor === 'above-left' || anchor === 'below-left') classes.push('cv-zoo-bubble--mirror-x')
  if (anchor === 'below-left' || anchor === 'below-right') classes.push('cv-zoo-bubble--flip-y')
  return classes.join(' ')
}

/** T16 (odd/tasks/prewriting-stage-completion.md): the tail tip's own
 *  position within the bubble's box, as a CSS `transform-origin` pair — so
 *  `cv-bubble-pop`'s pop-in (`BubblePop.ts`) grows OUT of the tail, out of
 *  the Pulpito, instead of the box's geometric centre. Mirrors exactly what
 *  `ZOO_CSS`'s own `.cv-zoo-bubble--mirror-x`/`--flip-y` rules do to the
 *  rendered `<img>`, restated here in percent instead of a CSS transform:
 *  a mirrored bubble moves the tail from `tailX` to `1 - tailX`; a flipped
 *  one moves it from `tailY` to `1 - tailY`. Pure and directly testable
 *  against `bubbleClassName`'s own four cases, so the two never drift apart
 *  the way a hand-written fourth transform would risk. */
export function tailOriginFor(anchor: BubbleAnchor): { x: number; y: number } {
  const mirrored = anchor === 'above-left' || anchor === 'below-left'
  const flipped = anchor === 'below-left' || anchor === 'below-right'
  const x = (mirrored ? 1 - ZOO_SPEECH_BUBBLE_TAIL.tailX : ZOO_SPEECH_BUBBLE_TAIL.tailX) * 100
  const y = (flipped ? 1 - ZOO_SPEECH_BUBBLE_TAIL.tailY : ZOO_SPEECH_BUBBLE_TAIL.tailY) * 100
  return { x, y }
}

/** One footprint, centred on its own point and rotated to face the walked
 *  direction (`zoo/sectors.ts`'s `PRINT_FACING`) — origin-centred exactly
 *  like every other repeated mark in this repo (`docs/09` §3). Rendered at
 *  36 units tall: design.md §5's original ~26 put the print at 13.6 units
 *  WIDE (the art is 134×256), and a 13-unit mark on a 1000-unit stage does
 *  not register as a track to a five-year-old. At 36 the print is ~19 wide
 *  against `PRINT_OFFSET`'s ±12 stagger, so consecutive prints still read
 *  as alternating left/right rather than as one dotted line — `docs/09` §5
 *  is explicit that the alternation is what makes a track read as walking,
 *  and that is a screenshot check, not a test one. */
function Footprint({ x, y, angle }: FootprintMark) {
  const height = 36
  const width = (height * ZOO_OCTOPUS_PRINT_ART.w) / ZOO_OCTOPUS_PRINT_ART.h
  return (
    <image
      href={ZOO_OCTOPUS_PRINT_ART.href}
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      transform={`rotate(${angle.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}
      preserveAspectRatio="xMidYMid meet"
    />
  )
}


const SECTOR_LABELS: Record<SectorId, string> = {
  entrada: 'Entrada',
  bosque: 'Bosque',
  estanque: 'Estanque',
  montanas: 'Montañas',
  arena: 'Arena',
  nocturna: 'Nocturna',
  sendero: 'Sendero',
}

function sectorActionLabel(sector: ZooSector, records: Records): string {
  const next = nextAdventure(sector, records)
  const nextTitle = next ? getLevel(next)?.title ?? next : null
  return nextTitle
    ? `Entrar a ${SECTOR_LABELS[sector.id]}. Próximo juego: ${nextTitle}.`
    : `${SECTOR_LABELS[sector.id]} todavía no tiene una aventura disponible.`
}

function activateSector(sector: ZooSector, records: Records, onEnter: (levelId: string) => void): void {
  const next = nextAdventure(sector, records)
  if (next) onEnter(next)
}

export interface ZooMapProps {
  /** The persisted level records, straight from `cursiva.levels.v1`. Passed
   *  in rather than read here so this screen stays renderable in the node
   *  test harness, where there is no `localStorage` (same convention
   *  `HomeScreen` used). */
  records: Records
  /** Tapping an open sector's hit-rect. Carries the resolved adventure id
   *  directly — `App` hands it straight to the game shell without
   *  re-deriving anything, the same shape `HomeScreen`'s `onEnter` used. */
  onEnter: (levelId: string) => void
  /** Override for `isSectorDebug(window.location.search)` — undefined in
   *  every real caller, which falls through to the window read below.
   *  Exists ONLY so `ZooMap.test.tsx` can exercise the debug overlay without
   *  touching `window` at all (this harness is node-env, no DOM, no
   *  `window` — the same reason `GameScreen`'s `initial` prop exists
   *  instead of every caller relying on its own internal window read). */
  debug?: boolean
}

/**
 * T24: the flight overlay's own inline style for the current render — the
 * one piece of this feature that is genuinely DOM/presentation glue rather
 * than portable math (`zoo/rescueFlight.ts`'s own header on why the REAL
 * math — `viewBoxRectToScreenRect`, `flipDelta` — lives there instead,
 * directly tested). Two branches, matching `RescueFlightState.mode`:
 *
 * - `'vt'`: plain `left`/`top`/`width`/`height` at whichever rect the
 *   current `phase` names — `document.startViewTransition` (this file's own
 *   effect) is what actually animates the MOVE between the two renders this
 *   produces; this function never touches `transform` in that branch, so
 *   there is nothing here to fight the browser's own interpolation.
 * - `'manual'`: always laid out AT `to` (the landing spot), with `transform`
 *   carrying the FLIP invert (`flipDelta`) during `'start'` and the
 *   identity during `'end'` — a CSS `transition` on `transform` alone
 *   (composited, no layout/paint per frame) is what animates the move.
 */
function rescueFlightOverlayStyle(flight: RescueFlightState, to: FlightRect): CSSProperties {
  const shared: CSSProperties = { viewTransitionName: RESCUE_FLIGHT_VT_NAME } as CSSProperties
  if (flight.mode === 'vt') {
    const rect = flight.phase === 'start' ? flight.from : to
    return { ...shared, left: rect.x, top: rect.y, width: rect.width, height: rect.height, transition: 'none' }
  }
  const delta = flipDelta(flight.from, to)
  return {
    ...shared,
    left: to.x,
    top: to.y,
    width: to.width,
    height: to.height,
    transformOrigin: '0 0',
    transform:
      flight.phase === 'start'
        ? `translate(${delta.translateX}px, ${delta.translateY}px) scale(${delta.scaleX}, ${delta.scaleY})`
        : 'translate(0px, 0px) scale(1, 1)',
    transition:
      flight.phase === 'end' ? `transform ${RESCUE_FLIGHT_DURATION_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)` : 'none',
  }
}

export default function ZooMap({ records, onEnter, debug }: ZooMapProps) {
  // `?debug=sectores` reads the SAME guard `App.tsx`/`GameScreen.tsx` already
  // use for `window.location.search` under SSR (design.md §5) — and is
  // deliberately NOT gated by `isDevMode()`: it must paint the EXACT build a
  // reviewer is screenshotting.
  const resolvedDebug =
    debug ?? isSectorDebug(typeof window === 'undefined' ? '' : window.location.search)
  // The ONE-SHOT fog-fade class (`fogClassFor`, above) keeps reading
  // `recentlyDiscovered` untouched — T4 only changes what the SPOTLIGHT and
  // the BUBBLE point at, never this pre-existing animation trigger.
  const discovered = recentlyDiscovered(records)
  // T4's own fix (`docs/18` D4/D5/D28, the "after the sheep it still says
  // pato" defect): the map's spotlight, footprints and bubble all point at
  // the STORY's next stop (`zoo/journey.ts`), not at `recentlyDiscovered`'s
  // own registry-order fallback. `spotlightSector` is `null` exactly when
  // there is nothing left to guide the child toward — every sector the
  // ladder reaches is fully filed.
  const journeyStep = nextJourneyStep(records)
  const spotlightSector = journeyStep?.sector ?? null
  // When the journey is done, the bubble falls back to `recentlyDiscovered`
  // (today's pre-T4 source) rather than going silent — the task's own
  // "keep today's behaviour" clause for that one case. `everyAdventureFiled`
  // is checked SEPARATELY below rather than assumed from `spotlightSector`
  // being `null` — see that function's own header for why the two are not
  // the same claim in general, even though today's registry makes them
  // coincide.
  const bubbleSector = spotlightSector ?? discovered
  // The finale (`promised-animals` task B): every animal is back AND there
  // is no journey step left to point at. Before this, `bubbleSector` fell
  // through to `discovered` (`recentlyDiscovered`) here too — but
  // `recentlyDiscovered` is ALSO `null` in this exact state (nothing is
  // untouched, and nothing has any unfiled adventure left), so the map
  // simply showed no bubble and the story had no ending (`FINALE_LINE`'s own
  // header). Checked explicitly, not inferred from `bubbleSector` being
  // `null`, so a future state where `discovered` resolves to something ELSE
  // while some adventure is still unfiled (`everyAdventureFiled`'s own
  // caveat) can never show the finale early.
  const finale = spotlightSector === null && everyAdventureFiled(records)
  const stars = totalStars(records)
  // T8 item 3: "just earned a star" is a comparison against what the child
  // was shown LAST time the map was up (`zoo/stars.ts`'s own header on why
  // that memory has to live outside React state). Read BEFORE recording, so
  // the comparison always sees the OLD total.
  const starsJustIncreased = starsIncreased(seenStars(), stars)
  const backpack = earnedItems(records)
  // Every animal standing in the zoo right now, across every sector — the
  // SVG world shows each one at its own `animalSpot` (T23 dropped the HUD's
  // own small-icon echo of this same list, `docs/19` §5.3: "el mapa y la
  // libreta ya lo dicen").
  const recovered = SECTORS.flatMap((sector) => animalPlacements(sector, records))
  // T32 (N1, N4): the same list, reshaped from `placeArt`'s own `ArtBox`
  // (`x`/`y`/`width`/`height`) into this file's `Rect` (`x`/`y`/`w`/`h`) once,
  // so both `bubblePlacement`'s and `playBadgePlacement`'s own obstacle lists
  // read this one conversion instead of two independent inline ones.
  const recoveredBoxes: readonly Rect[] = recovered.map((p) => ({
    x: p.box.x,
    y: p.box.y,
    w: p.box.width,
    h: p.box.height,
  }))
  const openSectors = SECTORS.filter((sector) => sector.hit && isOpen(sector, records))
  // T23: stars drop out of the spoken status too — `STARS_VISIBLE_IN_HUD`
  // hides the whole idea from this stage, not just its pixel pill, so an
  // assistive-tech listener should not hear a number the sighted child
  // never sees either.
  const statusText = STARS_VISIBLE_IN_HUD
    ? `Mapa del zoo: ${openSectors.length} sectores abiertos, ${stars} estrellas y ${recovered.length} animales recuperados.`
    : `Mapa del zoo: ${openSectors.length} sectores abiertos y ${recovered.length} animales recuperados.`

  // The bubble's own content and box, unified over the ordinary (spotlight or
  // `recentlyDiscovered`-fallback) case and the finale — one value each,
  // rather than branching again at every render site below. `finaleBubblePlacement`
  // (`zoo/adventures.ts`) is what actually answers "where does a bubble with
  // no spotlight target to avoid belong" — see its own header.
  //
  // T36 follow-up (docs/18 D3, again): this used to be `ZOO_CARETAKER_ART` —
  // the SAME caretaker already standing full-body at `PLAZA_CENTRE` right
  // below the bubble (`OCTOPUS_ART` once `finale`, above), the exact
  // duplicate the prologue's own D3 fix removed. `ZOO_STAR_ART` instead: a
  // celebration image, never the Pulpito himself, and already the SAME
  // picture `RescueCelebration`'s own burst scatters around this bubble
  // (`ZooMap.tsx`'s own `{finale && <RescueCelebration />}` below), so it
  // reads as one consistent celebratory moment rather than an unrelated
  // fourth image.
  const bubbleContent = finale
    ? { art: ZOO_STAR_ART, label: FINALE_LINE }
    : bubbleSector
      ? mapBubble(bubbleSector, records, spotlightSector !== null)
      : null
  // T32 (N1): `recoveredBoxes` is now threaded through so the bubble also
  // dodges any rescued animal it would otherwise cover — the finale's own
  // placement is untouched (`finaleBubblePlacement`'s own header: a
  // zero-area target already has nothing to avoid, and the finale is a
  // one-off closing beat, not part of ordinary journey play).
  const bubblePlaced = finale
    ? finaleBubblePlacement()
    : bubbleSector?.hit
      ? bubblePlacement(bubbleSector.hit, recoveredBoxes)
      : null
  // T16: the pop-in's own transform-origin, at the tail tip — see
  // `tailOriginFor`'s own header, above. Computed unconditionally (a cheap
  // pure function over `bubblePlaced?.anchor ?? 'above-left'`) rather than
  // only inside the render below, so the JSX there stays a plain lookup.
  const tailOrigin = tailOriginFor(bubblePlaced?.anchor ?? 'above-left')
  // Arrival/dismiss/reopen (D4): the bubble shows the instant its own
  // subject sector changes (a fresh `ZooMap` mount counts as an "arrival" in
  // its own right — `App.tsx` never keeps this component mounted across a
  // trip into a level, `initial={useState}` below always starts `true` on
  // mount), hides on tap, hides itself after `BUBBLE_AUTO_HIDE_MS`, and
  // tapping the Pulpito bumps `reopenNonce` to show it again for another
  // full window. `renderToString` never runs effects, so every existing
  // SSR-only test keeps seeing the bubble at its initial (visible) state.
  // `'finale'` is a key no real `ZooSector.id` can ever collide with, the
  // same reason `bubbleSector?.id ?? null` (the pre-finale expression) never
  // collided with a real id either.
  const bubbleKey = finale ? 'finale' : (bubbleSector?.id ?? null)
  const [bubbleVisible, setBubbleVisible] = useState(true)
  const [reopenNonce, setReopenNonce] = useState(0)
  // T23 (odd/tasks/prewriting-stage-completion.md, docs/19 §5.3): the
  // detective's notebook, opened from the backpack pill and closed from its
  // own close button. Closed on every fresh mount, the same reasoning
  // `bubbleVisible`'s own header gives for starting `true` — `App.tsx`
  // never keeps `ZooMap` mounted across a trip into a level, so there is no
  // stale "left it open" state to preserve across a visit.
  const [notebookOpen, setNotebookOpen] = useState(false)
  // T31 (odd/tasks/prewriting-stage-completion.md, notebook discoverability):
  // "no sabía que esto existía" — the backpack pill opened the notebook
  // already, but nothing on screen ever pointed at it. `notebookDiscovered`
  // (localStorage, `screen/notebookDiscovery.ts`) gates the backpack's own
  // gentle PULSE (below): a lazy initializer, read ONCE on mount, the same
  // "SSR/no window renders the pulse-off default" convention every other
  // `typeof window` guard in this file already follows.
  const [notebookDiscovered, setNotebookDiscovered] = useState(() =>
    hasOpenedNotebookOnce(typeof window === 'undefined' ? null : window.localStorage),
  )
  // Which animal's own card the notebook should open highlighted to — set
  // only on the FIRST-EVER open (`openNotebook`, below), `null` every other
  // time (the plain grid, unchanged).
  const [notebookHighlightId, setNotebookHighlightId] = useState<ZooAnimalId | null>(null)
  // The animal a fresh mount's own consumed rescue departure named (set
  // unconditionally below, even under reduced motion where no `rescueFlight`
  // ever animates) — what a first-ever notebook open highlights.
  const [justRescuedAnimalId, setJustRescuedAnimalId] = useState<ZooAnimalId | null>(null)
  // The backpack's own one-shot "just received something" bounce/glow/badge
  // (ZOO_CSS's own `.cv-zoo-backpack-receive`/`.cv-zoo-backpack-badge`) —
  // distinct from `notebookDiscovered`'s PERSISTENT pulse: this one plays
  // once per rescue, discovered or not, the satisfying "it landed" flourish;
  // the pulse alone is what actually stops once discovered.
  const [backpackReceived, setBackpackReceived] = useState(false)
  // The persistent pulse: only once there is at least one rescued animal
  // worth seeing (an empty notebook is nothing to nag about yet) and only
  // until the child has opened it once, ever.
  const showBackpackPulse = !notebookDiscovered && recovered.length > 0
  const openNotebook = () => {
    if (!notebookDiscovered) {
      // The first-ever open: highlight whichever animal just arrived (may
      // still be `null` if the child opens the notebook before ever
      // rescuing anyone — nothing to highlight yet, the plain grid shows),
      // and persist the discovery so neither the pulse nor this branch ever
      // fires again.
      setNotebookHighlightId(justRescuedAnimalId)
      markNotebookOpenedOnce(typeof window === 'undefined' ? null : window.localStorage)
      setNotebookDiscovered(true)
    } else {
      setNotebookHighlightId(null)
    }
    setNotebookOpen(true)
  }
  useEffect(() => {
    setBubbleVisible(true)
    // Voice narration (docs/18 D1/D4, §3 "Todo se escucha"; T7): the bubble
    // is spoken every time it (re)appears — on the fresh mount, and again on
    // each Pulpito tap that reopens it — never merely on the FIRST show,
    // which is why this lives inside the SAME effect that resets
    // `bubbleVisible`, keyed on the SAME `[bubbleKey, reopenNonce]` pair,
    // rather than going through `useNarration` (whose own "speak again"
    // trigger is the LINE changing, not a re-show of the same line — the
    // exact case a re-opened bubble is). `bubbleContent` is read from this
    // render's own closure rather than added to the dependency array:
    // `ZooMap` always remounts fresh on every map visit (this comment
    // block's own next paragraph), so within one mount it never changes
    // except in step with `bubbleKey`. Speaking `bubbleContent.label` rather
    // than re-deriving it from `mapBubble` here is what makes the finale's
    // own line spoken through this SAME path, with no second speak call.
    if (bubbleContent && canAutoSpeak()) {
      speak(bubbleContent.label)
    }
    if (typeof window === 'undefined') return undefined
    const timer = window.setTimeout(() => setBubbleVisible(false), BUBBLE_AUTO_HIDE_MS)
    return () => window.clearTimeout(timer)
  }, [bubbleKey, reopenNonce])
  const dismissBubble = () => setBubbleVisible(false)
  const reopenBubble = () => setReopenNonce((n) => n + 1)
  // T8 item 3: records THIS render's total as "seen" so the NEXT map visit's
  // own comparison (`starsJustIncreased`, above) has something to compare
  // against. `renderToString` never runs effects (this file's own header,
  // repeated on every effect here), so an SSR-only test can never observe
  // this updating the session memory — `starsIncreased` itself is the
  // directly-testable half (`zoo/stars.test.ts`).
  useEffect(() => {
    recordSeenStars(stars)
  }, [stars])

  // T31: the backpack's own one-shot receive flourish settles on its own —
  // the same "transient state plus a cleanup timeout" idiom `rescueFlight`'s
  // own landed-cleanup effect (below) and `fadingSpineStrokes` elsewhere in
  // this app already use, timed to clear comfortably after
  // `cv-zoo-backpack-bounce`'s own 900ms CSS animation has finished.
  useEffect(() => {
    if (!backpackReceived) return undefined
    if (typeof window === 'undefined') return undefined
    const timer = window.setTimeout(() => setBackpackReceived(false), 1000)
    return () => window.clearTimeout(timer)
  }, [backpackReceived])

  // T24 (docs/19 section 6, "Aventura -> mapa (rescate)"): receiving the
  // flying animal. `zoo/rescueFlight.ts`'s own header explains WHY this is a
  // module-scope handoff rather than a prop: `AdventureClosing` and this
  // screen are mounted by different shells, and the closing has already
  // fully unmounted by the time this one exists.
  //
  // `svgRef` is what lets `viewBoxRectToScreenRect` convert the landing
  // spot's own viewBox-unit box (`recovered`, above) into the same CSS-pixel
  // space `AdventureClosing.tsx`'s `recordDeparture` measured its rect in.
  const svgRef = useRef<SVGSVGElement | null>(null)
  // T32 (odd/tasks/prewriting-stage-completion.md, full-bleed map): the
  // stage's own on-screen CSS-pixel size, measured via `ResizeObserver` —
  // `canvas/TraceCanvas.tsx`'s own T7-rework precedent, restated here for the
  // map's own root `<svg>` (`.cv-zoo-stage > svg` is now `width: 100%; height:
  // 100%` of the full-viewport `.cv-zoo-stage`, `ZOO_CSS` above). `null`
  // before the first measurement (SSR, and the very first client paint) is
  // the exact "no expansion" default `fitContentWithInsets`'s own
  // `containerWidth > 0` guard already treats as a no-op — every existing
  // `renderToString` test keeps seeing the plain, byte-identical
  // `MAP_STAGE_BOX` (0 0 1000 600) viewBox until layout settles in a real
  // browser.
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
  useEffect(() => {
    const el = svgRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box && box.width > 0 && box.height > 0) setContainerSize({ width: box.width, height: box.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  // The box every registered layer's own coordinates stay authored against
  // (`MAP_STAGE_BOX`) fit into the real container at the MINIMUM zoom that
  // still covers it — the SAME `fitContentWithInsets` a level's own backdrop
  // already uses (`docs/18` §7's T7/T14/T22 rows), fed no insets: the map's
  // own chrome (the HUD pills, the bubble) already floats OVER the art
  // (`docs/12` §3), unlike a level's header/footer rows, so there is no
  // safe-rectangle shrink to account for here.
  const displayBounds: ArtBox = containerSize
    ? fitContentWithInsets(MAP_STAGE_BOX, containerSize.width, containerSize.height)
    : MAP_STAGE_BOX
  // Guards `takeDeparture` (a destructive, consume-ONCE read) against
  // StrictMode's dev-only double effect-invoke on the SAME mounted instance
  // — the ref itself persists across that replay, so the second run sees it
  // already set and never re-consumes a handoff its first run already took.
  const rescueFlightConsumedRef = useRef(false)
  const [rescueFlight, setRescueFlight] = useState<RescueFlightState | null>(null)

  useEffect(() => {
    if (rescueFlightConsumedRef.current) return
    rescueFlightConsumedRef.current = true
    if (typeof window === 'undefined') return
    const departure = takeDeparture()
    if (!departure) return
    // T31: the backpack's own discoverability signal — set REGARDLESS of
    // `reduced` below, since a reduced-motion child still deserves the
    // "it landed" bounce/glow/badge and a first-ever-open highlight, even
    // though the big SVG-to-map flight itself is skipped for them.
    setJustRescuedAnimalId(departure.animalId)
    setBackpackReceived(true)
    const reduced = prefersReducedMotion(
      typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null,
    )
    // docs/19 section 6's own closing line: reduced motion is a direct cut —
    // the permanent SVG image (`recovered`, above) is already sitting at the
    // right spot from this very first frame (the level approval that
    // unlocks it was persisted before the closing ever mounted), so there is
    // nothing left to animate.
    if (reduced) return
    const mode = supportsViewTransitions(document as unknown as { startViewTransition?: unknown }) ? 'vt' : 'manual'
    setRescueFlight({ art: ZOO_ANIMAL_ART[departure.animalId], from: departure.rect, mode, phase: 'start' })
  }, [])

  // Kicks the actual move, once, the render after the overlay first mounts
  // AT the departure rect (`phase: 'start'`) — a `document.startViewTransition`
  // capturing that as its "old" state where supported, an rAF-delayed class
  // flip (so the browser paints the start position at least once before the
  // transition begins, the ordinary two-rAF trick) otherwise.
  useEffect(() => {
    if (!rescueFlight || rescueFlight.phase !== 'start') return undefined
    if (rescueFlight.mode === 'vt') {
      const doc = document as unknown as { startViewTransition: (cb: () => void) => void }
      doc.startViewTransition(() => {
        flushSync(() => setRescueFlight((f) => (f ? { ...f, phase: 'end' } : f)))
      })
      return undefined
    }
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setRescueFlight((f) => (f ? { ...f, phase: 'end' } : f))),
    )
    return () => cancelAnimationFrame(id)
  }, [rescueFlight])

  // Once landed, the overlay dissolves — the permanent SVG image underneath
  // was there all along, pixel-for-pixel where this overlay just settled.
  useEffect(() => {
    if (!rescueFlight || rescueFlight.phase !== 'end') return undefined
    const timer = window.setTimeout(() => setRescueFlight(null), RESCUE_FLIGHT_DURATION_MS + 80)
    return () => window.clearTimeout(timer)
  }, [rescueFlight])

  return (
    <main className="cv-zoo">
      <style>{ZOO_CSS}</style>
      <p id="cv-zoo-status" className="cv-zoo-sr" role="status" aria-live="polite">{statusText}</p>
      <section
        className="cv-zoo-portrait-guidance"
        role="status"
        aria-live="polite"
        aria-label="Girá el dispositivo. Para recorrer el zoológico cómodo, usá el juego en horizontal."
      />
      <div className="cv-zoo-stage">
        <svg
          ref={svgRef}
          viewBox={`${displayBounds.x} ${displayBounds.y} ${displayBounds.width} ${displayBounds.height}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          aria-label="El zoológico del Pulpito"
          aria-describedby="cv-zoo-status"
        >
          {/* T32: sized to `displayBounds`, the SAME box the `<svg>`'s own
              viewBox above already is (`coverAspectRatio`'s own proven
              guarantee, `canvas/TraceCanvas.tsx`) — a plain background fill
              behind the map image, for the rare rounding gap `meet` can leave
              rather than a third colour showing through. */}
          <rect
            x={displayBounds.x}
            y={displayBounds.y}
            width={displayBounds.width}
            height={displayBounds.height}
            fill={ZOO_BACKGROUND}
          />

          {/* §1 (T32 rework): `slice` lives on the IMAGE, never on the root
              `<svg>` — sized to `displayBounds` rather than the fixed
              1000×600 stage, this now covers the WHOLE viewport at the
              minimum zoom (`docs/18` §7's T7/T14/T22 rows' own technique for
              a level's own backdrop), cropping only whatever the container's
              aspect actually demands, rather than a fixed 33.333 units off
              the top and bottom on every device alike. */}
          <image
            href={ZOO_MAP_ART.href}
            x={displayBounds.x}
            y={displayBounds.y}
            width={displayBounds.width}
            height={displayBounds.height}
            preserveAspectRatio="xMidYMid slice"
          />

          {/* Fog, per closed sector. Two patches each (design.md §4's
              closed-form construction) — `flip` mirrors the drawn picture
              about its own centre without moving the axis-aligned box the
              containment proof reasons about.

              `!isOpen` is load-bearing, and it was NOT before row C. Until
              montañas every sector was either always-open (`estanque`, whose
              `fog` is `[]` precisely so it never carries any) or
              always-closed (static fog, `unlockedWhen` a constant `false`),
              so filtering on `fog.length > 0` alone happened to agree with
              openness for every sector that existed. Montañas is the first
              sector with a CONDITIONAL unlock (`isFiled(records,
              'duck-trail4')`), and with the old filter its fog stayed
              painted over a sector the child had just earned — the hit below
              was live and tappable under a cloud that said "not yet". The
              two filters now ask the same question, which is the invariant:
              a sector is fogged exactly when it is not open. */}
          {SECTORS.filter(
            (sector) => sector.fog.length > 0 && !isOpen(sector, records),
          ).flatMap((sector) =>
            sector.fog.map((patch, i) => {
              const art = ZOO_FOG_ART[patch.art]
              const box = placeArt(art, patch.size, { x: patch.x, y: patch.y })
              return (
                <image
                  key={`fog-${sector.id}-${i}`}
                  data-fog-sector={sector.id}
                  className={fogClassFor(sector.id, discovered)}
                  href={art.href}
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  transform={patch.flip ? `translate(${2 * patch.x},0) scale(-1,1)` : undefined}
                  preserveAspectRatio="xMidYMid meet"
                />
              )
            }),
          )}

          {/* Recovered animals, standing on their `animalSpot` by the feet
              (`STANDING_GRIP`, `zoo/sectors.ts`'s `animalPlacements`).
              [T27 follow-up, orchestrator screenshot review 2026-09-27] A
              `PLACEHOLDER_ZOO_ANIMALS` entry (`isPlaceholderArt`) never
              stands here as its own grey sign block — the SAME drawn
              `PlaceholderAnimalBadge` every other such spot now uses,
              standing PERMANENTLY at the enclosure once rescued, same as
              every other animal. */}
          {recovered.map((placed, i) =>
            isPlaceholderArt(placed.art) ? (
              <PlaceholderAnimalBadge
                key={`animal-${i}`}
                x={placed.box.x}
                y={placed.box.y}
                width={placed.box.width}
                height={placed.box.height}
              />
            ) : (
              <image
                key={`animal-${i}`}
                href={placed.art.href}
                x={placed.box.x}
                y={placed.box.y}
                width={placed.box.width}
                height={placed.box.height}
                preserveAspectRatio="xMidYMid meet"
              />
            ),
          )}

          {/* The spotlight (T4, D5): dim everything except an ellipse around
              the journey's own next destination — after fog and recovered
              animals, BEFORE the footprints, the Pulpito and the hit-rects,
              so the dim layer sits under the things the child can still
              read or tap, and the ring/badge sit over the dimmed map. Absent
              once every sector the ladder reaches is fully filed
              (`spotlightSector` is `null`). */}
          {spotlightSector?.hit && (
            <>
              <path
                data-spotlight="true"
                aria-hidden="true"
                // T32: `displayBounds`, not the default `MAP_STAGE_BOX` — the
                // dim layer has to cover the whole grown viewBox, or the
                // strip of art the full-bleed cover reveals beyond the
                // original 1000×600 stage would render undimmed.
                d={spotlightHolePath(spotlightSector.hit, SPOTLIGHT_PAD, displayBounds)}
                fillRule="evenodd"
                fill="#0b1220"
                opacity={0.45}
                style={{ pointerEvents: 'none' }}
              />
              <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
                <SpotlightRing hit={spotlightSector.hit} />
                {/* T32 (N4): `playBadgePlacement` moves the badge off the
                    hit's own centre only when an animal already stands
                    there — `recoveredBoxes` is the SAME list `bubblePlacement`
                    (above) avoids. T36: `displayBounds` and a real 12px
                    margin (`pxToViewBoxUnits`, converted through the
                    CURRENT `containerSize` — `null` pre-measurement falls
                    back to that function's own placeholder) keep the badge's
                    own drawn edge off the viewport's own edge too — the
                    lagoon's own reported defect (the badge's right side
                    exactly on the screen's right border at 1024×768). */}
                <SpotlightBadge
                  at={playBadgePlacement(
                    spotlightSector.hit,
                    recoveredBoxes,
                    undefined,
                    undefined,
                    displayBounds,
                    pxToViewBoxUnits(BADGE_MIN_EDGE_MARGIN_PX, containerSize?.width ?? 0, displayBounds),
                  )}
                />
              </g>
            </>
          )}

          {/* Footprints from the plaza to the journey's own next
              destination (T4) — only when there is one to point at. Before
              T4 this walked to `recentlyDiscovered`'s own sector, which is
              what let the trail keep pointing at the pond long after the
              story had moved on to the mountains (`docs/18` D4/D28). */}
          {spotlightSector?.hit &&
            footprintTrail(PLAZA_CENTRE, hitCentre(spotlightSector.hit)).map((mark, i) => (
              <Footprint key={`print-${i}`} {...mark} />
            ))}

          {/* The Pulpito with his mochila, in the plaza — a keyboard-
              accessible control (T4, D4) that re-opens the map bubble once
              it has been dismissed or has auto-hidden, the same
              role="button"/tabIndex pattern the sector hits below use.
              Default (box-centre) grip on the image itself — design.md §7's
              own worked call.
              T36 (odd/tasks/prewriting-stage-completion.md, the ending "in
              the new style"): once the finale is reached, PLAZA_CENTRE (498,
              282 of the 1000×600 stage — already centre-stage by
              construction, sectors.ts's own header) shows him as the
              detective he became at the end of the prologue (docs/16 §5)
              instead of the mochila-only figure he wears during ordinary
              play — OCTOPUS_ART ("the octopus holding the glass", already
              shipped for LevelPlay's own carrier, no new art) rather than
              ZOO_OCTOPUS_BACKPACK_ART. Same box, same control, same
              aria-label — only the picture changes. */}
          <g
            role="button"
            tabIndex={0}
            aria-label="Pulpito: escuchar de nuevo"
            className="cv-zoo-octopus-control"
            onClick={reopenBubble}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              reopenBubble()
            }}
          >
            <image
              href={finale ? OCTOPUS_ART.href : ZOO_OCTOPUS_BACKPACK_ART.href}
              {...placeArt(finale ? OCTOPUS_ART : ZOO_OCTOPUS_BACKPACK_ART, 150, PLAZA_CENTRE)}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>

          {/* Transparent hit-rects — the only tappable surface. Tapping an
              open sector opens its NEXT adventure (OD2); a sector whose
              `nextAdventure` is `null` (none authored yet) is simply inert. */}
          {openSectors.map((sector) => (
            <g
              key={`hit-${sector.id}`}
              className="cv-zoo-sector-control"
              data-sector-control={sector.id}
              // QA hook (T4): marks the exact sector the spotlight is
              // pointing at, so a screenshot pass can assert "exactly one
              // place is highlighted" without re-deriving the journey.
              data-next-sector={spotlightSector?.id === sector.id ? 'true' : undefined}
              role="button"
              tabIndex={0}
              aria-label={sectorActionLabel(sector, records)}
              onClick={() => activateSector(sector, records, onEnter)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                activateSector(sector, records, onEnter)
              }}
            >
              <rect
                className="cv-zoo-sector-hit"
                x={sector.hit!.x}
                y={sector.hit!.y}
                width={sector.hit!.w}
                height={sector.hit!.h}
                fill="transparent"
                style={{ cursor: 'pointer' }}
              />
            </g>
          ))}

          {/* `?debug=sectores` (docs/12 §4): every `hit` and `animalSpot` in
              translucent red, plus the plaza for reference — read against a
              screenshot, correcting the REGISTRY when one misses, never the
              drawing. Adds no word, so `auditCaptions` is untouched by it. */}
          {resolvedDebug && (
            <g aria-hidden="true">
              {SECTORS.filter((sector) => sector.hit).map((sector) => (
                <rect
                  key={`debug-hit-${sector.id}`}
                  x={sector.hit!.x}
                  y={sector.hit!.y}
                  width={sector.hit!.w}
                  height={sector.hit!.h}
                  fill="#ff0000"
                  opacity={0.28}
                />
              ))}
              <rect x={PLAZA.x} y={PLAZA.y} width={PLAZA.w} height={PLAZA.h} fill="#ff0000" opacity={0.28} />
              {SECTORS.filter((sector) => sector.hit).map((sector) => (
                <circle
                  key={`debug-spot-${sector.id}`}
                  cx={sector.animalSpot.x}
                  cy={sector.animalSpot.y}
                  r={6}
                  fill="#ff0000"
                  opacity={0.6}
                />
              ))}
            </g>
          )}
        </svg>

        {/* The HUD: DOM, outside the `<svg>` (docs/12 §3) — siblings of it,
            never children, so it can be positioned in percent against the
            stage's own fixed 5:3 box (design.md §1) and inherit the
            document root's Nunito (`docs/09` §8) without redeclaring it. */}
        <div className="cv-zoo-hud">
          {/* T23 (odd/tasks/prewriting-stage-completion.md, docs/19 §5.3):
              the backpack pill is now a real button — the ONE HUD control
              that still does something ("Mochila → Abre la libreta del
              detective"). It keeps showing every earned tool beside the
              backpack itself (unchanged from before this task), and now
              also opens `DetectiveNotebook` on tap.

              T31 (notebook discoverability): `cv-zoo-hud-left--pulse` keeps
              a gentle glow going as long as there is at least one rescued
              animal to see and the child has never opened the notebook
              (`showBackpackPulse`, below); `cv-zoo-backpack-receive` plays a
              one-shot bounce the instant an animal is delivered
              (`backpackReceived`), and its own small paw badge rides along
              with it. */}
          <button
            type="button"
            className={
              'cv-zoo-hud-left' +
              (showBackpackPulse ? ' cv-zoo-hud-left--pulse' : '') +
              (backpackReceived ? ' cv-zoo-backpack-receive' : '')
            }
            aria-label="Abrir la libreta del detective"
            onClick={openNotebook}
          >
            <img src={ZOO_BACKPACK_ART.href} alt="" height={40} />
            {backpack.map((item) => (
              <img key={item.id} src={item.art.href} alt="" height={32} />
            ))}
            {backpackReceived && <PawPrintIcon className="cv-zoo-backpack-badge" />}
          </button>
          {/* T7 (docs/18 D1/§3): the mute toggle now shares this SLOT with
              the star pill, as a separate round control beside it rather
              than inside it — `.cv-zoo-hud-right-group` (ZOO_CSS) is what
              actually receives the row's own space-between position now, so
              the star pill's own markup/class/background is untouched.
              T23 (docs/19 §5.2 decision 2(a)): the star pill itself is now
              gated behind `STARS_VISIBLE_IN_HUD` — off in this stage, so
              only `VoiceToggle` renders in this slot; `stars`/
              `starsJustIncreased` above still compute (nothing about
              storing or deriving them changed), they are just never drawn
              while the flag is off. */}
          <div className="cv-zoo-hud-right-group">
            <VoiceToggle />
            {STARS_VISIBLE_IN_HUD && (
              <div className="cv-zoo-hud-right">
                {/* The ONLY way a number may sit beside a picture in this app —
                    `CaptionedArt`'s `label` is required at type level, which is
                    what makes a bare "12" impossible to ship by accident.
                    T8 item 3: `cv-zoo-star-pop` only while `starsJustIncreased`
                    (a genuine rise since the session last showed a total) — the
                    ordinary case (an unchanged count, or the very first map
                    this session) never pops. */}
                <CaptionedArt
                  art={ZOO_STAR_ART}
                  label={String(stars)}
                  size={40}
                  className={starsJustIncreased ? 'cv-zoo-star-pop' : undefined}
                />
                {starsJustIncreased && <span className="cv-zoo-star-spark" aria-hidden="true" />}
              </div>
            )}
          </div>
        </div>
        {/* T23: the detective's notebook overlay — mounted only while open,
            a sibling of the HUD so it draws above the stage but below
            nothing else this screen has (no other overlay competes with it).
            `.cv-zoo-stage` is `position: relative` already (ZOO_CSS), which
            is what lets `DetectiveNotebook`'s own `position: absolute;
            inset: 0` cover exactly the 5:3 stage, never the whole viewport
            (matching every other HUD/bubble element's own coordinate
            space). */}
        {notebookOpen && (
          <DetectiveNotebook
            records={records}
            onClose={() => setNotebookOpen(false)}
            highlightId={notebookHighlightId}
          />
        )}

        {/* The map bubble (T4, D4; content source T8, D27/D28; the finale
            branch below, promised-animals task B). Its BOX comes from
            `bubblePlacement`, fed the SPOTLIGHT target's own hit rect —
            never `discovered`'s — so it always talks about where the story
            goes NEXT rather than about whichever sector
            `recentlyDiscovered`'s registry-order fallback last landed on
            (the same fix the spotlight and the footprints get); the finale
            has no such target, so it gets `finaleBubblePlacement`'s own
            answer instead (`zoo/adventures.ts`). Its CONTENT is
            `bubbleContent`, already resolved above: `mapBubble`'s ordinary
            onward/rescue-fallback pair while `finale` is false, or the
            caretaker's own closing line once every animal is back — while
            there is still a journey stop ahead the bubble always reads
            onward, never an older sector's rescue line; only the
            no-journey-step fallback still surfaces a sector's own
            most-recently-recovered animal, or — once NOTHING is left in the
            whole zoo — the finale. */}
        {bubbleContent &&
          bubblePlaced &&
          bubbleVisible &&
          (() => {
            // T32: `bubblePlaced` is still authored in stage units — this
            // screen's own HTML overlays sit OUTSIDE the `<svg>` (siblings,
            // never children), so they cannot inherit its viewBox transform
            // and need `stageRectToPercent`'s own conversion against the
            // CURRENT `displayBounds` instead of a fixed `/1000`, `/600`.
            const bubblePercent = stageRectToPercent(bubblePlaced, displayBounds)
            return (
              <div
                className={bubbleClassName(bubblePlaced.anchor)}
                style={{
                  left: `${bubblePercent.left.toFixed(2)}%`,
                  top: `${bubblePercent.top.toFixed(2)}%`,
                  width: `${bubblePercent.width.toFixed(2)}%`,
                  height: `${bubblePercent.height.toFixed(2)}%`,
                }}
              >
                {/* A button, not a decorative div: tapping ANYWHERE on the
                    bubble dismisses it (D4 — the old bubble said the same thing
                    forever with no way to close it). Keyed on the label (T8
                    item 2): a fresh key each time the TEXT changes forces React
                    to remount this button, replaying `cv-bubble-pop`'s own
                    pop-in — a re-show of the SAME text (Pulpito tapped again
                    before auto-hide) already remounts the whole bubble `<div>`
                    above (`bubbleVisible` going false-then-true), so this key
                    never needs to do that job too. */}
                <button
                  key={bubbleContent.label}
                  type="button"
                  className="cv-zoo-bubble-dismiss cv-bubble-pop"
                  aria-label="Cerrar el mensaje del Pulpito"
                  onClick={dismissBubble}
                  style={{ transformOrigin: `${tailOrigin.x}% ${tailOrigin.y}%` }}
                >
                  <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
                  {/* `size` is the UNSTYLED height; `ZOO_CSS`'s
                      `.cv-zoo-bubble .cv-captioned > svg` overrides it with a
                      percentage of the bubble so the print tracks the stage. 76
                      is what that percentage resolves to at a 1000-unit stage,
                      so the server-rendered markup already carries the right
                      shape instead of a number the stylesheet silently
                      contradicts. The `CaptionedArt` wrapper itself is NOT
                      optional: it is the only component allowed to pair a
                      picture with a word outside the rail, and
                      `captionAudit`'s `auditCaptions` is what enforces that —
                      only the styling and its source sector changed here.
                      The picture AND the word come from `bubbleContent`: while
                      `spotlightSector` is non-null this is always the onward
                      print and phrase (T8 — the rescue itself is told by the
                      closing screen instead); once the journey is done this
                      falls back to the sector's own most-recently-recovered
                      animal, exactly as it always did — except in the finale,
                      where it is the caretaker's own closing portrait and
                      line. */}
                  <CaptionedArt {...bubbleContent} size={76} />
                </button>
                {/* The finale's own short burst (task B: "recuperar UN animal se
                    tiene que ver" — docs/18 §4.7 item 1 — applied to the whole
                    story). Sibling of the dismiss button, not a child of it: its
                    own CSS (`RescueCelebration.tsx`) is `pointer-events: none`
                    and absolutely positioned over the SAME `.cv-zoo-bubble` box,
                    so it never steals the tap the button needs and never shifts
                    anything else in this bubble's own layout. */}
                {finale && <RescueCelebration />}
              </div>
            )
          })()}

        {/* T24: the rescue flight's own receiving half — see this file's own
            hooks (above `return`) for how `rescueFlight` is populated, and
            `rescueFlightOverlayStyle`'s own header for the two render
            branches. `target`/`svgRect` are only ever absent in a
            transient first render before the svg's own layout is
            measurable, or if the departing animal's id somehow does not
            match anything `recovered` lists (a stale/corrupted handoff) —
            both render nothing rather than guess a position. */}
        {rescueFlight &&
          (() => {
            const target = recovered.find((p) => p.art === rescueFlight.art)
            const svgBox = svgRef.current?.getBoundingClientRect()
            if (!target || !svgBox) return null
            // T32: the CURRENT `displayBounds`, not the fixed `{width:1000,
            // height:600}` — once the map's own viewBox grows past the
            // stage to cover the container, the landing spot's own screen
            // position has to be derived from the SAME box the `<svg>` is
            // actually drawn with, or the flight would land off by exactly
            // how far the viewBox grew.
            const toRect = viewBoxRectToScreenRect(
              target.box,
              { x: svgBox.x, y: svgBox.y, width: svgBox.width, height: svgBox.height },
              displayBounds,
            )
            // [T27 follow-up, orchestrator screenshot review 2026-09-27] The
            // SAME `PlaceholderAnimalBadge` swap `recovered.map` (above) and
            // `AdventureClosing.tsx`'s big rescue animal make — the animal
            // flying here never shows its own grey sign block mid-flight.
            return isPlaceholderArt(rescueFlight.art) ? (
              <PlaceholderAnimalBadge
                className="cv-zoo-rescue-flight"
                style={rescueFlightOverlayStyle(rescueFlight, toRect)}
              />
            ) : (
              <img
                src={rescueFlight.art.href}
                alt=""
                aria-hidden="true"
                className="cv-zoo-rescue-flight"
                style={rescueFlightOverlayStyle(rescueFlight, toRect)}
              />
            )
          })()}
      </div>
    </main>
  )
}
