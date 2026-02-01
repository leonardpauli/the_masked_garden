/**
 * MaskState callback implementations (placeholder)
 * 
 * Define specific effects for each mask state, including:
 * - Shader switching
 * - Environment effects (tree growth/wither, falling leaves, storm, etc.)
 * - Sound effects
 * - Particle effects
 */

import type { MaskState, MaskStateCallbacks } from './types'

// ============== NoMask Callbacks ==============
export const noMaskCallbacks: MaskStateCallbacks = {
  onEnter: (from: MaskState) => {
    console.log(`[NoMask] Entering no mask state, from: ${from}`)
    // TODO: Restore default shader
    // TODO: Restore default environment
  },
  onExit: (to: MaskState) => {
    console.log(`[NoMask] Leaving no mask state, to: ${to}`)
  },
  onUpdate: (_deltaTime: number) => {
    // No mask state continuous update logic
  }
}

// ============== SpringMask Callbacks ==============
export const springMaskCallbacks: MaskStateCallbacks = {
  onEnter: (from: MaskState) => {
    console.log(`[SpringMask] Entering spring mask state, from: ${from}`)
    // TODO: Switch to spring shader
    // TODO: Tree growth animation
    // TODO: Add petal particle effects
  },
  onExit: (to: MaskState) => {
    console.log(`[SpringMask] Leaving spring mask state, to: ${to}`)
    // TODO: Tree wither animation
    // TODO: Remove petal particle effects
  },
  onUpdate: (_deltaTime: number) => {
    // Spring state continuous update logic
    // TODO: Update petal falling effects
  }
}

// ============== AutumnMask Callbacks ==============
export const autumnMaskCallbacks: MaskStateCallbacks = {
  onEnter: (from: MaskState) => {
    console.log(`[AutumnMask] Entering autumn mask state, from: ${from}`)
    // TODO: Switch to autumn shader (warm tones)
    // TODO: Start falling leaves effect
    // TODO: Leaves color change
  },
  onExit: (to: MaskState) => {
    console.log(`[AutumnMask] Leaving autumn mask state, to: ${to}`)
    // TODO: Stop falling leaves effect
  },
  onUpdate: (_deltaTime: number) => {
    // Autumn state continuous update logic
    // TODO: Update falling leaves physics
  }
}

// ============== StormMask Callbacks ==============
export const stormMaskCallbacks: MaskStateCallbacks = {
  onEnter: (from: MaskState) => {
    console.log(`[StormMask] Entering storm mask state, from: ${from}`)
    // TODO: Switch to storm shader (dark tones, lightning effects)
    // TODO: Add wind force affecting player movement
    // TODO: Start rain/lightning particle effects
    // TODO: Play storm sound effects
  },
  onExit: (to: MaskState) => {
    console.log(`[StormMask] Leaving storm mask state, to: ${to}`)
    // TODO: Remove wind force effect
    // TODO: Stop storm particles
    // TODO: Stop storm sound effects
  },
  onUpdate: (_deltaTime: number) => {
    // Storm state continuous update logic
    // TODO: Update wind direction
    // TODO: Trigger random lightning
  }
}

// ============== FinalMask Callbacks ==============
export const finalMaskCallbacks: MaskStateCallbacks = {
  onEnter: (from: MaskState) => {
    console.log(`[FinalMask] Entering final mask state, from: ${from}`)
    // TODO: Switch to final shader (special visual effects)
    // TODO: Start ultimate effects
    // TODO: Possible gameplay mechanic changes
  },
  onExit: (to: MaskState) => {
    console.log(`[FinalMask] Leaving final mask state, to: ${to}`)
    // TODO: Restore normal effects
  },
  onUpdate: (_deltaTime: number) => {
    // Final state continuous update logic
  }
}

// ============== All Callbacks Collection ==============
export const allMaskCallbacks: Record<MaskState, MaskStateCallbacks> = {
  NoMask: noMaskCallbacks,
  SpringMask: springMaskCallbacks,
  AutumnMask: autumnMaskCallbacks,
  StormMask: stormMaskCallbacks,
  FinalMask: finalMaskCallbacks
}
