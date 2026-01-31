import { effect_def, type EffectInstance } from './_types'

type Config = { rate: number; depth: number; wet: number }

export const phaser = effect_def<Config>()({
  id: 'phaser',
  name: 'Phaser',
  category: 'modulation',
  description: 'Creates sweeping phase cancellation effects',
  order: 32,
  controls: [
    { type: 'slider', key: 'rate', label: 'Rate', min: 0.1, max: 8, step: 0.1, unit: 'Hz' },
    { type: 'slider', key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
    { type: 'slider', key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01 },
  ],
  defaults: { rate: 0.5, depth: 0.7, wet: 0.5 },

  create: (ctx, config): EffectInstance => {
    const input = ctx.createGain()
    const output = ctx.createGain()

    // Dry path
    const dryGain = ctx.createGain()
    dryGain.gain.value = 1 - config.wet

    // Wet path: chain of allpass filters
    const wetGain = ctx.createGain()
    wetGain.gain.value = config.wet

    // 4 allpass filters in series
    const allpasses: BiquadFilterNode[] = []
    const baseFreqs = [200, 400, 800, 1600]

    for (const freq of baseFreqs) {
      const ap = ctx.createBiquadFilter()
      ap.type = 'allpass'
      ap.frequency.value = freq
      ap.Q.value = 0.5
      allpasses.push(ap)
    }

    // LFO modulates all allpass frequencies
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = config.rate

    const lfoGains: GainNode[] = []
    for (let i = 0; i < allpasses.length; i++) {
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = baseFreqs[i] * config.depth
      lfo.connect(lfoGain)
      lfoGain.connect(allpasses[i].frequency)
      lfoGains.push(lfoGain)
    }

    // Chain allpasses
    input.connect(allpasses[0])
    for (let i = 0; i < allpasses.length - 1; i++) {
      allpasses[i].connect(allpasses[i + 1])
    }
    allpasses[allpasses.length - 1].connect(wetGain)

    // Dry path
    input.connect(dryGain)

    // Sum
    dryGain.connect(output)
    wetGain.connect(output)

    lfo.start()

    return {
      input,
      output,
      update: (c) => {
        if (c.rate !== undefined) lfo.frequency.value = c.rate as number
        if (c.depth !== undefined) {
          for (let i = 0; i < lfoGains.length; i++) {
            lfoGains[i].gain.value = baseFreqs[i] * (c.depth as number)
          }
        }
        if (c.wet !== undefined) {
          wetGain.gain.value = c.wet as number
          dryGain.gain.value = 1 - (c.wet as number)
        }
      },
      destroy: () => {
        lfo.stop()
        lfo.disconnect()
        lfoGains.forEach(g => g.disconnect())
        allpasses.forEach(ap => ap.disconnect())
        dryGain.disconnect()
        wetGain.disconnect()
        input.disconnect()
        output.disconnect()
      },
    }
  },
})
