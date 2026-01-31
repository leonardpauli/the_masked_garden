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
