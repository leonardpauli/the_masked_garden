import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useAtomValue } from 'jotai'
import { TopDownCamera } from './TopDownCamera'
import { Player } from './Player'
import { ObstacleField } from './ObstacleField'
import { Ground } from './Ground'
import { Lighting } from './Lighting'
import { PostProcessing } from './PostProcessing'
import { GhostPlayers } from './GhostPlayers'
import { gravityAtom, visualStyleAtom } from '../store/atoms/configAtoms'
import { visualStyleConfigs } from '../types/visualStyles'

function PhysicsWorld() {
  const gravity = useAtomValue(gravityAtom)

  return (
    <Physics gravity={[0, -gravity, 0]} key={gravity}>
      <TopDownCamera />
      <Lighting />
      <Player />
      <GhostPlayers />
      <Ground />
      <ObstacleField count={25} spread={25} />
    </Physics>
  )
}

export function Scene() {
  const visualStyle = useAtomValue(visualStyleAtom)
  const config = useMemo(() => visualStyleConfigs[visualStyle], [visualStyle])

  return (
    <Canvas shadows camera={{ position: [0, 20, 0], fov: 50 }}>
      <color attach="background" args={[config.backgroundColor]} />
      <fog attach="fog" args={[config.fogColor, config.fogNear, config.fogFar]} />
      <Suspense fallback={null}>
        <PhysicsWorld />
        <PostProcessing />
      </Suspense>
    </Canvas>
  )
}
