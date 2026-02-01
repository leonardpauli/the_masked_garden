/**
 * MaskState action functions
 * 
 * Provides state switching functions integrated with Jotai store
 */

import { gameStore } from '../store'
import { maskStateAtom, maskStateMachineAtom } from '../store/atoms/maskAtoms'
import { MaskStateMachine } from './MaskStateMachine'
import { allMaskCallbacks } from './maskCallbacks'
import type { MaskState, MaskTransition } from './types'
import { MASK_STATES } from './types'

// State machine singleton
let machineInstance: MaskStateMachine | null = null

/**
 * Initialize MaskState state machine
 * @param initialState Initial state, defaults to NoMask
 */
export function initMaskStateMachine(initialState: MaskState = 'NoMask'): MaskStateMachine {
  // If instance exists, destroy it first
  if (machineInstance) {
    machineInstance.destroy()
  }

  // Create new instance
  machineInstance = new MaskStateMachine(initialState)

  // Register all callbacks
  machineInstance.registerAllCallbacks(allMaskCallbacks)

  // Add transition listener to sync with Jotai atom
  machineInstance.addTransitionListener((transition: MaskTransition) => {
    gameStore.set(maskStateAtom, transition.to)
  })

  // Save instance to atom
  gameStore.set(maskStateMachineAtom, machineInstance)
  gameStore.set(maskStateAtom, initialState)

  return machineInstance
}

/**
 * Get state machine instance
 */
export function getMaskStateMachine(): MaskStateMachine | null {
  return machineInstance
}

/**
 * Change mask state
 * @param newState Target state
 * @returns Whether the transition was successful
 */
export function changeMaskState(newState: MaskState): boolean {
  if (!machineInstance) {
    console.warn('[MaskState] State machine not initialized, please call initMaskStateMachine() first')
    return false
  }

  return machineInstance.transition(newState)
}

/**
 * Get current mask state
 */
export function getCurrentMaskState(): MaskState {
  if (!machineInstance) {
    return 'NoMask'
  }
  return machineInstance.getState()
}

/**
 * Update state machine (called every frame)
 * @param deltaTime Time since last frame (seconds)
 */
export function updateMaskState(deltaTime: number): void {
  if (machineInstance) {
    machineInstance.update(deltaTime)
  }
}

/**
 * Reset state machine
 * @param initialState Initial state, defaults to NoMask
 */
export function resetMaskState(initialState: MaskState = 'NoMask'): void {
  if (machineInstance) {
    machineInstance.reset(initialState)
    gameStore.set(maskStateAtom, initialState)
  }
}

/**
 * Destroy state machine
 */
export function destroyMaskStateMachine(): void {
  if (machineInstance) {
    machineInstance.destroy()
    machineInstance = null
    gameStore.set(maskStateMachineAtom, null)
  }
}

/**
 * Cycle to next mask state
 */
export function nextMask(): void {
  const current = getCurrentMaskState()
  const idx = MASK_STATES.indexOf(current)
  const next = MASK_STATES[(idx + 1) % MASK_STATES.length]
  changeMaskState(next)
}

/**
 * Cycle to previous mask state
 */
export function prevMask(): void {
  const current = getCurrentMaskState()
  const idx = MASK_STATES.indexOf(current)
  const prev = MASK_STATES[(idx - 1 + MASK_STATES.length) % MASK_STATES.length]
  changeMaskState(prev)
}
