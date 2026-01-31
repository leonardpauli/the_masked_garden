import { effect_def } from './_types'

type Config = {
  threshold: number
  knee: number
  ratio: number
  attack: number
  release: number
}

export const compressor = effect_def<Config>()({
  id: 'compressor',
  name: 'Compressor',
  category: 'dynamics',
  description: 'Reduces dynamic range by attenuating loud sounds',
  order: 20,
  controls: [
    { type: 'slider', key: 'threshold', label: 'Threshold', min: -60, max: 0, step: 1, unit: 'dB' },
    { type: 'slider', key: 'knee', label: 'Knee', min: 0, max: 40, step: 1, unit: 'dB' },
    { type: 'slider', key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.5 },
    { type: 'slider', key: 'attack', label: 'Attack', min: 0, max: 1, step: 0.001, unit: 's' },
    { type: 'slider', key: 'release', label: 'Release', min: 0, max: 1, step: 0.01, unit: 's' },
  ],
  defaults: { threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 },

  create: (ctx, config) => {
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = config.threshold
    comp.knee.value = config.knee
    comp.ratio.value = config.ratio
    comp.attack.value = config.attack
    comp.release.value = config.release

    return {
      input: comp,
      output: comp,
      update: (c) => {
        if (c.threshold !== undefined) comp.threshold.value = c.threshold as number
        if (c.knee !== undefined) comp.knee.value = c.knee as number
        if (c.ratio !== undefined) comp.ratio.value = c.ratio as number
        if (c.attack !== undefined) comp.attack.value = c.attack as number
        if (c.release !== undefined) comp.release.value = c.release as number
      },
      destroy: () => comp.disconnect(),
    }
  },
})
