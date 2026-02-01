/**
 * Mask pickup state atoms
 */

import { atom } from 'jotai/vanilla'
import type { MaskState } from '../../masksys/types'

export interface MaskPickup {
  id: string
  position: { x: number; y: number; z: number }
  maskType: MaskState
  collected: boolean
}

// Array of mask pickups in the world
export const maskPickupsAtom = atom<MaskPickup[]>([])
