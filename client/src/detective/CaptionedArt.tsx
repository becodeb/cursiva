// Captioned art (`case-registry-and-captions` design unit 2, spec:
// detective-mode "Captioned Art Invariant"). The ONLY way a word may render
// beside a picture in this app: `label` is a REQUIRED prop, so a call site
// that tries to draw a caption with no image simply cannot compile
// (`CaptionedArt.test.tsx`'s `@ts-expect-error` line is the proof, and only
// `npm run build` — never vitest — can see it; see that file's header).
//
// The image is SVG, the caption is plain HTML — a SIBLING of the `<svg>`,
// never an SVG `<text>`. The shipped precedent is `PistasRail.tsx`'s
// `pistas-bar`/`.pistas-word` (`PistasRail.tsx:153`): real text, inheriting
// the document root's Nunito (`client/index.html`), never re-declaring its
// own font. No `url(#...)` reference anywhere (`TraceCanvas.tsx:70-84`'s
// ban) — `<image href>` is the one mechanism that survives it.
//
// `detective/captionAudit.ts` is what checks the OTHER half of the
// invariant across a whole screen: that no caller ever hand-writes a
// `cv-caption` span next to an imageless container. This component is the
// type-level half; the audit is the runtime half.
import type { ArtImage } from './assets'

export interface CaptionedArtProps {
  art: ArtImage
  /**
   * The word under the picture. REQUIRED: no `?`, no default value, no `''`
   * sentinel, no conditional render. A picture with no word is
   * representable — `assets.ts`'s registry is full of them; a word with no
   * picture is not, and that asymmetry IS the invariant (spec: "Captioned
   * Art Invariant").
   *
   * A destructuring default (e.g. `label = ''`) would make this property
   * OPTIONAL in the props type TypeScript actually checks against, silently
   * defeating the whole point — never add one.
   */
  label: string
  /** Rendered height of the picture, in CSS px (or viewBox units, when
   * nested inside a parent `<svg>`). Width follows from the source file's
   * own aspect ratio, the same convention `Deduction.tsx`'s old `Art`
   * helper and `PistasRail.tsx`'s marks both already use. */
  size: number
  className?: string
}

/** A picture and its word, welded so neither can ship without the other. */
export default function CaptionedArt({ art, label, size, className }: CaptionedArtProps) {
  const width = (size * art.w) / art.h
  return (
    <span className={className ? `cv-captioned ${className}` : 'cv-captioned'}>
      <svg
        viewBox={`${-width / 2} ${-size / 2} ${width} ${size}`}
        width={width}
        height={size}
        aria-hidden="true"
        focusable="false"
      >
        <image
          href={art.href}
          x={-width / 2}
          y={-size / 2}
          width={width}
          height={size}
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
      <span className="cv-caption">{label}</span>
    </span>
  )
}
