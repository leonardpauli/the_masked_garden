/**
 * MaskState type definitions
 */

// Five mask states
export type MaskState = 'NoMask' | 'SpringMask' | 'AutumnMask' | 'StormMask' | 'FinalMask'

// List of all available mask states
export const MASK_STATES: readonly MaskState[] = [
  'NoMask',
  'SpringMask',
  'AutumnMask',
  'StormMask',
  'FinalMask'
] as const

// State transition event
export interface MaskTransition {
  from: MaskState
  to: MaskState
  timestamp: number
}

// Callbacks for a single state
export interface MaskStateCallbacks {
  /** Called when entering this state */
  onEnter?: (from: MaskState) => void
  /** Called when leaving this state */
  onExit?: (to: MaskState) => void
  /** Update callback during state duration */
  onUpdate?: (deltaTime: number) => void
}

// State transition listener
export type TransitionListener = (transition: MaskTransition) => void

// State machine configuration
export type MaskStateConfig = {
  [K in MaskState]?: MaskStateCallbacks
}
