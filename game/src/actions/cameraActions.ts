import { gameStore } from '../store'
import {
  cameraDistanceAtom,
  cameraViewAngleAtom,
} from '../store/atoms/configAtoms'

export function setCameraDistance(distance: number): void {
  gameStore.set(cameraDistanceAtom, distance)
}

export function setCameraViewAngle(angle: number): void {
  gameStore.set(cameraViewAngleAtom, angle)
}

export function getCameraDistance(): number {
  return gameStore.get(cameraDistanceAtom)
}

export function getCameraViewAngle(): number {
  return gameStore.get(cameraViewAngleAtom)
}
