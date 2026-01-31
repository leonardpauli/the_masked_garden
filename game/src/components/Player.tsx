import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import { MeshToonMaterial, Mesh } from 'three'
import { gameStore } from '../store'
import { inputDirectionAtom } from '../store/atoms/inputAtoms'
import { gameStateAtom } from '../store/atoms/gameAtoms'
import { playerHealthAtom } from '../store/atoms/playerAtoms'
import {
  playerSpeedAtom,
  playerScaleAtom,
  playerDampingAtom,
  collisionCooldownAtom,
  damageAmountAtom,
  visualStyleAtom,
  healthEnabledAtom,
} from '../store/atoms/configAtoms'
import { setPlayerPosition, setPlayerVelocity, takeDamage } from '../actions/playerActions'
import { endGame } from '../actions/gameActions'
import { visualStyleConfigs } from '../types/visualStyles'

export function Player() {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const lastCollisionTime = useRef(0)
  const { scene } = useGLTF('/models/player.glb')

  // Apply toon material to all meshes in the model, updating when visual style changes
  useEffect(() => {
    const updateMaterial = () => {
      const visualStyle = gameStore.get(visualStyleAtom)
      const config = visualStyleConfigs[visualStyle]
      
      const toonMaterial = new MeshToonMaterial({
        color: config.playerColor,
      })

      scene.traverse((child) => {
        if (child instanceof Mesh) {
          child.material = toonMaterial
          child.castShadow = true
          child.receiveShadow = true
        }
      })
    }

    updateMaterial()
    
    // Subscribe to visual style changes
    const unsubscribe = gameStore.sub(visualStyleAtom, updateMaterial)
    return () => unsubscribe()
  }, [scene])

  useFrame(() => {
    if (!rigidBodyRef.current) return

    const gameState = gameStore.get(gameStateAtom)
    if (gameState !== 'playing') return

    // Get config values
    const playerSpeed = gameStore.get(playerSpeedAtom)
    const playerDamping = gameStore.get(playerDampingAtom)

    // Update damping dynamically
    rigidBodyRef.current.setLinearDamping(playerDamping)

    // Get input direction
    const input = gameStore.get(inputDirectionAtom)

    // Apply impulse for movement
    rigidBodyRef.current.applyImpulse(
      { x: input.x * playerSpeed, y: 0, z: input.z * playerSpeed },
      true
    )

    // Sync position and velocity to atoms
    const position = rigidBodyRef.current.translation()
    const velocity = rigidBodyRef.current.linvel()
    setPlayerPosition({ x: position.x, y: position.y, z: position.z })
    setPlayerVelocity({ x: velocity.x, y: velocity.y, z: velocity.z })

    // Check for game over (only if health system is enabled)
    const healthEnabled = gameStore.get(healthEnabledAtom)
    if (healthEnabled) {
      const health = gameStore.get(playerHealthAtom)
      if (health <= 0) {
        endGame()
      }
    }
  })

  const handleCollision = () => {
    // Skip damage if health system is disabled
    const healthEnabled = gameStore.get(healthEnabledAtom)
    if (!healthEnabled) return

    const now = Date.now()
    const cooldown = gameStore.get(collisionCooldownAtom)

    // Cooldown to prevent rapid damage
    if (now - lastCollisionTime.current < cooldown) return
    lastCollisionTime.current = now

    const damage = gameStore.get(damageAmountAtom)
    takeDamage(damage)
  }

  // Get scale from config
  const playerScale = gameStore.get(playerScaleAtom)

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[0, 0.5, 0]}
      colliders="ball"
      lockRotations
      linearDamping={gameStore.get(playerDampingAtom)}
      onCollisionEnter={(e) => {
        if (e.other.rigidBodyObject?.name === 'obstacle') {
          handleCollision()
        }
      }}
    >
      <primitive
        object={scene.clone()}
        scale={playerScale}
        name="player"
      />
    </RigidBody>
  )
}

// Preload the model
useGLTF.preload('/models/player.glb')
