import { effect_def } from './_types'

type Config = { frequency: number; q: number }

export const bandpass = effect_def<Config>()({
  id: 'bandpass',
  name: 'Bandpass',
  category: 'filter',
  description: 'Passes frequencies around the center frequency',
  order: 12,
  controls: [
    { type: 'slider', key: 'frequency', label: 'Center', min: 20, max: 20000, step: 1, unit: 'Hz', scale: 'log' },
    { type: 'slider', key: 'q', label: 'Width (Q)', min: 0.1, max: 20, step: 0.1 },
  ],
  defaults: { frequency: 1000, q: 1 },

  create: (ctx, config) => {
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = config.frequency
    filter.Q.value = config.q

    return {
      input: filter,
      output: filter,
      update: (c) => {
        if (c.frequency !== undefined) filter.frequency.value = c.frequency as number
        if (c.q !== undefined) filter.Q.value = c.q as number
      },
      destroy: () => filter.disconnect(),
    }
  },
})
