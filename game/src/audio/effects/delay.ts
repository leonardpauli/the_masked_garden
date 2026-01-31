import { effect_def, type EffectInstance } from './_types'

type Config = { time: number; feedback: number; wet: number }

export const delay = effect_def<Config>()({
  id: 'delay',
  name: 'Delay',
  category: 'time',
  description: 'Echo effect with adjustable time and feedback',
  order: 40,
  controls: [
    { type: 'slider', key: 'time', label: 'Time', min: 0.01, max: 2, step: 0.01, unit: 's' },
    { type: 'slider', key: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.01 },
    { type: 'slider', key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01 },
  ],
  defaults: { time: 0.3, feedback: 0.4, wet: 0.3 },

  create: (ctx, config): EffectInstance => {
    const input = ctx.createGain()
    const output = ctx.createGain()

    // Dry path
    const dryGain = ctx.createGain()
    dryGain.gain.value = 1 - config.wet

    // Wet path with feedback
    const delayNode = ctx.createDelay(5)
    delayNode.delayTime.value = config.time

    const feedbackGain = ctx.createGain()
    feedbackGain.gain.value = config.feedback

    const wetGain = ctx.createGain()
    wetGain.gain.value = config.wet

    // Feedback loop
    delayNode.connect(feedbackGain)
    feedbackGain.connect(delayNode)

    // Routing
    input.connect(dryGain)
    input.connect(delayNode)
    delayNode.connect(wetGain)
    dryGain.connect(output)
    wetGain.connect(output)

    return {
      input,
      output,
      update: (c) => {
        if (c.time !== undefined) delayNode.delayTime.value = c.time as number
        if (c.feedback !== undefined) feedbackGain.gain.value = c.feedback as number
        if (c.wet !== undefined) {
          wetGain.gain.value = c.wet as number
          dryGain.gain.value = 1 - (c.wet as number)
        }
      },
      destroy: () => {
        delayNode.disconnect()
        feedbackGain.disconnect()
        dryGain.disconnect()
        wetGain.disconnect()
        input.disconnect()
        output.disconnect()
      },
    }
  },
})
