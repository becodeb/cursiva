// Speech-bubble "pop-in" (prewriting-stage-completion T8 item 2, made more
// noticeable by T16 after a tablet play-test found the original 200ms/0.7-
// 1.08 version too subtle): a scale+opacity flourish with a real overshoot
// and a quick fade-in, replayed every time the SPOKEN TEXT changes — shared
// by the three narrative stage screens (PrologueOpening, AdventureIntro,
// AdventureClosing) and the zoo map's own Pulpito bubble (ZooMap), the same
// "one CSS block, no drift" reasoning RescueCelebration.tsx gives for its
// own shared rule.
//
// Applied to an INNER element, never to a box that already carries its own
// positional `transform`: animating `transform` REPLACES the whole property
// rather than composing with it — the exact defect class ZooMap.tsx's own
// spotlight-badge comment documents ("a CSS transform on the SAME element
// replaces that attribute outright"). `.cv-zoo-bubble-dismiss` carries no
// transform of its own (its mirror/flip rules target the nested `<img>`
// instead), so ZooMap applies this class directly to it; the three stage
// screens instead wrap their bubble's own two children (the shape `<img>`
// and the `CaptionedArt`) in one extra `.cv-bubble-pop` span — T16 moved
// their OUTER `.cv-*-bubble` box off a static `translateX(-50%)` centring
// rule onto an inline-styled `left`/`top`/`width` (`bubblePlacement.ts`'s
// own `placeSpeechBubble`), so that composition concern no longer applies
// to them either, but the nesting stays: the outer box owns POSITION, this
// inner span owns the pop.
//
// `transform-origin` is left at the class's own generic 50%/50% default;
// every real caller overrides it inline to the tail tip's own position
// within the box (`placeSpeechBubble`'s `tailOriginX`/`tailOriginY` for the
// three stage screens, `ZooMap.tsx`'s own `tailOriginFor` for the map
// bubble) so the pop grows OUT of the tail — out of the octopus — rather
// than out of the bubble's own geometric centre, per this task's own brief.
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
.cv-bubble-pop { display: block; animation: cv-bubble-pop-in 350ms ease-out both; transform-origin: 50% 50%; }
@keyframes cv-bubble-pop-in {
  0% { opacity: 0; transform: scale(0.4); }
  20% { opacity: 1; }
  70% { transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) { .cv-bubble-pop { animation: none; } }
`
