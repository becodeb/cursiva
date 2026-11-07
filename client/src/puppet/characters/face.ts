// Mouth and brow shared by every face, so a mood reads the same on all of them.
import { fmt, smoothClosed, type Vec } from '../geometry'
import type { DynamicPath } from '../rig'

/** Smile can go negative, `open` grows the lower lip, and fear turns the whole
 *  mouth into a shaky line. Sampled edges instead of two curves, so one morphs
 *  into the other smoothly. */
export function mouthPath(cx: number, cy: number, w: number): DynamicPath {
  return (pose) => {
    const fear = pose.a.scare
    const width = w * (1 + fear * 0.2)
    const open = pose.open * (1 - fear)
    const steps = 8
    const top: Vec[] = []
    const low: Vec[] = []
    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      const arc = 4 * u * (1 - u) * 0.5
      const shake = fear * Math.sin(u * 12.57 + pose.t * 16) * w * 0.26 * Math.sin(u * Math.PI)
      const y = cy + pose.smile * (1 - fear) * w * 0.55 * arc + shake
      const x = cx - width + 2 * width * u
      top.push([x, y])
      low.push([x, y + open * w * 1.15 * arc])
    }
    return smoothClosed([...top, ...low.slice(1, -1).reverse()])
  }
}

/** (x1, y1) is the outer end, (x2, y2) the inner one, which only ever rises: an
 *  inward-sloping brow reads as anger. The arch relaxes to a straight line with
 *  fear; same commands, so it morphs. */
export function browPath(x1: number, y1: number, x2: number, y2: number): DynamicPath {
  return (pose) => {
    const dy = pose.brow * 11
    const lift = pose.a.scare * 10
    const ay = y1 + dy - lift
    const by = y2 - dy - lift
    const midY = (ay + by) / 2 - 9 * (1 - pose.a.scare)
    return `M${fmt(x1)} ${fmt(ay)}Q${fmt((x1 + x2) / 2)} ${fmt(midY)} ${fmt(x2)} ${fmt(by)}`
  }
}
