import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { Vector3 } from 'three'
import { gameStore } from '../store'
import { playerPositionAtom } from '../store/atoms/playerAtoms'
import { cameraHeightAtom, cameraSmoothingAtom } from '../store/atoms/configAtoms'

export function TopDownCamera() {
  const { camera } = useThree()
  const targetPosition = useRef(new Vector3())

  // Set camera to look straight down on mount
  useEffect(() => {
    camera.rotation.set(-Math.PI / 2, 0, 0)
  }, [camera])

  useFrame(() => {
    const playerPos = gameStore.get(playerPositionAtom)
    const cameraHeight = gameStore.get(cameraHeightAtom)
    const smoothing = gameStore.get(cameraSmoothingAtom)

    // Target position is directly above player (pure top-down)
    targetPosition.current.set(playerPos[0], cameraHeight, playerPos[2])

    // Smooth camera movement
    camera.position.lerp(targetPosition.current, smoothing)

    // Keep camera looking straight down (no tilt)
    camera.rotation.set(-Math.PI / 2, 0, 0)
  })

  return null
}
