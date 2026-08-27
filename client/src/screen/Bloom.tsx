// Family bloom (main-screen "Family Bloom", T6.2): a dormant bud that flowers
// when EVERY `ola` family letter reaches stored progress 100 — state derives
// from stored progress on load (bloom survives reload) and re-derives on
// change. The bloomed flower replays its petals on click (interactive, spec).
import { useState } from 'react'
import { motion } from 'framer-motion'

/** Petal angles around the flower center, degrees. */
const PETALS = [0, 60, 120, 180, 240, 300]

export interface BloomProps {
  /** Derived: every family letter at stored progress 100. */
  bloomed: boolean
  /** Family label for the status copy. */
  family?: string
}

export default function Bloom({ bloomed, family = 'ola' }: BloomProps) {
  const [replay, setReplay] = useState(0)
  if (!bloomed) {
    return (
      <p role="status" style={{ textAlign: 'center', color: '#64748b', margin: '4px 0 0', fontSize: 15 }}>
        Familia {family}: completá todas las letras para verla florecer
      </p>
    )
  }
  return (
    <motion.button
      type="button"
      key={replay} // remount restarts the petal stagger (interactive replay)
      onClick={() => setReplay((n) => n + 1)}
      aria-label={`Familia ${family} completa — tocar para volver a florecer`}
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 140, damping: 12 }}
      style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'block', margin: '6px auto 0', padding: 8 }}
    >
      <svg width={100} height={100} viewBox="-60 -60 120 120" role="img" aria-label={`Flor de la familia ${family}`}>
        {PETALS.map((deg, i) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <motion.ellipse
              cy={-30}
              rx={21}
              ry={38}
              fill="#fbbf24"
              stroke="#d97706"
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.35, ease: 'easeOut' }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          </g>
        ))}
        <motion.circle
          r={13}
          fill="#b45309"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 + PETALS.length * 0.08 }}
        />
      </svg>
      <span style={{ display: 'block', color: '#b45309', fontWeight: 700 }}>¡La familia {family} floreció!</span>
    </motion.button>
  )
}