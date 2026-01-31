import { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { useAtomValue } from 'jotai'
import { visualStyleAtom } from '../store/atoms/configAtoms'
import { visualStyleConfigs } from '../types/visualStyles'

export function Ground() {
  const visualStyle = useAtomValue(visualStyleAtom)
  const config = useMemo(() => visualStyleConfigs[visualStyle], [visualStyle])

  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color={config.groundColor} />
      </mesh>
    </RigidBody>
  )
}
