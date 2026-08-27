/** App shell. Trace canvas (U5); guided/free modes (U6) and the progress screen (U7) mount here later. */
import TraceCanvas from './canvas/TraceCanvas'

export default function App() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
      <h1>cursiva</h1>
      <TraceCanvas />
    </main>
  )
}