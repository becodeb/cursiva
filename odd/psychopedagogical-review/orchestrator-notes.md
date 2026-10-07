# Orchestrator notes on the R1 captures

What the orchestrator saw by looking at the captures itself (contact sheets in
`capturas/2026-10-07-revision/_sheets/`, git-ignored). These are observations for R3 to verify and weigh,
not conclusions. Paths are relative to `capturas/2026-10-07-revision/`.

## Coverage limits of R1 (state them in the doc)

- `night-rastro`: only before/demo captured; the torch + footprint mechanic had no sampleable route.
- `hedgehog*`, `bee*`, `snake*`: completion seeded with the project's own `?debug=` seeds, not played.
  Note: earlier tasks (T30, T39) did drive hedgehog with real Playwright drags, so this is a harness limit, not a game fact.
- 18 of 39 guided paths never reached approval under the generic drag (moving hazards, scrolling camera,
  narrowing corridor). Do not report them as "impossible for a child" without other evidence.
- The author's checklist artifact could not be read from this session.

## Observations worth weighing

1. **Pattern progression matches cursive precursors.** Arcades (`05-duck-trail1`, an "m"), waves
   (`06/07-duck-trail5/2`, dolphins), garlands (`37-f2-guirnalda`, `38-f2-agua2`, "u/w"), zigzags (sheep, llama),
   low loops (`51-monkey1`, "e"), tall loops (`53-monkey-lianas`, "l"), ovals (`47-50-turtle*`, "o" with a top
   join in turtle3/4). Everything runs left→right and starts low on the left, like a cursive entry stroke.
   The question is whether this order is deliberate and visible to the adult, and whether the loop/oval
   direction is consistent (turtles look counter-clockwise from the top; check `f2-buceo`'s hanging loops).
2. **Night levels open on a black screen** (`21-night2`, `22-night3`, `24-night4` before frames); only night1
   shows a demo hand. What graphomotor skill does a torch sweep train? It is exploration/scanning, not a
   stroke with start, direction and stop.
3. **Reveal/cleaning levels (glass, sand, leaves, path) are free scrubbing** (`01-04-*-d-imperfect`): any
   rubbing clears them. Fine as warm-up/motor freedom, but no direction or stop is practised. Tile counts
   vary 60 vs 135 between equivalent levels (R1 finding 10).
4. **The `f3-*` letter levels are a different game:** white page, written instruction ("Hacé el rulo alto de
   la ele, de una sola vez."), text buttons "Borrar / Ver de nuevo / Siguiente", numeric scores
   ("Precisión 52 · Sentido ✓ · Fluidez 85"), no octopus, no story (`56-59-f3-*-a-before`). A child of 6
   cannot read any of it. They are reachable only by dev deep link (R1 finding 5).
5. **A scribble on `f3-*` still earns two stars and "Sentido ✓"** (`56-59-f3-*-1024x768-d-imperfect.png`): a
   pile of zigzags over the guide got ★ Sentido and ★ Fluidez 78–85. Check how direction and fluency are
   scored before building the letter stage on it.
6. **Text the child cannot read carries meaning** in several places: deduction bubbles in very small type
   (`39-44-deduccion-*`), reveal hints ("Seguí limpiando el vidrio."), the f3 instructions. Check that every
   one is also spoken.
7. **Visual defects:** the prologue's "Volver al mapa" pill is clipped to "r al mapa" by its icon
   (`01-03-prologue-*-1024x768`); `21-intro-turtles` bubble wraps badly ("seguimos?" alone under the icon);
   `45-dolphin4-768x1024` progress pill has ~16 squares and is clipped at both edges; dolphin3/4 corridors run
   off the right edge (scrolling camera) and the HUD squares count grows a lot (12–16) — a long, uniform drill.
8. **Repetition:** dolphin1→4 and llama/sheep 1→4 repeat the same pattern with more periods. Variation is in
   frequency only; is the 4th repetition still worth it, and does it fit a 15–30 min session?
9. **Feedback on errors:** wall contact resets the run silently (`12-sheep-hill1-d-imperfect` shows an empty
   corridor). Check what the child hears and sees, and whether it is clear why it restarted.
10. **Portrait 768×1024** is playable, but the lower ~40% of the screen is empty art on most path levels
    (`_sheets/portrait-*.png`).
11. **First screen:** with no progress the game opens on the prologue, not on the map (R1 finding 1) — check it is intended (docs/16).
12. **Positive:** reward is mostly intrinsic and in-story (the animal returns, notebook entry, colour comes
    back to the snakes, turtles peek out); stars are hidden in the HUD (T23); no red, no failure sound.
