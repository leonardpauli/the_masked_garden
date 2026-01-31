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
} from '../store/atoms/configAtoms'
import { setPlayerPosition, takeDamage } from '../actions/playerActions'
import { endGame } from '../actions/gameActions'

export function Player() {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const lastCollisionTime = useRef(0)
  const { scene } = useGLTF('/models/player.glb')

  // Apply toon material to all meshes in the model
  useEffect(() => {
    const toonMaterial = new MeshToonMaterial({
      color: '#4488ff',
    })

    scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.material = toonMaterial
        child.castShadow = true
        child.receiveShadow = true
      }
    })
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

    // Sync position to atom
    const position = rigidBodyRef.current.translation()
    setPlayerPosition([position.x, position.y, position.z])

    // Check for game over
    const health = gameStore.get(playerHealthAtom)
    if (health <= 0) {
      endGame()
    }
  })

  const handleCollision = () => {
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
