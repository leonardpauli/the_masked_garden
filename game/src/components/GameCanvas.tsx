import { useEffect, useRef } from 'react'
import { ThreeEngine } from '../engine/ThreeEngine'

/**
 * Thin React wrapper that just provides a container for pure Three.js
 * No react-three-fiber - just a div that Three.js renders into
 */
export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<ThreeEngine | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create and start the Three.js engine
    const engine = new ThreeEngine(containerRef.current)
    engineRef.current = engine
    engine.start()

    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0
      }} 
    />
  )
}
