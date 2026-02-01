import type { VisualEffectType } from '../types/visualStyles'

export interface EffectParam {
  key: string
  label: string
  min: number
  max: number
  step: number
  default: number
}

export const effectParams: Record<Exclude<VisualEffectType, 'none'>, EffectParam[]> = {
  edgeDetection: [
    { key: 'threshold', label: 'Edge Threshold', min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
  ],
  dreamscape: [
    { key: 'chromaticStrength', label: 'Chromatic', min: 0, max: 0.05, step: 0.001, default: 0.015 },
    { key: 'waveStrength', label: 'Wave', min: 0, max: 0.01, step: 0.001, default: 0.003 },
    { key: 'hueShiftSpeed', label: 'Hue Shift', min: 0, max: 0.5, step: 0.01, default: 0.1 },
  ],
  thermal: [
    { key: 'intensity', label: 'Intensity', min: 0.5, max: 2, step: 0.1, default: 1 },
  ],
  glitch: [
    { key: 'intensity', label: 'Intensity', min: 0, max: 2, step: 0.1, default: 1 },
    { key: 'scanLineIntensity', label: 'Scan Lines', min: 0, max: 1, step: 0.05, default: 0.3 },
    { key: 'noiseIntensity', label: 'Noise', min: 0, max: 1, step: 0.05, default: 0.15 },
  ],
  underwater: [
    { key: 'causticIntensity', label: 'Caustics', min: 0, max: 2, step: 0.1, default: 0.8 },
    { key: 'distortionStrength', label: 'Distortion', min: 0, max: 2, step: 0.1, default: 1 },
    { key: 'particleDensity', label: 'Particles', min: 0, max: 3, step: 0.1, default: 1 },
    { key: 'depthFalloff', label: 'Depth Falloff', min: 0, max: 2, step: 0.1, default: 0.5 },
  ],
  xray: [
    { key: 'edgeIntensity', label: 'Edge Glow', min: 0, max: 2, step: 0.1, default: 1 },
    { key: 'gridIntensity', label: 'Grid', min: 0, max: 1, step: 0.05, default: 0.3 },
  ],
  oilPainting: [
    { key: 'kernelSize', label: 'Brush Size', min: 1, max: 8, step: 1, default: 4 },
    { key: 'saturationBoost', label: 'Saturation', min: 0, max: 1, step: 0.05, default: 0.3 },
    { key: 'colorLevels', label: 'Color Levels', min: 4, max: 32, step: 2, default: 12 },
  ],
  pixelate: [
    { key: 'pixelSize', label: 'Pixel Size', min: 1, max: 16, step: 1, default: 4 },
    { key: 'ditherStrength', label: 'Dither', min: 0, max: 1, step: 0.05, default: 0.5 },
    { key: 'colorLevels', label: 'Colors', min: 4, max: 32, step: 2, default: 16 },
  ],
  negative: [
    { key: 'pulseIntensity', label: 'Pulse', min: 0, max: 0.5, step: 0.02, default: 0.1 },
    { key: 'channelRotation', label: 'Channel Shift', min: 0, max: 1, step: 0.05, default: 0.15 },
  ],
  astral: [
    { key: 'offsetAmount', label: 'Offset', min: 0, max: 0.05, step: 0.002, default: 0.015 },
    { key: 'ghostOpacity', label: 'Ghost Opacity', min: 0, max: 1, step: 0.05, default: 0.4 },
    { key: 'glowIntensity', label: 'Glow', min: 0, max: 2, step: 0.1, default: 0.8 },
  ],
  tiltShift: [
    { key: 'blurStrength', label: 'Blur', min: 0, max: 2, step: 0.1, default: 0.8 },
    { key: 'focusPosition', label: 'Focus Y', min: 0.2, max: 0.8, step: 0.05, default: 0.5 },
    { key: 'focusWidth', label: 'Focus Width', min: 0.1, max: 0.6, step: 0.05, default: 0.3 },
    { key: 'saturationBoost', label: 'Saturation', min: 0, max: 1, step: 0.05, default: 0.3 },
  ],
  vhs: [
    { key: 'noiseIntensity', label: 'Noise', min: 0, max: 1, step: 0.05, default: 0.3 },
    { key: 'scanLineIntensity', label: 'Scan Lines', min: 0, max: 1, step: 0.05, default: 0.5 },
    { key: 'rgbShift', label: 'RGB Shift', min: 0, max: 0.02, step: 0.001, default: 0.005 },
    { key: 'trackingError', label: 'Tracking', min: 0, max: 1, step: 0.05, default: 0.3 },
  ],
  ascii: [
    { key: 'cellSize', label: 'Cell Size', min: 4, max: 16, step: 1, default: 8 },
    { key: 'colorMode', label: 'Color', min: 0, max: 1, step: 1, default: 1 },
  ],
  halftone: [
    { key: 'dotSize', label: 'Dot Size', min: 2, max: 12, step: 0.5, default: 4 },
    { key: 'dotSpacing', label: 'Spacing', min: 4, max: 16, step: 1, default: 8 },
    { key: 'colorSeparation', label: 'CMYK Sep.', min: 0, max: 1, step: 0.1, default: 1 },
  ],
  infrared: [
    { key: 'intensity', label: 'Intensity', min: 0.5, max: 2, step: 0.1, default: 1 },
    { key: 'heatShift', label: 'Heat Shift', min: -0.5, max: 0.5, step: 0.05, default: 0 },
  ],
  echo: [
    { key: 'trailCount', label: 'Trails', min: 2, max: 8, step: 1, default: 4 },
    { key: 'trailDecay', label: 'Decay', min: 0.1, max: 0.9, step: 0.05, default: 0.4 },
    { key: 'trailOffset', label: 'Offset', min: 0.005, max: 0.05, step: 0.005, default: 0.015 },
  ],
}

// Get params for an effect type
export function getEffectParams(effectType: VisualEffectType): EffectParam[] {
  if (effectType === 'none') return []
  return effectParams[effectType] || []
}

// Get default values for an effect
export function getEffectDefaults(effectType: VisualEffectType): Record<string, number> {
  const params = getEffectParams(effectType)
  const defaults: Record<string, number> = {}
  for (const param of params) {
    defaults[param.key] = param.default
  }
  return defaults
}
