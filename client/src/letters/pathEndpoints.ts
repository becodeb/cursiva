/**
 * Segment endpoints of an SVG path: the M start point plus each cubic
 * segment's third control point. Used by letter seed tests to assert that
 * `pathDefinition.d` visits its checkpoints in ascending order.
 */
export function pathEndpoints(d: string): Array<[number, number]> {
  const tokens = d.trim().split(/[\s,]+/)
  const endpoints: Array<[number, number]> = []
  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]
    if (token === 'M') {
      endpoints.push([Number(tokens[i + 1]), Number(tokens[i + 2])])
      i += 3
    } else if (token === 'C') {
      i += 1
      for (let pair = 0; pair < 3; pair += 1) {
        const x = Number(tokens[i])
        const y = Number(tokens[i + 1])
        if (pair === 2) endpoints.push([x, y])
        i += 2
      }
    } else {
      throw new Error(`Unexpected path token: ${token}`)
    }
  }
  return endpoints
}