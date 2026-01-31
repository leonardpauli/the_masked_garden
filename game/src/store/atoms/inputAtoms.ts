import { atom } from 'jotai/vanilla'
import type { InputDirection, InputSource } from '../../types/game'

export const inputDirectionAtom = atom<InputDirection>({ x: 0, z: 0 })
export const inputSourceAtom = atom<InputSource>('keyboard')
