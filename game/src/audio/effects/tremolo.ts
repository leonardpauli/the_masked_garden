import { effect_def, type EffectInstance } from './_types'

type Config = { rate: number; depth: number }

export const tremolo = effect_def<Config>()({
  id: 'tremolo',
  name: 'Tremolo',
  category: 'modulation',
  description: 'Modulates volume at a regular rate',
  order: 30,
  controls: [
    { type: 'slider', key: 'rate', label: 'Rate', min: 0.1, max: 20, step: 0.1, unit: 'Hz' },
    { type: 'slider', key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
  ],
  defaults: { rate: 4, depth: 0.5 },

  create: (ctx, config): EffectInstance => {
    const input = ctx.createGain()
    const output = ctx.createGain()

    // LFO
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = config.rate

    // LFO gain (controls depth)
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = config.depth * 0.5 // Scale to +-0.5

    // Modulated gain
    const modGain = ctx.createGain()
    modGain.gain.value = 1 - config.depth * 0.5 // Center point

    lfo.connect(lfoGain)
    lfoGain.connect(modGain.gain)

    input.connect(modGain)
    modGain.connect(output)

    lfo.start()

    return {
      input,
      output,
      update: (c) => {
        if (c.rate !== undefined) lfo.frequency.value = c.rate as number
        if (c.depth !== undefined) {
          const d = c.depth as number
          lfoGain.gain.value = d * 0.5
          modGain.gain.value = 1 - d * 0.5
        }
      },
      destroy: () => {
        lfo.stop()
        lfo.disconnect()
        lfoGain.disconnect()
        input.disconnect()
        modGain.disconnect()
        output.disconnect()
      },
    }
  },
})
