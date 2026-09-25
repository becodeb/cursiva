// Speech-bubble "pop-in" (prewriting-stage-completion T8 item 2): a quick
// scale+opacity flourish with a slight overshoot, replayed every time the
// SPOKEN TEXT changes — shared by the three narrative stage screens
// (PrologueOpening, AdventureIntro, AdventureClosing) and the zoo map's own
// Pulpito bubble (ZooMap), the same "one CSS block, no drift" reasoning
// RescueCelebration.tsx gives for its own shared rule.
//
// Applied to an INNER element, never to a box that already carries its own
// positional `transform` (`.cv-*-bubble`'s own `translateX(-50%)` centring
// in PrologueOpening/AdventureIntro/AdventureClosing): animating `transform`
// REPLACES the whole property rather than composing with it — the exact
// defect class ZooMap.tsx's own spotlight-badge comment documents
// ("a CSS transform on the SAME element replaces that attribute outright").
// `.cv-zoo-bubble-dismiss` carries no transform of its own (its mirror/flip
// rules target the nested `<img>` instead), so ZooMap applies this class
// directly to it; the three stage screens instead wrap their bubble's own
// two children (the shape `<img>` and the `CaptionedArt`) in one extra
// `.cv-bubble-pop` span, so the outer bubble's own centring is never
// touched.
//
// Keyed by the caller on the current line (React `key`, not part of this
// CSS) so a text change forces a fresh mount and therefore replays the
// animation — see each caller's own comment for why that key is chosen to
// stay STABLE across an in-place update that must not double-speak
// (`useNarration`'s own "speaks again when `line` changes" contract).
//
// NOTE: no backticks anywhere in this block — it is spliced into another
// template literal, and one backtick inside a comment would end that string
// early (the exact reason every other CSS-in-JS block in this repo gives).
export const BUBBLE_POP_CSS = `
.cv-bubble-pop { display: block; animation: cv-bubble-pop-in 200ms ease-out both; transform-origin: 50% 50%; }
@keyframes cv-bubble-pop-in {
  0% { opacity: 0; transform: scale(0.7); }
  65% { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) { .cv-bubble-pop { animation: none; } }
`
