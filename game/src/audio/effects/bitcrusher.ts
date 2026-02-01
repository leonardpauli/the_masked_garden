import { effect_def, type EffectInstance } from './_types'

type Config = { bits: number; sampleRate: number }

export const bitcrusher = effect_def<Config>()({
  id: 'bitcrusher',
  name: 'Bitcrusher',
  category: 'dynamics',
  description: 'Lo-fi effect that reduces bit depth and sample rate',
  order: 22,
  controls: [
    { type: 'slider', key: 'bits', label: 'Bits', min: 1, max: 16, step: 1 },
    { type: 'slider', key: 'sampleRate', label: 'Sample Rate', min: 256, max: 44100, step: 256, unit: 'Hz', scale: 'log' },
  ],
  defaults: { bits: 8, sampleRate: 8000 },

  create: (ctx, config): EffectInstance => {
    // Use ScriptProcessor for real-time bit crushing
    // Note: ScriptProcessor is deprecated but AudioWorklet requires separate file
    const bufferSize = 4096
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1)

    let bits = config.bits
    let rate = config.sampleRate

    let sampleHold = 0
    let sampleCounter = 0

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const output = e.outputBuffer.getChannelData(0)

      const step = Math.pow(0.5, bits)
      const sampleStep = Math.max(1, Math.floor(ctx.sampleRate / rate))

      for (let i = 0; i < input.length; i++) {
        sampleCounter++
        if (sampleCounter >= sampleStep) {
          sampleCounter = 0
          // Bit reduce
          sampleHold = Math.round(input[i] / step) * step
        }
        output[i] = sampleHold
      }
    }

    // Need a dummy destination to keep processor alive
    const dummyGain = ctx.createGain()
    dummyGain.gain.value = 0
    processor.connect(dummyGain)
    dummyGain.connect(ctx.destination)

    return {
      input: processor,
      output: processor,
      update: (c) => {
        if (c.bits !== undefined) bits = c.bits as number
        if (c.sampleRate !== undefined) rate = c.sampleRate as number
      },
      destroy: () => {
        processor.disconnect()
        dummyGain.disconnect()
      },
    }
  },
})
