import { atom } from 'jotai/vanilla'
import type { VisualStyle } from '../../types/visualStyles'

// Player config
export const playerSpeedAtom = atom<number>(8)
export const playerScaleAtom = atom<number>(0.5)
export const playerDampingAtom = atom<number>(3)

// Camera config (target values - what sliders control)
export const cameraDistanceAtom = atom<number>(14)
export const cameraSmoothingAtom = atom<number>(0.1) // For player-following smoothness
export const cameraViewAngleAtom = atom<number>(43) // 0 = top-down, 70 = third-person
export const cameraTransitionSpeedAtom = atom<number>(0.05) // For preset/slider transitions

// Camera presets
export interface CameraPreset {
  name: string
  distance: number
  viewAngle: number
}

const DEFAULT_PRESETS: CameraPreset[] = [
  { name: 'Default', distance: 14, viewAngle: 43 },
  { name: 'Close-up', distance: 8, viewAngle: 55 },
  { name: 'Overview', distance: 25, viewAngle: 20 },
]

// Load presets from localStorage or use defaults
function loadPresets(): CameraPreset[] {
  try {
    const stored = localStorage.getItem('cameraPresets')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_PRESETS
}

export const cameraPresetsAtom = atom<CameraPreset[]>(loadPresets())

// Derived atom that saves to localStorage on write
export const cameraPresetsWithPersistAtom = atom(
  (get) => get(cameraPresetsAtom),
  (_get, set, newPresets: CameraPreset[]) => {
    set(cameraPresetsAtom, newPresets)
    try {
      localStorage.setItem('cameraPresets', JSON.stringify(newPresets))
    } catch {
      // Ignore storage errors
    }
  }
)

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

// Dev panel visibility (persisted to localStorage, default closed)
function loadDevPanelOpen(): boolean {
  try {
    const stored = localStorage.getItem('devPanelOpen')
    if (stored !== null) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return false // Default to closed
}

const devPanelOpenBaseAtom = atom<boolean>(loadDevPanelOpen())

export const devPanelOpenAtom = atom(
  (get) => get(devPanelOpenBaseAtom),
  (_get, set, newValue: boolean) => {
    set(devPanelOpenBaseAtom, newValue)
    try {
      localStorage.setItem('devPanelOpen', JSON.stringify(newValue))
    } catch {
      // Ignore storage errors
    }
  }
)
