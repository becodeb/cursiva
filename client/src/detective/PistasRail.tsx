// PISTAS rail (`detective-mode` design unit 5, spec: level-engine "PISTAS
// Rail Chrome"). Fixed DOM chrome, a flex sibling of the canvas inside
// `.cv-sheet` (`LevelPlay.tsx`) — NEVER inside the 1000-unit viewBox, so it
// steals no room from the trail (design.md "Layout").
//
// `PISTAS` is DRAWN, not typeset (D6): six glyphs as stroked `M`/`L`
// polylines in a 100-unit em, stroke width 8, `strokeLinecap="round"` to
// match the child's own ink cap (`TraceCanvas.tsx:890`), no fill. No font, no
// `font-family`, no `@font-face` anywhere in this file. The rail's only
// literal text is the single hidden accessibility label below — the visible
// word is geometry, never a text node.
//
// The lamp is the engraver's halo: three concentric stroked rings at
// decreasing opacity. No `url(#...)` reference anywhere (`TraceCanvas.tsx:
// 70-84` records why a referenced def hydrates blank on a real device) — no
// `<radialGradient>`, `<filter>`, `<mask>` or `<clipPath>`.
import { CLUE_ART, type ClueKind } from './assets'
import { CLUE_DRAINED, LAMP } from './palette'

/** Matches the shipped ink `TraceCanvas.tsx:89` (`INK_COLOR '#1e293b'`, not
 * exported) — the drawn word reads as the same hand as the child's own
 * trace, re-declared here rather than imported (same convention `palette.ts`
 * already uses for the base ink-on-paper values). */
const RAIL_INK = '#1e293b'

/** Stroke width for the drawn `PISTAS` glyphs, in the 100-unit em box. */
const GLYPH_STROKE_WIDTH = 8

/**
 * Six glyphs, each in a 60×100-unit em, built from `M`/`L` segments only
 * (D6). Blocky and legible at the rail's small rendered size rather than
 * calligraphic — the point is that no font subsystem exists here, not that
 * these are beautiful letterforms.
 */
const GLYPH_PATHS: readonly string[] = [
  // P — stem plus an open bowl on the upper half.
  'M10,0 L10,100 M10,0 L50,0 L50,45 L10,45',
  // I — stem with top and bottom serifs.
  'M30,0 L30,100 M10,0 L50,0 M10,100 L50,100',
  // S — a stepped zig-zag, the only shape `M`/`L` alone can give an S.
  'M50,10 L10,10 L10,45 L50,45 L50,90 L10,90',
  // T — top bar plus stem.
  'M5,0 L55,0 M30,0 L30,100',
  // A — two legs and a crossbar.
  'M10,100 L30,0 L50,100 M17,60 L43,60',
  // S — same shape as the first S.
  'M50,10 L10,10 L10,45 L50,45 L50,90 L10,90',
]

/** The rail always shows this many slot positions — one per detective trail
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
  /** The rail's single light source (design.md "Colour — the reward
   * system"). The caller decides what "on" means — `LevelPlay` ties it to
   * this trail's own filed state. */
  lampOn: boolean
}

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 60 100" width={22} height={36} aria-hidden="true" focusable="false">
      <path
        d={d}
        fill="none"
        stroke={RAIL_INK}
        strokeWidth={GLYPH_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Three concentric rings, stepped opacity — the engraver's halo, never a
 * blurred glow (design.md "Light is drawn, never blurred"). */
function Lamp({ on }: { on: boolean }) {
  const color = on ? LAMP : CLUE_DRAINED
  return (
    <svg viewBox="0 0 60 60" width={26} height={26} aria-hidden="true" focusable="false">
      <circle cx={30} cy={30} r={8} fill="none" stroke={color} strokeWidth={4} />
      <circle cx={30} cy={30} r={17} fill="none" stroke={color} strokeWidth={3} opacity={0.6} />
      <circle cx={30} cy={30} r={26} fill="none" stroke={color} strokeWidth={2} opacity={0.3} />
    </svg>
  )
}

/** One slot: the trail's registry art, drained grey until filed, then the
 * trail's own registered colour (design.md "Colour Asset Registry"). A
 * padding placeholder (no `slot`) renders a plain drained diamond outline. */
function Slot({ slot }: { slot: PistasSlot | undefined }) {
  if (!slot) {
    return (
      <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" focusable="false">
        <polygon
          points="12,2 22,12 12,22 2,12"
          fill="none"
          stroke={CLUE_DRAINED}
          strokeWidth={2}
          opacity={0.6}
        />
      </svg>
    )
  }
  const art = CLUE_ART[slot.kind]
  const color = slot.filed ? art.earned : CLUE_DRAINED
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" focusable="false">
      <polygon
        points="12,2 22,12 12,22 2,12"
        fill={slot.filed ? color : 'none'}
        stroke={color}
        strokeWidth={2}
      />
    </svg>
  )
}

/** Visually hidden but present in the accessibility tree and in the
 * rendered markup — the ONE place the literal word `PISTAS` exists as text
 * (spec scenario "Rail carries no copy beyond PISTAS"). The visible rail
 * itself is drawn geometry, never a text node. */
const SR_ONLY_STYLE = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden' as const,
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap' as const,
  border: 0,
}

export default function PistasRail({ slots, lampOn }: PistasRailProps) {
  const padded = Array.from({ length: RAIL_SLOT_COUNT }, (_, i) => slots[i])
  return (
    <aside className="pistas-rail">
      <div className="pistas-lamp-row">
        <Lamp on={lampOn} />
      </div>
      <div className="pistas-body">
        <div className="pistas-word">
          {GLYPH_PATHS.map((d, idx) => (
            <Glyph key={idx} d={d} />
          ))}
        </div>
        <div className="pistas-slots">
          {padded.map((slot, idx) => (
            <Slot key={idx} slot={slot} />
          ))}
        </div>
      </div>
      <span style={SR_ONLY_STYLE}>PISTAS</span>
    </aside>
  )
}
