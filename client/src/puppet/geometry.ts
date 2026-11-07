// Pure path geometry for the paper puppets. No DOM here: `getPointAtLength` is
// replaced by walking M/L/C/Q segments, so every authored anchor survives (cut
// tips stay sharp) and the whole module runs in node. Randomness is seeded.

export type Vec = readonly [number, number]

export const fmt = (n: number): string => n.toFixed(1)
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
export const rad = (deg: number): number => (deg * Math.PI) / 180

/** A seeded generator in [0, 1). The same seed always draws the same paper. */
export function seeded(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Handle length that makes a cubic follow a quarter circle. */
const KAPPA = 0.5522847498

/** An ellipse as four cubics, so `sampleAnchored` handles it like any shape. */
export function ell(cx: number, cy: number, rx: number, ry: number = rx): string {
  const kx = rx * KAPPA
  const ky = ry * KAPPA
  return (
    `M${cx - rx} ${cy}` +
    `C${cx - rx} ${cy - ky} ${cx - kx} ${cy - ry} ${cx} ${cy - ry}` +
    `C${cx + kx} ${cy - ry} ${cx + rx} ${cy - ky} ${cx + rx} ${cy}` +
    `C${cx + rx} ${cy + ky} ${cx + kx} ${cy + ry} ${cx} ${cy + ry}` +
    `C${cx - kx} ${cy + ry} ${cx - rx} ${cy + ky} ${cx - rx} ${cy}Z`
  )
}

/** Samples per curved segment, at least: a short curve must not become a chord. */
const MIN_CURVE_SAMPLES = 3

/**
 * Walks an M/L/C/Q/Z path into points about `step` apart. Every authored anchor
 * is kept, so a corner in the drawing is a corner in the cut. A closed path does
 * not repeat its first point; an open path ends on its last anchor.
 */
export function sampleAnchored(d: string, step: number): Vec[] {
  const tokens = d.match(/[MLCQZ]|-?[\d.]+/g) ?? []
  const pts: Vec[] = []
  let i = 0
  let cur: Vec = [0, 0]
  let start: Vec = [0, 0]
  let cmd = ''
  const num = (): number => parseFloat(tokens[i++])
  const point = (): Vec => {
    const x = num()
    return [x, num()]
  }
  const walk = (at: (t: number) => Vec, min: number): void => {
    let length = 0
    let prev = at(0)
    for (let k = 1; k <= 12; k++) {
      const q = at(k / 12)
      length += Math.hypot(q[0] - prev[0], q[1] - prev[1])
      prev = q
    }
    const n = Math.max(min, Math.round(length / step))
    for (let k = 0; k < n; k++) pts.push(at(k / n))
  }
  const straight = (a: Vec, b: Vec): void => walk((t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], 1)
  while (i < tokens.length) {
    if (/[MLCQZ]/.test(tokens[i])) cmd = tokens[i++]
    if (cmd === 'M') {
      cur = start = point()
      cmd = 'L'
    } else if (cmd === 'L') {
      const b = point()
      straight(cur, b)
      cur = b
    } else if (cmd === 'C') {
      const a = cur
      const c1 = point()
      const c2 = point()
      const b = point()
      walk((t) => {
        const u = 1 - t
        const at = (k: 0 | 1): number =>
          u * u * u * a[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * b[k]
        return [at(0), at(1)]
      }, MIN_CURVE_SAMPLES)
      cur = b
    } else if (cmd === 'Q') {
      const a = cur
      const c = point()
      const b = point()
      walk((t) => {
        const u = 1 - t
        const at = (k: 0 | 1): number => u * u * a[k] + 2 * u * t * c[k] + t * t * b[k]
        return [at(0), at(1)]
      }, MIN_CURVE_SAMPLES)
      cur = b
    } else if (cmd === 'Z') {
      if (Math.hypot(cur[0] - start[0], cur[1] - start[1]) > 0.5) straight(cur, start)
      cur = start
    }
  }
  if (!/Z\s*$/.test(d)) pts.push(cur)
  return pts
}

/** A Catmull-Rom loop through `p`, as cubics. */
export function smoothClosed(p: readonly Vec[]): string {
  const n = p.length
  let d = `M${fmt(p[0][0])} ${fmt(p[0][1])}`
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n]
    const b = p[i]
    const c = p[(i + 1) % n]
    const e = p[(i + 2) % n]
    d += `C${fmt(b[0] + (c[0] - a[0]) / 6)} ${fmt(b[1] + (c[1] - a[1]) / 6)} ${fmt(c[0] - (e[0] - b[0]) / 6)} ${fmt(c[1] - (e[1] - b[1]) / 6)} ${fmt(c[0])} ${fmt(c[1])}`
  }
  return `${d}Z`
}

export function polyline(p: readonly Vec[], closed: boolean): string {
  return `M${p.map((q) => `${fmt(q[0])} ${fmt(q[1])}`).join('L')}${closed ? 'Z' : ''}`
}

/** Periodic low-frequency noise: a closed outline stays closed without a seam. */
export function wobble(pts: readonly Vec[], amp: number, seed: number, closed: boolean): Vec[] {
  const rand = seeded(seed)
  const n = pts.length
  const waves = [2, 3, 5].map((h) => [h, rand() * 6.28, (rand() - 0.5) * 2, (rand() - 0.5) * 2])
  return pts.map((p, i) => {
    let dx = 0
    let dy = 0
    const u = closed ? i / n : i / Math.max(1, n - 1)
    for (const [h, ph, wx, wy] of waves) {
      const s = Math.sin(6.283 * h * u + ph) / (h * 0.55)
      dx += s * wx
      dy += s * wy
    }
    return [p[0] + dx * amp, p[1] + dy * amp]
  })
}

export interface SpineOptions {
  x: number
  y: number
  /** Heading at the base, radians. */
  a: number
  L: number
  n?: number
  bend?: number
  curl?: number
  tipCurl?: number
  sway?: number
  t?: number
  ph?: number
}

/** The centre line of a tapered tube: tentacles, and later necks and dolphins. */
export function spine({ x, y, a, L, n = 18, bend = 0, curl = 0, tipCurl = 0, sway = 0, t = 0, ph = 0 }: SpineOptions): Vec[] {
  const pts: Vec[] = [[x, y]]
  let px = x
  let py = y
  for (let i = 1; i <= n; i++) {
    const s = i / n
    const tip = Math.max(0, (s - 0.3) / 0.7)
    const th = a + bend * s + curl * s * s * s + tipCurl * Math.pow(tip, 1.35) + sway * Math.sin(t + ph + s * 3.2) * s
    px += (Math.cos(th) * L) / n
    py += (Math.sin(th) * L) / n
    pts.push([px, py])
  }
  return pts
}

export function tangentAt(pts: readonly Vec[], i: number): number {
  const a = pts[Math.max(0, i - 1)]
  const b = pts[Math.min(pts.length - 1, i + 1)]
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

/** A closed cut-paper outline around `pts`, with a rounded tip. */
export function tubePath(pts: readonly Vec[], widthAt: (s: number) => number): string {
  const left: Vec[] = []
  const right: Vec[] = []
  pts.forEach((p, i) => {
    const th = tangentAt(pts, i)
    const w = widthAt(i / (pts.length - 1))
    const nx = Math.sin(th)
    const ny = -Math.cos(th)
    left.push([p[0] + nx * w, p[1] + ny * w])
    right.push([p[0] - nx * w, p[1] - ny * w])
  })
  const last = pts[pts.length - 1]
  const th = tangentAt(pts, pts.length - 1)
  const tipW = widthAt(1)
  const cap = [-1.1, -0.55, 0, 0.55, 1.1].map((da): Vec => [last[0] + Math.cos(th + da) * tipW, last[1] + Math.sin(th + da) * tipW])
  return polyline([...left, ...cap, ...right.reverse()], true)
}
