import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { EffectComposer, BrightnessContrast, HueSaturation } from '@react-three/postprocessing'
import { useAtomValue } from 'jotai'
import { Color, Fog } from 'three'
import { visualStyleAtom } from '../store/atoms/configAtoms'
import { visualStyleConfigs } from '../types/visualStyles'

export function PostProcessing() {
  const visualStyle = useAtomValue(visualStyleAtom)
  const config = useMemo(() => visualStyleConfigs[visualStyle], [visualStyle])
  const { scene } = useThree()

  // Update fog and background based on style
  useEffect(() => {
    if (scene.background instanceof Color) {
      scene.background.set(config.backgroundColor)
    }
    if (scene.fog instanceof Fog) {
      scene.fog.color.set(config.fogColor)
      scene.fog.near = config.fogNear
      scene.fog.far = config.fogFar
    }
  }, [config, scene])

  return (
    <EffectComposer>
      <HueSaturation saturation={config.saturation - 1} />
      <BrightnessContrast brightness={config.brightness - 1} contrast={config.contrast - 1} />
    </EffectComposer>
  )
}
