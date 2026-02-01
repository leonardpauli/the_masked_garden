// Re-export sound engine (new)
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
} from './sound-engine.ts'

export { presets, presetsByCategory, getPresetById, type SoundPreset } from './presets.ts'

export * from './impact.ts'

// Re-export legacy engine for backward compatibility
export { audio_engine_create, type AudioEngine, type AudioBus } from './engine.ts'
