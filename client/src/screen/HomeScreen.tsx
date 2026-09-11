// The home: the octopus detective in its office (`docs/10_HOME_LA_OFICINA_DEL_PULPO.md`).
//
// This is the screen the child lands on. It carries NO TEXT — no title, no
// "empezar", not the word cursiva — because the detective mode itself is
// wordless (D6) and a five-year-old cannot read the button that would break
// that. The action is the picture: the octopus holds a magnifying glass, and
// touching the glass is "keep going from where I left off".
//
// FIRST CUT (`docs/10` §5, "primer corte razonable"): the octopus, the glass
// as continue, the lamp and the rail carrying the real case state, and exactly
// one mode in the registry. The pencil and the map arrive with their modes.
//
// Inline styles, and deliberately NOT `LevelPlay`'s `LAYOUT_CSS` (`docs/10`
// §5) — the same choice `MainScreen` and `LevelMap` make. The one `<style>`
// block below exists because a keyframe animation cannot be expressed as an
// inline style, and it is scoped to this screen's own two class names.
//
// No `url(#…)` anywhere: no `<defs>`, no gradient, no mask, no clipPath. Every
// picture is an `<image href="/art/…">`, the one mechanism that survives this
// repo's ban (`TraceCanvas.tsx:63-84`).
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import {
  CLUE_ART,
  GROUND_GRASS,
  GROUND_MUD,
  HOME_DESK_ART,
  HOME_OCTOPUS_ART,
  LAMP_ART,
  type ArtImage,
} from '../detective/assets'
import { CLUE_DRAINED } from '../detective/palette'
import { ARM_ANCHORS, DEFAULT_GRIP, HOME_MODES, modeArt, type HomeMode } from '../home/modes'
import {
  lampOn as caseLampOn,
  nextCaseStep,
  railSlots,
  type CaseStep,
  type Records,
} from '../home/caseState'
import { bandScatter, type GroundMark } from '../home/officeGround'

/** The home's own canvas. Same 1000-unit width the trail canvas uses, so
 * "96 unidades" means the same size on both screens (`docs/10` §3's touch-target
 * floor). */
const VIEW_W = 1000
const VIEW_H = 600

/** The octopus is the only large element (`docs/10` §3) and everything else is
 * measured off it, so these four numbers are the layout. */
const OCTOPUS_H = 370
const OCTOPUS_W = (OCTOPUS_H * HOME_OCTOPUS_ART.w) / HOME_OCTOPUS_ART.h
const OCTOPUS_X = (VIEW_W - OCTOPUS_W) / 2
const OCTOPUS_Y = 125

/** The desk sits BELOW every arm tip on purpose. It is drawn in front of the
 * octopus, so any overlap would eat exactly the objects the arms are there to
 * hold. Its legs run off the bottom edge and the `<svg>` clips them, which is
 * what a piece of furniture in the foreground actually looks like. */
const DESK_W = 660
const DESK_H = (DESK_W * HOME_DESK_ART.h) / HOME_DESK_ART.w
const DESK_X = (VIEW_W - DESK_W) / 2
const DESK_Y = 470

/** Lamp and rail: small, along the top, sharing one centre line (`docs/10` §3
 * — "arriba, chicos, con el estado real del caso en curso"). */
const CHROME_MID_Y = 105
const LAMP_H = 84
const LAMP_W = (LAMP_H * LAMP_ART.on.w) / LAMP_ART.on.h
const LAMP_X = 64
const SLOT_SIZE = 52
const SLOT_PITCH = 70
const RAIL_RIGHT = VIEW_W - 60

/** The glass, sized by what the LENS should measure rather than by the file:
 * `build_art.py`'s `CENTRED` step pads `carrier-lens.png` so the lens lands in
 * the image's centre, and roughly the outer quarter is deliberate transparent
 * margin balancing the handle (`assets.ts`). Rendering it at 175 puts about
 * 90 units of actual glass on the arm — big, and a long way over the floor. */
const OBJECT_H = 175

/** Minimum touch target, in canvas units (`docs/10` §3). Applied as an
 * invisible square over the object, because the drawn glass is mostly
 * transparent margin and a child aims at the picture, not at the alpha. */
const TOUCH = 96

const HOME_CSS = `
.cv-home { height: 100dvh; overflow: hidden; background: ${SHEET_PAPER}; }
html, body, #root { margin: 0; height: 100%; }
/* The ONE thing on this screen that moves by itself (docs/10 §3, §7). A slow
   breath with a long pause, not a throb: it should read as "acá", not as an
   alarm. */
@keyframes cv-home-pulse {
  0%, 68%, 100% { transform: scale(1); }
  84% { transform: scale(1.07); }
}
.cv-home-pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: cv-home-pulse 4.5s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) { .cv-home-pulse { animation: none; } }
`

/** Grass across the top, trodden earth across the bottom. Fixed seeds: the
 * office is the same office every time the child opens the app. */
const GRASS = bandScatter({
  x0: -10,
  x1: VIEW_W + 10,
  y0: 24,
  y1: 42,
  count: 16,
  sizeMin: 28,
  sizeMax: 44,
  tilt: 7,
  artCount: GROUND_GRASS.length,
  seed: 0x0ff1ce,
})
const MUD = bandScatter({
  x0: -10,
  x1: VIEW_W + 10,
  y0: 552,
  y1: 584,
  count: 16,
  sizeMin: 16,
  sizeMax: 30,
  tilt: 12,
  artCount: GROUND_MUD.length,
  seed: 0xde5c,
})

/** One ground mark. Origin-centred and rotated in place, exactly like the
 * clue marks on a trail. */
function Scatter({ marks, art }: { marks: readonly GroundMark[]; art: readonly ArtImage[] }) {
  return (
    <g aria-hidden="true">
      {marks.map((m, i) => {
        const piece = art[m.art]
        const w = (m.size * piece.w) / piece.h
        return (
          <image
            key={i}
            href={piece.href}
            x={m.x - w / 2}
            y={m.y - m.size / 2}
            width={w}
            height={m.size}
            transform={`rotate(${m.angle.toFixed(2)} ${m.x.toFixed(2)} ${m.y.toFixed(2)})`}
            preserveAspectRatio="xMidYMid meet"
          />
        )
      })}
    </g>
  )
}

/** An `ArtImage` drawn at a given height, hung off one point of its own box.
 *
 * `at` is that point, as a fraction — the default is the middle, which is what
 * every piece of chrome wants. A mode's object overrides it with its declared
 * grip, because the point the arm holds is not the middle of the picture
 * (`modes.ts`'s `grip`). */
function Hung({
  art,
  cx,
  cy,
  height,
  at = DEFAULT_GRIP,
}: {
  art: ArtImage
  cx: number
  cy: number
  height: number
  at?: readonly [number, number]
}) {
  const w = (height * art.w) / art.h
  return (
    <image
      href={art.href}
      x={cx - at[0] * w}
      y={cy - at[1] * height}
      width={w}
      height={height}
      preserveAspectRatio="xMidYMid meet"
    />
  )
}

export interface HomeScreenProps {
  /** The persisted level records, straight from `cursiva.levels.v1`. Passed in
   * rather than read here so this screen stays renderable in the node test
   * harness, where there is no `localStorage`. */
  records: Records
  /** Touching an open mode's object. Carries the resolved step as well as the
   * mode, so the shell routes without re-deriving the decision. */
  onEnter: (mode: HomeMode, step: CaseStep) => void
}

export default function HomeScreen({ records, onEnter }: HomeScreenProps) {
  const slots = railSlots(records)
  const lit = caseLampOn(records)
  const step = nextCaseStep(records)

  return (
    <main className="cv-home">
      <style>{HOME_CSS}</style>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        aria-label="La oficina del pulpo detective"
      >
        {/* The page continues the world: one paper colour edge to edge, so the
            letterboxing `meet` leaves never draws a second white and never
            reads as a card sitting on a page (style guide §7.2). */}
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={SHEET_PAPER} />
        <Scatter marks={GRASS} art={GROUND_GRASS} />
        <Scatter marks={MUD} art={GROUND_MUD} />

        {/* Lamp and rail: the case in progress, read at a glance. No word
            PISTAS here — on a trail the rail needs a label because it is chrome
            beside the game; here it IS the screen, and this one carries no
            text at all. */}
        <Hung
          art={lit ? LAMP_ART.on : LAMP_ART.off}
          cx={LAMP_X + LAMP_W / 2}
          cy={CHROME_MID_Y}
          height={LAMP_H}
        />
        {slots.map((slot, i) => {
          const cx = RAIL_RIGHT - SLOT_SIZE / 2 - (slots.length - 1 - i) * SLOT_PITCH
          const art = slot.filed ? CLUE_ART[slot.kind].art.earned : CLUE_ART[slot.kind].art.drained
          const colour = slot.filed ? CLUE_ART[slot.kind].earned : CLUE_DRAINED
          return (
            <g key={slot.kind}>
              <rect
                x={cx - SLOT_SIZE / 2}
                y={CHROME_MID_Y - SLOT_SIZE / 2}
                width={SLOT_SIZE}
                height={SLOT_SIZE}
                rx={12}
                fill="none"
                stroke={colour}
                strokeWidth={3.5}
                opacity={slot.filed ? 0.9 : 0.45}
              />
              <Hung art={art} cx={cx} cy={CHROME_MID_Y} height={SLOT_SIZE - 16} />
            </g>
          )
        })}

        {/* The octopus, drawn ONCE. Every mode is an object composed onto one
            of its arms — never a second drawing of the character (`modes.ts`). */}
        <image
          href={HOME_OCTOPUS_ART.href}
          x={OCTOPUS_X}
          y={OCTOPUS_Y}
          width={OCTOPUS_W}
          height={OCTOPUS_H}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Touching the octopus itself enters the active mode too (`docs/10`
            §3) — the character is the biggest thing on screen and a child aims
            at it before aiming at anything it holds. */}
        <rect
          x={OCTOPUS_X}
          y={OCTOPUS_Y}
          width={OCTOPUS_W}
          height={DESK_Y - OCTOPUS_Y}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onClick={() => onEnter(HOME_MODES[0], step)}
        />

        {/* In front of the octopus, below every arm. */}
        <image
          href={HOME_DESK_ART.href}
          x={DESK_X}
          y={DESK_Y}
          width={DESK_W}
          height={DESK_H}
          preserveAspectRatio="xMidYMid meet"
        />

        {HOME_MODES.map((mode) => {
          const shown = modeArt(mode, records)
          if (!shown) return null
          const [ax, ay] = ARM_ANCHORS[mode.arm]
          const cx = OCTOPUS_X + ax * OCTOPUS_W
          const cy = OCTOPUS_Y + ay * OCTOPUS_H
          const touch = Math.max(TOUCH, OBJECT_H * 0.75)
          return (
            <g key={mode.id}>
              <g className={shown.enabled ? 'cv-home-pulse' : undefined}>
                <Hung art={shown.art} cx={cx} cy={cy} height={OBJECT_H} at={mode.grip} />
              </g>
              {/* The hit area is a plain square over the object. Bigger than
                  the drawn glass on purpose, and invisible rather than absent:
                  `fill="none"` would let the touch fall through. */}
              <rect
                x={cx - touch / 2}
                y={cy - touch / 2}
                width={touch}
                height={touch}
                fill="transparent"
                style={{ cursor: shown.enabled ? 'pointer' : 'default' }}
                onClick={shown.enabled ? () => onEnter(mode, step) : undefined}
              />
            </g>
          )
        })}

      </svg>
    </main>
  )
}
