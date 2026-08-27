/**
 * App shell for the cursiva MVP.
 * The trace canvas lands in unit 5; guided/free modes (U6) and the
 * progress screen (U7) mount here in later work units (see README.md).
 */
import TraceCanvas from './canvas/TraceCanvas'

export default function App() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
      <h1>cursiva</h1>
      <TraceCanvas />
    </main>
  )
}