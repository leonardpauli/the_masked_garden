// Mask definitions - parameter bundles that modulate perception

import {reg_create, type RegEntry} from '@ts/lib/reg/index.ts'

export type MaskDef = RegEntry & {
	name: string
	visual: {
		render_layers?: string[]
		saturation?: number
		chromatic_aberration?: number
		vignette?: number
	}
	audio: {
		lpf_cutoff?: number // 0..1, default 1
		reverb_send?: number // 0..1
		chorus_amount?: number
	}
	interaction: {
		reveal_tags?: string[]
		hide_tags?: string[]
	}
	physics: {
		gravity_mult?: number
		collision_softness?: number
	}
}

// Starter masks
export const mask_trust: MaskDef = {
	id: 'trust',
	name: 'Mask of Trust',
	tags: ['starter'],
	visual: {
		render_layers: ['base', 'spirits', 'secrets'],
	},
	audio: {
		reverb_send: 0.4,
		lpf_cutoff: 0.9,
	},
	interaction: {
		reveal_tags: ['friendly', 'secret'],
	},
	physics: {
		collision_softness: 0.8,
	},
}

export const mask_silence: MaskDef = {
	id: 'silence',
	name: 'Mask of Silence',
	tags: ['starter'],
	visual: {
		saturation: 0.3,
		vignette: 0.4,
	},
	audio: {
		lpf_cutoff: 0.3,
		reverb_send: 0.6,
	},
	interaction: {
		reveal_tags: ['hidden', 'whisper'],
		hide_tags: ['loud'],
	},
	physics: {
		gravity_mult: 0.8,
	},
}

export const mask_noise: MaskDef = {
	id: 'noise',
	name: 'Mask of Noise',
	tags: ['starter'],
	visual: {
		chromatic_aberration: 0.02,
		saturation: 1.2,
	},
	audio: {
		lpf_cutoff: 1,
		chorus_amount: 0.6,
		reverb_send: 0.2,
	},
	interaction: {
		reveal_tags: ['crowd', 'rhythm'],
	},
	physics: {
		collision_softness: 0.3,
	},
}

// Registry
export const mask_reg = reg_create<MaskDef>({
	trust: mask_trust,
	silence: mask_silence,
	noise: mask_noise,
})
