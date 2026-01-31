import { atom } from 'jotai/vanilla'
import type { Vector3Tuple } from 'three'

export const playerPositionAtom = atom<Vector3Tuple>([0, 0.5, 0])
export const playerHealthAtom = atom<number>(100)
