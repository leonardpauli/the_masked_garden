import { effect_def, type EffectInstance } from './_types'

type Config = { low: number; mid: number; high: number }

export const eq3band = effect_def<Config>()({
  id: 'eq3band',
  name: '3-Band EQ',
  category: 'filter',
  description: 'Three-band equalizer with low, mid, and high controls',
  order: 15,
  controls: [
    { type: 'slider', key: 'low', label: 'Low', min: -12, max: 12, step: 0.5, unit: 'dB' },
    { type: 'slider', key: 'mid', label: 'Mid', min: -12, max: 12, step: 0.5, unit: 'dB' },
    { type: 'slider', key: 'high', label: 'High', min: -12, max: 12, step: 0.5, unit: 'dB' },
  ],
  defaults: { low: 0, mid: 0, high: 0 },

  create: (ctx, config): EffectInstance => {
    // Low shelf at 320Hz
    const lowShelf = ctx.createBiquadFilter()
    lowShelf.type = 'lowshelf'
    lowShelf.frequency.value = 320
    lowShelf.gain.value = config.low

    // Peaking at 1000Hz
    const midPeak = ctx.createBiquadFilter()
    midPeak.type = 'peaking'
    midPeak.frequency.value = 1000
    midPeak.Q.value = 0.5
    midPeak.gain.value = config.mid

    // High shelf at 3200Hz
    const highShelf = ctx.createBiquadFilter()
    highShelf.type = 'highshelf'
    highShelf.frequency.value = 3200
    highShelf.gain.value = config.high

    // Chain: low -> mid -> high
    lowShelf.connect(midPeak)
    midPeak.connect(highShelf)

    return {
      input: lowShelf,
      output: highShelf,
      update: (c) => {
        if (c.low !== undefined) lowShelf.gain.value = c.low as number
        if (c.mid !== undefined) midPeak.gain.value = c.mid as number
        if (c.high !== undefined) highShelf.gain.value = c.high as number
      },
      destroy: () => {
        lowShelf.disconnect()
        midPeak.disconnect()
        highShelf.disconnect()
      },
    }
  },
})
