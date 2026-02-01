/**
 * MaskState system module exports
 */

// Type exports
export type {
  MaskState,
  MaskTransition,
  MaskStateCallbacks,
  TransitionListener,
  MaskStateConfig
} from './types'

export { MASK_STATES } from './types'

// State machine class
export { MaskStateMachine } from './MaskStateMachine'

// Callback functions
export {
  allMaskCallbacks,
  applyInitialMaskConfig,
  applyPlayingCamera,
  restoreCurrentMaskCamera,
} from './maskCallbacks'

// Mask registry
export { maskRegistry, defineMask } from './masks'
export type { MaskConfig } from './masks'

// Action functions
export {
  initMaskStateMachine,
  getMaskStateMachine,
  changeMaskState,
  getCurrentMaskState,
  updateMaskState,
  resetMaskState,
  destroyMaskStateMachine
} from './maskActions'
