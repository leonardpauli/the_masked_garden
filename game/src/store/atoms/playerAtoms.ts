import { atom } from 'jotai/vanilla'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export const playerPositionAtom = atom<Vec3>({ x: 0, y: 0.5, z: 0 })
export const playerVelocityAtom = atom<Vec3>({ x: 0, y: 0, z: 0 })
export const playerHealthAtom = atom<number>(100)
export const playerColorHueAtom = atom<number>(0)

// Jump system
export const jumpEnergyAtom = atom<number>(1.0) // 0-1, represents available jump energy
export const isGroundedAtom = atom<boolean>(true) // Whether player is on ground
export const jumpRequestedAtom = atom<boolean>(false) // Signal to jump (consumed by physics)

// Owned physics cube
export const ownedCubePositionAtom = atom<Vec3>({ x: 1.5, y: 0.65, z: 0 })
export const ownedCubeVelocityAtom = atom<Vec3>({ x: 0, y: 0, z: 0 })
export const ownedCubeSpawnedAtom = atom<boolean>(false)
