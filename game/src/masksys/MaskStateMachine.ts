/**
 * MaskState state machine core implementation
 */

import type {
  MaskState,
  MaskStateCallbacks,
  MaskTransition,
  TransitionListener
} from './types'

export class MaskStateMachine {
  private currentState: MaskState
  private callbacks: Map<MaskState, MaskStateCallbacks> = new Map()
  private transitionListeners: Set<TransitionListener> = new Set()

  constructor(initialState: MaskState = 'NoMask') {
    this.currentState = initialState
  }

  /**
   * Get current state
   */
  getState(): MaskState {
    return this.currentState
  }

  /**
   * Transition to a new state
   * @param to Target state
   * @returns Whether the transition was successful (returns false if target state equals current state)
   */
  transition(to: MaskState): boolean {
    if (this.currentState === to) {
      return false
    }

    const from = this.currentState
    const transition: MaskTransition = {
      from,
      to,
      timestamp: Date.now()
    }

    // 1. Execute current state's onExit callback
    const exitCallbacks = this.callbacks.get(from)
    if (exitCallbacks?.onExit) {
      exitCallbacks.onExit(to)
    }

    // 2. Update state
    this.currentState = to

    // 3. Execute new state's onEnter callback
    const enterCallbacks = this.callbacks.get(to)
    if (enterCallbacks?.onEnter) {
      enterCallbacks.onEnter(from)
    }

    // 4. Notify all transition listeners
    this.notifyListeners(transition)

    return true
  }

  /**
   * Update current state (called every frame)
   * @param deltaTime Time since last frame (seconds)
   */
  update(deltaTime: number): void {
    const currentCallbacks = this.callbacks.get(this.currentState)
    if (currentCallbacks?.onUpdate) {
      currentCallbacks.onUpdate(deltaTime)
    }
  }

  /**
   * Register callbacks for a specific state
   * @param state Target state
   * @param callbacks Callback function collection
   */
  registerCallbacks(state: MaskState, callbacks: MaskStateCallbacks): void {
    const existing = this.callbacks.get(state)
    if (existing) {
      // Merge callbacks
      this.callbacks.set(state, { ...existing, ...callbacks })
    } else {
      this.callbacks.set(state, callbacks)
    }
  }

  /**
   * Register callbacks for multiple states at once
   * @param config State configuration object
   */
  registerAllCallbacks(config: Partial<Record<MaskState, MaskStateCallbacks>>): void {
    for (const [state, callbacks] of Object.entries(config)) {
      if (callbacks) {
        this.registerCallbacks(state as MaskState, callbacks)
      }
    }
  }

  /**
   * Remove callbacks for a specific state
   * @param state Target state
   */
  unregisterCallbacks(state: MaskState): void {
    this.callbacks.delete(state)
  }

  /**
   * Add a state transition listener
   * @param listener Listener function
   * @returns Function to unsubscribe the listener
   */
  addTransitionListener(listener: TransitionListener): () => void {
    this.transitionListeners.add(listener)
    return () => {
      this.transitionListeners.delete(listener)
    }
  }

  /**
   * Remove a state transition listener
   * @param listener Listener function
   */
  removeTransitionListener(listener: TransitionListener): void {
    this.transitionListeners.delete(listener)
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(transition: MaskTransition): void {
    for (const listener of this.transitionListeners) {
      listener(transition)
    }
  }

  /**
   * Reset state machine to initial state
   * @param initialState Initial state, defaults to NoMask
   */
  reset(initialState: MaskState = 'NoMask'): void {
    // Execute current state's onExit
    const exitCallbacks = this.callbacks.get(this.currentState)
    if (exitCallbacks?.onExit) {
      exitCallbacks.onExit(initialState)
    }

    this.currentState = initialState

    // Execute initial state's onEnter
    const enterCallbacks = this.callbacks.get(initialState)
    if (enterCallbacks?.onEnter) {
      enterCallbacks.onEnter(this.currentState)
    }
  }

  /**
   * Destroy state machine, clear all callbacks and listeners
   */
  destroy(): void {
    this.callbacks.clear()
    this.transitionListeners.clear()
  }
}
