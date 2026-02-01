/**
 * MaskState callback implementations using registry pattern
 *
 * Reads mask configurations from the registry and applies them on state transitions.
 * Handles both mask-specific configs and game state (menu vs playing) camera modes.
 */

import type { MaskState, MaskStateCallbacks } from './types'
import { maskRegistry, type MaskConfig } from './masks'
import {
  visualStyleAtom,
  effectParamsAtom,
  cameraDistanceAtom,
  cameraViewAngleAtom,
  gravityAtom,
  playerSpeedAtom,
} from '../store/atoms/configAtoms'
import { gameStateAtom } from '../store/atoms/gameAtoms'
import { maskStateAtom } from '../store/atoms/maskAtoms'
import { gameStore } from '../store'

/**
 * Camera config for "playing" mode (overrides mask camera when game is active)
 */
const PLAYING_CAMERA = {
  viewAngle: 70,
  distance: 10,
}

/**
 * Apply a mask configuration to the game state
 * @param config The mask config to apply
 * @param applyCamera Whether to apply camera values (false when game is playing)
 */
function applyMaskConfig(config: MaskConfig, applyCamera: boolean): void {
  // Visual style
  if (config.visualStyle !== undefined) {
    gameStore.set(visualStyleAtom, config.visualStyle)
  }

  // Effect parameters
  if (config.effectParams !== undefined) {
    gameStore.set(effectParamsAtom, config.effectParams)
  }

  // Camera (only apply if not in playing state, or if explicitly requested)
  if (applyCamera) {
    if (config.cameraDistance !== undefined) {
      gameStore.set(cameraDistanceAtom, config.cameraDistance)
    }
    if (config.cameraViewAngle !== undefined) {
      gameStore.set(cameraViewAngleAtom, config.cameraViewAngle)
    }
  }

  // Physics (always apply)
  if (config.gravity !== undefined) {
    gameStore.set(gravityAtom, config.gravity)
  }
  if (config.playerSpeed !== undefined) {
    gameStore.set(playerSpeedAtom, config.playerSpeed)
  }
}

/**
 * Apply the initial mask config (called on init, since onEnter doesn't fire)
 */
export function applyInitialMaskConfig(maskState: MaskState): void {
  const config = maskRegistry[maskState]
  console.log(`[${maskState}] Applying initial config`)
  applyMaskConfig(config, true)
  config.onEnter?.(maskState) // from=self on init
}

/**
 * Apply "playing" camera mode
 */
export function applyPlayingCamera(): void {
  gameStore.set(cameraViewAngleAtom, PLAYING_CAMERA.viewAngle)
  gameStore.set(cameraDistanceAtom, PLAYING_CAMERA.distance)
}

/**
 * Restore current mask's camera settings (for returning to menu)
 */
export function restoreCurrentMaskCamera(): void {
  const currentMask = gameStore.get(maskStateAtom)
  const config = maskRegistry[currentMask]
  if (config.cameraDistance !== undefined) {
    gameStore.set(cameraDistanceAtom, config.cameraDistance)
  }
  if (config.cameraViewAngle !== undefined) {
    gameStore.set(cameraViewAngleAtom, config.cameraViewAngle)
  }
}

/**
 * Create callbacks for a mask state from its config
 */
function createCallbacks(maskState: MaskState): MaskStateCallbacks {
  return {
    onEnter: (from: MaskState) => {
      const config = maskRegistry[maskState]

      // Check if game is playing - if so, don't override camera
      const gameState = gameStore.get(gameStateAtom)
      const applyCamera = gameState !== 'playing'

      console.log(`[${maskState}] Entering, from: ${from}, gameState: ${gameState}, applyCamera: ${applyCamera}`)
      console.log(`[${maskState}] Config:`, config)

      applyMaskConfig(config, applyCamera)
      config.onEnter?.(from)
    },
    onExit: (to: MaskState) => {
      const config = maskRegistry[maskState]
      console.log(`[${maskState}] Leaving, to: ${to}`)
      config.onExit?.(to)
    },
    onUpdate: (deltaTime: number) => {
      const config = maskRegistry[maskState]
      config.onUpdate?.(deltaTime)
    },
  }
}

// ============== All Callbacks Collection ==============
export const allMaskCallbacks: Record<MaskState, MaskStateCallbacks> = {
  NoMask: createCallbacks('NoMask'),
  SpringMask: createCallbacks('SpringMask'),
  AutumnMask: createCallbacks('AutumnMask'),
  StormMask: createCallbacks('StormMask'),
  FinalMask: createCallbacks('FinalMask'),
}
