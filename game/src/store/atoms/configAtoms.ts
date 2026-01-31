import { atom } from 'jotai/vanilla'
import type { VisualStyle } from '../../types/visualStyles'

// Player config
export const playerSpeedAtom = atom<number>(8)
export const playerScaleAtom = atom<number>(0.5)
export const playerDampingAtom = atom<number>(3)

// Camera config
export const cameraHeightAtom = atom<number>(20)
export const cameraSmoothingAtom = atom<number>(0.1)

// Physics config
export const gravityAtom = atom<number>(20)

// Game config
export const collisionCooldownAtom = atom<number>(500)
export const damageAmountAtom = atom<number>(10)

// Visual style config
export const visualStyleAtom = atom<VisualStyle>('default')

// Dev panel visibility
export const devPanelOpenAtom = atom<boolean>(true)
