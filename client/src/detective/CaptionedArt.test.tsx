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
