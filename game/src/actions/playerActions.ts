import { gameStore } from '../store'
import { playerPositionAtom, playerHealthAtom } from '../store/atoms/playerAtoms'
import type { Vector3Tuple } from 'three'

export function setPlayerPosition(position: Vector3Tuple): void {
  gameStore.set(playerPositionAtom, position)
}

export function takeDamage(amount: number): void {
  const currentHealth = gameStore.get(playerHealthAtom)
  const newHealth = Math.max(0, currentHealth - amount)
  gameStore.set(playerHealthAtom, newHealth)
}

export function healPlayer(amount: number): void {
  const currentHealth = gameStore.get(playerHealthAtom)
  const newHealth = Math.min(100, currentHealth + amount)
  gameStore.set(playerHealthAtom, newHealth)
}

export function resetPlayer(): void {
  gameStore.set(playerPositionAtom, [0, 0.5, 0])
  gameStore.set(playerHealthAtom, 100)
}
