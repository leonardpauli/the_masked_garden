/**
 * Particle effect presets
 */

export interface ParticlePreset {
  /** Number of particles to emit per burst */
  count: number
  /** Initial speed of particles */
  speed: number
  /** Random spread factor for initial velocity */
  spread: number
  /** How long particles live (in seconds) */
  lifetime: number
  /** Size of each particle */
  size: number
  /** Particle color (hex string) */
  color: string
  /** Gravity effect on particles (negative = float up) */
  gravity: number
  /** Initial opacity */
  opacity: number
  /** Whether particles fade out over lifetime */
  fadeOut: boolean
}

export const particlePresets: Record<string, ParticlePreset> = {
  // Footprint/dust effect when player moves
  footstep: {
    count: 3,
    speed: 0.5,
    spread: 0.3,
    lifetime: 0.4,
    size: 0.08,
    color: '#8b7355',
    gravity: -0.5,
    opacity: 0.6,
    fadeOut: true,
  },

  // Damage effect when player takes hit
  damage: {
    count: 15,
    speed: 4,
    spread: 1,
    lifetime: 0.5,
    size: 0.12,
    color: '#ff4444',
    gravity: 2,
    opacity: 1,
    fadeOut: true,
  },

  // Dust trail while moving
  dust: {
    count: 2,
    speed: 0.3,
    spread: 0.2,
    lifetime: 0.6,
    size: 0.06,
    color: '#aa9977',
    gravity: -0.2,
    opacity: 0.4,
    fadeOut: true,
  },

  // Sparkle/pickup effect
  sparkle: {
    count: 20,
    speed: 3,
    spread: 0.8,
    lifetime: 0.8,
    size: 0.1,
    color: '#ffff44',
    gravity: -1,
    opacity: 1,
    fadeOut: true,
  },
}
