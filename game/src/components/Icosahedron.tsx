import { RigidBody } from '@react-three/rapier'
import type { Vector3Tuple } from 'three'

interface IcosahedronProps {
  position: Vector3Tuple
  scale?: number
  color?: string
}

export function Icosahedron({ position, scale = 1, color = '#ff4444' }: IcosahedronProps) {
  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders="ball"
      name="obstacle"
    >
      <mesh castShadow receiveShadow name="obstacle">
        <icosahedronGeometry args={[scale, 0]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
    </RigidBody>
  )
}
