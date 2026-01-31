// Effect registry types
// Following the registry pattern from arcviz-dsl-ext/lib/util/err.ts

// ============================================================================
// CONTROL DEFINITIONS
// ============================================================================

export type SliderControl = {
  type: 'slider'
  key: string
  label: string
  min: number
  max: number
  step: number
  unit?: string
  scale?: 'linear' | 'log'
}

export type ToggleControl = {
  type: 'toggle'
  key: string
  label: string
}

export type SelectControl = {
  type: 'select'
  key: string
  label: string
  options: { value: string; label: string }[]
}

export type ControlDef = SliderControl | ToggleControl | SelectControl

// ============================================================================
// EFFECT INSTANCE
// ============================================================================

export type EffectInstance = {
  input: AudioNode
  output: AudioNode
  update: (config: Partial<Record<string, unknown>>) => void
  destroy: () => void
}

// ============================================================================
// EFFECT DEFINITION
// ============================================================================

export type EffectCategory = 'filter' | 'dynamics' | 'time' | 'modulation' | 'utility'

export type EffectDef<Id extends string = string, Config extends Record<string, unknown> = Record<string, unknown>> = {
  id: Id
  name: string
  category: EffectCategory
  description: string
  controls: ControlDef[]
  defaults: Config
  order: number
  create: (ctx: AudioContext, config: Config) => EffectInstance
}

// ============================================================================
// FACTORY (curried for type inference)
// ============================================================================

/**
 * Define an effect entry (curried: first call sets Config type, second sets Id)
 *
 * Usage:
 * ```ts
 * type Config = { frequency: number; resonance: number }
 * export const lowpass = effect_def<Config>()({
 *   id: 'lowpass',
 *   name: 'Lowpass',
 *   ...
 * })
 * ```
 */
export const effect_def = <Config extends Record<string, unknown>>() =>
  <Id extends string>(def: EffectDef<Id, Config>): EffectDef<Id, Config> => def

// ============================================================================
// REGISTRY TYPES
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EffectDefAny = EffectDef<string, any>

export type EffectRegistry = Record<string, EffectDefAny>

export type EffectIdOf<R extends EffectRegistry> = keyof R & string

export type ConfigOf<D extends EffectDefAny> = D extends EffectDef<string, infer C> ? C : never
