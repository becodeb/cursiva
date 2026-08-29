// DESIGN-FIXED validation constants (trace-validation spec). Area-cloud scoring
// model: the ideal is the REAL glyph AREA (Kalam-derived point cloud, ~1756
// points for `a`), so the scoring target is the letter BODY, not a thin
// centerline. Tolerances are widened because the glyph strokes are ~36px thick;
// a trace anywhere inside the body scores near-perfect, and only a clear miss is
// penalized. This is deliberately child-friendly (design-vs-spec tuning).
export const K = 64 // resample cardinality (exactly K equidistant arc points)
export const TolPen = 16 // fine-pointer (mouse/pen) avg-distance tolerance, virtual px
export const TolTouch = 26 // touch tolerance: child-friendly wider margin (natural finger deviation passes)
export const Approval = 70 // minimum score to approve (together with order + continuity)
// Dead zone: a trace point within AREA_GRACE px of the letter area scores as a
// perfect hit (absorbs rasterization/sampling noise and tiny wobble; the glyph
// strokes are ~36px thick so 3px is invisible to a child).
export const AREA_GRACE = 3