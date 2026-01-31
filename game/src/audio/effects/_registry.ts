// Effect registry - collects all effect definitions

import type { EffectDefAny, EffectCategory } from './_types'

// Import all effects
import { lowpass } from './lowpass'
import { highpass } from './highpass'
import { bandpass } from './bandpass'
import { notch } from './notch'
import { eq3band } from './eq3band'
import { compressor } from './compressor'
import { distortion } from './distortion'
import { bitcrusher } from './bitcrusher'
import { gate } from './gate'
import { tremolo } from './tremolo'
import { chorus } from './chorus'
import { phaser } from './phaser'
import { delay } from './delay'
import { reverb } from './reverb'
import { pan } from './pan'

// ============================================================================
// REGISTRY
// ============================================================================

export const effectsRegistry = {
  lowpass,
  highpass,
  bandpass,
  notch,
  eq3band,
  compressor,
  distortion,
  bitcrusher,
  gate,
  tremolo,
  chorus,
  phaser,
  delay,
  reverb,
  pan,
} as const

export type EffectId = keyof typeof effectsRegistry

// ============================================================================
// HELPERS
// ============================================================================

/** Get all effects as a sorted list by order */
export const effectsList = Object.values(effectsRegistry).sort((a, b) => a.order - b.order)

/** Get effects grouped by category */
export const effectsByCategory = effectsList.reduce((acc, effect) => {
  const category = effect.category
  if (!acc[category]) acc[category] = []
  acc[category].push(effect)
  return acc
}, {} as Record<EffectCategory, EffectDefAny[]>)

/** Category display names */
export const categoryNames: Record<EffectCategory, string> = {
  filter: 'Filters',
  dynamics: 'Dynamics',
  modulation: 'Modulation',
  time: 'Time',
  utility: 'Utility',
}

/** Category order for display */
export const categoryOrder: EffectCategory[] = ['filter', 'dynamics', 'modulation', 'time', 'utility']

/** Get effect by ID with type safety */
export const getEffect = <K extends EffectId>(id: K): typeof effectsRegistry[K] => effectsRegistry[id]

/** Check if an ID is a valid effect */
export const isValidEffectId = (id: string): id is EffectId => id in effectsRegistry
