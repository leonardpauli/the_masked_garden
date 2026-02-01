import { effect_def, type EffectInstance } from './_types'

type Config = { amount: number; wet: number }

function makeDistortionCurve(amount: number): Float32Array {
  const k = amount
  const samples = 44100
  const curve = new Float32Array(samples)
  const deg = Math.PI / 180

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
  }

  return curve
}

export const distortion = effect_def<Config>()({
  id: 'distortion',
  name: 'Distortion',
  category: 'dynamics',
  description: 'Adds harmonic distortion and overdrive',
  order: 21,
  controls: [
    { type: 'slider', key: 'amount', label: 'Drive', min: 0, max: 100, step: 1 },
    { type: 'slider', key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01 },
  ],
  defaults: { amount: 20, wet: 1 },

  create: (ctx, config): EffectInstance => {
    const input = ctx.createGain()
    const output = ctx.createGain()

    const shaper = ctx.createWaveShaper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shaper.curve = makeDistortionCurve(config.amount) as any
    shaper.oversample = '4x'

    const dryGain = ctx.createGain()
    const wetGain = ctx.createGain()

    dryGain.gain.value = 1 - config.wet
    wetGain.gain.value = config.wet

    // Parallel dry/wet routing
    input.connect(dryGain)
    input.connect(shaper)
    shaper.connect(wetGain)
    dryGain.connect(output)
    wetGain.connect(output)

    return {
      input,
      output,
      update: (c) => {
        if (c.amount !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          shaper.curve = makeDistortionCurve(c.amount as number) as any
        }
        if (c.wet !== undefined) {
          wetGain.gain.value = c.wet as number
          dryGain.gain.value = 1 - (c.wet as number)
        }
      },
      destroy: () => {
        input.disconnect()
        shaper.disconnect()
        dryGain.disconnect()
        wetGain.disconnect()
        output.disconnect()
      },
    }
  },
})
