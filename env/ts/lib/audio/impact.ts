// Impact sampler - collision velocity -> sound selection + playback

import type {AudioEngine} from './engine.ts'

export type ImpactSample = {
	id: string
	url: string
	buffer?: AudioBuffer
	min_impulse: number // trigger threshold
	max_impulse: number
}

export type ImpactSampler = {
	load_sample: (sample: ImpactSample) => Promise<void>
	play: (impulse: number, material?: string) => void
}

export const impact_sampler_create = (engine: AudioEngine): ImpactSampler => {
	const samples: ImpactSample[] = []

	return {
		load_sample: async (sample) => {
			const response = await fetch(sample.url)
			const array_buffer = await response.arrayBuffer()
			sample.buffer = await engine.ctx.decodeAudioData(array_buffer)
			samples.push(sample)
		},

		play: (impulse, _material) => {
			// Find matching sample based on impulse
			const matching = samples.filter(
				s => impulse >= s.min_impulse && impulse <= s.max_impulse
			)

			if (matching.length === 0) return

			// Pick random from matching
			const sample = matching[Math.floor(Math.random() * matching.length)]
			if (!sample?.buffer) return

			// Create source
			const source = engine.ctx.createBufferSource()
			source.buffer = sample.buffer

			// Modulate based on impulse
			const gain = engine.ctx.createGain()
			const vol = Math.min(1, 0.3 + impulse * 0.7)
			gain.gain.value = vol

			// Slight pitch variation
			source.playbackRate.value = 0.9 + Math.random() * 0.2

			source.connect(gain)
			gain.connect(engine.sfx_bus.input)
			source.start()
		},
	}
}
