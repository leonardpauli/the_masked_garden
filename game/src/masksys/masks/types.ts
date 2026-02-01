/**
 * Mask configuration types and helpers
 */

import type { MaskState } from '../types'
import type { VisualStyle } from '../../types/visualStyles'

export interface MaskConfig {
  name: MaskState

  // Visual
  visualStyle?: VisualStyle
  effectParams?: Record<string, number>

  // Camera (target values, will animate via existing smoothing)
  cameraDistance?: number
  cameraViewAngle?: number

  // Physics
  gravity?: number
  playerSpeed?: number
  cubePushStrength?: number // How hard player pushes cubes (default: 8)

  // Callbacks for custom behavior
  onEnter?: (from: MaskState) => void
  onExit?: (to: MaskState) => void
  onUpdate?: (deltaTime: number) => void
}

/**
 * Helper to define a mask config with type safety
 */
export function defineMask(config: MaskConfig): MaskConfig {
  return config
}
