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
import { useEffect, useState } from 'react'
import CaptionedArt from '../detective/CaptionedArt'
import {
  ZOO_BACKPACK_ART,
  ZOO_FOG_ART,
  ZOO_MAP_ART,
  ZOO_OCTOPUS_BACKPACK_ART,
  ZOO_OCTOPUS_PRINT_ART,
  ZOO_SPEECH_BUBBLE_ART,
  ZOO_STAR_ART,
} from '../detective/assets'
import { placeArt } from '../canvas/placeArt'
import { isSectorDebug } from '../canvas/devMode'
import { earnedItems } from '../zoo/backpack'
import { totalStars } from '../zoo/stars'
import {
  PLAZA,
  PLAZA_CENTRE,
  SECTORS,
  animalPlacements,
  footprintTrail,
  hitCentre,
  isOpen,
  nextAdventure,
  recentlyDiscovered,
  type FootprintMark,
  type Rect,
  type Records,
  type SectorId,
  type ZooSector,
} from '../zoo/sectors'
import { bubblePlacement, mapBubble, type BubbleAnchor } from '../zoo/adventures'
import { nextJourneyStep } from '../zoo/journey'
import { getLevel } from '../levels/catalog'
import { canAutoSpeak, speak } from '../voice/narrator'
import VoiceToggle from '../voice/VoiceToggle'

/** How long the map bubble stays up before it hides itself, milliseconds
 *  (D4: it used to say the same thing forever with no way to dismiss it —
 *  `docs/18`). Tapping the Pulpito (`aria-label="Pulpito: escuchar de
 *  nuevo"`) shows it again for another window this same length. */
const BUBBLE_AUTO_HIDE_MS = 10000

/** The measured edge colour of `zoo-map.png` (design.md §1) — the letterbox
 *  `xMidYMid meet` leaves on the outer `<svg>` is filled with this, never a
 *  third white (`docs/09` §7). */
const ZOO_BACKGROUND = '#76B56A'

const ZOO_CSS = `
.cv-zoo { height: 100dvh; overflow: hidden; background: ${ZOO_BACKGROUND}; display: flex; align-items: center; justify-content: center; }
html, body, #root { margin: 0; height: 100%; }
/* Exactly 5:3 in BOTH width-limited and height-limited viewports (docs/18
   D4, D7). The previous rule - width: 100%; max-height: 100%; aspect-ratio:
   5/3 - only reconciled the ratio when WIDTH was the limiting dimension: a
   browser honours an explicit width before shrinking it to satisfy
   aspect-ratio under a max-height cap. At 844x390 (height-limited: 100dvh
   is 390, so the 100%-wide box was 844x390, an 844:390 ~ 2.16:1 box, not
   5:3) the stage silently stopped being 5:3, so every percent-positioned
   overlay this file draws (the HUD, the bubble) - which assumes its
   percentages are relative to a TRUE 5:3 box - drifted off the actual
   650x390 drawing sitting inside it: the bubble's own top measured at -33px
   off-screen at that exact viewport.
   min(100vw, 100dvh * 5/3) picks whichever of "full viewport width" or "the
   width a full-height 5:3 box would have" is smaller, so the OTHER
   dimension (aspect-ratio derives it from this one) is always the true 5:3
   partner: at 844x390 this resolves to exactly 650, matching the drawing
   pixel for pixel; at 1280x720 it resolves to 1200 (below the 1280 cap),
   matching the previous width-limited behaviour exactly.
   .cv-zoo's own flex centring (above) is the other half of D7 - the old
   block layout only centred the stage HORIZONTALLY (margin: 0 auto); at
   1024x768 the height-limited stage (1024 x 614.4) was never wrong in
   ratio, only pinned to the top, leaving a 153.6px green strip below it
   rather than split evenly top and bottom. */
.cv-zoo-stage { position: relative; width: min(100vw, calc(100dvh * 5 / 3)); aspect-ratio: 5 / 3; }
/* An inline svg sits on the text baseline and drags a descender gap under
   it: the stage measured 1200x726 at 1280x720, 6px taller than 5:3, so the
   map rode 3px above the viewport and every %-placed overlay drifted with it.
   Block display removes the gap and the stage is exactly 5:3 again. */
.cv-zoo-stage > svg { display: block; }
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
.cv-zoo-hud-left, .cv-zoo-hud-mid, .cv-zoo-hud-right, .cv-zoo-hud-right-group { display: flex; align-items: center; gap: 6px; pointer-events: auto; }
/* Each HUD group is a pill so it reads as interface, not as scenery: bare
   portraits at the top centre were drawn straight over the montanas and the
   animals standing there (measured at 1024x768 once five animals were back),
   and the snake alone rendered 173px wide at height 40 (aspect 4.32). Square
   30px boxes with object-fit keep every portrait the same footprint, and an
   empty group (nothing recovered yet) draws no pill at all. */
.cv-zoo-hud-left, .cv-zoo-hud-mid, .cv-zoo-hud-right { background: rgba(255, 255, 255, 0.86); border-radius: 999px; padding: 4px 10px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18); }
.cv-zoo-hud-mid:empty { display: none; }
.cv-zoo-hud-left img, .cv-zoo-hud-mid img { width: 30px; height: 30px; object-fit: contain; }
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
.cv-zoo-bubble { position: absolute; container-type: inline-size; }
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
 * whole 1000×600 stage, minus an ellipse around `hit` (padded by
 * `SPOTLIGHT_PAD`). Two arcs (`A rx ry 0 1 0 …`, twice) draw a closed
 * ellipse without a second `<circle>`/`<ellipse>` element, so the hole and
 * the outer rect stay ONE `<path>` — never a `<mask>`/`<clipPath>`
 * (`TraceCanvas.tsx`'s header, restated at this file's own). Exported and
 * pure so the hole's geometry — centred on the hit, sized from it — is
 * directly testable without a renderer.
 */
export function spotlightHolePath(hit: Rect, pad = SPOTLIGHT_PAD): string {
  const { x: cx, y: cy } = hitCentre(hit)
  const rx = hit.w / 2 + pad
  const ry = hit.h / 2 + pad
  const outer = `M 0 0 H 1000 V 600 H 0 Z`
  const hole = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
  return `${outer} ${hole}`
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

/** The round "play" badge at the spotlight's own centre. The bounce
 *  animation (`cv-zoo-spotlight-badge`, `ZOO_CSS`) lands on an INNER `<g>`
 *  with no `transform` attribute of its own — the OUTER `<g>` carries the
 *  positional `transform="translate(...)"` attribute that places the whole
 *  badge at `at`, and a CSS `transform` animated on that SAME element would
 *  replace the attribute outright rather than compose with it (`ZOO_CSS`'s
 *  own comment on this exact defect class). */
function SpotlightBadge({ at }: { at: { x: number; y: number } }) {
  return (
    <g transform={`translate(${at.x.toFixed(2)} ${at.y.toFixed(2)})`}>
      <g className="cv-zoo-spotlight-badge">
        <circle r={30} fill="#22c55e" stroke="#ffffff" strokeWidth={4} />
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
  // "keep today's behaviour" clause for that one case.
  const bubbleSector = spotlightSector ?? discovered
  const stars = totalStars(records)
  const backpack = earnedItems(records)
  // Every animal standing in the zoo right now, across every sector — the
  // SVG world shows each one at its own `animalSpot`; the HUD row below
  // shows the same set as a small summary of "who's been found so far".
  const recovered = SECTORS.flatMap((sector) => animalPlacements(sector, records))
  const openSectors = SECTORS.filter((sector) => sector.hit && isOpen(sector, records))
  const statusText = `Mapa del zoo: ${openSectors.length} sectores abiertos, ${stars} estrellas y ${recovered.length} animales recuperados.`

  const bubblePlaced = bubbleSector?.hit ? bubblePlacement(bubbleSector.hit) : null
  // Arrival/dismiss/reopen (D4): the bubble shows the instant its own
  // subject sector changes (a fresh `ZooMap` mount counts as an "arrival" in
  // its own right — `App.tsx` never keeps this component mounted across a
  // trip into a level, `initial={useState}` below always starts `true` on
  // mount), hides on tap, hides itself after `BUBBLE_AUTO_HIDE_MS`, and
  // tapping the Pulpito bumps `reopenNonce` to show it again for another
  // full window. `renderToString` never runs effects, so every existing
  // SSR-only test keeps seeing the bubble at its initial (visible) state.
  const bubbleKey = bubbleSector?.id ?? null
  const [bubbleVisible, setBubbleVisible] = useState(true)
  const [reopenNonce, setReopenNonce] = useState(0)
  useEffect(() => {
    setBubbleVisible(true)
    // Voice narration (docs/18 D1/D4, §3 "Todo se escucha"; T7): the bubble
    // is spoken every time it (re)appears — on the fresh mount, and again on
    // each Pulpito tap that reopens it — never merely on the FIRST show,
    // which is why this lives inside the SAME effect that resets
    // `bubbleVisible`, keyed on the SAME `[bubbleKey, reopenNonce]` pair,
    // rather than going through `useNarration` (whose own "speak again"
    // trigger is the LINE changing, not a re-show of the same line — the
    // exact case a re-opened bubble is). `bubbleSector`/`records`/
    // `spotlightSector` are read from this render's own closure rather than
    // added to the dependency array: `ZooMap` always remounts fresh on
    // every map visit (this comment block's own next paragraph), so within
    // one mount none of them changes except in step with `bubbleKey`.
    if (bubbleSector && canAutoSpeak()) {
      speak(mapBubble(bubbleSector, records, spotlightSector !== null).label)
    }
    if (typeof window === 'undefined') return undefined
    const timer = window.setTimeout(() => setBubbleVisible(false), BUBBLE_AUTO_HIDE_MS)
    return () => window.clearTimeout(timer)
  }, [bubbleKey, reopenNonce])
  const dismissBubble = () => setBubbleVisible(false)
  const reopenBubble = () => setReopenNonce((n) => n + 1)

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
          viewBox="0 0 1000 600"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          aria-label="El zoológico del Pulpito"
          aria-describedby="cv-zoo-status"
        >
          {/* The world continues under the letterbox `meet` leaves — the
              same "page is a place, not a card" move `docs/09` §7 made for
              the trail sheet, restated here with the map's own measured
              edge colour. */}
          <rect x={0} y={0} width={1000} height={600} fill={ZOO_BACKGROUND} />

          {/* §1: `slice` lives on the IMAGE, never on the root `<svg>` — the
              crop this produces is a fixed 33.333 units off the top and
              bottom on every device, not a function of the viewport. */}
          <image
            href={ZOO_MAP_ART.href}
            x={0}
            y={0}
            width={1000}
            height={600}
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
              (`STANDING_GRIP`, `zoo/sectors.ts`'s `animalPlacements`). */}
          {recovered.map((placed, i) => (
            <image
              key={`animal-${i}`}
              href={placed.art.href}
              x={placed.box.x}
              y={placed.box.y}
              width={placed.box.width}
              height={placed.box.height}
              preserveAspectRatio="xMidYMid meet"
            />
          ))}

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
                d={spotlightHolePath(spotlightSector.hit)}
                fillRule="evenodd"
                fill="#0b1220"
                opacity={0.45}
                style={{ pointerEvents: 'none' }}
              />
              <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
                <SpotlightRing hit={spotlightSector.hit} />
                <SpotlightBadge at={hitCentre(spotlightSector.hit)} />
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
              own worked call. */}
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
              href={ZOO_OCTOPUS_BACKPACK_ART.href}
              {...placeArt(ZOO_OCTOPUS_BACKPACK_ART, 150, PLAZA_CENTRE)}
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
          <div className="cv-zoo-hud-left">
            <img src={ZOO_BACKPACK_ART.href} alt="" height={40} />
            {backpack.map((item) => (
              <img key={item.id} src={item.art.href} alt="" height={32} />
            ))}
          </div>
          <div className="cv-zoo-hud-mid">
            {recovered.map((placed, i) => (
              <img key={i} src={placed.art.href} alt="" height={40} />
            ))}
          </div>
          {/* T7 (docs/18 D1/§3): the mute toggle now shares this SLOT with
              the star pill, as a separate round control beside it rather
              than inside it — `.cv-zoo-hud-right-group` (ZOO_CSS) is what
              actually receives the row's own space-between position now, so
              the star pill's own markup/class/background is untouched. */}
          <div className="cv-zoo-hud-right-group">
            <VoiceToggle />
            <div className="cv-zoo-hud-right">
              {/* The ONLY way a number may sit beside a picture in this app —
                  `CaptionedArt`'s `label` is required at type level, which is
                  what makes a bare "12" impossible to ship by accident. */}
              <CaptionedArt art={ZOO_STAR_ART} label={String(stars)} size={40} />
            </div>
          </div>
        </div>

        {/* The map bubble (T4, D4; content source T8, D27/D28). Its BOX
            comes from `bubblePlacement`, fed the SPOTLIGHT target's own hit
            rect — never `discovered`'s — so it always talks about where the
            story goes NEXT rather than about whichever sector
            `recentlyDiscovered`'s registry-order fallback last landed on
            (the same fix the spotlight and the footprints get). Its CONTENT
            comes from `mapBubble`, fed `bubbleSector` (the spotlight target,
            or `discovered` once the journey is done) AND
            `spotlightSector !== null` — T8 moved every rescue's own moment
            onto its adventure's closing screen, so while there is still a
            journey stop ahead the bubble always reads onward, never an
            older sector's rescue line; only the no-journey-step fallback
            still surfaces a sector's own most-recently-recovered animal. */}
        {bubbleSector && bubblePlaced && bubbleVisible && (
          <div
            className={bubbleClassName(bubblePlaced.anchor)}
            style={{
              left: `${((bubblePlaced.x / 1000) * 100).toFixed(2)}%`,
              top: `${((bubblePlaced.y / 600) * 100).toFixed(2)}%`,
              width: `${((bubblePlaced.w / 1000) * 100).toFixed(2)}%`,
              height: `${((bubblePlaced.h / 600) * 100).toFixed(2)}%`,
            }}
          >
            {/* A button, not a decorative div: tapping ANYWHERE on the
                bubble dismisses it (D4 — the old bubble said the same thing
                forever with no way to close it). */}
            <button
              type="button"
              className="cv-zoo-bubble-dismiss"
              aria-label="Cerrar el mensaje del Pulpito"
              onClick={dismissBubble}
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
                  The picture AND the word both come from `mapBubble`: while
                  `spotlightSector` is non-null this is always the onward
                  print and phrase (T8 — the rescue itself is told by the
                  closing screen instead); only once the journey is done
                  does this fall back to the sector's own most-recently-
                  recovered animal, exactly as it always did. */}
              <CaptionedArt {...mapBubble(bubbleSector, records, spotlightSector !== null)} size={76} />
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
