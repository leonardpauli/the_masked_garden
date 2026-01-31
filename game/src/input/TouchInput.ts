import { requestJump } from '../actions/playerActions'
import { gameStore } from '../store'
import { gameStateAtom } from '../store/atoms/gameAtoms'

class TouchInput {
  private initialized = false
  private middleZoneRatio = 0.4 // Middle 40% of screen width triggers jump

  initialize(): void {
    if (this.initialized) return
    this.initialized = true

    window.addEventListener('touchstart', this.handleTouchStart, { passive: false })
  }

  private handleTouchStart = (e: TouchEvent): void => {
    // Only handle touches when game is playing
    const gameState = gameStore.get(gameStateAtom)
    if (gameState !== 'playing') return

    // Don't intercept touches on UI elements
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, select, .ui-overlay, .dev-panel, .screen')) {
      return
    }

    const touch = e.touches[0]
    if (!touch) return

    const screenWidth = window.innerWidth
    const touchX = touch.clientX

    // Calculate middle zone boundaries
    const middleStart = screenWidth * (0.5 - this.middleZoneRatio / 2)
    const middleEnd = screenWidth * (0.5 + this.middleZoneRatio / 2)

    // If touch is in middle zone, trigger jump
    if (touchX >= middleStart && touchX <= middleEnd) {
      e.preventDefault()
      requestJump()
    }
  }

  destroy(): void {
    window.removeEventListener('touchstart', this.handleTouchStart)
    this.initialized = false
  }
}

export const touchInput = new TouchInput()
