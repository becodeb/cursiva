# Hand-drawn letter SVGs

Drop a hand-drawn single-stroke SVG here and the app picks it up automatically
on reload — no code changes required. The path is **automatically normalized**
onto the ruled line, so the frame size or viewBox you export from Figma does not
matter.

## The ruled line (in a 1000 × 600 Figma frame)

Draw against these four horizontal guides. Coordinates are in the `0 0 1000 600`
viewBox, with Y growing **downward**:

| Line            | Y    | Distance from baseline |
| --------------- | ---- | ---------------------- |
| Top line        | 180  | 240px up               |
| Middle line     | 300  | 120px up               |
| Baseline        | 420  | 0 (rest here)          |
| Descender line  | 540  | 120px down             |

So: 120px from the baseline up to the middle line, 240px up to the top line, and
120px down to the descender line.

## How to draw

1. In Figma, create a frame (any size — a 1000 × 600 frame matches the viewBox
   above, but the export viewBox is irrelevant; the app normalizes it).
2. Draw the letter with the **pen tool (P)** as a **single continuous `<path>`**,
   **stroke only, no fill**.
3. The **bottom of the stroke must rest on the baseline** (Y ≈ 420) and the
   **top of the stroke must reach the middle line** (Y ≈ 300) for medium-height
   letters (`a`, `c`, `o`, ...). Ascenders (`b`, `d`, `f`, `h`, `k`, `l`) reach
   the top line; descenders (`g`, `p`, `q`, `y`) drop to the descender line; `j`
   spans top line to descender line.
4. **Start at the bottom-left** and **end at the bottom-right** (so letters
   connect into real cursive). Exceptions (e.g. an attached exit like "br") are
   solved by the path itself.
5. Export the frame as **SVG** and save it as `<char>.svg` in **this folder**
   (lowercase single character, e.g. `a.svg`, `c.svg`).

- Figma exports an `<svg>` containing a `<path d="...">`. Nested `<g>` / `<svg>`
  wrappers are fine — the pipeline takes only the **first `<path>`** it finds.
- The viewBox/size Figma used for export is **ignored**: `svgLetter.ts` fits the
  path's bounding box onto the ruled zone (uniform scale, centered at x = 500),
  so a tiny bbox-only viewBox (e.g. `0 0 154 54`) is scaled up correctly — the
  stroke bottom lands on the baseline and the top on the right line for its zone.
- Checkpoints, the ideal scoring cloud, and the animation timeline are all
  generated automatically by `client/src/letters/svgLetter.ts`.

## Zone map

The normalization target is chosen by the letter's zone (see
`LETTER_ZONES` / `resolveBaselineZone` in `svgLetter.ts`):

| Zone     | Letters                                  | Vertical span (where it rests)        |
| -------- | ---------------------------------------- | ------------------------------------- |
| `media`  | `a c e i m n o r s t u v w x z`          | middle line (300) → baseline (420)    |
| `alta`   | `b d f h k l`                            | top line (180) → baseline (420)       |
| `baja`   | `g p q y`                                | middle line (300) → descender (540)   |
| `mixta`  | `j`                                      | top line (180) → descender (540)      |

Unknown characters default to `media`.

## Ligatures (future modeling, out of MVP scope)

To minimize ligatures, model `ca` as the `c` followed by the `a`, with the final
endpoint of the `c` coinciding with the start of the `a` (both resting on the
baseline). This is future work and not part of the current MVP.

## Manual verification

Because the glob is evaluated at build/test time, this folder ships with no
checked-in letters by default (a local `a.svg` is fine for a quick check). To
verify end-to-end: drop `a.svg` (or any `<char>.svg`) in here, then reload the
app — `getLetterConfig('<char>')` resolves to the generated `LetterConfig`
(SVG priority, Kalam fallback otherwise).
