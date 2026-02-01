import { gameStore } from '../store'
import { gameStateAtom, scoreAtom } from '../store/atoms/gameAtoms'
import { maskStateAtom } from '../store/atoms/maskAtoms'
import { resetPlayer } from './playerActions'
import { setCameraDistance, setCameraViewAngle } from './cameraActions'
import { maskRegistry } from '../masksys/masks'
import type { GameState } from '../types/game'

/**
 * Camera config for "playing" mode
 */
const PLAYING_CAMERA = {
  viewAngle: 70,
  distance: 10,
}

export function setGameState(state: GameState): void {
  gameStore.set(gameStateAtom, state)
}

export function startGame(): void {
  resetPlayer()
  gameStore.set(scoreAtom, 0)
  gameStore.set(gameStateAtom, 'playing')

  // Animate camera to gameplay view
  setCameraViewAngle(PLAYING_CAMERA.viewAngle)
  setCameraDistance(PLAYING_CAMERA.distance)
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
  const currentMask = gameStore.get(maskStateAtom)
  const config = maskRegistry[currentMask]
  if (config.cameraDistance !== undefined) {
    setCameraDistance(config.cameraDistance)
  }
  if (config.cameraViewAngle !== undefined) {
    setCameraViewAngle(config.cameraViewAngle)
  }
}
