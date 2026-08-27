/**
 * Segment endpoints of an SVG path: the M start point plus each cubic (`C`),
 * quadratic (`Q`), and line (`L`) segment's end point, and the closure point
 * of a `Z`. Used by letter seed tests to assert that `pathDefinition.d` visits
 * its checkpoints (as on-curve points) — in particular that the real Kalam
 * glyph ductus (now authored with `Q`/`L`) passes through every checkpoint.
 */
export function pathEndpoints(d: string): Array<[number, number]> {
  const tokens = d
    .replace(/([MLQCZmlqcz])/g, ' $1 ')
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
  const endpoints: Array<[number, number]> = []
  let i = 0
  let current: [number, number] | null = null
  let subpathStart: [number, number] | null = null
  while (i < tokens.length) {
    const token = tokens[i]
    if (token === 'M') {
      current = [Number(tokens[i + 1]), Number(tokens[i + 2])]
      subpathStart = current
      endpoints.push(current)
      i += 3
    } else if (token === 'C') {
      if (current === null) throw new Error(`Path data must start with M: ${d}`)
      const x = Number(tokens[i + 5])
      const y = Number(tokens[i + 6])
      endpoints.push([x, y])
      current = [x, y]
      i += 7
    } else if (token === 'Q') {
      if (current === null) throw new Error(`Path data must start with M: ${d}`)
      const x = Number(tokens[i + 3])
      const y = Number(tokens[i + 4])
      endpoints.push([x, y])
      current = [x, y]
      i += 5
    } else if (token === 'L') {
      if (current === null) throw new Error(`Path data must start with M: ${d}`)
      current = [Number(tokens[i + 1]), Number(tokens[i + 2])]
      endpoints.push(current)
      i += 3
    } else if (token === 'Z') {
      if (current && subpathStart) {
        endpoints.push(subpathStart)
        current = subpathStart
      }
      i += 1
    } else {
      throw new Error(`Unexpected path token: ${token}`)
    }
  }
  return endpoints
}
