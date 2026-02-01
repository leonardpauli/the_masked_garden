import { useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { gameStateAtom } from '../store/atoms/gameAtoms'
import { requestJump } from '../actions/playerActions'

const MIDDLE_ZONE_RATIO = 0.4 // Middle 40% of screen width triggers jump

export function TouchJumpOverlay() {
  const gameState = useAtomValue(gameStateAtom)

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Only handle when playing
    if (gameState !== 'playing') return

    // Only handle if this overlay is the direct target (not bubbled from children)
    if (e.target !== e.currentTarget) return

    const touch = e.touches[0]
    if (!touch) return

    const screenWidth = window.innerWidth
    const touchX = touch.clientX

    // Calculate middle zone boundaries
    const middleStart = screenWidth * (0.5 - MIDDLE_ZONE_RATIO / 2)
    const middleEnd = screenWidth * (0.5 + MIDDLE_ZONE_RATIO / 2)

    // If touch is in middle zone, trigger jump
    if (touchX >= middleStart && touchX <= middleEnd) {
      e.preventDefault()
      requestJump()
    }
  }, [gameState])

  return (
    <div
      className="touch-jump-overlay"
      onTouchStart={handleTouchStart}
      style={{
        position: 'absolute',
        inset: 0,
        touchAction: 'none',
      }}
    />
  )
}
