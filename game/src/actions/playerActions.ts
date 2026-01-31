import { gameStore } from '../store'
import { playerPositionAtom, playerVelocityAtom, playerHealthAtom, Vec3 } from '../store/atoms/playerAtoms'

export function setPlayerPosition(position: Vec3): void {
  gameStore.set(playerPositionAtom, position)
}

export function setPlayerVelocity(velocity: Vec3): void {
  gameStore.set(playerVelocityAtom, velocity)
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
  gameStore.set(playerPositionAtom, { x: 0, y: 0.5, z: 0 })
  gameStore.set(playerVelocityAtom, { x: 0, y: 0, z: 0 })
  gameStore.set(playerHealthAtom, 100)
}
