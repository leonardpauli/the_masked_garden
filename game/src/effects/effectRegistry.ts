import { Effect } from 'postprocessing'
import type { VisualEffectType } from '../types/visualStyles'

// Import all effects
import { EdgeDetectionEffect } from './EdgeDetectionEffect'
import { DreamscapeEffect } from './DreamscapeEffect'
import { ThermalEffect } from './ThermalEffect'
import { GlitchEffect } from './GlitchEffect'
import { UnderwaterEffect } from './UnderwaterEffect'
import { XrayEffect } from './XrayEffect'
import { OilPaintingEffect } from './OilPaintingEffect'
import { PixelateEffect } from './PixelateEffect'
import { NegativeEffect } from './NegativeEffect'
import { AstralEffect } from './AstralEffect'
import { TiltShiftEffect } from './TiltShiftEffect'

// Effect factory type
type EffectFactory = (config?: Record<string, unknown>) => Effect

// Registry mapping effect types to their factories
export const effectRegistry: Record<Exclude<VisualEffectType, 'none'>, EffectFactory> = {
  edgeDetection: (config) => new EdgeDetectionEffect({
    edgeColor: config?.edgeColor as string,
    threshold: config?.edgeThreshold as number,
  }),
  dreamscape: () => new DreamscapeEffect(),
  thermal: () => new ThermalEffect(),
  glitch: () => new GlitchEffect(),
  underwater: () => new UnderwaterEffect(),
  xray: () => new XrayEffect(),
  oilPainting: () => new OilPaintingEffect(),
  pixelate: () => new PixelateEffect(),
  negative: () => new NegativeEffect(),
  astral: () => new AstralEffect(),
  tiltShift: () => new TiltShiftEffect(),
}

// Helper to create an effect from type
export function createEffect(
  effectType: VisualEffectType,
  config?: Record<string, unknown>
): Effect | null {
  if (effectType === 'none') return null
  const factory = effectRegistry[effectType]
  return factory ? factory(config) : null
}
