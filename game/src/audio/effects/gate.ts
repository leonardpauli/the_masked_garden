import { effect_def, type EffectInstance } from './_types'

type Config = { threshold: number; attack: number; release: number }

export const gate = effect_def<Config>()({
  id: 'gate',
  name: 'Noise Gate',
  category: 'dynamics',
  description: 'Silences audio below a threshold level',
  order: 23,
  controls: [
    { type: 'slider', key: 'threshold', label: 'Threshold', min: -60, max: 0, step: 1, unit: 'dB' },
    { type: 'slider', key: 'attack', label: 'Attack', min: 0.001, max: 0.1, step: 0.001, unit: 's' },
    { type: 'slider', key: 'release', label: 'Release', min: 0.01, max: 0.5, step: 0.01, unit: 's' },
  ],
  defaults: { threshold: -40, attack: 0.01, release: 0.1 },

  create: (ctx, config): EffectInstance => {
    const bufferSize = 2048
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1)

    let threshold = Math.pow(10, config.threshold / 20) // Convert dB to linear
    let attack = config.attack
    let release = config.release
    let envelope = 0

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const output = e.outputBuffer.getChannelData(0)

      const attackCoeff = Math.exp(-1 / (ctx.sampleRate * attack))
      const releaseCoeff = Math.exp(-1 / (ctx.sampleRate * release))

      for (let i = 0; i < input.length; i++) {
        const absInput = Math.abs(input[i])

        // Envelope follower
        if (absInput > envelope) {
          envelope = attackCoeff * envelope + (1 - attackCoeff) * absInput
        } else {
          envelope = releaseCoeff * envelope
        }

        // Gate
        if (envelope > threshold) {
          output[i] = input[i]
        } else {
          output[i] = 0
        }
      }
    }

    // Keep processor alive
    const dummyGain = ctx.createGain()
    dummyGain.gain.value = 0
    processor.connect(dummyGain)
    dummyGain.connect(ctx.destination)

    return {
      input: processor,
      output: processor,
      update: (c) => {
        if (c.threshold !== undefined) threshold = Math.pow(10, (c.threshold as number) / 20)
        if (c.attack !== undefined) attack = c.attack as number
        if (c.release !== undefined) release = c.release as number
      },
      destroy: () => {
        processor.disconnect()
        dummyGain.disconnect()
      },
    }
  },
})
