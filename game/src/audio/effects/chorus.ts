import { effect_def, type EffectInstance } from './_types'

type Config = { rate: number; depth: number; wet: number }

export const chorus = effect_def<Config>()({
  id: 'chorus',
  name: 'Chorus',
  category: 'modulation',
  description: 'Creates a thicker sound with detuned copies',
  order: 31,
  controls: [
    { type: 'slider', key: 'rate', label: 'Rate', min: 0.1, max: 5, step: 0.1, unit: 'Hz' },
    { type: 'slider', key: 'depth', label: 'Depth', min: 0, max: 0.02, step: 0.001, unit: 's' },
    { type: 'slider', key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01 },
  ],
  defaults: { rate: 1.5, depth: 0.005, wet: 0.5 },

  create: (ctx, config): EffectInstance => {
    const input = ctx.createGain()
    const output = ctx.createGain()

    // Dry path
    const dryGain = ctx.createGain()
    dryGain.gain.value = 1 - config.wet

    // Wet path with modulated delay
    const delay = ctx.createDelay(0.1)
    delay.delayTime.value = 0.02 // Base delay

    const wetGain = ctx.createGain()
    wetGain.gain.value = config.wet

    // LFO modulates delay time
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = config.rate

    const lfoGain = ctx.createGain()
    lfoGain.gain.value = config.depth

    lfo.connect(lfoGain)
    lfoGain.connect(delay.delayTime)

    // Routing
    input.connect(dryGain)
    input.connect(delay)
    delay.connect(wetGain)
    dryGain.connect(output)
    wetGain.connect(output)

    lfo.start()

    return {
      input,
      output,
      update: (c) => {
        if (c.rate !== undefined) lfo.frequency.value = c.rate as number
        if (c.depth !== undefined) lfoGain.gain.value = c.depth as number
        if (c.wet !== undefined) {
          wetGain.gain.value = c.wet as number
          dryGain.gain.value = 1 - (c.wet as number)
        }
      },
      destroy: () => {
        lfo.stop()
        lfo.disconnect()
        lfoGain.disconnect()
        delay.disconnect()
        dryGain.disconnect()
        wetGain.disconnect()
        input.disconnect()
        output.disconnect()
      },
    }
  },
})
