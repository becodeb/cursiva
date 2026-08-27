/** App shell. U7 replaces the U6 mode-loop wiring with the book-style home screen (T6.2): picker + live per-letter progress + family bloom. */
import { useState } from 'react'
import MainScreen from './screen/MainScreen'
import { LocalProgressStore } from './progress/LocalProgressStore'

export default function App() {
  // One store per app: reads localStorage once, monotonic best-of on writes.
  const [store] = useState(() => new LocalProgressStore())
  return <MainScreen store={store} />
}