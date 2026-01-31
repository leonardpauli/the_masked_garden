import { atom } from 'jotai/vanilla'
import type { VisualStyle } from '../../types/visualStyles'

// Player config
export const playerSpeedAtom = atom<number>(8)
export const playerScaleAtom = atom<number>(0.5)
export const playerDampingAtom = atom<number>(3)

// Camera config
export const cameraDistanceAtom = atom<number>(14)
export const cameraSmoothingAtom = atom<number>(0.1)
export const cameraViewAngleAtom = atom<number>(43) // 0 = top-down, 70 = third-person

// Physics config
export const gravityAtom = atom<number>(20)

// Game config
export const collisionCooldownAtom = atom<number>(500)
export const damageAmountAtom = atom<number>(10)

// Game system toggles (default: OFF)
export const healthEnabledAtom = atom<boolean>(false)
export const scoreEnabledAtom = atom<boolean>(false)

// Visual style config
export const visualStyleAtom = atom<VisualStyle>('default')

// Tree colors
export const treeColorVariationAtom = atom<number>(1) // 0-1 range

// Ground color (0 = dull grey-green, 1 = neon green)
export const groundVibranceAtom = atom<number>(0)

// Dev panel visibility
export const devPanelOpenAtom = atom<boolean>(true)
