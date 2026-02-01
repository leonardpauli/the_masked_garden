/**
 * MaskState related Jotai atoms
 */

import { atom } from 'jotai/vanilla'
import type { MaskState } from '../../masksys/types'
import type { MaskStateMachine } from '../../masksys/MaskStateMachine'

// Current mask state
export const maskStateAtom = atom<MaskState>('NoMask')

// State machine instance reference (for access in React components)
export const maskStateMachineAtom = atom<MaskStateMachine | null>(null)
