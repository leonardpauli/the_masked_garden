import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { Icosahedron } from './Icosahedron'
import { visualStyleAtom } from '../store/atoms/configAtoms'
import { visualStyleConfigs } from '../types/visualStyles'
import type { Vector3Tuple } from 'three'

interface ObstacleFieldProps {
  count?: number
  spread?: number
}

function generateObstacles(count: number, spread: number, colors: string[]): Array<{ position: Vector3Tuple; scale: number; colorIndex: number }> {
  const obstacles: Array<{ position: Vector3Tuple; scale: number; colorIndex: number }> = []

  for (let i = 0; i < count; i++) {
    // Random position, but avoid center where player starts
    let x: number, z: number
    do {
      x = (Math.random() - 0.5) * spread * 2
      z = (Math.random() - 0.5) * spread * 2
    } while (Math.abs(x) < 3 && Math.abs(z) < 3) // Keep center clear

    const scale = 0.5 + Math.random() * 0.8 // Random size 0.5-1.3
    const colorIndex = Math.floor(Math.random() * colors.length)

    obstacles.push({
      position: [x, scale, z],
      scale,
      colorIndex,
    })
  }

  return obstacles
}

export function ObstacleField({ count = 20, spread = 20 }: ObstacleFieldProps) {
  const visualStyle = useAtomValue(visualStyleAtom)
  const config = useMemo(() => visualStyleConfigs[visualStyle], [visualStyle])
  
  // Generate obstacles once with color indices (not actual colors)
  const obstacles = useMemo(() => generateObstacles(count, spread, config.obstacleColors), [count, spread, config.obstacleColors])

  return (
    <>
      {obstacles.map((obstacle, index) => (
        <Icosahedron
          key={index}
          position={obstacle.position}
          scale={obstacle.scale}
          color={config.obstacleColors[obstacle.colorIndex % config.obstacleColors.length]}
        />
      ))}
    </>
  )
}
