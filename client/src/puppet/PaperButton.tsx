// A control's face, and the answer to a finger: the piece lifts off its shadow and a press
// pushes it down flat onto it, bouncing back on release. The shadow stays where it is, so
// the paper itself moves, the way a cut-out does when you touch it. CSS only (`:active`),
// so nothing here runs on the ticker and a control stays perfectly still until pressed
// (`docs/01` §5).
import type { CSSProperties } from 'react'
import { PAPER_SHADOW_FILL } from './rig'
import { SceneLayers } from './scene/Scene'
import { SCENE_SHADOW_TRANSFORM, type CutScene } from './scene/engine'

/** A full push lands the piece exactly on its shadow (`SCENE_SHADOW_TRANSFORM`). */
const PUSH = 'translate(6px, 10px)'

/** Installed once at the app's root (`main.tsx`): every screen's controls answer the same
 *  way, and a screen's own stylesheet never has to remember it. NO BACKTICKS inside. */
export const PAPER_BUTTON_CSS = `
:root { --cv-tap-size: 64px; --cv-go-size: 96px; }
/* A phone on its side: smaller paper, the same finger. The hit area stays 64 px. */
@media (max-height: 520px) { :root { --cv-tap-size: 52px; --cv-go-size: 72px; } }
.cv-paper-face { transition: transform 260ms cubic-bezier(.3, 1.9, .6, 1); }
button:active .cv-paper-face, [role="button"]:active .cv-paper-face { transform: ${PUSH}; transition: transform 50ms ease-out; }
button[disabled]:active .cv-paper-face { transform: none; }
/* A card has its shadow in CSS: the same push, in the card's own size. */
[data-paper-card] { transition: transform 260ms cubic-bezier(.3, 1.9, .6, 1), box-shadow 260ms ease-out; }
button[data-paper-card]:not([disabled]):active { transform: translate(3px, 5px); box-shadow: none; transition: transform 50ms ease-out, box-shadow 50ms ease-out; }
[data-paper-tap] { position: relative; }
@media (max-height: 520px) { [data-paper-tap]::after { content: ""; position: absolute; inset: -6px; } }
/* One way to see where the keyboard is, on any colour of any place. */
button:focus-visible { outline: 4px solid #22303a; outline-offset: 3px; box-shadow: 0 0 0 3px #fff4d8; border-radius: 14px; }
/* The primary action on a screen you cross by tapping anywhere: always the same spot. */
.cv-go { position: absolute; right: 3%; bottom: 26%; z-index: 2; box-sizing: border-box; width: var(--cv-go-size, 96px); height: var(--cv-go-size, 96px); padding: 0; border: none; background: none; cursor: pointer; }
@media (prefers-reduced-motion: reduce) {
  .cv-paper-face, [data-paper-card], button:active .cv-paper-face, [role="button"]:active .cv-paper-face, button[data-paper-card]:not([disabled]):active { transition: none; }
}
`

let installed = false

/** Puts the stylesheet in the document, and wakes `:active` on a touch screen: Safari only
 *  turns it on once something on the page listens for a touch. */
export function installPaperButtons(doc: Document): void {
  if (installed) return
  installed = true
  const style = doc.createElement('style')
  style.textContent = PAPER_BUTTON_CSS
  doc.head.appendChild(style)
  doc.addEventListener('touchstart', () => {}, { passive: true })
}

export interface PaperFaceProps {
  scene: CutScene
  /** The registry picture this stands in for, as every other piece of paper says. */
  artHref?: string
  /** This face is a picture on its own (`detective/captionAudit.ts`). */
  picture?: boolean
  className?: string
  style?: CSSProperties
  /** Standing inside another `<svg>`, in its units, rather than filling an HTML button. */
  box?: { readonly x: number; readonly y: number; readonly size: number }
}

/** A cut whose first layer's shadow stays on the ground, kept per cut so `SceneLayers`
 *  stays memoised when a parent re-renders. */
const liftedCuts = new WeakMap<CutScene, CutScene>()
function lift(scene: CutScene): CutScene {
  let cut = liftedCuts.get(scene)
  if (!cut) {
    cut = { ...scene, layers: scene.layers.map((layer, i) => (i === 0 ? { ...layer, flat: true } : layer)) }
    liftedCuts.set(scene, cut)
  }
  return cut
}

/** A cut with its ground shadow apart from everything that moves. The shadow is one group
 *  at the engine's own alpha, so overlapping pieces do not darken where they meet. */
export function PaperFace({ scene, artHref, picture, className, style, box }: PaperFaceProps) {
  return (
    <svg
      viewBox={`0 0 ${scene.w} ${scene.h}`}
      className={className}
      {...(box ? { x: box.x, y: box.y, width: box.size, height: box.size, overflow: 'visible' } : { style: { display: 'block', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', ...style } })}
      data-art={artHref}
      aria-hidden="true"
      focusable="false"
      {...(picture ? { 'data-cv-picture': 'true' } : {})}
    >
      <g transform={SCENE_SHADOW_TRANSFORM} fill={PAPER_SHADOW_FILL}>
        {scene.layers
          .filter((layer) => !layer.flat)
          .flatMap((layer) => layer.pieces)
          .map((piece, i) => (
            <path key={i} d={piece.d} />
          ))}
      </g>
      <g className="cv-paper-face">
        <SceneLayers scene={lift(scene)} still />
      </g>
    </svg>
  )
}
