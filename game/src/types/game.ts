import type { Vector3Tuple } from 'three'

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover'

export interface InputDirection {
  x: number  // Left/Right (-1 to 1)
  z: number  // Forward/Back (-1 to 1)
}

export type InputSource = 'keyboard' | 'gyro' | 'touch'

export interface PlayerState {
  position: Vector3Tuple
  health: number
}

export interface ObstacleData {
  id: string
  position: Vector3Tuple
  scale: number
}
