import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useAtomValue } from 'jotai'
import { TopDownCamera } from './TopDownCamera'
import { Player } from './Player'
import { ObstacleField } from './ObstacleField'
import { Ground } from './Ground'
import { Lighting } from './Lighting'
import { gravityAtom } from '../store/atoms/configAtoms'

function PhysicsWorld() {
  const gravity = useAtomValue(gravityAtom)

  return (
    <Physics gravity={[0, -gravity, 0]} key={gravity}>
      <TopDownCamera />
      <Lighting />
      <Player />
      <Ground />
      <ObstacleField count={25} spread={25} />
    </Physics>
  )
}

export function Scene() {
  return (
    <Canvas shadows camera={{ position: [0, 20, 0], fov: 50 }}>
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 20, 50]} />
      <Suspense fallback={null}>
        <PhysicsWorld />
      </Suspense>
    </Canvas>
  )
}
