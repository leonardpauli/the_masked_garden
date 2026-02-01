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
  noMaskCallbacks,
  springMaskCallbacks,
  autumnMaskCallbacks,
  stormMaskCallbacks,
  finalMaskCallbacks,
  allMaskCallbacks
} from './maskCallbacks'

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
