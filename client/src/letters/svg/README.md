# Hand-drawn letter SVGs

Drop a hand-drawn single-stroke SVG here and the app picks it up automatically
on reload — no code changes required. The path is **automatically normalized**
onto the ruled line, so the frame size or viewBox you export from Figma does not
matter. `a.svg` ships as the reference letter: open it alongside your own file
and mirror its structure (one `<path>`, no fill, stroke-only ductus).

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

## The two rules that matter

1. **Start every letter at the baseline-left entry anchor** (Y ≈ 420, left side
   of the stroke): the pen lifts off the baseline, rises, and returns.
2. **End the stroke on the line the table below says** — the exit connects the
   letter into the next one, so it is where pronunciation actually finishes.

| Letter | Zone | Exit anchor | Note |
|--------|------|-------------|------|
| a | media | baseline-right | |
| b | alta | mid-right | termina en la línea media con el gancho (lazo) hacia la derecha |
| c | media | baseline-right | |
| d | alta | baseline-right | |
| e | media | mid-right | tongue ends at mid-height |
| f | alta | baseline-right | exit checked against the Zaner-Bloser reference |
| g | baja | baseline-right | |
| h | alta | baseline-right | |
| i | media | baseline-right | dot is a separate subpath |
| j | mixta | baseline-right | dot is a separate subpath |
| k | alta | baseline-right | |
| l | alta | baseline-right | |
| m | media | baseline-right | |
| n | media | baseline-right | |
| o | media | top-right | ends at the top of the body |
| p | baja | baseline-right | |
| q | baja | baseline-right | |
| r | media | baseline-right | el brazo queda a la altura media pero la salida baja a la línea base |
| s | media | baseline-right | |
| t | alta | baseline-right | crossbar is a separate subpath |
| u | media | baseline-right | |
| v | media | top-right | ends at the top of the body |
| w | media | top-right | ends at the top of the body |
| x | media | baseline-right | second diagonal is a separate subpath |
| y | baja | baseline-right | |
| z | media | baseline-right | |

The pipeline warns (console, 80px tolerance) when a stroke does not start near
its entry anchor or does not end near its letter's exit corner — so a wrongly
drawn letter tells you before the app does. `o v w` (top), `b e` (mid) and `r`
(baseline) ended at their table anchors never warn.

## Multi-subpath letters (i, j, t, f, x)

ALL strokes — body, dot, crossbar, both diagonals — MUST be combined into
**ONE `<path>` element** using several `M` subcommands. The pipeline reads
**only the first `<path>`** of the SVG, so any stroke in a second `<path>`
element is silently dropped.

- Inkscape: select all strokes, then **Path → Combine (Ctrl+K)**.
- Figma: select all strokes, then **flatten / combine** (the strokes merge into
  one path with multiple `M` subpaths).

Inside that single path:

- The **main stroke comes first** in the file — the pipeline classifies it
  automatically as the subpath starting nearest the baseline-left entry anchor,
  so a body that starts at the baseline wins even when the file lists the dot
  first. But the authoring rule is: **body first, pen-lift strokes after**.
- The dot (`i`/`j`), the crossbar (`t`/`f`) and the second diagonal (`x`) are
  **pen-lift strokes drawn AFTER the main path** ("finish the word"). Their jump
  away from the body is intentional and never warns.
- For `x`: the **first diagonal is the one starting at the entry anchor**
  (baseline-left); the second diagonal is the other one.

## Zone map

The normalization target is chosen by the letter's zone (see `LETTER_ZONES` /
`resolveBaselineZone` in `svgLetter.ts`):

| Zone     | Letters                            | Vertical span (where it rests)     |
| -------- | ---------------------------------- | ---------------------------------- |
| `media`  | `a c e i m n o r s u v w x z`      | middle line (300) → baseline (420) |
| `alta`   | `b d f h k l t`                    | top line (180) → baseline (420)    |
| `baja`   | `g p q y`                          | middle line (300) → descender (540)|
| `mixta`  | `j`                                | top line (180) → descender (540)   |

Note: `t` is an ascender (`alta`) in this model (Zaner-Bloser style).
Unknown characters default to `media`.

## Only the `d` matters

The letter is entirely defined by the `d` attribute of the **first `<path>`**
element. Everything else in the file is ignored or normalized away:

- The frame **size, width/height, or viewBox** — the pipeline fits the path's
  bounding box onto the ruled zone (uniform scale, centered at x = 500), so a
  tiny bbox-only viewBox (e.g. `0 0 154 54`) is scaled up correctly.
- **Group transforms** (`<g transform="translate(...)">`) — `a.svg` itself has
  one; the fit absorbs it. Do not rely on them: keep the path data self-contained.
- **Fills, strokes, opacity, metadata** — cosmetics only.

Checkpoints, the ideal scoring cloud, the animation timeline, and the
entry/exit anchors are all generated automatically by
`client/src/letters/svgLetter.ts`.

## Export checklist

1. In Figma, create a frame; draw with the pen tool (P), stroke only, no fill.
2. Bottom of the stroke rests on the baseline (Y ≈ 420); top reaches the line
   of its zone.
3. Starts at the baseline-left (Y ≈ 420); ends per the exit column of the table.
4. Multi-stroke letters: flatten/combine into ONE `<path>`; secondary strokes
   after the main one.
5. Export as SVG, save as `<char>.svg` (lowercase single character, e.g.
   `b.svg`, `x.svg`) in this folder.
6. Reload the app: demo + checkpoints render for the letter; open the console
   and fix any anchor/gap warnings the pipeline emits.

## Manual verification

The eager glob is evaluated at build/test time; `a.svg` ships with the repo, so
the loop is: drop `<char>.svg`, reload, check demo + checkpoints, read the
console for anchor warnings. `npm test -w client` runs the pipeline suites
(classification, diagnostics, zones, anchors) against the real `a.svg` and the
synthetic fixtures.