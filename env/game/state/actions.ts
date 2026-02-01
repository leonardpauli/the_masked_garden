// Game actions - fire-and-forget mutations
// UI and input handlers call these, never manipulate atoms directly

import {getDefaultStore} from 'jotai'
import {
	player_pos_atom,
	player_vel_atom,
	player_mask_atom,
	current_zone_atom,
	audio_params_atom,
	impact_event_atom,
	type Vec2,
	type ImpactEvent,
} from './atoms.ts'
import {mask_reg} from '@game/lib/mask.ts'

const store = getDefaultStore()

// Player movement
export const player_move = (delta: Vec2) => {
	const pos = store.get(player_pos_atom)
	store.set(player_pos_atom, {
		x: pos.x + delta.x,
		y: pos.y + delta.y,
	})
}

export const player_set_velocity = (vel: Vec2) => {
	store.set(player_vel_atom, vel)
}

// Mask system
export const mask_equip = (mask_id: string | null) => {
	store.set(player_mask_atom, mask_id)

	// Apply mask audio params
	if (mask_id) {
		const mask = mask_reg.get(mask_id)
		if (mask?.audio) {
			store.set(audio_params_atom, prev => ({
				...prev,
				lpf_cutoff: mask.audio.lpf_cutoff ?? prev.lpf_cutoff,
				reverb_send: mask.audio.reverb_send ?? prev.reverb_send,
			}))
		}
	}
}

// Zone transitions
export const zone_enter = (zone_id: string) => {
	store.set(current_zone_atom, zone_id)
}

// Impact events (triggers sound + particles)
export const impact_fire = (event: ImpactEvent) => {
	store.set(impact_event_atom, event)
	// Clear after a tick so systems can consume it
	requestAnimationFrame(() => {
		store.set(impact_event_atom, null)
	})
}
