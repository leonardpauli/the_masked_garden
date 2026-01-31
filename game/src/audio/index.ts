/**
 * Audio module exports
 *
 * This module provides a complete WebAudio-based sound system with:
 * - Spatial audio (3D positioned sounds using HRTF)
 * - Synthesizers (sine, square, sawtooth, triangle oscillators)
 * - ADSR envelopes for expressive sound shaping
 * - LFO modulation (tremolo, vibrato, filter wobble)
 * - Noise generators (white, pink, brown noise)
 * - Audio effects (filters, delay, reverb, distortion, compressor)
 * - Sample upload and playback
 * - Real-time waveform/spectrum visualization
 *
 * Usage:
 * ```typescript
 * import { soundEngine } from './audio'
 *
 * // Initialize (must be called after user interaction)
 * await soundEngine.initialize()
 *
 * // Play a simple sound
 * const sound = soundEngine.playOscillator('sine', 440, { gain: 0.3 })
 *
 * // Play with ADSR envelope
 * soundEngine.playOscillator('sawtooth', 220, {
 *   gain: 0.4,
 *   envelope: { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.5 }
 * })
 *
 * // Play with LFO modulation
 * soundEngine.playOscillator('square', 440, {
 *   lfo: { type: 'sine', frequency: 5, depth: 0.3, target: 'gain' }
 * })
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
 * // Get visualization data
 * const waveform = soundEngine.getWaveformData()
 * const spectrum = soundEngine.getFrequencyData()
 *
 * // Stop a sound
 * sound.release() // Trigger ADSR release
 * sound.stop()    // Immediate stop
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
  type LFOTarget,
  type SpatialPosition,
  type ADSREnvelope,
  type LFOConfig,
  type FilterConfig,
  type EffectChainConfig,
  type PlayingSound,
  type LoadedSample,
  type SoundPreset
} from './SoundEngine'

export {
  presets,
  presetsByCategory,
  getPresetById,
  type SoundPreset as Preset
} from './presets'
