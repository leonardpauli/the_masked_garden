import { gameStore } from '../store'
import { gameStateAtom, scoreAtom } from '../store/atoms/gameAtoms'
import { resetPlayer } from './playerActions'
import { applyPlayingCamera, restoreCurrentMaskCamera } from '../masksys/maskCallbacks'
import type { GameState } from '../types/game'

export function setGameState(state: GameState): void {
  gameStore.set(gameStateAtom, state)
}

export function startGame(): void {
  resetPlayer()
  gameStore.set(scoreAtom, 0)
  gameStore.set(gameStateAtom, 'playing')

  // Animate camera to gameplay view
  applyPlayingCamera()
}

export function pauseGame(): void {
  const currentState = gameStore.get(gameStateAtom)
  if (currentState === 'playing') {
    gameStore.set(gameStateAtom, 'paused')
  }
}

export function resumeGame(): void {
  const currentState = gameStore.get(gameStateAtom)
  if (currentState === 'paused') {
    gameStore.set(gameStateAtom, 'playing')
  }
}

export function endGame(): void {
  gameStore.set(gameStateAtom, 'gameover')
}

export function addScore(points: number): void {
  const currentScore = gameStore.get(scoreAtom)
  gameStore.set(scoreAtom, currentScore + points)
}

export function resetGame(): void {
  resetPlayer()
  gameStore.set(scoreAtom, 0)
  gameStore.set(gameStateAtom, 'menu')

  // Restore current mask's camera settings
  restoreCurrentMaskCamera()
}
