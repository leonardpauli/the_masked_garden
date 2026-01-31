import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3 } from 'three'
import { gameStore } from '../store'
import { playerPositionAtom } from '../store/atoms/playerAtoms'
import { cameraDistanceAtom, cameraSmoothingAtom, cameraViewAngleAtom } from '../store/atoms/configAtoms'

export function TopDownCamera() {
  const { camera } = useThree()
  const targetPosition = useRef(new Vector3())
  const lookAtTarget = useRef(new Vector3())

  useFrame(() => {
    const playerPos = gameStore.get(playerPositionAtom)
    const distance = gameStore.get(cameraDistanceAtom)
    const smoothing = gameStore.get(cameraSmoothingAtom)
    const viewAngle = gameStore.get(cameraViewAngleAtom)

    // Convert angle to radians
    const angleRad = (viewAngle * Math.PI) / 180

    // Calculate camera position based on view angle
    // At 0 degrees: camera directly above (top-down)
    // At 70 degrees: camera behind player (third-person)
    const height = distance * Math.cos(angleRad)
    const zOffset = distance * Math.sin(angleRad)

    // Position camera above and behind player
    targetPosition.current.set(
      playerPos.x,
      playerPos.y + height,
      playerPos.z + zOffset
    )

    // Look at player
    lookAtTarget.current.set(playerPos.x, playerPos.y + 1, playerPos.z)

    // Smooth camera movement
    camera.position.lerp(targetPosition.current, smoothing)

    // Always look at the player
    camera.lookAt(lookAtTarget.current)
  })

  return null
}
