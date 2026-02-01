import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Object3D, Mesh, Vector3, Color } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { gameStore } from '../store'
import { otherPlayersAtom } from '../store/atoms/onlineAtoms'
import { playerScaleAtom } from '../store/atoms/configAtoms'
import { GhostCapeMaterial } from '../materials/GhostCapeMaterial'

// Spring-damper constants for smooth interpolation
const SPRING_STIFFNESS = 15
const DAMPING_RATIO = 1.0
const DAMPING = 2 * Math.sqrt(SPRING_STIFFNESS) * DAMPING_RATIO

interface GhostState {
  group: Group
  material: GhostCapeMaterial
  position: Vector3
  velocity: Vector3
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
  const dx = current.x - target.x
  const dy = current.y - target.y
  const dz = current.z - target.z

  const dvx = velocity.x - targetVelocity.x
  const dvy = velocity.y - targetVelocity.y
  const dvz = velocity.z - targetVelocity.z

  const ax = -SPRING_STIFFNESS * dx - DAMPING * dvx
  const ay = -SPRING_STIFFNESS * dy - DAMPING * dvy
  const az = -SPRING_STIFFNESS * dz - DAMPING * dvz

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
  const modelRef = useRef<Object3D | null>(null)
  const modelLoadedRef = useRef(false)

  // Load the player model once
  useEffect(() => {
    const loader = new GLTFLoader()
    loader.load('/models/player.glb', (gltf) => {
      modelRef.current = gltf.scene
      modelLoadedRef.current = true
    })
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current || !modelLoadedRef.current) return

    const dt = Math.min(delta, 0.1)
    const ghosts = ghostsRef.current
    const otherPlayers = gameStore.get(otherPlayersAtom)
    const playerScale = gameStore.get(playerScaleAtom)

    // Remove ghosts for players that left
    for (const [id, ghost] of ghosts) {
      if (!otherPlayers.has(id)) {
        groupRef.current.remove(ghost.group)
        ghost.material.dispose()
        ghost.group.traverse((child) => {
          if (child instanceof Mesh) {
            child.geometry?.dispose()
          }
        })
        ghosts.delete(id)
      }
    }

    // Update or create ghosts
    for (const [id, state] of otherPlayers) {
      let ghost = ghosts.get(id)

      if (!ghost && modelRef.current) {
        // Create new ghost with cloned model
        const playerColor = hslToColor(state.colorHue, 70, 60)

        const material = new GhostCapeMaterial({
          color: playerColor,
          opacity: 0.6,
          lagWeight: 0.08,
          displacementStrength: 0.15,
        })

        // Clone the model and apply ghost material
        const group = new Group()
        const modelClone = modelRef.current.clone()
        modelClone.traverse((child) => {
          if (child instanceof Mesh) {
            child.material = material
            child.castShadow = false
            child.receiveShadow = false
          }
        })
        modelClone.scale.setScalar(playerScale)
        group.add(modelClone)
        groupRef.current.add(group)

        ghost = {
          group,
          material,
          position: new Vector3(state.x, state.y, state.z),
          velocity: new Vector3(state.vx, state.vy, state.vz),
          targetPosition: new Vector3(state.x, state.y, state.z),
          targetVelocity: new Vector3(state.vx, state.vy, state.vz),
          colorHue: state.colorHue,
        }
        ghosts.set(id, ghost)
        group.position.copy(ghost.position)
      }

      if (!ghost) continue

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

      // Update group position and material
      ghost.group.position.copy(ghost.position)
      ghost.material.update(ghost.velocity, dt)
    }
  })

  return <group ref={groupRef} />
}
