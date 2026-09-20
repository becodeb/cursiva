import { createRoot } from 'react-dom/client'
import TraceCanvas from '../canvas/TraceCanvas'
import type { InkRenderPolicy } from '../canvas/ink'

const params = new URLSearchParams(window.location.search)
const policy = (params.get('policy') ?? 'settled') as InkRenderPolicy

createRoot(document.getElementById('root')!).render(
  <div style={{ width: 640, height: 384 }}>
    <TraceCanvas inkPolicy={policy} />
  </div>,
)
