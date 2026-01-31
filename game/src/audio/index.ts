/**
 * Audio module exports
 *
 * This module provides a complete WebAudio-based sound system with:
 * - Spatial audio (3D positioned sounds using HRTF)
 * - Synthesizers (sine, square, sawtooth, triangle oscillators)
 * - Noise generators (white, pink, brown noise)
 * - Audio effects (low-pass, high-pass, bandpass filters, delay, reverb)
 * - Sample upload and playback
 *
 * Usage:
 * ```typescript
 * import { soundEngine } from './audio'
 *
 * // Initialize (must be called after user interaction)
 * await soundEngine.initialize()
 *
 * // Play a sound
 * const sound = soundEngine.playOscillator('sine', 440, { gain: 0.3 })
 *
 * // Play with effects
 * soundEngine.playNoise('pink', {
 *   gain: 0.2,
 *   effects: {
 *     lowpass: { frequency: 1000 },
 *     reverb: { decay: 2, wet: 0.3 }
 *   }
 * })
 *
 * // Play with spatial positioning
 * soundEngine.playOscillator('sawtooth', 220, {
 *   position: { x: 5, y: 0, z: -3 }
 * })
 *
 * // Load and play samples
 * const sample = await soundEngine.loadSample(file)
 * soundEngine.playSample(sample.id, { loop: true })
 *
 * // Stop a sound
 * sound.stop()
 *
 * // Stop all sounds
 * soundEngine.stopAll()
 * ```
 */

export {
  soundEngine,
  type OscillatorType,
  type NoiseType,
  type FilterType,
  type SpatialPosition,
  type EffectChainConfig,
  type PlayingSound,
  type LoadedSample
} from './SoundEngine'
