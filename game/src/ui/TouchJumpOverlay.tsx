import { useCallback, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { gameStateAtom } from '../store/atoms/gameAtoms'
import { requestJump } from '../actions/playerActions'
import { nextMask, prevMask } from '../masksys/maskActions'

const MIDDLE_ZONE_RATIO = 0.4 // Middle 40% of screen width triggers jump
const SWIPE_THRESHOLD = 50 // Minimum pixels for a swipe

export function TouchJumpOverlay() {
  const gameState = useAtomValue(gameStateAtom)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Only handle if this overlay is the direct target (not bubbled from children)
    if (e.target !== e.currentTarget) return

    const touch = e.touches[0]
    if (!touch) return

    touchStartRef.current = { x: touch.clientX, y: touch.clientY }

    // Only handle jump when playing
    if (gameState !== 'playing') return

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

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return
    if (e.target !== e.currentTarget) return

    const touch = e.changedTouches[0]
    if (!touch) return

    const dx = touch.clientX - touchStartRef.current.x

    // Detect horizontal swipe for mask switching
    if (dx > SWIPE_THRESHOLD) {
      prevMask() // Swipe right = previous mask
    } else if (dx < -SWIPE_THRESHOLD) {
      nextMask() // Swipe left = next mask
    }

    touchStartRef.current = null
  }, [])

  return (
    <div
      className="touch-jump-overlay"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'absolute',
        inset: 0,
        touchAction: 'none',
      }}
    />
  )
}
