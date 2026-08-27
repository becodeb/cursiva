# Exploration: Cursive Letter Paths (`cursive-letter-paths`)

> Research for hand-drawing lowercase cursive letters as **single-stroke SVG paths** that
> represent pen trajectory. The app traces ONE letter at a time — it does NOT render text and
> has no font/shaping engine. Artifact store mode: **openspec** (filesystem only).

Local ruled-line reference (from `client/src/letters/svg/README.md` and `svgLetter.ts`),
viewBox `0 0 1000 600`, Y grows downward:

| Line | Y | Meaning |
|------|----|---------|
| Top line | 180 | ascenders reach here |
| Middle line | 300 | x-height top (media letters) |
| Baseline | 420 | ALL letters rest here |
| Descender line | 540 | g, p, q, y drop here |

Letter zones (from `LETTER_ZONES`): `media` a c e i m n o r s t u v w x z · `alta` b d f h k l ·
`baja` g p q y · `mixta` j.

---

## 1. Cursive letter anatomy

Cursive = a **continuous ductus**: each letter is one flowing stroke made of an *entry stroke*
(lead-in from the left), the *body*, and an *exit stroke* (lead-out to the right). Letters connect
because the exit of one overlaps/meets the entry of the next. In **continuous cursive** (the style
that teaches letters *with both* entry and exit strokes — the right model for a connecting app),
every lowercase letter begins with an entry stroke from the baseline.

**Letter families** (taxonomy supported by Zaner-Bloser / D'Nealian US teaching methods and the
per-letter "similar strokes" groupings on wikiHow):

1. **Oval / "magic-c" family** — `c, a, d, g, o, q` (and the related loop `e`). All begin with the
   same upward "c" curve and form a closed/open oval. `d, g, q` add an ascender/descender stem.
2. **Stick / arch family** — `i, l, t, u, w, y, j`. Vertical or arched strokes; `l, t` get a
   cross/loop, `y, j` get a descender, `w` is a doubled arch.
3. **Hump family** — `n, m` (x-height humps) plus the ascender/descender humps `h, b, p, k, r`.
   `n/m` are the base pattern; `h/b/k` rise to the top line, `p` drops to the descender, `r` is a
   small top arm.
4. **Specials** — `e` (mid-line loop), `s` (S-curve), `f` (ascender loop, style-dependent),
   `v` (diagonals), `x` (cross), `z` (zigzag).

A cursive letter is therefore defined by **(entry point, body shape, exit point)** — not by a glyph
outline. That triad is exactly what the app needs as metadata.

**Sources**: Wikipedia "Cursive" (continuous vs basic cursive; subclasses ligature/looped/italic);
Wikipedia "Zaner-Bloser Method", "D'Nealian"; wikiHow "Write in Cursive" (per-letter stroke steps
and "similar strokes" groupings).

---

## 2. Entry / exit taxonomy (every lowercase letter)

**Validated rule (Wikipedia "Cursive", United Kingdom cursive vs continuous-cursive table):**
- *Starting point*: in continuous cursive **always on the writing line** (baseline-left entry stroke).
  This **validates the user's hypothesis** — every lowercase letter starts bottom-left.
- *Finishing point*: **always on the writing line EXCEPT `o`, `r`, `v`, `w`, which have a TOP exit
  stroke.** Plus `e` exits at **mid-height** (its loop closes at the middle line). So the user's
  "end bottom-right OR mid-line right" is correct, with the refinement that a few letters exit at the
  TOP, not the baseline.

This matches how real cursive fonts work internally: each glyph carries an **entry anchor** (baseline-
left) and an **exit anchor** (baseline-right by default; top-right for o/r/v/w; mid-right for e) used
by the OpenType `curs` feature to overlap connections.

| Letter | Zone | Start (entry) | End (exit) | Family | Hand-draw note |
|--------|------|---------------|-----------|--------|----------------|
| a | media | baseline-left | baseline-right | oval | tail ends baseline-right; entry from baseline-left |
| b | alta | baseline-left | baseline-right | hump+asc | up to top line, bowl, sweeps to baseline-right |
| c | media | baseline-left | baseline-right | oval | simple curve; its exit = a's entry for `ca` |
| d | alta | baseline-left | baseline-right | oval+asc | ascender + oval, exit baseline-right |
| e | media | baseline-left | **mid-right** | loop | SPECIAL: exit at middle line (Y≈300) |
| f | alta | baseline-left | baseline-right* | asc loop | *exit style-dependent — verify vs chosen reference (Zaner-Bloser = baseline-right) |
| g | baja | baseline-left | baseline-right | oval+desc | loop through descender, exit baseline-right |
| h | alta | baseline-left | baseline-right | hump+asc | ascender + hump, exit baseline-right |
| i | media | baseline-left | baseline-right | stick | **dot is a SEPARATE stroke — exclude from main path** |
| j | mixta | baseline-left | baseline-right | stick+desc | dot separate; descender tail, exit baseline-right |
| k | alta | baseline-left | baseline-right | asc diag | ascender + diagonal leg, exit baseline-right |
| l | alta | baseline-left | baseline-right | stick+asc | ascender loop, exit baseline-right |
| m | media | baseline-left | baseline-right | hump×3 | three humps, exit baseline-right |
| n | media | baseline-left | baseline-right | hump×2 | two humps, exit baseline-right |
| o | media | baseline-left | **top-right** | oval | SPECIAL: exit at TOP-right (connector rises to next letter) |
| p | baja | baseline-left | baseline-right | hump+desc | descender bowl, exit baseline-right |
| q | baja | baseline-left | baseline-right | oval+desc | descender tail, exit baseline-right |
| r | media | baseline-left | **top-right** | small arm | SPECIAL: exit at TOP-right (the arm) |
| s | media | baseline-left | baseline-right | s-curve | exit baseline-right; `s→t` may want a slight rise |
| t | media | baseline-left | baseline-right | stick+cross | crossbar separate; trace main stroke only |
| u | media | baseline-left | baseline-right | arch | up/down/arch, exit baseline-right |
| v | media | baseline-left | **top-right** | diagonal | SPECIAL: exit at TOP-right (second peak) |
| w | media | baseline-left | **top-right** | diag×2 | SPECIAL: exit at TOP-right (final peak) |
| x | media | baseline-left | baseline-right | cross | two diagonals; "links out at the baseline" (Wikipedia) |
| y | baja | baseline-left | baseline-right | stick+desc | descender tail, exit baseline-right |
| z | media | baseline-left | baseline-right | zigzag | exit baseline-right |

**Refinement of the user's hypothesis:** "most start bottom-left, end bottom-right" is **correct for
START (universal)** and for END of ~21/26 letters. The exceptions are `o, r, v, w` (top-right exit)
and `e` (mid-right exit). The user's sub-claim that **`b` exits from the top is NOT the standard rule**
— in continuous cursive `b` (and `h, k, l, d, f, t`) exit at the baseline; only `o, r, v, w` exit top.
The README's blanket "start bottom-left, end bottom-right" instruction must be amended for `o, r, v, w, e`.

---

## 3. Ligature analysis

**What a ligature is**: a glyph combination that joins letters so the pen need not lift. In *fonts*,
`calt`/`clig`/`dlig` swap one glyph for a neighbor-aware variant (e.g. Microsoft spec: *"in Caflisch
Script, o is replaced by o.alt2 when followed by an ascending letterform"*; *"ft replaces f t in
Bickham Script except when preceded by an ascending letter"*). Real cursive fonts also use `curs`
(cursive positioning, GPOS type 3) to **overlap each glyph's exit anchor on the next glyph's entry
anchor**.

**Problem pairs the user listed** — and how they resolve with per-letter anchors:

| Pair | Why it's "hard" | Resolution with anchors |
|------|----------------|--------------------------|
| `o→a/c/d/g/q` | o exits **top-right**; next letter enters **baseline-left** | connector = short curve from o.top-right down to next baseline-left (the classic "o→vowel" connector) |
| `v→o`, `w→o` | v/w exit **top-right**; o enters baseline-left | same top→baseline connector |
| `b→r/o/v/w/e` | b exits baseline-right; these ENTER baseline-left | **not actually a problem** — all enter at baseline; only their own EXIT is top/mid |
| `e→r/n/m` | e exits **mid-right**; next enters baseline-left | connector mid→baseline |
| `s→t` | s's exit curves up into t | baseline→baseline connector, optionally a slight rise (a `clig`-style nicety, not blocking) |
| `vi`, `oa` | top-exiting left letter → baseline entry | covered by the top→baseline connector above |

**Is OpenType needed for THIS app? — NO (definitive).** Reasoning:
1. The app renders **one hand-drawn SVG at a time**; there is no text run, no shaping engine, no
   glyph substitution. `calt`/`liga`/`dlig` only fire when a layout engine processes adjacent glyphs
   — which never happens here.
2. The *transferable concept* from OpenType is the **`curs` anchor model**: store each letter's
   `entry` (baseline-left) and `exit` (per §2) as plain metadata. That is data, not a font table.
3. If a future "word mode" is added, connections are drawn by a connector curve between `exit(i)` and
   `entry(i+1)` — again pure data, no OpenType. (Optional `calt`-style variants like `o.alt2` would
   only matter if the app wanted style-specific swaps per neighbor; out of scope.)

**Recommendation**: model **entry/exit anchor points as per-letter metadata** (baseline-left universal;
baseline-right default; top-right for o/r/v/w; mid-right for e). No OpenType, no font, no `calt`/`liga`.
Real cursive fonts (Kalam, Learning Curve, etc.) remain useful only as *references* for where those
anchors sit.

---

## 4. Existing open-source solutions

**Finding**: GitHub repository searches for *"cursive handwriting svg stroke order single path"* and
*"cursive connecting font stroke order OFL"* both returned **0 repositories** — there is **no famous
turnkey open dataset of single-stroke SVG Latin cursive letters with pen trajectory**. The problem is
therefore solved from scratch, guided by references:

1. **OFL cursive fonts as connection references** (Google Fonts, SIL Open Font License — free to study):
   - **Learning Curve** (Emily Conners) — `https://fonts.google.com/specimen/Learning+Curve` — a
     connecting school cursive; ideal reference for entry/exit behavior.
   - **Dancing Script** (Pablo Impallari, OFL) — `https://fonts.google.com/specimen/Dancing+Script`.
   - **Great Vibes**, **Allura**, **Kalam** (already in this repo as fallback), **Caveat**,
     **Pacifico**, **Satisfy** — all OFL connecting scripts on `fonts.google.com`.
   - *How they solved it*: each glyph encodes entry/exit anchors + `calt` alternates; study their
     outlines (not as strokes, but as connection geometry).
2. **fontTools** (MIT) — `https://github.com/fonttools/fonttools` — Python lib to extract glyph
   contours/`curs` anchors from any OFL font (`ttx` dumps GPOS `curs` entry/exit coordinates). Practical
   for *measuring* where a reference font places its anchors, then hand-drawing matching strokes.
3. **Handwriting synthesis stroke data** (the conceptual model the app already uses — pen trajectory):
   - **Graves, "Generating Sequences With Recurrent Neural Networks"**, arXiv:1308.0850 — models online
     handwriting as a sequence of (x, y, pen-up/pen-down) points; the pen-up event is exactly the
     "end of one stroke / lift" boundary. Directly relevant to single-stroke tracing.
   - **IAM On-Line Handwriting Database** (`http://www.fki.inf.unibe.ch/databases/iam-on-line-handwriting-database`)
     — stroke-level English handwriting (pen-lift tagged); useful only if the app ever wants real
     traced samples, not for authoring the 26 letters.
4. **Teaching templates**: wikiHow "Write in Cursive" and Zaner-Bloser/D'Nealian charts give the
   canonical stroke *order* per letter (the pedagogue's "ductus") — the authoritative source for how to
   draw each `<path>` by hand.

**Recommendation**: author the 26 letters by hand in Inkscape per §2 anchors, using a chosen OFL
reference font (e.g. Learning Curve) for visual entry/exit behavior and the Zaner-Bloser/D'Nealian
ductus for stroke order. Do not depend on any dataset.

---

## 5. Recommended letter set & metadata

**Scope**: 26 lowercase letters `a–z`, one `<char>.svg` each in `client/src/letters/svg/` (matching the
existing `a.svg` + the eager Vite glob in `svgLetter.ts`). **Uppercase and digits are OUT of scope for
this change** — the registry lowercases input, and in cursive uppercase letters generally do NOT join
to a following lowercase except at the start of a word (wikiHow Q&A). Defer uppercase/digits to a later
change; the per-letter anchor model extends to them trivially later.

**Per-letter metadata to record** (add to `LetterConfig` or a sidecar): `entry` = `baseline-left`
(universal), `exit` ∈ {`baseline-right`, `top-right`, `mid-right`} per §2, `zone` per `LETTER_ZONES`,
and a `ductusOrder` note (which teaching stroke to draw first). The 26-entry table in §2 is the
authoring spec: draw each as ONE continuous `<path>`, stroke-only, starting at the baseline-left and
ending at its exit anchor. The existing `a.svg` already complies (its first node is bottom-left).

**Drawing rules for the user**:
- Always begin with the entry stroke from the baseline-left (even ascenders like b/d/f/h/k/l).
- `o, r, v, w` must end with the stroke rising to the TOP-right; `e` ends at the middle line.
- Exclude dots (i, j) and crossbars (t, f cross) from the main path, OR draw them as a second optional
  pass — decision needed (see Risks #4).

---

## 6. Risks

1. **Pipeline end-corner diagnostic is wrong for top/mid-exit letters.** `buildLetterConfig` warns
   *"does not end near the lower-right corner"* when the last fitted point is >80px from the bbox's
   lower-right. For `o, r, v, w` (top exit) and `e` (mid exit) this fires **falsely**, and the README's
   "end bottom-right" rule is incorrect for them. → Fix: amend README + make the diagnostic anchor-aware
   (skip/relabel for known top/mid-exit letters) or replace with entry/exit-anchor validation.
2. **bbox normalization can misalign exit strokes outside the body.** `adjustToRuledZone` fits the full
   path bbox into the zone. If an exit flourish drops below the baseline or an entry dips, the whole
   letter is scaled/shifted, breaking vertical alignment. → Constrain drawing to the zone, or anchor
   normalization on entry/exit points instead of raw bbox.
3. **Group transforms are silently dropped.** `extractPathD` takes only the `d` (the existing `a.svg`
   has a `<g transform="translate(...)">` that is ignored). Safe today because of bbox fit, but document
   that only the `d` matters.
4. **Multi-stroke letters (i, j, t, f, x, k).** Natural pen lifts (dots, crosses, the two strokes of x).
   The README mandates a *single* continuous path. **Decision required**: trace only the main stroke
   (omit decorative dots/crosses) vs. allow multi-subpath with `hasGaps` warning. This affects pedagogy
   and the spec.
5. **Spec is outdated.** `openspec/specs/letter-model/spec.md` ("Path–Checkpoint Consistency") still says
   paths **SHALL be extracted from Kalam-Regular font** and describes `guideD` (glyph contour FILL) +
   `ideal` (area cloud of glyph *body*). The hand-drawn single-stroke direction (Kalam was rejected as
   "letras horribles") supersedes this. The change MUST revise that requirement: hand-drawn ductus,
   entry/exit anchors as metadata, `ideal` from the stroke centerline, checkpoints along the ductus.
6. **Zone assumptions for `t`/`f`.** `svgLetter` puts `t` in `media` (x-height) and `f` in `alta`
   (ascender). Confirm this matches the chosen reference style; some methods treat `t` as an ascender.

---

## Structured Analysis (return format)

**Current State**: Only `a.svg` exists; the app normalizes any hand-drawn single-path SVG onto the
ruled line via bbox fit + checkpoint/ideal generation. The pipeline assumes "start bottom-left, end
bottom-right," which is wrong for `o, r, v, w, e`. The `letter-model` spec still describes Kalam font
extraction (rejected). No ligature modeling exists.

**Affected Areas**:
- `client/src/letters/svg/*.svg` — 25 new letter files to author (`a` exists).
- `client/src/letters/svg/README.md` — amend "end bottom-right" rule; add entry/exit anchor convention.
- `client/src/letters/svgLetter.ts` — end-corner diagnostic must become anchor-aware (Risk #1); consider
  anchor-based normalization (Risk #2).
- `openspec/specs/letter-model/spec.md` — revise "Path–Checkpoint Consistency" (Risk #5).
- `client/src/letters/types.ts` / `registry.ts` — optionally add `entry`/`exit` anchor fields to
  `LetterConfig`.

**Approaches**:
1. *(Recommended)* Author 26 hand-drawn single-stroke SVGs with universal `baseline-left` entry and
   per-letter exit anchors (baseline-right / top-right for o,r,v,w / mid-right for e); no OpenType;
   anchors stored as metadata for a future word-mode connector. Plus fix the README diagnostic.
2. Attempt to auto-generate from an OFL font via fontTools — REJECTED (user already rejected Kalam
   outlines as "letras horribles"; fonts give closed contours, not pen-trajectory ductus).
3. Add full `calt`/`liga` ligature glyph variants — NOT needed (one-letter tracer, no shaping engine).

**Recommendation**: Adopt Approach 1. OpenType is unnecessary; the `curs` anchor concept is the only
transferable idea, modeled as plain per-letter entry/exit metadata. Revise the spec and the pipeline
diagnostic alongside authoring the letters.

**Risks**: (1) false end-corner warnings for o/r/v/w/e; (2) bbox-fit misalignment of out-of-zone exit
strokes; (3) dropped group transforms; (4) multi-stroke-letter handling decision; (5) outdated Kalam
spec requirement; (6) t/f zone assumption. None are blocking for authoring the 26 letters, but #1, #4,
#5 must be resolved in the proposal/design phases.

**Ready for Proposal**: Yes — with three decisions for the orchestrator to surface to the user:
(a) handle dots/crosses on i/j/t/f (omit vs separate pass); (b) confirm `t` stays x-height / `f`
ascender; (c) confirm scope = lowercase only (uppercase/digits deferred).

---

## Sources

- Wikipedia, "Cursive" — https://en.wikipedia.org/wiki/Cursive (continuous vs basic cursive; o/r/v/w top
  exit; italic cursive drops g/j/q/y joins)
- Wikipedia, "Ligature (writing)" — https://en.wikipedia.org/wiki/Ligature_(writing)
- Microsoft, "OpenType registered features a–e" — `calt` (o.alt2 before ascenders), `curs` (entry/exit
  anchors), `clig` — https://learn.microsoft.com/en-us/typography/opentype/spec/features_ae
- Wikipedia, "Zaner-Bloser Method" / "D'Nealian" — teaching scripts & letter groups
- wikiHow, "Write in Cursive" — https://www.wikihow.com/Write-in-Cursive (per-letter stroke steps;
  uppercase letters not joined to each other)
- fontTools (MIT) — https://github.com/fonttools/fonttools (extract glyph contours / `curs` anchors)
- Graves, "Generating Sequences With Recurrent Neural Networks", arXiv:1308.0850 —
  https://arxiv.org/abs/1308.0850 (pen-trajectory / pen-up stroke model)
- IAM On-Line Handwriting Database — http://www.fki.inf.unibe.ch/databases/iam-on-line-handwriting-database
- Google Fonts (OFL) references: Learning Curve, Dancing Script, Great Vibes, Allura, Kalam, Caveat —
  https://fonts.google.com
- Local: `client/src/letters/svg/README.md`, `svgLetter.ts`, `types.ts`, `registry.ts`,
  `openspec/specs/letter-model/spec.md`, existing `svg/a.svg`
