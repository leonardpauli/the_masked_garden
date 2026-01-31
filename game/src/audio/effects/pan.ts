import { effect_def } from './_types'

type Config = { pan: number }

export const pan = effect_def<Config>()({
  id: 'pan',
  name: 'Pan',
  category: 'utility',
  description: 'Stereo panning control',
  order: 50,
  controls: [
    { type: 'slider', key: 'pan', label: 'Pan', min: -1, max: 1, step: 0.01 },
  ],
  defaults: { pan: 0 },

  create: (ctx, config) => {
    const panner = ctx.createStereoPanner()
    panner.pan.value = config.pan

    return {
      input: panner,
      output: panner,
      update: (c) => {
        if (c.pan !== undefined) panner.pan.value = c.pan as number
      },
      destroy: () => panner.disconnect(),
    }
  },
})
