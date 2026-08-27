// DESIGN-FIXED validation constants (design.md "Resolved DESIGN-FIXED Values").
// Arithmetic authority: trace-validation spec — the docs/02 formula WITH the
// mandatory ×100 factor (score on the 0–100 scale; design-vs-spec flag 5).
export const K = 64 // resample cardinality (exactly K equidistant arc points)
export const TolPen = 12 // fine-pointer (mouse/pen) avg-distance tolerance, virtual px
export const TolTouch = 18 // touch tolerance: TolPen × 1.5 (natural finger deviation passes)
export const Approval = 70 // minimum score to approve (together with order + continuity)