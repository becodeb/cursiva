// [T51] The window's own size, kept current across resizes and rotations.
// `undefined` under `renderToString` (no `window`), so a stage screen falls
// back to its plain square frame there (`pulpitoStance.ts`'s
// `stageBubbleFrame`) and every SSR assertion keeps its old numbers.
import { useEffect, useState } from 'react'

export interface ViewportSize {
  readonly width: number
  readonly height: number
}

function readViewport(): ViewportSize | undefined {
  if (typeof window === 'undefined') return undefined
  return { width: window.innerWidth, height: window.innerHeight }
}

export function useViewportSize(): ViewportSize | undefined {
  const [viewport, setViewport] = useState<ViewportSize | undefined>(readViewport)
  useEffect(() => {
    const onResize = (): void => setViewport(readViewport())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return viewport
}
