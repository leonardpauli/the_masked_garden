import { gameStore } from '../store'
import { playerPositionAtom, playerVelocityAtom, playerHealthAtom, jumpEnergyAtom, isGroundedAtom, jumpRequestedAtom, Vec3 } from '../store/atoms/playerAtoms'

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
  gameStore.set(jumpEnergyAtom, 1.0)
  gameStore.set(isGroundedAtom, true)
  gameStore.set(jumpRequestedAtom, false)
}

export function requestJump(): void {
  gameStore.set(jumpRequestedAtom, true)
}

export function clearJumpRequest(): void {
  gameStore.set(jumpRequestedAtom, false)
}

export function setGrounded(grounded: boolean): void {
  gameStore.set(isGroundedAtom, grounded)
}

export function setJumpEnergy(energy: number): void {
  gameStore.set(jumpEnergyAtom, Math.max(0, Math.min(1, energy)))
}

export function getJumpEnergy(): number {
  return gameStore.get(jumpEnergyAtom)
}

export function isGrounded(): boolean {
  return gameStore.get(isGroundedAtom)
}
