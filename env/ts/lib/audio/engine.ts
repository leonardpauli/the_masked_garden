// Audio engine - Web Audio API wrapper
// Provides buses, filters, impact-driven sounds

export type AudioEngine = {
	ctx: AudioContext
	master: GainNode
	music_bus: AudioBus
	ambience_bus: AudioBus
	sfx_bus: AudioBus
	resume: () => Promise<void>
	set_master_volume: (vol: number) => void
	set_lpf_cutoff: (cutoff: number) => void // 0..1 -> 200Hz..20kHz
}

export type AudioBus = {
	input: GainNode
	filter: BiquadFilterNode
	output: GainNode
	set_volume: (vol: number) => void
	set_filter_freq: (freq: number) => void
}

const bus_create = (ctx: AudioContext, dest: AudioNode): AudioBus => {
	const input = ctx.createGain()
	const filter = ctx.createBiquadFilter()
	filter.type = 'lowpass'
	filter.frequency.value = 20000
	filter.Q.value = 0.7
	const output = ctx.createGain()

	input.connect(filter)
	filter.connect(output)
	output.connect(dest)

	return {
		input,
		filter,
		output,
		set_volume: (vol) => {
			output.gain.setTargetAtTime(vol, ctx.currentTime, 0.05)
		},
		set_filter_freq: (freq) => {
			filter.frequency.setTargetAtTime(freq, ctx.currentTime, 0.1)
		},
	}
}

export const audio_engine_create = (): AudioEngine => {
	const ctx = new AudioContext()

	// Master output with compressor
	const compressor = ctx.createDynamicsCompressor()
	compressor.threshold.value = -12
	compressor.knee.value = 10
	compressor.ratio.value = 4
	compressor.attack.value = 0.003
	compressor.release.value = 0.25
	compressor.connect(ctx.destination)

	const master = ctx.createGain()
	master.connect(compressor)

	// Create buses
	const music_bus = bus_create(ctx, master)
	const ambience_bus = bus_create(ctx, master)
	const sfx_bus = bus_create(ctx, master)

	// Global LPF for mask effects
	const global_lpf = ctx.createBiquadFilter()
	global_lpf.type = 'lowpass'
	global_lpf.frequency.value = 20000

	return {
		ctx,
		master,
		music_bus,
		ambience_bus,
		sfx_bus,
		resume: async () => {
			if (ctx.state === 'suspended') {
				await ctx.resume()
			}
		},
		set_master_volume: (vol) => {
			master.gain.setTargetAtTime(vol, ctx.currentTime, 0.05)
		},
		set_lpf_cutoff: (cutoff) => {
			// Map 0..1 to 200Hz..20kHz (logarithmic)
			const min_freq = 200
			const max_freq = 20000
			const freq = min_freq * Math.pow(max_freq / min_freq, cutoff)
			// Apply to all buses
			music_bus.set_filter_freq(freq)
			ambience_bus.set_filter_freq(freq)
			sfx_bus.set_filter_freq(freq)
		},
	}
}
