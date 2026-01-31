import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3, Color } from 'three'
import { gameStore } from '../store'
import { otherPlayersAtom } from '../store/atoms/onlineAtoms'

// Spring-damper constants for smooth interpolation
// Using critically damped spring (zeta = 1) to avoid oscillation
const SPRING_STIFFNESS = 15 // How quickly it converges (higher = faster)
const DAMPING_RATIO = 1.0 // 1.0 = critically damped, >1 = overdamped
const DAMPING = 2 * Math.sqrt(SPRING_STIFFNESS) * DAMPING_RATIO

interface GhostState {
  mesh: Mesh
  // Current state (what we render)
  position: Vector3
  velocity: Vector3
  // Target state (from server)
  targetPosition: Vector3
  targetVelocity: Vector3
  colorHue: number
}

// Convert HSL to RGB Color
function hslToColor(h: number, s: number, l: number): Color {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  return new Color(f(0), f(8), f(4))
}

// Apply spring-damper physics to smoothly move toward target
function springDamperUpdate(
  current: Vector3,
  velocity: Vector3,
  target: Vector3,
  targetVelocity: Vector3,
  delta: number
) {
  // Spring force: F = -k * (x - target) - c * (v - targetV)
  // This creates smooth movement that considers both position AND velocity targets
  const dx = current.x - target.x
  const dy = current.y - target.y
  const dz = current.z - target.z
  
  const dvx = velocity.x - targetVelocity.x
  const dvy = velocity.y - targetVelocity.y
  const dvz = velocity.z - targetVelocity.z
  
  // Acceleration from spring-damper
  const ax = -SPRING_STIFFNESS * dx - DAMPING * dvx
  const ay = -SPRING_STIFFNESS * dy - DAMPING * dvy
  const az = -SPRING_STIFFNESS * dz - DAMPING * dvz
  
  // Semi-implicit Euler integration
  velocity.x += ax * delta
  velocity.y += ay * delta
  velocity.z += az * delta
  
  current.x += velocity.x * delta
  current.y += velocity.y * delta
  current.z += velocity.z * delta
}

export function GhostPlayers() {
  const ghostsRef = useRef<Map<number, GhostState>>(new Map())
  const groupRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    
    // Clamp delta to avoid physics explosion on tab switch
    const dt = Math.min(delta, 0.1)

    const ghosts = ghostsRef.current
    const otherPlayers = gameStore.get(otherPlayersAtom)

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
        // Create new ghost mesh with unique color from golden angle hue
        const playerColor = hslToColor(state.colorHue, 70, 55)
        const emissiveColor = hslToColor(state.colorHue, 50, 35)

        const geometry = new SphereGeometry(0.5, 16, 16)
        const material = new MeshStandardMaterial({
          color: playerColor,
          transparent: true,
          opacity: 0.5,
          emissive: emissiveColor,
          emissiveIntensity: 0.4,
        })
        const mesh = new Mesh(geometry, material)
        mesh.castShadow = false
        mesh.receiveShadow = false
        groupRef.current.add(mesh)

        ghost = {
          mesh,
          position: new Vector3(state.x, state.y, state.z),
          velocity: new Vector3(state.vx, state.vy, state.vz),
          targetPosition: new Vector3(state.x, state.y, state.z),
          targetVelocity: new Vector3(state.vx, state.vy, state.vz),
          colorHue: state.colorHue,
        }
        ghosts.set(id, ghost)

        // Set initial position
        mesh.position.copy(ghost.position)
      }

      // Update targets from server state
      ghost.targetPosition.set(state.x, state.y, state.z)
      ghost.targetVelocity.set(state.vx, state.vy, state.vz)

      // Apply spring-damper physics for smooth interpolation
      springDamperUpdate(
        ghost.position,
        ghost.velocity,
        ghost.targetPosition,
        ghost.targetVelocity,
        dt
      )
      
      // Update mesh position
      ghost.mesh.position.copy(ghost.position)
    }
  })

  return <group ref={groupRef} />
}
