import { atom } from 'jotai'

export interface CubeState {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

export interface PlayerState {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  colorHue: number
  cube?: CubeState
}

export const playerCountAtom = atom(0)
export const wsConnectedAtom = atom(false)
export const myPlayerIdAtom = atom<number | null>(null)
export const otherPlayersAtom = atom<Map<number, PlayerState>>(new Map())
export const lastBuildTimeAtom = atom<Date | null>(null)
