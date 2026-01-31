import { atom } from 'jotai/vanilla'
import type { GameState } from '../../types/game'

export const gameStateAtom = atom<GameState>('menu')
export const scoreAtom = atom<number>(0)
