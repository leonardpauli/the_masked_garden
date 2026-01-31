import { gameStore } from '../store'
import { inputDirectionAtom, inputSourceAtom } from '../store/atoms/inputAtoms'
import type { InputDirection, InputSource } from '../types/game'

export function setInputDirection(direction: InputDirection): void {
  gameStore.set(inputDirectionAtom, direction)
}

export function setInputSource(source: InputSource): void {
  gameStore.set(inputSourceAtom, source)
}

export function resetInput(): void {
  gameStore.set(inputDirectionAtom, { x: 0, z: 0 })
}
