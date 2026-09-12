// PISTAS bar (`detective-mode` design unit 5, spec: level-engine "PISTAS
// Rail Chrome"). Fixed DOM chrome, a flex sibling of the canvas inside
// `.cv-sheet` (`LevelPlay.tsx`) — NEVER inside the 1000-unit viewBox, so it
// steals no room from the trail (design.md "Layout").
//
// A HORIZONTAL bar across the TOP of the screen (defect fix: it shipped as a
// vertical column down the right edge, one letter under the next; the user's
// own sketch writes the word horizontally and asked for it "arriba... como
// una especie de nav bar así no molesta"). `PISTAS` reads left to right, the
// four clue slots sit in a row beside it, and the whole thing is drawn BIG —
// legible at a glance, never squinted at.
//
// `PISTAS` is TYPESET real text now (D6 amended by `case-registry-and-
// captions`: on-screen text is allowed again, but only alongside an image,
// never as the sole carrier of meaning). `client/index.html` loads Nunito at
// the document root, so the constraint that once forced six hand-drawn
// `M`/`L` polylines is gone; the word renders as a plain `<div
// className="pistas-word">`, inheriting the root typeface rather than
// declaring its own (see `LevelPlay.tsx`'s `LAYOUT_CSS` `.pistas-word` rule
// for weight/size). It is still never the sole carrier of meaning: the
// bar's own class, `pistas-bar`, is a licensed caption container
// (`detective/captionAudit.ts`'s `CAPTION_CONTAINERS`) precisely because it
// always also carries the lamp's and every slot's `<image href>` marks
// below — the licence is checked against that image, never granted by the
// class name alone.
//
// The lamp and the four clue marks are the shipped RASTER art, drawn as
// `<image href="/art/...">` (see `assets.ts`'s header for why the art is
// raster at all). No `url(#...)` reference anywhere (`TraceCanvas.tsx:70-84`
// records why a referenced def hydrates blank on a real device) — no
// `<radialGradient>`, `<filter>`, `<mask>` or `<clipPath>`. An `<image>`
// needs none of them, which is precisely why it is the mechanism that
// survives the ban.
import { CLUE_ART, LAMP_ART, type ClueKind } from './assets'
import { CLUE_DRAINED } from './palette'

/** Rendered height of the lamp art, and the square a clue slot renders in.
 * Both kept at the sizes the enlarged bar already shipped (defect fix:
 * "hacé todo bien grande"). */
const LAMP_HEIGHT = 44
const SLOT_SIZE = 38

/** The bar always shows this many slot positions — one per detective trail
 * (design.md "Layout"), whatever the caller currently knows about. A caller
 * that only has visibility into the CURRENT trail (this slice; the other
 * three trails' persisted state is wired by a later slice once the catalog
 * and `LevelProgressStore` are in scope) still renders the complete
 * four-slot chrome, padded with drained placeholders. */
const RAIL_SLOT_COUNT = 4

/** One trail's filing state, as far as the caller can see it. */
export interface PistasSlot {
  kind: ClueKind
  /** The trail's clue has been filed into the case (spec: detective-mode
   * "Trail Completion Lamp and Rail Filing"). Never true before the trail's
   * route is fully completed — filing is refused mid-trace. */
  filed: boolean
}

export interface PistasRailProps {
  /** One entry per trail the caller currently knows about, in slot order.
   * Padded with drained placeholders up to {@link RAIL_SLOT_COUNT}. */
  slots: readonly PistasSlot[]
  /** The bar's single light source (design.md "Colour — the reward
   * system"). The caller decides what "on" means — `LevelPlay` ties it to
   * this trail's own filed state. */
  lampOn: boolean
}

/** The shipped lamp art, lit or drained (design.md "Light is drawn, never
 * blurred" — the lit file's rays are DRAWN into the raster by the art
 * pipeline, so there is still no blur and still no gradient anywhere). This
 * replaces three concentric stroked rings that stood in for it.
 *
 * The two files differ in width (181x192 lit, 132x192 drained — the rays
 * make the lit one wider), so the `<svg>` box is fixed at the lit aspect and
 * `preserveAspectRatio` centres the narrower drained lamp inside it. Without
 * that the whole bar would visibly reflow the moment the lamp turns on. */
function Lamp({ on }: { on: boolean }) {
  const art = on ? LAMP_ART.on : LAMP_ART.off
  return (
    <svg
      viewBox={`0 0 ${LAMP_ART.on.w} ${LAMP_ART.on.h}`}
      width={LAMP_HEIGHT * (LAMP_ART.on.w / LAMP_ART.on.h)}
      height={LAMP_HEIGHT}
      aria-hidden="true"
      focusable="false"
    >
      <image
        href={art.href}
        x={0}
        y={0}
        width={LAMP_ART.on.w}
        height={LAMP_ART.on.h}
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  )
}

/**
 * One slot: a rounded SOCKET with the trail's real clue art inside it.
 *
 * The socket is unchanged (`<rect rx={5}>` in a 24x24 box, drained grey until
 * filed, then the trail's registered colour — design.md "Colour Asset
 * Registry"). What changed is what sits IN it. This used to be an abstract
 * diamond, and the change's own notes recorded the defect: the four slots
 * "read as detached diamonds rather than slots that fill". A diamond is not
 * what the child collected — a droplet, a kernel, a footprint and a feather
 * are. Showing the actual picture the child saw on the trail is the fix, and
 * it is also what makes the socket read as a container: something recognisable
 * is now inside it.
 *
 * Earned and drained are two files derived from one silhouette, so filing a
 * clue swaps the picture's colour without moving it. A padding placeholder
 * (no `slot`) renders an empty drained socket with no art at all — there is
 * nothing yet to show, and a grey clue would falsely claim the trail exists.
 */
function Slot({ slot }: { slot: PistasSlot | undefined }) {
  const filed = !!slot?.filed
  const color = slot ? (filed ? CLUE_ART[slot.kind].earned : CLUE_DRAINED) : CLUE_DRAINED
  const art = slot ? (filed ? CLUE_ART[slot.kind].art.earned : CLUE_ART[slot.kind].art.drained) : undefined
  // Inset inside the 22-unit socket so the mark never touches its wall.
  const markHeight = 16
  const markWidth = art ? (markHeight * art.w) / art.h : 0
  return (
    <svg viewBox="0 0 24 24" width={SLOT_SIZE} height={SLOT_SIZE} aria-hidden="true" focusable="false">
      <rect
        x={1}
        y={1}
        width={22}
        height={22}
        rx={5}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        opacity={filed ? 0.9 : 0.45}
      />
      {art && (
        <image
          href={art.href}
          x={12 - markWidth / 2}
          y={12 - markHeight / 2}
          width={markWidth}
          height={markHeight}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
    </svg>
  )
}

/** Visually hidden but present in the accessibility tree and in the
 * rendered markup — the ONE place the literal word `PISTAS` exists as text
 * (spec scenario "Rail carries no copy beyond PISTAS"). The visible bar
 * itself is drawn geometry, never a text node. */
export default function PistasRail({ slots, lampOn }: PistasRailProps) {
  const padded = Array.from({ length: RAIL_SLOT_COUNT }, (_, i) => slots[i])
  return (
    <aside className="pistas-bar">
      <div className="pistas-lamp-row">
        <Lamp on={lampOn} />
      </div>
      <div className="pistas-word">PISTAS</div>
      <div className="pistas-slots">
        {padded.map((slot, idx) => (
          <Slot key={idx} slot={slot} />
        ))}
      </div>
    </aside>
  )
}
