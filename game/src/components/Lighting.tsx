import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { visualStyleAtom } from '../store/atoms/configAtoms'
import { visualStyleConfigs } from '../types/visualStyles'

export function Lighting() {
  const visualStyle = useAtomValue(visualStyleAtom)
  const config = useMemo(() => visualStyleConfigs[visualStyle], [visualStyle])

  return (
    <>
      <ambientLight intensity={config.ambientIntensity} color={config.ambientColor} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={config.directionalIntensity}
        color={config.directionalColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
    </>
  )
}
