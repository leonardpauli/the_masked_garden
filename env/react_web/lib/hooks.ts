// React hooks - bridge to game state via jotai
// These are the ONLY way React components access game state

import {useAtomValue} from 'jotai'
import {
	player_pos_atom,
	player_mask_atom,
	current_zone_atom,
	audio_params_atom,
} from '@game/state/index.ts'
import {mask_reg, type MaskDef} from '@game/lib/index.ts'

// Re-export actions for UI to call
export {
	player_move,
	player_set_velocity,
	mask_equip,
	zone_enter,
	impact_fire,
} from '@game/state/index.ts'

// Read-only hooks
export const usePlayerPos = () => useAtomValue(player_pos_atom)
export const usePlayerMask = () => useAtomValue(player_mask_atom)
export const useCurrentZone = () => useAtomValue(current_zone_atom)
export const useAudioParams = () => useAtomValue(audio_params_atom)

// Derived data
export const useCurrentMaskDef = (): MaskDef | undefined => {
	const mask_id = useAtomValue(player_mask_atom)
	return mask_id ? mask_reg.get(mask_id) : undefined
}

export const useMaskList = (): MaskDef[] => {
	return mask_reg.list()
}
