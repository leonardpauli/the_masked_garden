import { RigidBody } from '@react-three/rapier'
import type { Vector3Tuple } from 'three'

interface IcosahedronProps {
  position: Vector3Tuple
  scale?: number
}

export function Icosahedron({ position, scale = 1 }: IcosahedronProps) {
  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders="ball"
      name="obstacle"
    >
      <mesh castShadow receiveShadow name="obstacle">
        <icosahedronGeometry args={[scale, 0]} />
        <meshStandardMaterial color="#ff4444" roughness={0.4} metalness={0.1} />
      </mesh>
    </RigidBody>
  )
}
