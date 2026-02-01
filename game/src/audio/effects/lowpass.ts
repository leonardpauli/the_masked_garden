import { effect_def } from './_types'

type Config = { frequency: number; resonance: number }

export const lowpass = effect_def<Config>()({
  id: 'lowpass',
  name: 'Lowpass',
  category: 'filter',
  description: 'Removes frequencies above the cutoff point',
  order: 10,
  controls: [
    { type: 'slider', key: 'frequency', label: 'Cutoff', min: 20, max: 20000, step: 1, unit: 'Hz', scale: 'log' },
    { type: 'slider', key: 'resonance', label: 'Resonance', min: 0.1, max: 20, step: 0.1 },
  ],
  defaults: { frequency: 1000, resonance: 1 },

  create: (ctx, config) => {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
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
