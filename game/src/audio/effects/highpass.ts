import { effect_def } from './_types'

type Config = { frequency: number; resonance: number }

export const highpass = effect_def<Config>()({
  id: 'highpass',
  name: 'Highpass',
  category: 'filter',
  description: 'Removes frequencies below the cutoff point',
  order: 11,
  controls: [
    { type: 'slider', key: 'frequency', label: 'Cutoff', min: 20, max: 20000, step: 1, unit: 'Hz', scale: 'log' },
    { type: 'slider', key: 'resonance', label: 'Resonance', min: 0.1, max: 20, step: 0.1 },
  ],
  defaults: { frequency: 200, resonance: 1 },

  create: (ctx, config) => {
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = config.frequency
    filter.Q.value = config.resonance

    return {
      input: filter,
      output: filter,
      update: (c) => {
        if (c.frequency !== undefined) filter.frequency.value = c.frequency as number
        if (c.resonance !== undefined) filter.Q.value = c.resonance as number
      },
      destroy: () => filter.disconnect(),
    }
  },
})
