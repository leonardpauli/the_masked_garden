import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAtomValue } from 'jotai'
import { Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three'
import { otherPlayersAtom } from '../store/atoms/onlineAtoms'

interface GhostState {
  mesh: Mesh
  targetPos: Vector3
  targetVel: Vector3
  currentPos: Vector3
}

export function GhostPlayers() {
  const otherPlayers = useAtomValue(otherPlayersAtom)
  const ghostsRef = useRef<Map<number, GhostState>>(new Map())
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const ghosts = ghostsRef.current

    // Remove ghosts for players that left
    for (const [id, ghost] of ghosts) {
      if (!otherPlayers.has(id)) {
        groupRef.current.remove(ghost.mesh)
        ghost.mesh.geometry.dispose()
        ;(ghost.mesh.material as MeshStandardMaterial).dispose()
        ghosts.delete(id)
      }
    }

    // Update or create ghosts
    for (const [id, state] of otherPlayers) {
      let ghost = ghosts.get(id)

      if (!ghost) {
        // Create new ghost mesh
        const geometry = new SphereGeometry(0.5, 16, 16)
        const material = new MeshStandardMaterial({
          color: 0x88aaff,
          transparent: true,
          opacity: 0.4,
          emissive: 0x4466aa,
          emissiveIntensity: 0.3,
        })
        const mesh = new Mesh(geometry, material)
        mesh.castShadow = false
        mesh.receiveShadow = false
        groupRef.current.add(mesh)

        ghost = {
          mesh,
          targetPos: new Vector3(state.x, state.y, state.z),
          targetVel: new Vector3(state.vx, state.vy, state.vz),
          currentPos: new Vector3(state.x, state.y, state.z),
        }
        ghosts.set(id, ghost)
      }

      // Update targets from server state
      ghost.targetPos.set(state.x, state.y, state.z)
      ghost.targetVel.set(state.vx, state.vy, state.vz)

      // Predict position based on velocity
      const predictedPos = ghost.targetPos.clone().addScaledVector(ghost.targetVel, 0.1)

      // Smoothly interpolate towards predicted position
      ghost.currentPos.lerp(predictedPos, Math.min(1, delta * 10))
      ghost.mesh.position.copy(ghost.currentPos)
    }
  })

  return <group ref={groupRef} />
}
