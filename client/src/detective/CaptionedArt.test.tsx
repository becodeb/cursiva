// CaptionedArt SSR tests (design unit 2, spec: detective-mode "Captioned Art
// Invariant"). Node environment, no DOM: `renderToString` on the HTML
// string, the same convention every other detective-mode test file uses.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ANIMAL_ART } from './assets'
import CaptionedArt from './CaptionedArt'

describe('CaptionedArt (spec: detective-mode "Captioned Art Invariant")', () => {
  it('renders the picture and the word as a sibling HTML caption, never an SVG <text>', () => {
    const html = renderToString(<CaptionedArt art={ANIMAL_ART.pato} label="Pato" size={36} />)
    expect(html).toContain('class="cv-captioned"')
    expect(html).toContain(`href="${ANIMAL_ART.pato.href}"`)
    expect(html).toContain('class="cv-caption">Pato<')
    expect(html).not.toContain('<text')
    expect(html).not.toContain('url(#')
  })

  it('sizes the picture by height, deriving width from the source aspect ratio', () => {
    const art = ANIMAL_ART.vaca // 448x405 — not square, so a shared multiplier would distort it
    const html = renderToString(<CaptionedArt art={art} label="Vaca" size={40} />)
    const expectedWidth = (40 * art.w) / art.h
    expect(html).toContain(`width="${expectedWidth}"`)
    expect(html).toContain('height="40"')
  })

  it('omits the className modifier by default, and appends it when given', () => {
    const bare = renderToString(<CaptionedArt art={ANIMAL_ART.pato} label="Pato" size={36} />)
    expect(bare).toContain('class="cv-captioned"')
    const withClass = renderToString(
      <CaptionedArt art={ANIMAL_ART.pato} label="Pato" size={36} className="cv-lineup-figure" />,
    )
    expect(withClass).toContain('class="cv-captioned cv-lineup-figure"')
  })

  // adventure-flow-and-map-guidance T5: `cropHeight` is new and OPTIONAL —
  // every call site above this one omits it, and this proves omitting it
  // stays byte-identical to before the prop existed (the outer svg's own
  // `height` is still exactly `size`).
  it('omits cropHeight by default: the outer svg height/viewBox stay exactly size, byte-identical to before the prop existed', () => {
    const art = ANIMAL_ART.vaca
    const html = renderToString(<CaptionedArt art={art} label="Vaca" size={40} />)
    const width = (40 * art.w) / art.h
    expect(html).toContain(`viewBox="${-width / 2} ${-20} ${width} 40"`)
    expect(html).toContain('height="40"')
  })

  // The crop: a SMALLER cropHeight shrinks only the outer svg's own
  // viewBox/height — the <image> underneath keeps drawing at the FULL,
  // uncropped `size`, so what falls below `cropHeight` in the outer
  // viewBox's coordinate space simply never enters its visible window (no
  // `<clipPath>`/`mask`/`url(#…)` anywhere — TraceCanvas.tsx's header is the
  // rule this follows).
  it('crops to cropHeight via the outer svg viewBox/height while the image keeps drawing at the full size', () => {
    const art = ANIMAL_ART.vaca
    const html = renderToString(<CaptionedArt art={art} label="Vaca" size={40} cropHeight={30} />)
    const width = (40 * art.w) / art.h
    expect(html).toContain(`viewBox="${-width / 2} ${-20} ${width} 30"`)
    expect(html).toContain('width="' + width + '" height="30"')
    // The image element itself is untouched: still x/y centred on the FULL
    // 40-tall box, never re-derived from the 30-tall crop.
    expect(html).toContain(`x="${-width / 2}" y="${-20}" width="${width}" height="40"`)
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('url(#')
  })

  // Compile-time proof (spec scenario "A caption cannot compile without its
  // image"). `client/tsconfig.json:20` includes `src`, so `npm run build`'s
  // `tsc --noEmit` typechecks THIS test file too — that is the only gate
  // that sees types at all, since vitest transpiles without typechecking and
  // can never prove this at runtime. If `label` ever stops being required,
  // `tsc` fails on the now-unused suppression below and the BUILD goes red;
  // this test file's own vitest run stays green regardless, which is why the
  // proof has to live here as a type-level line rather than as a runtime
  // assertion.
  it('documents the label-omission compile error; the real proof is npm run build, not this test run', () => {
    // @ts-expect-error — a caption-less picture is representable; a
    // picture-less caption is not. If this line ever stops erroring, the
    // invariant is gone, and only `npm run build` — never `npm test` —
    // notices.
    const proof = <CaptionedArt art={ANIMAL_ART.pato} size={36} />
    expect(proof).toBeTruthy()
  })
})
