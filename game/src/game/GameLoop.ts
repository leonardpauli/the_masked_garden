import { gameStore } from '../store'
import { gameStateAtom, scoreAtom } from '../store/atoms/gameAtoms'
import { playerPositionAtom } from '../store/atoms/playerAtoms'

class GameLoop {
  private unsubscribers: (() => void)[] = []
  private scoreInterval: number | null = null
  private lastZ = 0

  start(): void {
    // Subscribe to game state changes
    const unsubGameState = gameStore.sub(gameStateAtom, () => {
      const state = gameStore.get(gameStateAtom)
      if (state === 'playing') {
        this.onGameStart()
      } else {
        this.onGameStop()
      }
    })
    this.unsubscribers.push(unsubGameState)

    // Subscribe to player position for score
    const unsubPosition = gameStore.sub(playerPositionAtom, () => {
      const state = gameStore.get(gameStateAtom)
      if (state !== 'playing') return

      const pos = gameStore.get(playerPositionAtom)
      const z = pos.z

      // Award points for forward progress (negative Z)
      if (z < this.lastZ - 2) {
        const currentScore = gameStore.get(scoreAtom)
        gameStore.set(scoreAtom, currentScore + 10)
        this.lastZ = z
      }
    })
    this.unsubscribers.push(unsubPosition)
  }

  private onGameStart(): void {
    this.lastZ = 0

    // Award survival points every second
    this.scoreInterval = window.setInterval(() => {
      const state = gameStore.get(gameStateAtom)
      if (state === 'playing') {
        const currentScore = gameStore.get(scoreAtom)
        gameStore.set(scoreAtom, currentScore + 1)
      }
    }, 1000)
  }

  private onGameStop(): void {
    if (this.scoreInterval !== null) {
      clearInterval(this.scoreInterval)
      this.scoreInterval = null
    }
  }

  destroy(): void {
    this.onGameStop()
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
  }
}

export const gameLoop = new GameLoop()
