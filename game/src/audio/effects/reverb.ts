import { effect_def, type EffectInstance } from './_types'

type Config = { decay: number; wet: number }

function generateImpulse(ctx: AudioContext, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * Math.min(decay, 5)

  const buffer = ctx.createBuffer(2, length, sampleRate)
  const leftChannel = buffer.getChannelData(0)
  const rightChannel = buffer.getChannelData(1)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const amplitude = Math.exp(-t * (3 / decay))
    leftChannel[i] = (Math.random() * 2 - 1) * amplitude
    rightChannel[i] = (Math.random() * 2 - 1) * amplitude
  }

  return buffer
}

export const reverb = effect_def<Config>()({
  id: 'reverb',
  name: 'Reverb',
  category: 'time',
  description: 'Simulates room acoustics and space',
  order: 41,
  controls: [
    { type: 'slider', key: 'decay', label: 'Decay', min: 0.1, max: 5, step: 0.1, unit: 's' },
    { type: 'slider', key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01 },
  ],
  defaults: { decay: 2, wet: 0.3 },

  create: (ctx, config): EffectInstance => {
    const input = ctx.createGain()
    const output = ctx.createGain()

    // Dry path
    const dryGain = ctx.createGain()
    dryGain.gain.value = 1 - config.wet

    // Wet path with convolver
    const convolver = ctx.createConvolver()
    convolver.buffer = generateImpulse(ctx, config.decay)

    const wetGain = ctx.createGain()
    wetGain.gain.value = config.wet

    // Routing
    input.connect(dryGain)
    input.connect(convolver)
    convolver.connect(wetGain)
    dryGain.connect(output)
    wetGain.connect(output)

    let currentDecay = config.decay

    return {
      input,
      output,
      update: (c) => {
        if (c.decay !== undefined && c.decay !== currentDecay) {
          currentDecay = c.decay as number
          convolver.buffer = generateImpulse(ctx, currentDecay)
        }
        if (c.wet !== undefined) {
          wetGain.gain.value = c.wet as number
          dryGain.gain.value = 1 - (c.wet as number)
        }
      },
      destroy: () => {
        convolver.disconnect()
        dryGain.disconnect()
        wetGain.disconnect()
        input.disconnect()
        output.disconnect()
      },
    }
  },
})
