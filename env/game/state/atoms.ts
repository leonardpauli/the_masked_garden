// Game state - source of truth
// Both Three.js and React subscribe to these atoms
// NEVER flow data from React -> Three.js directly

import {atom} from 'jotai'

// Player state
export const player_pos_atom = atom({x: 0, y: 0})
export const player_vel_atom = atom({x: 0, y: 0})
export const player_mask_atom = atom<string | null>(null)

// World state
export const current_zone_atom = atom<string | null>(null)
export const entities_atom = atom<Map<string, Entity>>(new Map())

// Audio state
export const audio_params_atom = atom<AudioParams>({
	lpf_cutoff: 1,
	reverb_send: 0.2,
	master_volume: 1,
})

// Impact events (for sound + particles)
export const impact_event_atom = atom<ImpactEvent | null>(null)

// Types
export type Vec2 = {x: number; y: number}

export type Entity = {
	id: string
	pos: Vec2
	type: string
	tags: string[]
}

export type AudioParams = {
	lpf_cutoff: number // 0..1
	reverb_send: number // 0..1
	master_volume: number // 0..1
}

export type ImpactEvent = {
	pos: Vec2
	impulse: number // collision magnitude
	material: string
}
